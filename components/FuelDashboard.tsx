import React, { useMemo, useState } from 'react';
import { Vehicle, FuelEntry, Driver, Branch, FuelStation } from '../types';
import { 
  Fuel, 
  Search, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Droplets, 
  Calendar, 
  Truck, 
  User, 
  MapPin, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  ChevronRight,
  History,
  BarChart3,
  Wallet,
  Zap,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Loader2,
  FileUp,
  Store,
  Trash2,
  Edit2,
  X as CloseIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

  // Station Form State
  const [newStation, setNewStation] = useState<Partial<FuelStation>>({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: ''
  });

  // Form state
  const [newEntry, setNewEntry] = useState<Partial<FuelEntry>>({
    date: new Date().toISOString().split('T')[0],
    fuelType: 'DIESEL S10',
    liters: 0,
    unitPrice: 0,
    odometer: 0
  });

  const lastOdometer = useMemo(() => {
    if (!newEntry.vehicleId) return 0;
    const vehicleEntries = allFuelEntries
      .filter(e => e.vehicleId === newEntry.vehicleId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (vehicleEntries.length > 0) {
      return vehicleEntries[0].odometer;
    }
    
    const vehicle = vehicles.find(v => v.id === newEntry.vehicleId);
    return vehicle?.odometer || 0;
  }, [newEntry.vehicleId, allFuelEntries, vehicles]);

  const currentKmPerLiter = useMemo(() => {
    if (!newEntry.liters || !newEntry.odometer || !lastOdometer) return 0;
    const kmDiff = Number(newEntry.odometer) - lastOdometer;
    if (kmDiff <= 0) return 0;
    return kmDiff / Number(newEntry.liters);
  }, [newEntry.liters, newEntry.odometer, lastOdometer]);

  const fuelEntries = useMemo(() => {
    let filtered = allFuelEntries;
    
    if (filterVehicleId !== 'ALL') {
      filtered = filtered.filter(e => e.vehicleId === filterVehicleId);
    }

    return filtered;
  }, [allFuelEntries, filterVehicleId]);

  const stats = useMemo(() => {
    const totalCost = fuelEntries.reduce((acc, e) => acc + (e.totalCost || 0), 0);
    const totalLiters = fuelEntries.reduce((acc, e) => acc + (e.liters || 0), 0);
    
    // Calculate global average
    // To calculate km/l correctly, we need to group by vehicle and find the km diff
    const vehicleGroups: Record<string, FuelEntry[]> = {};
    fuelEntries.forEach(e => {
      if (!vehicleGroups[e.vehicleId]) vehicleGroups[e.vehicleId] = [];
      vehicleGroups[e.vehicleId].push(e);
    });

    let totalKm = 0;
    let totalLitersForAvg = 0;

    Object.values(vehicleGroups).forEach(entries => {
      if (entries.length < 2) return;
      const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
      const kmDiff = sorted[sorted.length - 1].odometer - sorted[0].odometer;
      // We sum liters from all but the first entry (assuming full tank to full tank)
      // Or just sum all liters and divide by km diff? 
      // Standard way: (Last Odo - First Odo) / (Sum of liters starting from second entry)
      const litersSum = sorted.slice(1).reduce((acc, e) => acc + e.liters, 0);
      if (litersSum > 0) {
        totalKm += kmDiff;
        totalLitersForAvg += litersSum;
      }
    });

    const globalAvg = totalLitersForAvg > 0 ? (totalKm / totalLitersForAvg) : 0;

    return {
      totalCost,
      totalLiters,
      globalAvg,
      count: fuelEntries.length
    };
  }, [fuelEntries]);

  const modelAverages = useMemo(() => {
    const modelGroups: Record<string, { vehicleIds: string[], entries: FuelEntry[] }> = {};
    
    fuelEntries.forEach(e => {
      const vehicle = vehicles.find(v => v.id === e.vehicleId);
      const modelName = vehicle?.model || 'Não Identificado';
      
      if (!modelGroups[modelName]) {
        modelGroups[modelName] = { vehicleIds: [], entries: [] };
      }
      if (!modelGroups[modelName].vehicleIds.includes(e.vehicleId)) {
        modelGroups[modelName].vehicleIds.push(e.vehicleId);
      }
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

      const avg = totalLiters > 0 ? (totalKm / totalLiters) : 0;

      return {
        modelName,
        avg,
        totalSpent,
        vehicleCount: data.vehicleIds.length,
        entriesCount: data.entries.length,
        vehicles: data.vehicleIds.map(id => vehicles.find(v => v.id === id)).filter(Boolean) as Vehicle[],
        entries: data.entries
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [fuelEntries, vehicles]);

  const filteredModelAverages = useMemo(() => {
    return modelAverages.filter(m => 
      m.modelName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [modelAverages, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.vehicleId || !newEntry.liters || !newEntry.unitPrice || !newEntry.odometer) return;

    const vehicle = vehicles.find(v => v.id === newEntry.vehicleId);
    const driver = drivers.find(d => d.id === newEntry.driverId);

    // Lookup station by CNPJ if provided
    let stationName = newEntry.stationName;
    if (newEntry.stationCnpj) {
      const station = fuelStations.find(s => s.cnpj === newEntry.stationCnpj);
      if (station) {
        stationName = station.name;
      }
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
  };

  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStation.name || !newStation.cnpj) return;

    if (editingStation) {
      await onUpdateStation(editingStation.id, newStation);
    } else {
      const station: FuelStation = {
        id: Date.now().toString(),
        name: newStation.name,
        cnpj: newStation.cnpj,
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
  };

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

      {/* TABS */}
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

      {activeTab === 'DASHBOARD' ? (
        <>
          {/* BENTO GRID - KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-md">
                <Wallet className="h-3 w-3 text-emerald-600"/>
              </div>
              Investimento Total
            </div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalCost)}
            </h3>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <Calendar className="h-3 w-3" /> Acumulado do período
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                <Droplets className="h-3 w-3 text-blue-600"/>
              </div>
              Volume Total
            </div>
            <h3 className="text-3xl font-black text-blue-600 tracking-tight">
              {stats.totalLiters.toLocaleString()} <span className="text-sm font-bold text-slate-400">L</span>
            </h3>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <Zap className="h-3 w-3" /> Consumo de frota
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-500">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                <TrendingUp className="h-3 w-3 text-orange-600"/>
              </div>
              Média Global
            </div>
            <h3 className="text-3xl font-black text-orange-600 tracking-tight">
              {stats.globalAvg.toFixed(2)} <span className="text-sm font-bold text-slate-400">km/l</span>
            </h3>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <Truck className="h-3 w-3" /> Eficiência média
            </div>
         </div>
         <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all border-l-4 border-l-purple-500">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                <History className="h-3 w-3 text-purple-600"/>
              </div>
              Abastecimentos
            </div>
            <h3 className="text-3xl font-black text-purple-600 tracking-tight">{stats.count}</h3>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              <Plus className="h-3 w-3" /> Registros efetuados
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VEHICLE AVERAGES LIST */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModelAverages.map((m) => (
              <div 
                key={m.modelName} 
                onClick={() => {
                  setSelectedModelData(m);
                  setShowModelModal(true);
                }}
                className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <Truck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-white leading-none mb-1">{m.modelName}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{m.vehicleCount} Veículos • {m.entriesCount} Abastecimentos</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black ${
                    m.avg > 0 ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {m.avg > 0 ? `${m.avg.toFixed(2)} KM/L` : 'S/ MÉDIA'}
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
        </div>

        {/* RECENT ENTRIES */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-purple-500" /> Histórico Recente
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

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {fuelEntries.slice(0, 20).map((entry) => {
              // Try to calculate KM/L for this specific entry if possible
              const vehicleEntries = allFuelEntries
                .filter(e => e.vehicleId === entry.vehicleId)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              
              const entryIndex = vehicleEntries.findIndex(e => e.id === entry.id);
              let entryAvg = 0;
              if (entryIndex > 0) {
                const prevEntry = vehicleEntries[entryIndex - 1];
                const kmDiff = entry.odometer - prevEntry.odometer;
                if (kmDiff > 0 && entry.liters > 0) {
                  entryAvg = kmDiff / entry.liters;
                }
              }

              return (
                <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group relative overflow-hidden hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
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
                        <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{entry.liters.toLocaleString()}L • {entry.fuelType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400">{new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                      {entryAvg > 0 && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[9px] font-black rounded-full border border-orange-100 dark:border-orange-800">
                          {entryAvg.toFixed(2)} KM/L
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
                      <p className="text-[9px] text-slate-400 font-bold tracking-wider">{entry.odometer.toLocaleString()} KM</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeleteEntry(entry.id)}
                    className="absolute top-2 right-2 p-1.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <Zap className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            {fuelEntries.length === 0 && (
              <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Fuel className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Nenhum registro encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fuelStations.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-800 text-center">
              <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Nenhum posto cadastrado</h3>
              <p className="text-slate-500 text-sm mt-2">Cadastre postos para vincular automaticamente aos abastecimentos pelo CNPJ.</p>
              <button 
                onClick={() => {
                  setEditingStation(null);
                  setNewStation({ name: '', cnpj: '', address: '', city: '', state: '' });
                  setShowStationModal(true);
                }}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black text-sm transition-all"
              >
                CADASTRAR PRIMEIRO POSTO
              </button>
            </div>
          ) : (
            fuelStations.map(station => (
              <div key={station.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <Store className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingStation(station);
                        setNewStation(station);
                        setShowStationModal(true);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteStation(station.id)}
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
            ))
          )}
        </div>
      )}

      {/* MODEL DETAILS MODAL */}
      {showModelModal && selectedModelData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" /> Detalhes: {selectedModelData.modelName}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">
                  Análise de desempenho por frota de modelo
                </p>
              </div>
              <button onClick={() => setShowModelModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <Zap className="h-5 w-5 text-slate-400 rotate-45" />
              </button>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              {/* Model Stats Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Média do Modelo</p>
                  <p className="text-2xl font-black text-orange-600">
                    {selectedModelData.avg > 0 ? `${selectedModelData.avg.toFixed(2)} km/l` : 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Investido</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedModelData.totalSpent)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Veículos Ativos</p>
                  <p className="text-2xl font-black text-blue-600">{selectedModelData.vehicleCount}</p>
                </div>
              </div>

              {/* Vehicles in this model */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-400" /> Veículos do Modelo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedModelData.vehicles.map((v: Vehicle) => {
                    // Calculate individual vehicle avg within this model context
                    const vEntries = selectedModelData.entries.filter((e: FuelEntry) => e.vehicleId === v.id);
                    const sorted = [...vEntries].sort((a, b) => a.odometer - b.odometer);
                    let vAvg = 0;
                    if (sorted.length >= 2) {
                      const kmDiff = sorted[sorted.length - 1].odometer - sorted[0].odometer;
                      const litersSum = sorted.slice(1).reduce((acc: number, e: FuelEntry) => acc + e.liters, 0);
                      vAvg = litersSum > 0 ? (kmDiff / litersSum) : 0;
                    }

                    return (
                      <div key={v.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-black text-slate-800 dark:text-white">{v.plate}</p>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                            {vAvg > 0 ? `${vAvg.toFixed(2)} km/l` : 'S/ média'}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>{vEntries.length} Abastecimentos</span>
                          <span>{v.odometer?.toLocaleString()} km</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Entries for this model */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" /> Últimos Abastecimentos do Modelo
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Data</th>
                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Placa</th>
                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Litros</th>
                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Total</th>
                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Posto</th>
                        <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Filial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {selectedModelData.entries.slice(0, 10).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e: FuelEntry) => (
                        <tr key={e.id} className="text-xs">
                          <td className="py-3 font-bold text-slate-600 dark:text-slate-400">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 font-black text-slate-800 dark:text-white">{e.vehiclePlate}</td>
                          <td className="py-3 font-bold text-slate-600 dark:text-slate-400">{e.liters.toLocaleString()}L</td>
                          <td className="py-3 font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.totalCost)}</td>
                          <td className="py-3 font-medium text-slate-500 truncate max-w-[150px]">{e.stationName}</td>
                          <td className="py-3 font-medium text-slate-500">{branches.find(b => b.id === e.branchId)?.name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end">
              <button 
                onClick={() => setShowModelModal(false)}
                className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl text-sm font-black transition-all active:scale-95"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <Fuel className="h-6 w-6 text-blue-600" /> Novo Abastecimento
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">Lançamento de consumo e financeiro</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <Zap className="h-5 w-5 text-slate-400 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              {/* SEÇÃO 1: VEÍCULO E CONTEXTO */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                    <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Identificação do Veículo</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Veículo</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                        value={newEntry.vehicleId || ''}
                        onChange={e => {
                          const v = vehicles.find(veh => veh.id === e.target.value);
                          setNewEntry({...newEntry, vehicleId: e.target.value, odometer: v?.odometer || 0});
                        }}
                      >
                        <option value="">Selecione o Veículo</option>
                        {vehicles.filter(v => v.type === 'CAVALO').map(v => (
                          <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                        ))}
                      </select>
                      <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motorista</label>
                    <div className="relative">
                      <select 
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                        value={newEntry.driverId || ''}
                        onChange={e => setNewEntry({...newEntry, driverId: e.target.value})}
                      >
                        <option value="">Selecione o Motorista</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data</label>
                    <div className="relative">
                      <input 
                        type="date"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        value={newEntry.date}
                        onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                      />
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Combustível</label>
                    <div className="relative">
                      <select 
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white appearance-none"
                        value={newEntry.fuelType}
                        onChange={e => setNewEntry({...newEntry, fuelType: e.target.value})}
                      >
                        <option value="DIESEL S10">DIESEL S10</option>
                        <option value="DIESEL S500">DIESEL S500</option>
                        <option value="ARLA 32">ARLA 32</option>
                      </select>
                      <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: MEDIÇÃO E CONSUMO */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Medição e Consumo</h3>
                  </div>
                  {currentKmPerLiter > 0 && (
                    <div className="flex items-center gap-2 animate-bounce">
                      <Zap className="h-4 w-4 text-orange-500 fill-orange-500" />
                      <span className="text-sm font-black text-orange-600">{currentKmPerLiter.toFixed(2)} KM/L</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Odômetro Atual</label>
                      <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        Último: {lastOdometer.toLocaleString()} KM
                      </span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        required
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white ${
                          newEntry.odometer && newEntry.odometer < lastOdometer ? 'border-red-300 ring-red-100' : 'border-slate-200 dark:border-slate-700'
                        }`}
                        value={newEntry.odometer}
                        onChange={e => setNewEntry({...newEntry, odometer: Number(e.target.value)})}
                      />
                      <History className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                    {newEntry.odometer && newEntry.odometer < lastOdometer && (
                      <p className="text-[10px] font-bold text-red-500 ml-1">Atenção: O KM informado é menor que o último registro.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Litros</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        value={newEntry.liters}
                        onChange={e => setNewEntry({...newEntry, liters: Number(e.target.value)})}
                      />
                      <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: FINANCEIRO E LOCAL */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Financeiro e Localização</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preço Unitário (R$)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.001"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        value={newEntry.unitPrice}
                        onChange={e => setNewEntry({...newEntry, unitPrice: Number(e.target.value)})}
                      />
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CNPJ do Posto</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        placeholder="00.000.000/0000-00"
                        value={newEntry.stationCnpj || ''}
                        onChange={e => {
                          const cnpj = e.target.value;
                          setNewEntry(prev => ({ ...prev, stationCnpj: cnpj }));
                          // Auto-fill station name if found
                          const station = fuelStations.find(s => s.cnpj === cnpj);
                          if (station) {
                            setNewEntry(prev => ({ ...prev, stationName: station.name }));
                          }
                        }}
                      />
                      <FileSpreadsheet className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Posto</label>
                    <div className="relative">
                      <input 
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        placeholder="Nome do posto..."
                        value={newEntry.stationName || ''}
                        onChange={e => setNewEntry(prev => ({ ...prev, stationName: e.target.value }))}
                      />
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl sm:rounded-3xl border border-blue-100 dark:border-blue-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-center sm:text-left">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Total Estimado</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((newEntry.liters || 0) * (newEntry.unitPrice || 0))}
                  </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                  >
                    SALVAR
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* STATION MODAL */}
      {showStationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                  <Store className="h-6 w-6 text-blue-600" />
                  {editingStation ? 'Editar Posto' : 'Cadastrar Novo Posto'}
                </h2>
                <p className="text-slate-500 text-xs font-medium mt-1">Vincule abastecimentos automaticamente pelo CNPJ.</p>
              </div>
              <button 
                onClick={() => setShowStationModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleStationSubmit} className="p-8 space-y-6">
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
                    placeholder="Ex: São Paulo"
                    value={newStation.city}
                    onChange={e => setNewStation(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Endereço</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    placeholder="Rua, Número, Bairro"
                    value={newStation.address}
                    onChange={e => setNewStation(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowStationModal(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all"
                >
                  {editingStation ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR POSTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <FuelImportModal 
          onClose={() => setShowImportModal(false)}
          onImport={async (entries) => {
            for (const entry of entries) {
              await onAddEntry(entry);
            }
            setShowImportModal(false);
          }}
          vehicles={vehicles}
          branches={branches}
          fuelStations={fuelStations}
        />
      )}
    </div>
  );
};

interface ImportModalProps {
  onClose: () => void;
  onImport: (entries: FuelEntry[]) => Promise<void>;
  vehicles: Vehicle[];
  branches: Branch[];
  fuelStations: FuelStation[];
}

const FuelImportModal: React.FC<ImportModalProps> = ({ onClose, onImport, vehicles, branches, fuelStations }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: FuelEntry[], errors: string[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processExcelData(data);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

    const processExcelData = (data: any[]) => {
    const entries: FuelEntry[] = [];
    const errors: string[] = [];

    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (val === undefined || val === null || val === '') return 0;
      // Remove currency symbols, spaces and common separators
      const str = String(val).replace(/R\$/g, '').replace(/\s/g, '').trim();
      
      if (str.includes(',')) {
        // Brazilian format: 1.234,56
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
      }
      
      const parsed = parseFloat(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    data.forEach((row: any, i) => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.trim().toUpperCase()] = row[key];
      });

      const dateStr = String(normalizedRow['DATA'] || '');
      const plate = String(normalizedRow['PLACA'] || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const cnpj = String(normalizedRow['CNPJ'] || normalizedRow['CPNJ'] || '');
      
      const liters = parseNum(normalizedRow['QUANTIDADE DE LT ABASTECIDO'] || normalizedRow['LITROS'] || normalizedRow['QUANTIDADE'] || normalizedRow['QTD']);
      const rawValor = parseNum(normalizedRow['VALOR'] || normalizedRow['VALOR TOTAL'] || normalizedRow['TOTAL'] || normalizedRow['VALOR PAGO']);
      const rawUnitPrice = parseNum(normalizedRow['PREÇO UNITÁRIO'] || normalizedRow['VALOR UNITÁRIO'] || normalizedRow['UNITÁRIO'] || normalizedRow['PREÇO']);
      
      const odometer = parseNum(normalizedRow['KM ATUAL'] || normalizedRow['ODOMETRO'] || normalizedRow['KM']);
      const lastOdo = parseNum(normalizedRow['ULTIMO KM'] || normalizedRow['KM ANTERIOR']);
      const kmDriven = parseNum(normalizedRow['KM RODADO'] || normalizedRow['DISTANCIA']);
      
      const vehicle = vehicles.find(v => v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === plate);
      const branch = branches.find(b => b.cnpj.replace(/\D/g, '') === cnpj?.replace(/\D/g, ''));

      if (!plate) {
        errors.push(`Linha ${i + 2}: Placa não informada.`);
        return;
      }

      if (!vehicle) {
        errors.push(`Linha ${i + 2}: Veículo com placa ${plate} não encontrado.`);
        return;
      }

      // Calculation logic for Odometer
      let finalOdometer = odometer;
      if ((!finalOdometer || finalOdometer === 0) && lastOdo > 0 && kmDriven > 0) {
        finalOdometer = lastOdo + kmDriven;
      }

      // Calculation logic for Costs
      let totalCost = 0;
      let unitPrice = 0;

      if (rawValor > 0 && rawUnitPrice > 0) {
        totalCost = rawValor;
        unitPrice = rawUnitPrice;
      } else if (rawValor > 0) {
        // Heuristic: if VALOR is small (e.g. < 20) and liters is significant, it's likely unit price
        // In Brazil, fuel is usually > 4.00 and < 10.00. Total cost is usually > 50.00.
        if (rawValor < 20 && liters > 1) {
          unitPrice = rawValor;
          totalCost = liters * unitPrice;
        } else {
          totalCost = rawValor;
          unitPrice = liters > 0 ? totalCost / liters : 0;
        }
      } else if (rawUnitPrice > 0) {
        unitPrice = rawUnitPrice;
        totalCost = liters * unitPrice;
      }

      if (!dateStr || liters <= 0 || totalCost <= 0 || finalOdometer <= 0) {
        errors.push(`Linha ${i + 2}: Dados inválidos ou incompletos (Data: ${dateStr}, Litros: ${liters}, Valor Total: ${totalCost}, KM: ${finalOdometer}).`);
        return;
      }

      // Format date
      let formattedDate = dateStr;
      if (!isNaN(Number(dateStr)) && Number(dateStr) > 40000) {
        const date = new Date((Number(dateStr) - 25569) * 86400 * 1000);
        formattedDate = date.toISOString().split('T')[0];
      } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      // Lookup station by CNPJ
      let stationName = normalizedRow['POSTO'] || normalizedRow['STATION'] || normalizedRow['ESTABELECIMENTO'] || '';
      const rowCnpj = String(normalizedRow['CNPJ'] || normalizedRow['CPNJ'] || '');
      if (rowCnpj) {
        const station = fuelStations.find(s => s.cnpj === rowCnpj);
        if (station) {
          stationName = station.name;
        }
      }

      entries.push({
        id: `import-${Date.now()}-${i}`,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        date: formattedDate,
        odometer: finalOdometer,
        liters,
        unitPrice,
        totalCost,
        fuelType: 'DIESEL S10',
        stationName,
        stationCnpj: rowCnpj,
        branchId: branch?.id || vehicle.branchId,
        notes: 'Importado via Excel'
      });
    });

    setResults({ success: entries, errors });
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <Upload className="h-6 w-6 text-blue-600" /> Importar Abastecimentos
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-1">
              Importação em massa via arquivo Excel (.xlsx, .xls)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <Zap className="h-5 w-5 text-slate-400 rotate-45" />
          </button>
        </div>

        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {!results ? (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 space-y-2">
                <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> Colunas Esperadas no Excel:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['DATA', 'PLACA', 'CNPJ', 'QUANTIDADE DE LT ABASTECIDO', 'VALOR', 'ULTIMO KM', 'KM ATUAL', 'KM RODADO'].map(col => (
                    <span key={col} className="text-[9px] font-mono bg-white dark:bg-slate-950 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900 text-blue-600 dark:text-blue-300 text-center">
                      {col}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-blue-500 font-medium">
                  * O sistema identificará automaticamente as colunas pelo nome no cabeçalho.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
                   onClick={() => fileInputRef.current?.click()}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-xl shadow-slate-200 dark:shadow-none mb-4 group-hover:scale-110 transition-transform">
                  <FileUp className="h-10 w-10 text-blue-600" />
                </div>
                <p className="text-sm font-black text-slate-800 dark:text-white">Clique para selecionar o arquivo Excel</p>
                <p className="text-xs text-slate-500 mt-2">Suporta formatos .xlsx e .xls</p>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-3 text-blue-600 font-black animate-pulse">
                  <Loader2 className="h-5 w-5 animate-spin" /> PROCESSANDO ARQUIVO...
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Prontos para Importar</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{results.success.length}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-black text-red-600 uppercase mb-1">Erros Encontrados</p>
                  <p className="text-2xl font-black text-red-700 dark:text-red-400">{results.errors.length}</p>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Relatório de Erros</p>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 max-h-40 overflow-y-auto space-y-1">
                    {results.errors.map((err, idx) => (
                      <p key={idx} className="text-[10px] text-red-600 font-bold flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prévia dos Dados</p>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="p-2 font-black text-slate-400 uppercase">Data</th>
                        <th className="p-2 font-black text-slate-400 uppercase">Placa</th>
                        <th className="p-2 font-black text-slate-400 uppercase text-center">Litros</th>
                        <th className="p-2 font-black text-slate-400 uppercase text-center">P. Unit.</th>
                        <th className="p-2 font-black text-slate-400 uppercase text-right">Total</th>
                        <th className="p-2 font-black text-slate-400 uppercase text-right">KM</th>
                        <th className="p-2 font-black text-slate-400 uppercase text-right">Posto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {results.success.slice(0, 10).map((e, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-bold">{e.date.split('-').reverse().join('/')}</td>
                          <td className="p-2 font-black text-blue-600">{e.vehiclePlate}</td>
                          <td className="p-2 text-center">{e.liters.toLocaleString()}L</td>
                          <td className="p-2 text-center font-medium text-slate-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.unitPrice)}</td>
                          <td className="p-2 text-right font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.totalCost)}</td>
                          <td className="p-2 text-right">{e.odometer.toLocaleString()}</td>
                          <td className="p-2 text-right text-slate-500 truncate max-w-[80px]">{e.stationName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results.success.length > 10 && (
                    <div className="p-2 text-center bg-slate-50 dark:bg-slate-800 text-[9px] font-bold text-slate-400">
                      Exibindo 10 de {results.success.length} registros...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-slate-500 font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all"
          >
            CANCELAR
          </button>
          {!results ? (
            <div className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest py-3">
              Selecione um arquivo para iniciar o processamento
            </div>
          ) : (
            <button 
              onClick={() => onImport(results.success)}
              disabled={results.success.length === 0}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              CONFIRMAR IMPORTAÇÃO ({results.success.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
