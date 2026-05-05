import React from 'react';
import { Wallet, Droplets, TrendingUp, History, Calendar, Zap, Truck, Plus } from 'lucide-react';

interface FuelStatsCardsProps {
  stats: {
    totalCost: number;
    totalLiters: number;
    globalAvg: number;
    count: number;
  };
  unit?: string;
  unitKm?: string;
}

export const FuelStatsCards: React.FC<FuelStatsCardsProps> = React.memo(({ stats, unit = 'L', unitKm = 'km/l' }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
            <Wallet className="h-3 w-3 text-emerald-600"/>
          </div>
          Investimento Total
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalCost)}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Calendar className="h-3 w-3" /> Acumulado do periodo
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
            <Droplets className="h-3 w-3 text-blue-600"/>
          </div>
          Volume Total
        </div>
        <h3 className="text-2xl font-black text-blue-600 tracking-tight truncate">
          {stats.totalLiters.toLocaleString()} <span className="text-sm font-bold text-slate-400">{unit}</span>
        </h3>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Zap className="h-3 w-3" /> Consumo de frota
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-md">
            <TrendingUp className="h-3 w-3 text-orange-600"/>
          </div>
          Media Global
        </div>
        <h3 className="text-2xl font-black text-orange-600 tracking-tight truncate">
          {stats.globalAvg.toFixed(2)} <span className="text-sm font-bold text-slate-400 lowercase">{unitKm}</span>
        </h3>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Truck className="h-3 w-3" /> Eficiencia media
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all border-l-4 border-l-purple-500">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
          <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md">
            <History className="h-3 w-3 text-purple-600"/>
          </div>
          Abastecimentos
        </div>
        <h3 className="text-2xl font-black text-purple-600 tracking-tight truncate">{stats.count}</h3>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Plus className="h-3 w-3" /> Registros efetuados
        </div>
      </div>
    </div>
  );
});
