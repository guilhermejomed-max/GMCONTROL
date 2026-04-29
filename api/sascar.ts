import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchVehicleData, sascarCache } from '../sascarService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura headers para evitar cache de borda agressivo
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const { plate } = req.query;
    
    // Promise com Timeout para não deixar a função da Vercel morrer
    const dataPromise = fetchVehicleData(plate as string);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Sascar Timeout')), 8000)
    );

    const result = await Promise.race([dataPromise, timeoutPromise]);
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Erro no Handler Sascar:', error.message);
    
    // Se falhou por tempo, retorna o que temos no cache em vez de erro 500
    if (sascarCache.positions.size > 0) {
      return res.status(200).json(Array.from(sascarCache.positions.values()));
    }

    return res.status(504).json({ error: "Tempo limite excedido na comunicação com Sascar" });
  }
}
