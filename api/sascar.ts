import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as soap from 'soap';

// URL do WSDL da Sascar
const SASCAR_WSDL = 'https://ws.sascar.com.br/WSSascar/SascarService?wsdl';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Impede que a Vercel faça cache da resposta de erro
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const user = process.env.SASCAR_USER;
  const password = process.env.SASCAR_PASSWORD;

  if (!user || !password) {
    return res.status(500).json({ error: "Credenciais ausentes no ambiente" });
  }

  try {
    // 1. Criar cliente com timeout curto para não travar a função
    const client = await Promise.race([
      soap.createClientAsync(SASCAR_WSDL, { timeout: 10000 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout WSDL')), 12000))
    ]) as any;

    const auth = { login: user, senha: password };

    // 2. Obter veículos
    const [vResult] = await client.obterVeiculosAsync(auth);
    const vehicles = vResult?.return || [];

    // 3. Filtragem de segurança para evitar estouro de memória na Vercel
    const { plate } = req.query;
    let list = Array.isArray(vehicles) ? vehicles : [vehicles];
    
    if (plate) {
      list = list.filter((v: any) => v.placa === plate);
    } else {
      list = list.slice(0, 10); // Retorna apenas 10 por vez se não houver placa
    }

    // 4. Busca de posições em paralelo limitado
    const data = await Promise.all(
      list.map(async (v: any) => {
        try {
          const [pos] = await client.obterUltimaPosicaoVeiculoAsync({ ...auth, idVeiculo: v.id });
          return {
            id: v.id,
            placa: v.placa,
            ...pos?.return
          };
        } catch (e) {
          return { id: v.id, placa: v.placa, status: 'offline' };
        }
      })
    );

    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[SASCAR_FATAL]:', error.message);
    
    // Resposta amigável para o frontend não quebrar[cite: 1]
    return res.status(502).json({ 
      error: "Falha na comunicação com Sascar", 
      message: error.message 
    });
  }
}
