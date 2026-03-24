
import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceSchedule, MaintenancePlan, VehicleBrandModel } from '../types';
import { Search, Truck, AlertTriangle, CheckCircle2, Clock, Filter, ChevronRight, Gauge, Droplets, Calendar, Plus } from 'lucide-react';

interface Props {
  vehicles: Vehicle[];
  maintenanceSchedules: MaintenanceSchedule[];
  maintenancePlans: MaintenancePlan[];
  vehicleBrandModels: VehicleBrandModel[];
  onOpenServiceOrder?: (vehicleId: string) => void;
}

export const MaintenanceDashboard: React.FC<Props> = ({ vehicles, maintenanceSchedules, maintenancePlans, vehicleBrandModels, onOpenServiceOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OK' | 'WARNING' | 'OVERDUE'>('ALL');

  const maintenanceData = useMemo(() => {
    return vehicles
      .filter(v => v.type === 'CAVALO')
      .map(vehicle => {
        // Find relevant schedules (e.g., Oil Change)
        const oilSchedules = maintenanceSchedules.filter(s => s.vehicleId === vehicle.id);
        // For simplicity in this initial dashboard, we'll look at the most critical or latest
        const latestSchedule = oilSchedules.sort((a, b) => {
            const aVal = a.nextDueKm || 0;
            const bVal = b.nextDueKm || 0;
            return bVal - aVal;
        })[0];

        const currentKm = vehicle.odometer || 0;
        const lastPreventiveKm = vehicle.lastPreventiveKm || 0;
        
        // Find brand model to get oil change interval
        const brandModel = vehicleBrandModels.find(bm => bm.id === vehicle.brandModelId);
        const revisionInterval = vehicle.revisionIntervalKm || brandModel?.oilChangeInterval || 10000;
        
        const nextPreventiveKm = lastPreventiveKm + revisionInterval;
        const kmRemaining = nextPreventiveKm - currentKm;
        
        let status: 'OK' | 'WARNING' | 'OVERDUE' = 'OK';
        if (kmRemaining <= 0) status = 'OVERDUE';
        else if (kmRemaining <= 1000) status = 'WARNING';

        return {
          ...vehicle,
          lastPreventiveKm,
          nextPreventiveKm,
          kmRemaining,
          status,
          oilLiters: vehicle.oilLiters || 0,
          lastPreventiveDate: vehicle.lastPreventiveDate || 'N/A'
        };
      });
  }, [vehicles, maintenanceSchedules]);

  const filteredData = useMemo(() => {
    return maintenanceData.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = item.plate.toLowerCase().includes(searchLower) || 
                           item.model.toLowerCase().includes(searchLower) ||
                           (item.lastLocation?.address || '').toLowerCase().includes(searchLower) ||
                           (item.lastLocation?.city || '').toLowerCase().includes(searchLower);
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [maintenanceData, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: maintenanceData.length,
      ok: maintenanceData.filter(i => i.status === 'OK').length,
      warning: maintenanceData.filter(i => i.status === 'WARNING').length,
      overdue: maintenanceData.filter(i => i.status === 'OVERDUE').length,
    };
  }, [maintenanceData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Frota</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</h3>
            <Truck className="h-5 w-5 text-slate-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Em Dia</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-emerald-600">{stats.ok}</h3>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Atenção</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-amber-600">{stats.warning}</h3>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Vencidas</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-red-600">{stats.overdue}</h3>
            <Clock className="h-5 w-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por placa, modelo ou localização..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>TODOS</button>
          <button onClick={() => setFilterStatus('OK')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'OK' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>EM DIA</button>
          <button onClick={() => setFilterStatus('WARNING')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>ATENÇÃO</button>
          <button onClick={() => setFilterStatus('OVERDUE')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'OVERDUE' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>VENCIDAS</button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Veículo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Óleo (L)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Última Preventiva</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status KM</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Ponto de Ref.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.status === 'OK' ? 'bg-emerald-50 text-emerald-600' :
                        item.status === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 dark:text-white leading-none mb-1">{item.plate}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{item.model} • {item.color || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black">
                      <Droplets className="h-3 w-3" /> {item.oilLiters}L
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3 w-3 text-slate-400" /> {item.lastPreventiveDate}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Gauge className="h-3 w-3" /> {item.lastPreventiveKm.toLocaleString()} km
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-500">PRÓXIMA: {item.nextPreventiveKm.toLocaleString()} km</span>
                        <span className={`text-[10px] font-black ${
                          item.status === 'OK' ? 'text-emerald-600' :
                          item.status === 'WARNING' ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {item.kmRemaining > 0 ? `Faltam ${item.kmRemaining.toLocaleString()} km` : `Vencida há ${Math.abs(item.kmRemaining).toLocaleString()} km`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.status === 'OK' ? 'bg-emerald-500' :
                            item.status === 'WARNING' ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, (item.odometer / item.nextPreventiveKm) * 100))}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic">KM Atual: {item.odometer.toLocaleString()} km</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {item.lastLocation?.address || 'Não informado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onOpenServiceOrder?.(item.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg text-xs font-black transition-all border border-orange-200 dark:border-orange-800"
                    >
                      <Plus className="h-3.5 w-3.5" /> ABRIR O.S.
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="py-20 text-center">
            <Truck className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum veículo encontrado com os filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
};
