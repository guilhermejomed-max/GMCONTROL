import React from 'react';
import { Fuel, X, Truck, Calendar, Droplets, DollarSign, User, Store, MapPin, TrendingUp } from 'lucide-react';
import { Vehicle, Driver, FuelStation, FuelEntry } from '../types';

interface FuelEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newEntry: Partial<FuelEntry>;
  setNewEntry: React.Dispatch<React.SetStateAction<Partial<FuelEntry>>>;
  vehicles: Vehicle[];
  drivers: Driver[];
  fuelStations: FuelStation[];
  lastOdometer: number;
  currentKmPerLiter: number;
}

export const FuelEntryModal: React.FC<FuelEntryModalProps> = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  newEntry,
  setNewEntry,
  vehicles,
  drivers,
  fuelStations,
  lastOdometer,
  currentKmPerLiter
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <Fuel className="h-6 w-6 text-blue-600" /> Novo Abastecimento
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">
              Registre o consumo e custo do veículo
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Veículo (Cavalo)</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                  value={newEntry.vehicleId}
                  onChange={e => setNewEntry(prev => ({ ...prev, vehicleId: e.target.value }))}
                  required
                >
                  <option value="">Selecione um veículo</option>
                  {vehicles.filter(v => v.type === 'CAVALO').map(v => (
                    <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="date" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  value={newEntry.date}
                  onChange={e => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo de Combustível</label>
              <div className="relative">
                <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                  value={newEntry.fuelType}
                  onChange={e => setNewEntry(prev => ({ ...prev, fuelType: e.target.value }))}
                  required
                >
                  <option value="DIESEL S10">DIESEL S10</option>
                  <option value="DIESEL S500">DIESEL S500</option>
                  <option value="ARLA 32">ARLA 32</option>
                  {newEntry.fuelType && !['DIESEL S10', 'DIESEL S500', 'ARLA 32'].includes(newEntry.fuelType) && (
                    <option value={newEntry.fuelType}>{newEntry.fuelType}</option>
                  )}
                  <option value="OUTRO">OUTRO...</option>
                </select>
              </div>
              {newEntry.fuelType === 'OUTRO' && (
                <input 
                  type="text"
                  className="mt-2 w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white uppercase"
                  placeholder="DIGITE O TIPO DE COMBUSTÍVEL"
                  onChange={e => setNewEntry(prev => ({ ...prev, fuelType: e.target.value.toUpperCase() }))}
                  autoFocus
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Quantidade (Litros)</label>
              <div className="relative">
                <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.00"
                  value={newEntry.liters || ''}
                  onChange={e => setNewEntry(prev => ({ ...prev, liters: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Preço Unitário (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="number" 
                  step="0.001"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.000"
                  value={newEntry.unitPrice || ''}
                  onChange={e => setNewEntry(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Odômetro Atual (KM)</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="number" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0"
                  value={newEntry.odometer || ''}
                  onChange={e => setNewEntry(prev => ({ ...prev, odometer: Number(e.target.value) }))}
                  required
                />
              </div>
              {lastOdometer > 0 && (
                <p className="text-[9px] font-bold text-slate-400 mt-1 ml-1">Último registro: {lastOdometer.toLocaleString()} KM</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Litrômetro (Consumo Total)</label>
              <div className="relative">
                <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="0.00"
                  value={newEntry.litrometro || ''}
                  onChange={e => setNewEntry(prev => ({ ...prev, litrometro: Number(e.target.value) }))}
                />
              </div>
              {newEntry.vehicleId && vehicles.find(v => v.id === newEntry.vehicleId)?.totalFuelConsumed && (
                <p className="text-[9px] font-bold text-slate-400 mt-1 ml-1">
                  Atual na Sascar: {vehicles.find(v => v.id === newEntry.vehicleId)?.totalFuelConsumed?.toLocaleString()} L
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Motorista</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                  value={newEntry.driverId || ''}
                  onChange={e => setNewEntry(prev => ({ ...prev, driverId: e.target.value }))}
                >
                  <option value="">Selecione um motorista (Opcional)</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CNPJ do Posto (Opcional)</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="00.000.000/0000-00"
                  value={newEntry.stationCnpj || ''}
                  onChange={e => {
                    const cnpj = e.target.value;
                    const station = fuelStations.find(s => s.cnpj === cnpj);
                    setNewEntry(prev => ({ 
                      ...prev, 
                      stationCnpj: cnpj,
                      stationName: station ? station.name : prev.stationName
                    }));
                  }}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nome do Posto</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  placeholder="Nome do Posto"
                  value={newEntry.stationName || ''}
                  onChange={e => setNewEntry(prev => ({ ...prev, stationName: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {currentKmPerLiter > 0 && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-800 dark:text-orange-300 uppercase tracking-wider">Média Estimada</p>
                  <p className="text-lg font-black text-orange-600">{currentKmPerLiter.toFixed(2)} KM/L</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-orange-400">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((newEntry.liters || 0) * (newEntry.unitPrice || 0))}</p>
              </div>
            </div>
          )}

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
              SALVAR ABASTECIMENTO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
