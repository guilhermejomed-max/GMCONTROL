import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Maximize, Monitor, Search, Wrench } from 'lucide-react';
import { ServiceOrder, Vehicle } from '../types';

interface MaintenanceTVPanelProps {
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
}

type ColumnKey = 'vin' | 'renavam' | 'year' | 'model' | 'type' | 'color' | 'plate' | 'oilLiters' | 'dateOs';
type MaintenanceStatus = 'VENCIDA' | 'PROXIMA' | 'OK' | 'SEM_DADOS';

const columnLabels: Record<ColumnKey, string> = {
  vin: 'CHASSI',
  renavam: 'RENAVAM',
  year: 'FABRICACAO',
  model: 'MODELO',
  type: 'TIPO VEICULO',
  color: 'COR',
  plate: 'PLACA',
  oilLiters: 'LT OLEO',
  dateOs: 'DATA OS'
};

const statusStyle: Record<MaintenanceStatus, string> = {
  VENCIDA: 'bg-red-50 text-red-700 border-red-200',
  PROXIMA: 'bg-amber-50 text-amber-700 border-amber-200',
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SEM_DADOS: 'bg-slate-100 text-slate-600 border-slate-200'
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
    oilLiters: '',
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
            oilLiters: vehicle.oilLiters ? String(vehicle.oilLiters) : '',
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
    abertas: rows.reduce((sum, row) => sum + row.openOrders, 0)
  }), [rows]);

  const updateFilter = (key: ColumnKey, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-950 shadow-xl">
      <header className="flex flex-col gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-600 text-white">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Painel TV Manutencao</h2>
            <p className="text-xs font-bold text-slate-500">Atualizado em {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
          <span className="rounded border border-slate-300 bg-white px-3 py-2">Total: {summary.total}</span>
          <span className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">Vencidas: {summary.vencidas}</span>
          <span className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">Proximas: {summary.proximas}</span>
          <span className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">OS abertas: {summary.abertas}</span>
          <button onClick={requestFullscreen} className="flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-white">
            <Maximize className="h-4 w-4" />
            Tela cheia
          </button>
        </div>
      </header>

      <div className="overflow-auto" style={{ height: 'calc(100vh - 180px)' }}>
        <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth: 1760 }}>
          <thead className="sticky top-0 z-20 bg-white shadow-sm">
            <tr>
              {(Object.keys(columnLabels) as ColumnKey[]).map(key => (
                <th key={key} className="border-r border-slate-300 px-4 py-4 text-sm font-black uppercase">
                  {columnLabels[key]}
                </th>
              ))}
              <th className="border-r border-slate-300 px-4 py-4 text-sm font-black uppercase">STATUS</th>
              <th className="px-4 py-4 text-sm font-black uppercase">OS ABERTA</th>
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-200 odd:bg-white even:bg-slate-50 hover:bg-blue-50">
                {(Object.keys(columnLabels) as ColumnKey[]).map(key => (
                  <td key={key} className="whitespace-nowrap px-4 py-2 font-medium">
                    {row.values[key] || '-'}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-2">
                  <span className={`inline-flex rounded border px-2 py-1 text-[11px] font-black uppercase ${statusStyle[row.status]}`}>
                    {row.status === 'VENCIDA' ? 'Vencida' : row.status === 'PROXIMA' ? 'Proxima' : row.status === 'OK' ? 'Em dia' : 'Sem plano'}
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
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-sm font-black text-slate-500">
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
