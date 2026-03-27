
import React, { useState, useMemo, FC, useRef, useEffect } from 'react';
import { Tire, Vehicle, SystemSettings, VisualDamage, ServiceOrder, InspectionRecord } from '../types';
import { 
  Search, Truck, ArrowLeft, CheckCircle2, AlertOctagon, AlertTriangle, X, Save, Activity, Gauge, Ruler, Target, GitCompare, Loader2, ChevronRight, Target as TargetIcon, MousePointer2, Camera, ScanLine, Info, CheckSquare, Square
} from 'lucide-react';
import { TireComparison } from './TireComparison';

interface InspectionHubProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  onUpdateTire: (tire: Tire) => Promise<void>;
  onCreateServiceOrder: (order: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt' | 'createdBy'>) => Promise<void>;
  settings?: SystemSettings;
}

type InspectionDataMap = Record<string, InspectionRecord>;

const DAMAGE_OPTIONS: { id: VisualDamage, label: string }[] = [
    { id: 'CORTE', label: 'Corte/Rasgo Lateral' },
    { id: 'BOLHA', label: 'Bolha na Lateral' },
    { id: 'FURO', label: 'Objeto Perfurante' },
    { id: 'DESGASTE_IRREGULAR', label: 'Desgaste Irregular' },
    { id: 'OUTRO', label: 'Outros Danos' }
];

const SmartTreadGuideModal: FC<{ onClose: () => void; onCapture: (val: number) => void }> = ({ onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [manualValue, setManualValue] = useState('');

    useEffect(() => {
        const startCamera = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment', width: { ideal: 1280 } } 
                });
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
            } catch (e) {
                console.error("Camera error", e);
            }
        };
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, []);

    const capture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                setCapturedImage(canvas.toDataURL('image/png'));
                if(stream) stream.getTracks().forEach(t => t.stop());
            }
        }
    };

    const confirm = () => {
        const val = parseFloat(manualValue);
        if (!isNaN(val) && val >= 0 && val <= 30) {
            onCapture(val);
            onClose();
        } else {
            alert("Insira um valor válido.");
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
            <div className="p-4 flex justify-between items-center text-white bg-black/50 absolute top-0 left-0 right-0 z-10">
                <h3 className="font-bold flex items-center gap-2"><ScanLine className="h-5 w-5 text-green-400"/> Guia de Medição TWI</h3>
                <button onClick={onClose}><X className="h-6 w-6"/></button>
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {!capturedImage ? (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
                        
                        {/* GUIDE OVERLAY */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                            <div className="w-64 h-64 border-2 border-green-500/50 rounded-lg relative">
                                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-sm"></div>
                                <p className="absolute -top-8 w-full text-center text-green-400 font-bold text-xs bg-black/50 px-2 py-1 rounded">Alinhe a régua/paquímetro aqui</p>
                            </div>
                        </div>

                        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                            <button onClick={capture} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 shadow-lg"></button>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6">
                        <img src={capturedImage} className="max-h-[50vh] rounded-lg border border-slate-700 mb-6" alt="Capture" />
                        <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center">
                            <p className="text-sm font-bold text-slate-500 mb-2 uppercase">Insira a leitura visual</p>
                            <div className="flex items-center gap-2 justify-center mb-4">
                                <input 
                                    type="number" 
                                    autoFocus
                                    className="w-24 text-center text-4xl font-black border-b-2 border-green-500 outline-none text-slate-800"
                                    placeholder="0.0"
                                    value={manualValue}
                                    onChange={e => setManualValue(e.target.value)}
                                />
                                <span className="text-xl font-bold text-slate-400">mm</span>
                            </div>
                            <button onClick={confirm} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg">Confirmar Leitura</button>
                            <button onClick={() => { setCapturedImage(null); setManualValue(''); }} className="w-full py-3 mt-2 text-slate-500 font-bold">Tentar Novamente</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TireWearProfile: FC<{ d1: number; d2: number; d3: number; d4: number; }> = ({ d1, d2, d3, d4 }) => {
  const width = 300;
  const height = 14; 
  const paddingX = 35; 
  const maxMm = 20; 
  const plotHeight = height - 4;
  const yBase = height - 2;
  
  const mapDepthToY = (mm: number) => {
      const val = Math.max(0, Math.min(Number(mm), maxMm));
      return yBase - ((val / maxMm) * plotHeight);
  };

  const y1 = mapDepthToY(d1);
  const y2 = mapDepthToY(d2);
  const y3 = mapDepthToY(d3);
  const y4 = mapDepthToY(d4);
  
  const x1 = paddingX;
  const x2 = paddingX + (width - 2 * paddingX) / 3;
  const x3 = paddingX + 2 * (width - 2 * paddingX) / 3;
  const x4 = width - paddingX;

  const pathData = `M ${x1} ${yBase} L ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1} ${x2} ${y2} Q ${(x2 + x3) / 2} ${y2} ${x3} ${y3} Q ${(x3 + x4) / 2} ${y3} ${x4} ${y4} L ${x4} ${yBase} Z`;

  return (
    <div className="w-full px-2 mb-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <path d={pathData} fill="#000" opacity="0.9" stroke="#10b981" strokeWidth="1.5" />
        <circle cx={x1} cy={y1} r="3" fill="#10b981" className="drop-shadow-sm" />
        <circle cx={x2} cy={y2} r="3" fill="#10b981" className="drop-shadow-sm" />
        <circle cx={x3} cy={y3} r="3" fill="#10b981" className="drop-shadow-sm" />
        <circle cx={x4} cy={y4} r="3" fill="#10b981" className="drop-shadow-sm" />
      </svg>
    </div>
  );
};

const ProVehicleSchematic: FC<{
  vehicle: Vehicle;
  mountedTires: Tire[];
  inspectionData: InspectionDataMap;
  activeTireId?: string | null;
  onTireSelect: (tireId: string) => void;
  settings?: SystemSettings;
}> = ({ vehicle, mountedTires, inspectionData, activeTireId, onTireSelect, settings }) => {
  const width = 280; 
  const cx = width / 2;
  const startY = 70;
  const axleSpacing = 85; 
  const totalHeight = startY + (vehicle.axles * axleSpacing) + 20;

  const renderTire = (pos: string, x: number, y: number) => {
    const tire = mountedTires.find(t => t.position === pos);
    const isActive = tire?.id === activeTireId;
    const data = tire ? inspectionData[tire.id] : null;
    
    let statusColor = "#334155"; 
    if (tire) {
        const depth = data?.depth !== undefined ? data.depth : tire.currentTreadDepth;
        if (depth <= (settings?.minTreadDepth || 3)) statusColor = "#ef4444";
        else if (depth <= (settings?.warningTreadDepth || 5)) statusColor = "#f59e0b";
        else statusColor = "#10b981";
    }

    return (
      <g
        key={pos}
        onClick={() => tire && onTireSelect(tire.id)}
        className={`transition-all duration-300 ${tire ? 'cursor-pointer hover:brightness-125' : 'opacity-10'}`}
      >
        {isActive && (
          <rect x={x - 17} y={y - 27} width={34} height={54} rx="6" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.5" className="animate-pulse" />
        )}
        <rect x={x - 15} y={y - 25} width={30} height={50} rx="5" fill="#0f172a" stroke={isActive ? "#3b82f6" : "#1e293b"} strokeWidth={isActive ? 2 : 1} />
        {tire && (
          <g transform={`translate(${x}, ${y + 35})`}>
            <rect x="-18" y="-7" width="36" height="14" rx="3" fill="#fff" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.2))" />
            <text y="3" textAnchor="middle" fontSize="8" fontWeight="900" fill="#0f172a">{tire.fireNumber}</text>
            <circle cx="0" cy="12" r="3" fill={statusColor} />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="w-full h-full flex justify-center items-center p-6 bg-slate-50 dark:bg-slate-950/50 overflow-y-auto custom-scrollbar border-r border-slate-200 dark:border-slate-800">
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="drop-shadow-2xl shrink-0" style={{ maxWidth: '100%', height: 'auto', maxHeight: '100%' }}>
        <rect x={cx - 6} y={40} width={12} height={totalHeight - 80} rx="3" fill="#1e293b" />
        <path d={`M ${cx-30} 30 L ${cx+30} 30 L ${cx+35} 55 L ${cx-35} 55 Z`} fill="#334155" opacity="0.5" />
        {Array.from({ length: vehicle.axles }).map((_, i) => {
          const y = startY + (i * axleSpacing);
          const isSteer = vehicle.type === 'CAVALO' && i === 0;
          return (
            <g key={i}>
              <rect x={cx - 100} y={y - 3} width={200} height={6} rx="2" fill="#1e293b" />
              {isSteer ? (
                <>
                  {renderTire(`${i + 1}E`, cx - 75, y)}
                  {renderTire(`${i + 1}D`, cx + 75, y)}
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

interface ProInspectionPanelProps {
  tire: Tire;
  vehicle: Vehicle;
  data: InspectionRecord;
  onChange: (tireId: string, field: string, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
  onQuickSave: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
  settings?: SystemSettings;
  isSaving?: boolean;
}

const ProInspectionPanel: FC<ProInspectionPanelProps> = ({
  tire, vehicle, data, onChange, onNext, onPrev, onQuickSave, isFirst, isLast, settings, isSaving
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const kmRunOnVehicle = Math.max(0, vehicle.odometer - (tire.installOdometer || 0));
  const liveTotalKm = (tire.totalKms || 0) + kmRunOnVehicle;

  const toggleDamage = (damage: VisualDamage) => {
      const current = data.visualDamages || [];
      onChange(tire.id, 'visualDamages', current.includes(damage) ? current.filter(d => d !== damage) : [...current, damage]);
  };

  const handleCameraCapture = (val: number) => {
      // Set all depth fields to the captured value for simplicity, or just depth1
      onChange(tire.id, 'depth1', val);
      onChange(tire.id, 'depth2', val);
      onChange(tire.id, 'depth3', val);
      onChange(tire.id, 'depth4', val);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 w-full md:w-[400px] shrink-0 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-20">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Posição {tire.position}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{tire.brand} {tire.model}</span>
        </div>
        <h2 className="text-4xl font-black text-slate-800 dark:text-white leading-none">{tire.fireNumber}</h2>
        <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tight bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span>Km Total: <span className="text-slate-800 dark:text-white">{liveTotalKm.toLocaleString()}</span></span>
            <span className="w-px h-3 bg-slate-200 dark:bg-slate-700"></span>
            <span>Média Sulco: <span className="text-slate-800 dark:text-white font-black">{data.depth?.toFixed(1) || tire.currentTreadDepth.toFixed(1)}mm</span></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* PRESSURE SECTION */}
        <div className="space-y-2">
            <div className="flex justify-between items-end">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><Gauge className="h-4 w-4 text-blue-500"/> Pressão PSI</h4>
               <span className="text-[10px] font-bold text-slate-500">Alvo: {tire.targetPressure || 110}</span>
            </div>
            <input 
                type="number" 
                value={data.pressure !== undefined ? data.pressure : ''}
                onChange={(e) => onChange(tire.id, 'pressure', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-4xl font-black text-center text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder={String(tire.pressure)}
            />
        </div>

        {/* DEPTH SECTION - FIXED 4 POINTS ALWAYS */}
        <div className="space-y-1">
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><Ruler className="h-4 w-4 text-indigo-500"/> Medição de Sulcos (mm)</h4>
                <button 
                    onClick={() => setShowCamera(true)}
                    className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                >
                    <Camera className="h-3 w-3" /> Guia Visual
                </button>
            </div>
            
            {/* Ilustração ultra-compacta com cores preto/verde */}
            <TireWearProfile 
                d1={Number(data.depth1) || tire.currentTreadDepth} 
                d2={Number(data.depth2) || tire.currentTreadDepth} 
                d3={Number(data.depth3) || tire.currentTreadDepth} 
                d4={Number(data.depth4) || tire.currentTreadDepth} 
            />

            <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-slate-400 text-center uppercase">{i === 1 ? 'Ext' : i === 2 ? 'C1' : i === 3 ? 'C2' : 'Int'}</label>
                        <input 
                            type="number" step="0.1"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-lg font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white"
                            placeholder="0.0"
                            value={(data as any)[`depth${i}`] !== undefined ? (data as any)[`depth${i}`] : ''}
                            onChange={(e) => onChange(tire.id, `depth${i}`, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>

        {/* CHECKLIST DE INSPEÇÃO (QUICK FORM) */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Checklist de Inspeção</h4>
            <div className="grid grid-cols-1 gap-2">
                {DAMAGE_OPTIONS.map(opt => {
                    const isSelected = (data.visualDamages || []).includes(opt.id);
                    return (
                        <button 
                            key={opt.id} onClick={() => toggleDamage(opt.id)}
                            className={`p-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between group ${isSelected ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'}`}
                        >
                            <span className="flex items-center gap-2">
                                {isSelected ? <CheckSquare className="h-4 w-4 fill-current"/> : <Square className="h-4 w-4 text-slate-300"/>}
                                {opt.label}
                            </span>
                            {isSelected && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-3">
        <button onClick={onPrev} disabled={isFirst || isSaving} className="p-4 bg-white dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 disabled:opacity-30 border border-slate-200 dark:border-slate-700 transition-all hover:bg-slate-100">
           Voltar
        </button>
        <button onClick={onQuickSave} disabled={isSaving} className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black shadow-lg shadow-green-600/20 flex justify-center items-center gap-2 transition-all active:scale-95">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} SALVAR
        </button>
        <button onClick={onNext} disabled={isLast || isSaving} className="p-4 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-black disabled:opacity-30 hover:bg-slate-700 transition-all">
           {isLast ? 'Fim' : 'Prox'}
        </button>
      </div>

      {showCamera && <SmartTreadGuideModal onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />}
    </div>
  );
};

export const InspectionHub: FC<InspectionHubProps> = ({ 
  tires: allTires, 
  vehicles, 
  branches = [],
  defaultBranchId,
  onUpdateTire, 
  onCreateServiceOrder, 
  settings 
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectionState, setInspectionState] = useState<InspectionDataMap>({});
  const [activeTireId, setActiveTireId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);

  const mountedTires = useMemo(() => {
    if (!selectedVehicle) return [];
    return tires.filter(t => t.vehicleId === selectedVehicle.id).sort((a, b) => (a.position || '').localeCompare(b.position || ''));
  }, [tires, selectedVehicle]);

  const activeTire = useMemo(() => mountedTires.find(t => t.id === activeTireId), [mountedTires, activeTireId]);

  const handleInputChange = (tireId: string, field: string, value: any) => {
    setInspectionState(prev => {
      const current = prev[tireId] || { notes: '', isInspected: false, use3Point: true };
      const updates: any = { [field]: value, isInspected: true };

      if (field.startsWith('depth')) {
        const d1 = Number(field === 'depth1' ? value : (current.depth1 || 0));
        const d2 = Number(field === 'depth2' ? value : (current.depth2 || 0));
        const d3 = Number(field === 'depth3' ? value : (current.depth3 || 0));
        const d4 = Number(field === 'depth4' ? value : (current.depth4 || 0));
        
        // Calcula a média baseada nos 4 pontos obrigatoriamente
        const avg = (d1 + d2 + d3 + d4) / 4;
        updates.depth = parseFloat(avg.toFixed(1));
      }

      return { ...prev, [tireId]: { ...current, ...updates } };
    });
  };

  const handleQuickSave = async () => {
    if (!activeTire || !selectedVehicle) return;
    const data = inspectionState[activeTire.id];
    if (!data) return;

    setIsSaving(true);
    try {
      const kmSinceInstall = Math.max(0, Number(selectedVehicle.odometer) - Number(activeTire.installOdometer || 0));
      const finalTotalKms = Number(activeTire.totalKms || 0) + kmSinceInstall;

      const updatedTire: Tire = {
        ...activeTire,
        currentTreadDepth: data.depth !== undefined ? Number(data.depth) : activeTire.currentTreadDepth,
        pressure: data.pressure !== undefined ? Number(data.pressure) : activeTire.pressure,
        totalKms: finalTotalKms,
        installOdometer: Number(selectedVehicle.odometer),
        lastInspectionDate: new Date().toISOString(),
        treadReadings: { 
            depth1: Number(data.depth1) || 0, 
            depth2: Number(data.depth2) || 0, 
            depth3: Number(data.depth3) || 0, 
            depth4: Number(data.depth4) || 0 
        },
        visualDamages: data.visualDamages,
        history: [...(activeTire.history || []), {
            date: new Date().toISOString(),
            action: 'INSPECAO',
            details: `Inspeção realizada. KM do Pneu: ${finalTotalKms}km. Sulco Médio: ${data.depth}mm.`
        }]
      };

      await onUpdateTire(updatedTire);
      alert(`Pneu ${activeTire.fireNumber} atualizado!`);
    } catch (err) {
        alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 text-white">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    Terminal de Inspeção
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Selecione uma placa para iniciar o diagnóstico técnico detalhado.</p>
            </div>
        </div>

        <div className="relative mb-10 group">
          <Search className="absolute left-5 top-5 text-slate-400 h-6 w-6 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por placa ou modelo do veículo..." 
            className="w-full p-5 pl-14 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-lg font-bold shadow-sm transition-all" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles
            .filter(v => {
              const matchesSearch = v.plate.toUpperCase().includes(searchTerm.toUpperCase());
              return matchesSearch;
            })
            .sort((a, b) => a.plate.localeCompare(b.plate))
            .map(v => (
            <div key={v.id} onClick={() => setSelectedVehicle(v)} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-500 hover:shadow-2xl hover:translate-y-[-4px] transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Truck className="h-20 w-20" /></div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors mb-1">{v.plate}</h3>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{v.model}</p>
                <div className="mt-6 flex justify-between items-center text-xs font-bold border-t border-slate-50 dark:border-slate-800 pt-4">
                    <span className="text-slate-400 uppercase">{v.type}</span>
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full">{tires.filter(t => t.vehicleId === v.id).length} Pneus Montados</span>
                </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-white dark:bg-slate-950 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedVehicle(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
            <ArrowLeft className="h-6 w-6 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white leading-none">{selectedVehicle.plate}</h2>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Inspeção Profissional</span>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setShowComparison(true)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
            >
               <GitCompare className="h-4 w-4" /> Comparativo
            </button>
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
               <Truck className="h-4 w-4"/> {selectedVehicle.model}
            </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 relative bg-slate-50 dark:bg-slate-950/20 overflow-hidden flex items-center justify-center">
          <ProVehicleSchematic
            vehicle={selectedVehicle} mountedTires={mountedTires} inspectionData={inspectionState}
            activeTireId={activeTireId} onTireSelect={setActiveTireId} settings={settings}
          />
          
          {!activeTireId && (
              <div className="absolute top-10 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-bounce cursor-default">
                  <div className="p-2 bg-blue-600 rounded-full text-white">
                      <MousePointer2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-white text-sm">Selecione um Pneu</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Toque na posição no esquema ao lado</p>
                  </div>
              </div>
          )}
        </div>

        {activeTire && (
          <ProInspectionPanel
            tire={activeTire} vehicle={selectedVehicle}
            data={inspectionState[activeTire.id] || { notes: '', isInspected: false, use3Point: true }}
            onChange={handleInputChange} onQuickSave={handleQuickSave}
            onNext={() => {
                const idx = mountedTires.findIndex(t => t.id === activeTireId);
                if (idx < mountedTires.length - 1) setActiveTireId(mountedTires[idx + 1].id);
            }}
            onPrev={() => {
                const idx = mountedTires.findIndex(t => t.id === activeTireId);
                if (idx > 0) setActiveTireId(mountedTires[idx - 1].id);
            }}
            isFirst={mountedTires.indexOf(activeTire) === 0}
            isLast={mountedTires.indexOf(activeTire) === mountedTires.length - 1}
            settings={settings} isSaving={isSaving}
          />
        )}
      </div>

      {showComparison && (
        <TireComparison 
          tires={mountedTires}
          vehicle={selectedVehicle}
          inspectionData={inspectionState}
          settings={settings}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
};
