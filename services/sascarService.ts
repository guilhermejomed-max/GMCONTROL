import type { TrackerSettings } from '../types';
import { parseTrackerOdometerKm } from '../lib/odometerUtils';
import { parseSascarDate } from '../src/utils';

const SASCAR_PROXY_URL = '/proxy-sascar/SasIntegraWSService';
const DEFAULT_USER = 'JOMEDELOGTORREOPENTECH';
const DEFAULT_PASS = 'sascar';

const escapeXml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const normalizeKey = (value: unknown): string => String(value || '')
  .replace(/[^A-Z0-9]/gi, '')
  .toUpperCase();

const parseOptionalNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(String(value).trim().replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 120000) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Timeout da requisicao (${Math.round(timeout / 1000)}s)`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const parseReturnNode = (node: Element): any | null => {
  const jsonText = (node.textContent || '').trim();
  if (jsonText) {
    try {
      return JSON.parse(jsonText);
    } catch {
      // Some Sascar methods return XML children instead of JSON in <return>.
    }
  }

  const output: Record<string, string> = {};
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (child.nodeType !== 1) continue;
    const element = child as Element;
    const key = element.localName || element.nodeName.replace(/^.*:/, '');
    output[key] = element.textContent || '';
  }

  return Object.keys(output).length > 0 ? output : null;
};

const parseSoapReturns = (xmlText: string): any[] => {
  const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const fault = xmlDoc.getElementsByTagName('faultstring')[0] ||
    xmlDoc.getElementsByTagNameNS('*', 'faultstring')[0];
  if (fault) throw new Error(`Erro Sascar: ${fault.textContent || 'fault sem detalhe'}`);

  let returns = xmlDoc.getElementsByTagName('return');
  if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagNameNS('*', 'return');
  if (!returns || returns.length === 0) returns = xmlDoc.getElementsByTagName('ns2:return');

  const items: any[] = [];
  for (let i = 0; i < returns.length; i++) {
    const parsed = parseReturnNode(returns[i]);
    if (!parsed) continue;
    if (Array.isArray(parsed)) items.push(...parsed);
    else items.push(parsed);
  }
  return items;
};

const postSoap = async (method: string, body: string, timeout = 120000): Promise<any[]> => {
  const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:int="http://webservice.web.integracao.sascar.com.br/">
   <soapenv:Header/>
   <soapenv:Body>
      <int:${method}>
         ${body}
      </int:${method}>
   </soapenv:Body>
</soapenv:Envelope>`.trim();

  const response = await fetchWithTimeout(SASCAR_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8'
    },
    body: soapEnvelope
  }, timeout);

  const text = await response.text();
  if (!response.ok) throw new Error(`Erro HTTP Sascar/proxy: ${response.status} - ${text.slice(0, 240)}`);
  return parseSoapReturns(text);
};

const normalizeVehicle = (v: any) => {
  const placa = v.placa || '';
  const latitude = parseOptionalNumber(v.latitude) || 0;
  const longitude = parseOptionalNumber(v.longitude) || 0;

  return {
    ...v,
    idVeiculo: v.idVeiculo ? String(v.idVeiculo) : '',
    placa,
    plate: placa || v.idVeiculo || '',
    latitude,
    longitude,
    odometer: parseTrackerOdometerKm(v),
    litrometer: parseOptionalNumber(v.litrometro, v.litrometro2, v.litrometroTotal, v.totalLitros, v.totalCombustivel),
    speed: Number(v.velocidade ?? 0),
    ignition: v.ignicao === 'S' || v.ignicao === 'true' || v.ignicao === '1' || v.ignicao === 1,
    lastLocation: {
      lat: latitude,
      lng: longitude,
      address: v.rua || '',
      city: v.cidade || '',
      state: v.uf || '',
      updatedAt: v.dataPosicao || v.dataHora || ''
    }
  };
};

const upsertLatest = (map: Map<string, any>, rawVehicle: any) => {
  const normalizedVehicle = normalizeVehicle(rawVehicle);
  const uniqueKey = normalizedVehicle.idVeiculo
    ? String(normalizedVehicle.idVeiculo)
    : String(normalizedVehicle.placa || '').replace(/[^A-Z0-9-]/gi, '').toUpperCase();

  if (!uniqueKey) return;

  const existing = map.get(uniqueKey);
  if (!existing || parseSascarDate(normalizedVehicle.lastLocation.updatedAt) > parseSascarDate(existing.lastLocation.updatedAt)) {
    const hasInvalidPosition = normalizedVehicle.latitude === 0 && normalizedVehicle.longitude === 0;
    const existingHasPosition = existing && (existing.latitude !== 0 || existing.longitude !== 0);

    if (hasInvalidPosition && existingHasPosition) {
      normalizedVehicle.latitude = existing.latitude;
      normalizedVehicle.longitude = existing.longitude;
      normalizedVehicle.lastLocation = {
        ...normalizedVehicle.lastLocation,
        lat: existing.lastLocation?.lat ?? existing.latitude,
        lng: existing.lastLocation?.lng ?? existing.longitude,
        address: existing.lastLocation?.address || normalizedVehicle.lastLocation.address,
        city: existing.lastLocation?.city || normalizedVehicle.lastLocation.city,
        state: existing.lastLocation?.state || normalizedVehicle.lastLocation.state
      };
    }

    map.set(uniqueKey, normalizedVehicle);
  }
};

const matchesTerm = (vehicle: any, term: string) => {
  const termPlate = normalizeKey(term);
  const termId = /^\d+$/.test(String(term).trim()) ? String(term).trim() : '';
  const vehiclePlate = normalizeKey(vehicle.placa || vehicle.plate);
  const vehicleId = String(vehicle.idVeiculo || '').replace(/\D/g, '');
  return (vehiclePlate && vehiclePlate === termPlate) || (termId && vehicleId === termId);
};

export const sascarService = {
  getVehicles: async (plates?: string[], trackerSettings?: TrackerSettings, retries = 2) => {
    const user = trackerSettings?.user || DEFAULT_USER;
    const pass = trackerSettings?.pass || DEFAULT_PASS;
    const auth = `<usuario>${escapeXml(user)}</usuario><senha>${escapeXml(pass)}</senha>`;

    const allVehiclesMap = new Map<string, any>();
    const targetTerms = Array.isArray(plates) ? plates.filter(Boolean) : [];

    let hasMoreData = true;
    let loopCount = 0;
    const maxLoops = 10;
    const maxRetries = Math.max(0, retries);

    while (hasMoreData && loopCount < maxLoops) {
      loopCount++;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const items = await postSoap(
            'obterPacotePosicoesJSONComPlaca',
            `${auth}<quantidade>5000</quantidade>`,
            180000
          );

          if (items.length < 3000) hasMoreData = false;
          items.forEach(vehicle => {
            if (vehicle?.placa || vehicle?.idVeiculo) upsertLatest(allVehiclesMap, vehicle);
          });
          break;
        } catch (error: any) {
          if (attempt === maxRetries) {
            console.error('Erro na integracao Sascar (Final):', error);
            hasMoreData = false;
            if (allVehiclesMap.size === 0 && targetTerms.length === 0) throw error;
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          }
        }
      }
    }

    const vehicles = Array.from(allVehiclesMap.values());
    const matchedByRequestedTerms = targetTerms.length > 0
      ? vehicles.filter(vehicle => targetTerms.some(term => matchesTerm(vehicle, term))).length
      : vehicles.length;

    console.info('[Sascar Sync] Pacote Sascar processado', {
      veiculosRetornados: vehicles.length,
      termosSolicitados: targetTerms.length,
      correspondenciasDiretas: matchedByRequestedTerms
    });

    return { success: true, data: vehicles };
  }
};
