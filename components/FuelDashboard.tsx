import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Vehicle, FuelEntry, Driver, Branch, FuelStation, FuelType } from '../types';
import { 
  Fuel, 
  Search, 
  Plus, 
  BarChart3,
  Store,
  Upload,
  History as HistoryIcon,
  Calendar as CalendarIcon
} from 'lucide-react';

// Optimized Sub-components
import { FuelStatsCards } from './FuelStatsCards';
import { ModelAveragesList } from './ModelAveragesList';
import { RecentEntriesList } from './RecentEntriesList';
import { FuelStationList } from './FuelStationList';
import { FuelEntryModal } from './FuelEntryModal';
import { FuelStationModal } from './FuelStationModal';
import { ModelDetailsModal } from './ModelDetailsModal';
import { FuelImportModal } from './FuelImportModal';

interface Props {
  vehicles: Vehicle[];
  fuelEntries: FuelEntry[];
  fuelStations: FuelStation[];
  drivers: Driver[];
  branches: Branch[];
  defaultBranchId?: string;
  onAddEntry: (entry: FuelEntry) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onAddStation: (station: FuelStation) => Promise<void>;
  onUpdateStation: (id: string, data: Partial<FuelStation>) => Promise<void>;
  onDeleteStation: (id: string) => Promise<void>;
  fuelTypes: FuelType[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const FuelDashboard: React.FC<Props> = ({
  vehicles,
  fuelEntries: allFuelEntries,
  fuelStations,
  drivers,
  branches,
  defaultBranchId,
  onAddEntry,
  onDeleteEntry,
  onAddStation,
  onUpdateStation,
  onDeleteStation,
  fuelTypes,
  onLoadMore,
  hasMore
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STATIONS' | 'COMPARATIVO'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<FuelStation | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [selectedModelData, setSelectedModelData] = useState<any>(null);
  const [filterVehicleId, setFilterVehicleId] = useState<string>('ALL');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [showAllModels, setShowAllModels] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'ALL' | '30D' | '60D' | '90D' | '1Y' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form states
  const [newStation, setNewStation] = useState<Partial<FuelStation>>({
    name: '', cnpj: '', address: '', city: '', state: ''
  });

  const [newEntry, setNewEntry] = useState<Partial<FuelEntry>>({
    date: new Date().toISOString().split('T')[0],
    fuelType: 'DIESEL S10',
    liters: 0,
    unitPrice: 0,
    odometer: 0
  });

  // Optimized Calculations
  const lastOdometer = useMemo(() => {
    if (!newEntry.vehicleId) return 0;
    const vehicleEntries = allFuelEntries
      .filter(e => e.vehicleId === newEntry.vehicleId)
      .sort((a, b) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime());
    
    if (vehicleEntries.length > 0) return vehicleEntries[0].odometer;
    return vehicles.find(v => v.id === newEntry.vehicleId)?.odometer || 0;
  }, [newEntry.vehicleId, allFuelEntries, vehicles]);

  useEffect(() => {
    if (newEntry.vehicleId) {
      const vehicle = vehicles.find(v => v.id === newEntry.vehicleId);
      if (vehicle?.fuelType) {
        setNewEntry(prev => ({ ...prev, fuelType: vehicle.fuelType }));
      }
    }
  }, [newEntry.vehicleId, vehicles]);

  const currentKmPerLiter = useMemo(() => {
    if (!newEntry.odometer || !lastOdometer) return 0;
    const kmDiff = Number(newEntry.odometer) - lastOdometer;
    if (kmDiff <= 0) return 0;

    // Use pumped liters
    if (!newEntry.liters) return 0;
    return kmDiff / Number(newEntry.liters);
  }, [newEntry.liters, newEntry.odometer, lastOdometer]);

  const fuelEntries = useMemo(() => {
    let filtered = allFuelEntries;
    
    // Branch Filter
    if (defaultBranchId) {
      filtered = filtered.filter(e => e.branchId === defaultBranchId);
    }
    
    // Period Filter
    if (periodFilter !== 'ALL') {
      const now = new Date();
      let filterDate = new Date();
      
      if (periodFilter === '30D') filterDate.setDate(now.getDate() - 30);
      else if (periodFilter === '60D') filterDate.setDate(now.getDate() - 60);
      else if (periodFilter === '90D') filterDate.setDate(now.getDate() - 90);
      else if (periodFilter === '1Y') filterDate.setFullYear(now.getFullYear() - 1);
      
      if (periodFilter === 'CUSTOM') {
        if (startDate) {
          const sDate = new Date(startDate + 'T12:00:00');
          filtered = filtered.filter(e => new Date(e.date + (e.date.includes('T') ? '' : 'T12:00:00')) >= sDate);
        }
        if (endDate) {
          const eDate = new Date(endDate + (endDate.includes('T') ? '' : 'T12:00:00'));
          eDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(e => new Date(e.date + (e.date.includes('T') ? '' : 'T12:00:00')) <= eDate);
        }
      } else {
        filtered = filtered.filter(e => new Date(e.date + (e.date.includes('T') ? '' : 'T12:00:00')) >= filterDate);
      }
    }

    if (filterVehicleId !== 'ALL') {
      filtered = filtered.filter(e => e.vehicleId === filterVehicleId);
    }
    if (historySearchTerm) {
      const lowerSearch = historySearchTerm.toLowerCase();
      filtered = filtered.filter(e => e.vehiclePlate.toLowerCase().includes(lowerSearch));
    }
    return filtered.sort((a, b) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime());
  }, [allFuelEntries, filterVehicleId, historySearchTerm, periodFilter, startDate, endDate]);

  const stats = useMemo(() => {
    let totalCost = 0;
    let totalLiters = 0;
    const vehicleGroups: Record<string, FuelEntry[]> = {};

    fuelEntries.forEach(e => {
      totalCost += (e.totalCost || 0);
      totalLiters += (e.liters || 0);
      if (!vehicleGroups[e.vehicleId]) vehicleGroups[e.vehicleId] = [];
      vehicleGroups[e.vehicleId].push(e);
    });

    let totalKm = 0;
    let totalLitersForAvg = 0;

    Object.values(vehicleGroups).forEach(entries => {
      if (entries.length < 2) return;
      const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
      
      const firstEntry = sorted[0];
      const lastEntry = sorted[sorted.length - 1];
      
      const kmDiff = lastEntry.odometer - firstEntry.odometer;
      
      totalKm += kmDiff;
      totalLitersForAvg += sorted.slice(1).reduce((acc, e) => acc + e.liters, 0);
    });

    return {
      totalCost,
      totalLiters,
      globalAvg: totalLitersForAvg > 0 ? (totalKm / totalLitersForAvg) : 0,
      count: fuelEntries.length
    };
  }, [fuelEntries]);

  const stationAverages = useMemo(() => {
    const stationGroups: Record<string, { entries: FuelEntry[] }> = {};
    
    fuelEntries.forEach(e => {
      const stationName = e.stationName || 'Não Identificado';
      
      if (!stationGroups[stationName]) {
        stationGroups[stationName] = { entries: [] };
      }
      stationGroups[stationName].entries.push(e);
    });

    return Object.entries(stationGroups)
      .filter(([stationName]) => fuelStations.some(s => s.name === stationName))
      .map(([stationName, data]) => {
      let totalSpent = 0;
      let totalLiters = 0;
      
      data.entries.forEach(e => {
        totalSpent += e.totalCost;
        totalLiters += e.liters;
      });
      
      const avgPrice = totalLiters > 0 ? (totalSpent / totalLiters) : 0;
      
      const getEfficiencyForEntry = (entry: FuelEntry) => {
        const liters = Number(entry.liters);
        
        const vehicleEntries = allFuelEntries
          .filter(e => e.vehicleId === entry.vehicleId)
          .sort((a, b) => new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).valueOf() - new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).valueOf());
        
        const index = vehicleEntries.findIndex(e => e.id === entry.id);
        if (index > 0) {
            const prev = vehicleEntries[index - 1];
            const kmDiff = entry.odometer - prev.odometer;
            
            // Use pumped liters
            if (kmDiff > 0 && liters > 0) return kmDiff / liters;
        }
        return 0;
      };

      const entriesWithEfficiency = data.entries.map(getEfficiencyForEntry).filter(e => e > 0);
      const avgEfficiency = entriesWithEfficiency.length > 0 
        ? entriesWithEfficiency.reduce((acc, e) => acc + e, 0) / entriesWithEfficiency.length
        : 0;

      return {
        stationName,
        avgPrice,
        avgEfficiency,
        entriesCount: data.entries.length
      };
    }).sort((a, b) => a.avgPrice - b.avgPrice);
  }, [fuelEntries]);

  const modelAverages = useMemo(() => {
    const modelGroups: Record<string, { vehicleIds: Set<string>, entries: FuelEntry[] }> = {};
    
    fuelEntries.forEach(e => {
      const vehicle = vehicles.find(v => v.id === e.vehicleId);
      const modelName = vehicle?.model || 'Não Identificado';
      
      if (!modelGroups[modelName]) {
        modelGroups[modelName] = { vehicleIds: new Set(), entries: [] };
      }
      modelGroups[modelName].vehicleIds.add(e.vehicleId);
      modelGroups[modelName].entries.push(e);
    });

    return Object.entries(modelGroups).map(([modelName, data]) => {
      const vehicleEntries: Record<string, FuelEntry[]> = {};
      data.entries.forEach(e => {
        if (!vehicleEntries[e.vehicleId]) vehicleEntries[e.vehicleId] = [];
        vehicleEntries[e.vehicleId].push(e);
      });

      let totalKm = 0;
      let totalLiters = 0;
      let totalSpent = 0;

      Object.values(vehicleEntries).forEach(entries => {
        const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
        if (sorted.length >= 2) {
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const kmDiff = last.odometer - first.odometer;
          
          totalKm += kmDiff;
          totalLiters += sorted.slice(1).reduce((acc, e) => acc + e.liters, 0);
        }
      });
      
      totalSpent = data.entries.reduce((acc, e) => acc + e.totalCost, 0);

      return {
        modelName,
        avg: totalLiters > 0 ? (totalKm / totalLiters) : 0,
        totalSpent,
        vehicleCount: data.vehicleIds.size,
        entriesCount: data.entries.length,
        vehicles: Array.from(data.vehicleIds).map(id => vehicles.find(v => v.id === id)).filter(Boolean) as Vehicle[],
        entries: data.entries
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [fuelEntries, vehicles]);

  const filteredModelAverages = useMemo(() => {
    if (!searchTerm) return modelAverages;
    const lowerSearch = searchTerm.toLowerCase();
    return modelAverages.filter(m => m.modelName.toLowerCase().includes(lowerSearch));
  }, [modelAverages, searchTerm]);

  // Handlers
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.vehicleId || !newEntry.liters || !newEntry.unitPrice || !newEntry.odometer) return;

    const vehicle = vehicles.find(v => v.id === newEntry.vehicleId);
    const driver = drivers.find(d => d.id === newEntry.driverId);
    let stationName = newEntry.stationName;
    
    if (newEntry.stationCnpj) {
      const station = fuelStations.find(s => s.cnpj === newEntry.stationCnpj);
      if (station) stationName = station.name;
    }

    const entry: FuelEntry = {
      id: Date.now().toString(),
      vehicleId: newEntry.vehicleId,
      vehiclePlate: vehicle?.plate || '',
      date: newEntry.date || new Date().toISOString().split('T')[0],
      odometer: Number(newEntry.odometer),
      liters: Number(newEntry.liters),
      unitPrice: Number(newEntry.unitPrice),
      totalCost: Number(newEntry.liters) * Number(newEntry.unitPrice),
      fuelType: newEntry.fuelType || 'DIESEL S10',
      stationName: stationName,
      stationCnpj: newEntry.stationCnpj,
      driverId: newEntry.driverId,
      driverName: driver?.name || '',
      branchId: defaultBranchId || vehicle?.branchId,
      kmPerLiter: currentKmPerLiter,
      litrometro: newEntry.litrometro ? Number(newEntry.litrometro) : undefined,
      notes: newEntry.notes
    };

    await onAddEntry(entry);
    setShowAddModal(false);
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      fuelType: 'DIESEL S10',
      liters: 0,
      unitPrice: 0,
      odometer: 0
    });
  }, [newEntry, vehicles, drivers, fuelStations, defaultBranchId, onAddEntry, currentKmPerLiter]);

  const handleStationSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.name || !newStation.cnpj) return;

    if (editingStation) {
      await onUpdateStation(editingStation.id, newStation);
    } else {
      const station: FuelStation = {
        id: Date.now().toString(),
        name: newStation.name!,
        cnpj: newStation.cnpj!,
        address: newStation.address,
        city: newStation.city,
        state: newStation.state,
        branchId: defaultBranchId,
        createdAt: new Date().toISOString()
      };
      await onAddStation(station);
    }

    setShowStationModal(false);
    setEditingStation(null);
    setNewStation({ name: '', cnpj: '', address: '', city: '', state: '' });
  }, [newStation, editingStation, defaultBranchId, onUpdateStation, onAddStation]);

  const handleImport = useCallback(async (entries: FuelEntry[]) => {
    for (const entry of entries) {
      await onAddEntry(entry);
    }
    setShowImportModal(false);
  }, [onAddEntry]);

  const handleSelectModel = useCallback((model: any) => {
    setSelectedModelData(model);
    setShowModelModal(true);
  }, []);

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Fuel className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            Controle de Abastecimento
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-sm">
            Gestão de consumo, médias de KM/L e custos de combustível.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload className="h-5 w-5" /> IMPORTAR
          </button>
          <button 
            onClick={() => {
              if (activeTab === 'DASHBOARD') {
                setShowAddModal(true);
              } else {
                setEditingStation(null);
                setNewStation({ name: '', cnpj: '', address: '', city: '', state: '' });
                setShowStationModal(true);
              }
            }}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" /> {activeTab === 'DASHBOARD' ? 'NOVO ABASTECIMENTO' : 'CADASTRAR POSTO'}
          </button>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'DASHBOARD'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> DASHBOARD
          </button>
          <button
            onClick={() => setActiveTab('STATIONS')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'STATIONS'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Store className="h-4 w-4" /> POSTOS DE ABASTECIMENTO
          </button>
          <button
            onClick={() => setActiveTab('COMPARATIVO')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'COMPARATIVO'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> COMPARATIVO
          </button>
        </div>

        {activeTab === 'DASHBOARD' && (
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-slate-100 dark:border-slate-800">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <select 
                className="text-xs font-black bg-transparent border-none outline-none dark:text-white cursor-pointer"
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value as any)}
              >
                <option value="ALL">Todo Período</option>
                <option value="30D">Últimos 30 Dias</option>
                <option value="60D">Últimos 60 Dias</option>
                <option value="90D">Últimos 90 Dias</option>
                <option value="1Y">Último Ano</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>

            {periodFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                <input 
                  type="date" 
                  className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 outline-none dark:text-white"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-slate-300">até</span>
                <input 
                  type="date" 
                  className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 outline-none dark:text-white"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'DASHBOARD' ? (
        <>
          <FuelStatsCards stats={stats} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
                <div className="relative w-full sm:flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar veículo..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Médias por Modelo</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar lg:max-h-[500px] pr-2">
                <ModelAveragesList 
                  averages={showAllModels ? filteredModelAverages : filteredModelAverages.slice(0, 6)} 
                  onSelectModel={handleSelectModel} 
                />
              </div>
              
              {filteredModelAverages.length > 6 && (
                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => setShowAllModels(!showAllModels)}
                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-all"
                  >
                    {showAllModels ? 'VER MENOS' : `VER MAIS (${filteredModelAverages.length - 6})`}
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 pl-4 pt-[10px] pr-4 pb-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4 text-purple-500" /> Histórico Recente
                  </h3>
                  <select 
                    className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 outline-none dark:text-white"
                    value={filterVehicleId}
                    onChange={e => setFilterVehicleId(e.target.value)}
                  >
                    <option value="ALL">Todos Veículos</option>
                    {vehicles.filter(v => v.type === 'CAVALO').map(v => (
                      <option key={v.id} value={v.id}>{v.plate}</option>
                    ))}
                  </select>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar por placa..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    value={historySearchTerm}
                    onChange={e => setHistorySearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 lg:max-h-[500px]">
                <RecentEntriesList 
                  entries={fuelEntries} 
                  allFuelEntries={allFuelEntries} 
                  branches={branches} 
                  onDeleteEntry={onDeleteEntry} 
                />
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4 mt-auto">
                  <button 
                    onClick={onLoadMore}
                    className="px-10 py-4 bg-white dark:bg-slate-900 border-2 border-blue-600 text-blue-600 dark:text-blue-400 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <HistoryIcon className="h-5 w-5" />
                    CARREGAR MAIS ABASTECIMENTOS
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === 'COMPARATIVO' ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-6">Comparativo de Postos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationAverages.map(s => (
              <div key={s.stationName} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">{s.stationName}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <p>Preço Médio: R$ {s.avgPrice.toFixed(2)}/L</p>
                  <p>Eficiência Média: {s.avgEfficiency.toFixed(2)} km/L</p>
                  <p>Abastecimentos: {s.entriesCount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <FuelStationList 
          stations={fuelStations} 
          onEdit={(station) => {
            setEditingStation(station);
            setNewStation(station);
            setShowStationModal(true);
          }} 
          onDelete={onDeleteStation}
          onAddFirst={() => {
            setEditingStation(null);
            setNewStation({ name: '', cnpj: '', address: '', city: '', state: '' });
            setShowStationModal(true);
          }}
        />
      )}

      {/* MODALS */}
      <FuelEntryModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmit}
        newEntry={newEntry}
        setNewEntry={setNewEntry}
        vehicles={vehicles}
        drivers={drivers}
        fuelStations={fuelStations}
        lastOdometer={lastOdometer}
        currentKmPerLiter={currentKmPerLiter}
      />

      <FuelStationModal 
        isOpen={showStationModal}
        onClose={() => setShowStationModal(false)}
        onSubmit={handleStationSubmit}
        newStation={newStation}
        setNewStation={setNewStation}
        editingStation={editingStation}
      />

      {showModelModal && selectedModelData && (
        <ModelDetailsModal 
          data={selectedModelData} 
          branches={branches} 
          onClose={() => setShowModelModal(false)} 
        />
      )}

      {showImportModal && (
        <FuelImportModal 
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          vehicles={vehicles}
          branches={branches}
          fuelStations={fuelStations}
        />
      )}
    </div>
  );
};
