import React, { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileText,
  Fuel,
  Gauge,
  MapPin,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Truck,
  Wrench,
  Zap
} from 'lucide-react';
import {
  Branch,
  Driver,
  FinancialRecord,
  FuelEntry,
  MaintenanceSchedule,
  Occurrence,
  PublicServiceRequest,
  ServiceOrder,
  TabView,
  Tire,
  Vehicle
} from '../types';

interface ExecutiveDashboardProps {
  vehicles: Vehicle[];
  tires: Tire[];
  branches?: Branch[];
  defaultBranchId?: string;
  serviceOrders?: ServiceOrder[];
  fuelEntries?: FuelEntry[];
  financialRecords?: FinancialRecord[];
  drivers?: Driver[];
  publicServiceRequests?: PublicServiceRequest[];
  occurrences?: Occurrence[];
  maintenanceSchedules?: MaintenanceSchedule[];
  onNavigate: (tab: TabView) => void;
}

type AlertSeverity = 'CRITICO' | 'ALTO' | 'MEDIO';

interface ExecutiveAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  impact?: string;
  tab: TabView;
  action: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const money = (value: number, compact = false) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: compact ? 0 : 2
  }).format(Number(value || 0));

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(Number(value || 0));

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysSince = (value?: string) => {
  const date = parseDate(value);
  if (!date) return 9999;
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
};

const daysUntil = (value?: string) => {
  const date = parseDate(value);
  if (!date) return 9999;
  return Math.ceil((date.getTime() - Date.now()) / DAY_MS);
};

const entryDate = (entry: FuelEntry) => parseDate(entry.date) || new Date(0);

const fuelVolume = (entry: FuelEntry) => {
  const liters = Number(entry.liters || 0);
  const kg = Number(entry.kg || 0);
  if (entry.category === 'GAS') return liters || kg;
  return liters;
};

const orderCost = (order: ServiceOrder) => {
  const parts = (order.parts || []).reduce((sum, part) => sum + Number(part.quantity || 0) * Number(part.unitCost || 0), 0);
  const services = (order.services || []).reduce((sum, service) => sum + Number(service.cost || 0), 0);
  return Number(order.totalCost || 0) + Number(order.laborCost || 0) + Number(order.externalServiceCost || 0) + parts + services;
};

const statusWeight: Record<AlertSeverity, number> = {
  CRITICO: 3,
  ALTO: 2,
  MEDIO: 1
};

const severityClass: Record<AlertSeverity, string> = {
  CRITICO: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
  ALTO: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
  MEDIO: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  vehicles: allVehicles,
  tires,
  branches = [],
  defaultBranchId,
  serviceOrders: allServiceOrders = [],
  fuelEntries: allFuelEntries = [],
  financialRecords: allFinancialRecords = [],
  drivers: allDrivers = [],
  publicServiceRequests: allPublicServiceRequests = [],
  occurrences: allOccurrences = [],
  maintenanceSchedules: allMaintenanceSchedules = [],
  onNavigate
}) => {
  const data = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const branchVehicleIds = new Set(
      allVehicles
        .filter(vehicle => !defaultBranchId || vehicle.branchId === defaultBranchId)
        .map(vehicle => vehicle.id)
    );

    const vehicles = allVehicles.filter(vehicle => branchVehicleIds.has(vehicle.id));
    const vehicleById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
    const vehicleByPlate = new Map(vehicles.map(vehicle => [vehicle.plate, vehicle]));
    const branchName = defaultBranchId ? (branches.find(branch => branch.id === defaultBranchId)?.name || 'Filial selecionada') : 'Todas as filiais';

    const serviceOrders = allServiceOrders.filter(order =>
      (!defaultBranchId || order.branchId === defaultBranchId || branchVehicleIds.has(order.vehicleId))
    );
    const fuelEntries = allFuelEntries.filter(entry =>
      branchVehicleIds.has(entry.vehicleId) || (!entry.vehicleId && vehicleByPlate.has(entry.vehiclePlate))
    );
    const financialRecords = allFinancialRecords.filter(record =>
      !defaultBranchId || record.branchId === defaultBranchId || (record.vehicleId && branchVehicleIds.has(record.vehicleId))
    );
    const drivers = allDrivers.filter(driver => !defaultBranchId || driver.branchId === defaultBranchId);
    const publicServiceRequests = allPublicServiceRequests.filter(request =>
      branchVehicleIds.has(request.vehicleId) || vehicleByPlate.has(request.vehiclePlate)
    );
    const occurrences = allOccurrences.filter(occurrence =>
      branchVehicleIds.has(occurrence.vehicleId) || vehicleByPlate.has(occurrence.vehiclePlate)
    );
    const maintenanceSchedules = allMaintenanceSchedules.filter(schedule =>
      branchVehicleIds.has(schedule.vehicleId) || (!defaultBranchId || schedule.branchId === defaultBranchId)
    );

    const monthFuelEntries = fuelEntries.filter(entry => entryDate(entry) >= startOfMonth);
    const monthOrders = serviceOrders.filter(order => {
      const date = parseDate(order.completedAt || order.date || order.createdAt);
      return Boolean(date && date >= startOfMonth);
    });
    const monthFinancialRecords = financialRecords.filter(record => {
      const date = parseDate(record.date);
      return Boolean(date && date >= startOfMonth && record.status !== 'CANCELLED');
    });

    const openOrders = serviceOrders.filter(order => order.status === 'PENDENTE' || order.status === 'EM_ANDAMENTO');
    const lateOrders = openOrders.filter(order => daysSince(order.createdAt || order.date) >= 3);
    const vehicleStoppedByQr = new Set(
      publicServiceRequests
        .filter(request => (request.status === 'PENDENTE' || request.status === 'EM_ANALISE') && request.vehicleStopped)
        .map(request => request.vehicleId)
    );

    const activeVehicles = vehicles.length;
    const stoppedVehicles = vehicles.filter(vehicle => {
      const hasRecentPosition = vehicle.lastLocation?.updatedAt && daysSince(vehicle.lastLocation.updatedAt) <= 2;
      const stoppedByTracker = hasRecentPosition && (vehicle.ignition === false || Number(vehicle.speed || 0) <= 0);
      return stoppedByTracker || vehicleStoppedByQr.has(vehicle.id);
    }).length;

    const stalePositions = vehicles
      .map(vehicle => ({
        vehicle,
        days: vehicle.lastLocation?.updatedAt ? daysSince(vehicle.lastLocation.updatedAt) : 9999
      }))
      .filter(item => !item.vehicle.lastLocation?.updatedAt || item.days >= 3)
      .sort((a, b) => b.days - a.days);

    const fuelCostMonth = monthFuelEntries.reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
    const fuelVolumeMonth = monthFuelEntries.reduce((sum, entry) => sum + fuelVolume(entry), 0);
    const maintenanceCostMonth = monthOrders.reduce((sum, order) => sum + orderCost(order), 0);
    const financialCostMonth = monthFinancialRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);

    const entriesByVehicle = new Map<string, FuelEntry[]>();
    fuelEntries.forEach(entry => {
      const vehicleId = entry.vehicleId || vehicleByPlate.get(entry.vehiclePlate)?.id;
      if (!vehicleId || !branchVehicleIds.has(vehicleId)) return;
      if (!entriesByVehicle.has(vehicleId)) entriesByVehicle.set(vehicleId, []);
      entriesByVehicle.get(vehicleId)!.push(entry);
    });

    let monthKm = 0;
    let totalDistance = 0;
    let totalVolume = 0;
    const vehicleFuelRows = Array.from(entriesByVehicle.entries()).map(([vehicleId, entries]) => {
      const sorted = [...entries].sort((a, b) => entryDate(a).getTime() - entryDate(b).getTime() || Number(a.odometer || 0) - Number(b.odometer || 0));
      let distance = 0;
      let volume = 0;
      let monthDistance = 0;

      sorted.forEach((entry, index) => {
        const currentVolume = fuelVolume(entry);
        const entryKmPerLiter = Number(entry.kmPerLiter || 0);
        let entryDistance = 0;

        if (entryKmPerLiter > 0 && currentVolume > 0) {
          entryDistance = entryKmPerLiter * currentVolume;
        } else if (index > 0) {
          const previous = sorted[index - 1];
          const diff = Number(entry.odometer || 0) - Number(previous.odometer || 0);
          if (diff > 0 && diff < 5000) entryDistance = diff;
        }

        if (entryDistance > 0 && currentVolume > 0) {
          distance += entryDistance;
          volume += currentVolume;
          if (entryDate(entry) >= startOfMonth) monthDistance += entryDistance;
        }
      });

      const vehicle = vehicleById.get(vehicleId);
      totalDistance += distance;
      totalVolume += volume;
      monthKm += monthDistance;

      return {
        vehicle,
        distance,
        volume,
        average: distance > 0 && volume > 0 ? distance / volume : 0
      };
    }).filter(row => row.vehicle && row.average > 0);

    const fleetFuelAverage = totalDistance > 0 && totalVolume > 0 ? totalDistance / totalVolume : 0;
    const avgFuelPrice = fuelVolumeMonth > 0 ? fuelCostMonth / fuelVolumeMonth : (
      totalVolume > 0
        ? fuelEntries.reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0) / Math.max(1, fuelEntries.reduce((sum, entry) => sum + fuelVolume(entry), 0))
        : 0
    );

    const highConsumptionRows = vehicleFuelRows
      .map(row => {
        const excessPercent = row.average > 0 && fleetFuelAverage > 0 ? ((fleetFuelAverage / row.average) - 1) * 100 : 0;
        const expectedVolume = fleetFuelAverage > 0 ? row.distance / fleetFuelAverage : 0;
        const waste = Math.max(0, (row.volume - expectedVolume) * avgFuelPrice);
        return { ...row, excessPercent, waste };
      })
      .filter(row => row.excessPercent >= 20 && row.distance >= 300)
      .sort((a, b) => b.excessPercent - a.excessPercent)
      .slice(0, 6);

    const stationMap = new Map<string, { name: string; volume: number; cost: number; count: number }>();
    fuelEntries
      .filter(entry => entryDate(entry) >= new Date(now.getTime() - 60 * DAY_MS))
      .forEach(entry => {
        const volume = fuelVolume(entry);
        const key = String(entry.stationCnpj || entry.stationName || 'SEM POSTO').trim().toUpperCase();
        const name = String(entry.stationName || entry.stationCnpj || 'Posto nao identificado');
        if (!stationMap.has(key)) stationMap.set(key, { name, volume: 0, cost: 0, count: 0 });
        const row = stationMap.get(key)!;
        row.volume += volume;
        row.cost += Number(entry.totalCost || 0);
        row.count += 1;
      });

    const stationRows = Array.from(stationMap.values())
      .map(row => ({ ...row, avgPrice: row.volume > 0 ? row.cost / row.volume : 0 }))
      .filter(row => row.volume > 0 && row.avgPrice > 0);
    const stationAvgPrice = stationRows.reduce((sum, row) => sum + row.cost, 0) / Math.max(1, stationRows.reduce((sum, row) => sum + row.volume, 0));
    const expensiveStations = stationRows
      .map(row => ({ ...row, above: row.avgPrice - stationAvgPrice, waste: Math.max(0, (row.avgPrice - stationAvgPrice) * row.volume) }))
      .filter(row => row.above >= 0.42 && row.count >= 2)
      .sort((a, b) => b.above - a.above)
      .slice(0, 5);

    const preventiveRows = vehicles
      .map(vehicle => {
        const schedule = maintenanceSchedules
          .filter(item => item.vehicleId === vehicle.id && item.status !== 'COMPLETED')
          .sort((a, b) => {
            const aKm = Number(a.nextDueKm || 999999999);
            const bKm = Number(b.nextDueKm || 999999999);
            return aKm - bKm;
          })[0];
        const interval = Number(vehicle.revisionIntervalKm || 0);
        const lastKm = Number(schedule?.lastPerformedKm || vehicle.lastPreventiveKm || 0);
        const odometer = Number(vehicle.odometer || 0);
        const nextKm = Number(schedule?.nextDueKm || (interval > 0 && lastKm > 0 ? lastKm + interval : 0));
        const remainingKm = nextKm > 0 ? nextKm - odometer : 999999;
        const dueDateDays = schedule?.nextDueDate ? daysUntil(schedule.nextDueDate) : 9999;
        const due = schedule?.status === 'OVERDUE' || remainingKm <= 0 || dueDateDays <= 0;
        const near = !due && (remainingKm <= 800 || dueDateDays <= 15);
        return { vehicle, nextKm, remainingKm, dueDateDays, due, near };
      })
      .filter(item => item.due || item.near)
      .sort((a, b) => a.remainingKm - b.remainingKm);

    const pendingFines = financialRecords.filter(record => record.category === 'FINE' && record.status === 'PENDING');
    const pendingFinesAmount = pendingFines.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const documentRecordsDue = financialRecords.filter(record =>
      ['TAX', 'INSURANCE', 'LICENSING'].includes(record.category) &&
      record.status === 'PENDING' &&
      record.dueDate &&
      daysUntil(record.dueDate) <= 30
    );
    const driverDocsDue = drivers.filter(driver => driver.licenseExpiry && daysUntil(driver.licenseExpiry) <= 30);
    const documentsDueCount = documentRecordsDue.length + driverDocsDue.length;

    const qrCritical = publicServiceRequests.filter(request =>
      (request.status === 'PENDENTE' || request.status === 'EM_ANALISE') &&
      (request.urgency === 'CRITICA' || request.vehicleStopped || request.checklist?.status === 'BLOQUEADO')
    );
    const openOccurrences = occurrences.filter(item => item.status !== 'RESOLVED' && item.status !== 'REJECTED');

    const alerts: ExecutiveAlert[] = [
      ...highConsumptionRows.map(row => ({
        id: `fuel-${row.vehicle!.id}`,
        severity: row.excessPercent >= 35 ? 'CRITICO' as AlertSeverity : 'ALTO' as AlertSeverity,
        title: `${row.vehicle!.plate} consome ${number(row.excessPercent, 0)}% acima da media`,
        detail: `${number(row.average, 2)} km/L contra media da frota de ${number(fleetFuelAverage, 2)} km/L.`,
        impact: row.waste > 0 ? `Perda estimada ${money(row.waste, true)}` : undefined,
        tab: 'fuel' as TabView,
        action: 'Ver abastecimentos'
      })),
      ...expensiveStations.map(row => ({
        id: `station-${row.name}`,
        severity: row.above >= 0.8 ? 'ALTO' as AlertSeverity : 'MEDIO' as AlertSeverity,
        title: `${row.name} esta ${money(row.above)}/${fuelEntries.some(entry => entry.category === 'GAS') ? 'm3' : 'L'} acima da media`,
        detail: `Media ${money(row.avgPrice)} contra referencia ${money(stationAvgPrice)}.`,
        impact: row.waste > 0 ? `Possivel economia ${money(row.waste, true)}` : undefined,
        tab: 'fuel' as TabView,
        action: 'Comparar postos'
      })),
      ...stalePositions.slice(0, 5).map(item => ({
        id: `position-${item.vehicle.id}`,
        severity: item.days >= 10 ? 'CRITICO' as AlertSeverity : 'ALTO' as AlertSeverity,
        title: item.days >= 9999 ? `${item.vehicle.plate} sem posicao cadastrada` : `${item.vehicle.plate} esta ha ${item.days} dias sem posicao`,
        detail: item.vehicle.sascarCode ? `Rastreador ${item.vehicle.sascarCode}.` : 'Sem codigo de rastreador vinculado.',
        tab: 'location' as TabView,
        action: 'Abrir mapa'
      })),
      ...preventiveRows.slice(0, 6).map(item => ({
        id: `preventive-${item.vehicle.id}`,
        severity: item.due ? 'CRITICO' as AlertSeverity : 'ALTO' as AlertSeverity,
        title: item.due ? `Preventiva vencida - ${item.vehicle.plate}` : `Preventiva vence em ${number(Math.max(0, item.remainingKm))} km - ${item.vehicle.plate}`,
        detail: item.nextKm > 0 ? `Proxima em ${number(item.nextKm)} km. Atual ${number(item.vehicle.odometer || 0)} km.` : 'Plano de preventiva precisa de configuracao.',
        tab: 'maintenance' as TabView,
        action: 'Programar'
      })),
      ...lateOrders.slice(0, 4).map(order => ({
        id: `order-${order.id}`,
        severity: daysSince(order.createdAt || order.date) >= 7 ? 'CRITICO' as AlertSeverity : 'ALTO' as AlertSeverity,
        title: `O.S. atrasada - ${order.vehiclePlate}`,
        detail: `#${order.orderNumber} aberta ha ${daysSince(order.createdAt || order.date)} dias.`,
        impact: orderCost(order) > 0 ? `Custo apontado ${money(orderCost(order), true)}` : undefined,
        tab: 'service-orders' as TabView,
        action: 'Abrir O.S.'
      })),
      ...qrCritical.slice(0, 4).map(request => ({
        id: `qr-${request.id}`,
        severity: 'CRITICO' as AlertSeverity,
        title: `Checklist bloqueou viagem - ${request.vehiclePlate}`,
        detail: request.checklist?.criticalItems?.length ? request.checklist.criticalItems.join(', ') : request.title,
        tab: 'qr-service-requests' as TabView,
        action: 'Triar'
      })),
      ...documentRecordsDue.slice(0, 4).map(record => ({
        id: `doc-${record.id}`,
        severity: daysUntil(record.dueDate) <= 0 ? 'CRITICO' as AlertSeverity : 'MEDIO' as AlertSeverity,
        title: `${record.description} ${daysUntil(record.dueDate) <= 0 ? 'vencido' : 'vence em breve'}`,
        detail: record.dueDate ? `Vencimento em ${daysUntil(record.dueDate)} dias.` : 'Sem data de vencimento.',
        impact: money(record.amount || 0, true),
        tab: 'financial' as TabView,
        action: 'Ver financeiro'
      })),
      ...driverDocsDue.slice(0, 3).map(driver => ({
        id: `driver-doc-${driver.id}`,
        severity: daysUntil(driver.licenseExpiry) <= 0 ? 'CRITICO' as AlertSeverity : 'MEDIO' as AlertSeverity,
        title: `CNH ${daysUntil(driver.licenseExpiry) <= 0 ? 'vencida' : 'vencendo'} - ${driver.name}`,
        detail: `Categoria ${driver.licenseCategory || '-'} | vencimento em ${daysUntil(driver.licenseExpiry)} dias.`,
        tab: 'drivers' as TabView,
        action: 'Ver motorista'
      }))
    ].sort((a, b) => statusWeight[b.severity] - statusWeight[a.severity]);

    const fuelWaste = highConsumptionRows.reduce((sum, row) => sum + row.waste, 0);
    const stationWaste = expensiveStations.reduce((sum, row) => sum + row.waste, 0);
    const estimatedLoss = fuelWaste + stationWaste;
    const totalMonthCost = fuelCostMonth + maintenanceCostMonth + financialCostMonth;
    const costPerKm = monthKm > 0 ? totalMonthCost / monthKm : 0;

    const criticalTires = tires.filter(tire => tire.vehicleId && branchVehicleIds.has(tire.vehicleId) && Number(tire.currentTreadDepth || 0) <= 3).length;
    const healthScore = Math.max(0, Math.min(100,
      100 -
      (alerts.filter(alert => alert.severity === 'CRITICO').length * 6) -
      (alerts.filter(alert => alert.severity === 'ALTO').length * 3) -
      Math.min(20, criticalTires * 2)
    ));

    const costBreakdown = [
      { label: 'Abastecimento', value: fuelCostMonth, color: 'bg-emerald-500' },
      { label: 'Manutencao', value: maintenanceCostMonth, color: 'bg-blue-500' },
      { label: 'Financeiro', value: financialCostMonth, color: 'bg-amber-500' }
    ];

    return {
      branchName,
      activeVehicles,
      stoppedVehicles,
      costPerKm,
      monthKm,
      fuelCostMonth,
      fuelVolumeMonth,
      maintenanceOverdue: lateOrders.length + preventiveRows.filter(item => item.due).length,
      pendingFinesCount: pendingFines.length,
      pendingFinesAmount,
      documentsDueCount,
      criticalAlerts: alerts.filter(alert => alert.severity === 'CRITICO').length,
      estimatedLoss,
      healthScore: Math.round(healthScore),
      alerts: alerts.slice(0, 12),
      highConsumptionRows,
      expensiveStations,
      stalePositions,
      preventiveRows,
      qrPending: publicServiceRequests.filter(request => request.status === 'PENDENTE' || request.status === 'EM_ANALISE').length,
      openOrders: openOrders.length,
      openOccurrences: openOccurrences.length,
      costBreakdown,
      totalMonthCost
    };
  }, [
    allVehicles,
    allServiceOrders,
    allFuelEntries,
    allFinancialRecords,
    allDrivers,
    allPublicServiceRequests,
    allOccurrences,
    allMaintenanceSchedules,
    tires,
    branches,
    defaultBranchId
  ]);

  const KpiCard = ({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: React.ElementType; tone: string }) => (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white truncate">{value}</p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  const Section = ({ title, icon: Icon, children, action }: { title: string; icon: React.ElementType; children: React.ReactNode; action?: React.ReactNode }) => (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-slate-950 dark:bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-black text-slate-950 dark:text-white truncate">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );

  const AlertRow = ({ alert }: { alert: ExecutiveAlert }) => (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-1 rounded-md border text-[10px] font-black ${severityClass[alert.severity]}`}>{alert.severity}</span>
          <p className="font-black text-slate-950 dark:text-white truncate">{alert.title}</p>
        </div>
        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{alert.detail}</p>
        {alert.impact && <p className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-300">{alert.impact}</p>}
      </div>
      <button onClick={() => onNavigate(alert.tab)} className="px-3 py-2 rounded-lg bg-slate-950 dark:bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
        {alert.action}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const maxCost = Math.max(1, ...data.costBreakdown.map(item => item.value));

  return (
    <div className="space-y-5 pb-10 animate-in fade-in duration-500">
      <div className="rounded-lg bg-slate-950 text-white overflow-hidden shadow-sm">
        <div className="p-5 md:p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Centro de comando da frota</p>
            <h1 className="mt-2 text-2xl md:text-4xl font-black tracking-tight">Painel Executivo</h1>
            <p className="mt-2 text-sm font-bold text-slate-300 max-w-3xl">
              {data.branchName} | {data.activeVehicles} veiculos | {data.alerts.length} sinais acionaveis
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 xl:min-w-[420px]">
            <div className="rounded-lg bg-white/10 border border-white/10 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">Saude</p>
              <p className="text-2xl font-black">{data.healthScore}/100</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">Criticos</p>
              <p className="text-2xl font-black text-red-300">{data.criticalAlerts}</p>
            </div>
            <div className="rounded-lg bg-white/10 border border-white/10 p-3 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-black uppercase text-slate-400">Perda evitavel</p>
              <p className="text-2xl font-black text-emerald-300">{money(data.estimatedLoss, true)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard label="Frota ativa" value={data.activeVehicles} detail={`${data.stoppedVehicles} parados ou sem movimento`} icon={Truck} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" />
        <KpiCard label="Custo por km" value={data.monthKm > 0 ? money(data.costPerKm) : '-'} detail={`${number(data.monthKm)} km medidos no mes`} icon={Gauge} tone="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" />
        <KpiCard label="Abastecimento mes" value={money(data.fuelCostMonth, true)} detail={`${number(data.fuelVolumeMonth)} L/m3 importados`} icon={Fuel} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" />
        <KpiCard label="Manutencao vencida" value={data.maintenanceOverdue} detail={`${data.openOrders} O.S. abertas`} icon={Wrench} tone="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" />
        <KpiCard label="Multas pendentes" value={data.pendingFinesCount} detail={money(data.pendingFinesAmount, true)} icon={DollarSign} tone="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300" />
        <KpiCard label="Documentos vencendo" value={data.documentsDueCount} detail="Financeiro e CNH nos proximos 30 dias" icon={FileText} tone="bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300" />
        <KpiCard label="Checklist / QR" value={data.qrPending} detail="Solicitacoes aguardando triagem" icon={ClipboardCheck} tone="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300" />
        <KpiCard label="Ocorrencias abertas" value={data.openOccurrences} detail="Pendencias operacionais sem resolucao" icon={ShieldAlert} tone="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.8fr] gap-4">
        <Section
          title="Alertas inteligentes"
          icon={Zap}
          action={<button onClick={() => onNavigate('command-center')} className="text-xs font-black text-blue-600 dark:text-blue-300 flex items-center gap-1">Comando <ArrowRight className="h-3 w-3" /></button>}
        >
          <div className="space-y-2">
            {data.alerts.length > 0 ? data.alerts.map(alert => <AlertRow key={alert.id} alert={alert} />) : (
              <div className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <p className="font-black text-slate-700 dark:text-slate-200">Nenhum alerta critico agora.</p>
              </div>
            )}
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="Financeiro do mes" icon={TrendingUp}>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Custo total analisado</p>
                <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{money(data.totalMonthCost, true)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{data.monthKm > 0 ? `${money(data.costPerKm)} por km` : 'KM insuficiente para custo/km'}</p>
              </div>
              {data.costBreakdown.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs font-black mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-950 dark:text-white">{money(item.value, true)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${Math.max(4, item.value / maxCost * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Fluxo operacional" icon={Activity}>
            <div className="space-y-2">
              {[
                { label: 'Checklist', value: data.qrPending, tab: 'qr-service-requests' as TabView },
                { label: 'Oficina', value: data.openOrders, tab: 'service-orders' as TabView },
                { label: 'Abastecimento', value: data.highConsumptionRows.length + data.expensiveStations.length, tab: 'fuel' as TabView },
                { label: 'Rastreamento', value: data.stalePositions.length, tab: 'location' as TabView }
              ].map(item => (
                <button key={item.label} onClick={() => onNavigate(item.tab)} className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200">{item.label}</span>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black ${item.value > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {item.value > 0 ? `${item.value} pend.` : 'OK'}
                  </span>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Consumo fora da curva" icon={TrendingDown}>
          <div className="space-y-2">
            {data.highConsumptionRows.slice(0, 5).map(row => (
              <button key={row.vehicle!.id} onClick={() => onNavigate('fuel')} className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-slate-950 dark:text-white">{row.vehicle!.plate}</p>
                  <span className="text-xs font-black text-red-600">+{number(row.excessPercent)}%</span>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1">{number(row.average, 2)} km/L | perda {money(row.waste, true)}</p>
              </button>
            ))}
            {data.highConsumptionRows.length === 0 && <p className="text-sm font-bold text-slate-500">Sem consumo anormal detectado.</p>}
          </div>
        </Section>

        <Section title="Postos caros" icon={Fuel}>
          <div className="space-y-2">
            {data.expensiveStations.slice(0, 5).map(row => (
              <button key={row.name} onClick={() => onNavigate('fuel')} className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-slate-950 dark:text-white truncate">{row.name}</p>
                  <span className="text-xs font-black text-amber-600">+{money(row.above)}</span>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1">{row.count} abastecimentos | {money(row.waste, true)} evitavel</p>
              </button>
            ))}
            {data.expensiveStations.length === 0 && <p className="text-sm font-bold text-slate-500">Sem posto acima da faixa.</p>}
          </div>
        </Section>

        <Section title="Rastreamento" icon={MapPin}>
          <div className="space-y-2">
            {data.stalePositions.slice(0, 5).map(item => (
              <button key={item.vehicle.id} onClick={() => onNavigate('location')} className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-slate-950 dark:text-white">{item.vehicle.plate}</p>
                  <span className="text-xs font-black text-red-600">{item.days >= 9999 ? 'sem pos.' : `${item.days}d`}</span>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1">{item.vehicle.model || 'Modelo nao informado'}</p>
              </button>
            ))}
            {data.stalePositions.length === 0 && <p className="text-sm font-bold text-slate-500">Posicoes atualizadas.</p>}
          </div>
        </Section>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Relatorios', icon: FileText, tab: 'reports' as TabView },
            { label: 'Frota', icon: Truck, tab: 'fleet' as TabView },
            { label: 'Oficina', icon: Wrench, tab: 'service-orders' as TabView },
            { label: 'Abastecimento', icon: Fuel, tab: 'fuel' as TabView }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={() => onNavigate(item.tab)} className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-black text-slate-800 dark:text-white">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
