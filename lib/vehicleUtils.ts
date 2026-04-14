import { VehicleType } from '../types';

/**
 * Determina se um eixo de um veículo é um eixo direcional.
 * 
 * @param vType O tipo do veículo (ID ou Nome)
 * @param axleIndex O índice do eixo (0-based)
 * @param vehicleTypes Lista de tipos de veículos dinâmicos
 * @returns true se o eixo for direcional
 */
export const isSteerAxle = (vType: string, axleIndex: number, vehicleTypes: VehicleType[] = []): boolean => {
  const upperType = vType.toUpperCase();
  
  // Regra especial para o veículo BSX3G15: considerar os dois primeiros eixos como direcionais
  if (upperType.includes('BSX3G15')) {
    return axleIndex === 0 || axleIndex === 1;
  }

  // Força 0 eixos direcionais para qualquer carreta, mesmo se cadastrado errado no banco
  if (upperType.includes('CARRETA')) {
    return false;
  }

  const vehicleType = vehicleTypes.find(vt => vt.id === vType || vt.name === vType);
  
  if (vehicleType) {
    return axleIndex < (vehicleType.steerAxlesCount ?? 1);
  }
  
  // Fallback para tipos conhecidos se não encontrar o objeto de tipo
  if (['CAVALO', '3/4', 'TOCO'].includes(upperType)) {
    return axleIndex === 0;
  }
  if (['BI-TRUCK', 'BITRUCK'].includes(upperType)) {
    return axleIndex === 0 || axleIndex === 1;
  }
  
  return false;
};

/**
 * Retorna as posições de pneus para um determinado eixo.
 * 
 * @param axleIndex O índice do eixo (0-based)
 * @param isSteer Se o eixo é direcional
 * @returns Array de strings com as posições (ex: ['1E', '1D'] ou ['1EE', '1EI', '1DI', '1DE'])
 */
export const getAxlePositions = (axleIndex: number, isSteer: boolean): string[] => {
  const axleNum = axleIndex + 1;
  if (isSteer) {
    return [`${axleNum}E`, `${axleNum}D`];
  }
  return [`${axleNum}EE`, `${axleNum}EI`, `${axleNum}DI`, `${axleNum}DE`];
};

/**
 * Retorna todas as posições válidas para um veículo.
 */
export const getAllValidPositions = (vehicle: VehicleType | any, vehicleTypes: VehicleType[] = []): string[] => {
  const positions: string[] = [];
  const axles = vehicle.axles || 0;
  for (let i = 0; i < axles; i++) {
    const isSteer = isSteerAxle(vehicle.type, i, vehicleTypes);
    const isSupport = vehicle.type === 'BI-TRUCK' && i === axles - 1;
    
    if (isSteer) {
      positions.push(...getAxlePositions(i, true));
    } else if (isSupport) {
      positions.push(...getAxlePositions(i, false));
    } else {
      positions.push(...getAxlePositions(i, false));
    }
  }
  return positions;
};


