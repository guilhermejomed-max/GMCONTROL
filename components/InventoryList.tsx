
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Tire, TireStatus, Vehicle, UserLevel, ServiceOrder, MaintenancePlan, MaintenanceSchedule, Branch, VehicleType } from '../types';
import { 
  Search, Filter, Plus, Trash2, PenLine, FileText, 
  AlertTriangle, CheckCircle2, X, Archive, History, 
  LayoutGrid, List, Gauge, ArrowRight, DollarSign, Package,
  Layers, Disc, Truck, Calendar, Activity, MapPin, TrendingDown,
  Milestone, RefreshCw, Star, QrCode, Printer, ScanLine, CheckSquare,
  Building2, ChevronDown, FileSpreadsheet, ClipboardList,
  CircleDot, Grid3X3, ChevronRight
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Scanner } from './Scanner';
import { isSteerAxle, getAllValidPositions } from '../lib/vehicleUtils';

interface InventoryListProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: Branch[];
  defaultBranchId?: string;
  serviceOrders?: ServiceOrder[];
  maintenancePlans?: MaintenancePlan[];
  maintenanceSchedules?: MaintenanceSchedule[];
  onDelete: (id: string) => Promise<void>;
  onUpdateTire: (tire: Tire) => Promise<void>;
  onUpdateServiceOrder?: (id: string, updates: Partial<ServiceOrder>) => Promise<void>;
  onRegister?: () => void;
  onEditTire?: (tire: Tire) => void;
  onNotification?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
  userLevel: UserLevel;
  viewMode?: 'inventory' | 'scrap';
  vehicleTypes?: VehicleType[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const TransferModal: React.FC<{
  selectedTires: Tire[];
  branches: Branch[];
  onClose: () => void;
  onTransfer: (branchId: string) => Promise<void>;
}> = ({ selectedTires, branches, onClose, onTransfer }) => {
  const [targetBranchId, setTargetBranchId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!targetBranchId) return;
    setIsTransferring(true);
    await onTransfer(targetBranchId);
    setIsTransferring(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <ArrowRight className="h-6 w-6" />
            </div>
            <div>
                <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">Transferir Filial</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Movimentação de Estoque</p>
            </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Você está transferindo <span className="font-black text-slate-800 dark:text-white">{selectedTires.length}</span> pneu(s) para uma nova filial. Esta ação será registrada no histórico de cada pneu.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Filial de Destino</label>
            <select 
              value={targetBranchId} 
              onChange={e => setTargetBranchId(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Selecione uma filial...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <button 
              onClick={handleTransfer}
              disabled={!targetBranchId || isTransferring}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {isTransferring ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
              ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Confirmar Transferência
                  </>
              )}
            </button>
            <button 
                onClick={onClose} 
                disabled={isTransferring}
                className="w-full py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
            >
                Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getHealthColor = (depth: number) => {
    if (depth <= 3) return 'bg-red-500';
    if (depth <= 5) return 'bg-amber-500';
    return 'bg-emerald-500';
};

const LinkOSModal: React.FC<{
  tire: Tire;
  serviceOrders: ServiceOrder[];
  onClose: () => void;
  onLink: (orderId: string) => Promise<void>;
}> = ({ tire, serviceOrders, onClose, onLink }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const filteredOrders = useMemo(() => {
    return serviceOrders
      .filter(so => 
        (so.tireId !== tire.id) && 
        (
          so.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          so.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
          so.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [serviceOrders, searchTerm, tire.id]);

  const handleLink = async (orderId: string) => {
    setIsLinking(true);
    await onLink(orderId);
    setIsLinking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <ClipboardList className="h-6 w-6" />
            </div>
            <div>
                <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight">Vincular O.S. ao Pneu</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pneu: {tire.fireNumber}</p>
            </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por título, placa ou ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {filteredOrders.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm italic">Nenhuma ordem de serviço encontrada.</p>
          ) : (
            filteredOrders.map(so => (
              <button 
                key={so.id}
                onClick={() => handleLink(so.id)}
                disabled={isLinking}
                className="w-full p-4 text-left bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-700 rounded-xl transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{so.title}</p>
                    <p className="text-xs text-slate-500">Veículo: {so.vehiclePlate} • {new Date(so.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Plus className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE DETALHES DO PNEU (CICLO DE VIDA) ---
const TireDetailModal: React.FC<{ 
  tire: Tire; 
  vehicles: Vehicle[]; 
  branches?: Branch[];
  serviceOrders?: ServiceOrder[];
  maintenancePlans?: MaintenancePlan[];
  maintenanceSchedules?: MaintenanceSchedule[];
  onClose: () => void;
  onEdit?: (tire: Tire) => void;
  vehicleTypes?: VehicleType[];
  onUpdateServiceOrder?: (id: string, updates: Partial<ServiceOrder>) => Promise<void>;
}> = ({ tire, vehicles, branches = [], serviceOrders = [], maintenancePlans = [], maintenanceSchedules = [], onClose, onEdit, vehicleTypes = [], onUpdateServiceOrder }) => {
    const vehicle = vehicles.find(v => v.id === tire.vehicleId);
    const [showLinkOS, setShowLinkOS] = useState(false);
    
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
        const events = [...(tire.history || [])].sort((a, b) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime());
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
                                <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wide">{tire.status}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 mt-1">
                                {tire.brand} {tire.model} 
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                {tire.width}/{tire.profile} R{tire.rim}
                                {tire.branchId && !tire.vehicleId && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {branches.find(b => b.id === tire.branchId)?.name || 'Filial N/A'}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button onClick={() => onEdit(tire)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-blue-600" title="Editar Pneu">
                                <PenLine className="h-6 w-6" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-6 w-6 text-slate-400"/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-8 h-full">
                        
                        {/* FOTO E VIDA DO PNEU */}
                        <div className="p-6 space-y-6 lg:col-span-1 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800">
                             {tire.imageUrl && (
                                 <div className="aspect-video w-full rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                     <img src={tire.imageUrl} alt={tire.fireNumber} className="w-full h-full object-cover" />
                                 </div>
                             )}
                            
                            {/* VIDA DO PNEU (NOVO) */}
                            <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-lg shadow-indigo-600/20 relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-3 opacity-20"><Star className="h-16 w-16"/></div>
                                <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-80">Estágio Atual</p>
                                <h3 className="text-xl font-black">{lifeStageLabel}</h3>
                                {tire.retreadCount > 0 && <p className="text-xs mt-2 font-medium bg-white/20 inline-block px-2 py-0.5 rounded">Reformas: {tire.retreadCount}</p>}
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><TrendingDown className="h-3 w-3"/> CPK (Custo por KM)</p>
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
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Activity className="h-3 w-3"/> Saúde Atual</p>
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
                                <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin className="h-3 w-3"/> Localização</p>
                                {vehicle ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                                            <span className="text-lg font-black text-slate-800 dark:text-white">{vehicle.plate}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-500">Posição: {tire.position}</p>
                                        <p className="text-xs text-slate-400 mt-1">Montado em: {new Date(tire.installDate || '').toLocaleDateString()}</p>
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
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
                                                            {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                                                            {new Date(log.date + (log.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString()}
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
                                        {/* Próximos Serviços (PMJ) */}
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-orange-600" /> Próximos Serviços (PMJ)
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
                                                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                                                    <Calendar className="h-3 w-3" /> Vencimento: {new Date(schedule.nextDueDate).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            )}
                                                                            {schedule.nextDueKm && (
                                                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                                                                    <Gauge className="h-3 w-3" /> Troca com: {schedule.nextDueKm.toLocaleString()} km
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-orange-100 text-orange-700">
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
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                                                    <History className="h-4 w-4 text-blue-600" /> Serviços Realizados
                                                </h4>
                                                {onUpdateServiceOrder && (
                                                    <button 
                                                        onClick={() => setShowLinkOS(true)}
                                                        className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors"
                                                    >
                                                        <Plus className="h-3 w-3" /> Vincular O.S.
                                                    </button>
                                                )}
                                            </div>

                                            {showLinkOS && onUpdateServiceOrder && (
                                                <LinkOSModal 
                                                    tire={tire}
                                                    serviceOrders={serviceOrders}
                                                    onClose={() => setShowLinkOS(false)}
                                                    onLink={async (orderId) => {
                                                        await onUpdateServiceOrder(orderId, { 
                                                            tireId: tire.id,
                                                            tireFireNumber: tire.fireNumber
                                                        });
                                                    }}
                                                />
                                            )}

                                            {serviceOrders.filter(so => so.tireId === tire.id || (vehicle && so.vehicleId === vehicle.id && !so.tireId)).length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                    Nenhuma ordem de serviço vinculada a este pneu.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {serviceOrders
                                                        .filter(so => so.tireId === tire.id || (vehicle && so.vehicleId === vehicle.id && !so.tireId))
                                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                        .map(so => (
                                                            <div key={so.id} className={`p-4 bg-white dark:bg-slate-800 rounded-xl border shadow-sm ${so.tireId === tire.id ? 'border-blue-200 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-bold text-sm text-slate-800 dark:text-white">{so.title}</p>
                                                                            {so.tireId === tire.id && (
                                                                                <span className="text-[8px] font-black uppercase tracking-tighter bg-blue-100 text-blue-700 px-1 rounded">Vinculado</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500">{new Date(so.createdAt).toLocaleDateString('pt-BR')} • OS #{so.id.slice(-5).toUpperCase()}</p>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
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
                                                                            <p className="text-xs font-bold text-slate-500 uppercase">Peças e Insumos:</p>
                                                                            {so.parts.map((part, idx) => (
                                                                                <div key={idx} className="flex justify-between text-xs">
                                                                                    <span className="text-slate-600 dark:text-slate-400">{part.quantity}x {part.name}</span>
                                                                                    <span className="font-bold text-slate-800 dark:text-white">
                                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.unitCost * part.quantity)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-xs text-slate-500 italic truncate max-w-[60%]">{so.details}</p>
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
  branches?: Branch[];
  userLevel: UserLevel;
  onDelete: (id: string) => void;
  onClick: (tire: Tire) => void;
  onPrintQr: (tire: Tire) => void;
  onTransfer?: (tire: Tire) => void;
  detailed?: boolean;
}

const TireCard: React.FC<TireCardProps> = ({ tire, vehicles, branches = [], userLevel, onDelete, onClick, onPrintQr, onTransfer, detailed = false }) => {
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
                <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg border ${
                    tire.status === TireStatus.NEW ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    tire.status === TireStatus.RETREADED ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                    {tire.status}
                </span>
            </div>

            {/* Header Info */}
            <div className="mb-4 pr-16">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight group-hover:text-blue-600 transition-colors">{tire.fireNumber}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">{tire.brand} {tire.model}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{tire.width}/{tire.profile} R{tire.rim}</p>
            </div>

            {/* Tread Depth Visual */}
            <div className="mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Sulco</span>
                        {tire.lastInspectionDate && (
                            <span className="text-[10px] text-slate-400 font-medium">
                                Insp: {new Date(tire.lastInspectionDate).toLocaleDateString('pt-BR')}
                            </span>
                        )}
                    </div>
                    <span className={`text-sm font-black ${tire.currentTreadDepth <= 3 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {Number(tire.currentTreadDepth || 0).toFixed(1)} <span className="text-xs">mm</span>
                    </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${healthColor} transition-all duration-500`} style={{ width: `${depthPercent}%` }}></div>
                </div>
            </div>

            {/* Location / Vehicle */}
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${vehicle ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                        {vehicle ? <Truck className="h-4 w-4"/> : <Package className="h-4 w-4"/>}
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Localização</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                            {vehicle ? vehicle.plate : (tire.location || 'Estoque')}
                            {vehicle && <span className="text-xs font-normal text-slate-400 ml-1">({tire.position})</span>}
                        </p>
                    </div>
                </div>
                {tire.branchId && !tire.vehicleId && (
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                            <Building2 className="h-4 w-4"/>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase">Filial</p>
                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
                                {branches.find(b => b.id === tire.branchId)?.name || 'Filial não encontrada'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {detailed && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto text-xs text-slate-500">
                    <div>
                        <p className="font-bold uppercase text-xs">KM 1ª Vida</p>
                        <p>{(tire.firstLifeKms || 0).toLocaleString()} km</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase text-xs">KM Recapagem</p>
                        <p>{(tire.retreadKms || 0).toLocaleString()} km</p>
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                <span className="text-xs font-mono font-bold text-slate-400">{money(tire.price)}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onTransfer && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onTransfer(tire); }} 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Transferir Filial"
                        >
                            <ArrowRight className="h-4 w-4"/>
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPrintQr(tire); }} 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Imprimir QR Code"
                    >
                        <QrCode className="h-4 w-4"/>
                    </button>
                    {userLevel === 'SENIOR' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(tire.id); }} 
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                        >
                            <Trash2 className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODAL DE RELATÓRIOS ---
const ReportsModal: React.FC<{
  onClose: () => void;
  onShowMissingTires: () => void;
  onDownloadInventory: () => void;
}> = ({ onClose, onShowMissingTires, onDownloadInventory }) => {
  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Relatórios de Pneus</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-3">
          <button 
            onClick={onDownloadInventory}
            className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
          >
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 dark:text-white uppercase text-sm">Inventário Geral</p>
              <p className="text-xs text-slate-500">Exportar todos os pneus em estoque e em uso para Excel.</p>
            </div>
          </button>

          <button 
            onClick={onShowMissingTires}
            className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 transition-all group"
          >
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl group-hover:scale-110 transition-transform">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 dark:text-white uppercase text-sm">Pneus Faltantes</p>
              <p className="text-xs text-slate-500">Verificar posições vazias nos veículos da frota.</p>
            </div>
          </button>
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE RELATÓRIO DE PNEUS FALTANTES ---
const MissingTiresReportModal: React.FC<{
  missingTires: any[];
  onClose: () => void;
  onDownload: () => void;
}> = ({ missingTires, onClose, onDownload }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Relatório de Pneus Faltantes</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4">
            {missingTires.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">Nenhum pneu faltante encontrado em toda a frota!</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Veículo</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Eixo</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-wider">Posição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingTires.map((m, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <p className="text-sm font-black text-slate-700 dark:text-slate-200">{m.plate}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{m.fleetNumber}</p>
                        </td>
                        <td className="p-4 text-sm font-bold text-slate-600 dark:text-slate-400">{m.axle}º Eixo</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-black text-slate-500">{m.position}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Fechar</button>
          {missingTires.length > 0 && (
            <button 
              onClick={onDownload}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm"
            >
              <FileSpreadsheet className="h-4 w-4" /> Baixar Excel
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
  branches = [],
  defaultBranchId,
  serviceOrders = [],
  maintenancePlans = [],
  maintenanceSchedules = [],
  onDelete, 
  onUpdateTire, 
  onUpdateServiceOrder,
  onRegister, 
  onEditTire,
  onNotification,
  userLevel, 
  viewMode = 'inventory',
  vehicleTypes = [],
  onLoadMore,
  hasMore
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeBranch, setActiveBranch] = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'STOCK' | 'NEW' | 'RETREADED' | 'USED' | 'MOUNTED' | 'SCRAP' | 'LISO' | 'BORRACHUDO'>(viewMode === 'scrap' ? 'SCRAP' : 'STOCK');
  const [layoutMode, setLayoutMode] = useState<'GRID' | 'LIST'>('LIST');
  const [detailedView, setDetailedView] = useState(false);
  const [selectedTire, setSelectedTire] = useState<Tire | null>(null);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  // Novos estados para QR Code e Inventário
  const [qrTireToPrint, setQrTireToPrint] = useState<Tire | null>(null);
  const [selectedTireIds, setSelectedTireIds] = useState<Set<string>>(new Set());
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedTireIds, setScannedTireIds] = useState<Set<string>>(new Set());
  const [tiresBeingTransferred, setTiresBeingTransferred] = useState<Tire[] | null>(null);
  
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showMissingTiresReport, setShowMissingTiresReport] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Tire | 'health' | 'cpk'; direction: 'asc' | 'desc' } | null>(null);
  const [showAllTires, setShowAllTires] = useState(false);

  const filteredByBranchTires = useMemo(() => {
    if (activeBranch === 'ALL') return tires;
    return tires.filter(t => t.branchId === activeBranch);
  }, [tires, activeBranch]);

  const stats = useMemo(() => {
    const stockTires = filteredByBranchTires.filter(t => !t.vehicleId && t.status !== TireStatus.DAMAGED);
    const runningTires = filteredByBranchTires.filter(t => !!t.vehicleId);
    const totalInStock = stockTires.length;
    const totalRunning = runningTires.length;
    const totalValue = filteredByBranchTires.reduce((sum, t) => sum + (t.price || 0), 0);
    const byStatus = filteredByBranchTires.reduce((acc, t) => {
      let status = t.status as string;
      if (t.currentTreadDepth < 3 && t.status !== TireStatus.DAMAGED) {
        status = 'RECAPAGEM';
      }
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const lowTread = filteredByBranchTires.filter(t => t.currentTreadDepth < 3).length;

    const byBrand = filteredByBranchTires.reduce((acc, t) => {
      const brand = t.brand.toUpperCase();
      acc[brand] = (acc[brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTreadType = filteredByBranchTires.reduce((acc, t) => {
      const type = t.treadType || 'N/A';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { totalInStock, totalRunning, totalValue, byStatus, lowTread, byBrand, byTreadType };
  }, [filteredByBranchTires]);

  const handleSort = (key: keyof Tire | 'health' | 'cpk') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const exportToExcel = () => {
    const data = filteredByBranchTires.map(t => ({
      'Fogo': t.fireNumber,
      'Marca': t.brand,
      'Modelo': t.model,
      'Medida': `${t.width}/${t.profile} R${t.rim}`,
      'Sulco Atual (mm)': t.currentTreadDepth,
      'Última Inspeção': t.lastInspectionDate ? new Date(t.lastInspectionDate).toLocaleDateString('pt-BR') : '-',
      'Status': t.status,
      'Localização': t.location,
      'Preço': t.price
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    XLSX.writeFile(wb, `Estoque_Pneus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getMissingTires = () => {
    const missingTires: any[] = [];
    vehicles.forEach(vehicle => {
      // Exclude leased vehicles from missing tires report
      if (vehicle.ownership === 'LEASED') return;

      const mountedTires = tires.filter(t => t.vehicleId === vehicle.id);
      const validPositions = getAllValidPositions(vehicle, vehicleTypes);
      
      validPositions.forEach(pos => {
        const hasTire = mountedTires.some(t => t.position === pos);
        if (!hasTire) {
          missingTires.push({
            plate: vehicle.plate,
            fleetNumber: vehicle.fleetNumber || 'N/A',
            model: vehicle.model,
            axle: parseInt(pos.charAt(0)), // Extract axle number from position (e.g., '1E' -> 1)
            position: pos
          });
        }
      });
    });
    return missingTires;
  };

  const exportMissingTiresToExcel = () => {
    const missingTires = getMissingTires();

    if (missingTires.length === 0) {
      if (onNotification) onNotification('Relatório', 'Nenhum pneu faltante encontrado.', 'info');
      return;
    }

    const data = missingTires.map(m => ({
      'Placa': m.plate,
      'Prefixo': m.fleetNumber,
      'Modelo': m.model,
      'Eixo': m.axle,
      'Posição Faltante': m.position
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pneus Faltantes");
    XLSX.writeFile(wb, `Relatorio_Pneus_Faltantes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getTireCPK = (t: Tire) => {
    let currentRun = 0;
    if (t.vehicleId) {
      const vehicle = vehicles.find(v => v.id === t.vehicleId);
      if (vehicle && t.installOdometer) {
        currentRun = Math.max(0, vehicle.odometer - t.installOdometer);
      }
    }
    const totalKm = (t.totalKms || 0) + currentRun;
    const totalCost = Number(t.totalInvestment || t.price || 0);
    return totalKm > 0 ? totalCost / totalKm : 0;
  };

  const sortedTires = useMemo(() => {
    let items = [...filteredByBranchTires];
    
    // Apply filters first (same as filteredTires logic)
    items = items.filter(t => {
      const matchesSearch = 
        t.fireNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      const vId = t.vehicleId ? String(t.vehicleId).trim().toLowerCase() : '';
      const isMounted = vId !== '' && vId !== 'null' && vId !== 'undefined';
      const isDamaged = t.status === TireStatus.DAMAGED;
      const isLowTread = t.currentTreadDepth < 3;
      const isRecapagem = isLowTread && !isDamaged;

      switch (activeCategory) {
          case 'ALL': return !isDamaged;
          case 'STOCK': return !isMounted && !isDamaged;
          case 'NEW': return !isMounted && !isDamaged && !isLowTread && t.status === TireStatus.NEW;
          case 'RETREADED': return !isMounted && !isDamaged && (t.status === TireStatus.RETREADED || isRecapagem);
          case 'USED': return !isMounted && !isDamaged && !isLowTread && t.status === TireStatus.USED;
          case 'MOUNTED': return isMounted && !isDamaged;
          case 'SCRAP': return isDamaged;
          case 'LISO': return t.treadType === 'LISO';
          case 'BORRACHUDO': return t.treadType === 'BORRACHUDO';
          default: return true;
      }
    });

    if (sortConfig !== null) {
      items.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'health') {
          aValue = a.currentTreadDepth;
          bValue = b.currentTreadDepth;
        } else if (sortConfig.key === 'cpk') {
          aValue = getTireCPK(a);
          bValue = getTireCPK(b);
        } else if (sortConfig.key === 'branchId') {
          aValue = branches.find(br => br.id === a.branchId)?.name || '';
          bValue = branches.find(br => br.id === b.branchId)?.name || '';
        } else {
          aValue = a[sortConfig.key as keyof Tire];
          bValue = b[sortConfig.key as keyof Tire];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [tires, searchTerm, activeCategory, sortConfig, defaultBranchId]);

  const filteredTires = sortedTires; // Replace filteredTires with sortedTires

  const toggleTireSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedTireIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTireIds(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedTireIds.size === filteredTires.length) {
      setSelectedTireIds(new Set());
    } else {
      setSelectedTireIds(new Set(filteredTires.map(t => t.id)));
    }
  };

  const handleSinglePrint = (tire: Tire) => {
    setQrTireToPrint(tire);
    onNotification?.('Impressão', 'Preparando QR Code...', 'info');
    // Pequeno delay para garantir que o modal renderizou antes de chamar a impressão
    setTimeout(() => {
      window.focus();
      window.print();
    }, 800);
  };

  const handleBatchPrint = () => {
    if (selectedTireIds.size === 0) {
      onNotification?.('Atenção', 'Selecione pelo menos um pneu para imprimir.', 'info');
      return;
    }
    setIsBatchPrintModalOpen(true);
    onNotification?.('Impressão', 'Preparando lote para impressão...', 'info');
    // Pequeno delay para garantir que o modal renderizou antes de chamar a impressão
    setTimeout(() => {
      window.focus();
      window.print();
    }, 800);
  };

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este pneu?")) {
          await onDelete(id);
      }
  };

  const handleTransfer = async (branchId: string) => {
    if (!onUpdateTire || !tiresBeingTransferred) return;

    try {
      const branchName = branches.find(b => b.id === branchId)?.name || 'Nova Filial';
      
      for (const tire of tiresBeingTransferred) {
        const updatedTire: Tire = {
          ...tire,
          branchId,
          // Se o pneu estava em um veículo, ele continua no veículo (mas a filial do pneu muda)
          // Se estava em estoque, garantimos que a localização reflita o estoque da nova filial
          location: tire.vehicleId ? tire.location : 'Estoque',
          history: [
            ...(tire.history || []),
            {
              date: new Date().toISOString(),
              action: 'TRANSFERENCIA',
              details: `Transferido para a filial ${branchName}`,
              treadDepth: tire.currentTreadDepth
            }
          ]
        };
        await onUpdateTire(updatedTire);
      }
      
      onNotification?.('Sucesso', `${tiresBeingTransferred.length} pneu(s) transferido(s) com sucesso.`, 'success');
      setSelectedTireIds(new Set());
      setTiresBeingTransferred(null);
    } catch (error) {
      onNotification?.('Erro', 'Falha ao transferir pneus.', 'error');
    }
  };

  const handleBatchTransfer = () => {
    const selectedTires = tires.filter(t => selectedTireIds.has(t.id));
    if (selectedTires.length > 0) {
      setTiresBeingTransferred(selectedTires);
    }
  };

  const handleSingleTransfer = (tire: Tire) => {
    setTiresBeingTransferred([tire]);
  };

  const handleTransferAll = () => {
    if (filteredTires.length > 0) {
      setTiresBeingTransferred(filteredTires);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* HERO HEADER SECTION */}
      <div className="relative overflow-hidden bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-slate-900/20">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-[80px]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              <Activity className="h-3 w-3" /> Gestão de Ativos
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4">
              Estoque de <span className="text-blue-500">Pneus</span>
            </h1>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</p>
                  <p className="text-xl font-black font-mono">{filteredByBranchTires.length}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Truck className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Operação</p>
                  <p className="text-xl font-black font-mono">{stats.totalRunning}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {onRegister && (
              <button onClick={onRegister} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/40 flex items-center gap-3 transition-all hover:scale-105 active:scale-95">
                <Plus className="h-5 w-5"/> <span>Novo Pneu</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LIST SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-1 w-12 bg-indigo-600 rounded-full"></div>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Listagem e Filtros</h2>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
            
            <div className="flex bg-slate-100 dark:bg-slate-950 p-2 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveCategory('STOCK')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'STOCK' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Package className="h-4 w-4"/> Estoque
                </button>
                <button onClick={() => setActiveCategory('ALL')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'ALL' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                    <LayoutGrid className="h-4 w-4"/> Todos
                </button>
                <button onClick={() => setActiveCategory('NEW')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'NEW' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Disc className="h-4 w-4"/> Novos
                </button>
                <button onClick={() => setActiveCategory('RETREADED')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'RETREADED' ? 'bg-white dark:bg-slate-800 shadow-md text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Layers className="h-4 w-4"/> Recapagem
                </button>
                <button onClick={() => setActiveCategory('USED')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'USED' ? 'bg-white dark:bg-slate-800 shadow-md text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Activity className="h-4 w-4"/> Usados
                </button>
                <button onClick={() => setActiveCategory('MOUNTED')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'MOUNTED' ? 'bg-white dark:bg-slate-800 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Truck className="h-4 w-4"/> Em Uso
                </button>
                <button onClick={() => setActiveCategory('SCRAP')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'SCRAP' ? 'bg-white dark:bg-slate-800 shadow-md text-red-600 dark:text-red-400' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Trash2 className="h-4 w-4"/> Sucata
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center mx-3"></div>
                <button onClick={() => setActiveCategory('LISO')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'LISO' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-700 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CircleDot className="h-4 w-4"/> Liso
                </button>
                <button onClick={() => setActiveCategory('BORRACHUDO')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeCategory === 'BORRACHUDO' ? 'bg-white dark:bg-slate-800 shadow-md text-slate-700 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Grid3X3 className="h-4 w-4"/> Borrachudo
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 self-center mx-3"></div>
                <button 
                    onClick={() => { setActiveCategory('ALL'); setSearchTerm(''); setSortConfig(null); }} 
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest flex items-center gap-2"
                >
                    <RefreshCw className="h-3 w-3"/> Limpar
                </button>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
                <select 
                    value={activeBranch}
                    onChange={e => setActiveBranch(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all py-3 px-4 w-full lg:w-48"
                >
                    <option value="ALL">Todas as Filiais</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <div className="relative flex-1 lg:w-64">
                    <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por fogo, marca ou modelo..." 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl shrink-0">
                    <button onClick={() => setLayoutMode('GRID')} className={`p-2.5 rounded-xl transition-all ${layoutMode === 'GRID' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Visualização em Grade"><LayoutGrid className="h-5 w-5"/></button>
                    <button onClick={() => setLayoutMode('LIST')} className={`p-2.5 rounded-xl transition-all ${layoutMode === 'LIST' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Visualização em Lista"><List className="h-5 w-5"/></button>
                </div>
            </div>
        </div>

        {/* BATCH ACTIONS TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleAllSelection} 
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectedTireIds.size === filteredTires.length && filteredTires.length > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'}`}
            >
              <CheckSquare className="h-4 w-4" />
              {selectedTireIds.size === filteredTires.length ? "Desmarcar Todos" : "Selecionar Tudo"}
            </button>
            {selectedTireIds.size > 0 && (
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest animate-pulse">
                {selectedTireIds.size} Selecionado(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedTireIds.size > 0 ? (
              <>
                <button 
                    onClick={handleBatchTransfer}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2 hover:bg-blue-700 transition-all"
                >
                    <ArrowRight className="h-4 w-4"/> Transferir
                </button>
                <button 
                    onClick={handleBatchPrint}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-slate-900 transition-all"
                >
                    <Printer className="h-4 w-4"/> Imprimir
                </button>
              </>
            ) : (
              <>
                <button 
                    onClick={() => setShowReportsModal(true)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600"/> Relatórios
                </button>
                <button 
                    onClick={() => setIsInventoryMode(!isInventoryMode)} 
                    className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all border ${isInventoryMode ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}
                >
                    <CheckSquare className="h-4 w-4"/> {isInventoryMode ? 'Sair' : 'Inventário'}
                </button>
              </>
            )}
          </div>
        </div>


      {/* PAINEL DE INVENTÁRIO (QUANDO ATIVO) */}
      {isInventoryMode && (
          <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
                      <ScanLine className="h-6 w-6" />
                  </div>
                  <div>
                      <h3 className="font-black text-indigo-900 dark:text-indigo-100">Modo Inventário Ativo</h3>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Escaneie os QR Codes dos pneus para conferir o estoque.</p>
                  </div>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="flex flex-col items-end">
                      <span className="text-xs font-bold uppercase text-indigo-500">Progresso</span>
                      <span className="font-black text-xl text-indigo-700 dark:text-indigo-300">
                          {scannedTireIds.size} / {filteredTires.length}
                      </span>
                  </div>
                  <button 
                      onClick={() => setIsScannerOpen(true)}
                      className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
                  >
                      <QrCode className="h-5 w-5" /> Escanear Pneu
                  </button>
              </div>
          </div>
      )}

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
                          <div key={tire.id} className={`relative ${isInventoryMode && scannedTireIds.has(tire.id) ? 'ring-4 ring-emerald-500 rounded-3xl' : ''}`}>
                              {isInventoryMode && scannedTireIds.has(tire.id) && (
                                  <div className="absolute -top-3 -right-3 z-10 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                                      <CheckCircle2 className="h-5 w-5" />
                                  </div>
                              )}
                              <TireCard 
                                  tire={tire} 
                                  vehicles={vehicles} 
                                  branches={branches}
                                  userLevel={userLevel} 
                                  onDelete={handleDelete}
                                  onClick={setSelectedTire}
                                  onPrintQr={handleSinglePrint}
                                  onTransfer={handleSingleTransfer}
                                  detailed={detailedView}
                              />
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                  <th className="p-5 w-10">
                                      <input 
                                          type="checkbox" 
                                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                          checked={selectedTireIds.size === filteredTires.length && filteredTires.length > 0}
                                          onChange={toggleAllSelection}
                                      />
                                  </th>
                                  <th className="p-5 w-20 text-center uppercase text-xs font-bold text-slate-500">Foto</th>
                                  <th className="p-5 cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('fireNumber')}>
                                      <div className="flex items-center gap-1">
                                          Fogo / ID 
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'fireNumber' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'fireNumber' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('brand')}>
                                      <div className="flex items-center gap-1">
                                          Marca & Modelo 
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'brand' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'brand' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 text-center cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('health')}>
                                      <div className="flex items-center gap-1 justify-center">
                                          Sulco 
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'health' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'health' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 text-center cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('lastInspectionDate')}>
                                      <div className="flex items-center gap-1 justify-center">
                                          Última Insp. 
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'lastInspectionDate' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'lastInspectionDate' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('location')}>
                                      <div className="flex items-center gap-1">
                                          Localização
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'location' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'location' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('branchId')}>
                                      <div className="flex items-center gap-1">
                                          Filial
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'branchId' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'branchId' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 text-center cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('status')}>
                                      <div className="flex items-center gap-1 justify-center">
                                          Status
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'status' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 text-right cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('price')}>
                                      <div className="flex items-center gap-1 justify-end">
                                          Valor 
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'price' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'price' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 text-right cursor-pointer hover:text-blue-600 transition-colors group" onClick={() => handleSort('cpk')}>
                                      <div className="flex items-center gap-1 justify-end">
                                          CPK 
                                          <div className="flex flex-col">
                                              <ChevronDown className={`h-3 w-3 -mb-1 ${sortConfig?.key === 'cpk' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                              <ChevronDown className={`h-3 w-3 -mt-1 rotate-180 ${sortConfig?.key === 'cpk' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} />
                                          </div>
                                      </div>
                                  </th>
                                  <th className="p-5 text-right">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {filteredTires.map(t => (
                                  <tr key={t.id} onClick={() => setSelectedTire(t)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer ${isInventoryMode && scannedTireIds.has(t.id) ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''} ${selectedTireIds.has(t.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                      <td className="p-5" onClick={(e) => e.stopPropagation()}>
                                          <input 
                                              type="checkbox" 
                                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                              checked={selectedTireIds.has(t.id)}
                                              onChange={(e) => toggleTireSelection(t.id, e as any)}
                                          />
                                      </td>
                                      <td className="px-5 py-2">
                                          <div className="h-10 w-10 mx-auto rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                              {t.imageUrl ? (
                                                  <img src={t.imageUrl} alt={t.fireNumber} className="w-full h-full object-cover" />
                                              ) : (
                                                  <Disc className="h-5 w-5 text-slate-300" />
                                              )}
                                          </div>
                                      </td>
                                      <td className="p-5 font-black text-slate-800 dark:text-white flex items-center gap-2">
                                          {isInventoryMode && scannedTireIds.has(t.id) && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                          {t.fireNumber}
                                      </td>
                                      <td className="p-5">
                                          <div className="font-bold text-slate-700 dark:text-slate-300">{t.brand}</div>
                                          <div className="text-xs text-slate-400 uppercase">{t.model} • {t.width}/{t.profile}</div>
                                      </td>
                                      <td className="p-5 text-center">
                                          <span className={`font-black px-2 py-1 rounded ${getHealthColor(t.currentTreadDepth)} text-white text-xs`}>
                                              {t.currentTreadDepth}mm
                                          </span>
                                      </td>
                                      <td className="p-5 text-center text-xs text-slate-500 font-medium">
                                          {t.lastInspectionDate ? new Date(t.lastInspectionDate).toLocaleDateString('pt-BR') : '-'}
                                      </td>
                                      <td className="p-5 text-slate-600 dark:text-slate-400 font-medium">
                                          {t.vehicleId ? (
                                              <span className="flex items-center gap-1 text-blue-600"><CheckCircle2 className="h-3 w-3"/> {t.location}</span>
                                          ) : t.location}
                                      </td>
                                      <td className="p-5 text-slate-600 dark:text-slate-400 font-bold">
                                          {t.branchId ? (
                                              <span className="flex items-center gap-1 text-blue-600">
                                                  <Building2 className="h-3 w-3"/>
                                                  {branches.find(b => b.id === t.branchId)?.name || 'N/A'}
                                              </span>
                                          ) : 'N/A'}
                                      </td>
                                      <td className="p-5 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                              t.status === TireStatus.DAMAGED ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                              t.currentTreadDepth < 3 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                              t.status === TireStatus.NEW ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                              t.status === TireStatus.RETREADED ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                              t.status === TireStatus.USED ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                          }`}>
                                              {t.status === TireStatus.DAMAGED ? 'Sucata' :
                                               t.currentTreadDepth < 3 ? 'Recapagem' :
                                               t.status === TireStatus.NEW ? 'Novo' :
                                               t.status === TireStatus.RETREADED ? 'Recapado' :
                                               t.status === TireStatus.USED ? 'Usado' : t.status}
                                          </span>
                                      </td>
                                      <td className="p-5 text-right font-mono text-slate-600 dark:text-slate-400">{money(t.price)}</td>
                                      <td className="p-5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                                          {getTireCPK(t).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                                      </td>
                                      <td className="p-5 text-right">
                                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                  onClick={(e) => { e.stopPropagation(); handleSingleTransfer(t); }} 
                                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title="Transferir Filial"
                                              >
                                                  <ArrowRight className="h-4 w-4"/>
                                              </button>
                                              <button 
                                                  onClick={(e) => { e.stopPropagation(); handleSinglePrint(t); }} 
                                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                  title="Imprimir QR Code"
                                              >
                                                  <QrCode className="h-4 w-4"/>
                                              </button>
                                              {userLevel === 'SENIOR' && (
                                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4"/></button>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {hasMore && (
                  <div className="flex justify-center pt-8">
                      <button 
                          onClick={onLoadMore}
                          className="px-10 py-4 bg-white dark:bg-slate-900 border-2 border-blue-600 text-blue-600 dark:text-blue-400 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-600/10 hover:bg-blue-50 dark:hover:bg-slate-800"
                      >
                          <RefreshCw className="h-5 w-5" />
                          CARREGAR MAIS PNEUS
                      </button>
                  </div>
              )}
          </>
      )}
      </div>

      {selectedTire && (
          <TireDetailModal 
              tire={selectedTire} 
              vehicles={vehicles} 
              branches={branches}
              serviceOrders={serviceOrders}
              maintenancePlans={maintenancePlans}
              maintenanceSchedules={maintenanceSchedules}
              onClose={() => setSelectedTire(null)} 
              onEdit={(userLevel === 'SENIOR' || userLevel === 'ADMIN' || userLevel === 'MANAGER') && onEditTire ? onEditTire : undefined}
              onUpdateServiceOrder={onUpdateServiceOrder}
              vehicleTypes={vehicleTypes}
          />
      )}

      {/* MODAL DE TRANSFERÊNCIA DE FILIAL */}
      {tiresBeingTransferred && (
          <TransferModal 
              selectedTires={tiresBeingTransferred}
              branches={branches}
              onClose={() => setTiresBeingTransferred(null)}
              onTransfer={handleTransfer}
          />
      )}

      {/* MODAL DE IMPRESSÃO EM LOTE */}
      {isBatchPrintModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:bg-white print:p-0 print-modal-container">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col print-content print:shadow-none print:w-auto print:max-w-none print:max-h-none print:p-0">
                  <div className="print:hidden flex justify-between items-center mb-6">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white">Impressão em Lote</h3>
                          <p className="text-xs text-slate-500">{selectedTireIds.size} pneus selecionados</p>
                      </div>
                      <button onClick={() => setIsBatchPrintModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-xl print:bg-white print:p-0 print:overflow-visible">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:flex print:flex-wrap print:gap-4 print:justify-center">
                          {Array.from(selectedTireIds).map(id => {
                              const tire = tires.find(t => t.id === id);
                              if (!tire) return null;
                              return (
                                  <div key={tire.id} className="bg-white p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center qr-print-container print:m-0 print:border-2 print:border-black print:p-4 print:break-inside-avoid print:w-[5.5cm]">
                                      <div className="hidden print:flex flex-col items-center w-full border-b border-black pb-1 mb-2">
                                          <h2 className="font-black text-sm uppercase tracking-widest text-black">GMcontrol</h2>
                                      </div>

                                      <div className="print:w-[3.5cm] print:h-[3.5cm] flex justify-center items-center">
                                          <QRCode value={tire.fireNumber} size={100} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                                      </div>
                                      
                                      <div className="mt-2 text-center print:mt-2 print:w-full">
                                          <p className="font-black text-sm text-slate-800 print:text-xl print:text-black">{tire.fireNumber}</p>
                                          
                                          <div className="print:flex print:flex-col print:w-full print:border-t print:border-black print:pt-1 print:mt-1">
                                              <p className="text-[8px] font-bold text-slate-500 uppercase print:text-[10px] print:text-black truncate w-full">{tire.brand} {tire.model}</p>
                                              <p className="hidden print:block text-[10px] font-bold text-black uppercase">{tire.width}/{tire.profile} R{tire.rim}</p>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="print:hidden mt-6 flex justify-end gap-3">
                      <button onClick={() => setIsBatchPrintModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                      <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.focus();
                            window.print();
                        }} 
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                          <Printer className="h-4 w-4"/> Imprimir Lote
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE IMPRESSÃO DE QR CODE */}
      {qrTireToPrint && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:bg-white print:p-0 print-modal-container">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl max-w-sm w-full print-content print:shadow-none print:w-auto print:max-w-none">
                  <div className="print:hidden flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Imprimir QR Code</h3>
                      <button onClick={() => setQrTireToPrint(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500"/></button>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 print:border-none print:p-0 bg-white qr-print-container print:w-full print:max-w-[10cm] print:mx-auto">
                      {/* Cabeçalho da Etiqueta (só na impressão) */}
                      <div className="hidden print:flex flex-col items-center w-full border-b-2 border-black pb-2 mb-4">
                          <h2 className="font-black text-2xl uppercase tracking-widest text-black">GMcontrol</h2>
                          <p className="text-xs font-bold uppercase text-black">Gestão de Pneus</p>
                      </div>

                      <div className="print:w-[6cm] print:h-[6cm] flex justify-center items-center">
                          <QRCode value={qrTireToPrint.fireNumber} size={150} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                      </div>
                      
                      <div className="mt-4 text-center print:mt-4 print:w-full">
                          <p className="hidden print:block text-xs font-bold uppercase text-black mb-1">Nº de Fogo</p>
                          <p className="font-black text-2xl text-slate-800 print:text-5xl print:text-black print:mb-4">{qrTireToPrint.fireNumber}</p>
                          
                          <div className="print:flex print:flex-col print:gap-2 print:w-full print:border-t-2 print:border-black print:pt-4">
                              <div className="print:flex print:justify-between print:items-center">
                                  <p className="text-sm font-bold text-slate-500 uppercase print:text-sm print:text-black">Marca / Modelo</p>
                                  <p className="text-sm font-bold text-slate-500 uppercase print:text-lg print:text-black print:font-black">{qrTireToPrint.brand} {qrTireToPrint.model}</p>
                              </div>
                              <div className="print:flex print:justify-between print:items-center">
                                  <p className="text-xs text-slate-400 print:text-sm print:font-bold print:uppercase print:text-black">Medida</p>
                                  <p className="text-xs text-slate-400 print:text-lg print:text-black print:font-black">{qrTireToPrint.width}/{qrTireToPrint.profile} R{qrTireToPrint.rim}</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="print:hidden mt-6 flex justify-end gap-3">
                      <button onClick={() => setQrTireToPrint(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                      <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.focus();
                            window.print();
                        }} 
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                          <Printer className="h-4 w-4"/> Imprimir
                      </button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
          @media print {
              @page {
                margin: 0.5cm;
                size: auto;
              }
              body {
                visibility: hidden !important;
                background: white !important;
              }
              /* Hide everything inside the modal except the print content */
              .print-modal-container {
                visibility: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                display: block !important;
                z-index: 9999 !important;
              }
              .print-modal-container > div {
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                max-width: none !important;
                overflow: visible !important;
                max-height: none !important;
              }
              /* Hide Header and Footer of the modal during print */
              .print-modal-container > div > div:not(.p-8) {
                display: none !important;
              }
              /* Ensure the content area is visible and correctly positioned */
              .print-modal-container .p-8 {
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                overflow: visible !important;
                max-height: none !important;
                display: block !important;
              }
              .print-content {
                  visibility: visible !important;
                  display: flex !important;
                  flex-direction: row !important;
                  flex-wrap: wrap !important;
                  align-items: flex-start !important;
                  justify-content: flex-start !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
              }
              .qr-print-container, .qr-print-container * {
                  visibility: visible !important;
              }
              .qr-print-container {
                  width: 3cm !important;
                  height: 3.5cm !important;
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  justify-content: center !important;
                  padding: 0.2cm !important;
                  margin: 0.1cm !important;
                  break-inside: avoid !important;
                  border: 1px solid #eee !important;
                  background: white !important;
                  box-sizing: border-box !important;
              }
              .qr-print-container svg {
                  width: 2.4cm !important;
                  height: 2.4cm !important;
              }
              .qr-print-container p {
                  font-size: 9pt !important;
                  font-weight: 900 !important;
                  margin: 0.1cm 0 0 0 !important;
                  line-height: 1 !important;
                  color: black !important;
                  text-align: center !important;
                  font-family: sans-serif !important;
              }
          }
      `}</style>

      {/* MODAL DO SCANNER DE INVENTÁRIO */}
      {isScannerOpen && (
          <Scanner 
              onClose={() => setIsScannerOpen(false)}
              onScan={(data) => {
                  const tire = tires.find(t => t.fireNumber.toUpperCase() === data.trim().toUpperCase());
                  if (tire) {
                      if (scannedTireIds.has(tire.id)) {
                          onNotification?.('Atenção', `Pneu ${tire.fireNumber} já foi escaneado.`, 'info');
                      } else {
                          setScannedTireIds(prev => new Set(prev).add(tire.id));
                          onNotification?.('Sucesso', `Pneu ${tire.fireNumber} identificado!`, 'success');
                      }
                  } else {
                      onNotification?.('Erro', `Pneu com código "${data}" não encontrado no sistema.`, 'error');
                  }
                  setIsScannerOpen(false);
              }}
              title="Escanear Pneu"
              placeholder="Digite o número de fogo..."
              mode="QR"
          />
      )}

      {/* MODAL DE TRANSFERÊNCIA DE FILIAL */}
      {tiresBeingTransferred && (
        <TransferModal 
          selectedTires={tiresBeingTransferred}
          branches={branches || []}
          onClose={() => setTiresBeingTransferred(null)}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  );
};
