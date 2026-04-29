import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Clock, DollarSign, Fuel, Gauge, ShieldAlert, Target, Truck, Wrench } from 'lucide-react';
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

const orderCost = (order: ServiceOrder) => {
  const parts = (order.parts || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
  return (order.totalCost || 0) + (order.laborCost || 0) + (order.externalServiceCost || 0) + parts;
};

const priorityStyle: Record<Priority, string> = {
  CRITICO: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
  ALTO: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
  MEDIO: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900'
};

export const CommandCenter: React.FC<CommandCenterProps> = ({
  vehicles,
  tires,
  serviceOrders,
  fuelEntries,
  occurrences,
  publicServiceRequests,
  onNavigate
}) => {
  const [view, setView] = useState<'COMMAND' | 'REPORTS'>('COMMAND');

  const data = useMemo(() => {
    const openOrders = serviceOrders.filter(order => order.status === 'PENDENTE' || order.status === 'EM_ANDAMENTO');
    const openOccurrences = occurrences.filter(item => item.status !== 'RESOLVED' && item.status !== 'REJECTED');
    const qrPending = publicServiceRequests.filter(item => item.status === 'PENDENTE' || item.status === 'EM_ANALISE');
    const criticalTires = tires.filter(tire => tire.vehicleId && Number(tire.currentTreadDepth || 0) <= 3);
    const staleVehicles = vehicles.filter(vehicle => vehicle.lastLocation?.updatedAt && daysSince(vehicle.lastLocation.updatedAt) >= 1);

    const tasks = [
      ...qrPending.map(item => ({
        id: `qr-${item.id}`,
        priority: item.urgency === 'CRITICA' || item.vehicleStopped ? 'CRITICO' as Priority : item.urgency === 'ALTA' ? 'ALTO' as Priority : 'MEDIO' as Priority,
        title: `Solicitação do QR - ${item.vehiclePlate}`,
        detail: `${item.title} | Motorista: ${item.driverName}`,
        action: 'Analisar solicitação e gerar O.S. se necessário',
        tab: 'qr-service-requests'
      })),
      ...openOrders.filter(order => daysSince(order.createdAt) >= 2 || order.status === 'EM_ANDAMENTO').map(order => ({
        id: `os-${order.id}`,
        priority: daysSince(order.createdAt) >= 5 ? 'CRITICO' as Priority : 'ALTO' as Priority,
        title: `O.S. parada - ${order.vehiclePlate}`,
        detail: `#${order.orderNumber} ${order.title}`,
        action: 'Atualizar andamento ou concluir serviço',
        tab: 'service-orders'
      })),
      ...openOccurrences.map(item => ({
        id: `occ-${item.id}`,
        priority: daysSince(item.createdAt) >= 2 ? 'ALTO' as Priority : 'MEDIO' as Priority,
        title: `Ocorrência aberta - ${item.vehiclePlate}`,
        detail: item.reasonName,
        action: 'Tratar ocorrência ou abrir O.S.',
        tab: 'occurrences'
      })),
      ...criticalTires.slice(0, 12).map(tire => {
        const vehicle = vehicles.find(item => item.id === tire.vehicleId);
        return {
          id: `tire-${tire.id}`,
          priority: 'CRITICO' as Priority,
          title: `Pneu crítico - ${vehicle?.plate || tire.location || 'sem veículo'}`,
          detail: `Fogo ${tire.fireNumber}: ${Number(tire.currentTreadDepth || 0).toFixed(1)} mm`,
          action: 'Programar troca, rodízio ou inspeção',
          tab: 'inventory'
        };
      }),
      ...staleVehicles.slice(0, 10).map(vehicle => ({
        id: `stale-${vehicle.id}`,
        priority: 'MEDIO' as Priority,
        title: `Rastreador sem atualização - ${vehicle.plate}`,
        detail: `Última posição: ${vehicle.lastLocation?.updatedAt ? new Date(vehicle.lastLocation.updatedAt).toLocaleString('pt-BR') : '-'}`,
        action: 'Atualizar posição ou conferir rastreador',
        tab: 'location'
      }))
    ].sort((a, b) => {
      const weight = { CRITICO: 3, ALTO: 2, MEDIO: 1 };
      return weight[b.priority] - weight[a.priority];
    });

    const vehicleCostRows = vehicles.map(vehicle => {
      const orders = serviceOrders.filter(order => order.vehicleId === vehicle.id || order.vehiclePlate === vehicle.plate);
      const fuel = fuelEntries.filter(entry => entry.vehicleId === vehicle.id || entry.vehiclePlate === vehicle.plate);
      const totalCost = orders.reduce((sum, order) => sum + orderCost(order), 0) + fuel.reduce((sum, entry) => sum + (entry.totalCost || 0), 0);
      const costPerKm = vehicle.odometer > 0 ? totalCost / vehicle.odometer : 0;
      return { vehicle, totalCost, costPerKm, orders: orders.length };
    }).sort((a, b) => b.costPerKm - a.costPerKm);

    const fuelRows = vehicles.map(vehicle => {
      const entries = fuelEntries
        .filter(entry => entry.vehicleId === vehicle.id || entry.vehiclePlate === vehicle.plate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const valid = entries.filter(entry => Number(entry.kmPerLiter || 0) > 0);
      const avgFuel = valid.length ? valid.reduce((sum, entry) => sum + Number(entry.kmPerLiter || 0), 0) / valid.length : 0;
      const telemetry = Number(vehicle.telemetryRollingAvgKml || vehicle.averageKmPerLiter || 0);
      const diff = avgFuel && telemetry ? Math.abs(avgFuel - telemetry) / avgFuel * 100 : 0;
      return { vehicle, avgFuel, telemetry, diff, count: entries.length };
    });

    const defectRows = Object.values(serviceOrders.reduce((acc, order) => {
      const key = `${order.vehiclePlate}-${(order.title || '').toUpperCase()}`;
      if (!acc[key]) acc[key] = { plate: order.vehiclePlate, title: order.title, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { plate: string; title: string; count: number }>)).sort((a, b) => b.count - a.count);

    const tireCostRows = tires.map(tire => {
      const km = Number(tire.totalKms || 0);
      const investment = Number(tire.totalInvestment || tire.price || 0);
      return { tire, cpk: km > 0 ? investment / km : 0, investment, km };
    }).filter(item => item.cpk > 0).sort((a, b) => b.cpk - a.cpk);

    const driverRows = Object.values(occurrences.reduce((acc, item) => {
      const key = item.userName || 'Sem motorista';
      if (!acc[key]) acc[key] = { name: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { name: string; count: number }>)).sort((a, b) => b.count - a.count);

    return {
      tasks,
      stats: {
        critical: tasks.filter(item => item.priority === 'CRITICO').length,
        high: tasks.filter(item => item.priority === 'ALTO').length,
        openOrders: openOrders.length,
        qrPending: qrPending.length
      },
      vehicleCostRows,
      worstFuelRows: fuelRows.filter(item => item.avgFuel > 0).sort((a, b) => a.avgFuel - b.avgFuel),
      fuelDiffRows: fuelRows.filter(item => item.diff > 0).sort((a, b) => b.diff - a.diff),
      mostOrdersRows: vehicleCostRows.slice().sort((a, b) => b.orders - a.orders),
      defectRows,
      tireCostRows,
      driverRows
    };
  }, [vehicles, tires, serviceOrders, fuelEntries, occurrences, publicServiceRequests]);

  const Ranking = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
      <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5 text-blue-600" /> {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Painel de Comando</h2>
          <p className="text-sm font-bold text-slate-500">O que precisa de atenção hoje, com relatórios que apontam decisão.</p>
        </div>
        <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 flex gap-1">
          <button onClick={() => setView('COMMAND')} className={`px-4 py-2 rounded-md text-sm font-black ${view === 'COMMAND' ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Comando Diário</button>
          <button onClick={() => setView('REPORTS')} className={`px-4 py-2 rounded-md text-sm font-black ${view === 'REPORTS' ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm' : 'text-slate-500'}`}>Decisão</button>
        </div>
      </div>

      {view === 'COMMAND' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Críticos', data.stats.critical, ShieldAlert, 'text-red-600'],
              ['Altos', data.stats.high, AlertTriangle, 'text-amber-600'],
              ['O.S. abertas', data.stats.openOrders, Wrench, 'text-blue-600'],
              ['QR pendente', data.stats.qrPending, Truck, 'text-emerald-600']
            ].map(([label, value, Icon, color]: any) => (
              <div key={label} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <Icon className="h-5 w-5 text-slate-300 mt-2" />
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Target className="h-5 w-5 text-blue-600" /> Fila de prioridade</h3>
            <div className="space-y-2">
              {data.tasks.slice(0, 20).map(item => (
                <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded-md border text-[10px] font-black ${priorityStyle[item.priority]}`}>{item.priority}</span>
                      <p className="font-black text-slate-800 dark:text-white">{item.title}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-500">{item.detail}</p>
                    <p className="text-xs font-black text-blue-600 mt-1">{item.action}</p>
                  </div>
                  <button onClick={() => onNavigate?.(item.tab)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-black hover:bg-blue-700">Abrir</button>
                </div>
              ))}
              {data.tasks.length === 0 && (
                <div className="py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                  <p className="font-black text-slate-700 dark:text-slate-200">Nada crítico para resolver agora.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Ranking title="Veículos mais caros por KM" icon={DollarSign}>
            {data.vehicleCostRows.slice(0, 5).map(item => <p key={item.vehicle.id} className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.vehicle.plate}: {money(item.costPerKm)}/km | {money(item.totalCost)}</p>)}
          </Ranking>
          <Ranking title="Piores médias de consumo" icon={Fuel}>
            {data.worstFuelRows.slice(0, 5).map(item => <p key={item.vehicle.id} className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.vehicle.plate}: {item.avgFuel.toFixed(2)} km/l em {item.count} abastecimentos</p>)}
          </Ranking>
          <Ranking title="Maior diferença abastecimento x telemetria" icon={Gauge}>
            {data.fuelDiffRows.slice(0, 5).map(item => <p key={item.vehicle.id} className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.vehicle.plate}: {item.diff.toFixed(1)}% | Abast. {item.avgFuel.toFixed(2)} x Tel. {item.telemetry.toFixed(2)}</p>)}
          </Ranking>
          <Ranking title="Veículos com mais O.S." icon={Wrench}>
            {data.mostOrdersRows.slice(0, 5).map(item => <p key={item.vehicle.id} className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.vehicle.plate}: {item.orders} O.S. | ação: investigar reincidência</p>)}
          </Ranking>
          <Ranking title="Reincidência de defeitos" icon={AlertTriangle}>
            {data.defectRows.slice(0, 5).map(item => <p key={`${item.plate}-${item.title}`} className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.plate}: {item.title} repetiu {item.count}x</p>)}
          </Ranking>
          <Ranking title="Pneus com maior custo por KM" icon={BarChart3}>
            {data.tireCostRows.slice(0, 5).map(item => <p key={item.tire.id} className="text-sm font-bold text-slate-600 dark:text-slate-300">Fogo {item.tire.fireNumber}: {money(item.cpk)}/km | {item.km.toLocaleString('pt-BR')} km</p>)}
          </Ranking>
          <Ranking title="Motoristas/usuários com mais ocorrências" icon={Clock}>
            {data.driverRows.slice(0, 5).map(item => <p key={item.name} className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.name}: {item.count} ocorrências</p>)}
          </Ranking>
        </div>
      )}
    </div>
  );
};
