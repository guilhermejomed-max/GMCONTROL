
import { useState, useMemo, FC, FormEvent, ChangeEvent } from 'react';
import { Vehicle, UserLevel, VehicleLocation, Tire, SystemSettings } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash2, X, Truck, Container, Gauge, Search, MapPin, Loader2, LocateFixed, Upload, FileSpreadsheet, PenLine, AlertTriangle, AlertOctagon, Ban, Wrench, CheckSquare, Square, MoreHorizontal, RotateCcw } from 'lucide-react';

interface VehicleManagerProps {
  vehicles: Vehicle[];
  tires: Tire[];
  serviceOrders?: any[];
  onAddVehicle: (vehicle: Vehicle) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onUpdateVehicle: (vehicle: Vehicle) => Promise<void>;
  userLevel: UserLevel;
  settings?: SystemSettings;
}

export const VehicleManager: FC<VehicleManagerProps> = ({ vehicles, tires, onAddVehicle, onDeleteVehicle, onUpdateVehicle, userLevel, settings }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVehicleRG, setSelectedVehicleRG] = useState<Vehicle | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'EMPTY' | 'MAINTENANCE'>('ALL');
  
  // Bulk Actions State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Undo Import State
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    axles: 3,
    type: 'CAVALO' as 'CAVALO' | 'CARRETA',
    odometer: 0
  });

  // Função para analisar o estado do veículo
  const getVehicleStatus = (vehicle: Vehicle) => {
      const mountedTires = tires.filter(t => t.vehicleId === vehicle.id);
      
      // 1. Falta de Pneus
      const expectedTires = vehicle.type === 'CAVALO' ? 2 + ((vehicle.axles - 1) * 4) : vehicle.axles * 4;
      const missingTiresCount = Math.max(0, expectedTires - mountedTires.length);
      const isMissingTires = missingTiresCount > 0;

      // 2. Pneus Baixos (Críticos)
      const minDepth = settings?.minTreadDepth || 3.0;
      const criticalTires = mountedTires.filter(t => t.currentTreadDepth <= minDepth);
      const hasLowTread = criticalTires.length > 0;

      // 3. Passou do KM (Manutenção ou Vida Útil do Pneu)
      // Verifica intervalo de manutenção (padrão 10k)
      const maintenanceInterval = settings?.maintenanceIntervalKm || 10000;
      const kmSinceLastService = vehicle.odometer % maintenanceInterval;
      const isMaintenanceDue = kmSinceLastService >= (maintenanceInterval - 500) || kmSinceLastService < 500; // Perto do vencimento ou recém vencido
      
      // Verifica se algum pneu passou da vida útil estimada (padrão 80k se não houver catálogo)
      const hasExpiredTires = mountedTires.some(t => {
          const run = Math.max(0, vehicle.odometer - (t.installOdometer || 0));
          const totalRun = (t.totalKms || 0) + run;
          
          // Tenta pegar do catálogo nas configurações, senão usa 80k
          const modelDef = settings?.tireModels?.find(m => m.brand === t.brand && m.model === t.model);
          const limit = modelDef?.estimatedLifespanKm || 80000;
          
          return totalRun >= limit;
      });

      const isHighKm = isMaintenanceDue || hasExpiredTires;

      return {
          isMissingTires,
          missingCount: missingTiresCount,
          hasLowTread,
          lowTreadCount: criticalTires.length,
          isHighKm,
          mountedCount: mountedTires.length
      };
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            v.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      const status = getVehicleStatus(v);

      if (filterType === 'CRITICAL') return status.hasLowTread;
      if (filterType === 'EMPTY') return status.isMissingTires;
      if (filterType === 'MAINTENANCE') return status.isHighKm;

      return true;
    });
  }, [vehicles, searchTerm, tires, settings, filterType]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ plate: '', model: '', axles: 3, type: 'CAVALO', odometer: 0 });
    setIsAdding(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      plate: vehicle.plate,
      model: vehicle.model,
      axles: vehicle.axles,
      type: vehicle.type,
      odometer: vehicle.odometer
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        // Update existing vehicle
        const existingVehicle = vehicles.find(v => v.id === editingId);
        if (existingVehicle) {
          const updatedVehicle: Vehicle = {
            ...existingVehicle,
            plate: formData.plate.toUpperCase(),
            model: formData.model,
            axles: formData.axles,
            type: formData.type,
            odometer: formData.odometer
          };
          await onUpdateVehicle(updatedVehicle);
        }
      } else {
        // Create new vehicle
        const newVehicle: Vehicle = {
          id: Date.now().toString(36),
          plate: formData.plate.toUpperCase(),
          model: formData.model,
          axles: formData.axles,
          type: formData.type,
          odometer: formData.odometer
        };
        await onAddVehicle(newVehicle);
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({ plate: '', model: '', axles: 3, type: 'CAVALO', odometer: 0 });
    } catch (error) {
      alert("Erro ao salvar veículo.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- BULK ACTIONS & UNDO ---
  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredVehicles.length) {
          setSelectedIds(new Set());
      } else {
          const newSet = new Set(filteredVehicles.map(v => v.id));
          setSelectedIds(newSet);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} veículos? Esta ação não pode ser desfeita.`)) return;

      setIsBulkDeleting(true);
      try {
          const deletePromises = Array.from(selectedIds).map(id => onDeleteVehicle(id));
          await Promise.all(deletePromises);
          
          setIsSelectionMode(false);
          setSelectedIds(new Set());
          alert(`${selectedIds.size} veículos removidos com sucesso.`);
      } catch (err) {
          console.error(err);
          alert("Erro ao excluir alguns veículos. Tente novamente.");
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const handleUndoImport = async () => {
      if (lastImportedIds.length === 0) return;
      if (!confirm(`Deseja desfazer a última importação? Isso removerá ${lastImportedIds.length} veículos criados.`)) return;

      setIsBulkDeleting(true);
      try {
          const deletePromises = lastImportedIds.map(id => onDeleteVehicle(id));
          await Promise.all(deletePromises);
          setLastImportedIds([]);
          alert("Importação desfeita com sucesso.");
      } catch (err) {
          console.error(err);
          alert("Erro ao desfazer importação.");
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const handleUpdateLocation = async (vehicle: Vehicle) => {
    if (!confirm(`VOCÊ ESTÁ AO LADO DO VEÍCULO?\n\nEsta função usa o GPS do SEU CELULAR/PC para definir onde o veículo está.\n\nClique em OK apenas se você estiver fisicamente junto ao veículo.`)) {
      return;
    }

    if (!("geolocation" in navigator)) {
      alert("Geolocalização não suportada neste navegador.");
      return;
    }

    setUpdatingLocationId(vehicle.id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const address = data.display_name?.split(',')[0] || 'Localização Manual (Dispositivo)';
          const city = data.address?.city || data.address?.town || data.address?.village || 'Desconhecida';
          const state = data.address?.state || '';

          const locationUpdate: VehicleLocation = {
            lat: latitude, lng: longitude, address: address, city: city, state: state, updatedAt: new Date().toISOString()
          };

          await onUpdateVehicle({ ...vehicle, lastLocation: locationUpdate });
        } catch (error) {
          console.error("Erro ao obter endereço", error);
          await onUpdateVehicle({ ...vehicle, lastLocation: { lat: latitude, lng: longitude, address: 'Coordenadas GPS (Manual)', city: 'Desconhecida', state: '', updatedAt: new Date().toISOString() } });
        } finally {
          setUpdatingLocationId(null);
        }
      },
      (error) => {
        alert("Erro ao obter localização: " + error.message);
        setUpdatingLocationId(null);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };

  const handleImportExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setLastImportedIds([]); // Reset previous undo history on new import

    try {
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                const data = XLSX.utils.sheet_to_json(ws);
                const dataByCol = XLSX.utils.sheet_to_json(ws, { header: 'A', defval: '' });
                if (dataByCol.length > 0) dataByCol.shift();

                let updatedCount = 0;
                let createdCount = 0;
                let notFoundCount = 0;
                let kmUpdatedCount = 0;

                const parseCoordinate = (val: any) => {
                    if (val === undefined || val === null || String(val).trim() === '') return NaN;
                    let str = String(val).trim().replace(/,/g, '.');
                    const match = str.match(/-?\d+(\.\d+)?/);
                    if (!match) return NaN;
                    const num = parseFloat(match[0]);
                    if (!isNaN(num) && Math.abs(num) <= 180 && num !== 0) return num;
                    return NaN;
                };

                const parseOdometer = (val: any) => {
                    if (val === undefined || val === null) return 0;
                    if (typeof val === 'number') return Math.floor(val);
                    let str = String(val).trim().toUpperCase();
                    str = str.replace(/[A-Z]/g, '').trim();
                    if (str.includes('.')) str = str.replace(/\./g, '');
                    if (str.includes(',')) str = str.replace(',', '.');
                    str = str.replace(/[^0-9.]/g, '');
                    const num = parseFloat(str);
                    return isNaN(num) ? 0 : Math.floor(num);
                };

                const updatesBatch: any[] = [];
                const createsBatch: Vehicle[] = [];

                for (let i = 0; i < data.length; i++) {
                    const row: any = data[i];
                    const colRow: any = dataByCol[i] || {};

                    const normalizedRow: any = {};
                    Object.keys(row).forEach(k => {
                        const cleanKey = k.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ""); 
                        normalizedRow[cleanKey] = row[k];
                    });

                    const getKey = (possibleKeys: string[]) => {
                        for (const k of possibleKeys) { if (normalizedRow[k]) return normalizedRow[k]; }
                        const allKeys = Object.keys(normalizedRow);
                        for (const k of possibleKeys) { const found = allKeys.find(ak => ak.includes(k)); if (found) return normalizedRow[found]; }
                        return null;
                    };

                    const plate = getKey(['PLACA', 'VEICULO']);
                    const lat = parseCoordinate(getKey(['LATITUDE', 'LAT', 'GPSLAT', 'Y']));
                    const lng = parseCoordinate(getKey(['LONGITUDE', 'LONG', 'GPSLON', 'X']));
                    
                    let odometerVal = colRow['I']; 
                    if (!odometerVal) odometerVal = getKey(['HODOMETRO', 'ODOMETRO', 'KM', 'KMATUAL', 'KMTOTAL']);
                    const odometer = parseOdometer(odometerVal);

                    const rawAddress = getKey(['ENDERECO', 'RUA', 'LOGRADOURO', 'LOCAL', 'LOCALIZACAO']);
                    const city = getKey(['CIDADE', 'MUNICIPIO']);
                    const state = getKey(['ESTADO', 'UF']);
                    
                    let finalAddress = rawAddress;
                    if (!finalAddress || String(finalAddress).length <= 3) {
                        if (city && state) finalAddress = `${city} - ${state}`;
                        else if (city) finalAddress = city;
                        else if (state) finalAddress = `Em trânsito (${state})`;
                        else finalAddress = 'Localização Atualizada';
                    } else {
                        if (city && !String(finalAddress).includes(city)) finalAddress = `${finalAddress} - ${city}`;
                    }
                    
                    if (plate) {
                        const cleanPlate = plate.toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
                        const vehicle = vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate);
                        
                        if (vehicle) {
                            const updates: Partial<Vehicle> = { id: vehicle.id };
                            let hasChanges = false;
                            
                            if (!isNaN(lat) && !isNaN(lng)) {
                                updates.lastLocation = { lat, lng, address: String(finalAddress), city: city || 'Desconhecida', state: state || '', updatedAt: new Date().toISOString() };
                                hasChanges = true;
                            }
                            if (odometer > 0 && odometer !== vehicle.odometer) {
                                updates.odometer = odometer;
                                hasChanges = true;
                                kmUpdatedCount++;
                            }
                            if (hasChanges) {
                                updatesBatch.push(updates);
                                updatedCount++;
                            }
                        } else {
                            const newVehicle: Vehicle = {
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                plate: plate.toString().toUpperCase().trim(),
                                model: normalizedRow['MODELO'] || 'Modelo Importado',
                                type: 'CAVALO',
                                axles: Number(normalizedRow['EIXOS']) || 3,
                                odometer: odometer,
                                avgMonthlyKm: 10000
                            };
                            if (!isNaN(lat) && !isNaN(lng)) {
                                newVehicle.lastLocation = { lat, lng, address: String(finalAddress), city: city || '', state: state || '', updatedAt: new Date().toISOString() };
                            }
                            createsBatch.push(newVehicle);
                            createdCount++;
                        }
                    } else {
                        notFoundCount++;
                    }
                }

                if (updatesBatch.length > 0) await storageService.updateVehicleBatch(updatesBatch);
                
                if (createsBatch.length > 0) {
                    await storageService.importDataBatch([], createsBatch);
                    setLastImportedIds(createsBatch.map(v => v.id)); // Armazena IDs para desfazer
                }

                alert(`Importação Concluída:\n\nAtualizados: ${updatedCount}\nNovos: ${createdCount}\nIgnorados: ${notFoundCount}`);
            } catch (err: any) {
                console.error(err);
                alert(`Erro ao processar arquivo: ${err.message}`);
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    } catch (err: any) {
        alert(`Erro na biblioteca: ${err.message}`);
        setIsImporting(false);
    }
    e.target.value = '';
  };

  const quickStats = useMemo(() => {
      let missingTires = 0;
      let lowTread = 0;
      let maintenance = 0;
      vehicles.forEach(v => {
          const s = getVehicleStatus(v);
          if(s.isMissingTires) missingTires++;
          if(s.hasLowTread) lowTread++;
          if(s.isHighKm) maintenance++;
      });
      return { missingTires, lowTread, maintenance };
  }, [vehicles, tires, settings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Truck className="h-7 w-7 text-blue-600" /> Minha Frota
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie veículos e atualize localizações em tempo real.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <label className={`flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                <span className="hidden md:inline">{isImporting ? 'Importando...' : 'Importar Excel'}</span>
                <span className="md:hidden">Importar</span>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} disabled={isImporting} />
            </label>
            <button 
              onClick={handleOpenAdd} 
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" /> <span className="hidden md:inline">Novo Veículo</span><span className="md:hidden">Novo</span>
            </button>
        </div>
      </div>

      {/* BANNER DE DESFAZER IMPORTAÇÃO */}
      {lastImportedIds.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-orange-600">
                      <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">Importação Recente</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Você adicionou {lastImportedIds.length} veículos agora. Algo errado?</p>
                  </div>
              </div>
              <button 
                  onClick={handleUndoImport}
                  disabled={isBulkDeleting}
                  className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors"
              >
                  {isBulkDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : <RotateCcw className="h-3 w-3" />}
                  Desfazer Importação
              </button>
          </div>
      )}

      {/* FILTER BAR / STATUS BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar veículo por placa ou modelo..." 
              className="w-full pl-10 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          {/* SELECTION ACTIONS */}
          {userLevel === 'SENIOR' && (
              <button 
                onClick={toggleSelectionMode} 
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap ${isSelectionMode ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
              >
                  {isSelectionMode ? <X className="h-4 w-4"/> : <CheckSquare className="h-4 w-4"/>}
                  {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar / Excluir em Massa'}
              </button>
          )}

          {!isSelectionMode && (
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                <button onClick={() => setFilterType('ALL')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${filterType === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>Todos</button>
                <button onClick={() => setFilterType('EMPTY')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${filterType === 'EMPTY' ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900'}`}><Ban className="h-3 w-3"/> Sem Pneus</button>
                <button onClick={() => setFilterType('CRITICAL')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${filterType === 'CRITICAL' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'}`}><AlertOctagon className="h-3 w-3"/> Críticos</button>
            </div>
          )}
      </div>

      {/* SELECTION TOOLBAR (If Active) */}
      {isSelectionMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <button onClick={toggleSelectAll} className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 hover:underline">
                      {selectedIds.size === filteredVehicles.length ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4"/>}
                      {selectedIds.size === filteredVehicles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-xs text-slate-500 font-medium">|</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedIds.size} selecionados</span>
              </div>
              <button 
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || isBulkDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
              >
                  {isBulkDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : <Trash2 className="h-3 w-3"/>}
                  Excluir Selecionados
              </button>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map(vehicle => {
          const status = getVehicleStatus(vehicle);
          const isSelected = selectedIds.has(vehicle.id);
          
          return (
            <div 
                key={vehicle.id} 
                onClick={() => isSelectionMode ? toggleSelection(vehicle.id) : setSelectedVehicleRG(vehicle)}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm group transition-all relative overflow-hidden cursor-pointer 
                    ${isSelectionMode 
                        ? (isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100') 
                        : (status.hasLowTread || status.isHighKm || status.isMissingTires ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-800')
                    }`}
            >
              {isSelectionMode && (
                  <div className="absolute top-4 right-4 text-blue-600">
                      {isSelected ? <CheckSquare className="h-6 w-6 fill-blue-100"/> : <Square className="h-6 w-6 text-slate-300"/>}
                  </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                    {vehicle.type === 'CAVALO' ? <Truck className="h-6 w-6" /> : <Container className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-white">{vehicle.plate}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">{vehicle.model}</p>
                  </div>
                </div>
                
                {!isSelectionMode && (
                    <div className="flex gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateLocation(vehicle); }}
                            disabled={updatingLocationId === vehicle.id}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Marcar Veículo na Minha Posição"
                        >
                            {updatingLocationId === vehicle.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <LocateFixed className="h-4 w-4"/>}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(vehicle); }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Editar Veículo"
                        >
                            <PenLine className="h-4 w-4" />
                        </button>
                        {userLevel === 'SENIOR' && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteVehicle(vehicle.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir Veículo">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
              </div>
              
              {/* ALERTAS VISUAIS NO CARD */}
              <div className="flex flex-wrap gap-2 mb-3">
                  {status.isMissingTires && (
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1 border border-orange-200">
                          <Ban className="h-3 w-3"/> Faltam {status.missingCount} pneus
                      </span>
                  )}
                  {status.hasLowTread && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1 border border-red-200">
                          <AlertOctagon className="h-3 w-3"/> {status.lowTreadCount} pneus baixos
                      </span>
                  )}
                  {status.isHighKm && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1 border border-blue-200">
                          <AlertTriangle className="h-3 w-3"/> KM Excedido
                      </span>
                  )}
                  {!status.isMissingTires && !status.hasLowTread && !status.isHighKm && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 border border-green-200">
                          OK
                      </span>
                  )}
              </div>

              <div className="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-800 pt-3 mb-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <Gauge className="h-4 w-4" /> {vehicle.odometer.toLocaleString()} km
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded text-xs font-bold">{vehicle.axles} Eixos</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                 <div className="flex items-start gap-2">
                    <MapPin className={`h-4 w-4 mt-0.5 ${vehicle.lastLocation ? 'text-green-500' : 'text-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                          {vehicle.lastLocation?.address || 'Localização não definida'}
                       </p>
                       <p className="text-[10px] text-slate-400 mt-0.5">
                          {vehicle.lastLocation?.updatedAt 
                             ? `Atualizado: ${new Date(vehicle.lastLocation.updatedAt).toLocaleDateString()} ${new Date(vehicle.lastLocation.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` 
                             : 'Sem registro de GPS'}
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVehicleRG && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" /> 
                RG do Veículo: {selectedVehicleRG.plate}
              </h3>
              <button onClick={() => setSelectedVehicleRG(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Modelo</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.model}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Tipo</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.type}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Eixos</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.axles}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Hodômetro</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.odometer.toLocaleString()} km</p>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white mb-3">Pneus Montados</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl max-h-60 overflow-y-auto">
                        {tires.filter(t => t.vehicleId === selectedVehicleRG.id).map(tire => (
                            <div key={tire.id} className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{tire.fireNumber}</p>
                                    <p className="text-[10px] text-slate-500">{tire.brand} {tire.model} - Pos: {tire.position}</p>
                                </div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{tire.currentTreadDepth} mm</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
      
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" /> 
                {editingId ? 'Editar Veículo' : 'Novo Veículo'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">PLACA</label>
                  <input required type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold" value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">TIPO</label>
                  <select className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="CAVALO">Cavalo</option>
                    <option value="CARRETA">Carreta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MODELO</label>
                <input required type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Ex: Scania R450" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">EIXOS</label>
                  <input type="number" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.axles} onChange={e => setFormData({...formData, axles: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">HODÔMETRO</label>
                  <input type="number" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.odometer} onChange={e => setFormData({...formData, odometer: Number(e.target.value)})} />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all">{isSaving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
