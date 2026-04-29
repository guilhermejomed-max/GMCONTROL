import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as soap from 'soap';

const SASCAR_WSDL = 'https://ws.sascar.com.br/WSSascar/SascarService?wsdl';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurações de segurança e cache
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  const user = process.env.SASCAR_USER;
  const password = process.env.SASCAR_PASSWORD;

  if (!user || !password) {
    return res.status(500).json({ error: "Credenciais não configuradas" });
  }

  try {
    // 1. Conexão com o SOAP da Sascar com limite de tempo
    const client = await soap.createClientAsync(SASCAR_WSDL);
    const auth = { login: user, senha: password };

    // 2. Busca lista de veículos
    const [vResult] = await client.obterVeiculosAsync(auth);
    let vehicles = vResult?.return || [];
    
    // Normaliza para array (Sascar retorna objeto se houver apenas 1)
    if (!Array.isArray(vehicles)) {
      vehicles = [vehicles];
    }

    // 3. Filtro por placa (prioridade) ou limite de segurança
    const { plate } = req.query;
    let listToProcess = plate 
      ? vehicles.filter((v: any) => v.placa === plate)
      : vehicles.slice(0, 15); // Limite para evitar timeout na Vercel

    // 4. Busca posições em paralelo
    const results = await Promise.all(
      listToProcess.map(async (v: any) => {
        try {
          const [pos] = await client.obterUltimaPosicaoVeiculoAsync({ 
            ...auth, 
            idVeiculo: v.id 
          });
          return {
            id: v.id,
            placa: v.placa,
            ...pos?.return,
            timestamp: Date.now()
          };
        } catch (e) {
          return { id: v.id, placa: v.placa, status: 'offline' };
        }
      })
    );

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('Erro Crítico Sascar:', error.message);
    return res.status(500).json({ 
      error: "Erro na invocação da função", 
      details: error.message 
    });
  }
}
