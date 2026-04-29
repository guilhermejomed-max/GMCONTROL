import handler from '../../server';

export default function sascarVehicles(req: any, res: any) {
  const query = typeof req.url === 'string' && req.url.includes('?')
    ? req.url.slice(req.url.indexOf('?'))
    : '';

  req.url = `/api/sascar/vehicles${query}`;
  return handler(req, res);
}
