
import { Vehicle, SystemSettings } from '../../types';

/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine.
 * Retorna a distância em metros.
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Verifica se um veículo está em alguma das bases (pontos salvos) configuradas.
 */
export const isVehicleInBase = (vehicle: Vehicle, settings: SystemSettings | undefined): boolean => {
  if (!vehicle.lastLocation || !settings?.savedPoints || settings.savedPoints.length === 0) {
    return false;
  }

  const { lat, lng } = vehicle.lastLocation;

  return settings.savedPoints.some(point => {
    const distance = calculateDistance(lat, lng, point.lat, point.lng);
    const radius = point.radius || 500;
    return distance <= radius;
  });
};
