
import React, { useState, useMemo } from 'react';
import { Tire, TireStatus, Vehicle, UserLevel, ServiceOrder, MaintenancePlan, MaintenanceSchedule } from '../types';
import { 
  Search, Filter, Plus, Trash2, PenLine, FileText, 
  AlertTriangle, CheckCircle2, X, Archive, History, 
  LayoutGrid, List, Gauge, ArrowRight, DollarSign, Package,
  Layers, Disc, Truck, Calendar, Activity, MapPin, TrendingDown,
  Milestone, RefreshCw, Star
} from 'lucide-react';

interface InventoryListProps {
  tires: Tire[];
  vehicles: Vehicle[];
  serviceOrders?: ServiceOrder[];
  maintenancePlans?: MaintenancePlan[];
  maintenanceSchedules?: MaintenanceSchedule[];
  onDelete: (id: string) => Promise<void>;
  onUpdateTire: (tire: Tire) => Promise<void>;
  onRegister?: () => void;
  userLevel: UserLevel;
  viewMode?: 'inventory' | 'scrap';
}

const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getHealthColor = (depth: number) => {
    if (depth <= 3) return 'bg-red-500';
    if (depth <= 5) return 'bg-amber-500';
    return 'bg-emerald-500';
};

// --- MODAL DE DETALHES DO PNEU (CICLO DE VIDA) ---
const TireDetailModal: React.FC<{ 
  tire: Tire; 
  vehicles: Vehicle[]; 
  serviceOrders?: ServiceOrder[];
  maintenancePlans?: MaintenancePlan[];
  maintenanceSchedules?: MaintenanceSchedule[];
  onClose: () => void 
}> = ({ tire, vehicles, serviceOrders = [], maintenancePlans = [], maintenanceSchedules = [], onClose }) => {
    const vehicle = vehicles.find(v => v.id === tire.vehicleId);
    
    // Cálculo de CPK Individual
    // Se o pneu estiver rodando agora, somamos a km atual ao histórico
    let currentRun = 0;
    if (vehicle && tire.installOdometer) {
        currentRun = Math.max(0, vehicle.odometer - tire.installOdometer);
    }
    const totalKm = (tire.totalKms || 0) + currentRun;
    const totalCost = Number(tire.totalInvestment || tire.price || 0);
    const cpk = totalKm > 0 ? totalCost / totalKm : 0;

    // Processamento do Histórico para Linha do Tempo de Vidas
    const timelineEvents = useMemo(() => {
        const events = [...(tire.history || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return events;
    }, [tire.history]);

    const lifeStageLabel = tire.retreadCount === 0 ? '1ª Vida (Original)' : `${tire.retreadCount + 1}ª Vida (${tire.retreadCount}ª Reforma)`;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${tire.status === TireStatus.DAMAGED ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}>
                            <Disc className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{tire.fireNumber}</h2>
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">{tire.status}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mt-1">
                                {tire.brand} {tire.model} 
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                {tire.width}/{tire.profile} R{tire.rim}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-6 w-6 text-slate-400"/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-8 h-full">
                        
                        {/* COLUNA DA ESQUERDA: KPIs Financeiros e Técnicos */}
                        <div className="p-6 space-y-6 lg:col-span-1 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800">
                            
                            {/* VIDA DO PNEU (NOVO) */}
                            <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-20"><Star className="h-16 w-16"/></div>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Estágio Atual</p>
                                <h3 className="text-xl font-black">{lifeStageLabel}</h3>
                                {tire.retreadCount > 0 && <p className="text-[10px] mt-2 font-medium bg-white/20 inline-block px-2 py-0.5 rounded">Reformas: {tire.retreadCount}</p>}
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingDown className="h-3 w-3"/> CPK (Custo por KM)</p>
                                <div className="text-3xl font-black text-slate-800 dark:text-white font-mono">
                                    R$ {cpk.toFixed(5)}
                                </div>
                                <div className="mt-3 text-xs text-slate-500 font-medium border-t border-slate-100 dark:border-slate-700 pt-2">
                                    <div className="flex justify-between mb-1">
                                        <span>Investimento Total:</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{money(totalCost)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rodagem Total:</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">{totalKm.toLocaleString()} km</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Activity className="h-3 w-3"/> Saúde Atual</p>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className={`text-4xl font-black ${getHealthColor(tire.currentTreadDepth).replace('bg-', 'text-')}`}>
                                        {tire.currentTreadDepth}
                                    </span>
                                    <span className="text-sm font-bold text-slate-400 mb-1.5">mm restantes</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${getHealthColor(tire.currentTreadDepth)}`} 
                                        style={{width: `${Math.min(100, (tire.currentTreadDepth / (tire.originalTreadDepth || 18)) * 100)}%`}}
                                    ></div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin className="h-3 w-3"/> Localização</p>
                                {vehicle ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                                            <span className="text-lg font-black text-slate-800 dark:text-white">{vehicle.plate}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">Posição: {tire.position}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Montado em: {new Date(tire.installDate || '').toLocaleDateString()}</p>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-slate-400"/>
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{tire.location || 'Estoque Geral'}</span>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* COLUNA DA DIREITA: Timeline de Ciclo de Vida */}
                        <div className="p-6 lg:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <History className="h-4 w-4 text-purple-600"/> Linha do Tempo (Ciclo de Vida)
                                </h3>
                                
                                <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-8">
                                    {timelineEvents.map((log, idx) => {
                                        let icon = <CheckCircle2 className="h-4 w-4 text-slate-400" />;
                                        let colorClass = "bg-slate-100 border-slate-200 text-slate-500";
                                        
                                        if (log.action === 'CADASTRADO') {
                                            icon = <Plus className="h-4 w-4 text-white" />;
                                            colorClass = "bg-blue-500 border-blue-600 text-white shadow-blue-200";
                                        } else if (log.action === 'MONTADO') {
                                            icon = <Truck className="h-4 w-4 text-white" />;
                                            colorClass = "bg-emerald-500 border-emerald-600 text-white shadow-emerald-200";
                                        } else if (log.action === 'DESMONTADO') {
                                            icon = <Archive className="h-4 w-4 text-white" />;
                                            colorClass = "bg-amber-500 border-amber-600 text-white shadow-amber-200";
                                        } else if (log.action === 'RETORNO_RECAPAGEM') {
                                            icon = <RefreshCw className="h-4 w-4 text-white" />;
                                            colorClass = "bg-purple-500 border-purple-600 text-white shadow-purple-200";
                                        } else if (log.action === 'ENVIADO_RECAPAGEM') {
                                            icon = <Layers className="h-4 w-4 text-white" />;
                                            colorClass = "bg-indigo-500 border-indigo-600 text-white";
                                        } else if (log.action === 'DESCARTE') {
                                            icon = <Trash2 className="h-4 w-4 text-white" />;
                                            colorClass = "bg-red-500 border-red-600 text-white";
                                        }

                                        return (
                                            <div key={idx} className="relative pl-8">
                                                <div className={`absolute -left-[25px] top-0 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-sm z-10 ${colorClass}`}>
                                                    {icon}
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
                                                            {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                                                            {new Date(log.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                        {log.details}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {vehicle && (
                                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-blue-600"/> Manutenção do Veículo ({vehicle.plate})
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Próximos Serviços (PMS) */}
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-orange-600" /> Próximos Serviços (PMS)
                                            </h4>
                                            {maintenanceSchedules.filter(s => s.vehicleId === vehicle.id && s.status === 'PENDING').length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                    Nenhuma manutenção programada para este veículo.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {maintenanceSchedules
                                                        .filter(s => s.vehicleId === vehicle.id && s.status === 'PENDING')
                                                        .map(schedule => {
                                                            const plan = maintenancePlans.find(p => p.id === schedule.planId);
                                                            return (
                                                                <div key={schedule.id} className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-bold text-sm text-slate-800 dark:text-white">{plan?.name || 'Plano Desconhecido'}</p>
                                                                            {schedule.nextDueDate && (
                                                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                                                                    <Calendar className="h-3 w-3" /> Vencimento: {new Date(schedule.nextDueDate).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            )}
                                                                            {schedule.nextDueKm && (
                                                                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                                                                    <Gauge className="h-3 w-3" /> Troca com: {schedule.nextDueKm.toLocaleString()} km
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-100 text-orange-700">
                                                                            Programado
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Serviços Realizados */}
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                                <History className="h-4 w-4 text-blue-600" /> Serviços Realizados
                                            </h4>
                                            {serviceOrders.filter(so => so.vehicleId === vehicle.id).length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                    Nenhuma ordem de serviço registrada para este veículo.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {serviceOrders
                                                        .filter(so => so.vehicleId === vehicle.id)
                                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                        .map(so => (
                                                            <div key={so.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{so.title}</p>
                                                                        <p className="text-[10px] text-slate-500">{new Date(so.createdAt).toLocaleDateString('pt-BR')} • OS #{so.id.slice(-5).toUpperCase()}</p>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                                                        so.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' :
                                                                        so.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                        {so.status === 'CONCLUIDO' ? 'Concluída' : so.status === 'EM_ANDAMENTO' ? 'Em Execução' : 'Pendente'}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-3 pt-2 border-t border-slate-50 dark:border-slate-700">
                                                                    {so.parts && so.parts.length > 0 && (
                                                                        <div className="space-y-1">
                                                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Peças e Insumos:</p>
                                                                            {so.parts.map((part, idx) => (
                                                                                <div key={idx} className="flex justify-between text-[10px]">
                                                                                    <span className="text-slate-600 dark:text-slate-400">{part.quantity}x {part.name}</span>
                                                                                    <span className="font-bold text-slate-800 dark:text-white">
                                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.unitCost * part.quantity)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[10px] text-slate-500 italic truncate max-w-[60%]">{so.details}</p>
                                                                        <p className="font-black text-sm text-slate-800 dark:text-white">
                                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(so.totalCost || (so.parts ? so.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0))}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CARD DE PNEU ---
interface TireCardProps {
  tire: Tire;
  vehicles: Vehicle[];
  userLevel: UserLevel;
  onDelete: (id: string) => void;
  onClick: (tire: Tire) => void;
  detailed?: boolean;
}

const TireCard: React.FC<TireCardProps> = ({ tire, vehicles, userLevel, onDelete, onClick, detailed = false }) => {
    const depthPercent = Math.min(100, (tire.currentTreadDepth / (tire.originalTreadDepth || 18)) * 100);
    const healthColor = getHealthColor(tire.currentTreadDepth);
    const vehicle = vehicles.find(v => v.id === tire.vehicleId);

    return (
        <div 
            onClick={() => onClick(tire)}
            className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group relative overflow-hidden cursor-pointer ${detailed ? 'col-span-2' : ''}`}
        >
            {/* Status Badge */}
            <div className="absolute top-4 right-4">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
                    tire.status === TireStatus.NEW ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    tire.status === TireStatus.RETREADED ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                    {tire.status}
                </span>
            </div>

            {/* Header Info */}
            <div className="mb-4">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors">{tire.fireNumber}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">{tire.brand} {tire.model}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tire.width}/{tire.profile} R{tire.rim}</p>
            </div>

            {/* Tread Depth Visual */}
            <div className="mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sulco</span>
                    <span className={`text-sm font-black ${tire.currentTreadDepth <= 3 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {Number(tire.currentTreadDepth || 0).toFixed(1)} <span className="text-[9px]">mm</span>
                    </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${healthColor} transition-all duration-500`} style={{ width: `${depthPercent}%` }}></div>
                </div>
            </div>

            {/* Location / Vehicle */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${vehicle ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    {vehicle ? <Truck className="h-4 w-4"/> : <Package className="h-4 w-4"/>}
                </div>
                <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Localização</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                        {vehicle ? vehicle.plate : (tire.location || 'Estoque')}
                        {vehicle && <span className="text-xs font-normal text-slate-400 ml-1">({tire.position})</span>}
                    </p>
                </div>
            </div>

            {detailed && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto text-xs text-slate-500">
                    <div>
                        <p className="font-bold uppercase text-[10px]">KM 1ª Vida</p>
                        <p>{(tire.firstLifeKms || 0).toLocaleString()} km</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase text-[10px]">KM Recapagem</p>
                        <p>{(tire.retreadKms || 0).toLocaleString()} km</p>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <span className="text-xs font-mono font-bold text-slate-400">{money(tire.price)}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {userLevel === 'SENIOR' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(tire.id); }} 
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export const InventoryList: React.FC<InventoryListProps> = ({ 
  tires, 
  vehicles, 
  serviceOrders = [],
  maintenancePlans = [],
  maintenanceSchedules = [],
  onDelete, 
  onUpdateTire, 
  onRegister, 
  userLevel, 
  viewMode = 'inventory' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'NEW' | 'RETREADED' | 'USED' | 'MOUNTED' | 'SCRAP'>(viewMode === 'scrap' ? 'SCRAP' : 'NEW');
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'LIST'>('GRID');
  const [detailedView, setDetailedView] = useState(false);
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);

  const filteredTires = useMemo(() => {
    return tires.filter(t => {
      // 1. Filtro de Texto
      const matchesSearch = 
        t.fireNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      // 2. Filtro de Categoria
      const isMounted = !!t.vehicleId;
      const isDamaged = t.status === TireStatus.DAMAGED;

      switch (activeCategory) {
          case 'NEW': return !isMounted && !isDamaged && t.status === TireStatus.NEW;
          case 'RETREADED': return !isMounted && !isDamaged && t.status === TireStatus.RETREADED;
          case 'USED': return !isMounted && !isDamaged && t.status === TireStatus.USED;
          case 'MOUNTED': return isMounted && !isDamaged;
          case 'SCRAP': return isDamaged;
          default: return true;
      }
    });
  }, [tires, searchTerm, activeCategory]);

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este pneu?")) {
          await onDelete(id);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* BARRA DE NAVEGAÇÃO E FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
              <button onClick={() => setActiveCategory('NEW')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'NEW' ? 'bg-white dark:bg-slate-800 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Disc className="h-4 w-4"/> Novos
              </button>
              <button onClick={() => setActiveCategory('RETREADED')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'RETREADED' ? 'bg-white dark:bg-slate-800 shadow text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Layers className="h-4 w-4"/> Recapados
              </button>
              <button onClick={() => setActiveCategory('USED')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'USED' ? 'bg-white dark:bg-slate-800 shadow text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Activity className="h-4 w-4"/> Usados
              </button>
              <button onClick={() => setActiveCategory('MOUNTED')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'MOUNTED' ? 'bg-white dark:bg-slate-800 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Truck className="h-4 w-4"/> Em Uso
              </button>
              <button onClick={() => setActiveCategory('SCRAP')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'SCRAP' ? 'bg-white dark:bg-slate-800 shadow text-red-600 dark:text-red-400' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Trash2 className="h-4 w-4"/> Sucata
              </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                      type="text" 
                      placeholder="Buscar pneu..." 
                      className="w-full md:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg shrink-0">
                  <button onClick={() => setLayoutMode('GRID')} className={`p-2 rounded-md ${layoutMode === 'GRID' ? 'bg-white dark:bg-slate-800 shadow text-blue-600' : 'text-slate-400'}`}><LayoutGrid className="h-4 w-4"/></button>
                  <button onClick={() => setLayoutMode('LIST')} className={`p-2 rounded-md ${layoutMode === 'LIST' ? 'bg-white dark:bg-slate-800 shadow text-blue-600' : 'text-slate-400'}`}><List className="h-4 w-4"/></button>
                  {layoutMode === 'GRID' && (
                    <button onClick={() => setDetailedView(!detailedView)} className={`p-2 rounded-md ${detailedView ? 'bg-white dark:bg-slate-800 shadow text-blue-600' : 'text-slate-400'}`}><FileText className="h-4 w-4"/></button>
                  )}
              </div>

              {onRegister && (
                  <button onClick={onRegister} className="bg-blue-600 hover:bg-blue-700 text-white p-2 md:px-4 md:py-2 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 shrink-0">
                      <Plus className="h-5 w-5"/> <span className="hidden md:inline">Cadastrar</span>
                  </button>
              )}
          </div>
      </div>

      {/* LISTAGEM DE PNEUS */}
      {filteredTires.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-slate-400"/>
              </div>
              <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">Esta categoria está vazia</h3>
              <p className="text-slate-400">Nenhum pneu encontrado com os filtros atuais.</p>
          </div>
      ) : (
          <>
              {layoutMode === 'GRID' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
                      {filteredTires.map(tire => (
                          <TireCard 
                              key={tire.id} 
                              tire={tire} 
                              vehicles={vehicles} 
                              userLevel={userLevel} 
                              onDelete={handleDelete}
                              onClick={setSelectedTire}
                              detailed={detailedView}
                          />
                      ))}
                  </div>
              ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                  <th className="p-5">Fogo / ID</th>
                                  <th className="p-5">Marca & Modelo</th>
                                  <th className="p-5 text-center">Sulco</th>
                                  <th className="p-5">Localização</th>
                                  <th className="p-5 text-center">Status</th>
                                  <th className="p-5 text-right">Valor</th>
                                  <th className="p-5 text-right">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {filteredTires.map(t => (
                                  <tr key={t.id} onClick={() => setSelectedTire(t)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                                      <td className="p-5 font-black text-slate-800 dark:text-white">{t.fireNumber}</td>
                                      <td className="p-5">
                                          <div className="font-bold text-slate-700 dark:text-slate-300">{t.brand}</div>
                                          <div className="text-[10px] text-slate-400 uppercase">{t.model} • {t.width}/{t.profile}</div>
                                      </td>
                                      <td className="p-5 text-center">
                                          <span className={`font-black px-2 py-1 rounded ${getHealthColor(t.currentTreadDepth)} text-white text-xs`}>
                                              {t.currentTreadDepth}mm
                                          </span>
                                      </td>
                                      <td className="p-5 text-slate-600 dark:text-slate-400 font-medium">
                                          {t.vehicleId ? (
                                              <span className="flex items-center gap-1 text-blue-600"><CheckCircle2 className="h-3 w-3"/> {t.location}</span>
                                          ) : t.location}
                                      </td>
                                      <td className="p-5 text-center">
                                          <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded uppercase text-slate-500">{t.status}</span>
                                      </td>
                                      <td className="p-5 text-right font-mono text-slate-600 dark:text-slate-400">{money(t.price)}</td>
                                      <td className="p-5 text-right">
                                          {userLevel === 'SENIOR' && (
                                              <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4"/></button>
                                          )}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </>
      )}

      {selectedTire && (
          <TireDetailModal 
              tire={selectedTire} 
              vehicles={vehicles} 
              serviceOrders={serviceOrders}
              maintenancePlans={maintenancePlans}
              maintenanceSchedules={maintenanceSchedules}
              onClose={() => setSelectedTire(null)} 
          />
      )}
    </div>
  );
};
