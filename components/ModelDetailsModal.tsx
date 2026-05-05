import React from 'react';
import { BarChart3, Zap, Truck, History } from 'lucide-react';
import { Vehicle, FuelEntry, Branch } from '../types';

interface ModelDetailsModalProps {
  data: {
    modelName: string;
    avg: number;
    totalSpent: number;
    vehicleCount: number;
    vehicles: Vehicle[];
    entries: FuelEntry[];
  };
  branches: Branch[];
  onClose: () => void;
  unit?: string;
  unitKm?: string;
}

export const ModelDetailsModal: React.FC<ModelDetailsModalProps> = React.memo(({ data, branches, onClose, unit = 'L', unitKm = 'km/l' }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-blue-600" /> Detalhes: {data.modelName}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">
              Analise de desempenho por frota de modelo
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <Zap className="h-5 w-5 text-slate-400 rotate-45" />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          {/* Model Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Media do Modelo</p>
              <p className="text-2xl font-black text-orange-600">
                {data.avg > 0 ? `${data.avg.toFixed(2)} ${unitKm}` : 'N/A'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Investido</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalSpent)}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Veiculos Ativos</p>
              <p className="text-2xl font-black text-blue-600">{data.vehicleCount}</p>
            </div>
          </div>

          {/* Vehicles in this model */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-400" /> Veiculos do Modelo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.vehicles.map((v: Vehicle) => {
                const vEntries = data.entries.filter((e: FuelEntry) => e.vehicleId === v.id);
                const sorted = [...vEntries].sort((a, b) => a.odometer - b.odometer);
                let vAvg = 0;

                if (sorted.length >= 2) {
                  const kmDiff = sorted[sorted.length - 1].odometer - sorted[0].odometer;
                  const litersSum = sorted.slice(1).reduce((acc: number, e: FuelEntry) => acc + e.liters, 0);
                  vAvg = litersSum > 0 ? (kmDiff / litersSum) : 0;
                }

                return (
                  <div key={v.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-black text-slate-800 dark:text-white">{v.plate}</p>
                      <div className="flex flex-col items-end gap-1">
                        {vAvg > 0 ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200" title="Media do Periodo">
                            {vAvg.toFixed(2)} {unitKm}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
                            S/ media
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2">
                      <span>{vEntries.length} Abastecimentos</span>
                      <span>{v.odometer?.toLocaleString()} km</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Entries for this model */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" /> Ultimos Abastecimentos do Modelo
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Data</th>
                    <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Placa</th>
                    <th className="py-3 text-[10px] font-black text-slate-400 uppercase">{unit === 'm³' ? 'm³' : 'Litros'}</th>
                    <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Total</th>
                    <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Posto</th>
                    <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Filial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {data.entries.slice(0, 10).sort((a: any, b: any) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime()).map((e: FuelEntry) => (
                    <tr key={e.id} className="text-xs">
                      <td className="py-3 font-bold text-slate-600 dark:text-slate-400">{new Date(e.date + (e.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 font-black text-slate-800 dark:text-white">{e.vehiclePlate}</td>
                      <td className="py-3 font-bold text-slate-600 dark:text-slate-400">{e.liters.toLocaleString()}{unit}</td>
                      <td className="py-3 font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.totalCost)}</td>
                      <td className="py-3 font-medium text-slate-500 truncate max-w-[150px]">{e.stationName}</td>
                      <td className="py-3 font-medium text-slate-500">{branches.find(b => b.id === e.branchId)?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl text-sm font-black transition-all active:scale-95"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
});
