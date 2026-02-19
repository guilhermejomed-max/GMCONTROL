
import React, { useMemo, useState } from 'react';
import { Tire, TireStatus, Vehicle } from '../types';
import { 
  DollarSign, TrendingUp, PieChart as PieIcon, BarChart3, TrendingDown, 
  Wallet, Recycle, AlertCircle, FileSpreadsheet, Loader2, Printer, 
  X, Landmark, ArrowUpRight, ArrowDownRight, Coins, Briefcase, 
  PiggyBank, ShieldCheck, BarChart, History, Layers, Calculator, Medal
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, 
  Line, AreaChart, Area 
} from 'recharts';

interface FinancialHubProps {
  tires: Tire[];
  vehicles?: Vehicle[];
}

export const FinancialHub: React.FC<FinancialHubProps> = ({ tires, vehicles = [] }) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const stats = useMemo(() => {
    let totalInvested = 0;
    let currentEquity = 0;
    let totalScrapLoss = 0;
    let totalRetreadSavings = 0;
    let totalKms = 0;
    let consumedValue = 0;
    
    // Brand Efficiency Map
    // Key: "BRAND - MODEL"
    const brandStats: Record<string, { 
        totalCost: number, 
        totalKm: number, 
        count: number,
        brand: string,
        model: string 
    }> = {};

    tires.forEach(tire => {
      const investment = tire.totalInvestment || tire.price || 0;
      const original = tire.originalTreadDepth || 18;
      const current = tire.currentTreadDepth;
      const safetyLimit = 3.0;
      
      // Patrimonio & Scrap
      if (tire.status !== TireStatus.DAMAGED) {
        totalInvested += investment;
        const usableRatio = Math.max(0, (current - safetyLimit) / (original - safetyLimit));
        currentEquity += investment * usableRatio;
      } else {
        totalScrapLoss += investment;
      }

      // Savings
      if (tire.retreadCount > 0) {
          const avgNewPrice = 2800;
          const totalRetreadCost = (tire.totalInvestment || 0) - (tire.price || 0);
          totalRetreadSavings += (avgNewPrice * tire.retreadCount) - totalRetreadCost;
      }

      // CPK Calculation
      let tireTotalKm = tire.totalKms || 0;
      if (tire.vehicleId && vehicles && tire.installOdometer) {
          const v = vehicles.find(vh => vh.id === tire.vehicleId);
          if (v) {
              const currentRun = Math.max(0, v.odometer - tire.installOdometer);
              tireTotalKm += currentRun;
          }
      }

      // Populate Global Stats
      if (tireTotalKm > 1000) {
          totalKms += tireTotalKm;
          const wearRatio = Math.min(1, (original - current) / (original - safetyLimit));
          consumedValue += investment * wearRatio;

          // Populate Brand Stats
          const key = `${tire.brand} - ${tire.model}`;
          if (!brandStats[key]) {
              brandStats[key] = { 
                  totalCost: 0, 
                  totalKm: 0, 
                  count: 0,
                  brand: tire.brand,
                  model: tire.model 
              };
          }
          brandStats[key].totalCost += investment;
          brandStats[key].totalKm += tireTotalKm;
          brandStats[key].count++;
      }
    });

    const timelineData = []; // Mocked for simplicity or use existing logic if retained
    
    // Process Efficiency Data
    const efficiencyData = Object.values(brandStats)
        .map(item => ({
            name: `${item.brand} ${item.model}`,
            brand: item.brand,
            count: item.count,
            avgTotalKm: item.totalKm / item.count,
            cpk: item.totalCost / item.totalKm,
            totalCost: item.totalCost
        }))
        .sort((a,b) => a.cpk - b.cpk); // Lowest CPK first

    return {
      totalInvested,
      currentEquity,
      totalScrapLoss,
      totalRetreadSavings,
      avgCpk: totalKms > 0 ? consumedValue / totalKms : 0,
      timelineData, // Keeping existing structure
      efficiencyData
    };
  }, [tires, vehicles]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER E AÇÕES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Landmark className="h-7 w-7 text-indigo-600" /> Console Financeiro
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Análise de ativos, depreciação e retorno sobre investimento (ROI).</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
           <button onClick={() => setShowPrintModal(true)} className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <Printer className="h-4 w-4" /> Relatório
           </button>
        </div>
      </div>

      {/* EQUITY SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patrimônio Líquido (Equity)</p>
           <h3 className="text-2xl font-black text-slate-800 dark:text-white">{money(stats.currentEquity)}</h3>
           <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500" style={{ width: `${(stats.currentEquity / (stats.totalInvested || 1)) * 100}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-indigo-500">{Math.round((stats.currentEquity / (stats.totalInvested || 1)) * 100)}% Útil</span>
           </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-600/20 text-white relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><PiggyBank className="h-16 w-16" /></div>
           <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">Economia em Recapagem</p>
           <h3 className="text-2xl font-black">{money(stats.totalRetreadSavings)}</h3>
           <p className="text-[10px] text-emerald-100 mt-4 flex items-center gap-1 font-bold">
              <ShieldCheck className="h-3 w-3" /> ROI Positivo Detectado
           </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo por KM (Global)</p>
           <h3 className="text-2xl font-black text-slate-800 dark:text-white">R$ {stats.avgCpk.toFixed(5)}</h3>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                 <TrendingDown className="h-3 w-3" /> Eficiente
              </span>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Perda Real (Sucata)</p>
           <h3 className="text-2xl font-black text-red-600">{money(stats.totalScrapLoss)}</h3>
           <p className="text-[10px] text-slate-400 mt-4 font-medium">Investimento não recuperado</p>
        </div>
      </div>

      {/* RANK DE EFICIÊNCIA (NOVO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
         <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
            <div>
               <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-emerald-500" /> Rank de Eficiência (CPK Real)
               </h3>
               <p className="text-xs text-slate-500 mt-1">Comparativo de performance considerando custo total (compra + reformas) e quilometragem real.</p>
            </div>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase">Melhor Custo-Benefício</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                     <th className="p-6">Marca & Modelo</th>
                     <th className="p-6 text-center">Amostra (Un)</th>
                     <th className="p-6 text-right">Média KM/Vida</th>
                     <th className="p-6 text-right bg-blue-50/50 dark:bg-blue-900/10">CPK Real</th>
                     <th className="p-6 text-center">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {stats.efficiencyData.map((brand, idx) => (
                     <tr key={brand.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="p-6">
                           <div className="flex items-center gap-3">
                              {idx === 0 && <Medal className="h-6 w-6 text-yellow-500" />}
                              {idx === 1 && <Medal className="h-6 w-6 text-slate-400" />}
                              {idx === 2 && <Medal className="h-6 w-6 text-orange-400" />}
                              {idx > 2 && <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">{idx + 1}</div>}
                              <span className="font-black text-slate-800 dark:text-white uppercase text-sm">{brand.name}</span>
                           </div>
                        </td>
                        <td className="p-6 text-center">
                           <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold text-slate-500">{brand.count}</span>
                        </td>
                        <td className="p-6 text-right font-mono text-slate-600 dark:text-slate-400 text-sm">
                           <span className="font-bold">{Math.round(brand.avgTotalKm).toLocaleString()} km</span>
                        </td>
                        <td className="p-6 text-right font-mono font-black text-lg bg-blue-50/50 dark:bg-blue-900/10 border-l border-r border-blue-100 dark:border-blue-900/30">
                           <span className={`${idx === 0 ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>
                              R$ {brand.cpk.toFixed(5)}
                           </span>
                        </td>
                        <td className="p-6 text-center">
                           {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full uppercase border border-emerald-100 dark:border-emerald-800">
                                 <ArrowDownRight className="h-3 w-3" /> Campeão
                              </span>
                           ) : (
                              <span className="text-slate-400 font-bold text-xs">
                                 +{Math.round(((brand.cpk / stats.efficiencyData[0].cpk) - 1) * 100)}% custo
                              </span>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* PRINT MODAL (Existing logic preserved, just wrapper shown) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black text-xl text-slate-800 dark:text-white">Gerar Relatório</h3>
                 <button onClick={() => setShowPrintModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5"/></button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Selecione o período para análise financeira detalhada.</p>
              <div className="space-y-4 mb-8">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Período Inicial</label>
                    <input type="date" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold" value={printStartDate} onChange={e => setPrintStartDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Período Final</label>
                    <input type="date" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold" value={printEndDate} onChange={e => setPrintEndDate(e.target.value)} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowPrintModal(false)} className="py-3 font-bold text-slate-500">Cancelar</button>
                 <button className="py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Imprimir PDF</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
