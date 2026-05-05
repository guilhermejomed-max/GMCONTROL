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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
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
import { calculateFuelEfficiency, getFuelVolume } from '../lib/fuelUtils';
import { isImplausibleImportedOdometer } from '../lib/odometerUtils';

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
  fuelCategory?: 'LIQUID' | 'GAS'; // Added
}

export const FuelDashboard: React.FC<Props> = ({
  vehicles,
  fuelEntries: allFuelEntriesRaw,
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
  hasMore,
  fuelCategory = 'LIQUID' // Default
}) => {
  const unit = fuelCategory === 'GAS' ? 'm³' : 'L';
  const unitKm = fuelCategory === 'GAS' ? 'KM/m³' : 'KM/L';

  const allFuelEntries = useMemo(() => {
    return allFuelEntriesRaw.filter(e => {
      const fuelT = String(e.fuelType || '').toUpperCase();
      const isGasFuel = e.category === 'GAS' || 
                        fuelT.includes('GNV') || 
                        fuelT.includes('GAS') || 
                        fuelT === 'GAS' ||
                        fuelT.includes('GAS ') ||
                        (e.kg && e.kg > 0);
      
      if (fuelCategory === 'GAS') return isGasFuel;
      return !isGasFuel;
    });
  }, [allFuelEntriesRaw, fuelCategory]);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [currentModelPage, setCurrentModelPage] = useState(1);
  const ENTRIES_PER_PAGE = 12;
  const MODELS_PER_PAGE = 12;

  // Form states
  const [newStation, setNewStation] = useState<Partial<FuelStation>>({
    name: '', cnpj: '', address: '', city: '', state: '', fuelTypes: []
  });

  const [newEntry, setNewEntry] = useState<Partial<FuelEntry>>({
    date: new Date().toISOString().split('T')[0],
    fuelType: fuelCategory === 'GAS' ? 'GNV' : 'DIESEL S10',
    liters: 0,
    unitPrice: 0,
    odometer: 0
  });

  // Optimized Calculations
  const lastOdometer = useMemo(() => {
    if (!newEntry.vehicleId) return 0;
    const vehicleEntries = allFuelEntries
      .filter(e => e.vehicleId === newEntry.vehicleId)
      .sort((a, b) => {
        const dateA = new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime();
        const dateB = new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.odometer - a.odometer;
      });
    
    if (vehicleEntries.length > 0) return vehicleEntries[0].odometer;
    return vehicles.find(v => v.id === newEntry.vehicleId)?.odometer || 0;
  }, [newEntry.vehicleId, allFuelEntries, vehicles]);

  useEffect(() => {
    if (newEntry.vehicleId) {
      const vehicle = vehicles.find(v => v.id === newEntry.vehicleId);
      if (vehicle) {
        setNewEntry(prev => ({ 
          ...prev, 
          fuelType: vehicle.fuelType || prev.fuelType
        }));
      }
    }
  }, [newEntry.vehicleId, vehicles]);

  const currentKmPerLiter = useMemo(() => {
    if (!newEntry.odometer || !lastOdometer) return 0;
    const kmDiff = Number(newEntry.odometer) - lastOdometer;
    if (kmDiff <= 0) return 0;

    // For GAS, we might use liters (m3) or kg
    const volume = fuelCategory === 'GAS' ? (Number(newEntry.liters) || Number(newEntry.kg) || 0) : Number(newEntry.liters);
    if (!volume) return 0;
    return kmDiff / volume;
  }, [newEntry.liters, newEntry.kg, newEntry.odometer, lastOdometer, fuelCategory]);

  const fuelEntries = useMemo(() => {
    let filtered = allFuelEntries;
    
    // Reset page when filters change
    // Note: This check is done in useEffect below
    
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
    return [...filtered].sort((a, b) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime());
  }, [allFuelEntries, filterVehicleId, historySearchTerm, periodFilter, startDate, endDate]);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
    return fuelEntries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);
  }, [fuelEntries, currentPage]);

  const totalPages = Math.ceil(fuelEntries.length / ENTRIES_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
    setCurrentModelPage(1);
  }, [filterVehicleId, historySearchTerm, periodFilter, startDate, endDate, fuelCategory]);

  useEffect(() => {
    setCurrentPage(page => Math.min(Math.max(page, 1), Math.max(totalPages, 1)));
  }, [totalPages]);

  const stats = useMemo(() => {
    let totalCost = 0;
    let totalLiters = 0;
    const vehicleGroups: Record<string, FuelEntry[]> = {};

    fuelEntries.forEach(entry => {
      const volume = getFuelVolume(entry);
      totalCost += Number(entry.totalCost) || (volume * (Number(entry.unitPrice) || 0));
      totalLiters += volume;
      if (!vehicleGroups[entry.vehicleId]) vehicleGroups[entry.vehicleId] = [];
      vehicleGroups[entry.vehicleId].push(entry);
    });

    const efficiency = Object.values(vehicleGroups).reduce(
      (acc, entries) => {
        const result = calculateFuelEfficiency(entries);
        acc.totalKm += result.totalKm;
        acc.consumedVolume += result.consumedVolume;
        return acc;
      },
      { totalKm: 0, consumedVolume: 0 }
    );

    return {
      totalCost,
      totalLiters,
      globalAvg: efficiency.consumedVolume > 0 ? efficiency.totalKm / efficiency.consumedVolume : 0,
      count: fuelEntries.length
    };
  }, [fuelEntries]);

  const stationAverages = useMemo(() => {
    const stationGroups: Record<string, { stationName: string; entries: FuelEntry[] }> = {};
    const normalizeStationKey = (value?: string) =>
      String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    
    fuelEntries.forEach(e => {
      const stationCnpj = String(e.stationCnpj || '').replace(/\D/g, '');
      const stationByCnpj = stationCnpj
        ? fuelStations.find(s => s.cnpj.replace(/\D/g, '') === stationCnpj)
        : undefined;
      const stationName = (stationByCnpj?.name || e.stationName || (stationCnpj ? `CNPJ ${stationCnpj}` : 'Nao Identificado')).trim();
      const stationKey = stationCnpj || normalizeStationKey(stationName);
      
      if (!stationGroups[stationKey]) {
        stationGroups[stationKey] = { stationName, entries: [] };
      }
      stationGroups[stationKey].entries.push(e);
    });

    return Object.entries(stationGroups)
      .map(([, data]) => {
      let totalSpent = 0;
      let totalVolume = 0;
      
      data.entries.forEach(e => {
        const volume = getFuelVolume(e);
        totalSpent += Number(e.totalCost) || (volume * (Number(e.unitPrice) || 0));
        totalVolume += volume;
      });
      
      const avgPrice = totalVolume > 0 ? (totalSpent / totalVolume) : 0;
      
      const getEfficiencyForEntry = (entry: FuelEntry) => {
        const volume = getFuelVolume(entry);
        
        const vehicleEntries = allFuelEntries
          .filter(e => e.vehicleId === entry.vehicleId)
          .sort((a, b) => {
            const dateA = new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime();
            const dateB = new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.odometer - b.odometer;
          });
        
        const index = vehicleEntries.findIndex(e => e.id === entry.id);
        if (index > 0) {
            const prev = vehicleEntries[index - 1];
            const kmDiff = entry.odometer - prev.odometer;
            
            if (kmDiff > 0 && volume > 0) return kmDiff / volume;
        }
        return 0;
      };

      const entriesWithEfficiency = data.entries.map(getEfficiencyForEntry).filter(e => e > 0);
      const avgEfficiency = entriesWithEfficiency.length > 0 
        ? entriesWithEfficiency.reduce((acc, e) => acc + e, 0) / entriesWithEfficiency.length
        : 0;

      return {
        stationName: data.stationName,
        avgPrice,
        avgEfficiency,
        totalSpent,
        totalVolume,
        entriesCount: data.entries.length
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [fuelEntries, fuelStations, allFuelEntries]);

  const modelAverages = useMemo(() => {
    const modelGroups: Record<string, { vehicleIds: Set<string>, entries: FuelEntry[] }> = {};
    
    fuelEntries.forEach(e => {
      const vehicle = vehicles.find(v => v.id === e.vehicleId);
      const modelName = vehicle?.model || 'Nao Identificado';
      
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
        const sorted = [...entries].sort((a, b) => {
          const dateA = new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime();
          const dateB = new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return a.odometer - b.odometer;
        });
        if (sorted.length >= 2) {
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const kmDiff = last.odometer - first.odometer;
          
          if (kmDiff > 0) {
            totalKm += kmDiff;
            totalLiters += sorted.slice(1).reduce((acc, e) => {
              const isGasE = e.category === 'GAS' || 
                             String(e.fuelType || '').toUpperCase().includes('GNV') || 
                             String(e.fuelType || '').toUpperCase().includes('GAS') ||
                             (Number(e.kg) > 0);
              const volume = isGasE ? (Number(e.liters) || Number(e.kg) || 0) : (Number(e.liters) || 0);
              return acc + volume;
            }, 0);
          }
        }
      });
      
      totalSpent = data.entries.reduce((acc, e) => acc + (Number(e.totalCost) || 0), 0);

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

  const paginatedModelAverages = useMemo(() => {
    const startIndex = (currentModelPage - 1) * MODELS_PER_PAGE;
    return filteredModelAverages.slice(startIndex, startIndex + MODELS_PER_PAGE);
  }, [filteredModelAverages, currentModelPage]);

  const totalModelPages = Math.ceil(filteredModelAverages.length / MODELS_PER_PAGE);

  useEffect(() => {
    setCurrentModelPage(page => Math.min(Math.max(page, 1), Math.max(totalModelPages, 1)));
  }, [totalModelPages]);

  // Handlers
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const finalLiters = Number(newEntry.liters) || (fuelCategory === 'GAS' ? Number(newEntry.kg || 0) : 0);
    if (!newEntry.vehicleId || finalLiters <= 0 || !newEntry.unitPrice || !newEntry.odometer) return;

    const vehicle = vehicles.find(v => v.id === newEntry.vehicleId);
    const driver = drivers.find(d => d.id === newEntry.driverId);
    const entryOdometer = Number(newEntry.odometer);
    const latestVehicleEntry = [...allFuelEntriesRaw]
      .filter(entry => entry.vehicleId === newEntry.vehicleId)
      .sort((a, b) => Number(b.odometer || 0) - Number(a.odometer || 0))[0];

    if (isImplausibleImportedOdometer(entryOdometer)) {
      alert(`KM invalido para abastecimento: ${entryOdometer.toLocaleString('pt-BR')} km.`);
      return;
    }

    if (latestVehicleEntry && entryOdometer <= Number(latestVehicleEntry.odometer || 0)) {
      alert(`KM regressivo no abastecimento.\n\nUltimo KM registrado: ${Number(latestVehicleEntry.odometer || 0).toLocaleString('pt-BR')} km\nKM informado: ${entryOdometer.toLocaleString('pt-BR')} km`);
      return;
    }

    if (vehicle?.odometer && entryOdometer < vehicle.odometer && vehicle.odometer - entryOdometer > 1000) {
      const proceed = confirm(`O KM informado esta ${Number(vehicle.odometer - entryOdometer).toLocaleString('pt-BR')} km abaixo do hodometro atual do veiculo.\n\nDeseja registrar mesmo assim?`);
      if (!proceed) return;
    }
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
      odometer: entryOdometer,
      liters: finalLiters,
      kg: newEntry.kg ? Number(newEntry.kg) : undefined,
      unitPrice: Number(newEntry.unitPrice),
      totalCost: finalLiters * Number(newEntry.unitPrice),
      fuelType: newEntry.fuelType || (fuelCategory === 'GAS' ? 'GNV' : 'DIESEL S10'),
      category: fuelCategory,
      stationName: stationName,
      stationCnpj: newEntry.stationCnpj,
      driverId: newEntry.driverId,
      driverName: driver?.name || '',
      branchId: defaultBranchId || vehicle?.branchId,
      kmPerLiter: currentKmPerLiter,
      notes: newEntry.notes
    };

    await onAddEntry(entry);
    setShowAddModal(false);
    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      fuelType: fuelCategory === 'GAS' ? 'GNV' : 'DIESEL S10',
      liters: 0,
      kg: 0,
      unitPrice: 0,
      odometer: 0
    });
  }, [newEntry, vehicles, drivers, fuelStations, defaultBranchId, onAddEntry, currentKmPerLiter, fuelCategory, allFuelEntriesRaw]);

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
        fuelTypes: newStation.fuelTypes,
        branchId: defaultBranchId,
        createdAt: new Date().toISOString()
      };
      await onAddStation(station);
    }

    setShowStationModal(false);
    setEditingStation(null);
    setNewStation({ name: '', cnpj: '', address: '', city: '', state: '', fuelTypes: [] });
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
            Controle de Abastecimento {fuelCategory === 'GAS' ? 'a GAS' : ''}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 text-sm">
            Gestao de consumo, medias de {unitKm} e custos de combustivel.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3 rounded-lg font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload className="h-5 w-5" /> IMPORTAR
          </button>
          <button 
            onClick={() => {
              if (activeTab === 'DASHBOARD') {
                setShowAddModal(true);
              } else {
                setEditingStation(null);
                setNewStation({ name: '', cnpj: '', address: '', city: '', state: '', fuelTypes: [] });
                setShowStationModal(true);
              }
            }}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" /> {activeTab === 'DASHBOARD' ? 'NOVO ABASTECIMENTO' : 'CADASTRAR POSTO'}
          </button>
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
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
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-slate-100 dark:border-slate-800">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <select 
                className="text-xs font-black bg-transparent border-none outline-none dark:text-white cursor-pointer"
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value as any)}
              >
                <option value="ALL">Todo Periodo</option>
                <option value="30D">Ultimos 30 Dias</option>
                <option value="60D">Ultimos 60 Dias</option>
                <option value="90D">Ultimos 90 Dias</option>
                <option value="1Y">Ultimo Ano</option>
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
                <span className="text-slate-300">ate</span>
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
          <FuelStatsCards stats={stats} unit={unit} unitKm={unitKm} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            <div className="md:col-span-2 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
                <div className="relative w-full sm:flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar veiculo..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Medias por Modelo ({unitKm})</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <ModelAveragesList 
                  averages={paginatedModelAverages} 
                  onSelectModel={handleSelectModel} 
                  unitKm={unitKm}
                />
              </div>
              
              {totalModelPages > 1 && (
                <div className="flex justify-center items-center gap-2 py-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setCurrentModelPage(p => Math.max(1, p - 1))}
                    disabled={currentModelPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] font-black text-slate-500">{currentModelPage} / {totalModelPages}</span>
                  <button
                    onClick={() => setCurrentModelPage(p => Math.min(totalModelPages, p + 1))}
                    disabled={currentModelPage === totalModelPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 disabled:opacity-30"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 pl-4 pt-[10px] pr-4 pb-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4 text-purple-500" /> Historico Recente
                  </h3>
                  <select 
                    className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 outline-none dark:text-white"
                    value={filterVehicleId}
                    onChange={e => setFilterVehicleId(e.target.value)}
                  >
                    <option value="ALL">Todos Veiculos</option>
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

              <div className="flex-1">
                <RecentEntriesList 
                  entries={paginatedEntries} 
                  allFuelEntries={allFuelEntries} 
                  branches={branches} 
                  onDeleteEntry={onDeleteEntry} 
                  unit={unit}
                  unitKm={unitKm}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'COMPARATIVO' ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Comparativo de Postos</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {stationAverages.length} postos analisados pelos abastecimentos importados.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-[10px] font-black uppercase w-fit">
              {fuelEntries.length} registros
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationAverages.map(s => (
              <div key={s.stationName} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="font-black text-slate-800 dark:text-white leading-tight">{s.stationName}</h3>
                  <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-black text-slate-500 shrink-0">
                    {s.entriesCount} reg.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Preco medio</p>
                    <p className="font-black text-slate-800 dark:text-white">R$ {s.avgPrice.toFixed(2)}/{unit}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Media</p>
                    <p className="font-black text-slate-800 dark:text-white">{s.avgEfficiency.toFixed(2)} {unitKm}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Total gasto</p>
                    <p className="font-black text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Volume</p>
                    <p className="font-black text-slate-800 dark:text-white">{s.totalVolume.toLocaleString('pt-BR')} {unit}</p>
                  </div>
                </div>
              </div>
            ))}
            {stationAverages.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Fuel className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold">Nenhum posto encontrado neste filtro.</p>
              </div>
            )}
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
            setNewStation({ name: '', cnpj: '', address: '', city: '', state: '', fuelTypes: [] });
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
        unit={unit === 'm³' ? 'm³' : 'Litros'}
        unitKm={unitKm}
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
          unit={unit}
          unitKm={unitKm}
        />
      )}

      {showImportModal && (
        <FuelImportModal 
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          vehicles={vehicles}
          branches={branches}
          fuelStations={fuelStations}
          fuelCategory={fuelCategory}
        />
      )}
    </div>
  );
};
