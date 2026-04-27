import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Fuel, Gauge, MapPin, Radio, Search, Wrench } from 'lucide-react';
import { FuelEntry, ServiceOrder, SystemSettings, Vehicle } from '../types';
import { calculateRollingFuelEfficiency } from '../lib/fuelUtils';
import { MAX_REASONABLE_ODOMETER_KM } from '../lib/odometerUtils';

type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

type FleetIssue = {
  id: string;
  vehicleId: string;
  plate: string;
  type: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
};

interface FleetIssuesPanelProps {
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
  fuelEntries: FuelEntry[];
  settings?: SystemSettings;
  onOpenVehicle?: (vehicleId: string) => void;
}

const severityStyle: Record<IssueSeverity, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  INFO: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
};

const typeIcon = (type: string) => {
  if (type === 'SASCAR') return <Radio className="h-4 w-4" />;
  if (type === 'POSICAO') return <MapPin className="h-4 w-4" />;
  if (type === 'KM') return <Gauge className="h-4 w-4" />;
  if (type === 'ABASTECIMENTO') return <Fuel className="h-4 w-4" />;
  if (type === 'MANUTENCAO') return <Wrench className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
};

export const FleetIssuesPanel: React.FC<FleetIssuesPanelProps> = ({
  vehicles,
  serviceOrders,
  fuelEntries,
  settings,
  onOpenVehicle
}) => {
  const [filter, setFilter] = useState<'ALL' | IssueSeverity>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const issues = useMemo(() => {
    const now = Date.now();
    const maintenanceIntervalDefault = settings?.maintenanceIntervalKm || 10000;
    const result: FleetIssue[] = [];

    for (const vehicle of vehicles) {
      const plate = vehicle.plate || 'SEM PLACA';
      const vehicleFuelEntries = fuelEntries.filter(entry => entry.vehicleId === vehicle.id);
      const rollingFuel = calculateRollingFuelEfficiency(vehicleFuelEntries, 1000);
      const telemetryAverage = vehicle.telemetryRollingAvgKml || 0;

      if (!vehicle.sascarCode) {
        result.push({
          id: `${vehicle.id}-sascar`,
          vehicleId: vehicle.id,
          plate,
          type: 'SASCAR',
          severity: 'WARNING',
          title: 'Sem código de rastreador',
          detail: 'Veículo não possui CÓD. RASTREADOR/Sascar cadastrado.'
        });
      }

      if (!vehicle.lastLocation?.updatedAt) {
        result.push({
          id: `${vehicle.id}-sem-posicao`,
          vehicleId: vehicle.id,
          plate,
          type: 'POSICAO',
          severity: 'WARNING',
          title: 'Sem posição registrada',
          detail: 'Nenhuma posição foi gravada para este veículo.'
        });
      } else {
        const lastLocationTime = new Date(vehicle.lastLocation.updatedAt).getTime();
        const hoursWithoutPosition = Number.isFinite(lastLocationTime)
          ? (now - lastLocationTime) / 36e5
          : 999;

        if (hoursWithoutPosition > 48) {
          result.push({
            id: `${vehicle.id}-posicao-antiga`,
            vehicleId: vehicle.id,
            plate,
            type: 'POSICAO',
            severity: hoursWithoutPosition > 96 ? 'CRITICAL' : 'WARNING',
            title: 'Posição sem atualização recente',
            detail: `Última posição há ${Math.round(hoursWithoutPosition)} horas.`
          });
        }
      }

      if (!vehicle.odometer || vehicle.odometer <= 0) {
        result.push({
          id: `${vehicle.id}-km-zero`,
          vehicleId: vehicle.id,
          plate,
          type: 'KM',
          severity: 'WARNING',
          title: 'Hodômetro zerado',
          detail: 'KM atual não está preenchido.'
        });
      } else if (vehicle.odometer > MAX_REASONABLE_ODOMETER_KM) {
        result.push({
          id: `${vehicle.id}-km-absurdo`,
          vehicleId: vehicle.id,
          plate,
          type: 'KM',
          severity: 'CRITICAL',
          title: 'Hodômetro suspeito',
          detail: `${vehicle.odometer.toLocaleString('pt-BR')} km parece documento/código no lugar do KM.`
        });
      }

      if (rollingFuel.alerts.length > 0) {
        result.push({
          id: `${vehicle.id}-abastecimento-alertas`,
          vehicleId: vehicle.id,
          plate,
          type: 'ABASTECIMENTO',
          severity: rollingFuel.regressiveSegments > 0 ? 'CRITICAL' : 'WARNING',
          title: 'Abastecimento com inconsistências',
          detail: `${rollingFuel.alerts.length} alerta(s): parcial, KM regressivo ou trecho descartado.`
        });
      }

      if (rollingFuel.average > 0 && telemetryAverage > 0) {
        const diffPercent = Math.abs(((rollingFuel.average - telemetryAverage) / telemetryAverage) * 100);
        if (diffPercent >= 15) {
          result.push({
            id: `${vehicle.id}-media-divergente`,
            vehicleId: vehicle.id,
            plate,
            type: 'ABASTECIMENTO',
            severity: diffPercent >= 30 ? 'CRITICAL' : 'WARNING',
            title: 'Médias divergentes',
            detail: `Abastecimento ${rollingFuel.average.toFixed(2)} KM/L x telemetria ${telemetryAverage.toFixed(2)} KM/L (${diffPercent.toFixed(1)}%).`
          });
        }
      }

      const completedPreventives = serviceOrders
        .filter(order => order.vehicleId === vehicle.id && order.status === 'CONCLUIDO' && order.isPreventiveMaintenance)
        .sort((a, b) => {
          const dateA = new Date(a.completedAt || a.date || a.createdAt).getTime();
          const dateB = new Date(b.completedAt || b.date || b.createdAt).getTime();
          return dateB - dateA;
        });
      const lastPreventiveKm = completedPreventives[0]?.odometer || vehicle.lastPreventiveKm || 0;
      const intervalKm = vehicle.revisionIntervalKm || maintenanceIntervalDefault;

      if (vehicle.type !== 'CARRETA' && intervalKm > 0 && (vehicle.odometer || 0) >= lastPreventiveKm + intervalKm) {
        const overdueKm = (vehicle.odometer || 0) - (lastPreventiveKm + intervalKm);
        result.push({
          id: `${vehicle.id}-manutencao-vencida`,
          vehicleId: vehicle.id,
          plate,
          type: 'MANUTENCAO',
          severity: 'CRITICAL',
          title: 'Manutenção preventiva vencida',
          detail: `Vencida há ${overdueKm.toLocaleString('pt-BR')} km.`
        });
      }
    }

    return result.sort((a, b) => {
      const weight = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return weight[a.severity] - weight[b.severity] || a.plate.localeCompare(b.plate);
    });
  }, [vehicles, serviceOrders, fuelEntries, settings]);

  const filteredIssues = issues.filter(issue => {
    const matchesSeverity = filter === 'ALL' || issue.severity === filter;
    const term = searchTerm.trim().toUpperCase();
    const matchesSearch = !term || issue.plate.toUpperCase().includes(term) || issue.title.toUpperCase().includes(term);
    return matchesSeverity && matchesSearch;
  });

  const criticalCount = issues.filter(issue => issue.severity === 'CRITICAL').length;
  const warningCount = issues.filter(issue => issue.severity === 'WARNING').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 p-4 rounded-lg">
          <p className="text-[10px] font-black text-red-700 dark:text-red-300 uppercase">Críticas</p>
          <p className="text-3xl font-black text-red-700 dark:text-red-300">{criticalCount}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-lg">
          <p className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase">Atenção</p>
          <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{warningCount}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-lg">
          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase">Frota Monitorada</p>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{vehicles.length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Painel de Inconsistências</h2>
            <p className="text-sm font-bold text-slate-500">Sascar, KM, abastecimento, litrometro, posição e manutenção.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar placa ou alerta"
                className="w-full sm:w-64 pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>
            <select
              value={filter}
              onChange={event => setFilter(event.target.value as 'ALL' | IssueSeverity)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold dark:text-white"
            >
              <option value="ALL">Todos</option>
              <option value="CRITICAL">Críticos</option>
              <option value="WARNING">Atenção</option>
              <option value="INFO">Informativos</option>
            </select>
          </div>
        </div>

        {filteredIssues.length > 0 ? (
          <div className="space-y-2">
            {filteredIssues.map(issue => (
              <button
                key={issue.id}
                onClick={() => onOpenVehicle?.(issue.vehicleId)}
                className={`w-full text-left p-3 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${severityStyle[issue.severity]}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{typeIcon(issue.type)}</div>
                  <div>
                    <p className="text-sm font-black">{issue.plate} - {issue.title}</p>
                    <p className="text-xs font-bold opacity-80">{issue.detail}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase">{issue.type}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-black text-slate-700 dark:text-slate-200">Nenhuma inconsistência encontrada.</p>
            <p className="text-sm font-bold text-slate-500">A frota está sem alertas para os critérios atuais.</p>
          </div>
        )}
      </div>
    </div>
  );
};
