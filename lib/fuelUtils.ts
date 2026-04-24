import { FuelEntry } from '../types';

export const isGasFuelEntry = (entry: Pick<FuelEntry, 'category' | 'fuelType' | 'kg'>): boolean => {
  const fuelType = String(entry.fuelType || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return entry.category === 'GAS' ||
    fuelType.includes('GNV') ||
    fuelType.includes('GAS') ||
    Number(entry.kg) > 0;
};

export const getFuelVolume = (entry: Pick<FuelEntry, 'category' | 'fuelType' | 'liters' | 'kg'>): number => {
  if (isGasFuelEntry(entry)) {
    return Number(entry.liters) || Number(entry.kg) || 0;
  }
  return Number(entry.liters) || 0;
};

export const getFuelEntryTime = (entry: Pick<FuelEntry, 'date'>): number => {
  const date = String(entry.date || '');
  return new Date(date + (date.includes('T') ? '' : 'T12:00:00')).getTime();
};

export const sortFuelEntries = <T extends FuelEntry>(entries: T[]): T[] => {
  return [...entries].sort((a, b) => {
    const dateA = getFuelEntryTime(a);
    const dateB = getFuelEntryTime(b);
    if (dateA !== dateB) return dateA - dateB;
    return (Number(a.odometer) || 0) - (Number(b.odometer) || 0);
  });
};

export interface FuelEfficiencyResult {
  average: number;
  totalKm: number;
  consumedVolume: number;
  validSegments: number;
}

export interface RollingFuelEfficiencyResult extends FuelEfficiencyResult {
  usedFillUps: number;
  alerts: string[];
  discardedSegments: number;
  regressiveSegments: number;
  partialFillUps: number;
}

const formatFuelDate = (entry: Pick<FuelEntry, 'date'>): string => {
  const time = getFuelEntryTime(entry);
  if (!Number.isFinite(time)) return 'data invalida';
  return new Date(time).toLocaleDateString('pt-BR');
};

const hasPartialFillUpSignal = (entry: Pick<FuelEntry, 'notes'>): boolean => {
  const notes = String(entry.notes || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return /\b(parcial|nao cheio|meio tanque|incompleto|sem completar)\b/.test(notes);
};

export const calculateFuelEfficiency = (entries: FuelEntry[], maxSegmentKm = 5000): FuelEfficiencyResult => {
  const sorted = sortFuelEntries(entries);
  let totalKm = 0;
  let consumedVolume = 0;
  let validSegments = 0;

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const kmDiff = (Number(current.odometer) || 0) - (Number(previous.odometer) || 0);
    const volume = getFuelVolume(current);

    if (kmDiff <= 0 || kmDiff > maxSegmentKm || volume <= 0) continue;

    totalKm += kmDiff;
    consumedVolume += volume;
    validSegments++;
  }

  return {
    average: consumedVolume > 0 ? totalKm / consumedVolume : 0,
    totalKm,
    consumedVolume,
    validSegments
  };
};

export const calculateRollingFuelEfficiency = (
  entries: FuelEntry[],
  targetKm = 1000,
  maxSegmentKm = 5000
): RollingFuelEfficiencyResult => {
  const sorted = sortFuelEntries(entries);
  const alerts: string[] = [];
  const validSegments: Array<{ km: number; volume: number; current: FuelEntry }> = [];
  let discardedSegments = 0;
  let regressiveSegments = 0;
  let partialFillUps = 0;

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const previousOdometer = Number(previous.odometer) || 0;
    const currentOdometer = Number(current.odometer) || 0;
    const kmDiff = currentOdometer - previousOdometer;
    const volume = getFuelVolume(current);

    const isPartialFillUp = hasPartialFillUpSignal(current);

    if (isPartialFillUp) {
      partialFillUps++;
      alerts.push(`Abastecimento parcial em ${formatFuelDate(current)} (${currentOdometer.toLocaleString('pt-BR')} km).`);
    }

    if (kmDiff <= 0) {
      regressiveSegments++;
      discardedSegments++;
      alerts.push(`KM regressivo em ${formatFuelDate(current)}: ${previousOdometer.toLocaleString('pt-BR')} km para ${currentOdometer.toLocaleString('pt-BR')} km.`);
      continue;
    }

    if (kmDiff > maxSegmentKm) {
      discardedSegments++;
      alerts.push(`Trecho descartado em ${formatFuelDate(current)}: ${kmDiff.toLocaleString('pt-BR')} km entre abastecimentos.`);
      continue;
    }

    if (volume <= 0) {
      discardedSegments++;
      alerts.push(`Trecho descartado em ${formatFuelDate(current)}: volume de abastecimento zerado ou invalido.`);
      continue;
    }

    if (isPartialFillUp) {
      discardedSegments++;
      alerts.push(`Trecho descartado em ${formatFuelDate(current)}: abastecimento parcial nao entra na media.`);
      continue;
    }

    validSegments.push({ km: kmDiff, volume, current });
  }

  let totalKm = 0;
  let consumedVolume = 0;
  let usedFillUps = 0;

  for (let i = validSegments.length - 1; i >= 0 && totalKm < targetKm; i--) {
    const segment = validSegments[i];
    const remainingKm = targetKm - totalKm;
    const kmUsed = Math.min(segment.km, remainingKm);
    const segmentShare = kmUsed / segment.km;

    totalKm += kmUsed;
    consumedVolume += segment.volume * segmentShare;
    usedFillUps++;
  }

  return {
    average: consumedVolume > 0 ? totalKm / consumedVolume : 0,
    totalKm,
    consumedVolume,
    validSegments: validSegments.length,
    usedFillUps,
    alerts,
    discardedSegments,
    regressiveSegments,
    partialFillUps
  };
};

export const calculateEntryEfficiency = (entry: FuelEntry, allEntries: FuelEntry[], maxSegmentKm = 5000): number => {
  const vehicleEntries = sortFuelEntries(allEntries.filter(e => e.vehicleId === entry.vehicleId));
  const index = vehicleEntries.findIndex(e => e.id === entry.id);
  if (index <= 0) return 0;

  const previous = vehicleEntries[index - 1];
  const kmDiff = (Number(entry.odometer) || 0) - (Number(previous.odometer) || 0);
  const volume = getFuelVolume(entry);

  if (kmDiff <= 0 || kmDiff > maxSegmentKm || volume <= 0) return 0;
  return kmDiff / volume;
};
