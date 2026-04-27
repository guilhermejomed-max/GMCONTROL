import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Fuel, Gauge, Loader2, MapPin, Radio, Search, Wrench, X } from 'lucide-react';
import { FuelEntry, ServiceOrder, SystemSettings, Vehicle } from '../types';
import { calculateRollingFuelEfficiency, sortFuelEntries } from '../lib/fuelUtils';
import { MAX_REASONABLE_ODOMETER_KM } from '../lib/odometerUtils';

type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type FleetIssueAction = 'SYNC_SASCAR' | 'CREATE_PREVENTIVE_OS' | 'OPEN_VEHICLE' | 'REVIEW_FUEL' | 'IGNORE_ALERT' | 'MARK_PARTIAL_FILLUP' | 'DISCARD_FUEL_SEGMENT' | 'REQUEST_MANUAL_REVIEW';

export type FleetIssue = {
  id: string;
  vehicleId: string;
  plate: string;
  type: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  recommendation: string;
  actionLabel: string;
  actionType: FleetIssueAction;
  canAutoFix: boolean;
  relatedFuelEntryId?: string;
};

interface FleetIssuesPanelProps {
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
  fuelEntries: FuelEntry[];
  settings?: SystemSettings;
  onOpenVehicle?: (vehicleId: string) => void;
  onResolveIssue?: (issue: FleetIssue, justification?: string) => Promise<string | void>;
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
  onOpenVehicle,
  onResolveIssue
}) => {
  const [filter, setFilter] = useState<'ALL' | IssueSeverity>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<FleetIssue | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [justification, setJustification] = useState('');

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
          detail: 'Veículo não possui CÓD. RASTREADOR/Sascar cadastrado.',
          recommendation: 'Cadastre o código do rastreador no RG do veículo para permitir posição, KM e litrometro automáticos.',
          actionLabel: 'Abrir cadastro do veículo',
          actionType: 'OPEN_VEHICLE',
          canAutoFix: false
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
          detail: 'Nenhuma posição foi gravada para este veículo.',
          recommendation: 'Buscar a última posição desse veículo na Sascar e gravar localização, KM, ignição e litrometro retornados.',
          actionLabel: 'Sincronizar este veículo',
          actionType: 'SYNC_SASCAR',
          canAutoFix: true
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
            detail: `Última posição há ${Math.round(hoursWithoutPosition)} horas.`,
            recommendation: 'Atualizar somente este veículo na Sascar para substituir a posição antiga pela posição mais recente.',
            actionLabel: 'Atualizar posição agora',
            actionType: 'SYNC_SASCAR',
            canAutoFix: true
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
          detail: 'KM atual não está preenchido.',
          recommendation: 'Consultar a Sascar para preencher o hodômetro do veículo automaticamente, se o rastreador retornar KM válido.',
          actionLabel: 'Buscar KM na Sascar',
          actionType: 'SYNC_SASCAR',
          canAutoFix: true
        });
      } else if (vehicle.odometer > MAX_REASONABLE_ODOMETER_KM) {
        result.push({
          id: `${vehicle.id}-km-absurdo`,
          vehicleId: vehicle.id,
          plate,
          type: 'KM',
          severity: 'CRITICAL',
          title: 'Hodômetro suspeito',
          detail: `${vehicle.odometer.toLocaleString('pt-BR')} km parece documento/código no lugar do KM.`,
          recommendation: 'Consultar a Sascar e substituir esse valor somente se o rastreador retornar um hodômetro plausível.',
          actionLabel: 'Corrigir KM pela Sascar',
          actionType: 'SYNC_SASCAR',
          canAutoFix: true
        });
      }

      if (rollingFuel.alerts.length > 0) {
        const relatedFuelEntry = [...sortFuelEntries(vehicleFuelEntries)].reverse().find(entry => {
          const notes = String(entry.notes || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          return !notes.includes('[ignorado]') &&
            !notes.includes('[trecho descartado]') &&
            !notes.includes('[parcial]') &&
            !notes.includes('[conferencia manual]');
        });
        if (relatedFuelEntry) {
          result.push({
            id: `${vehicle.id}-abastecimento-alertas`,
            vehicleId: vehicle.id,
            plate,
            type: 'ABASTECIMENTO',
            severity: rollingFuel.regressiveSegments > 0 ? 'CRITICAL' : 'WARNING',
            title: 'Abastecimento com inconsistências',
            detail: `${rollingFuel.alerts.length} alerta(s): parcial, KM regressivo ou trecho descartado.`,
            recommendation: 'Revise os abastecimentos do veículo. Voce pode marcar parcial, descartar trecho, ignorar com justificativa ou pedir conferencia manual sem apagar o historico.',
            actionLabel: 'Abrir ações do abastecimento',
            actionType: 'REVIEW_FUEL',
            canAutoFix: false,
            relatedFuelEntryId: relatedFuelEntry.id
          });
        }
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
            detail: `Abastecimento ${rollingFuel.average.toFixed(2)} KM/L x telemetria ${telemetryAverage.toFixed(2)} KM/L (${diffPercent.toFixed(1)}%).`,
            recommendation: 'Atualize a telemetria do veículo e revise abastecimentos parciais ou com KM fora de sequência.',
            actionLabel: 'Atualizar telemetria',
            actionType: 'SYNC_SASCAR',
            canAutoFix: true
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
          detail: `Vencida há ${overdueKm.toLocaleString('pt-BR')} km.`,
          recommendation: 'Gerar uma O.S. preventiva pendente para o veículo com o KM atual, deixando a oficina programar a execução.',
          actionLabel: 'Criar O.S. preventiva',
          actionType: 'CREATE_PREVENTIVE_OS',
          canAutoFix: true
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

  const closeModal = () => {
    setSelectedIssue(null);
    setJustification('');
  };

  const handleResolveSelected = async (overrideAction?: FleetIssueAction) => {
    if (!selectedIssue) return;
    const issueToResolve = overrideAction ? { ...selectedIssue, actionType: overrideAction } : selectedIssue;

    if (['IGNORE_ALERT', 'DISCARD_FUEL_SEGMENT', 'REQUEST_MANUAL_REVIEW'].includes(issueToResolve.actionType) && !justification.trim()) {
      alert('Informe uma justificativa antes de aplicar esta ação.');
      return;
    }

    if (!issueToResolve.canAutoFix && !overrideAction) {
      onOpenVehicle?.(issueToResolve.vehicleId);
      closeModal();
      return;
    }

    setIsResolving(true);
    try {
      const message = await onResolveIssue?.(issueToResolve, justification.trim());
      alert(message || 'Correção aplicada com sucesso.');
      closeModal();
    } catch (error: any) {
      alert(error?.message || 'Não foi possível aplicar a correção automática.');
    } finally {
      setIsResolving(false);
    }
  };

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
                onClick={() => {
                  setSelectedIssue(issue);
                  setJustification('');
                }}
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

      {selectedIssue && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">{selectedIssue.plate} - {selectedIssue.type}</p>
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  {typeIcon(selectedIssue.type)} {selectedIssue.title}
                </h3>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className={`p-3 rounded-lg border ${severityStyle[selectedIssue.severity]}`}>
                <p className="text-xs font-black uppercase mb-1">Problema encontrado</p>
                <p className="text-sm font-bold">{selectedIssue.detail}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-black uppercase text-slate-500 mb-1">O que será feito</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedIssue.recommendation}</p>
              </div>

              {selectedIssue.type === 'ABASTECIMENTO' && (
                <div className="space-y-3">
                  <textarea
                    value={justification}
                    onChange={event => setJustification(event.target.value)}
                    placeholder="Justificativa para ignorar, descartar trecho ou solicitar conferencia"
                    className="w-full min-h-20 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button onClick={() => handleResolveSelected('MARK_PARTIAL_FILLUP')} disabled={isResolving || !selectedIssue.relatedFuelEntryId} className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2">
                      <Fuel className="h-4 w-4" /> Marcar parcial
                    </button>
                    <button onClick={() => handleResolveSelected('DISCARD_FUEL_SEGMENT')} disabled={isResolving || !selectedIssue.relatedFuelEntryId} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2">
                      <X className="h-4 w-4" /> Descartar trecho
                    </button>
                    <button onClick={() => handleResolveSelected('IGNORE_ALERT')} disabled={isResolving} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Ignorar alerta
                    </button>
                    <button onClick={() => handleResolveSelected('REQUEST_MANUAL_REVIEW')} disabled={isResolving} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2">
                      <Eye className="h-4 w-4" /> Conferencia manual
                    </button>
                  </div>
                </div>
              )}

              {!selectedIssue.canAutoFix && selectedIssue.type !== 'ABASTECIMENTO' && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    Esta inconsistência precisa de conferência humana antes de alterar dados. O botão abaixo abrirá o veículo para revisão.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleResolveSelected()}
                disabled={isResolving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {selectedIssue.canAutoFix ? selectedIssue.actionLabel : 'Abrir para revisão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
