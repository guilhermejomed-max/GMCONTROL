import React, { useMemo, useState, FC } from 'react';
import { Tire, Vehicle, SystemSettings, TireStatus } from '../types';
import { 
  TrendingUp, ShoppingCart, Calendar, AlertTriangle, BarChart3, 
  DollarSign, Package, Filter, ArrowRight, Wallet, History,
  CheckCircle2, Info, ChevronRight, BadgeAlert, Layers, Milestone
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, AreaChart, Area } from 'recharts';
import { getTireLiveKm } from '../lib/tireIntelligence';

interface DemandForecastProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  settings?: SystemSettings;
}

interface ProjectionResult {
  tire: Tire;
  vehiclePlate: string;
  remainingKm: number;
  replacementDate: Date;
  estimatedCost: number;
  confidence: 'REAL' | 'ESTIMATIVA';
  monthKey: string;
  currentTreadDepth: number;
  safetyLimit: number;
  monthlyKm: number;
  dataSource: string;
}

interface IgnoredForecastItem {
  fireNumber: string;
  vehiclePlate?: string;
  reason: string;
}

export const DemandForecast: FC<DemandForecastProps> = ({ 
  tires: allTires, 
  vehicles: allVehicles, 
  branches = [],
  defaultBranchId,
  settings 
}) => {
  const tires = useMemo(() => {
    // Pneus agora sao universais
    return allTires;
  }, [allTires]);

  const vehicles = allVehicles;
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'BY_SIZE'>('TIMELINE');

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isValidNumber = (value: unknown, min = 0, max = Number.POSITIVE_INFINITY): value is number => {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  };

  const forecastData = useMemo(() => {
    const results: ProjectionResult[] = [];
    const ignored: IgnoredForecastItem[] = [];
    const mountedTires = tires.filter(t => t.vehicleId && t.status !== TireStatus.DAMAGED && t.status !== TireStatus.RETREADING);
    const today = new Date();
    
    mountedTires.forEach(tire => {
      const vehicle = vehicles.find(v => v.id === tire.vehicleId);
      if (!vehicle) {
        ignored.push({ fireNumber: tire.fireNumber, reason: 'veiculo vinculado nao encontrado' });
        return;
      }

      const modelDef = settings?.tireModels?.find(m => m.brand === tire.brand && m.model === tire.model);
      const current = isValidNumber(tire.currentTreadDepth, 0.1, 35) ? tire.currentTreadDepth : tire.lastMeasuredDepth;
      if (!isValidNumber(current, 0.1, 35)) {
        ignored.push({ fireNumber: tire.fireNumber, vehiclePlate: vehicle.plate, reason: 'sulco atual ausente ou invalido' });
        return;
      }

      const originalCandidate = isValidNumber(tire.originalTreadDepth, 1, 35)
        ? tire.originalTreadDepth
        : modelDef?.originalDepth;
      if (!isValidNumber(originalCandidate, 1, 35)) {
        ignored.push({ fireNumber: tire.fireNumber, vehiclePlate: vehicle.plate, reason: 'sulco original ausente ou invalido' });
        return;
      }

      const original = Math.max(originalCandidate, current);
      const modelLimit = modelDef?.limitDepth;
      const safetyLimitCandidate = isValidNumber(modelLimit, 0.5, 20) ? modelLimit : settings?.minTreadDepth;
      const safetyLimit = isValidNumber(safetyLimitCandidate, 0.5, 20) ? safetyLimitCandidate : 3.0;
      if (safetyLimit >= original) {
        ignored.push({ fireNumber: tire.fireNumber, vehiclePlate: vehicle.plate, reason: 'limite de sulco maior que sulco original' });
        return;
      }

      const monthlyKm = isValidNumber(vehicle.avgMonthlyKm, 100, 50000) ? vehicle.avgMonthlyKm : undefined;
      if (!monthlyKm) {
        ignored.push({ fireNumber: tire.fireNumber, vehiclePlate: vehicle.plate, reason: 'KM mensal do veiculo nao informado' });
        return;
      }
      const dailyKm = monthlyKm / 30;

      let remainingKm = 0;
      let confidence: 'REAL' | 'ESTIMATIVA' = 'ESTIMATIVA';

      const kmRun = getTireLiveKm(tire, vehicle);
      const wear = original - current;
      const remainingRubber = Math.max(0, current - safetyLimit);
      const usableRubber = Math.max(0.1, original - safetyLimit);

      if (remainingRubber <= 0) {
        remainingKm = 0;
        confidence = 'REAL';
      } else if (isValidNumber(kmRun, 5000) && wear >= 1.0) {
        const wearRate = wear / kmRun;
        remainingKm = remainingRubber / wearRate;
        confidence = 'REAL';
      } else {
        const estimatedTotalLife = modelDef?.estimatedLifespanKm || 80000;
        remainingKm = estimatedTotalLife * (remainingRubber / usableRubber);
        confidence = 'ESTIMATIVA';
      }

      if (!Number.isFinite(remainingKm) || remainingKm < 0) {
        ignored.push({ fireNumber: tire.fireNumber, vehiclePlate: vehicle.plate, reason: 'resultado de KM restante invalido' });
        return;
      }

      if (remainingKm > 200000) remainingKm = 200000;

      const daysToReplacement = Math.ceil(remainingKm / dailyKm);
      const replacementDate = new Date();
      replacementDate.setDate(today.getDate() + daysToReplacement);

      const monthKey = `${replacementDate.getFullYear()}-${String(replacementDate.getMonth() + 1).padStart(2, '0')}`;
      const estimatedCost = isValidNumber(tire.price, 1)
        ? tire.price
        : isValidNumber(tire.totalInvestment, 1)
          ? tire.totalInvestment
          : 2500;

      results.push({
        tire,
        vehiclePlate: vehicle.plate,
        remainingKm: Math.round(remainingKm),
        replacementDate,
        estimatedCost,
        confidence,
        monthKey,
        currentTreadDepth: current,
        safetyLimit,
        monthlyKm,
        dataSource: 'KM do veiculo'
      });
    });

    return {
      results: results.sort((a, b) => a.replacementDate.getTime() - b.replacementDate.getTime()),
      ignored
    };
  }, [tires, vehicles, settings]);

  const forecast = forecastData.results;

  const stats = useMemo(() => {
    const today = new Date();
    const next30 = new Date(); next30.setDate(today.getDate() + 30);
    const next90 = new Date(); next90.setDate(today.getDate() + 90);
    const next365 = new Date(); next365.setDate(today.getDate() + 365);

    const urgent = forecast.filter(f => f.replacementDate <= next30);
    const quarter = forecast.filter(f => f.replacementDate <= next90);
    const annual = forecast.filter(f => f.replacementDate <= next365);

    const budgetUrgent = urgent.reduce((a, b) => a + b.estimatedCost, 0);
    const budgetQuarter = quarter.reduce((a, b) => a + b.estimatedCost, 0);
    const budgetAnnual = annual.reduce((a, b) => a + b.estimatedCost, 0);

    // Dados para o Grafico Mensal
    const monthlyData: Record<string, { name: string, qty: number, cost: number }> = {};
    for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = { name: d.toLocaleString('pt-BR', { month: 'short' }), qty: 0, cost: 0 };
    }

    forecast.forEach(f => {
        if (monthlyData[f.monthKey]) {
            monthlyData[f.monthKey].qty++;
            monthlyData[f.monthKey].cost += f.estimatedCost;
        }
    });

    // Agrupamento por Medida (Essencial para Compras)
    const bySize: Record<string, { size: string, qty: number, budget: number }> = {};
    const purchaseWindow = annual.length > 0 ? annual : forecast.slice(0, 30);
    purchaseWindow.forEach(f => {
        const key = `${f.tire.width}/${f.tire.profile} R${f.tire.rim}`;
        if (!bySize[key]) bySize[key] = { size: key, qty: 0, budget: 0 };
        bySize[key].qty++;
        bySize[key].budget += f.estimatedCost;
    });

    return {
        urgentCount: urgent.length,
        quarterCount: quarter.length,
        annualCount: annual.length,
        budgetUrgent,
        budgetQuarter,
        budgetAnnual,
        chartData: Object.values(monthlyData),
        sizeData: Object.values(bySize).sort((a,b) => b.qty - a.qty)
    };
  }, [forecast]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Urgencia (30 dias)</p>
          <h3 className="text-3xl font-black text-red-600">{stats.urgentCount} <span className="text-sm font-medium text-slate-400">pneus</span></h3>
          <div className="mt-2 text-xs font-bold text-slate-500 flex items-center gap-1">
             <Wallet className="h-3 w-3" /> {money(stats.budgetUrgent)}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proximo Trimestre</p>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.quarterCount} <span className="text-sm font-medium text-slate-400">pneus</span></h3>
          <div className="mt-2 text-xs font-bold text-slate-500 flex items-center gap-1">
             <Wallet className="h-3 w-3" /> {money(stats.budgetQuarter)}
          </div>
        </div>
        <div className="md:col-span-2 bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 text-white flex justify-between items-center relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Previsao Orcamentaria Anual</p>
              <h3 className="text-4xl font-black">{money(stats.budgetAnnual)}</h3>
              <p className="text-[10px] text-indigo-100 mt-2 opacity-80">{stats.annualCount} pneus previstos nos proximos 12 meses.</p>
           </div>
           <div className="opacity-20"><ShoppingCart className="h-20 w-20" /></div>
        </div>
      </div>

      {forecastData.ignored.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-3xl p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <BadgeAlert className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-900 dark:text-amber-100">Previsao revisada: {forecastData.ignored.length} pneus foram ignorados por dados invalidos.</p>
            <p className="text-xs text-amber-800/70 dark:text-amber-200/70 mt-1">
              Principais motivos: {Array.from(new Set(forecastData.ignored.slice(0, 6).map(item => item.reason))).join(', ')}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART SECTION */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" /> Fluxo de Reposicao Mensal
              </h3>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="qty" name="Qtd Pneus" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorQty)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LIST OF UPCOMING REPLACEMENTS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" /> Cronograma Detalhado (Proximos)
              </h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                 <button onClick={() => setViewMode('TIMELINE')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'TIMELINE' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>Por Data</button>
                 <button onClick={() => setViewMode('BY_SIZE')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'BY_SIZE' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600' : 'text-slate-500'}`}>Por Medida</button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {viewMode === 'TIMELINE' ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-black text-[10px] uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Previsao</th>
                      <th className="p-4">Pneu / Veiculo</th>
                      <th className="p-4">KM Restante</th>
                      <th className="p-4">Confianca</th>
                      <th className="p-4 text-right">Custo Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {forecast.slice(0, 20).map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                           <div className="font-black text-slate-800 dark:text-white">{f.replacementDate.toLocaleDateString()}</div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase">{f.replacementDate.toLocaleString('pt-BR', { weekday: 'long' })}</div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                             <span className="font-bold text-indigo-600">{f.tire.fireNumber}</span>
                             <span className="text-slate-400">|</span>
                             <span className="font-black text-slate-700 dark:text-slate-300 uppercase">{f.vehiclePlate}</span>
                           </div>
                           <div className="text-[10px] text-slate-400 font-medium">{f.tire.brand} {f.tire.model}</div>
                        </td>
                        <td className="p-4">
                           <div className="font-mono font-bold text-slate-600 dark:text-slate-400">{f.remainingKm.toLocaleString()} <span className="text-[10px]">km</span></div>
                           <div className="text-[10px] text-slate-400 font-bold mt-1">Sulco {f.currentTreadDepth.toFixed(1)}mm / limite {f.safetyLimit.toFixed(1)}mm</div>
                           <div className="text-[10px] text-slate-400">{f.monthlyKm.toLocaleString()} km/mes - {f.dataSource}</div>
                        </td>
                        <td className="p-4">
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${f.confidence === 'REAL' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                             {f.confidence === 'REAL' ? 'DADO REAL' : 'ESTIMADO'}
                           </span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-300">
                           {money(f.estimatedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   {stats.sizeData.map((s, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                         <div>
                            <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">Medida</p>
                            <h4 className="font-black text-lg text-slate-800 dark:text-white">{s.size}</h4>
                         </div>
                         <div className="text-right">
                            <div className="text-2xl font-black text-slate-800 dark:text-white">{s.qty} <span className="text-xs text-slate-400 font-medium">un</span></div>
                            <div className="text-xs font-bold text-slate-500">{money(s.budget)}</div>
                         </div>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR PLANNING */}
        <div className="space-y-6">
           
           {/* RECENT INSPECTION IMPACT */}
           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <History className="h-4 w-4 text-blue-500" /> Alertas Recentes
              </h4>
              <div className="space-y-4">
                 {forecast.filter(f => f.confidence === 'REAL').slice(0, 4).map((f, i) => (
                    <div key={i} className="flex gap-4 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                       <div className={`p-2 rounded-xl ${f.remainingKm < 10000 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          <AlertTriangle className="h-4 w-4" />
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white">{f.tire.fireNumber} ({f.vehiclePlate})</p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-1">Desgaste real acelerado. Previsao para <strong>{f.replacementDate.toLocaleDateString()}</strong>.</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* BUDGET SUMMARY BY QUARTER */}
           <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-24 w-24" /></div>
              <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-6">Projecao de Verba</h4>
              <div className="space-y-6 relative z-10">
                 <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                       <span>Restante do Mes</span>
                       <span>{stats.urgentCount} un</span>
                    </div>
                    <div className="flex justify-between items-end">
                       <div className="text-2xl font-black">{money(stats.budgetUrgent)}</div>
                       <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: '40%' }}></div>
                       </div>
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                       <span>Proximo Trimestre</span>
                       <span>{stats.quarterCount} un</span>
                    </div>
                    <div className="flex justify-between items-end">
                       <div className="text-2xl font-black">{money(stats.budgetQuarter)}</div>
                       <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: '75%' }}></div>
                       </div>
                    </div>
                 </div>
              </div>
              <button className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                 <Package className="h-4 w-4" /> Solicitar Cotacao em Lote
              </button>
           </div>

           <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-800">
              <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Info className="h-4 w-4" /> Nota Tecnica
              </h4>
              <p className="text-[10px] text-blue-700/70 dark:text-blue-300/60 leading-relaxed">
                 As projecoes de troca sao baseadas na taxa de consumo de borracha (mm/km) calculada entre a profundidade original do pneu e a ultima medicao de sulco registrada na inspecao. Pneus sem inspecao recente utilizam a media teorica do catalogo.
              </p>
           </div>

        </div>

      </div>
    </div>
  );
};
