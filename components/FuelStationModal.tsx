import React from 'react';
import { Store, X, MapPin, Droplets } from 'lucide-react';
import { FuelStation } from '../types';

const COMMON_FUEL_TYPES = ['DIESEL S10', 'DIESEL S500', 'ARLA 32', 'GNV', 'GASOLINA', 'ETANOL'];

interface FuelStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newStation: Partial<FuelStation>;
  setNewStation: React.Dispatch<React.SetStateAction<Partial<FuelStation>>>;
  editingStation: FuelStation | null;
}

export const FuelStationModal: React.FC<FuelStationModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  newStation,
  setNewStation,
  editingStation
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Store className="h-6 w-6 text-blue-600" />
              {editingStation ? 'Editar Posto' : 'Cadastrar Novo Posto'}
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-1">Vincule abastecimentos automaticamente pelo CNPJ.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome do Posto</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Ex: Posto Shell Matriz"
                value={newStation.name}
                onChange={e => setNewStation(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CNPJ</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="00.000.000/0000-00"
                value={newStation.cnpj}
                onChange={e => setNewStation(prev => ({ ...prev, cnpj: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cidade</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Ex: Sao Paulo"
                value={newStation.city}
                onChange={e => setNewStation(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Endereco</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                placeholder="Rua, Numero, Bairro"
                value={newStation.address}
                onChange={e => setNewStation(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            
            <div className="sm:col-span-2 space-y-3">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Tipos de Combustivel Disponiveis</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMMON_FUEL_TYPES.map(fuelType => {
                  const isSelected = newStation.fuelTypes?.includes(fuelType);
                  return (
                    <label 
                      key={fuelType}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={() => {
                          const currentTypes = newStation.fuelTypes || [];
                          const updatedTypes = isSelected 
                            ? currentTypes.filter(t => t !== fuelType)
                            : [...currentTypes, fuelType];
                          setNewStation(prev => ({ ...prev, fuelTypes: updatedTypes }));
                        }}
                      />
                      <Droplets className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                      <span className="text-[11px] font-black whitespace-nowrap">{fuelType}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              CANCELAR
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all"
            >
              {editingStation ? 'SALVAR ALTERACOES' : 'CADASTRAR POSTO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
