import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Filter, Gauge, Maximize, Monitor, Search, Truck, Wrench } from 'lucide-react';
import { ServiceOrder, Vehicle } from '../types';

interface MaintenanceTVPanelProps {
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
}

type ColumnKey = 'vin' | 'renavam' | 'year' | 'model' | 'type' | 'color' | 'plate' | 'odometer' | 'oilLiters' | 'lastPreventiveKm' | 'nextKm' | 'remainingKm' | 'dateOs';
type MaintenanceStatus = 'VENCIDA' | 'PROXIMA' | 'OK' | 'SEM_DADOS';

const columnLabels: Record<ColumnKey, string> = {
  vin: 'CHASSI',
  renavam: 'RENAVAM',
  year: 'FABRICACAO',
  model: 'MODELO',
  type: 'TIPO VEICULO',
  color: 'COR',
  plate: 'PLACA',
  odometer: 'KM ATUAL',
  oilLiters: 'LT OLEO',
  lastPreventiveKm: 'ULT. PREV.',
  nextKm: 'PROX. REV.',
  remainingKm: 'KM REST.',
  dateOs: 'DATA OS'
};

const statusMeta: Record<MaintenanceStatus, { label: string; pill: string; row: string; dot: string }> = {
  VENCIDA: {
    label: 'Vencida',
    pill: 'bg-red-100 text-red-800 border-red-300',
    row: 'bg-red-50/70 hover:bg-red-100',
    dot: 'bg-red-500'
  },
  PROXIMA: {
    label: 'Proxima',
    pill: 'bg-amber-100 text-amber-800 border-amber-300',
    row: 'bg-amber-50/70 hover:bg-amber-100',
    dot: 'bg-amber-500'
  },
  OK: {
    label: 'Em dia',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    row: 'bg-white hover:bg-blue-50',
    dot: 'bg-emerald-500'
  },
  SEM_DADOS: {
    label: 'Sem plano',
    pill: 'bg-slate-100 text-slate-700 border-slate-300',
    row: 'bg-slate-50 hover:bg-slate-100',
    dot: 'bg-slate-400'
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value.includes('T') ? value : `${value}T08:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getOrderCost = (order: ServiceOrder) => {
  const parts = (order.parts || []).reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
  return Number(order.totalCost || 0) + Number(order.laborCost || 0) + Number(order.externalServiceCost || 0) + parts;
};

const formatNumber = (value?: number) => Number(value || 0).toLocaleString('pt-BR');
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const MaintenanceTVPanel: React.FC<MaintenanceTVPanelProps> = ({ vehicles, serviceOrders }) => {
  const [now, setNow] = useState(new Date());
  const [filters, setFilters] = useState<Record<ColumnKey, string>>({
    vin: '',
    renavam: '',
    year: '',
    model: '',
    type: '',
    color: '',
    plate: '',
    odometer: '',
    oilLiters: '',
    lastPreventiveKm: '',
    nextKm: '',
    remainingKm: '',
    dateOs: ''
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = useMemo(() => {
    const activeOrders = serviceOrders.filter(order => order.status !== 'CONCLUIDO' && order.status !== 'CANCELADO');

    return vehicles
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
          id: vehicle.id,
          status,
          openOrders: relatedOrders.length,
          openCost: relatedOrders.reduce((sum, order) => sum + getOrderCost(order), 0),
          remainingKm,
          values: {
            vin: vehicle.vin || '',
            renavam: vehicle.renavam || '',
            year: vehicle.year ? String(vehicle.year) : '',
            model: vehicle.model || '',
            type: vehicle.axles ? `${String(vehicle.axles).padStart(2, '0')} EIXOS` : vehicle.type || '',
            color: vehicle.color || '',
            plate: vehicle.plate || '',
            odometer: formatNumber(odometer),
            oilLiters: vehicle.oilLiters ? String(vehicle.oilLiters) : '',
            lastPreventiveKm: lastKm > 0 ? formatNumber(lastKm) : '',
            nextKm: nextKm > 0 ? formatNumber(nextKm) : '',
            remainingKm: nextKm > 0 ? (remainingKm <= 0 ? `-${formatNumber(Math.abs(remainingKm))}` : formatNumber(remainingKm)) : '',
            dateOs: formatDateTime(lastOrder?.completedAt || lastOrder?.date || lastOrder?.createdAt)
          }
        };
      })
      .filter(row => {
        return (Object.keys(filters) as ColumnKey[]).every(key => {
          const filter = filters[key].trim().toLowerCase();
          if (!filter) return true;
          return String(row.values[key] || '').toLowerCase().includes(filter);
        });
      })
      .sort((a, b) => {
        const weight: Record<MaintenanceStatus, number> = { VENCIDA: 0, PROXIMA: 1, SEM_DADOS: 2, OK: 3 };
        return weight[a.status] - weight[b.status] || a.values.plate.localeCompare(b.values.plate);
      });
  }, [vehicles, serviceOrders, filters]);

  const summary = useMemo(() => ({
    total: rows.length,
    vencidas: rows.filter(row => row.status === 'VENCIDA').length,
    proximas: rows.filter(row => row.status === 'PROXIMA').length,
    emDia: rows.filter(row => row.status === 'OK').length,
    semPlano: rows.filter(row => row.status === 'SEM_DADOS').length,
    abertas: rows.reduce((sum, row) => sum + row.openOrders, 0),
    custoAberto: rows.reduce((sum, row) => sum + row.openCost, 0)
  }), [rows]);

  const updateFilter = (key: ColumnKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-950 shadow-xl">
      <header className="border-b border-slate-300 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-4 text-white">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/40">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">Centro de controle da oficina</p>
            <h2 className="text-2xl font-black uppercase tracking-tight">Painel TV Manutencao</h2>
            <p className="text-xs font-bold text-slate-300">Atualizado em {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase md:grid-cols-6">
          {[
            ['Frota', summary.total, Truck, 'text-slate-100'],
            ['Vencidas', summary.vencidas, AlertTriangle, 'text-red-300'],
            ['Proximas', summary.proximas, CalendarClock, 'text-amber-300'],
            ['Em dia', summary.emDia, CheckCircle2, 'text-emerald-300'],
            ['Sem plano', summary.semPlano, Gauge, 'text-slate-300'],
            ['OS abertas', summary.abertas, Wrench, 'text-blue-300']
          ].map(([label, value, Icon, color]: any) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] text-slate-300">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`mt-1 text-2xl leading-none ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-black uppercase text-blue-100">
            Custo OS abertas: {formatCurrency(summary.custoAberto)}
          </span>
          <button onClick={requestFullscreen} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase text-white shadow-lg shadow-blue-900/30">
            <Maximize className="h-4 w-4" />
            Tela cheia
          </button>
        </div>
        </div>
      </header>

      <div className="overflow-auto bg-slate-100" style={{ height: 'calc(100vh - 230px)' }}>
        <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth: 2140 }}>
          <thead className="sticky top-0 z-20 bg-white shadow-md">
            <tr>
              {(Object.keys(columnLabels) as ColumnKey[]).map(key => (
                <th key={key} className="border-r border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-800">
                  {columnLabels[key]}
                </th>
              ))}
              <th className="border-r border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-800">STATUS</th>
              <th className="border-r border-slate-300 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-800">OS ABERTA</th>
              <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-800">CUSTO ABERTO</th>
            </tr>
            <tr className="border-y border-slate-300 bg-slate-50">
              {(Object.keys(columnLabels) as ColumnKey[]).map(key => (
                <th key={key} className="border-r border-slate-300 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-full">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type={key === 'dateOs' ? 'text' : 'text'}
                        placeholder={key === 'dateOs' ? 'dd/mm/aaaa' : ''}
                        className="h-7 w-full rounded border border-slate-300 bg-white pl-7 pr-2 text-xs font-bold outline-none focus:border-blue-500"
                        value={filters[key]}
                        onChange={event => updateFilter(key, event.target.value)}
                      />
                    </div>
                    <Filter className="h-3.5 w-3.5 shrink-0 text-slate-700" />
                  </div>
                </th>
              ))}
              <th className="border-r border-slate-300 px-4 py-3" />
              <th className="border-r border-slate-300 px-4 py-3" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className={`border-b border-slate-200 ${statusMeta[row.status].row}`}>
                {(Object.keys(columnLabels) as ColumnKey[]).map(key => (
                  <td key={key} className={`whitespace-nowrap px-4 py-2 font-semibold ${key === 'plate' ? 'text-base font-black text-slate-950' : ''}`}>
                    {row.values[key] || '-'}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusMeta[row.status].pill}`}>
                    <span className={`h-2 w-2 rounded-full ${statusMeta[row.status].dot}`} />
                    {statusMeta[row.status].label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-black">
                  {row.openOrders > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
                      <Wrench className="h-3.5 w-3.5" />
                      {row.openOrders}
                    </span>
                  ) : '-'}
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-black text-slate-800">
                  {row.openCost > 0 ? formatCurrency(row.openCost) : '-'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-10 text-center text-sm font-black text-slate-500">
                  Nenhum veiculo encontrado para os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
