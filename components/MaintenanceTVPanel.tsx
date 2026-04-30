import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Maximize, Monitor, Truck, Wrench } from 'lucide-react';
import { ServiceOrder, Vehicle } from '../types';

interface MaintenanceTVPanelProps {
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
}

type MaintenanceStatus = 'VENCIDA' | 'PROXIMA' | 'OK' | 'SEM_DADOS';

const formatKm = (value: number) => `${Math.round(value || 0).toLocaleString('pt-BR')} km`;

const getOrderCost = (order: ServiceOrder) => {
  const parts = (order.parts || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
  return Number(order.totalCost || 0) + Number(order.laborCost || 0) + Number(order.externalServiceCost || 0) + parts;
};

const statusMeta: Record<MaintenanceStatus, { label: string; text: string; bg: string; border: string; bar: string }> = {
  VENCIDA: {
    label: 'Vencida',
    text: 'text-red-100',
    bg: 'bg-red-950',
    border: 'border-red-500',
    bar: 'bg-red-500'
  },
  PROXIMA: {
    label: 'Proxima',
    text: 'text-amber-100',
    bg: 'bg-amber-950',
    border: 'border-amber-400',
    bar: 'bg-amber-400'
  },
  OK: {
    label: 'Em dia',
    text: 'text-emerald-100',
    bg: 'bg-emerald-950',
    border: 'border-emerald-500',
    bar: 'bg-emerald-500'
  },
  SEM_DADOS: {
    label: 'Sem plano',
    text: 'text-slate-100',
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    bar: 'bg-slate-600'
  }
};

export const MaintenanceTVPanel: React.FC<MaintenanceTVPanelProps> = ({ vehicles, serviceOrders }) => {
  const [compact, setCompact] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const data = useMemo(() => {
    const activeOrders = serviceOrders.filter(order => order.status !== 'CONCLUIDO' && order.status !== 'CANCELADO');
    const rows = vehicles
      .filter(vehicle => String(vehicle.type || '').toUpperCase() !== 'CARRETA')
      .map(vehicle => {
        const odometer = Number(vehicle.odometer || 0);
        const interval = Number(vehicle.revisionIntervalKm || 0);
        const lastKm = Number(vehicle.lastPreventiveKm || 0);
        const nextKm = interval > 0 && lastKm > 0 ? lastKm + interval : 0;
        const remainingKm = nextKm > 0 ? nextKm - odometer : 0;
        const relatedOrders = activeOrders.filter(order => order.vehicleId === vehicle.id || order.vehiclePlate === vehicle.plate);
        const lastOrder = serviceOrders
          .filter(order => order.vehicleId === vehicle.id || order.vehiclePlate === vehicle.plate)
          .sort((a, b) => new Date(b.completedAt || b.createdAt || b.date || 0).getTime() - new Date(a.completedAt || a.createdAt || a.date || 0).getTime())[0];

        let status: MaintenanceStatus = 'SEM_DADOS';
        if (nextKm > 0) {
          if (remainingKm <= 0) status = 'VENCIDA';
          else if (remainingKm <= 1500) status = 'PROXIMA';
          else status = 'OK';
        }

        return {
          vehicle,
          odometer,
          interval,
          lastKm,
          nextKm,
          remainingKm,
          status,
          openOrders: relatedOrders.length,
          openOrderCost: relatedOrders.reduce((sum, order) => sum + getOrderCost(order), 0),
          lastOrderDate: lastOrder?.completedAt || lastOrder?.date || lastOrder?.createdAt
        };
      })
      .sort((a, b) => {
        const weight: Record<MaintenanceStatus, number> = { VENCIDA: 0, PROXIMA: 1, SEM_DADOS: 2, OK: 3 };
        return weight[a.status] - weight[b.status] || a.remainingKm - b.remainingKm;
      });

    return {
      rows,
      overdue: rows.filter(row => row.status === 'VENCIDA'),
      upcoming: rows.filter(row => row.status === 'PROXIMA'),
      ok: rows.filter(row => row.status === 'OK'),
      noPlan: rows.filter(row => row.status === 'SEM_DADOS'),
      openOrders: activeOrders.length
    };
  }, [vehicles, serviceOrders]);

  const priorityRows = [...data.overdue, ...data.upcoming].slice(0, compact ? 18 : 12);
  const watchRows = data.noPlan.slice(0, compact ? 9 : 6);

  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
  };

  const renderVehicleCard = (row: (typeof data.rows)[number], dense = false) => {
    const meta = statusMeta[row.status];
    const progress = row.nextKm > 0 && row.interval > 0
      ? Math.max(0, Math.min(100, ((row.odometer - row.lastKm) / row.interval) * 100))
      : 0;

    return (
      <article key={row.vehicle.id} className={`rounded-lg border ${meta.border} ${meta.bg} p-4 shadow-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`${dense ? 'text-2xl' : 'text-4xl'} font-black tracking-tight text-white truncate`}>
                {row.vehicle.plate}
              </h3>
              <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${row.status === 'VENCIDA' ? 'bg-red-500 text-white' : row.status === 'PROXIMA' ? 'bg-amber-400 text-slate-950' : row.status === 'OK' ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'}`}>
                {meta.label}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-bold text-slate-300">
              {row.vehicle.brand || '-'} {row.vehicle.model || ''} {row.vehicle.fleetNumber ? `| Prefixo ${row.vehicle.fleetNumber}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-black uppercase text-slate-400">Restante</p>
            <p className={`${dense ? 'text-xl' : 'text-3xl'} font-black ${meta.text}`}>
              {row.status === 'SEM_DADOS' ? '-' : row.remainingKm <= 0 ? `${formatKm(Math.abs(row.remainingKm))} vencido` : formatKm(row.remainingKm)}
            </p>
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/35">
          <div className={`h-full ${meta.bar}`} style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] font-black uppercase text-slate-400">Atual</p>
            <p className="text-sm font-black text-white">{formatKm(row.odometer)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] font-black uppercase text-slate-400">Proxima</p>
            <p className="text-sm font-black text-white">{row.nextKm > 0 ? formatKm(row.nextKm) : '-'}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-2">
            <p className="text-[10px] font-black uppercase text-slate-400">O.S.</p>
            <p className="text-sm font-black text-white">{row.openOrders}</p>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-2xl">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600">
              <Monitor className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-300">Painel TV manutencao</p>
              <h2 className="text-4xl font-black leading-tight">Prioridade da Oficina</h2>
              <p className="text-sm font-bold text-slate-400">Atualizado em {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCompact(prev => !prev)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-black hover:bg-slate-700"
            >
              {compact ? 'Visao destaque' : 'Visao compacta'}
            </button>
            <button
              onClick={requestFullscreen}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-black hover:bg-blue-700"
            >
              <Maximize className="h-4 w-4" />
              Tela cheia
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-5 p-5">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            ['Vencidas', data.overdue.length, AlertTriangle, 'text-red-300', 'border-red-500/60 bg-red-950'],
            ['Proximas', data.upcoming.length, CalendarDays, 'text-amber-300', 'border-amber-400/60 bg-amber-950'],
            ['Em dia', data.ok.length, CheckCircle2, 'text-emerald-300', 'border-emerald-500/50 bg-emerald-950'],
            ['Sem plano', data.noPlan.length, Truck, 'text-slate-300', 'border-slate-700 bg-slate-900'],
            ['O.S. abertas', data.openOrders, Wrench, 'text-blue-300', 'border-blue-500/50 bg-blue-950']
          ].map(([label, value, Icon, color, card]: any) => (
            <div key={label} className={`rounded-lg border ${card} p-4`}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <p className={`mt-2 text-5xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_.55fr]">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Fila de entrada</p>
                <h3 className="text-2xl font-black">Vencidas e proximas</h3>
              </div>
              <p className="text-sm font-black text-slate-400">{priorityRows.length} em destaque</p>
            </div>
            <div className={`grid gap-3 ${compact ? 'grid-cols-1 2xl:grid-cols-3' : 'grid-cols-1 2xl:grid-cols-2'}`}>
              {priorityRows.map(row => renderVehicleCard(row, compact))}
              {priorityRows.length === 0 && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-950 p-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-300" />
                  <p className="text-2xl font-black text-emerald-100">Sem preventiva vencida ou proxima.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sem plano preventivo</p>
              <h3 className="mt-1 text-2xl font-black">{data.noPlan.length} veiculos</h3>
              <div className="mt-4 space-y-2">
                {watchRows.map(row => (
                  <div key={row.vehicle.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div>
                      <p className="text-lg font-black">{row.vehicle.plate}</p>
                      <p className="text-xs font-bold text-slate-500">{row.vehicle.brand || '-'} {row.vehicle.model || ''}</p>
                    </div>
                    <Truck className="h-5 w-5 text-slate-500" />
                  </div>
                ))}
                {watchRows.length === 0 && <p className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm font-bold text-slate-400">Todos os veiculos possuem plano.</p>}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo operacional</p>
              <div className="mt-4 space-y-3 text-sm font-bold text-slate-300">
                <div className="flex justify-between"><span>Total monitorado</span><span>{data.rows.length}</span></div>
                <div className="flex justify-between"><span>Necessitam acao</span><span>{data.overdue.length + data.upcoming.length}</span></div>
                <div className="flex justify-between"><span>O.S. em aberto</span><span>{data.openOrders}</span></div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};
