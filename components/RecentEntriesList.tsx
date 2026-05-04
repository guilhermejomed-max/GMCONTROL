import React from 'react';
import { Truck, MapPin, User, Trash2, Fuel, ChevronLeft, ChevronRight } from 'lucide-react';
import { FuelEntry, Branch } from '../types';
import { calculateEntryEfficiency } from '../lib/fuelUtils';

interface RecentEntriesListProps {
  entries: FuelEntry[];
  allFuelEntries: FuelEntry[];
  branches: Branch[];
  onDeleteEntry: (id: string) => void;
  unit?: string;
  unitKm?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const RecentEntriesList: React.FC<RecentEntriesListProps> = React.memo(({ 
  entries, 
  allFuelEntries, 
  branches, 
  onDeleteEntry,
  unit = 'L',
  unitKm = 'KM/L',
  currentPage,
  totalPages,
  onPageChange
}) => {
  return (
    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar w-full h-full min-h-[400px]">
      {entries.map((entry) => {
        const entryAvg = calculateEntryEfficiency(entry, allFuelEntries);

        return (
          <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm group relative overflow-hidden hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Truck className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase leading-none">{entry.vehiclePlate}</p>
                    {entry.branchId && (
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black rounded uppercase">
                        {branches.find(b => b.id === entry.branchId)?.name || 'Filial N/A'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{entry.liters.toLocaleString()}{unit} • {entry.fuelType}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">{new Date(entry.date + (entry.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}</p>
                {entryAvg > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black rounded-full border bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800">
                    {entryAvg.toFixed(2)} {unitKm}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-end pt-2 border-t border-slate-50 dark:border-slate-800/50">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" /> {entry.stationName || 'Posto não inf.'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" /> {entry.driverName || 'Motorista não inf.'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.totalCost)}
                </p>
                <div className="flex flex-col items-end">
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider">{entry.odometer.toLocaleString()} KM</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onDeleteEntry(entry.id)}
              className="absolute top-2 right-2 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"
              title="Excluir abastecimento"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      {entries.length === 0 && (
        <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Fuel className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-medium">Nenhum registro encontrado.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-6 border-t border-slate-100 dark:border-slate-800 mt-4">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-[10px] font-black"
          >
            <ChevronLeft className="h-3 w-3" /> Anterior
          </button>
          
          <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, and pages around current
                if (totalPages <= 7) return true;
                return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
              })
              .map((page, idx, arr) => {
                const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold">...</span>
                    )}
                    <button
                      onClick={() => onPageChange(page)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all shrink-0 ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-[10px] font-black"
          >
            Proxima <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
});
