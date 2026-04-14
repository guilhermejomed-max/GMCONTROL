import React, { useMemo, useState } from 'react';
import { Tire, RetreadOrder } from '../types';
import { Leaf, Droplet, Wind, Recycle, Award, Printer, Calendar, TrendingUp } from 'lucide-react';

interface EsgPanelProps {
  tires: Tire[];
  retreadOrders: RetreadOrder[];
  branches?: any[];
  defaultBranchId?: string;
}

export const EsgPanel: React.FC<EsgPanelProps> = ({ 
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
  const [period, setPeriod] = useState<'ALL' | 'YTD'>('ALL');

  const stats = useMemo(() => {
    let totalRetreads = 0;
    
    if (period === 'ALL') {
        // Count from all concluded retread orders
        const concluded = retreadOrders.filter(o => o.status === 'CONCLUIDO');
        totalRetreads = concluded.reduce((sum, order) => sum + order.tireIds.length, 0);
        
        // Fallback to tire retreadCount if orders are empty (legacy data)
        if (totalRetreads === 0) {
            totalRetreads = tires.reduce((sum, t) => sum + (t.retreadCount || 0), 0);
        }
    } else {
        // YTD
        const currentYear = new Date().getFullYear();
        const concludedThisYear = retreadOrders.filter(o => 
            o.status === 'CONCLUIDO' && 
            o.returnedDate && 
            new Date(o.returnedDate).getFullYear() === currentYear
        );
        totalRetreads = concludedThisYear.reduce((sum, order) => sum + order.tireIds.length, 0);
    }

    // Metrics based on industry standards
    // 1 retread saves ~57 liters of oil
    // 1 retread saves ~68 kg of CO2 emissions
    // 1 retread = 1 carcass saved from landfill
    const oilSaved = totalRetreads * 57;
    const co2Reduced = totalRetreads * 68;
    const carcassesSaved = totalRetreads;

    return {
        totalRetreads,
        oilSaved,
        co2Reduced,
        carcassesSaved
    };
  }, [tires, retreadOrders, period]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Leaf className="h-7 w-7 text-emerald-500" /> Painel ESG & Sustentabilidade
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Transforme a eficiência da sua gestão de pneus em métricas ambientais reais.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
               <button onClick={() => setPeriod('YTD')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'YTD' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Este Ano</button>
               <button onClick={() => setPeriod('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Histórico Total</button>
           </div>
           <button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
               <Printer className="h-4 w-4" /> Imprimir Relatório
           </button>
        </div>
      </div>

      {/* PRINTABLE CERTIFICATE AREA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden print:shadow-none print:border-none print:bg-transparent">
          
          {/* Certificate Header */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 md:p-12 text-center relative overflow-hidden print:bg-emerald-700 print:text-white print:p-8">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <Leaf className="absolute -top-10 -left-10 h-64 w-64 rotate-45" />
                  <Leaf className="absolute -bottom-20 -right-10 h-80 w-80 -rotate-12" />
              </div>
              <div className="relative z-10">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-white/30">
                      <Award className="h-10 w-10 text-white" />
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Certificado de Sustentabilidade</h1>
                  <p className="text-emerald-100 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                      Reconhecimento pelo compromisso com a redução do impacto ambiental através da gestão eficiente e economia circular de pneus.
                  </p>
                  <div className="mt-8 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-6 py-2 rounded-full text-emerald-50 font-bold border border-white/10">
                      <Calendar className="h-4 w-4" />
                      Período: {period === 'YTD' ? `Ano de ${new Date().getFullYear()}` : 'Histórico Completo'}
                  </div>
              </div>
          </div>

          {/* Metrics Grid */}
          <div className="p-8 md:p-12">
              <div className="text-center mb-12">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Impacto Ambiental Evitado</h3>
                  <p className="text-slate-500 dark:text-slate-400">Resultados gerados pela política de recapagem e extensão da vida útil dos pneus.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                  {/* Oil */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                          <Droplet className="h-32 w-32 text-emerald-600" />
                      </div>
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
                          <Droplet className="h-8 w-8" />
                      </div>
                      <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-2 relative z-10 truncate">
                          {stats.oilSaved.toLocaleString('pt-BR')} <span className="text-lg text-slate-400 font-bold">L</span>
                      </h4>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest relative z-10">Petróleo Economizado</p>
                      <p className="text-xs text-slate-400 mt-4 relative z-10">Litros de petróleo que deixaram de ser extraídos para a fabricação de pneus novos.</p>
                  </div>

                  {/* CO2 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:border-blue-200 transition-colors">
                      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                          <Wind className="h-32 w-32 text-blue-600" />
                      </div>
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
                          <Wind className="h-8 w-8" />
                      </div>
                      <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-2 relative z-10 truncate">
                          {(stats.co2Reduced / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-lg text-slate-400 font-bold">Ton</span>
                      </h4>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest relative z-10">CO₂ Reduzido</p>
                      <p className="text-xs text-slate-400 mt-4 relative z-10">Toneladas de Dióxido de Carbono que deixaram de ser emitidas na atmosfera.</p>
                  </div>

                  {/* Carcasses */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:border-purple-200 transition-colors">
                      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                          <Recycle className="h-32 w-32 text-purple-600" />
                      </div>
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
                          <Recycle className="h-8 w-8" />
                      </div>
                      <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-2 relative z-10 truncate">
                          {stats.carcassesSaved.toLocaleString('pt-BR')} <span className="text-lg text-slate-400 font-bold">un</span>
                      </h4>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest relative z-10">Carcaças Salvas</p>
                      <p className="text-xs text-slate-400 mt-4 relative z-10">Pneus que foram reaproveitados e não foram descartados em aterros sanitários.</p>
                  </div>
              </div>

              {/* Summary Statement */}
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 md:p-8 flex items-start gap-6">
                  <div className="p-4 bg-emerald-100 dark:bg-emerald-900/50 rounded-full text-emerald-600 shrink-0">
                      <TrendingUp className="h-8 w-8" />
                  </div>
                  <div>
                      <h4 className="text-lg font-black text-emerald-800 dark:text-emerald-400 mb-2">O Poder da Economia Circular</h4>
                      <p className="text-emerald-700 dark:text-emerald-500/80 leading-relaxed">
                          Ao optar pela recapagem de <strong>{stats.totalRetreads} pneus</strong>, esta operação demonstrou um compromisso real com as práticas <strong>ESG (Environmental, Social, and Governance)</strong>. 
                          A fabricação de um pneu novo consome em média 83 litros de petróleo, enquanto a recapagem consome apenas 26 litros. 
                          Esta diferença de 57 litros por pneu, multiplicada pela eficiência da frota, resulta em um impacto ambiental massivamente positivo, 
                          alinhando a empresa às exigências globais de sustentabilidade e redução da pegada de carbono.
                      </p>
                  </div>
              </div>

              {/* Footer Signatures */}
              <div className="mt-20 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-center">
                      <div className="w-48 h-px bg-slate-300 dark:bg-slate-700 mb-2 mx-auto"></div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Diretoria de Operações</p>
                  </div>
                  <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                          <Leaf className="h-5 w-5 text-emerald-500" />
                          <span className="font-black text-slate-800 dark:text-white">GM Control Pro</span>
                      </div>
                      <p className="text-xs text-slate-400">Sistema de Gestão Sustentável de Frotas</p>
                  </div>
                  <div className="text-center">
                      <div className="w-48 h-px bg-slate-300 dark:bg-slate-700 mb-2 mx-auto"></div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Gestão Ambiental / ESG</p>
                  </div>
              </div>

          </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            body * {
                visibility: hidden;
            }
            .print\\:hidden {
                display: none !important;
            }
            .animate-in {
                animation: none !important;
            }
            .bg-white {
                background-color: transparent !important;
            }
            .shadow-xl {
                box-shadow: none !important;
            }
            .border {
                border: none !important;
            }
            .bg-gradient-to-br {
                background: #047857 !important; /* emerald-700 */
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-slate-50 {
                background-color: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-emerald-50 {
                background-color: #ecfdf5 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-emerald-800 {
                color: #065f46 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-emerald-700 {
                color: #047857 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-emerald-600 {
                color: #059669 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-blue-600 {
                color: #2563eb !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-purple-600 {
                color: #9333ea !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-white {
                color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-emerald-100 {
                background-color: #d1fae5 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-blue-100 {
                background-color: #dbeafe !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-purple-100 {
                background-color: #f3e8ff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-black\\/20 {
                background-color: rgba(0,0,0,0.2) !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .bg-white\\/20 {
                background-color: rgba(255,255,255,0.2) !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-emerald-100 {
                color: #d1fae5 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .text-emerald-50 {
                color: #ecfdf5 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .border-white\\/30 {
                border-color: rgba(255,255,255,0.3) !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .border-white\\/10 {
                border-color: rgba(255,255,255,0.1) !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            /* The main container to print */
            .print\\:shadow-none {
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .print\\:shadow-none * {
                visibility: visible;
            }
        }
      `}} />
    </div>
  );
};
