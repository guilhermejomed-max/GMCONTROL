import React from 'react';
import { Store, Edit2, Trash2, MapPin } from 'lucide-react';
import { FuelStation } from '../types';

interface FuelStationListProps {
  stations: FuelStation[];
  onEdit: (station: FuelStation) => void;
  onDelete: (id: string) => void;
  onAddFirst: () => void;
}

export const FuelStationList: React.FC<FuelStationListProps> = React.memo(({ 
  stations, 
  onEdit, 
  onDelete, 
  onAddFirst 
}) => {
  if (stations.length === 0) {
    return (
      <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-800 text-center">
        <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-black text-slate-800 dark:text-white">Nenhum posto cadastrado</h3>
        <p className="text-slate-500 text-sm mt-2">Cadastre postos para vincular automaticamente aos abastecimentos pelo CNPJ.</p>
        <button 
          onClick={onAddFirst}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-sm transition-all"
        >
          CADASTRAR PRIMEIRO POSTO
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stations.map(station => (
        <div key={station.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onEdit(station)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => onDelete(station.id)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight mb-1">{station.name}</h3>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-4">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">CNPJ: {station.cnpj}</span>
          </div>
          {(station.address || station.city) && (
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{station.address}{station.city ? `, ${station.city}` : ''}{station.state ? ` - ${station.state}` : ''}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
