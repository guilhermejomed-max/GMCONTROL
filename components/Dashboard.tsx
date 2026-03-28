
import { useMemo, useState, FC } from 'react';
import { Tire, TireStatus, Vehicle, TabView, SystemSettings, ServiceOrder, VehicleType } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, ComposedChart, Line, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie, LineChart
} from 'recharts';
import { 
  Activity, TrendingUp, TrendingDown, AlertTriangle, 
  ArrowRight, Truck, Package, Wrench, Clock,
  ArrowRightLeft, Plus, Zap, Layers, Filter, CheckCircle2, 
  Coins, LayoutDashboard, AlertOctagon, RefreshCw, Container, MousePointerClick,
  Target, CalendarClock, ShieldCheck, Gauge, Sparkles, BrainCircuit, Leaf, Flame,
  AlertCircle, ChevronRight, BarChart3, History, ScrollText, Wallet, ShoppingCart, Percent
} from 'lucide-react';
import { MaintenanceAgenda } from './MaintenanceAgenda';

interface DashboardProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  serviceOrders?: ServiceOrder[];
  onNavigate: (tab: TabView) => void;
  onOpenServiceOrder?: (vehicleId: string) => void;
  settings?: SystemSettings;
  vehicleTypes?: VehicleType[];
}

type OperationFilter = string;

export const Dashboard: FC<DashboardProps> = ({ 
  tires: allTires, 
  vehicles: allVehicles, 
  branches = [],
  defaultBranchId,
  serviceOrders: allServiceOrders = [], 
  onNavigate, 
  onOpenServiceOrder, 
  settings,
  vehicleTypes = []
}) => {
  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);

  const vehicles = useMemo(() => {
    return defaultBranchId ? allVehicles.filter(v => v.branchId === defaultBranchId) : allVehicles;
  }, [allVehicles, defaultBranchId]);
  const serviceOrders = useMemo(() => {
    return defaultBranchId ? allServiceOrders.filter(so => so.branchId === defaultBranchId) : allServiceOrders;
  }, [allServiceOrders, defaultBranchId]);
  const [period, setPeriod] = useState<'30D' | 'YTD'>('YTD');
  const [opFilter, setOpFilter] = useState<OperationFilter>('ALL');
  
  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);
    const currentHour = now.getHours();
    const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
    const minDepth = settings?.minTreadDepth || 3;

    // 1. FILTERING
    const branchVehicles = defaultBranchId ? (vehicles || []).filter(v => v.branchId === defaultBranchId) : (vehicles || []);
    const branchTiresForStats = defaultBranchId ? (tires || []).filter(t => t.branchId === defaultBranchId) : (tires || []);

    const filteredVehicles = branchVehicles.filter(v => opFilter === 'ALL' || v.type === opFilter);
    const vehicleIds = new Set(filteredVehicles.map(v => v.id));
    
    const filteredTires = opFilter === 'ALL' 
        ? branchTiresForStats
        : branchTiresForStats.filter(t => t.vehicleId && vehicleIds.has(t.vehicleId));

    const mountedTires = filteredTires.filter(t => t.vehicleId);

    // 2. FLEET HEALTH SCORE
    const totalMounted = mountedTires.length;
    const criticalCount = mountedTires.filter(t => t.currentTreadDepth <= minDepth).length;
    const warningCount = mountedTires.filter(t => t.currentTreadDepth > minDepth && t.currentTreadDepth <= (minDepth + 2)).length;
    
    const criticalPercentage = totalMounted > 0 ? (criticalCount / totalMounted) * 100 : 0;
    const warningPercentage = totalMounted > 0 ? (warningCount / totalMounted) * 100 : 0;

    let healthScore = 100;
    let inspectionCompliance = 0;
    
    if (totalMounted === 0) {
        healthScore = 0; 
    } else {
        // Redução baseada na porcentagem de pneus críticos
        healthScore -= (criticalPercentage * 0.8); 

        const uninspectedCount = mountedTires.filter(t => !t.lastInspectionDate || new Date(t.lastInspectionDate) < thirtyDaysAgo).length;
        inspectionCompliance = totalMounted > 0 ? ((totalMounted - uninspectedCount) / totalMounted) * 100 : 0;
        
        if (inspectionCompliance < 90) healthScore -= 5;
        if (inspectionCompliance < 70) healthScore -= 10;
        if (inspectionCompliance < 50) healthScore -= 15;

        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
    }

    // 3. AI INSIGHT
    let aiInsight = totalMounted === 0 ? "Nenhum pneu monitorado." : "Operação estável. Continue o monitoramento.";
    let aiMood: 'GOOD' | 'WARN' | 'BAD' = 'GOOD';

    if (totalMounted > 0) {
        if (criticalCount > 5) {
            aiInsight = `Crítico: ${criticalCount} pneus atingiram o limite. Ação imediata requerida.`;
            aiMood = 'BAD';
        } else if (inspectionCompliance < 60) {
            aiInsight = `Atenção: ${Math.round(100 - inspectionCompliance)}% da frota sem inspeção recente.`;
            aiMood = 'WARN';
        } else if (healthScore > 90) {
            aiInsight = "Excelente gestão! Eficiência e segurança em níveis ótimos.";
            aiMood = 'GOOD';
        }
    }

    // 4. WATCHLIST
    const vehicleCriticalMap: Record<string, number> = {};
    mountedTires.forEach(t => {
        if(t.currentTreadDepth <= minDepth && t.vehicleId) {
            vehicleCriticalMap[t.vehicleId] = (vehicleCriticalMap[t.vehicleId] || 0) + 1;
        }
    });
    
    const watchList = Object.entries(vehicleCriticalMap)
        .map(([vId, count]) => {
            const v = vehicles?.find(veh => veh.id === vId);
            return v ? { ...v, criticalCount: count } : null;
        })
        .filter((v): v is Vehicle & { criticalCount: number } => v !== null)
        .sort((a,b) => b.criticalCount - a.criticalCount)
        .slice(0, 3);

    // 5. LIVE OPERATIONS FEED (Global History)
    const recentActivity = branchTiresForStats
        .flatMap(t => (t.history || []).map(h => ({ ...h, tire: t.fireNumber, id: t.id + h.date })))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    // 6. STOCK VELOCITY (Most mounted models last 30 days)
    const velocityMap: Record<string, number> = {};
    branchTiresForStats.forEach(t => {
        const recentMounts = t.history?.filter(h => h.action === 'MONTADO' && new Date(h.date) > thirtyDaysAgo);
        if(recentMounts?.length) {
            const key = `${t.brand} ${t.model}`;
            velocityMap[key] = (velocityMap[key] || 0) + recentMounts.length;
        }
    });
    const stockVelocity = Object.entries(velocityMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0, 3);

    // 7. AVERAGE NEW TIRE PRICE
    const newTires = filteredTires.filter(t => t.price && t.price > 0);
    const calculatedAvgNewPrice = newTires.length > 0 
        ? newTires.reduce((acc, t) => acc + Number(t.price || 0), 0) / newTires.length 
        : 2800;

    // 8. PREVISÃO DE COMPRA (Forecast simplificado: pneus < 5mm)
    const warningTiresCount = mountedTires.filter(t => t.currentTreadDepth > minDepth && t.currentTreadDepth <= (minDepth + 2)).length;
    const projectedCost = warningTiresCount * calculatedAvgNewPrice; 

    // 9. TAXA DE OCUPAÇÃO (Pneus Rodando / Total Ativos)
    const totalActiveTires = (tires || []).filter(t => t.status !== TireStatus.DAMAGED).length;
    const utilizationRate = totalActiveTires > 0 ? (mountedTires.length / totalActiveTires) * 100 : 0;

    // 10. COST DISTRIBUTION
    let totalAcquisition = 0;
    let totalServices = 0;
    filteredTires.forEach(t => {
        totalAcquisition += Number(t.price || 0);
        const serviceCost = Number(t.totalInvestment || t.price || 0) - Number(t.price || 0);
        if (serviceCost > 0) totalServices += serviceCost;
    });
    const costDistribution = [
        { name: 'Aquisição', value: totalAcquisition, color: '#0f172a' },
        { name: 'Recapagem', value: totalServices, color: '#3b82f6' }
    ];

    // 11. FINANCIAL DATA (Chart)
    const monthlyData: Record<string, { name: string, fullDate: Date, custo: number, aquisicao: number, recapagem: number, cpk: number }> = {};
    
    if (period === 'YTD') {
        const currentMonth = now.getMonth();
        for(let i=currentMonth; i>=0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), fullDate: d, custo: 0, aquisicao: 0, recapagem: 0, cpk: 0 };
        }
    } else if (period === '12M') {
        for(let i=11; i>=0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), fullDate: d, custo: 0, aquisicao: 0, recapagem: 0, cpk: 0 };
        }
    } else {
        // 30D - just show last 2 months to have some line/area
        for(let i=1; i>=0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = { name: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), fullDate: d, custo: 0, aquisicao: 0, recapagem: 0, cpk: 0 };
        }
    }

    let startDate = new Date();
    if (period === 'YTD') {
        startDate = new Date(now.getFullYear(), 0, 1);
    } else if (period === '12M') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    let totalGlobalKms = 0;
    let consumedGlobalValue = 0;

    filteredTires.forEach(t => {
        // CPK Calculation
        const vehicle = vehicles?.find(v => v.id === t.vehicleId);
        const currentRun = (vehicle && t.installOdometer) ? Math.max(0, vehicle.odometer - t.installOdometer) : 0;
        const totalKm = (t.totalKms || 0) + currentRun;
        
        const investment = Number(t.totalInvestment || t.price || 0);
        const original = t.originalTreadDepth || 18;
        const current = t.currentTreadDepth || original;
        const safetyLimit = settings?.minTreadDepth || 3;

        if (totalKm > 0) { 
            totalGlobalKms += totalKm;
            consumedGlobalValue += investment;
        }

        // Acquisition
        if (t.purchaseDate) {
            const d = new Date(t.purchaseDate.includes('T') ? t.purchaseDate : t.purchaseDate + 'T12:00:00');
            if (d >= startDate) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[key]) {
                    const cost = t.price || 0;
                    monthlyData[key].custo += cost;
                    monthlyData[key].aquisicao += cost;
                }
            }
        }

        // Retreads
        const retreadEvents = t.history?.filter(h => h.action === 'RETORNO_RECAPAGEM') || [];
        if (retreadEvents.length > 0) {
            const totalRetreadCost = Number(t.totalInvestment || t.price || 0) - Number(t.price || 0);
            const costPerRetread = totalRetreadCost / retreadEvents.length;
            
            retreadEvents.forEach(ev => {
                if (ev.date) {
                    const d = new Date(ev.date.includes('T') ? ev.date : ev.date + 'T12:00:00');
                    if (d >= startDate) {
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (monthlyData[key]) {
                            monthlyData[key].custo += costPerRetread;
                            monthlyData[key].recapagem += costPerRetread;
                        }
                    }
                }
            });
        }
    });

    const avgCpk = totalGlobalKms > 0 ? consumedGlobalValue / totalGlobalKms : 0;

    const chartData = Object.values(monthlyData).map(d => ({
        ...d,
        cpk: avgCpk
    }));

    // 12. BURN RATE & SAVINGS
    let totalWearMm = 0, totalKmForWear = 0, totalRetreadSavings = 0;
    filteredTires.forEach(t => {
        const vehicle = vehicles?.find(v => v.id === t.vehicleId);
        const currentRun = (vehicle && t.installOdometer) ? Math.max(0, vehicle.odometer - t.installOdometer) : 0;
        const run = (t.totalKms || 0) + currentRun;

        if (run > 0) {
            const consumed = (t.originalTreadDepth || 18) - t.currentTreadDepth;
            if (consumed > 0) { totalWearMm += consumed; totalKmForWear += run; }
        }
        if (t.retreadCount > 0) {
            const newTirePrice = Number(t.price || calculatedAvgNewPrice);
            let retreadCosts = Number(t.totalInvestment || t.price || 0) - newTirePrice;
            if (retreadCosts <= 0) {
                // Se não temos o custo real registrado, estimamos o custo da recapagem em 30% do valor de um pneu novo
                retreadCosts = t.retreadCount * (newTirePrice * 0.3);
            }
            const hypotheticalCost = t.retreadCount * newTirePrice;
            totalRetreadSavings += (hypotheticalCost - retreadCosts);
        }
    });
    const burnRate = totalKmForWear > 0 ? (totalWearMm / totalKmForWear) * 10000 : 0;

    const fleetHealth = totalMounted > 0 
        ? Math.max(0, 100 - (criticalPercentage * 1.0) - (warningPercentage * 0.4))
        : 100;

    return {
        greeting,
        activeVehicles: filteredVehicles.length,
        totalTires: filteredTires.length,
        healthScore: Math.round(fleetHealth),
        aiInsight,
        aiMood,
        criticalCount,
        burnRate,
        totalRetreadSavings,
        chartData,
        costDistribution,
        avgCpk,
        watchList,
        recentActivity,
        stockVelocity,
        warningTiresCount,
        projectedCost,
        utilizationRate
    };
  }, [tires, vehicles, settings, period, opFilter]);

  const scoreColor = stats.healthScore > 80 ? '#10b981' : stats.healthScore > 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-700">
      
      {/* 1. TOP BAR */}
      <div className="flex flex-col xl:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            Dashboard Operacional
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 flex items-center gap-2 text-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Sistema Online • <strong className="text-slate-700 dark:text-slate-200">{stats.activeVehicles} Veículos</strong> monitorados
          </p>
        </div>
        
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl shadow-inner relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Truck className="h-4 w-4 text-indigo-500" />
            </div>
            <select
                value={opFilter}
                onChange={(e) => setOpFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-xl text-sm font-bold transition-all bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm outline-none border-none cursor-pointer appearance-none min-w-[200px]"
            >
                <option value="ALL">Global (Todos os Veículos)</option>
                {vehicleTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                        {type.name}
                    </option>
                ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
            </div>
        </div>
      </div>


      {/* 3. BENTO GRID - KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         
         {/* HEALTH SCORE */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <div className="flex justify-between items-start z-10">
                <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity className="h-3 w-3"/> Saúde da Frota</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalTires > 0 ? stats.healthScore : '---'} <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">{stats.totalTires > 0 ? '/100' : ''}</span></h3>
                </div>
            </div>
            <div className="absolute right-[-10px] bottom-[-20px] w-24 h-24 opacity-20">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="80%" outerRadius="100%" data={[{ value: stats.healthScore, fill: scoreColor }]} startAngle={90} endAngle={-270}>
                        <RadialBar background dataKey="value" />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4">
               <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                   <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${stats.healthScore}%`, backgroundColor: scoreColor }}></div>
               </div>
            </div>
         </div>

         {/* CPK METRIC */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between group">
            <div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Gauge className="h-3 w-3"/> CPK Médio</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white font-mono">{stats.totalTires > 0 ? `R$ ${stats.avgCpk.toFixed(4)}` : '---'}</h3>
            </div>
            <div className="h-10 w-full mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.chartData}>
                        <Line type="monotone" dataKey="cpk" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* UTILIZATION RATE (OCCUPANCY) */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5"><Percent className="h-16 w-16"/></div>
            <div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Truck className="h-3 w-3 text-blue-500"/> Ocupação (Rodando)</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.utilizationRate.toFixed(0)}%</h3>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl w-fit">
                {stats.totalTires} Pneus Ativos
            </div>
         </div>

         {/* RETREAD SAVINGS */}
         <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Leaf className="h-16 w-16 text-emerald-500"/></div>
            <div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Leaf className="h-3 w-3 text-emerald-500"/> Economia (Recap)</p>
                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{money(stats.totalRetreadSavings)}</h3>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl w-fit">
                Evitado em pneus novos
            </div>
         </div>
      </div>

      {/* 4. MAIN ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* FINANCIAL CHART */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-indigo-500"/> Fluxo de Investimento
                    </h3>
                    <p className="text-xs text-slate-500">Custo operacional acumulado (Aquisição + Serviços).</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {['30D', 'YTD', '12M'].map((p) => (
                        <button 
                            key={p} 
                            onClick={() => setPeriod(p as any)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${period === p ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontWeight: 'bold'}} dy={10} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(v) => `R$${v/1000}k`} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(val: number) => money(val)}
                        />
                        <Area type="monotone" dataKey="aquisicao" name="Aquisição" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.8} />
                        <Area type="monotone" dataKey="recapagem" name="Recapagem" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
         </div>

         {/* RIGHT COL: COST DISTRIBUTION & WATCHLIST */}
         <div className="flex flex-col gap-6">
             
             {/* COST DISTRIBUTION (DONUT) */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[220px]">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-500"/> Distribuição de Custos
                </h3>
                <div className="flex-1 flex items-center relative">
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie
                                data={stats.costDistribution}
                                cx="50%" cy="50%"
                                innerRadius={40} outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {stats.costDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* VEHICLE WATCHLIST */}
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex-1 flex flex-col">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500"/> Watchlist (Críticos)
                </h3>
                
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[150px] custom-scrollbar">
                    {stats.watchList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 className="h-10 w-10 mb-2 opacity-30 text-green-500"/>
                            <p className="text-xs font-bold">Nenhum veículo crítico.</p>
                        </div>
                    ) : (
                        stats.watchList.map((v, i) => (
                            <div key={v?.id || i} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-slate-800 dark:text-white">{v?.plate}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{v?.model}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-red-600 dark:text-red-400">{v?.criticalCount}</span>
                                    <p className="text-[9px] text-red-500 font-bold leading-none">Pneus Baixos</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>

         </div>
      </div>

      {/* 5. STRATEGIC ROW: PURCHASE FORECAST & STOCK VELOCITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* PURCHASE FORECAST (NEW) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingCart className="h-20 w-20 text-indigo-500"/></div>
              
              <div className="relative z-10">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-1 flex items-center gap-2">
                      <Target className="h-4 w-4 text-indigo-500"/> Projeção de Compra
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Estimativa de reposição (Pneus &lt; 5mm)</p>
                  
                  <div className="flex items-end gap-2 mb-2">
                      <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{stats.warningTiresCount}</span>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">pneus vencerão em breve</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Custo Estimado de Reposição</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white">{money(stats.projectedCost)}</p>
                  </div>
              </div>
          </div>

          {/* STOCK VELOCITY (FIXED) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-500"/> Top Consumo (30d)
                </h3>
                <div className="space-y-3 flex-1">
                    {stats.stockVelocity.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                            <History className="h-8 w-8 mb-2 opacity-20"/>
                            <p className="text-xs">Sem movimentação recente.</p>
                        </div>
                    ) : (
                        stats.stockVelocity.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-bold">{i+1}</span>
                                    <span className="font-bold text-slate-600 dark:text-slate-300">{item.name}</span>
                                </div>
                                <span className="font-black text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{item.count} un</span>
                            </div>
                        ))
                    )}
                </div>
          </div>
      </div>

      {/* 6. LIVE OPERATIONS FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-blue-500"/> Feed de Operações (Ao Vivo)
              </h3>
              <div className="space-y-3">
                  {stats.recentActivity.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">Nenhuma atividade recente.</p>
                  ) : (
                      stats.recentActivity.map((log, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className={`p-2 rounded-lg shrink-0 ${
                                  log.action === 'MONTADO' ? 'bg-green-100 text-green-600' :
                                  log.action === 'DESMONTADO' ? 'bg-orange-100 text-orange-600' :
                                  log.action === 'INSPECAO' ? 'bg-blue-100 text-blue-600' :
                                  'bg-slate-200 text-slate-600'
                              }`}>
                                  {log.action === 'MONTADO' ? <Plus className="h-4 w-4"/> :
                                   log.action === 'DESMONTADO' ? <ArrowRightLeft className="h-4 w-4"/> :
                                   log.action === 'INSPECAO' ? <CheckCircle2 className="h-4 w-4"/> :
                                   <History className="h-4 w-4"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                          {log.action.replace('_', ' ')} • Pneu {log.tire}
                                      </p>
                                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                          {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                      </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{log.details}</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden flex flex-col">
              <MaintenanceAgenda tires={tires} vehicles={vehicles} settings={settings} onNavigate={onNavigate} onOpenServiceOrder={onOpenServiceOrder} />
          </div>
      </div>

      {/* 7. QUICK ACTIONS DOCK */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500"/> Acesso Rápido</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => onNavigate('inspection')} className="group flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white rounded-2xl transition-all duration-300 border border-transparent hover:border-blue-400 hover:shadow-lg hover:-translate-y-1">
                  <MousePointerClick className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:text-white mb-2"/>
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-100 group-hover:text-white">Nova Inspeção</span>
              </button>
              <button onClick={() => onNavigate('movement')} className="group flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-600 hover:text-white rounded-2xl transition-all duration-300 border border-transparent hover:border-purple-400 hover:shadow-lg hover:-translate-y-1">
                  <ArrowRightLeft className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:text-white mb-2"/>
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-100 group-hover:text-white">Movimentar</span>
              </button>
              <button onClick={() => onNavigate('register')} className="group flex flex-col items-center justify-center p-4 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all duration-300 border border-transparent hover:border-emerald-400 hover:shadow-lg hover:-translate-y-1">
                  <Plus className="h-6 w-6 text-emerald-600 dark:text-emerald-400 group-hover:text-white mb-2"/>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100 group-hover:text-white">Cadastrar Pneu</span>
              </button>
              <button onClick={() => onNavigate('service-orders')} className="group flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-600 hover:text-white rounded-2xl transition-all duration-300 border border-transparent hover:border-orange-400 hover:shadow-lg hover:-translate-y-1">
                  <Wrench className="h-6 w-6 text-orange-600 dark:text-orange-400 group-hover:text-white mb-2"/>
                  <span className="text-xs font-bold text-orange-900 dark:text-orange-100 group-hover:text-white">Manutenção</span>
              </button>
          </div>
      </div>

    </div>
  );
};
