import React, { useMemo, useState, useCallback } from 'react';
import { Vehicle, FuelEntry, Driver, Branch, FuelStation } from '../types';
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
  onDeleteStation
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STATIONS'>('DASHBOARD');
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (vehicleEntries.length > 0) return vehicleEntries[0].odometer;
    return vehicles.find(v => v.id === newEntry.vehicleId)?.odometer || 0;
  }, [newEntry.vehicleId, allFuelEntries, vehicles]);

  const currentKmPerLiter = useMemo(() => {
    if (!newEntry.liters || !newEntry.odometer || !lastOdometer) return 0;
    const kmDiff = Number(newEntry.odometer) - lastOdometer;
    return kmDiff > 0 ? kmDiff / Number(newEntry.liters) : 0;
  }, [newEntry.liters, newEntry.odometer, lastOdometer]);

  const fuelEntries = useMemo(() => {
    let filtered = allFuelEntries;
    
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
          const sDate = new Date(startDate);
          filtered = filtered.filter(e => new Date(e.date) >= sDate);
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(e => new Date(e.date) <= eDate);
        }
      } else {
        filtered = filtered.filter(e => new Date(e.date) >= filterDate);
      }
    }

    if (filterVehicleId !== 'ALL') {
      filtered = filtered.filter(e => e.vehicleId === filterVehicleId);
    }
    if (historySearchTerm) {
      const lowerSearch = historySearchTerm.toLowerCase();
      filtered = filtered.filter(e => e.vehiclePlate.toLowerCase().includes(lowerSearch));
    }
    return filtered;
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
      totalKm += (sorted[sorted.length - 1].odometer - sorted[0].odometer);
      totalLitersForAvg += sorted.slice(1).reduce((acc, e) => acc + e.liters, 0);
    });

    return {
      totalCost,
      totalLiters,
      globalAvg: totalLitersForAvg > 0 ? (totalKm / totalLitersForAvg) : 0,
      count: fuelEntries.length
    };
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
          totalKm += (sorted[sorted.length - 1].odometer - sorted[0].odometer);
          totalLiters += sorted.slice(1).reduce((acc, e) => acc + e.liters, 0);
        }
        totalSpent += entries.reduce((acc, e) => acc + e.totalCost, 0);
      });

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
  }, [newEntry, vehicles, drivers, fuelStations, defaultBranchId, onAddEntry]);

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
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

              <ModelAveragesList 
                averages={showAllModels ? filteredModelAverages : filteredModelAverages.slice(0, 6)} 
                onSelectModel={handleSelectModel} 
              />
              
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

            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
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

              <RecentEntriesList 
                entries={showAllHistory ? fuelEntries : fuelEntries.slice(0, 15)} 
                allFuelEntries={allFuelEntries} 
                branches={branches} 
                onDeleteEntry={onDeleteEntry} 
              />

              {fuelEntries.length > 15 && (
                <div className="flex justify-center pt-4">
                  <button 
                    onClick={() => setShowAllHistory(!showAllHistory)}
                    className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-all"
                  >
                    {showAllHistory ? 'VER MENOS' : `VER MAIS (${fuelEntries.length - 15})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
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
