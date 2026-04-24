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
