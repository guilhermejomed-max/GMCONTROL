import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  ShieldAlert,
  Target,
  Truck,
  Wrench
} from 'lucide-react';
import { FuelEntry, Occurrence, PublicServiceRequest, ServiceOrder, Tire, Vehicle } from '../types';

interface CommandCenterProps {
  vehicles: Vehicle[];
  tires: Tire[];
  serviceOrders: ServiceOrder[];
  fuelEntries: FuelEntry[];
  occurrences: Occurrence[];
  publicServiceRequests: PublicServiceRequest[];
  onNavigate?: (tab: any) => void;
}

type Priority = 'CRITICO' | 'ALTO' | 'MEDIO';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const daysSince = (value?: string) => {
  if (!value) return 9999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const orderCost = (order: ServiceOrder) => {
  const parts = (order.parts || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
  return (order.totalCost || 0) + (order.laborCost || 0) + (order.externalServiceCost || 0) + parts;
};

const normalizeDefect = (value?: string) => {
  const text = String(value || 'Sem classificacao')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/FREIO|PASTILHA|LONA|ABS/.test(text)) return 'FREIO';
  if (/ELETR|LUZ|LAMP|BATERIA|ALTERNADOR/.test(text)) return 'ELETRICA';
  if (/MOTOR|INJECAO|ARREF|RADIADOR/.test(text)) return 'MOTOR';
  if (/VAZAMENTO|OLEO|AGUA|ARLA|DIESEL/.test(text)) return 'VAZAMENTO';
  if (/SUSPENSAO|AMORTECEDOR|MOLA/.test(text)) return 'SUSPENSAO';
  if (/PREVENT|REVISAO|TROCA DE OLEO|OLEO/.test(text)) return 'PREVENTIVA';
  return text.slice(0, 32) || 'SEM CLASSIFICACAO';
};

const isTireRelated = (value?: string) => {
  const text = String(value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /PNEU|RODA|SULCO|CALIBR|RECAP|BORRACH/.test(text);
};

const priorityWeight: Record<Priority, number> = { CRITICO: 3, ALTO: 2, MEDIO: 1 };

const priorityStyle: Record<Priority, string> = {
  CRITICO: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
  ALTO: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
  MEDIO: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900'
};

export const CommandCenter: React.FC<CommandCenterProps> = ({
  vehicles,
  serviceOrders,
  occurrences,
  publicServiceRequests,
  onNavigate
}) => {
  const [view, setView] = useState<'TODAY' | 'ANALYSIS'>('TODAY');

  const data = useMemo(() => {
    const recentLimit = Date.now() - 45 * 24 * 60 * 60 * 1000;
    const maintenanceOrders = serviceOrders.filter(order => !isTireRelated(`${order.title || ''} ${order.details || ''} ${(order as any).tireId || ''} ${(order as any).tireFireNumber || ''}`));
    const maintenanceOccurrences = occurrences.filter(item => !isTireRelated(`${item.reasonName || ''} ${item.description || ''}`));
    const openOrders = maintenanceOrders.filter(order => order.status === 'PENDENTE' || order.status === 'EM_ANDAMENTO');
    const lateOrders = openOrders.filter(order => daysSince(order.createdAt || order.date) >= 3);
    const qrPending = publicServiceRequests.filter(item => item.status === 'PENDENTE' || item.status === 'EM_ANALISE');
    const openOccurrences = maintenanceOccurrences.filter(item => item.status !== 'RESOLVED' && item.status !== 'REJECTED');

    const preventiveRows = vehicles
      .map(vehicle => {
        const interval = Number(vehicle.revisionIntervalKm || 0);
        const lastKm = Number(vehicle.lastPreventiveKm || 0);
        const odometer = Number(vehicle.odometer || 0);
        const nextKm = interval > 0 && lastKm > 0 ? lastKm + interval : 0;
        const remainingKm = nextKm > 0 ? nextKm - odometer : 999999;
        return { vehicle, nextKm, remainingKm };
      })
      .filter(item => item.nextKm > 0 && item.remainingKm <= 1500)
      .sort((a, b) => a.remainingKm - b.remainingKm);

    const recurrenceRows = Object.values([
      ...maintenanceOrders
        .filter(order => new Date(order.createdAt || order.date || 0).getTime() >= recentLimit)
        .map(order => ({
          vehicleId: order.vehicleId,
          plate: order.vehiclePlate,
          defect: normalizeDefect(order.title || order.details),
          source: 'O.S.',
          value: orderCost(order)
        })),
      ...maintenanceOccurrences
        .filter(item => new Date(item.createdAt || 0).getTime() >= recentLimit)
        .map(item => ({
          vehicleId: item.vehicleId,
          plate: item.vehiclePlate,
          defect: normalizeDefect(item.reasonName || item.description),
          source: 'Ocorrencia',
          value: Number(item.externalCost || 0)
        }))
    ].reduce((acc, item) => {
      const key = `${item.vehicleId || item.plate}-${item.defect}`;
      if (!acc[key]) acc[key] = { ...item, count: 0, value: 0, sources: new Set<string>() };
      acc[key].count += 1;
      acc[key].value += item.value || 0;
      acc[key].sources.add(item.source);
      return acc;
    }, {} as Record<string, { vehicleId?: string; plate: string; defect: string; source: string; count: number; value: number; sources: Set<string> }>))
      .filter(item => item.count >= 2)
      .map(item => ({ ...item, sourcesText: Array.from(item.sources).join(' + ') }))
      .sort((a, b) => b.count - a.count || b.value - a.value);

    const tasks = [
      ...recurrenceRows.slice(0, 6).map(item => ({
        id: `recurrence-${item.plate}-${item.defect}`,
        priority: item.count >= 3 ? 'CRITICO' as Priority : 'ALTO' as Priority,
        title: `Reincidencia - ${item.plate}`,
        detail: `${item.defect} voltou ${item.count}x em 45 dias`,
        action: 'Investigar causa raiz antes de liberar novo reparo',
        tab: 'service-orders'
      })),
      ...preventiveRows.slice(0, 10).map(item => ({
        id: `preventive-${item.vehicle.id}`,
        priority: item.remainingKm <= 0 ? 'CRITICO' as Priority : 'ALTO' as Priority,
        title: `Preventiva ${item.remainingKm <= 0 ? 'vencida' : 'proxima'} - ${item.vehicle.plate}`,
        detail: item.remainingKm <= 0 ? `${Math.abs(item.remainingKm).toLocaleString('pt-BR')} km acima do prazo` : `${item.remainingKm.toLocaleString('pt-BR')} km restantes`,
        action: 'Programar entrada na oficina',
        tab: 'maintenance'
      })),
      ...lateOrders.map(order => ({
        id: `os-${order.id}`,
        priority: daysSince(order.createdAt || order.date) >= 7 ? 'CRITICO' as Priority : 'ALTO' as Priority,
        title: `O.S. atrasada - ${order.vehiclePlate}`,
        detail: `#${order.orderNumber} ${order.title}`,
        action: 'Atualizar andamento, responsavel ou conclusao',
        tab: 'service-orders'
      })),
      ...qrPending.map(item => ({
        id: `qr-${item.id}`,
        priority: item.urgency === 'CRITICA' || item.vehicleStopped ? 'CRITICO' as Priority : item.urgency === 'ALTA' ? 'ALTO' as Priority : 'MEDIO' as Priority,
        title: `Solicitacao do QR - ${item.vehiclePlate}`,
        detail: `${item.title} | Motorista: ${item.driverName}`,
        action: 'Triar solicitacao e gerar O.S.',
        tab: 'qr-service-requests'
      })),
      ...openOccurrences.map(item => ({
        id: `occ-${item.id}`,
        priority: daysSince(item.createdAt) >= 2 ? 'ALTO' as Priority : 'MEDIO' as Priority,
        title: `Ocorrencia aberta - ${item.vehiclePlate}`,
        detail: item.reasonName,
        action: 'Tratar ocorrencia ou abrir O.S.',
        tab: 'occurrences'
      }))
    ].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    const vehicleCostRows = vehicles.map(vehicle => {
      const orders = maintenanceOrders.filter(order => order.vehicleId === vehicle.id || order.vehiclePlate === vehicle.plate);
      const totalCost = orders.reduce((sum, order) => sum + orderCost(order), 0);
      return { vehicle, totalCost, orders: orders.length, open: openOrders.filter(order => order.vehicleId === vehicle.id || order.vehiclePlate === vehicle.plate).length };
    }).filter(item => item.totalCost > 0 || item.orders > 0).sort((a, b) => b.totalCost - a.totalCost);

    const costBreakdown = [
      {
        label: 'Mao de obra',
        value: maintenanceOrders.reduce((sum, order) => sum + Number(order.laborCost || 0), 0),
        action: 'Conferir tempo parado, produtividade e retrabalho por colaborador.'
      },
      {
        label: 'Pecas',
        value: maintenanceOrders.reduce((sum, order) => sum + (order.parts || []).reduce((partSum, part) => partSum + (part.quantity * part.unitCost), 0), 0),
        action: 'Revisar pecas mais trocadas e padrao de fornecedor.'
      },
      {
        label: 'Servicos externos',
        value: maintenanceOrders.reduce((sum, order) => sum + Number(order.externalServiceCost || 0), 0),
        action: 'Comparar parceiros, prazo e reincidencia.'
      },
      {
        label: 'Ocorrencias com custo',
        value: maintenanceOccurrences.reduce((sum, item) => sum + Number(item.externalCost || 0), 0),
        action: 'Converter chamados repetidos em plano preventivo.'
      }
    ];

    const totalMaintenanceCost = costBreakdown.reduce((sum, item) => sum + item.value, 0);
    const breakdownRows = costBreakdown
      .map(item => ({ ...item, percentage: totalMaintenanceCost > 0 ? item.value / totalMaintenanceCost * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      tasks,
      stats: {
        critical: tasks.filter(item => item.priority === 'CRITICO').length,
        lateOrders: lateOrders.length,
        preventiveDue: preventiveRows.filter(item => item.remainingKm <= 0).length,
        qrPending: qrPending.length
      },
      openOrders,
      lateOrders,
      preventiveRows,
      recurrenceRows,
      vehicleCostRows,
      breakdownRows,
      totalMaintenanceCost
    };
  }, [vehicles, serviceOrders, occurrences, publicServiceRequests]);

  const StatCard = ({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: any; tone: string }) => (
    <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-black ${tone}`}>{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="h-5 w-5 text-slate-500" />
        </div>
      </div>
    </div>
  );

  const Panel = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <section className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <Icon className="h-5 w-5 text-blue-600" />
        <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-slate-950 text-white border border-slate-900 p-5 shadow-sm overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-blue-600/20" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-300">Central de manutencao</p>
            <h2 className="text-2xl md:text-3xl font-black mt-1">Painel de Comando Diario</h2>
            <p className="text-sm font-bold text-slate-300 mt-2 max-w-2xl">
              Priorize O.S., preventivas, solicitacoes do QR, ocorrencias e reincidencias que precisam de decisao hoje.
            </p>
          </div>
          <div className="p-1 rounded-lg bg-white/10 border border-white/10 flex gap-1">
            <button onClick={() => setView('TODAY')} className={`px-4 py-2 rounded-md text-sm font-black ${view === 'TODAY' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300'}`}>Hoje</button>
            <button onClick={() => setView('ANALYSIS')} className={`px-4 py-2 rounded-md text-sm font-black ${view === 'ANALYSIS' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300'}`}>Analise</button>
          </div>
        </div>
      </div>

      {view === 'TODAY' ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard label="Criticos hoje" value={data.stats.critical} icon={ShieldAlert} tone="text-red-600" />
            <StatCard label="O.S. atrasadas" value={data.stats.lateOrders} icon={Clock} tone="text-amber-600" />
            <StatCard label="Preventivas vencidas" value={data.stats.preventiveDue} icon={CalendarDays} tone="text-blue-600" />
            <StatCard label="QR pendente" value={data.stats.qrPending} icon={Truck} tone="text-emerald-600" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-4">
            <Panel title="Fila de prioridade" icon={Target}>
              <div className="space-y-2">
                {data.tasks.slice(0, 18).map(item => (
                  <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded-md border text-[10px] font-black ${priorityStyle[item.priority]}`}>{item.priority}</span>
                        <p className="font-black text-slate-900 dark:text-white truncate">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-500">{item.detail}</p>
                      <p className="mt-1 text-xs font-black text-blue-600">{item.action}</p>
                    </div>
                    <button onClick={() => onNavigate?.(item.tab)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-black hover:bg-blue-700">
                      Abrir
                    </button>
                  </div>
                ))}
                {data.tasks.length === 0 && (
                  <div className="py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                    <p className="font-black text-slate-700 dark:text-slate-200">Nenhuma manutencao critica para hoje.</p>
                  </div>
                )}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel title="Preventivas proximas" icon={CalendarDays}>
                <div className="space-y-2">
                  {data.preventiveRows.slice(0, 7).map(item => (
                    <div key={item.vehicle.id} className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-slate-900 dark:text-white">{item.vehicle.plate}</p>
                        <span className={`text-xs font-black ${item.remainingKm <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.remainingKm <= 0 ? 'Vencida' : 'Proxima'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        Proxima em {item.nextKm.toLocaleString('pt-BR')} km | atual {(item.vehicle.odometer || 0).toLocaleString('pt-BR')} km
                      </p>
                    </div>
                  ))}
                  {data.preventiveRows.length === 0 && <p className="text-sm font-bold text-slate-500">Sem preventivas vencidas ou proximas.</p>}
                </div>
              </Panel>

              <Panel title="Reincidencias ativas" icon={Activity}>
                <div className="space-y-2">
                  {data.recurrenceRows.slice(0, 5).map(item => (
                    <div key={`${item.plate}-${item.defect}`} className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                      <p className="font-black text-amber-800 dark:text-amber-200">{item.plate} - {item.defect}</p>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1">{item.count} repeticoes em 45 dias | {item.sourcesText}</p>
                    </div>
                  ))}
                  {data.recurrenceRows.length === 0 && <p className="text-sm font-bold text-slate-500">Sem reincidencia relevante nos ultimos 45 dias.</p>}
                </div>
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Onde a manutencao esta consumindo dinheiro" icon={DollarSign}>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Custo total analisado</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{money(data.totalMaintenanceCost)}</p>
              </div>
              {data.breakdownRows.map(item => (
                <div key={item.label} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-slate-800 dark:text-white">{item.label}</p>
                    <p className="font-black text-red-600">{money(item.value)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden my-2">
                    <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, item.percentage)}%` }} />
                  </div>
                  <p className="text-xs font-bold text-slate-500">{item.percentage.toFixed(1)}% do custo. {item.action}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Veiculos mais caros em manutencao" icon={Wrench}>
            <div className="space-y-2">
              {data.vehicleCostRows.slice(0, 8).map(item => (
                <div key={item.vehicle.id} className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-slate-900 dark:text-white">{item.vehicle.plate}</p>
                    <p className="font-black text-slate-700 dark:text-slate-200">{money(item.totalCost)}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-1">{item.orders} O.S. no historico | {item.open} aberta(s)</p>
                </div>
              ))}
              {data.vehicleCostRows.length === 0 && <p className="text-sm font-bold text-slate-500">Sem custos de manutencao registrados.</p>}
            </div>
          </Panel>

          <Panel title="Reincidencia de defeitos" icon={AlertTriangle}>
            <div className="space-y-2">
              {data.recurrenceRows.slice(0, 8).map(item => (
                <div key={`${item.plate}-${item.defect}`} className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{item.plate}: {item.defect} voltou {item.count}x em 45 dias</p>
                  <p className="text-xs font-bold text-slate-500">{item.sourcesText} | impacto: {money(item.value)}</p>
                  <p className="text-xs font-black text-amber-600 mt-1">Acao: investigar causa raiz, peca aplicada e fornecedor.</p>
                </div>
              ))}
              {data.recurrenceRows.length === 0 && <p className="text-sm font-bold text-slate-500">Sem reincidencias detectadas.</p>}
            </div>
          </Panel>

          <Panel title="Indicadores de execucao" icon={ClipboardList}>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="O.S. abertas" value={data.openOrders.length} icon={Wrench} tone="text-blue-600" />
              <StatCard label="O.S. atrasadas" value={data.lateOrders.length} icon={Clock} tone="text-amber-600" />
              <StatCard label="Reincidencias" value={data.recurrenceRows.length} icon={AlertTriangle} tone="text-red-600" />
              <StatCard label="Preventivas proximas" value={data.preventiveRows.length} icon={CalendarDays} tone="text-emerald-600" />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
};
