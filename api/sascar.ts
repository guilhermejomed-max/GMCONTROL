import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sascarCache, performFetch } from '../sascarService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Controle de concorrência: Se o cache estiver vazio ou velho, atualiza
  const cacheAge = Date.now() - sascarCache.lastUpdate;
  
  if (sascarCache.latestPositions.size === 0 || cacheAge > 60000) {
    await performFetch();
  }

  const vehicles = Array.from(sascarCache.latestPositions.values());

  // Aplica filtros se houver (ex: por placa)
  const { plate } = req.query;
  if (plate) {
    const filtered = vehicles.filter(v => v.placa === plate);
    return res.status(200).json(filtered);
  }

  return res.status(200).json(vehicles);
}
