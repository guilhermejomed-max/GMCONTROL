
import React, { useMemo, useState } from 'react';
import { Vehicle, MaintenanceSchedule, MaintenancePlan, VehicleBrandModel, ServiceOrder } from '../types';
import { Search, Truck, AlertTriangle, CheckCircle2, Clock, Filter, ChevronRight, Gauge, Droplets, Calendar, Plus, Wrench, Activity, BarChart3, Wallet, Target, ShoppingCart, History, Zap } from 'lucide-react';

interface Props {
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  maintenanceSchedules: MaintenanceSchedule[];
  maintenancePlans: MaintenancePlan[];
  vehicleBrandModels: VehicleBrandModel[];
  serviceOrders: ServiceOrder[];
  settings?: any;
  onOpenServiceOrder?: (vehicleId: string) => void;
}

export const MaintenanceDashboard: React.FC<Props> = ({ 
  vehicles: allVehicles, 
  branches = [],
  defaultBranchId,
  maintenanceSchedules: allMaintenanceSchedules = [], 
  maintenancePlans: allMaintenancePlans = [], 
  vehicleBrandModels: allVehicleBrandModels = [], 
  serviceOrders: allServiceOrders = [],
  settings,
  onOpenServiceOrder 
}) => {
  const vehicles = useMemo(() => {
    return allVehicles;
  }, [allVehicles]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OK' | 'WARNING' | 'OVERDUE'>('ALL');
  const [fuelFilter, setFuelFilter] = useState<'ALL' | 'DIESEL' | 'GAS'>('ALL');

  const maintenanceSchedules = useMemo(() => {
    return defaultBranchId ? allMaintenanceSchedules.filter(s => s.branchId === defaultBranchId) : allMaintenanceSchedules;
  }, [allMaintenanceSchedules, defaultBranchId]);

  const maintenancePlans = useMemo(() => {
    return defaultBranchId ? allMaintenancePlans.filter(p => p.branchId === defaultBranchId) : allMaintenancePlans;
  }, [allMaintenancePlans, defaultBranchId]);

  const vehicleBrandModels = useMemo(() => {
    return defaultBranchId ? allVehicleBrandModels.filter(bm => bm.branchId === defaultBranchId) : allVehicleBrandModels;
  }, [allVehicleBrandModels, defaultBranchId]);

  const serviceOrders = useMemo(() => {
    return defaultBranchId ? allServiceOrders.filter(so => so.branchId === defaultBranchId) : allServiceOrders;
  }, [allServiceOrders, defaultBranchId]);

  const maintenanceData = useMemo(() => {
    return vehicles
      .filter(v => v.type !== 'CARRETA')
      .map(vehicle => {
        // Find relevant schedules (e.g., Oil Change)
        const vehicleSchedules = maintenanceSchedules.filter(s => s.vehicleId === vehicle.id);
        
        // Find the most recent completed preventive service order
        const vehicleServiceOrders = serviceOrders.filter(so => 
          so.vehicleId === vehicle.id && 
          so.status === 'CONCLUIDO' && 
          so.isPreventiveMaintenance
        );

        const latestPreventiveOS = [...vehicleServiceOrders].sort((a, b) => {
          const dateA = new Date(a.completedAt || a.date || a.createdAt).getTime();
          const dateB = new Date(b.completedAt || b.date || b.createdAt).getTime();
          return dateB - dateA;
        })[0];

        const currentKm = vehicle.odometer || 0;
        
        // Use OS data if available, otherwise fallback to vehicle fields
        const lastPreventiveKm = latestPreventiveOS?.odometer || vehicle.lastPreventiveKm || 0;
        
        // Format date for display
        let lastDateDisplay = vehicle.lastPreventiveDate || 'N/A';
        if (latestPreventiveOS) {
          const dateObj = new Date(latestPreventiveOS.completedAt || latestPreventiveOS.date || latestPreventiveOS.createdAt);
          lastDateDisplay = dateObj.toLocaleDateString('pt-BR');
        }

        const brandModel = vehicleBrandModels.find(bm => bm.id === vehicle.brandModelId);
        const revisionInterval = vehicle.revisionIntervalKm || brandModel?.oilChangeInterval || settings?.maintenanceIntervalKm || 10000;
        
        // Find next scheduled maintenance from PMJ
        const nextSchedule = [...vehicleSchedules]
          .filter(s => s.nextDueKm)
          .sort((a, b) => (a.nextDueKm || 0) - (b.nextDueKm || 0))[0];

        const nextPreventiveKm = nextSchedule?.nextDueKm || (lastPreventiveKm + revisionInterval);
        const kmRemaining = nextPreventiveKm - currentKm;
        
        let status: 'OK' | 'WARNING' | 'OVERDUE' = 'OK';
        if (kmRemaining <= 0) status = 'OVERDUE';
        else if (kmRemaining <= 1500) status = 'WARNING';

        // If lastPreventiveKm is 0 and odometer is high, it's definitely overdue
        if (lastPreventiveKm === 0 && currentKm >= revisionInterval && !nextSchedule) {
          status = 'OVERDUE';
        }

        return {
          ...vehicle,
          lastPreventiveKm,
          nextPreventiveKm,
          kmRemaining,
          status,
          lastPreventiveDate: lastDateDisplay,
          oilLiters: vehicle.oilLiters || brandModel?.oilLiters || 0
        };
      });
  }, [vehicles, maintenanceSchedules, serviceOrders, vehicleBrandModels]);

  const filteredData = useMemo(() => {
    return maintenanceData.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = item.plate.toLowerCase().includes(searchLower) || 
                           item.model.toLowerCase().includes(searchLower) ||
                           (item.lastLocation?.address || '').toLowerCase().includes(searchLower) ||
                           (item.lastLocation?.city || '').toLowerCase().includes(searchLower);
      const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const fuel = item.fuelType?.toUpperCase() || '';
      const matchesFuel = fuelFilter === 'ALL' || 
                         (fuelFilter === 'DIESEL' && fuel.includes('DIESEL')) ||
                         (fuelFilter === 'GAS' && (fuel.includes('GAS') || fuel.includes('GÁS')));
      return matchesSearch && matchesStatus && matchesFuel;
    });
  }, [maintenanceData, searchTerm, filterStatus, fuelFilter]);

  const stats = useMemo(() => {
    const total = maintenanceData.length;
    const ok = maintenanceData.filter(i => i.status === 'OK').length;
    const warning = maintenanceData.filter(i => i.status === 'WARNING').length;
    const overdue = maintenanceData.filter(i => i.status === 'OVERDUE').length;

    const totalMaintenanceCost = serviceOrders.reduce((acc, so) => acc + (so.totalCost || 0), 0);

    return {
      total,
      ok,
      warning,
      overdue,
      totalMaintenanceCost
    };
  }, [maintenanceData, serviceOrders]);

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex justify-between items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Wrench className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            Dashboard de Manutenção
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-sm">
            Monitoramento de trocas preventivas e saúde da frota.
          </p>
        </div>
      </div>

      {/* BENTO GRID - KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Truck className="h-3 w-3"/> Total Frota</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</h3>
         </div>
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500"/> Em Dia</p>
            <h3 className="text-3xl font-black text-emerald-600">{stats.ok}</h3>
         </div>
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500"/> Próximas Trocas</p>
            <h3 className="text-3xl font-black text-amber-600">{stats.warning}</h3>
         </div>
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="h-3 w-3 text-red-500"/> Trocas Atuais (Vencidas)</p>
            <h3 className="text-3xl font-black text-red-600">{stats.overdue}</h3>
         </div>
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500"/> Custo Total de Manutenção
        </h3>
        <p className="text-4xl font-black text-slate-900 dark:text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalMaintenanceCost)}
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por placa ou modelo..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>TODOS</button>
          <button onClick={() => setFilterStatus('OK')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'OK' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>EM DIA</button>
          <button onClick={() => setFilterStatus('WARNING')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>PRÓXIMAS</button>
          <button onClick={() => setFilterStatus('OVERDUE')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterStatus === 'OVERDUE' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>VENCIDAS</button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
          
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setFuelFilter('ALL')} 
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${fuelFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              TODOS COMBUST.
            </button>
            <button 
              onClick={() => setFuelFilter('DIESEL')} 
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${fuelFilter === 'DIESEL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-blue-600'}`}
            >
              DIESEL
            </button>
            <button 
              onClick={() => setFuelFilter('GAS')} 
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${fuelFilter === 'GAS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'}`}
            >
              GÁS
            </button>
          </div>
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
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{item.model}</p>
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
                    </div>
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
