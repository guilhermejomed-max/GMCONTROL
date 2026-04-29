import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as soap from 'soap';

const SASCAR_WSDL = 'https://ws.sascar.com.br/WSSascar/SascarService?wsdl';

// Cache volátil para evitar chamadas repetitivas na mesma execução
let soapClient: any = null;

async function getSoapClient() {
  if (!soapClient) {
    soapClient = await soap.createClientAsync(SASCAR_WSDL);
  }
  return soapClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de Headers para evitar cache antigo no navegador
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const user = process.env.SASCAR_USER;
    const password = process.env.SASCAR_PASSWORD;

    if (!user || !password) {
      return res.status(500).json({ error: "Credenciais Sascar não configuradas" });
    }

    const client = await getSoapClient();
    const auth = { login: user, senha: password };

    // 2. Busca lista de veículos
    const [vResult] = await client.obterVeiculosAsync(auth);
    const vehicles = vResult.return || [];

    // 3. Otimização: Se houver muitos veículos, processamos apenas os 15 primeiros 
    // ou usamos a placa enviada via query para evitar timeout na Vercel.
    const { plate } = req.query;
    let vehiclesToProcess = vehicles;

    if (plate) {
      vehiclesToProcess = vehicles.filter((v: any) => v.placa === plate);
    } else {
      vehiclesToProcess = vehicles.slice(0, 20); // Limite de segurança
    }

    // 4. Busca posições em paralelo (Muito mais rápido que o loop 'for')
    const results = await Promise.all(
      vehiclesToProcess.map(async (v: any) => {
        try {
          const [pos] = await client.obterUltimaPosicaoVeiculoAsync({ 
            ...auth, 
            idVeiculo: v.id 
          });
          return {
            id: v.id,
            placa: v.placa,
            vin: v.vin,
            ...pos.return
          };
        } catch (e) {
          return { id: v.id, placa: v.placa, error: "Posição indisponível" };
        }
      })
    );

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('Sascar Error:', error.message);
    return res.status(500).json({ 
      error: "Falha na comunicação com Sascar",
      details: error.message 
    });
  }
}
