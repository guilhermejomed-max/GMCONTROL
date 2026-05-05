import React from 'react';
import { Truck, ChevronRight } from 'lucide-react';
import { Vehicle } from '../types';

interface ModelAverage {
  modelName: string;
  avg: number;
  totalSpent: number;
  vehicleCount: number;
  entriesCount: number;
  vehicles: Vehicle[];
}

interface ModelAveragesListProps {
  averages: ModelAverage[];
  onSelectModel: (model: ModelAverage) => void;
  unitKm?: string;
}

export const ModelAveragesList: React.FC<ModelAveragesListProps> = React.memo(({ averages, onSelectModel, unitKm = 'KM/L' }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {averages.map((m) => (
        <div 
          key={m.modelName} 
          onClick={() => onSelectModel(m)}
          className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all group cursor-pointer active:scale-[0.98] flex flex-col h-full"
        >
          <div className="flex justify-between items-start mb-4 flex-grow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <Truck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white leading-none mb-1">{m.modelName}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{m.vehicleCount} Veiculos • {m.entriesCount} Abastecimentos</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black ${
              m.avg > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
            }`}>
              {m.avg > 0 ? `${m.avg.toFixed(2)} ${unitKm}` : 'S/ MEDIA'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Gasto</p>
              <p className="text-sm font-black text-slate-800 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.totalSpent)}
              </p>
            </div>
            <div className="flex justify-end items-end">
              <span className="text-[10px] font-black text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                VER DETALHES <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
