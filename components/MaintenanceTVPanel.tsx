import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Maximize, Monitor, Truck, Wrench } from 'lucide-react';
import { ServiceOrder, Vehicle } from '../types';

interface MaintenanceTVPanelProps {
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
}

type MaintenanceStatus = 'VENCIDA' | 'PROXIMA' | 'OK' | 'SEM_DADOS';

const statusStyle: Record<MaintenanceStatus, { label: string; card: string; badge: string; bar: string }> = {
  VENCIDA: {
    label: 'VENCIDA',
    card: 'border-red-500/50 bg-red-950/35',
    badge: 'bg-red-500 text-white',
    bar: 'bg-red-500'
  },
  PROXIMA: {
    label: 'PROXIMA',
    card: 'border-amber-500/50 bg-amber-950/30',
    badge: 'bg-amber-400 text-slate-950',
    bar: 'bg-amber-400'
  },
  OK: {
    label: 'EM DIA',
    card: 'border-emerald-500/35 bg-emerald-950/25',
    badge: 'bg-emerald-500 text-white',
    bar: 'bg-emerald-500'
  },
  SEM_DADOS: {
    label: 'SEM PLANO',
    card: 'border-slate-700 bg-slate-900',
    badge: 'bg-slate-600 text-white',
    bar: 'bg-slate-600'
  }
};

const formatKm = (value: number) => `${Math.round(value || 0).toLocaleString('pt-BR')} km`;

const getOrderCost = (order: ServiceOrder) => {
  const parts = (order.parts || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
  return Number(order.totalCost || 0) + Number(order.laborCost || 0) + Number(order.externalServiceCost || 0) + parts;
};

export const MaintenanceTVPanel: React.FC<MaintenanceTVPanelProps> = ({ vehicles, serviceOrders }) => {
  const [compact, setCompact] = useState(false);

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
        const vehicleOrders = activeOrders.filter(order => order.vehicleId === vehicle.id || order.vehiclePlate === vehicle.plate);
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
          openOrders: vehicleOrders.length,
          openOrderCost: vehicleOrders.reduce((sum, order) => sum + getOrderCost(order), 0),
          lastOrderDate: lastOrder?.completedAt || lastOrder?.date || lastOrder?.createdAt
        };
      })
      .sort((a, b) => {
        const weight: Record<MaintenanceStatus, number> = { VENCIDA: 0, PROXIMA: 1, SEM_DADOS: 2, OK: 3 };
        return weight[a.status] - weight[b.status] || a.remainingKm - b.remainingKm;
      });

    return {
      rows,
      overdue: rows.filter(row => row.status === 'VENCIDA').length,
      upcoming: rows.filter(row => row.status === 'PROXIMA').length,
      ok: rows.filter(row => row.status === 'OK').length,
      noPlan: rows.filter(row => row.status === 'SEM_DADOS').length,
      openOrders: activeOrders.length
    };
  }, [vehicles, serviceOrders]);

  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-lg bg-slate-950 text-white overflow-hidden border border-slate-800 shadow-2xl">
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Monitor className="h-8 w-8" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase text-blue-300 tracking-widest">TV da oficina</p>
              <h2 className="text-3xl font-black leading-tight">Painel de Acompanhamento de Manutencao</h2>
              <p className="text-sm font-bold text-slate-400">
                KM atual, proxima revisao e veiculos que precisam entrar na oficina.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCompact(prev => !prev)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm font-black"
            >
              {compact ? 'Cards grandes' : 'Modo compacto'}
            </button>
            <button
              onClick={requestFullscreen}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-black flex items-center gap-2"
            >
              <Maximize className="h-4 w-4" />
              Tela cheia
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            ['Vencidas', data.overdue, AlertTriangle, 'text-red-400'],
            ['Proximas', data.upcoming, CalendarDays, 'text-amber-300'],
            ['Em dia', data.ok, CheckCircle2, 'text-emerald-400'],
            ['Sem plano', data.noPlan, Truck, 'text-slate-300'],
            ['O.S. abertas', data.openOrders, Wrench, 'text-blue-300']
          ].map(([label, value, Icon, color]: any) => (
            <div key={label} className="rounded-lg bg-slate-900 border border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className={`mt-2 text-4xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 xl:grid-cols-2'}`}>
          {data.rows.map(row => {
            const style = statusStyle[row.status];
            const progress = row.nextKm > 0 && row.interval > 0
              ? Math.max(0, Math.min(100, ((row.odometer - row.lastKm) / row.interval) * 100))
              : 0;

            return (
              <div key={row.vehicle.id} className={`rounded-lg border ${style.card} p-4`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`${compact ? 'text-2xl' : 'text-4xl'} font-black tracking-tight`}>
                        {row.vehicle.plate}
                      </h3>
                      <span className={`px-3 py-1 rounded-md text-xs font-black ${style.badge}`}>{style.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-400 truncate">
                      {row.vehicle.brand || '-'} {row.vehicle.model || ''} {row.vehicle.fleetNumber ? `| Prefixo ${row.vehicle.fleetNumber}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-black uppercase text-slate-500">KM restante</p>
                    <p className={`${row.remainingKm <= 0 ? 'text-red-300' : 'text-white'} ${compact ? 'text-2xl' : 'text-3xl'} font-black`}>
                      {row.status === 'SEM_DADOS' ? '-' : row.remainingKm <= 0 ? `${formatKm(Math.abs(row.remainingKm))} vencido` : formatKm(row.remainingKm)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-slate-950/55 border border-white/5 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-500">KM atual</p>
                    <p className="mt-1 text-xl font-black">{formatKm(row.odometer)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/55 border border-white/5 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-500">Ultima revisao</p>
                    <p className="mt-1 text-xl font-black">{row.lastKm > 0 ? formatKm(row.lastKm) : '-'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/55 border border-white/5 p-3">
                    <p className="text-[10px] font-black uppercase text-slate-500">Proxima</p>
                    <p className="mt-1 text-xl font-black">{row.nextKm > 0 ? formatKm(row.nextKm) : '-'}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${style.bar}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-400">
                    <span>Intervalo: {row.interval > 0 ? formatKm(row.interval) : '-'}</span>
                    <span>O.S. abertas: {row.openOrders}</span>
                    <span>Ultima O.S.: {row.lastOrderDate ? new Date(row.lastOrderDate).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {data.rows.length === 0 && (
          <div className="py-16 text-center rounded-lg border border-dashed border-slate-800 bg-slate-900">
            <Truck className="h-12 w-12 mx-auto text-slate-600 mb-3" />
            <p className="font-black text-slate-300">Nenhum veiculo cadastrado para acompanhar.</p>
          </div>
        )}
      </div>
    </div>
  );
};
