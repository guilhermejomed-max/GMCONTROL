
import React, { useState, useMemo, FC } from 'react';
import { Vehicle, Tire, TabView } from '../types';
import { 
  Truck, Search, CheckCircle2, AlertTriangle, XCircle, 
  AlertOctagon, Save, History, Eye, X, ChevronRight, Layout, Info
} from 'lucide-react';

interface YardAnalysisProps {
  vehicles: Vehicle[];
  tires: Tire[];
  branches?: any[];
  defaultBranchId?: string;
  onAddVehicle: (vehicle: Vehicle) => Promise<void>;
  onAddTire: (tire: Tire) => Promise<void>;
  onNavigate: (tab: TabView) => void;
}

type AuditStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'MISSING';

// Loader component defined locally for safety
const LoaderIcon = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const YardAnalysis: FC<YardAnalysisProps> = ({ 
  vehicles: allVehicles = [], 
  tires: allTires = [], 
  branches = [],
  defaultBranchId,
  onNavigate 
}) => {
  const vehicles = useMemo(() => {
    return defaultBranchId ? allVehicles.filter(v => v.branchId === defaultBranchId) : allVehicles;
  }, [allVehicles, defaultBranchId]);

  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<Record<string, AuditStatus>>({});
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredVehicles = useMemo(() => {
    return (vehicles || [])
      .filter(v => 
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, searchTerm]);

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId), 
  [vehicles, selectedVehicleId]);

  const mountedTires = useMemo(() => {
    if (!selectedVehicleId) return [];
    return tires.filter(t => t.vehicleId === selectedVehicleId);
  }, [tires, selectedVehicleId]);

  const toggleTireStatus = (tireId: string) => {
    setAuditData(prev => {
      const current = prev[tireId];
      if (!current) return { ...prev, [tireId]: 'OK' };
      if (current === 'OK') return { ...prev, [tireId]: 'WARNING' };
      if (current === 'WARNING') return { ...prev, [tireId]: 'CRITICAL' };
      if (current === 'CRITICAL') return { ...prev, [tireId]: 'MISSING' };
      const next = { ...prev };
      delete next[tireId];
      return next;
    });
  };

  const getStatusColor = (status?: AuditStatus) => {
    switch (status) {
      case 'OK': return 'bg-green-500 border-green-600';
      case 'WARNING': return 'bg-yellow-500 border-yellow-600';
      case 'CRITICAL': return 'bg-red-500 border-red-600';
      case 'MISSING': return 'bg-slate-900 border-black';
      default: return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const handleSave = async () => {
    if (!selectedVehicle) return;
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    alert(`Vistoria da placa ${selectedVehicle.plate} salva!`);
    setIsSaving(false);
    setSelectedVehicleId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* SIDEBAR DE VEÍCULOS */}
      <div className={`w-full lg:w-80 flex flex-col border-r border-slate-100 dark:border-slate-800 ${selectedVehicleId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Layout className="h-5 w-5 text-blue-600"/> Pátio Virtual
          </h3>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar placa..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[500px] lg:max-h-none">
          {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => setSelectedVehicleId(v.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                selectedVehicleId === v.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Truck className={`h-5 w-5 ${selectedVehicleId === v.id ? 'text-white' : 'text-slate-400'}`} />
                <div>
                  <div className="font-black text-sm">{v.plate}</div>
                  <div className={`text-[10px] uppercase font-bold ${selectedVehicleId === v.id ? 'text-blue-100' : 'text-slate-400'}`}>{v.model}</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          )) : (
            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase italic">Nenhum veículo</div>
          )}
        </div>
      </div>

      {/* ÁREA DE AUDITORIA */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-h-[500px] ${!selectedVehicleId ? 'hidden lg:flex' : 'flex'}`}>
        
        {!selectedVehicle ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100 dark:border-slate-800">
              <Eye className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-400">Selecione um veículo</h3>
            <p className="text-xs text-slate-400 mt-2">Inicie a vistoria visual clicando em um caminhão.</p>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedVehicleId(null)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <X className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-none">{selectedVehicle.plate}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{selectedVehicle.model} • {selectedVehicle.axles} EIXOS</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase">
                 <History className="h-3 w-3"/> Auditoria Real-time
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
              <div className="relative flex flex-col items-center gap-16 w-full max-w-md">
                
                {/* CABINE */}
                <div className="w-40 h-24 bg-slate-200 dark:bg-slate-800 rounded-t-3xl border-4 border-slate-300 dark:border-slate-700 relative">
                   <div className="absolute -bottom-8 left-0 right-0 flex justify-between px-4">
                      {['1E', '1D'].map(pos => {
                        const tire = mountedTires.find(t => t.position === pos);
                        const status = tire ? auditData[tire.id] : undefined;
                        return (
                          <div 
                            key={pos}
                            onClick={() => tire && toggleTireStatus(tire.id)}
                            className={`w-10 h-16 rounded-lg border-2 flex flex-col items-center justify-center relative transition-transform hover:scale-110 cursor-pointer ${getStatusColor(status)} ${!tire && 'opacity-10 pointer-events-none'}`}
                          >
                            <span className="absolute -top-5 text-[8px] font-black text-slate-400">{pos}</span>
                            {tire && <span className={`text-[10px] font-black ${status ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{tire.fireNumber}</span>}
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* EIXOS */}
                {Array.from({ length: selectedVehicle.axles - 1 }).map((_, i) => {
                  const axleIdx = i + 2;
                  return (
                    <div key={axleIdx} className="w-56 h-3 bg-slate-300 dark:bg-slate-800 rounded-full relative">
                      <div className="absolute -top-10 -left-4 -right-4 flex justify-between">
                         <div className="flex gap-1.5">
                           {[`${axleIdx}EE`, `${axleIdx}EI`].map(pos => {
                             const tire = mountedTires.find(t => t.position === pos);
                             const status = tire ? auditData[tire.id] : undefined;
                             return (
                                <div key={pos} onClick={() => tire && toggleTireStatus(tire.id)} className={`w-10 h-16 rounded-lg border-2 flex flex-col items-center justify-center relative transition-transform hover:scale-110 cursor-pointer ${getStatusColor(status)} ${!tire && 'opacity-10 pointer-events-none'}`}>
                                  <span className="absolute -top-5 text-[8px] font-black text-slate-400">{pos}</span>
                                  {tire && <span className={`text-[10px] font-black ${status ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{tire.fireNumber}</span>}
                                </div>
                             )
                           })}
                         </div>
                         <div className="flex gap-1.5">
                           {[`${axleIdx}DI`, `${axleIdx}DE`].map(pos => {
                             const tire = mountedTires.find(t => t.position === pos);
                             const status = tire ? auditData[tire.id] : undefined;
                             return (
                                <div key={pos} onClick={() => tire && toggleTireStatus(tire.id)} className={`w-10 h-16 rounded-lg border-2 flex flex-col items-center justify-center relative transition-transform hover:scale-110 cursor-pointer ${getStatusColor(status)} ${!tire && 'opacity-10 pointer-events-none'}`}>
                                  <span className="absolute -top-5 text-[8px] font-black text-slate-400">{pos}</span>
                                  {tire && <span className={`text-[10px] font-black ${status ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{tire.fireNumber}</span>}
                                </div>
                             )
                           })}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                <input 
                  type="text" 
                  placeholder="Notas da vistoria..." 
                  className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <button 
                  onClick={handleSave}
                  disabled={isSaving || Object.keys(auditData).length === 0}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <LoaderIcon /> : <><Save className="h-5 w-5"/> Salvar</>}
                </button>
              </div>
              <div className="flex justify-center gap-4 mt-4 text-[10px] font-black text-slate-400 uppercase">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> OK</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Atenção</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Crítico</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-900"></div> Faltante</div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
