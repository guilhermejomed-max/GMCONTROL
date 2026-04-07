
import { useState, useMemo, FC, useEffect } from 'react';
import { Tire, Vehicle, UserLevel, SystemSettings } from '../types';
import { Search, Save, Truck, ArrowLeft, ClipboardCheck, ChevronRight, Printer, AlertTriangle, X, Gauge, Activity, FileText, CheckCircle2, AlertOctagon, CornerDownRight, TrendingDown } from 'lucide-react';

interface MaintenanceHubProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  onUpdateTire: (tire: Tire) => Promise<void>;
  userLevel: UserLevel;
  settings?: SystemSettings;
}

interface InspectionEntry {
  pressure?: number;
  depth1?: number;
  depth2?: number;
  depth3?: number;
  depth4?: number;
  notes?: string;
}

export const MaintenanceHub: FC<MaintenanceHubProps> = ({ 
  tires, 
  vehicles, 
  branches = [],
  defaultBranchId,
  onUpdateTire, 
  userLevel, 
  settings 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  
  // Inspection Buffer
  const [inspectionData, setInspectionData] = useState<Record<string, InspectionEntry>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredVehicles = useMemo(() => vehicles.filter(v => {
    const matchesSearch = v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         v.model.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => a.plate.localeCompare(b.plate)), [vehicles, searchTerm]);

  const mountedTires = useMemo(() => {
    if (!selectedVehicle) return [];
    // Sort tires roughly by position (1st axle first, etc)
    return tires
      .filter(t => t.vehicleId === selectedVehicle.id)
      .sort((a, b) => (a.position || '').localeCompare(b.position || ''));
  }, [selectedVehicle, tires]);

  const handleInputChange = (tireId: string, field: keyof InspectionEntry, value: string) => {
     setInspectionData(prev => ({
        ...prev,
        [tireId]: {
           ...prev[tireId],
           [field]: field === 'notes' ? value : Number(value)
        }
     }));
  };

  const handleSaveInspection = async () => {
     if (!selectedVehicle) return;
     setIsSaving(true);
     
     try {
        let updatedCount = 0;
        
        for (const tire of mountedTires) {
           const data = inspectionData[tire.id];
           
           // Only update if there is data entered
           if (data) {
              // Calculate average depth from 4 points if entered, else assume single point logic or keep existing
              const depths = [data.depth1, data.depth2, data.depth3, data.depth4].filter(n => n !== undefined && n > 0) as number[];
              
              // If user entered a single main depth in depth1 (UI simplification), use it
              // Or calculate average if multiple points are supported in future expansion
              let newDepth = tire.currentTreadDepth;
              
              if (data.depth1 && data.depth1 > 0) {
                  newDepth = data.depth1;
              }

              const updatedTire: Tire = {
                 ...tire,
                 currentTreadDepth: newDepth,
                 pressure: data.pressure || tire.pressure,
                 lastInspectionDate: new Date().toISOString(),
                 history: [...(tire.history || []), {
                    date: new Date().toISOString(),
                    action: 'INSPECAO',
                    details: `Inspeção. Sulco: ${newDepth}mm. Pressão: ${data.pressure || tire.pressure}psi. ${data.notes ? `Obs: ${data.notes}` : ''}`
                 }]
              };
              
              await onUpdateTire(updatedTire);
              updatedCount++;
           }
        }
        
        if (updatedCount > 0) {
            alert(`${updatedCount} pneus atualizados com sucesso.`);
            setInspectionData({});
            setSelectedVehicle(null);
        } else {
            alert("Nenhuma alteração registrada para salvar.");
        }
     } catch (e) {
        console.error(e);
        alert("Erro ao salvar inspeção.");
     } finally {
        setIsSaving(false);
     }
  };

  const handlePrintComparison = () => {
    if (!selectedVehicle) return;
    alert("Função de relatório simplificado em desenvolvimento.");
  };

  return (
    <div className="h-full flex flex-col">
       {selectedVehicle ? (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative">
             {/* Header */}
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <button onClick={() => { setSelectedVehicle(null); setInspectionData({}); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                      <ArrowLeft className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                   </button>
                   <div>
                      <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                         <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" /> {selectedVehicle.plate}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{selectedVehicle.model} • {mountedTires.length} Pneus</p>
                   </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={handleSaveInspection}
                        disabled={isSaving}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 text-sm flex-1 md:flex-none"
                    >
                        {isSaving ? 'Salvando...' : <><Save className="h-5 w-5" /> Salvar Inspeção</>}
                    </button>
                </div>
             </div>

             {/* SCROLLABLE GRID LIST - "OLD LAYOUT" */}
             <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {mountedTires.map(tire => {
                      const currentEntry = inspectionData[tire.id] || {};
                      const isModified = currentEntry.pressure !== undefined || currentEntry.depth1 !== undefined;
                      const depthValue = currentEntry.depth1 !== undefined ? currentEntry.depth1 : tire.currentTreadDepth;
                      
                      // CPK Calculation
                      const currentRun = (selectedVehicle && tire.installOdometer) ? Math.max(0, selectedVehicle.odometer - tire.installOdometer) : 0;
                      const totalKm = (tire.totalKms || 0) + currentRun;
                      const cost = Number(tire.totalInvestment || tire.price || 0);
                      const cpk = totalKm > 0 ? cost / totalKm : 0;

                      // Color Logic
                      let statusColor = 'border-slate-200 dark:border-slate-700';
                      let bgClass = 'bg-white dark:bg-slate-800';
                      
                      if (depthValue <= (settings?.minTreadDepth || 3)) {
                          statusColor = 'border-red-400 ring-1 ring-red-400 bg-red-50 dark:bg-red-900/20';
                          bgClass = ''; // Override default bg
                      } else if (depthValue <= (settings?.warningTreadDepth || 5)) {
                          statusColor = 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
                          bgClass = '';
                      }
                      
                      return (
                         <div key={tire.id} className={`${bgClass} rounded-xl border p-4 shadow-sm transition-all flex flex-col justify-between ${statusColor} ${isModified ? 'shadow-md translate-y-[-2px]' : ''}`}>
                            <div>
                                <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                                   <div>
                                      <div className="flex items-center gap-2">
                                         <span className="bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded">{tire.position}</span>
                                         <span className="font-black text-slate-700 dark:text-white">{tire.fireNumber}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[150px]">{tire.brand} {tire.model}</p>
                                   </div>
                                   {isModified && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                   <div>
                                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1">
                                         <Gauge className="h-3 w-3" /> Pressão
                                      </label>
                                      <div className="relative">
                                         <input 
                                            type="number" 
                                            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg py-2 px-2 font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center"
                                            placeholder={String(tire.pressure)}
                                            value={currentEntry.pressure || ''}
                                            onChange={(e) => handleInputChange(tire.id, 'pressure', e.target.value)}
                                         />
                                         <span className="absolute right-1 top-2.5 text-[9px] text-slate-400">PSI</span>
                                      </div>
                                   </div>
                                   
                                   <div>
                                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1">
                                         <Activity className="h-3 w-3" /> Sulco
                                      </label>
                                      <div className="relative">
                                         <input 
                                            type="number" 
                                            step="0.1"
                                            className={`w-full border rounded-lg py-2 px-2 font-bold focus:ring-2 outline-none text-center dark:bg-slate-700 ${
                                               depthValue <= (settings?.minTreadDepth || 3) 
                                               ? 'text-red-600 dark:text-red-400 border-red-300 focus:ring-red-500' 
                                               : 'text-slate-800 dark:text-white border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                                            }`}
                                            placeholder={String(tire.currentTreadDepth)}
                                            value={currentEntry.depth1 || ''}
                                            onChange={(e) => handleInputChange(tire.id, 'depth1', e.target.value)}
                                         />
                                         <span className="absolute right-1 top-2.5 text-[9px] text-slate-400">mm</span>
                                      </div>
                                   </div>
                                </div>

                                <input 
                                   type="text" 
                                   className="w-full text-xs border-b border-slate-200 dark:border-slate-700 py-1 bg-transparent focus:border-blue-500 outline-none placeholder-slate-400 text-slate-600 dark:text-slate-300 mb-2"
                                   placeholder="Adicionar observação..."
                                   value={currentEntry.notes || ''}
                                   onChange={(e) => handleInputChange(tire.id, 'notes', e.target.value)}
                                />
                            </div>

                            {/* CPK Footer */}
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 -mx-4 -mb-4 px-4 py-2 rounded-b-xl">
                               <div className="flex flex-col">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Rodagem Total</span>
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{totalKm.toLocaleString()} km</span>
                               </div>
                               <div className="text-right flex flex-col">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 justify-end"><TrendingDown className="h-3 w-3"/> CPK Real</span>
                                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">R$ {cpk.toFixed(5)}</span>
                               </div>
                            </div>
                         </div>
                      );
                   })}
                </div>
                
                {mountedTires.length === 0 && (
                   <div className="text-center py-20 text-slate-400">
                      <AlertOctagon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum pneu montado neste veículo.</p>
                   </div>
                )}
             </div>
          </div>
       ) : (
          <div className="space-y-6">
             <div className="flex justify-between items-end">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Hub de Manutenção</h2>
                   <p className="text-slate-500 dark:text-slate-400 text-sm">Realize inspeções e registre medições de sulcos.</p>
                </div>
                <div className="relative w-72 hidden md:block">
                   <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                   <input 
                      type="text" 
                      placeholder="Buscar veículo..." 
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="relative w-full md:hidden mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                   type="text" 
                   placeholder="Buscar veículo..." 
                   className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVehicles.length > 0 ? (showAllVehicles ? filteredVehicles : filteredVehicles.slice(0, 9)).map(vehicle => (
                   <div 
                      key={vehicle.id} 
                      onClick={() => setSelectedVehicle(vehicle)}
                      className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                   >
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                               <Truck className="h-6 w-6" />
                            </div>
                            <div>
                               <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{vehicle.plate}</h3>
                               <p className="text-xs text-slate-500 dark:text-slate-400">{vehicle.model}</p>
                            </div>
                         </div>
                         <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                         <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> Inspecionar</span>
                         <span>{tires.filter(t => t.vehicleId === vehicle.id).length} Pneus</span>
                      </div>
                   </div>
                )) : (
                   <div className="col-span-full py-12 text-center text-slate-400">
                      <Truck className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Nenhum veículo encontrado.</p>
                   </div>
                )}
             </div>

             {filteredVehicles.length > 9 && (
                <div className="flex justify-center pt-8">
                   <button 
                      onClick={() => setShowAllVehicles(!showAllVehicles)}
                      className="px-10 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                   >
                      {showAllVehicles ? 'VER MENOS' : `VER TODOS OS VEÍCULOS (${filteredVehicles.length})`}
                   </button>
                </div>
             )}
          </div>
       )}
    </div>
  );
};
