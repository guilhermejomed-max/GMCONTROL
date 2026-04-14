import React, { useMemo } from 'react';
import { Tire, RetreadOrder, TireStatus } from '../types';
import { Trophy, AlertTriangle, TrendingDown, ShieldAlert, CheckCircle2, XCircle, DollarSign, Activity } from 'lucide-react';

interface RetreaderRankingProps {
  tires: Tire[];
  retreadOrders: RetreadOrder[];
  branches?: any[];
  defaultBranchId?: string;
}

export const RetreaderRanking: React.FC<RetreaderRankingProps> = ({ 
  tires: allTires, 
  retreadOrders: allRetreadOrders, 
  branches = [],
  defaultBranchId 
}) => {
  const tires = useMemo(() => {
    // Pneus agora são universais
    return allTires;
  }, [allTires]);

  const retreadOrders = useMemo(() => {
    return defaultBranchId ? allRetreadOrders.filter(ro => ro.branchId === defaultBranchId) : allRetreadOrders;
  }, [allRetreadOrders, defaultBranchId]);
  const rankingData = useMemo(() => {
    // 1. Get unique retreaders from orders
    const retreaders = Array.from(new Set(retreadOrders.map(o => o.retreaderName).filter(Boolean)));

    const data = retreaders.map(name => {
      let approved = 0;
      let rejected = 0;
      let totalCpk = 0;
      let cpkCount = 0;
      let prematureFailures = 0;

      // Analyze tire histories to find approvals and rejections for this retreader
      tires.forEach(tire => {
        let retreadedByThis = false;
        
        tire.history?.forEach(log => {
          if (log.action === 'RETORNO_RECAPAGEM' && log.details.includes(`Retorno ${name}`)) {
            approved++;
            retreadedByThis = true;
          }
          if (log.action === 'DESCARTE' && log.details.includes(`Recusado na recapagem (${name})`)) {
            rejected++;
          }
        });

        // If the tire was retreaded by this retreader (at least once)
        if (retreadedByThis) {
            // Calculate CPK
            if (tire.totalKms > 0 && tire.totalInvestment > 0) {
                totalCpk += (tire.totalInvestment / tire.totalKms);
                cpkCount++;
            }

            // Check for premature failure (currently damaged or discarded)
            // We consider it a failure if it's damaged and the last retreader was this one
            if (tire.status === TireStatus.DAMAGED && tire.retreader === name) {
                prematureFailures++;
            }
        }
      });

      const totalProcessed = approved + rejected;
      const rejectionRate = totalProcessed > 0 ? (rejected / totalProcessed) * 100 : 0;
      const averageCpk = cpkCount > 0 ? totalCpk / cpkCount : 0;
      const failureRate = approved > 0 ? (prematureFailures / approved) * 100 : 0;

      return {
        name,
        totalProcessed,
        approved,
        rejected,
        rejectionRate,
        averageCpk,
        prematureFailures,
        failureRate
      };
    });

    // Sort by a combined score or just CPK (lower is better)
    // We'll sort by CPK ascending, then rejection rate ascending
    return data.sort((a, b) => {
        if (a.averageCpk === 0) return 1;
        if (b.averageCpk === 0) return -1;
        return a.averageCpk - b.averageCpk;
    });
  }, [tires, retreadOrders]);

  if (rankingData.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">Nenhum dado de recapadora disponível</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Conclua ordens de recapagem para gerar o ranking.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Trophy className="h-7 w-7 text-amber-500" /> Auditoria e SLA de Recapadoras
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ranking de fornecedores baseado em performance, custo por KM e índice de falhas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Performer Card */}
          {rankingData[0] && rankingData[0].averageCpk > 0 && (
              <div className="lg:col-span-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-1 shadow-xl shadow-amber-500/20">
                  <div className="bg-white dark:bg-slate-900 rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 h-full">
                      <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-slate-900 shadow-lg">
                          <Trophy className="h-10 w-10 text-amber-500" />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">
                              1º Lugar Geral
                          </div>
                          <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-2">{rankingData[0].name}</h3>
                          <p className="text-slate-500 dark:text-slate-400">Melhor fornecedor atual com base no menor Custo por KM (CPK) entregue.</p>
                      </div>
                      <div className="flex gap-6 w-full md:w-auto justify-center md:justify-end">
                          <div className="text-center">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CPK Médio</p>
                              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">R$ {rankingData[0].averageCpk.toFixed(4)}</p>
                          </div>
                          <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
                          <div className="text-center">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Falhas</p>
                              <p className="text-2xl font-black text-slate-800 dark:text-white">{rankingData[0].failureRate.toFixed(1)}%</p>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Ranking List */}
          <div className="lg:col-span-3 space-y-4">
              {rankingData.map((retreader, index) => (
                  <div key={retreader.name} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-6">
                      
                      <div className="flex items-center gap-4 w-full md:w-1/4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${
                              index === 0 ? 'bg-amber-100 text-amber-600' : 
                              index === 1 ? 'bg-slate-100 text-slate-600' : 
                              index === 2 ? 'bg-orange-100 text-orange-600' : 
                              'bg-slate-50 text-slate-400 dark:bg-slate-800'
                          }`}>
                              #{index + 1}
                          </div>
                          <div>
                              <h4 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{retreader.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{retreader.totalProcessed} pneus processados</p>
                          </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                          {/* CPK */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  <DollarSign className="h-3.5 w-3.5" /> CPK Médio
                              </div>
                              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                  {retreader.averageCpk > 0 ? `R$ ${retreader.averageCpk.toFixed(4)}` : 'N/A'}
                              </div>
                          </div>

                          {/* Rejection Rate */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  <XCircle className="h-3.5 w-3.5" /> Taxa de Recusa
                              </div>
                              <div className={`text-lg font-black ${retreader.rejectionRate > 15 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                  {retreader.rejectionRate.toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{retreader.rejected} carcaças perdidas</div>
                          </div>

                          {/* Failure Rate */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  <ShieldAlert className="h-3.5 w-3.5" /> Falha Prematura
                              </div>
                              <div className={`text-lg font-black ${retreader.failureRate > 5 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                  {retreader.failureRate.toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{retreader.prematureFailures} descolamentos/danos</div>
                          </div>

                          {/* Approval Rate */}
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovados
                              </div>
                              <div className="text-lg font-black text-slate-800 dark:text-white">
                                  {retreader.approved}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">pneus retornaram</div>
                          </div>
                      </div>

                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};
