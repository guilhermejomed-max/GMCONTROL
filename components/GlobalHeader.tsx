
import React, { useState, useMemo, FC } from 'react';
import { Tire, Vehicle } from '../types';
import { Search, X, Truck, Disc } from 'lucide-react';

interface SearchResult {
  id: string;
  kind: 'tire' | 'vehicle';
  title: string;
  subtitle: string;
  icon: any;
}

interface GlobalHeaderProps {
  tires: Tire[];
  vehicles: Vehicle[];
  onResultClick: (type: 'tire' | 'vehicle', id: string) => void;
}

export const GlobalHeader: FC<GlobalHeaderProps> = ({ tires, vehicles, onResultClick }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    const lowerQuery = query.toLowerCase();
    
    const tireResults: SearchResult[] = tires
      .filter(t => 
        t.fireNumber.toLowerCase().includes(lowerQuery) ||
        t.brand.toLowerCase().includes(lowerQuery) ||
        t.model.toLowerCase().includes(lowerQuery)
      )
      .map(t => {
        const res: SearchResult = { 
          id: t.id,
          kind: 'tire',
          title: t.fireNumber,
          subtitle: `${t.brand} ${t.model}`,
          icon: Disc
        };
        return res;
      })
      .slice(0, 4);

    const vehicleResults: SearchResult[] = vehicles
      .filter(v => v.plate.toLowerCase().includes(lowerQuery))
      .map(v => {
        const res: SearchResult = { 
          id: v.id,
          kind: 'vehicle',
          title: v.plate,
          subtitle: v.model,
          icon: Truck
        };
        return res;
      })
      .slice(0, 3);
      
    return [...vehicleResults, ...tireResults];
  }, [query, tires, vehicles]);

  const handleResultClick = (kind: 'tire' | 'vehicle', id: string) => {
    onResultClick(kind, id);
    setQuery('');
    setIsFocused(false);
  };

  return (
    <div className="relative w-full max-w-2xl hidden md:block transition-all duration-300" onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 200)}>
      <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Busca Global (Placa, Fogo, Marca...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isFocused && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 z-50">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {searchResults.map(item => {
              const Icon = item.icon;
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    onClick={() => handleResultClick(item.kind, item.id)}
                    className="w-full text-left p-4 hover:bg-blue-50 dark:hover:bg-slate-800/50 flex items-center gap-4 transition-colors group"
                  >
                    <div className={`p-2.5 rounded-xl transition-colors ${item.kind === 'vehicle' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-white">{item.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
