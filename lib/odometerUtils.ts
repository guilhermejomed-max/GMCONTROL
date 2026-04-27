export const MAX_REASONABLE_ODOMETER_KM = 2000000;

export const parseTelemetryNumber = (value: any): number | undefined => {
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

export const isImplausibleImportedOdometer = (odometerKm: number): boolean => {
  return !Number.isFinite(odometerKm) || odometerKm <= 0 || odometerKm > MAX_REASONABLE_ODOMETER_KM;
};

const normalizeKey = (key: string): string => key
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]/g, '');

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

const normalizeOdometerUnit = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (value <= MAX_REASONABLE_ODOMETER_KM) {
    return Math.round(value);
  }

  const asMeters = value / 1000;
  if (asMeters > 0 && asMeters <= MAX_REASONABLE_ODOMETER_KM) {
    return Math.round(asMeters);
  }

  return 0;
};

export const parseTrackerOdometerKm = (source: any): number => {
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

export const chooseAuthoritativeOdometer = (currentOdometerKm: number, trackerOdometerKm: number): number => {
  const current = Number(currentOdometerKm) || 0;
  const tracker = Number(trackerOdometerKm) || 0;

  if (tracker <= 0) return current;
  if (current <= 0) return tracker;

  const currentLooksLikeDocumentNumber =
    current > MAX_REASONABLE_ODOMETER_KM &&
    tracker > 1000 &&
    tracker <= MAX_REASONABLE_ODOMETER_KM;

  const currentIsFarAboveTracker =
    current > tracker * 5 &&
    current - tracker > 1000000 &&
    tracker > 1000 &&
    tracker <= MAX_REASONABLE_ODOMETER_KM;

  if (currentLooksLikeDocumentNumber || currentIsFarAboveTracker) {
    return tracker;
  }

  return Math.max(current, tracker);
};
