import axios from 'axios';
import { parseTrackerOdometerKm } from '../lib/odometerUtils';

const SASCAR_URL = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';
const DEFAULT_USER = process.env.SASCAR_USER || 'JOMEDELOGTORREOPENTECH';
const DEFAULT_PASS = process.env.SASCAR_PASS || 'sascar';

const asArray = (value: any): any[] => Array.isArray(value) ? value : (value ? [value] : []);

const normalizeKey = (value: any): string => String(value || '')
  .replace(/[^A-Z0-9]/gi, '')
  .toUpperCase();

const escapeXml = (value: any): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const decodeXml = (value: string): string => value
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .trim();

const parseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseOptionalNumber = (...values: any[]): number | undefined => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const parseSascarDate = (value: any): Date => {
  if (!value) return new Date(0);
  const text = String(value).trim();
  const nativeDate = new Date(text);
  if (!Number.isNaN(nativeDate.getTime())) return nativeDate;

  if (text.includes('/')) {
    const [date, time = '00:00:00'] = text.split(' ');
    const [day, month, year] = date.split('/');
    const parsed = new Date(`${year}-${month}-${day}T${time}-03:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(`${text.replace(' ', 'T')}-03:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const parseObjectFromXml = (xml: string): Record<string, any> => {
  const output: Record<string, any> = {};
  const tagRegex = /<[^:/>\s]*(?::)?([A-Za-z0-9_]+)[^>]*>([\s\S]*?)<\/[^:/>\s]*(?::)?\1>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(xml))) {
    const key = match[1];
    const content = decodeXml(match[2].replace(/<[^>]+>/g, ''));
    if (key && key !== 'return' && content !== '') output[key] = content;
  }

  return output;
};

const parseSascarReturns = (xml: string): any[] => {
  const fault = xml.match(/<[^>]*faultstring[^>]*>([\s\S]*?)<\/[^>]*faultstring>/i);
  if (fault?.[1]) throw new Error(`Erro Sascar: ${decodeXml(fault[1])}`);

  const items: any[] = [];
  const returnRegex = /<[^>]*return[^>]*>([\s\S]*?)<\/[^>]*return>/gi;
  let match: RegExpExecArray | null;

  while ((match = returnRegex.exec(xml))) {
    const content = decodeXml(match[1]);
    if (!content) continue;

    try {
      const parsed = JSON.parse(content);
      items.push(...asArray(parsed));
      continue;
    } catch {
      const parsedXml = parseObjectFromXml(content);
      if (Object.keys(parsedXml).length > 0) items.push(parsedXml);
    }
  }

  return items;
};

const postSoap = async (method: string, body: string): Promise<any[]> => {
  const envelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <int:${method}>
      ${body}
    </int:${method}>
  </soapenv:Body>
</soapenv:Envelope>`.trim();

  const response = await axios.post(SASCAR_URL, envelope, {
    timeout: 50000,
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: ''
    }
  });

  return parseSascarReturns(String(response.data || ''));
};

const normalizeVehicle = (vehicle: any) => {
  const plate = vehicle.placa || vehicle.plate || '';
  const latitude = parseNumber(vehicle.latitude);
  const longitude = parseNumber(vehicle.longitude);
  const litrometer = parseOptionalNumber(
    vehicle.litrometro,
    vehicle.litrometro2,
    vehicle.litrometroTotal,
    vehicle.totalLitros,
    vehicle.totalCombustivel
  );

  return {
    ...vehicle,
    idVeiculo: vehicle.idVeiculo ? String(vehicle.idVeiculo) : '',
    placa: plate,
    plate: plate || vehicle.idVeiculo || '',
    latitude,
    longitude,
    odometer: parseTrackerOdometerKm(vehicle),
    speed: Number(vehicle.velocidade ?? 0),
    ignition: vehicle.ignicao === 'S' || vehicle.ignicao === true || vehicle.ignicao === 'true' || vehicle.ignicao === '1' || vehicle.ignicao === 1,
    ...(litrometer !== undefined ? { litrometer } : {}),
    consumoInstantaneo: parseNumber(vehicle.consumoInstantaneo),
    lastLocation: {
      lat: latitude,
      lng: longitude,
      address: vehicle.rua || '',
      city: vehicle.cidade || '',
      state: vehicle.uf || '',
      updatedAt: parseSascarDate(vehicle.dataPosicao || vehicle.dataHora).toISOString()
    }
  };
};

const uniqueLatest = (vehicles: any[]) => {
  const map = new Map<string, any>();

  vehicles.forEach(vehicle => {
    const normalized = normalizeVehicle(vehicle);
    const key = normalized.idVeiculo || normalizeKey(normalized.placa);
    if (!key) return;

    const existing = map.get(key);
    const currentDate = parseSascarDate(normalized.lastLocation?.updatedAt).getTime();
    const existingDate = existing ? parseSascarDate(existing.lastLocation?.updatedAt).getTime() : 0;
    if (!existing || currentDate >= existingDate) map.set(key, normalized);
  });

  return Array.from(map.values());
};

const getBody = async (req: any): Promise<any> => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
};

export default async function sascarVehicles(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      route: '/api/sascar/vehicles',
      message: 'Endpoint Sascar ativo. Use POST para sincronizar veiculos.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Metodo nao permitido' });
  }

  try {
    const body = await getBody(req);
    const plates = asArray(body?.plates).map(normalizeKey).filter(Boolean);
    const settings = body?.trackerSettings || {};
    const user = settings.user || DEFAULT_USER;
    const pass = settings.pass || DEFAULT_PASS;
    const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;

    let rawVehicles: any[] = [];

    try {
      rawVehicles = await postSoap('obterUltimaPosicaoTodosVeiculos', auth);
    } catch (error: any) {
      if (plates.length === 0) throw error;
    }

    if (rawVehicles.length === 0 && plates.length > 0) {
      const individualResults = await Promise.allSettled(plates.map(plate =>
        postSoap('obterUltimaPosicaoVeiculoComPlaca', `${auth}<placa>${escapeXml(plate)}</placa>`)
      ));
      rawVehicles = individualResults.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    }

    let vehicles = uniqueLatest(rawVehicles);

    if (plates.length > 0) {
      vehicles = vehicles.filter(vehicle =>
        plates.includes(normalizeKey(vehicle.placa)) ||
        plates.includes(normalizeKey(vehicle.plate)) ||
        plates.includes(normalizeKey(vehicle.idVeiculo))
      );
    }

    return res.status(200).json({
      success: true,
      message: `Sincronizacao concluida. ${vehicles.length} veiculos processados.`,
      data: vehicles
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: 'Falha ao comunicar com a Sascar',
      details: error?.message || String(error)
    });
  }
}
