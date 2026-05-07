import React from 'react';
import { Truck, Trash2, Fuel, ChevronLeft, ChevronRight } from 'lucide-react';
import { FuelEntry, Branch } from '../types';
import { calculateEntryEfficiency, getFuelVolume } from '../lib/fuelUtils';

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
    <div className="space-y-1.5 flex-1 pr-1 w-full">
      {entries.map((entry) => {
        const entryAvg = calculateEntryEfficiency(entry, allFuelEntries);
        const volume = getFuelVolume(entry);

        return (
          <div key={entry.id} className="bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm group relative overflow-hidden hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded-md shrink-0">
                  <Truck className="h-2.5 w-2.5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase leading-none">{entry.vehiclePlate}</p>
                    {entry.branchId && (
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black rounded uppercase">
                        {branches.find(b => b.id === entry.branchId)?.name || 'Filial N/A'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 dark:text-white mt-0.5">{volume.toLocaleString()}{unit} - {entry.fuelType}</p>
                  <p className="text-[8px] text-slate-500 font-medium truncate mt-0.5">
                    {entry.stationName || 'Posto nao inf.'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">{new Date(entry.date + (entry.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}</p>
                {entryAvg > 0 && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[8px] font-black rounded-full border bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800">
                    {entryAvg.toFixed(2)} {unitKm}
                  </span>
                )}
                <p className="text-xs font-black text-emerald-600 mt-0.5">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.totalCost)}
                </p>
                <p className="text-[8px] text-slate-400 font-bold tracking-wider">{entry.odometer.toLocaleString()} KM</p>
              </div>
            </div>
            <button 
              onClick={() => onDeleteEntry(entry.id)}
              className="absolute top-1.5 right-1.5 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md"
              title="Excluir abastecimento"
            >
              <Trash2 className="h-2.5 w-2.5" />
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
        <div className="flex justify-center items-center gap-1.5 py-3 border-t border-slate-100 dark:border-slate-800 mt-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-[9px] font-black"
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
                      <span className="w-7 h-7 flex items-center justify-center text-slate-400 text-xs font-bold">...</span>
                    )}
                    <button
                      onClick={() => onPageChange(page)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-all shrink-0 ${
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
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 text-[9px] font-black"
          >
            Proxima <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
});
