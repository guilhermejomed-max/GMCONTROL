
import React, { useMemo, FC, useState } from 'react';
import { Tire, Vehicle, SystemSettings, TireStatus, VehicleType } from '../types';
import { 
  Target, Trophy, TrendingUp, TrendingDown, DollarSign, Calculator, 
  Truck, Container, ArrowRight, Activity, AlertCircle, Map as MapIcon, 
  FileText, Car, AlertTriangle, Milestone, Star, ShieldAlert, Coins, 
  Crown, BarChart3, Info, CheckCircle2, TrendingUp as Rising, Percent,
  ScatterChart as ScatterIcon, ArrowUpRight, ArrowDownRight, Layers,
  PieChart, CheckSquare, Square, Scale, X, Trash2, Skull
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, ReferenceLine, LabelList, ScatterChart, Scatter, ZAxis, PieChart as RePieChart, Pie
} from 'recharts';

interface StrategicAnalysisProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  settings?: SystemSettings;
  vehicleTypes?: VehicleType[];
}

type OperationFilter = 'ALL' | 'DIRECIONAL' | 'TRACAO' | 'CARRETA';
type TreadFilter = 'ALL' | 'LISO' | 'BORRACHUDO';

interface ModelStrategicData {
  key: string;
  brand: string;
  model: string;
  displayName: string; // Adicionado para exibicao no grafico
  count: number;
  avgPurchasePrice: number;
  avgTotalInvestment: number;
  avgProjectedLife: number;
  avgRealCpk: number;
  efficiencyScore: number; // 0-100
  confidenceLevel: 'ALTA' | 'MEDIA' | 'BAIXA';
  isBestValue: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
        <p className="font-bold mb-1 border-b border-slate-700 pb-1">{data.displayName || data.name}</p>
        <div className="space-y-1">
           {data.avgRealCpk && <div className="flex justify-between gap-3"><span>CPK Real:</span> <span className="font-mono text-green-400 font-bold">R$ {data.avgRealCpk.toFixed(5)}</span></div>}
           {data.avgProjectedLife && <div className="flex justify-between gap-3"><span>Vida Util:</span> <span className="font-mono font-bold">{Math.round(data.avgProjectedLife).toLocaleString()} km</span></div>}
           {data.value !== undefined && <div className="flex justify-between gap-3"><span>Qtd:</span> <span>{data.value}</span></div>}
        </div>
      </div>
    );
  }
  return null;
};

export const StrategicAnalysis: FC<StrategicAnalysisProps> = ({ 
  tires: allTires, 
  vehicles: allVehicles, 
  branches = [],
  defaultBranchId,
  settings,
  vehicleTypes = []
}) => {
  const tires = useMemo(() => {
    // Pneus agora sao universais, mostramos todos independentemente da filial selecionada
    return allTires;
  }, [allTires]);

  const vehicles = allVehicles;
  const [opFilter, setOpFilter] = useState<OperationFilter>('ALL');
  const [treadFilter, setTreadFilter] = useState<TreadFilter>('ALL');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getOperation = (vType: string, pos: string): OperationFilter => {
    // Busca o tipo de veiculo dinamico
    const vehicleType = vehicleTypes.find(vt => vt.id === vType || vt.name === vType);
    
    if (!vehicleType) {
      // Fallback para tipos conhecidos se nao encontrar o objeto de tipo
      if (vType === 'CARRETA') return 'CARRETA';
      if (['CAVALO', 'BI-TRUCK', 'BITRUCK', '3/4'].includes(vType)) {
        if (['1E', '1D', '1E1', '1D1', '2E', '2D'].includes(pos)) return 'DIRECIONAL';
        return 'TRACAO';
      }
      return 'ALL';
    }

    // Se for um tipo que nao tem eixos direcionais ou e explicitamente uma carreta
    if (vehicleType.name.toUpperCase().includes('CARRETA') || vehicleType.steerAxlesCount === 0) {
      return 'CARRETA';
    }

    // Logica baseada na contagem de eixos direcionais
    const steerAxles = vehicleType.steerAxlesCount ?? 1;
    const steerPositions = [];
    for (let i = 1; i <= steerAxles; i++) {
      const suffix = i === 1 ? '' : String(i - 1);
      steerPositions.push(`${i}E${suffix}`, `${i}D${suffix}`);
    }

    if (steerPositions.includes(pos)) return 'DIRECIONAL';
    return 'TRACAO';
  };

  // --- ANALISE DE SUCATA (NOVO) ---
  const scrapAnalysis = useMemo(() => {
      const scrappedTires = tires.filter(t => t.status === TireStatus.DAMAGED);
      const reasons: Record<string, number> = {
          'Fim de Vida (Desgaste Natural)': 0,
          'Corte/Dano Acidental': 0,
          'Falha de Recapagem': 0,
          'Fadiga de Carcaca': 0,
          'Outros': 0
      };

      let totalLossValue = 0;

      scrappedTires.forEach(t => {
          totalLossValue += (t.price || 0); // Simplificacao: Custo de aquisicao perdido ou valor residual
          
          // Tenta extrair motivo do historico
          const log = t.history?.find(h => h.action === 'DESCARTE');
          const details = log?.details?.toLowerCase() || '';

          if (details.includes('fim de vida') || details.includes('natural') || details.includes('tw')) {
              reasons['Fim de Vida (Desgaste Natural)']++;
          } else if (details.includes('corte') || details.includes('furo') || details.includes('acidental') || details.includes('bolha')) {
              reasons['Corte/Dano Acidental']++;
          } else if (details.includes('recapagem') || details.includes('soltura')) {
              reasons['Falha de Recapagem']++;
          } else if (details.includes('fadiga') || details.includes('estrutura')) {
              reasons['Fadiga de Carcaca']++;
          } else {
              reasons['Outros']++;
          }
      });

      const chartData = Object.entries(reasons)
          .map(([name, value]) => ({ name, value }))
          .filter(d => d.value > 0)
          .sort((a,b) => b.value - a.value);

      const prematureRate = scrappedTires.length > 0 
          ? ((scrappedTires.length - reasons['Fim de Vida (Desgaste Natural)']) / scrappedTires.length) * 100 
          : 0;

      return { chartData, totalScrapped: scrappedTires.length, totalLossValue, prematureRate };
  }, [tires]);

  const strategicData = useMemo(() => {
    const groups: Record<string, {
      brand: string;
      model: string;
      items: { acquisitionCost: number; totalLifecycleCost: number; projectedLife: number; confidence: number; isReal: boolean }[];
    }> = {};

    tires.forEach(tire => {
      if (tire.status === TireStatus.DAMAGED || !tire.brand || !tire.model) return;

      // Filtro de Operacao
      if (tire.vehicleId) {
        const v = vehicles.find(veh => veh.id === tire.vehicleId);
        if (v && tire.position) {
          const op = getOperation(v.type, tire.position);
          if (opFilter !== 'ALL' && op !== opFilter) return;
        }
      } else if (opFilter !== 'ALL') return;

      // Filtro de Tipo de Banda
      if (treadFilter !== 'ALL' && tire.treadType !== treadFilter) return;

      const key = `${tire.brand.trim().toUpperCase()} - ${tire.model.trim().toUpperCase()}`;
      if (!groups[key]) {
        groups[key] = { brand: tire.brand.trim().toUpperCase(), model: tire.model.trim().toUpperCase(), items: [] };
      }

      const acquisitionCost = Number(tire.price) > 0 ? Number(tire.price) : 0;
      const totalLifecycleCost = Number(tire.totalInvestment) > 0 ? Number(tire.totalInvestment) : (acquisitionCost > 0 ? acquisitionCost : 2500);
      const finalAcquisitionCost = acquisitionCost > 0 ? acquisitionCost : totalLifecycleCost;

      const originalDepth = tire.originalTreadDepth || 18.0;
      const currentDepth = tire.currentTreadDepth;
      const safetyLimit = settings?.minTreadDepth || 3.0;
      
      let kmRun = tire.totalKms || 0;
      if (tire.vehicleId) {
        const v = vehicles.find(veh => veh.id === tire.vehicleId);
        if (v && tire.installOdometer) kmRun += Math.max(0, v.odometer - tire.installOdometer);
      }

      let projectedLife = 0;
      let confidence = 0;
      let isReal = false;

      const wear = originalDepth - currentDepth;
      
      if (kmRun >= 5000 && wear >= 1.5) {
        const wearRate = wear / kmRun;
        const remainingRubber = Math.max(0, currentDepth - safetyLimit);
        
        if (wearRate > 0) {
            projectedLife = kmRun + (remainingRubber / wearRate);
            if (projectedLife > 220000) projectedLife = 220000;
            confidence = Math.min(100, (kmRun / 40000) * 100); 
            isReal = true;
        }
      } 
      
      if (isReal) {
          groups[key].items.push({ acquisitionCost: finalAcquisitionCost, totalLifecycleCost, projectedLife, confidence, isReal });
      }
    });

    const results: ModelStrategicData[] = Object.entries(groups).map(([key, data]) => {
      const count = data.items.length;
      if (count === 0) return null;

      const avgPurchasePrice = data.items.reduce((a, b) => a + b.acquisitionCost, 0) / count;
      const avgTotalInvestment = data.items.reduce((a, b) => a + b.totalLifecycleCost, 0) / count;
      const avgLife = data.items.reduce((a, b) => a + b.projectedLife, 0) / count;
      const avgConf = data.items.reduce((a, b) => a + b.confidence, 0) / count;
      
      const avgRealCpk = avgTotalInvestment / avgLife;
      const confidenceLevel: 'ALTA' | 'MEDIA' | 'BAIXA' = avgConf > 70 ? 'ALTA' : avgConf > 40 ? 'MEDIA' : 'BAIXA';

      return {
        key,
        brand: data.brand,
        model: data.model,
        displayName: `${data.brand} ${data.model}`, // Nome composto para o grafico
        count,
        avgPurchasePrice,
        avgTotalInvestment,
        avgProjectedLife: avgLife,
        avgRealCpk,
        efficiencyScore: 0, 
        confidenceLevel,
        isBestValue: false
      };
    }).filter((r): r is ModelStrategicData => r !== null && r.avgRealCpk > 0);

    if (results.length > 0) {
      const cpks = results.map(r => r.avgRealCpk);
      const minCpk = Math.min(...cpks);
      const maxCpk = Math.max(...cpks);

      results.forEach(r => {
        const score = maxCpk === minCpk ? 100 : ((maxCpk - r.avgRealCpk) / (maxCpk - minCpk)) * 100;
        r.efficiencyScore = Math.round(score);
      });

      // Ordenar do menor CPK (Melhor) para o maior (Pior)
      results.sort((a, b) => a.avgRealCpk - b.avgRealCpk);
      if (results.length > 0) results[0].isBestValue = true;
    }

    return results;
  }, [tires, vehicles, settings, opFilter, treadFilter]);

  const globalAvgCpk = useMemo(() => {
    if (strategicData.length === 0) return 0;
    return strategicData.reduce((a, b) => a + b.avgRealCpk, 0) / strategicData.length;
  }, [strategicData]);

  const annualPotentialSavings = useMemo(() => {
      if(strategicData.length === 0) return 0;
      const best = strategicData[0].avgRealCpk;
      const currentAvg = globalAvgCpk;
      const totalKmPerYear = tires.length * 100000; 
      return Math.max(0, (currentAvg - best) * totalKmPerYear);
  }, [strategicData, globalAvgCpk, tires.length]);

  const toggleSelection = (key: string) => {
      setSelectedModels(prev => {
          if (prev.includes(key)) return prev.filter(k => k !== key);
          if (prev.length >= 3) {
              alert("Selecione no maximo 3 modelos para comparar.");
              return prev;
          }
          return [...prev, key];
      });
  };

  const comparisonData = useMemo(() => {
      if (selectedModels.length < 2) return null;
      
      const items = strategicData.filter(d => selectedModels.includes(d.key));
      const bestCpk = items.reduce((min, i) => i.avgRealCpk < min.avgRealCpk ? i : min, items[0]);
      const bestLife = items.reduce((max, i) => i.avgProjectedLife > max.avgProjectedLife ? i : max, items[0]);
      
      return { items, bestCpk, bestLife };
  }, [selectedModels, strategicData]);

  const SCRAP_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#64748b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-600" /> Inteligencia de Compra & Ciclo de Vida
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Analise de eficiencia baseada em dados reais de rodagem e motivos de descarte.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex shadow-inner">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'LISO', label: 'Liso' },
              { id: 'BORRACHUDO', label: 'Borrachudo' },
            ].map(opt => (
              <button 
                key={opt.id}
                onClick={() => setTreadFilter(opt.id as TreadFilter)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  treadFilter === opt.id 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex shadow-inner">
            {[
              { id: 'ALL', label: 'Global' },
              { id: 'DIRECIONAL', label: 'Direcional' },
              { id: 'TRACAO', label: 'Tracao' },
              { id: 'CARRETA', label: 'Carreta' },
            ].map(opt => (
              <button 
                key={opt.id}
                onClick={() => setOpFilter(opt.id as OperationFilter)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  opFilter === opt.id 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {strategicData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
             <ShieldAlert className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">Dados Insuficientes</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-md mx-auto">
            O sistema precisa de mais historico de rodagem (pneus com &gt;5.000km e desgaste mensuravel) para gerar inteligencia confiavel.
          </p>
        </div>
      ) : (
        <>
          {/* 2. KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CPK Medio da Frota</p>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">R$ {globalAvgCpk.toFixed(5)}</h3>
                 </div>
                 <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-indigo-500 transition-colors"><Activity className="h-6 w-6"/></div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Economia Projetada</p>
                    <h3 className="text-xl font-black text-green-600 dark:text-green-400 truncate">{money(annualPotentialSavings)}</h3>
                    <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded font-bold mt-1 inline-block">Anual Estimado</span>
                 </div>
                 <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-500"><TrendingDown className="h-6 w-6"/></div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Analisado</p>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white truncate">{strategicData.reduce((a,b)=>a+b.count,0)} <span className="text-sm font-medium text-slate-400">pneus</span></h3>
                 </div>
                 <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><Layers className="h-6 w-6"/></div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Perda Prematura</p>
                    <h3 className={`text-xl font-black ${scrapAnalysis.prematureRate > 20 ? 'text-red-600' : 'text-slate-800 dark:text-white'} truncate`}>{Math.round(scrapAnalysis.prematureRate)}%</h3>
                    <span className="text-[10px] text-slate-400 font-bold mt-1 inline-block">de Sucata Acidental</span>
                 </div>
                 <div className={`p-3 rounded-xl ${scrapAnalysis.prematureRate > 20 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}><Skull className="h-6 w-6"/></div>
              </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
             
             {/* 3. CHAMPION HIGHLIGHT & BAR CHART */}
             <div className="xl:col-span-2 space-y-6">
                
                {/* CHAMPION CARD */}
                {strategicData.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                   <div className="absolute top-0 right-0 p-8 opacity-10"><Crown className="h-40 w-40" /></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                      <div>
                         <div className="flex items-center gap-2 mb-2">
                            <span className="bg-yellow-400 text-indigo-900 text-xs font-black px-3 py-1 rounded-full uppercase flex items-center gap-1"><Trophy className="h-3 w-3"/> Melhor ROI</span>
                            <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Eficiencia {strategicData[0].efficiencyScore}/100</span>
                         </div>
                         <h3 className="text-3xl font-black tracking-tight mb-1 truncate">{strategicData[0].brand}</h3>
                         <p className="text-lg text-indigo-200 font-medium truncate">{strategicData[0].model}</p>
                      </div>
                      
                      <div className="flex gap-8 text-right">
                         <div>
                            <p className="text-xs font-bold text-indigo-300 uppercase mb-1">CPK Real</p>
                            <p className="text-2xl font-black font-mono text-green-400 truncate">R$ {strategicData[0].avgRealCpk.toFixed(5)}</p>
                         </div>
                         <div>
                            <p className="text-xs font-bold text-indigo-300 uppercase mb-1">Vida Util Est.</p>
                            <p className="text-2xl font-black truncate">{Math.round(strategicData[0].avgProjectedLife).toLocaleString()} km</p>
                         </div>
                      </div>
                   </div>
                </div>
                )}

                {/* BAR CHART: RANKING */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500"/> Ranking de Eficiencia (CPK)</h3>
                      <span className="text-xs font-medium text-slate-400">Menor barra e melhor</span>
                   </div>
                   <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height={350}>
                         <BarChart data={strategicData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                            <XAxis type="number" hide />
                            {/* Eixo Y Exibindo Marca + Modelo */}
                            <YAxis 
                                dataKey="displayName" 
                                type="category" 
                                width={160} 
                                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="avgRealCpk" radius={[0, 4, 4, 0]} barSize={24}>
                               {strategicData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={index === 0 ? '#10b981' : index === strategicData.length - 1 ? '#ef4444' : '#6366f1'} 
                                  />
                               ))}
                               <LabelList dataKey="avgRealCpk" position="right" formatter={(val: number) => `R$ ${val.toFixed(5)}`} fontSize={11} fill="#64748b" fontWeight="bold" />
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
             </div>

             {/* COLUNA DIREITA: MATRIZ E SUCATA */}
             <div className="space-y-6">
                
                {/* SCATTER CHART (VALUE MATRIX) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-[400px]">
                    <div className="mb-6">
                       <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><ScatterIcon className="h-5 w-5 text-purple-500"/> Matriz de Valor</h3>
                       <p className="text-xs text-slate-500 mt-1">Preco de Compra (X) vs Durabilidade (Y)</p>
                    </div>
                    <div className="h-[300px] w-full">
                       <ResponsiveContainer width="100%" height={300}>
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                             <XAxis type="number" dataKey="avgPurchasePrice" name="Preco" unit="R$" tick={{fontSize: 10, fill: '#94a3b8'}} />
                             <YAxis type="number" dataKey="avgProjectedLife" name="Vida" unit="km" tick={{fontSize: 10, fill: '#94a3b8'}} />
                             <ZAxis type="number" dataKey="count" range={[60, 400]} />
                             <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                             <Scatter name="Modelos" data={strategicData} fill="#8884d8">
                                {strategicData.map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#6366f1'} />
                                ))}
                             </Scatter>
                          </ScatterChart>
                       </ResponsiveContainer>
                    </div>
                </div>

                {/* NOVO: ANALISE DE SUCATA (PIE CHART) */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col h-[400px]">
                    <div className="mb-2">
                       <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Trash2 className="h-5 w-5 text-red-500"/> Analise de Sucateamento</h3>
                       <p className="text-xs text-slate-500 mt-1">Motivos de saida definitiva da frota.</p>
                    </div>
                    
                    {scrapAnalysis.chartData.length > 0 ? (
                        <>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height={250}>
                                    <RePieChart>
                                        <Pie
                                            data={scrapAnalysis.chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {scrapAnalysis.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SCRAP_COLORS[index % SCRAP_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                                {scrapAnalysis.chartData.map((d, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SCRAP_COLORS[i % SCRAP_COLORS.length] }}></div>
                                            <span className="text-slate-600 dark:text-slate-300">{d.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-white">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 className="h-10 w-10 mb-2 opacity-30 text-green-500"/>
                            <p className="text-xs font-bold">Nenhum pneu sucateado.</p>
                        </div>
                    )}
                </div>

             </div>
          </div>

          {/* 5. DETAILED TABLE WITH COMPARISON */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Detalhamento Tecnico</h3>
                <span className="text-xs text-slate-400 font-medium">Selecione para comparar</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase border-b border-slate-100 dark:border-slate-800">
                      <tr>
                         <th className="p-4 w-12 text-center">Comp.</th>
                         <th className="p-4">Rank</th>
                         <th className="p-4">Marca / Modelo</th>
                         <th className="p-4 text-center">Amostra</th>
                         <th className="p-4 text-right">Custo Medio (Novo)</th>
                         <th className="p-4 text-right">Vida Util (Proj)</th>
                         <th className="p-4 text-right">CPK Efetivo</th>
                         <th className="p-4 text-center">Confianca</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {strategicData.map((item, idx) => {
                         const isSelected = selectedModels.includes(item.key);
                         return (
                            <tr key={item.key} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx === 0 ? 'bg-green-50/30 dark:bg-green-900/10' : ''} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                               <td className="p-4 text-center">
                                  <button onClick={() => toggleSelection(item.key)} className="text-slate-400 hover:text-blue-600 transition-colors">
                                      {isSelected ? <CheckSquare className="h-5 w-5 text-blue-600"/> : <Square className="h-5 w-5"/>}
                                  </button>
                               </td>
                               <td className="p-4">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                     {idx + 1}
                                  </div>
                               </td>
                               <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-white">{item.brand}</div>
                                  <div className="text-xs text-slate-500">{item.model}</div>
                               </td>
                               <td className="p-4 text-center font-medium text-slate-600 dark:text-slate-400">{item.count}</td>
                               <td className="p-4 text-right text-slate-600 dark:text-slate-300">{money(item.avgPurchasePrice)}</td>
                               <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400">{Math.round(item.avgProjectedLife).toLocaleString()} km</td>
                               <td className="p-4 text-right font-mono font-black text-slate-800 dark:text-white">{idx === 0 ? <span className="text-green-600">R$ {item.avgRealCpk.toFixed(5)}</span> : `R$ ${item.avgRealCpk.toFixed(5)}`}</td>
                               <td className="p-4 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${item.confidenceLevel === 'ALTA' ? 'bg-green-100 text-green-700' : item.confidenceLevel === 'MEDIA' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                     {item.confidenceLevel}
                                  </span>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>

          {/* FLOATING ACTION BAR FOR COMPARISON */}
          {selectedModels.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 border border-slate-700">
                  <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Selecionados</span>
                      <div className="font-black text-lg">{selectedModels.length} Modelos</div>
                  </div>
                  <div className="h-8 w-px bg-slate-700"></div>
                  <button 
                      onClick={() => setIsCompareModalOpen(true)}
                      disabled={selectedModels.length < 2}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <Scale className="h-5 w-5"/>
                      Comparar Agora
                  </button>
                  <button onClick={() => setSelectedModels([])} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                      <X className="h-5 w-5"/>
                  </button>
              </div>
          )}

          {/* COMPARISON MODAL */}
          {isCompareModalOpen && comparisonData && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
                  <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                          <div>
                              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                  <Scale className="h-6 w-6 text-blue-600"/> Comparativo Direto
                              </h3>
                              <p className="text-sm text-slate-500">Analise Head-to-Head de Performance</p>
                          </div>
                          <button onClick={() => setIsCompareModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-6 w-6"/></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {comparisonData.items.map(item => {
                                  const isWinner = item.key === comparisonData.bestCpk.key;
                                  const isLifeWinner = item.key === comparisonData.bestLife.key;
                                  const savings = ((item.avgRealCpk - comparisonData.bestCpk.avgRealCpk) * 100000); // Economia vs Melhor em 100k km

                                  return (
                                      <div key={item.key} className={`relative p-6 rounded-3xl border-2 transition-all ${isWinner ? 'bg-white dark:bg-slate-900 border-green-500 shadow-xl scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-90'}`}>
                                          {isWinner && (
                                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                                                  <Crown className="h-3 w-3"/> Melhor Opcao
                                              </div>
                                          )}
                                          
                                          <div className="text-center mb-6">
                                              <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase">{item.brand}</h4>
                                              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.model}</p>
                                          </div>

                                          <div className="space-y-4">
                                              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                  <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">CPK Real</p>
                                                  <p className={`text-2xl font-black text-center ${isWinner ? 'text-green-600 dark:text-green-400' : 'text-slate-800 dark:text-white'}`}>
                                                      R$ {item.avgRealCpk.toFixed(5)}
                                                  </p>
                                              </div>

                                              <div className="grid grid-cols-2 gap-3">
                                                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vida Util</p>
                                                      <p className={`text-sm font-black ${isLifeWinner ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                                          {Math.round(item.avgProjectedLife / 1000)}k km
                                                      </p>
                                                  </div>
                                                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                                                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Preco Medio</p>
                                                      <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                                          {money(item.avgPurchasePrice)}
                                                      </p>
                                                  </div>
                                              </div>

                                              {!isWinner && (
                                                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                                                      <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                                                          <TrendingDown className="h-3 w-3"/> Custo Extra
                                                      </p>
                                                      <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                                                          Este pneu custa <strong>{money(savings)}</strong> a mais que o lider a cada 100.000 km rodados.
                                                      </p>
                                                  </div>
                                              )}
                                              
                                              {isWinner && (
                                                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/50">
                                                      <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1 mb-1">
                                                          <CheckCircle2 className="h-3 w-3"/> Eficiencia Maxima
                                                      </p>
                                                      <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                                                          A melhor relacao custo-beneficio baseada no historico da sua frota.
                                                      </p>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          )}
        </>
      )}
    </div>
  );
};
