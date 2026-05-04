import { ServiceOrder, SystemSettings, Tire, TireStatus, Vehicle } from '../types';

export type TireAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type TireAlertType =
  | 'LOW_TREAD'
  | 'WARNING_TREAD'
  | 'NO_INSPECTION'
  | 'INVALID_KM'
  | 'HIGH_CPK'
  | 'IRREGULAR_WEAR'
  | 'PRESSURE'
  | 'POSITION_MISSING'
  | 'RETREAD_PERFORMANCE';

export interface TireIntelligenceAlert {
  id: string;
  type: TireAlertType;
  severity: TireAlertSeverity;
  tireId: string;
  fireNumber: string;
  title: string;
  message: string;
  vehicleId?: string;
  vehiclePlate?: string;
  value?: number;
  metric?: string;
}

export interface TireTimelineEvent {
  id: string;
  date: string;
  label: string;
  details: string;
  source: 'purchase' | 'history' | 'service-order';
}

export interface TireIntelligenceRow {
  tire: Tire;
  vehicle?: Vehicle;
  isMounted: boolean;
  currentRunKm: number;
  liveKm: number;
  investment: number;
  cpk: number;
  daysSinceInspection?: number;
  treadSpread: number;
  lifecycleStage: string;
  alerts: TireIntelligenceAlert[];
  timeline: TireTimelineEvent[];
}

export interface TireVehicleRisk {
  vehicle: Vehicle;
  tireCount: number;
  alertCount: number;
  criticalCount: number;
  lowTreadCount: number;
  irregularWearCount: number;
  avgCpk: number;
}

export interface TireRetreaderPerformance {
  retreader: string;
  tireCount: number;
  avgCpk: number;
  avgKm: number;
  totalInvestment: number;
  alertCount: number;
  rejectionLikeCount: number;
}

export interface TirePurchaseForecast {
  size: string;
  count: number;
  estimatedCost: number;
}

export interface TireIntelligenceSummary {
  rows: TireIntelligenceRow[];
  alerts: TireIntelligenceAlert[];
  criticalCount: number;
  warningCount: number;
  lowTreadCount: number;
  overdueInspectionCount: number;
  irregularWearCount: number;
  pressureAlertCount: number;
  avgCpk: number;
  forecastPurchaseCount: number;
  estimatedPurchaseCost: number;
  purchaseForecast: TirePurchaseForecast[];
  vehicleRiskRows: TireVehicleRisk[];
  retreaderRows: TireRetreaderPerformance[];
}

interface TireVehicleRiskAccumulator {
  vehicle: Vehicle;
  tireCount: number;
  alertCount: number;
  criticalCount: number;
  lowTreadCount: number;
  irregularWearCount: number;
  cpkSum: number;
  cpkCount: number;
}

interface TireRetreaderAccumulator {
  retreader: string;
  tireCount: number;
  totalInvestment: number;
  alertCount: number;
  rejectionLikeCount: number;
  kmSum: number;
  cpkSum: number;
  cpkCount: number;
}

const safeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hasValidVehicleId = (value: unknown): value is string => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized !== '' && normalized !== 'null' && normalized !== 'undefined';
};

const toTime = (date?: string): number => {
  if (!date) return 0;
  const value = new Date(date.includes('T') ? date : `${date}T12:00:00`).getTime();
  return Number.isFinite(value) ? value : 0;
};

const daysSince = (date?: string): number | undefined => {
  const time = toTime(date);
  if (!time) return undefined;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
};

const tireSize = (tire: Tire): string => `${tire.width}/${tire.profile} R${tire.rim}`;

export const getTireCurrentRunKm = (tire: Tire, vehicle?: Vehicle): number => {
  if (!vehicle || !hasValidVehicleId(tire.vehicleId) || tire.installOdometer === undefined || tire.installOdometer === null) {
    return 0;
  }

  return Math.max(0, safeNumber(vehicle.odometer) - safeNumber(tire.installOdometer));
};

export const getTireLiveKm = (tire: Tire, vehicle?: Vehicle): number => {
  return safeNumber(tire.totalKms) + getTireCurrentRunKm(tire, vehicle);
};

export const getTireInvestment = (tire: Tire): number => {
  const totalInvestment = safeNumber(tire.totalInvestment);
  if (totalInvestment > 0) return totalInvestment;
  return safeNumber(tire.price) + safeNumber(tire.retreadCost);
};

export const getTireCpk = (tire: Tire, vehicle?: Vehicle): number => {
  const km = getTireLiveKm(tire, vehicle);
  const investment = getTireInvestment(tire);
  return km > 0 ? investment / km : 0;
};

export const getTireLifecycleStage = (tire: Tire): string => {
  if (tire.status === TireStatus.DAMAGED) return 'Baixado / sucata';
  if (tire.status === TireStatus.RETREADING) return 'Em recapagem';
  if ((tire.retreadCount || 0) > 0) return `${(tire.retreadCount || 0) + 1}a vida`;
  return '1a vida original';
};

export const getTireTreadSpread = (tire: Tire): number => {
  const readings = tire.treadReadings;
  if (!readings) return 0;

  const values = [readings.depth1, readings.depth2, readings.depth3, readings.depth4]
    .map(value => safeNumber(value))
    .filter(value => value > 0);

  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
};

export const getTireTimeline = (tire: Tire, serviceOrders: ServiceOrder[] = []): TireTimelineEvent[] => {
  const events: TireTimelineEvent[] = [];

  if (tire.purchaseDate) {
    events.push({
      id: `${tire.id}-purchase`,
      date: tire.purchaseDate,
      label: 'Compra',
      details: `${tire.brand} ${tire.model} - ${tireSize(tire)}`,
      source: 'purchase'
    });
  }

  (tire.history || []).forEach((entry, index) => {
    events.push({
      id: `${tire.id}-history-${index}`,
      date: entry.date,
      label: entry.action,
      details: entry.details,
      source: 'history'
    });
  });

  serviceOrders
    .filter(order => order.tireId === tire.id || order.tireFireNumber === tire.fireNumber)
    .forEach(order => {
      events.push({
        id: `${tire.id}-os-${order.id}`,
        date: order.completedAt || order.date || order.createdAt,
        label: `OS #${order.orderNumber || order.id}`,
        details: `${order.title}${order.totalCost ? ` - ${order.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}`,
        source: 'service-order'
      });
    });

  return events.sort((a, b) => toTime(b.date) - toTime(a.date));
};

const buildAlert = (
  row: TireIntelligenceRow,
  type: TireAlertType,
  severity: TireAlertSeverity,
  title: string,
  message: string,
  value?: number,
  metric?: string
): TireIntelligenceAlert => ({
  id: `${row.tire.id}-${type}`,
  type,
  severity,
  tireId: row.tire.id,
  fireNumber: row.tire.fireNumber,
  title,
  message,
  vehicleId: row.vehicle?.id,
  vehiclePlate: row.vehicle?.plate,
  value,
  metric
});

const buildRowAlerts = (
  row: TireIntelligenceRow,
  settings: SystemSettings | undefined,
  fleetAvgCpk: number
): TireIntelligenceAlert[] => {
  const alerts: TireIntelligenceAlert[] = [];
  const minTreadDepth = settings?.minTreadDepth ?? 3;
  const warningTreadDepth = settings?.warningTreadDepth ?? Math.max(minTreadDepth + 2, 5);
  const maxDaysWithoutInspection = settings?.calibrationIntervalDays ?? 30;
  const tire = row.tire;

  if (tire.currentTreadDepth <= minTreadDepth && tire.status !== TireStatus.DAMAGED) {
    alerts.push(buildAlert(
      row,
      'LOW_TREAD',
      'CRITICAL',
      'Sulco abaixo do minimo',
      `Pneu ${tire.fireNumber} esta com ${tire.currentTreadDepth} mm. Deve sair de operacao.`,
      tire.currentTreadDepth,
      'mm'
    ));
  } else if (tire.currentTreadDepth <= warningTreadDepth && tire.status !== TireStatus.DAMAGED) {
    alerts.push(buildAlert(
      row,
      'WARNING_TREAD',
      'WARNING',
      'Sulco em atencao',
      `Pneu ${tire.fireNumber} esta proximo do limite com ${tire.currentTreadDepth} mm.`,
      tire.currentTreadDepth,
      'mm'
    ));
  }

  if (row.daysSinceInspection !== undefined && row.daysSinceInspection > maxDaysWithoutInspection) {
    alerts.push(buildAlert(
      row,
      'NO_INSPECTION',
      row.daysSinceInspection > maxDaysWithoutInspection * 2 ? 'CRITICAL' : 'WARNING',
      'Inspecao atrasada',
      `Sem inspecao ha ${row.daysSinceInspection} dias.`,
      row.daysSinceInspection,
      'dias'
    ));
  } else if (row.daysSinceInspection === undefined && tire.status !== TireStatus.DAMAGED) {
    alerts.push(buildAlert(
      row,
      'NO_INSPECTION',
      row.isMounted ? 'WARNING' : 'INFO',
      'Sem inspecao registrada',
      'Pneu ainda nao tem leitura de sulco/pressao registrada.',
    ));
  }

  if (row.isMounted && row.vehicle && tire.installOdometer !== undefined && safeNumber(row.vehicle.odometer) < safeNumber(tire.installOdometer)) {
    alerts.push(buildAlert(
      row,
      'INVALID_KM',
      'CRITICAL',
      'KM inconsistente',
      `KM do veiculo (${row.vehicle.odometer}) esta menor que o KM de montagem (${tire.installOdometer}).`,
      safeNumber(tire.installOdometer) - safeNumber(row.vehicle.odometer),
      'km'
    ));
  }

  if (row.treadSpread >= 2) {
    alerts.push(buildAlert(
      row,
      'IRREGULAR_WEAR',
      row.treadSpread >= 4 ? 'CRITICAL' : 'WARNING',
      'Desgaste irregular',
      `Diferenca de ${row.treadSpread.toFixed(1)} mm entre leituras. Verificar alinhamento, balanceamento ou pressao.`,
      row.treadSpread,
      'mm'
    ));
  }

  const targetPressure = safeNumber(tire.targetPressure || settings?.standardPressure);
  const pressure = safeNumber(tire.pressure);
  if (targetPressure > 0 && pressure > 0) {
    const pressureDiff = Math.abs(pressure - targetPressure);
    if (pressureDiff > targetPressure * 0.12) {
      alerts.push(buildAlert(
        row,
        'PRESSURE',
        pressureDiff > targetPressure * 0.2 ? 'CRITICAL' : 'WARNING',
        'Pressao fora do alvo',
        `Pressao atual ${pressure} psi; alvo ${targetPressure} psi.`,
        pressureDiff,
        'psi'
      ));
    }
  }

  if (row.isMounted && !tire.position) {
    alerts.push(buildAlert(
      row,
      'POSITION_MISSING',
      'WARNING',
      'Posicao nao informada',
      'Pneu montado sem posicao. Isso quebra analise por eixo/lado.',
    ));
  }

  if (fleetAvgCpk > 0 && row.liveKm > 3000 && row.cpk > fleetAvgCpk * 1.35) {
    alerts.push(buildAlert(
      row,
      'HIGH_CPK',
      row.cpk > fleetAvgCpk * 1.8 ? 'CRITICAL' : 'WARNING',
      'CPK acima da frota',
      `CPK ${row.cpk.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}; media ${fleetAvgCpk.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}.`,
      row.cpk,
      'R$/km'
    ));
  }

  if ((tire.retreadCount || 0) > 0 && row.liveKm > 3000 && fleetAvgCpk > 0 && row.cpk > fleetAvgCpk * 1.25) {
    alerts.push(buildAlert(
      row,
      'RETREAD_PERFORMANCE',
      'WARNING',
      'Recapagem com baixa performance',
      `Pneu recapado acima da media de CPK. Avaliar recapadora ${tire.retreader || 'nao informada'}.`,
      row.cpk,
      'R$/km'
    ));
  }

  return alerts;
};

export const buildTireIntelligence = (
  tires: Tire[],
  vehicles: Vehicle[],
  settings?: SystemSettings,
  serviceOrders: ServiceOrder[] = []
): TireIntelligenceSummary => {
  const vehiclesById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));

  const rows: TireIntelligenceRow[] = tires.map(tire => {
    const vehicle = hasValidVehicleId(tire.vehicleId) ? vehiclesById.get(tire.vehicleId) : undefined;
    const currentRunKm = getTireCurrentRunKm(tire, vehicle);
    const liveKm = getTireLiveKm(tire, vehicle);
    const investment = getTireInvestment(tire);

    return {
      tire,
      vehicle,
      isMounted: hasValidVehicleId(tire.vehicleId),
      currentRunKm,
      liveKm,
      investment,
      cpk: liveKm > 0 ? investment / liveKm : 0,
      daysSinceInspection: daysSince(tire.lastInspectionDate),
      treadSpread: getTireTreadSpread(tire),
      lifecycleStage: getTireLifecycleStage(tire),
      alerts: [],
      timeline: getTireTimeline(tire, serviceOrders)
    };
  });

  const cpkRows = rows.filter(row => row.cpk > 0 && row.liveKm > 1000);
  const avgCpk = cpkRows.length
    ? cpkRows.reduce((sum, row) => sum + row.cpk, 0) / cpkRows.length
    : 0;

  rows.forEach(row => {
    row.alerts = buildRowAlerts(row, settings, avgCpk);
  });

  const severityWeight: Record<TireAlertSeverity, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 };
  const alerts = rows
    .flatMap(row => row.alerts)
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  const minTreadDepth = settings?.minTreadDepth ?? 3;
  const warningTreadDepth = settings?.warningTreadDepth ?? Math.max(minTreadDepth + 2, 5);
  const atRiskRows = rows.filter(row =>
    row.tire.status !== TireStatus.DAMAGED &&
    row.tire.currentTreadDepth <= warningTreadDepth
  );

  const avgPriceBySize = rows.reduce((acc, row) => {
    const size = tireSize(row.tire);
    const price = safeNumber(row.tire.price);
    if (price > 0) {
      acc[size] = acc[size] || { sum: 0, count: 0 };
      acc[size].sum += price;
      acc[size].count += 1;
    }
    return acc;
  }, {} as Record<string, { sum: number; count: number }>);

  const purchaseForecast = Object.values(atRiskRows.reduce((acc, row) => {
    const size = tireSize(row.tire);
    const avgPrice = avgPriceBySize[size]?.count
      ? avgPriceBySize[size].sum / avgPriceBySize[size].count
      : safeNumber(row.tire.price, 2800);

    acc[size] = acc[size] || { size, count: 0, estimatedCost: 0 };
    acc[size].count += 1;
    acc[size].estimatedCost += avgPrice;
    return acc;
  }, {} as Record<string, TirePurchaseForecast>))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const vehicleRiskRows = Object.values(rows.reduce((acc, row) => {
    if (!row.vehicle) return acc;
    const current = acc[row.vehicle.id] || {
      vehicle: row.vehicle,
      tireCount: 0,
      alertCount: 0,
      criticalCount: 0,
      lowTreadCount: 0,
      irregularWearCount: 0,
      cpkSum: 0,
      cpkCount: 0
    };

    current.tireCount += 1;
    current.alertCount += row.alerts.length;
    current.criticalCount += row.alerts.filter(alert => alert.severity === 'CRITICAL').length;
    current.lowTreadCount += row.alerts.some(alert => alert.type === 'LOW_TREAD') ? 1 : 0;
    current.irregularWearCount += row.alerts.some(alert => alert.type === 'IRREGULAR_WEAR') ? 1 : 0;
    if (row.cpk > 0) {
      current.cpkSum += row.cpk;
      current.cpkCount += 1;
    }

    acc[row.vehicle.id] = current;
    return acc;
  }, {} as Record<string, TireVehicleRiskAccumulator>))
    .map(row => ({
      vehicle: row.vehicle,
      tireCount: row.tireCount,
      alertCount: row.alertCount,
      criticalCount: row.criticalCount,
      lowTreadCount: row.lowTreadCount,
      irregularWearCount: row.irregularWearCount,
      avgCpk: row.cpkCount ? row.cpkSum / row.cpkCount : 0
    }))
    .filter(row => row.alertCount > 0)
    .sort((a, b) => (b.criticalCount - a.criticalCount) || (b.alertCount - a.alertCount))
    .slice(0, 6);

  const retreaderRows = Object.values(rows.reduce((acc, row) => {
    const retreader = row.tire.retreader?.trim();
    if (!retreader) return acc;

    const current = acc[retreader] || {
      retreader,
      tireCount: 0,
      totalInvestment: 0,
      alertCount: 0,
      rejectionLikeCount: 0,
      kmSum: 0,
      cpkSum: 0,
      cpkCount: 0
    };

    current.tireCount += 1;
    current.totalInvestment += row.investment;
    current.alertCount += row.alerts.filter(alert => alert.type === 'RETREAD_PERFORMANCE' || alert.type === 'HIGH_CPK').length;
    current.rejectionLikeCount += row.tire.status === TireStatus.DAMAGED || row.tire.currentTreadDepth <= minTreadDepth ? 1 : 0;
    current.kmSum += row.liveKm;
    if (row.cpk > 0) {
      current.cpkSum += row.cpk;
      current.cpkCount += 1;
    }

    acc[retreader] = current;
    return acc;
  }, {} as Record<string, TireRetreaderAccumulator>))
    .map(row => ({
      retreader: row.retreader,
      tireCount: row.tireCount,
      totalInvestment: row.totalInvestment,
      alertCount: row.alertCount,
      rejectionLikeCount: row.rejectionLikeCount,
      avgKm: row.tireCount ? row.kmSum / row.tireCount : 0,
      avgCpk: row.cpkCount ? row.cpkSum / row.cpkCount : 0
    }))
    .sort((a, b) => (b.rejectionLikeCount - a.rejectionLikeCount) || (b.avgCpk - a.avgCpk))
    .slice(0, 6);

  return {
    rows,
    alerts,
    criticalCount: alerts.filter(alert => alert.severity === 'CRITICAL').length,
    warningCount: alerts.filter(alert => alert.severity === 'WARNING').length,
    lowTreadCount: alerts.filter(alert => alert.type === 'LOW_TREAD').length,
    overdueInspectionCount: alerts.filter(alert => alert.type === 'NO_INSPECTION').length,
    irregularWearCount: alerts.filter(alert => alert.type === 'IRREGULAR_WEAR').length,
    pressureAlertCount: alerts.filter(alert => alert.type === 'PRESSURE').length,
    avgCpk,
    forecastPurchaseCount: purchaseForecast.reduce((sum, item) => sum + item.count, 0),
    estimatedPurchaseCost: purchaseForecast.reduce((sum, item) => sum + item.estimatedCost, 0),
    purchaseForecast,
    vehicleRiskRows,
    retreaderRows
  };
};
