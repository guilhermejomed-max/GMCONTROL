const SASCAR_URL = 'https://sasintegra.sascar.com.br/SasIntegra/SasIntegraWSService';
const DEFAULT_USER = process.env.SASCAR_USER || 'JOMEDELOGTORREOPENTECH';
const DEFAULT_PASS = process.env.SASCAR_PASS || 'sascar';
const MAX_REASONABLE_ODOMETER_KM = 2000000;

const asArray = (value: any): any[] => Array.isArray(value) ? value : (value ? [value] : []);

const stripSascarPlateSuffix = (value: any): string => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/(-\d+)+$/g, '');

const normalizeKey = (value: any): string => stripSascarPlateSuffix(value)
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

const parseTelemetryNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  let text = String(value).trim();
  if (!text) return undefined;

  const match = text.match(/-?[\d.,]+/);
  if (!match) return undefined;

  text = match[0];
  const commaIndex = text.lastIndexOf(',');
  const dotIndex = text.lastIndexOf('.');

  if (commaIndex > -1 && dotIndex > -1) {
    text = commaIndex > dotIndex
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (commaIndex > -1) {
    text = /^\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  } else if ((text.match(/\./g) || []).length > 1) {
    text = text.replace(/\./g, '');
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeOdometerUnit = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value <= MAX_REASONABLE_ODOMETER_KM) return Math.round(value);

  const asMeters = value / 1000;
  if (asMeters > 0 && asMeters <= MAX_REASONABLE_ODOMETER_KM) return Math.round(asMeters);

  return 0;
};

const isOdometerKey = (key: string): boolean => {
  const normalized = normalizeKey(key);
  return normalized.includes('HODOMETRO') ||
    normalized.includes('ODOMETRO') ||
    normalized.includes('ODOMETER') ||
    normalized.includes('ODOMETROEXATO') ||
    normalized.includes('HODOMETROTOTAL') ||
    normalized.includes('KMTOTAL') ||
    normalized.includes('KMATUAL') ||
    normalized.includes('KMVEICULO') ||
    normalized.includes('QUILOMETRAGEM') ||
    normalized.includes('DISTANCIAACUMULADA');
};

const parseTrackerOdometerKm = (source: any): number => {
  if (!source || typeof source !== 'object') return 0;

  const preferredKeys = [
    'hodometro',
    'HODOMETRO',
    'hodometroTotal',
    'hodometro_total',
    'odometro',
    'ODOMETRO',
    'odometroExato',
    'odometro_exato',
    'odometer',
    'odometerKm',
    'km',
    'kmTotal',
    'kmAtual',
    'quilometragem'
  ];

  const candidates: number[] = [];

  for (const key of preferredKeys) {
    const parsed = parseTelemetryNumber(source[key]);
    const km = parsed !== undefined ? normalizeOdometerUnit(parsed) : 0;
    if (km > 0) candidates.push(km);
  }

  for (const [key, value] of Object.entries(source)) {
    if (!isOdometerKey(key)) continue;
    const parsed = parseTelemetryNumber(value);
    const km = parsed !== undefined ? normalizeOdometerUnit(parsed) : 0;
    if (km > 0) candidates.push(km);
  }

  return candidates.length > 0 ? Math.max(...candidates) : 0;
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(SASCAR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: ''
      },
      body: envelope,
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Sascar HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    return parseSascarReturns(text);
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeVehicle = (vehicle: any) => {
  const plate = stripSascarPlateSuffix(vehicle.placa || vehicle.plate || '');
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

const buildVehicleMaps = (vehicles: any[]) => {
  const idToPlate = new Map<string, string>();
  const plateToId = new Map<string, string>();

  vehicles.forEach(vehicle => {
    const id = String(vehicle.idVeiculo || vehicle.id || '').trim();
    const plate = stripSascarPlateSuffix(vehicle.placa || vehicle.plate || '');
    const plateKey = normalizeKey(plate);

    if (id && plate) idToPlate.set(id, plate);
    if (plateKey && id) plateToId.set(plateKey, id);
  });

  return { idToPlate, plateToId };
};

const attachMappedPlates = (positions: any[], idToPlate: Map<string, string>) => positions.map(position => {
  const id = String(position?.idVeiculo || position?.id || '').trim();
  const mappedPlate = id ? idToPlate.get(id) : '';
  const plate = stripSascarPlateSuffix(position?.placa || position?.plate || mappedPlate || '');

  return {
    ...position,
    ...(plate ? { placa: plate, plate } : {})
  };
});

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
    const requestedVehicles = asArray(body?.vehicles);
    const settings = body?.trackerSettings || {};
    const user = settings.user || DEFAULT_USER;
    const pass = settings.pass || DEFAULT_PASS;
    const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;

    let rawVehicles: any[] = [];
    let idToPlate = new Map<string, string>();
    requestedVehicles.forEach(vehicle => {
      const id = String(vehicle?.code || vehicle?.idVeiculo || vehicle?.id || '').trim();
      const plate = stripSascarPlateSuffix(vehicle?.plate || vehicle?.placa || '');
      if (id && plate) idToPlate.set(id, plate);
    });

    const ids = plates.filter(term => /^\d+$/.test(term));
    if (ids.length > 0) {
      const now = new Date();
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const formatDate = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

      const individualResults = await Promise.allSettled(ids.slice(0, 4).map(idVeiculo =>
        postSoap('obterPacotePosicaoHistorico', `${auth}<idVeiculo>${escapeXml(idVeiculo)}</idVeiculo><dataInicio>${formatDate(start)}</dataInicio><dataFinal>${formatDate(now)}</dataFinal>`)
      ));
      rawVehicles = individualResults.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    } else {
      const rawVehicleList = await postSoap('obterVeiculosJson', `${auth}<quantidade>5000</quantidade>`)
        .catch(() => []);
      const maps = buildVehicleMaps(rawVehicleList);
      idToPlate = maps.idToPlate;

      try {
        rawVehicles = await postSoap('obterPacotePosicoesJSONComPlaca', `${auth}<quantidade>500</quantidade>`);
      } catch (error: any) {
        rawVehicles = await postSoap('obterPacotePosicoesComPlaca', `${auth}<quantidade>500</quantidade>`)
          .catch(() => []);
      }
    }

    let vehicles = uniqueLatest(attachMappedPlates(rawVehicles, idToPlate));

    if (plates.length > 0) {
      vehicles = vehicles.filter(vehicle =>
        plates.includes(normalizeKey(vehicle.placa)) ||
        plates.includes(normalizeKey(vehicle.plate)) ||
        plates.includes(normalizeKey(vehicle.idVeiculo)) ||
        plates.includes(String(vehicle.idVeiculo || vehicle.id || '').trim())
      );
    }

    return res.status(200).json({
      success: true,
      message: `Sincronizacao concluida. ${vehicles.length} veiculos processados.`,
      data: vehicles,
      debug: {
        requestedCodes: ids,
        rawItems: rawVehicles.length,
        returnedVehicles: vehicles.length
      }
    });
  } catch (error: any) {
    return res.status(502).json({
      success: false,
      error: 'Falha ao comunicar com a Sascar',
      details: error?.message || String(error)
    });
  }
}
