
import React, { useState, useMemo, useEffect, FC } from 'react';
import { Tire, Vehicle, TireStatus, UserLevel, SystemSettings, VehicleType } from '../types';
import { Truck, Search, X, CheckCircle2, Disc, ArrowDownCircle, ArrowUpCircle, ScanLine, Gauge, ArrowLeft, Container, RefreshCw, Repeat, ArrowRight, Activity, TrendingDown, Calendar, Milestone, Recycle, ChevronRight, Target, Move, ArrowRightLeft, MousePointerClick, Loader2, Package, AlertTriangle, RefreshCcw, Plus } from 'lucide-react';
import { Scanner } from './Scanner';
import { TireForm } from './TireForm';
import { isSteerAxle, getAxlePositions } from '../lib/vehicleUtils';

interface TireMovementProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  onUpdateTire: (tire: Tire) => Promise<void>;
  onAddTire: (tire: Tire) => Promise<void>;
  userLevel: UserLevel;
  settings?: SystemSettings;
  onNotification?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
  vehicleTypes?: VehicleType[];
}

// --- VISUAL SCHEMATIC COMPONENT (ATUALIZADO COM CORES) ---
const MovementSchematic: FC<{
  vehicle: Vehicle;
  mountedTires: Tire[];
  selectedPos: string | null;
  onSelectPos: (pos: string) => void;
  rotationSourcePos?: string | null;
  settings?: SystemSettings; // Recebe settings para limites de sulco
  vehicleTypes?: VehicleType[];
}> = ({ vehicle, mountedTires, selectedPos, onSelectPos, rotationSourcePos, settings, vehicleTypes = [] }) => {
  
  const width = 280; 
  const cx = width / 2;
  const startY = 70;
  const axleSpacing = 85; 
  const totalHeight = startY + (vehicle.axles * axleSpacing) + 20;

  // Graphic Element Constants
  const tireW = 28;
  const tireH = 48;
  
  const renderTire = (pos: string, x: number, y: number) => {
    const tire = mountedTires.find(t => t.position === pos);
    const isSelected = selectedPos === pos;
    const isRotationSource = rotationSourcePos === pos;
    
    // Visual Styles Logic based on Depth
    let fillColor = tire ? '#1e293b' : 'rgba(30, 41, 59, 0.1)'; 
    let strokeColor = tire ? '#334155' : '#475569';
    const strokeDash = tire ? 'none' : '4 4';

    // Health Colors
    if (tire) {
        const depth = tire.currentTreadDepth;
        const min = settings?.minTreadDepth || 3;
        const warn = settings?.warningTreadDepth || 5;

        if (depth <= min) {
            strokeColor = '#ef4444'; // Red
            fillColor = '#450a0a'; // Dark Red
        } else if (depth <= warn) {
            strokeColor = '#f59e0b'; // Amber
            fillColor = '#451a03'; // Dark Amber
        } else {
            strokeColor = '#10b981'; // Green
            fillColor = '#064e3b'; // Dark Green
        }
    }
    
    // Selection Override
    if (isSelected) strokeColor = '#3b82f6';
    if (isRotationSource) strokeColor = '#a855f7';

    return (
      <g
        key={pos}
        onClick={() => onSelectPos(pos)}
        className={`transition-all duration-200 cursor-pointer group`}
        style={{ transformOrigin: `${x}px ${y}px`, transform: isSelected ? 'scale(1.1)' : 'scale(1)' }}
      >
        {/* Selection/Action Glow */}
        {(isSelected || isRotationSource) && (
            <rect
                x={x - (tireW/2 + 4)} y={y - (tireH/2 + 4)} width={tireW + 8} height={tireH + 8} rx="6"
                fill="none" stroke={isSelected ? '#60a5fa' : '#c084fc'} strokeWidth="2" opacity="0.8"
                className="animate-pulse"
            />
        )}

        {/* Hover Effect Ring */}
        <rect
            x={x - (tireW/2 + 2)} y={y - (tireH/2 + 2)} width={tireW + 4} height={tireH + 4} rx="5"
            fill="transparent" stroke="white" strokeWidth="2" opacity="0"
            className="group-hover:opacity-30 transition-opacity"
        />

        {/* Tire Body */}
        <rect 
            x={x - tireW/2} y={y - tireH/2} width={tireW} height={tireH} rx="4" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth={tire ? 2 : 1.5}
            strokeDasharray={strokeDash}
        />
        
        {/* Detail Lines (If Tire Present) */}
        {tire && (
            <>
                <path d={`M ${x-6} ${y-12} L ${x+6} ${y-12}`} stroke={strokeColor} strokeWidth="1" opacity="0.5" />
                <path d={`M ${x-6} ${y+12} L ${x+6} ${y+12}`} stroke={strokeColor} strokeWidth="1" opacity="0.5" />
            </>
        )}

        {/* Info Badge */}
        <g transform={`translate(${x}, ${y + 32})`}>
            {tire ? (
                <>
                    <rect x="-20" y="-6" width="40" height="12" rx="2" fill="white" stroke="none" filter="drop-shadow(0 1px 1px rgba(0,0,0,0.1))" />
                    <text y="3" textAnchor="middle" fontSize="7" fontWeight="900" fill="#0f172a">{tire.fireNumber}</text>
                </>
            ) : (
                <text y="2" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#64748b" className="group-hover:fill-blue-500 transition-colors">VAGO</text>
            )}
        </g>
        
        {/* Position Label */}
        <text x={x} y={y - 30} textAnchor="middle" fontSize="7" fontWeight="bold" fill={isSelected ? '#3b82f6' : '#94a3b8'}>{pos}</text>
      </g>
    );
  };

  return (
    <div className="w-full h-full flex justify-center items-center p-6 bg-slate-50 dark:bg-slate-950/50 overflow-y-auto custom-scrollbar border-r border-slate-200 dark:border-slate-800">
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="drop-shadow-xl shrink-0" style={{ maxWidth: '100%', height: 'auto', maxHeight: '100%' }}>
        {/* Chassis */}
        <rect x={cx - 6} y={40} width={12} height={totalHeight - 80} rx="3" fill="#1e293b" />
        {/* Cabin Indicator */}
        {!vehicle.type.toUpperCase().includes('CARRETA') && (
          <path d={`M ${cx-30} 30 L ${cx+30} 30 L ${cx+35} 55 L ${cx-35} 55 Z`} fill="#334155" opacity="0.5" />
        )}
        
        {Array.from({ length: vehicle.axles }).map((_, i) => {
          const y = startY + (i * axleSpacing);
          const isSteer = isSteerAxle(vehicle.type, i, vehicleTypes);
          const isSupport = vehicle.type === 'BI-TRUCK' && i === vehicle.axles - 1;
          return (
            <g key={i}>
              <rect x={cx - 100} y={y - 3} width={200} height={6} rx="2" fill="#1e293b" />
              {isSteer ? (
                <>
                  {renderTire(`${i + 1}E`, cx - 75, y)}
                  {renderTire(`${i + 1}D`, cx + 75, y)}
                </>
              ) : isSupport ? (
                <>
                  {/* Eixo de apoio (ex: 4º eixo do bi-truck) tem 4 pneus ou 2? Vamos assumir 4 por padrão ou 2 dependendo da regra. A regra em getAxlePositions diz que se não for steer, são 4. */}
                  {renderTire(`${i + 1}EE`, cx - 95, y)}
                  {renderTire(`${i + 1}EI`, cx - 60, y)}
                  {renderTire(`${i + 1}DI`, cx + 60, y)}
                  {renderTire(`${i + 1}DE`, cx + 95, y)}
                </>
              ) : (
                <>
                  {renderTire(`${i + 1}EE`, cx - 95, y)}
                  {renderTire(`${i + 1}EI`, cx - 60, y)}
                  {renderTire(`${i + 1}DI`, cx + 60, y)}
                  {renderTire(`${i + 1}DE`, cx + 95, y)}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const TireMovement: FC<TireMovementProps> = ({ 
  tires: allTires, 
  vehicles, 
  branches = [],
  defaultBranchId,
  onUpdateTire, 
  onAddTire, 
  userLevel, 
  settings, 
  onNotification,
  vehicleTypes = []
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPos, setSelectedPos] = useState<string | null>(null);
  
  // Operation States
  const [rotationSource, setRotationSource] = useState<string | null>(null); 
  const [isQuickSwapMode, setIsQuickSwapMode] = useState(false); 
  const [stockSearch, setStockSearch] = useState('');
  const [mountKm, setMountKm] = useState<number>(0);
  const [mountDate, setMountDate] = useState(new Date().toISOString().split('T')[0]); // Added Date State
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDismountConfirm, setShowDismountConfirm] = useState(false);

  // States for Swap Modal
  const [swapInTire, setSwapInTire] = useState<Tire | null>(null);
  const [swapOutDepth, setSwapOutDepth] = useState<string>('');
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [isSwapConfirmOpen, setIsSwapConfirmOpen] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const tires = useMemo(() => {
    // Pneus agora são universais, mostramos todos independentemente da filial selecionada
    return allTires;
  }, [allTires]);

  const mountedTires = useMemo(() => {
    if (!selectedVehicle) return [];
    return tires.filter(t => t.vehicleId === selectedVehicle.id);
  }, [tires, selectedVehicle]);

  const selectedTire = useMemo(() => {
      if (!selectedPos) return null;
      return mountedTires.find(t => t.position === selectedPos);
  }, [selectedPos, mountedTires]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        const matchesSearch = v.plate.toUpperCase().includes(searchTerm.toUpperCase());
        return matchesSearch;
      })
      .sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, searchTerm]);

  // Reset states when position changes
  useEffect(() => {
      setShowDismountConfirm(false);
      setIsQuickSwapMode(false);
      setSwapInTire(null);
      setSwapOutDepth('');
      setIsSwapConfirmOpen(false);
  }, [selectedPos]);

  // When selecting vehicle, reset internal states
  const handleSelectVehicle = (vehicle: Vehicle) => {
      setSelectedVehicle(vehicle);
      setSelectedPos(null);
      setRotationSource(null);
  };

  const availableStock = useMemo(() => {
    return tires.filter(t => {
      const vId = t.vehicleId ? String(t.vehicleId).trim().toLowerCase() : '';
      const isMounted = vId !== '' && vId !== 'null' && vId !== 'undefined';
      
      return !isMounted && 
             t.status !== TireStatus.DAMAGED && 
             t.status !== TireStatus.RETREADING && 
             (t.fireNumber.toLowerCase().includes(stockSearch.toLowerCase()) || 
              t.brand.toLowerCase().includes(stockSearch.toLowerCase()));
    });
  }, [tires, stockSearch, defaultBranchId]);

  // --- HANDLERS ---

  const handlePosClick = (pos: string) => {
      if (rotationSource) {
          if (rotationSource === pos) {
              setRotationSource(null); 
          } else {
              handleRotateConfirm(rotationSource, pos);
          }
      } else {
          setSelectedPos(pos);
          setMountKm(selectedVehicle?.odometer || 0); 
          setMountDate(new Date().toISOString().split('T')[0]); // Reset date to today
          setStockSearch('');
      }
  };

  const handleMount = async (tireToMount: Tire) => {
      if (!selectedVehicle || !selectedPos) return;
      if (isProcessing) return;

      setIsProcessing(true);
      try {
          // Construct the date with current time to preserve order but respect selected date
          const dateObj = new Date(mountDate + 'T12:00:00');
          const now = new Date();
          dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          const finalDate = dateObj.toISOString();

          const updatedTire: Tire = {
              ...tireToMount,
              vehicleId: selectedVehicle.id,
              position: selectedPos,
              installOdometer: mountKm,
              installDate: finalDate, // Save Install Date
              location: selectedVehicle.plate,
              branchId: defaultBranchId || tireToMount.branchId, // Atualiza para a filial onde a ação ocorre
              history: [...(tireToMount.history || []), {
                  date: finalDate,
                  action: 'MONTADO',
                  details: `Montado em ${selectedVehicle.plate} pos ${selectedPos} com KM ${mountKm}`
              }]
          };
          await onUpdateTire(updatedTire);
          setSelectedPos(null); 
      } catch (err) {
          alert("Erro ao montar pneu.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDismount = async () => {
      if (!selectedVehicle || !selectedTire) return;
      if (isProcessing) return;

      const freshTire = tires.find(t => t.id === selectedTire.id);
      if (!freshTire) return;

      setIsProcessing(true);
      try {
          const currentOdometer = typeof selectedVehicle.odometer === 'number' ? selectedVehicle.odometer : 0;
          const installOdometer = typeof freshTire.installOdometer === 'number' ? freshTire.installOdometer : 0;
          
          let kmsRun = 0;
          if (currentOdometer >= installOdometer) {
              kmsRun = currentOdometer - installOdometer;
          }
          
          const currentTotalKms = typeof freshTire.totalKms === 'number' ? freshTire.totalKms : 0;

          const updatedTire: Tire = {
              ...freshTire,
              status: TireStatus.USED, 
              vehicleId: null, 
              position: null,  
              installOdometer: 0, 
              installDate: undefined, // Clear install date
              location: 'Estoque',
              branchId: defaultBranchId || freshTire.branchId, // Atualiza para a filial onde a ação ocorre
              totalKms: currentTotalKms + kmsRun,
              history: [...(freshTire.history || []), {
                  date: new Date().toISOString(),
                  action: 'DESMONTADO',
                  details: `Desmontado de ${selectedVehicle.plate} pos ${selectedPos}. Rodou ${kmsRun}km.`
              }]
          };
          
          await onUpdateTire(updatedTire);
          setSelectedPos(null);
      } catch (error) {
          console.error("Dismount Error:", error);
          alert("Erro ao desmontar pneu. Tente novamente.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleQuickSwapClick = (tireIn: Tire) => {
      if (!selectedTire) return;
      setSwapInTire(tireIn);
      setSwapOutDepth(selectedTire.currentTreadDepth.toString());
      setIsSwapConfirmOpen(true);
  };

  const confirmQuickSwap = async () => {
      if (!selectedVehicle || !selectedPos || !selectedTire || !swapInTire) return;
      if (isProcessing) return;

      const tireOut = tires.find(t => t.id === selectedTire.id);
      if (!tireOut) return;

      const finalDepth = parseFloat(swapOutDepth);
      if (isNaN(finalDepth) || finalDepth < 0 || finalDepth > 30) {
          alert("Por favor, informe um sulco válido.");
          return;
      }

      setIsProcessing(true);
      try {
          const now = new Date().toISOString();
          const currentOdometer = typeof selectedVehicle.odometer === 'number' ? selectedVehicle.odometer : 0;
          
          // 1. Processar Saída (Dismount)
          const installOdometer = typeof tireOut.installOdometer === 'number' ? tireOut.installOdometer : 0;
          const kmsRun = Math.max(0, currentOdometer - installOdometer);
          const currentTotalKms = typeof tireOut.totalKms === 'number' ? tireOut.totalKms : 0;

          const updatedTireOut: Tire = {
              ...tireOut,
              status: TireStatus.USED,
              vehicleId: null,
              position: null,
              installOdometer: 0,
              installDate: undefined,
              currentTreadDepth: finalDepth, // Atualiza com o valor informado
              location: 'Estoque',
              branchId: defaultBranchId || tireOut.branchId, // Atualiza para a filial onde a ação ocorre
              totalKms: currentTotalKms + kmsRun,
              history: [...(tireOut.history || []), {
                  date: now,
                  action: 'DESMONTADO',
                  details: `Troca Rápida (SAÍDA): ${selectedVehicle.plate} pos ${selectedPos}. Rodou ${kmsRun}km. Sulco Final: ${finalDepth}mm.`
              }]
          };

          // 2. Processar Entrada (Mount)
          const updatedTireIn: Tire = {
              ...swapInTire,
              vehicleId: selectedVehicle.id,
              position: selectedPos,
              installOdometer: currentOdometer,
              installDate: now,
              location: selectedVehicle.plate,
              branchId: defaultBranchId || swapInTire.branchId, // Atualiza para a filial onde a ação ocorre
              history: [...(swapInTire.history || []), {
                  date: now,
                  action: 'MONTADO',
                  details: `Troca Rápida (ENTRADA): ${selectedVehicle.plate} pos ${selectedPos} com KM ${currentOdometer}`
              }]
          };

          // Executar atualizações
          await onUpdateTire(updatedTireOut);
          await onUpdateTire(updatedTireIn);

          setIsQuickSwapMode(false);
          setIsSwapConfirmOpen(false);
          setSwapInTire(null);
          setSelectedPos(null);
      } catch (err) {
          console.error(err);
          alert("Erro na troca rápida. Verifique a conexão.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleRotateStart = () => {
      if (!selectedPos || !selectedTire) return;
      setRotationSource(selectedPos);
      setSelectedPos(null); 
  };

  const handleRotateConfirm = async (source: string, target: string) => {
      if (!selectedVehicle) return;
      setIsProcessing(true);
      
      try {
          const tireA = mountedTires.find(t => t.position === source);
          const tireB = mountedTires.find(t => t.position === target);
          const now = new Date().toISOString();

          if (!tireA) return;

          // Update Tire A
          await onUpdateTire({
              ...tireA,
              position: target,
              branchId: defaultBranchId || tireA.branchId, // Atualiza para a filial onde a ação ocorre
              history: [...(tireA.history || []), { date: now, action: 'EDITADO', details: `Rodízio: ${source} -> ${target}` }]
          });

          // Update Tire B (if exists)
          if (tireB) {
              await onUpdateTire({
                  ...tireB,
                  position: source,
                  branchId: defaultBranchId || tireB.branchId, // Atualiza para a filial onde a ação ocorre
                  history: [...(tireB.history || []), { date: now, action: 'EDITADO', details: `Rodízio: ${target} -> ${source}` }]
              });
          }

          setRotationSource(null);
      } catch (err) {
          alert("Erro ao realizar rodízio.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (isRegisteringNew && selectedVehicle && selectedPos) {
      return (
          <div className="h-[calc(100vh-120px)] bg-white dark:bg-slate-900 overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-500" />
                      Cadastrar e Montar Pneu
                  </h2>
                  <button onClick={() => setIsRegisteringNew(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <X className="h-5 w-5 text-slate-500" />
                  </button>
              </div>
              <div className="p-4">
                  <TireForm 
                      onAddTire={async (tire) => {
                          await onAddTire(tire);
                          setIsRegisteringNew(false);
                          setStockSearch(tire.fireNumber);
                      }}
                      onCancel={() => setIsRegisteringNew(false)}
                      onFinish={() => setIsRegisteringNew(false)}
                      existingTires={tires}
                      settings={settings}
                      autoMountVehicleId={selectedVehicle.id}
                      autoMountPosition={selectedPos}
                  />
              </div>
          </div>
      );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row bg-white dark:bg-slate-900 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
      
      {/* SIDEBAR: SELEÇÃO DE VEÍCULO */}
      <div className={`w-full lg:w-80 flex flex-col border-r border-slate-100 dark:border-slate-800 ${selectedVehicle ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-purple-600"/> Movimentação
          </h3>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar placa..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[500px] lg:max-h-none custom-scrollbar">
          {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
            <button 
              key={v.id}
              onClick={() => handleSelectVehicle(v)}
              className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                selectedVehicle?.id === v.id 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <Truck className={`h-5 w-5 ${selectedVehicle?.id === v.id ? 'text-white' : 'text-slate-400'}`} />
                <div>
                  <div className="font-black text-sm">{v.plate}</div>
                  <div className={`text-[10px] uppercase font-bold ${selectedVehicle?.id === v.id ? 'text-purple-100' : 'text-slate-400'}`}>{v.model}</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          )) : (
            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase italic">Nenhum veículo</div>
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: ESQUEMA E AÇÕES */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/20 overflow-hidden relative ${!selectedVehicle ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* HEADER DA ÁREA PRINCIPAL */}
        {selectedVehicle && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedVehicle(null)} className="lg:hidden p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                        <ArrowLeft className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white leading-none">{selectedVehicle.plate}</h2>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Modo Movimentação</span>
                    </div>
                </div>
                {rotationSource && (
                    <div className="animate-pulse bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border border-purple-200 dark:border-purple-800 shadow-sm">
                        <Target className="h-4 w-4"/> Destino do Rodízio
                        <button onClick={() => setRotationSource(null)} className="ml-2 hover:bg-purple-200 rounded-full p-1"><X className="h-3 w-3"/></button>
                    </div>
                )}
            </div>
        )}

        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {selectedVehicle ? (
                <>
                    <MovementSchematic 
                        vehicle={selectedVehicle}
                        mountedTires={mountedTires}
                        selectedPos={selectedPos}
                        onSelectPos={handlePosClick}
                        rotationSourcePos={rotationSource}
                        settings={settings}
                        vehicleTypes={vehicleTypes}
                    />
                    {!selectedPos && !rotationSource && (
                        <div className="absolute top-10 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-bounce cursor-default pointer-events-none">
                            <div className="p-2 bg-purple-600 rounded-full text-white">
                                <MousePointerClick className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 dark:text-white text-sm">Selecione uma posição</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Para montar, desmontar ou rodízio</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 shadow-md border border-slate-100 dark:border-slate-800">
                        <ArrowRightLeft className="h-8 w-8 text-purple-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-400">Selecione um veículo</h3>
                    <p className="text-xs text-slate-400 mt-2">Inicie a gestão de pneus clicando em um caminhão.</p>
                </div>
            )}
        </div>

        {/* MODAL: ACTIONS & STOCK SELECTION */}
        {selectedPos && (
            <div className="absolute inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95">
                    
                    {/* Modal Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Posição</span>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white bg-blue-100 text-blue-700 px-2 py-0.5 rounded inline-block">{selectedPos}</h2>
                        </div>
                        <button onClick={() => setSelectedPos(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-6 w-6 text-slate-500"/></button>
                    </div>

                    {isSwapConfirmOpen && selectedTire && swapInTire ? (
                        // --- CONFIRM SWAP (DEPTH INPUT) ---
                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 h-full flex flex-col justify-center">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Registro de Saída</h3>
                                <p className="text-xs text-slate-500">Pneu <strong>{selectedTire.fireNumber}</strong> sendo removido.</p>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-orange-200 dark:border-orange-800 mb-6">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">Informe o Sulco Final (mm)</label>
                                <input 
                                    type="number"
                                    autoFocus
                                    className="w-full text-center text-4xl font-black bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-300"
                                    placeholder="0.0"
                                    value={swapOutDepth}
                                    onChange={e => setSwapOutDepth(e.target.value)}
                                />
                                <p className="text-[10px] text-center text-slate-400 mt-2">Necessário para cálculo de CPK e Valor Residual.</p>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setIsSwapConfirmOpen(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 text-slate-500 font-bold rounded-xl shadow-sm">Voltar</button>
                                <button onClick={confirmQuickSwap} className="flex-[2] py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                    {isProcessing ? <Loader2 className="animate-spin"/> : <CheckCircle2 className="h-5 w-5"/>} Confirmar Troca
                                </button>
                            </div>
                        </div>
                    ) : selectedTire && !isQuickSwapMode ? (
                        // --- TIRE IS MOUNTED: SHOW ACTIONS ---
                        <div className="p-6 space-y-6">
                            {/* Tire Info Card */}
                            <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-lg border border-slate-700 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Disc className="h-24 w-24"/></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-3xl font-black tracking-tight">{selectedTire.fireNumber}</h3>
                                        <span className="text-[9px] font-bold bg-slate-600 px-2 py-1 rounded text-white uppercase">{selectedTire.status}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wide">{selectedTire.brand} {selectedTire.model}</p>
                                    <div className="flex gap-4 mt-4 pt-4 border-t border-slate-700">
                                        <div className="flex items-center gap-1.5 text-xs font-bold"><Gauge className="h-3 w-3 text-blue-400"/> {selectedTire.pressure} PSI</div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold"><Activity className="h-3 w-3 text-green-400"/> {selectedTire.currentTreadDepth} mm</div>
                                    </div>
                                </div>
                            </div>

                            {!showDismountConfirm ? (
                                <div className="space-y-3">
                                    <button onClick={handleRotateStart} disabled={isProcessing} className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm uppercase tracking-wide">
                                        <Repeat className="h-5 w-5"/> Iniciar Rodízio
                                    </button>
                                    <button onClick={() => setIsQuickSwapMode(true)} disabled={isProcessing} className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm uppercase tracking-wide">
                                        <RefreshCcw className="h-5 w-5"/> Troca Rápida
                                    </button>
                                    <button onClick={() => setShowDismountConfirm(true)} disabled={isProcessing} className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all text-sm uppercase tracking-wide">
                                        <ArrowUpCircle className="h-5 w-5"/> Desmontar Pneu
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900 text-center">
                                        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2"/>
                                        <h4 className="font-bold text-red-700 dark:text-red-400">Confirmar Desmontagem?</h4>
                                        <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">O pneu será removido do veículo e voltará para o <strong>Estoque</strong> com status <strong>USADO</strong>.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowDismountConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm">Cancelar</button>
                                        <button onClick={handleDismount} disabled={isProcessing} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2">
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Package className="h-4 w-4"/>} Confirmar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- POSITION EMPTY OR QUICK SWAP: SHOW STOCK ---
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {isQuickSwapMode ? (
                                            <RefreshCcw className="h-5 w-5 text-orange-500"/>
                                        ) : (
                                            <ArrowDownCircle className="h-5 w-5 text-green-500"/>
                                        )}
                                        <span className="font-bold text-slate-800 dark:text-white text-sm">
                                            {isQuickSwapMode ? 'Selecione o Substituto' : 'Montar Pneu'}
                                        </span>
                                    </div>
                                    {isQuickSwapMode && (
                                        <button onClick={() => setIsQuickSwapMode(false)} className="text-xs text-slate-400 font-bold hover:text-slate-600">Cancelar Troca</button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                                        <input 
                                            type="text" 
                                            placeholder="Filtrar estoque..." 
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-500 text-slate-800 dark:text-white"
                                            value={stockSearch}
                                            onChange={e => setStockSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setIsScannerOpen(true)}
                                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                                        title="Escanear QR Code"
                                    >
                                        <ScanLine className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => setIsRegisteringNew(true)}
                                        className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                                        title="Cadastrar e Montar Novo Pneu"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Novo
                                    </button>
                                </div>
                                {!isQuickSwapMode && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">KM:</label>
                                            <input 
                                                type="number" 
                                                className="flex-1 bg-transparent font-bold text-slate-800 dark:text-white outline-none text-sm w-full"
                                                value={mountKm}
                                                onChange={e => setMountKm(Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">Data:</label>
                                            <input 
                                                type="date" 
                                                className="flex-1 bg-transparent font-bold text-slate-800 dark:text-white outline-none text-sm w-full"
                                                value={mountDate}
                                                onChange={e => setMountDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
                                {availableStock.length === 0 ? (
                                    <div className="text-center text-slate-400 py-10">
                                        <Disc className="h-10 w-10 mx-auto mb-2 opacity-30"/>
                                        <p className="text-xs font-medium">Estoque vazio.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="p-3">Fogo / ID</th>
                                                <th className="p-3">Marca / Modelo</th>
                                                <th className="p-3 text-right">Sulco</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {availableStock.map(t => (
                                                <tr 
                                                    key={t.id} 
                                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
                                                    onClick={() => isQuickSwapMode ? handleQuickSwapClick(t) : handleMount(t)}
                                                >
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-slate-800 dark:text-white">{t.fireNumber}</span>
                                                            {t.status === TireStatus.NEW && <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded font-bold">NOVO</span>}
                                                            {t.status === TireStatus.RETREADED && <span className="text-[8px] bg-purple-100 text-purple-700 px-1 rounded font-bold">RECAP</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">{t.brand}</div>
                                                        <div className="text-[9px] text-slate-400 uppercase">{t.model}</div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <span className="font-black text-slate-700 dark:text-slate-300">{t.currentTreadDepth}mm</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

                {/* SCANNER MODAL */}
                {isScannerOpen && (
                    <Scanner 
                        onClose={() => setIsScannerOpen(false)}
                        onScan={(data) => {
                            const tire = tires.find(t => t.fireNumber.toUpperCase() === data.trim().toUpperCase());
                            if (tire) {
                                if (tire.status === TireStatus.DAMAGED) {
                                    onNotification?.('Atenção', `Pneu ${tire.fireNumber} não está disponível para montagem (Status: ${tire.status}).`, 'info');
                                } else if (tire.vehicleId) {
                                    onNotification?.('Atenção', `Pneu ${tire.fireNumber} já está montado em outro veículo.`, 'info');
                                } else {
                                    onNotification?.('Sucesso', `Pneu ${tire.fireNumber} identificado!`, 'success');
                                    if (isQuickSwapMode) {
                                        handleQuickSwapClick(tire);
                                    } else {
                                        handleMount(tire);
                                    }
                                    setIsScannerOpen(false);
                                }
                            } else {
                                onNotification?.('Erro', `Pneu com código "${data}" não encontrado no sistema.`, 'error');
                            }
                        }}
                        title="Escanear Pneu para Montagem"
                        placeholder="Número de fogo..."
                        mode="QR"
                    />
                )}
            </div>
        </div>
    );
};
