const SASCAR_BASE_URL = 'https://sasintegra.sascar.com.br/SasIntegra';

const readRawBody = async (req: any): Promise<string> => {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const getPath = (req: any): string => {
  const pathParam = req.query?.path;
  const parts = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : ['SasIntegraWSService'];
  return parts.map((part: string) => encodeURIComponent(part)).join('/');
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, SOAPAction');
    return res.status(204).end();
  }

  try {
    const targetUrl = `${SASCAR_BASE_URL}/${getPath(req)}`;
    const body = req.method === 'GET' ? undefined : await readRawBody(req);
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'text/xml;charset=UTF-8',
        SOAPAction: req.headers.soapaction || req.headers.SOAPAction || ''
      },
      body
    });

    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/xml;charset=UTF-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(response.status).send(text);
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: 'Falha ao encaminhar requisicao para a Sascar',
      details: error?.message || String(error)
    });
  }
}
