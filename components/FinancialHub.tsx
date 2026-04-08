
import React, { useMemo, useState } from 'react';
import { Tire, TireStatus, Vehicle, RetreadOrder } from '../types';
import { 
  DollarSign, TrendingUp, PieChart as PieIcon, BarChart3, TrendingDown, 
  Wallet, Recycle, AlertCircle, FileSpreadsheet, Loader2, Printer, 
  X, Landmark, ArrowUpRight, ArrowDownRight, Coins, Briefcase, 
  PiggyBank, ShieldCheck, BarChart, History, Layers, Calculator, Medal, Calendar as CalendarIcon
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, 
  Line, AreaChart, Area 
} from 'recharts';

interface FinancialHubProps {
  tires: Tire[];
  vehicles?: Vehicle[];
  retreadOrders?: RetreadOrder[];
  branches?: any[];
  defaultBranchId?: string;
}

export const FinancialHub: React.FC<FinancialHubProps> = ({ 
  tires: allTires, 
  vehicles: allVehicles = [], 
  retreadOrders: allRetreadOrders = [], 
  branches = [],
  defaultBranchId 
}) => {
  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);

  const vehicles = allVehicles;

  const retreadOrders = useMemo(() => {
    return defaultBranchId ? allRetreadOrders.filter(ro => ro.branchId === defaultBranchId) : allRetreadOrders;
  }, [allRetreadOrders, defaultBranchId]);
  const [treadFilter, setTreadFilter] = useState<'ALL' | 'LISO' | 'BORRACHUDO'>('ALL');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [showAllEfficiency, setShowAllEfficiency] = useState(false);

  const filteredTires = useMemo(() => {
    if (treadFilter === 'ALL') return tires;
    return tires.filter(t => {
        // Use treadType if available, otherwise fallback to model/pattern check
        const tireType = t.treadType || '';
        const model = t.model || '';
        const pattern = (t as any).treadPattern || ''; // Fallback for legacy
        
        const isLiso = tireType === 'LISO' || model.toLowerCase().includes('liso') || pattern.toLowerCase().includes('liso');
        const isBorrachudo = tireType === 'BORRACHUDO' || model.toLowerCase().includes('borrachudo') || pattern.toLowerCase().includes('borrachudo');
        
        return treadFilter === 'LISO' ? isLiso : isBorrachudo;
    });
  }, [tires, treadFilter]);

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
        totalFirstLifeKm: number,
        totalRetreadKm: number,
        count: number,
        brand: string,
        model: string 
    }> = {};

    filteredTires.forEach(tire => {
      const investment = Number(tire.totalInvestment || tire.price || 0);
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
          const newTirePrice = Number(tire.price || 2800);
          let totalRetreadCost = Number(tire.totalInvestment || tire.price || 0) - newTirePrice;
          if (totalRetreadCost <= 0) {
              totalRetreadCost = tire.retreadCount * (newTirePrice * 0.3);
          }
          totalRetreadSavings += (newTirePrice * tire.retreadCount) - totalRetreadCost;
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
      if (tireTotalKm > 0) {
          totalKms += tireTotalKm;
          consumedValue += investment;

          // Populate Brand Stats
          const key = `${tire.brand} - ${tire.model}`;
          if (!brandStats[key]) {
              brandStats[key] = { 
                  totalCost: 0, 
                  totalKm: 0, 
                  totalFirstLifeKm: 0,
                  totalRetreadKm: 0,
                  count: 0,
                  brand: tire.brand,
                  model: tire.model 
              };
          }
          brandStats[key].totalCost += investment;
          brandStats[key].totalKm += tireTotalKm;
          brandStats[key].totalFirstLifeKm += (tire.firstLifeKms || 0);
          brandStats[key].totalRetreadKm += (tire.retreadKms || 0);
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
            avgFirstLifeKm: item.totalFirstLifeKm / item.count,
            avgRetreadKm: item.totalRetreadKm / item.count,
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
  }, [filteredTires, vehicles]);

  const reportData = useMemo(() => {
    if (!reportStartDate || !reportEndDate) return null;

    const start = new Date(reportStartDate);
    const end = new Date(reportEndDate);
    end.setHours(23, 59, 59, 999);

    let mountedCount = 0;
    let mountedValue = 0;
    let retreadCount = 0;
    let retreadValue = 0;
    let discardedCount = 0;
    let discardedValue = 0;

    // 1. Pneus Montados (Usados)
    tires.forEach(tire => {
        // Check history for 'MONTADO' events within range
        const mountedEvents = tire.history.filter(h => {
            const d = new Date(h.date + (h.date.includes('T') ? '' : 'T12:00:00'));
            return h.action === 'MONTADO' && d >= start && d <= end;
        });
        
        if (mountedEvents.length > 0) {
            mountedCount += mountedEvents.length;
            // Value is tricky for multiple mounts, but let's approximate with current price * count
            // Or better, just count the tire once if it was mounted? No, "Quantidade de Pneus Usados" implies volume.
            mountedValue += (tire.price || 0) * mountedEvents.length;
        }

        // 3. Pneus Descartados
        const discardEvents = tire.history.filter(h => {
            const d = new Date(h.date + (h.date.includes('T') ? '' : 'T12:00:00'));
            return (h.action === 'DESCARTE' || (h.action === 'EDITADO' && h.details.includes('Status alterado para: Danificado/Descarte'))) && d >= start && d <= end;
        });

        if (discardEvents.length > 0) {
            discardedCount += discardEvents.length;
            discardedValue += Number(tire.totalInvestment || tire.price || 0) * discardEvents.length;
        }
    });

    // 2. Recapagens Feitas
    retreadOrders.forEach(order => {
        // Use returnedDate or sentDate? Usually returnedDate implies "Feita" (Done).
        // If returnedDate is missing, check status 'CONCLUIDO' and maybe use a fallback?
        // Let's use returnedDate if available, otherwise ignore if not concluded.
        if (order.status === 'CONCLUIDO' && order.returnedDate) {
            const d = new Date(order.returnedDate);
            if (d >= start && d <= end) {
                retreadCount += order.tireIds.length; // Count tires, not orders
                retreadValue += order.totalCost || (order.items ? order.items.reduce((sum, i) => sum + (i.cost || 0), 0) : 0);
            }
        }
    });

    return {
        mountedCount,
        mountedValue,
        retreadCount,
        retreadValue,
        discardedCount,
        discardedValue
    };

  }, [tires, retreadOrders, reportStartDate, reportEndDate]);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 print:p-0 print:space-y-4">
      
      {/* HEADER E AÇÕES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Landmark className="h-7 w-7 text-indigo-600" /> Console Financeiro
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Análise de ativos, depreciação e retorno sobre investimento (ROI).</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
           <select 
             className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
             value={treadFilter}
             onChange={e => setTreadFilter(e.target.value as any)}
           >
             <option value="ALL">Todos os Pneus</option>
             <option value="LISO">Pneus Lisos</option>
             <option value="BORRACHUDO">Pneus Borrachudos</option>
           </select>
           <button onClick={() => {
               // Scroll to report section
               document.getElementById('custom-report')?.scrollIntoView({ behavior: 'smooth' });
           }} className="flex-1 lg:flex-none px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
              <FileSpreadsheet className="h-4 w-4" /> Relatório Detalhado
           </button>
        </div>
      </div>

      {/* EQUITY SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patrimônio Líquido (Equity)</p>
           <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">{money(stats.currentEquity)}</h3>
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
           <h3 className="text-xl font-black truncate">{money(stats.totalRetreadSavings)}</h3>
           <p className="text-[10px] text-emerald-100 mt-4 flex items-center gap-1 font-bold">
              <ShieldCheck className="h-3 w-3" /> ROI Positivo Detectado
           </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm group">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custo por KM (Global)</p>
           <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">R$ {stats.avgCpk.toFixed(5)}</h3>
           <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                 <TrendingDown className="h-3 w-3" /> Eficiente
              </span>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-red-500">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Perda Real (Sucata)</p>
           <h3 className="text-xl font-black text-red-600 truncate">{money(stats.totalScrapLoss)}</h3>
           <p className="text-[10px] text-slate-400 mt-4 font-medium">Investimento não recuperado</p>
        </div>
      </div>

      {/* RANK DE EFICIÊNCIA (NOVO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:hidden">
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
                     <th className="p-6 text-right">KM 1ª Vida</th>
                     <th className="p-6 text-right">KM Recap</th>
                     <th className="p-6 text-right bg-blue-50/50 dark:bg-blue-900/10">CPK Real</th>
                     <th className="p-6 text-center">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {(showAllEfficiency ? stats.efficiencyData : stats.efficiencyData.slice(0, 5)).map((brand, idx) => (
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
                        <td className="p-6 text-right font-mono text-slate-600 dark:text-slate-400 text-sm">
                           <span className="font-bold">{Math.round(brand.avgFirstLifeKm).toLocaleString()} km</span>
                        </td>
                        <td className="p-6 text-right font-mono text-slate-600 dark:text-slate-400 text-sm">
                           <span className="font-bold">{Math.round(brand.avgRetreadKm).toLocaleString()} km</span>
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
         {stats.efficiencyData.length > 5 && (
            <div className="flex justify-center p-6 border-t border-slate-100 dark:border-slate-800">
               <button 
                  onClick={() => setShowAllEfficiency(!showAllEfficiency)}
                  className="px-8 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center gap-2"
               >
                  {showAllEfficiency ? 'VER MENOS' : `VER RANK COMPLETO (${stats.efficiencyData.length})`}
               </button>
            </div>
         )}
      </div>

      {/* CUSTOM REPORT SECTION */}
      <div id="custom-report" className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:shadow-none print:border-none">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50 print:bg-white print:p-0 print:mb-4 print:border-none">
              <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" /> Relatório de Movimentação
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 print:hidden">Gere relatórios detalhados de uso, recapagens e descartes por período.</p>
                  <p className="text-xs text-slate-500 mt-1 hidden print:block">
                      Período: {reportStartDate ? new Date(reportStartDate).toLocaleDateString() : 'Início'} até {reportEndDate ? new Date(reportEndDate).toLocaleDateString() : 'Fim'}
                  </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto print:hidden">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <CalendarIcon className="h-4 w-4 text-slate-400 ml-2" />
                      <input 
                          type="date" 
                          className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                      />
                      <span className="text-slate-300">|</span>
                      <input 
                          type="date" 
                          className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                      />
                  </div>
                  <button 
                      onClick={handlePrintReport}
                      disabled={!reportData}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                      <Printer className="h-4 w-4" /> Imprimir
                  </button>
              </div>
          </div>

          <div className="p-8 print:p-0">
              {!reportData ? (
                  <div className="text-center py-12 text-slate-400 print:hidden">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Selecione um período acima para visualizar os dados.</p>
                  </div>
              ) : (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* PNEUS USADOS (MONTADOS) */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30 print:border print:border-slate-200">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Pneus Montados (Uso)</p>
                                  <h4 className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">{reportData.mountedCount} <span className="text-sm font-bold text-slate-400">un</span></h4>
                              </div>
                              <div className="p-3 bg-blue-100 dark:bg-blue-800/30 rounded-xl">
                                  <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                          </div>
                          <div className="pt-4 border-t border-blue-100 dark:border-blue-900/30">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Valor Estimado em Uso</p>
                              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{money(reportData.mountedValue)}</p>
                          </div>
                      </div>

                      {/* RECAPAGENS FEITAS */}
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-900/30 print:border print:border-slate-200">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Recapagens Feitas</p>
                                  <h4 className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">{reportData.retreadCount} <span className="text-sm font-bold text-slate-400">un</span></h4>
                              </div>
                              <div className="p-3 bg-emerald-100 dark:bg-emerald-800/30 rounded-xl">
                                  <Recycle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                              </div>
                          </div>
                          <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900/30">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Custo Total</p>
                              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{money(reportData.retreadValue)}</p>
                          </div>
                      </div>

                      {/* PNEUS DESCARTADOS */}
                      <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-100 dark:border-red-900/30 print:border print:border-slate-200">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Pneus Descartados</p>
                                  <h4 className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">{reportData.discardedCount} <span className="text-sm font-bold text-slate-400">un</span></h4>
                              </div>
                              <div className="p-3 bg-red-100 dark:bg-red-800/30 rounded-xl">
                                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                              </div>
                          </div>
                          <div className="pt-4 border-t border-red-100 dark:border-red-900/30">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Valor Perdido (Investimento)</p>
                              <p className="text-lg font-bold text-red-700 dark:text-red-300">{money(reportData.discardedValue)}</p>
                          </div>
                      </div>
                  </div>
                  
                  {/* RESUMO DO PERÍODO */}
                  <div className="bg-slate-800 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
                      <h4 className="font-black text-lg uppercase tracking-widest">Resumo Líquido do Período</h4>
                      <div className="flex gap-8">
                          <div className="text-center">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Saldo de Pneus</p>
                              <p className="text-xl font-black">{reportData.mountedCount - reportData.discardedCount}</p>
                          </div>
                          <div className="text-center">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Fluxo Financeiro</p>
                              <p className="text-xl font-black text-emerald-400">
                                  {money(reportData.mountedValue - reportData.retreadValue - reportData.discardedValue)}
                              </p>
                          </div>
                      </div>
                  </div>
                  </>
              )}
          </div>
      </div>

    </div>
  );
};
