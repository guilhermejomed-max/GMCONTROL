import React, { useState, useMemo } from 'react';
import { ServiceOrder, Vehicle, SystemSettings, Tire, TireStatus } from '../types';
import { Wrench, Search, ChevronDown, CheckCircle2, Loader, AlertTriangle, Calendar, Truck, Disc, Plus, X, Save, Clock, Timer } from 'lucide-react';

interface ServiceOrderHubProps {
  serviceOrders: ServiceOrder[];
  vehicles?: Vehicle[]; // Need vehicles to validate plate
  tires?: Tire[]; // Needed for tire selection
  onUpdateOrder: (orderId: string, updates: Partial<ServiceOrder>) => Promise<void>;
  onAddOrder?: (order: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt' | 'createdBy'>) => Promise<void>;
  settings?: SystemSettings;
}

type StatusFilter = 'ALL' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';

export const ServiceOrderHub: React.FC<ServiceOrderHubProps> = ({ serviceOrders, vehicles = [], tires = [], onUpdateOrder, onAddOrder, settings }) => {
  const [filter, setFilter] = useState<StatusFilter>('PENDENTE');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrderPlate, setNewOrderPlate] = useState('');
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderDetails, setNewOrderDetails] = useState('');
  const [newOrderTireId, setNewOrderTireId] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isCustomTitle, setIsCustomTitle] = useState(false);

  const filteredOrders = useMemo(() => {
    return serviceOrders
      .filter(order => {
        if (filter !== 'ALL' && order.status !== filter) return false;
        if (searchTerm && 
            !order.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !order.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !String(order.orderNumber).includes(searchTerm)) {
          return false;
        }
        return true;
      });
  }, [serviceOrders, filter, searchTerm]);

  // Derived state for available tires based on selected plate
  const availableTiresForSelection = useMemo(() => {
      const selectedVehicle = vehicles.find(v => v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === newOrderPlate.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      
      const mountedTires = selectedVehicle ? tires.filter(t => t.vehicleId === selectedVehicle.id) : [];
      const retreadingTires = tires.filter(t => t.status === TireStatus.RETREADING);
      
      return { mountedTires, retreadingTires };
  }, [tires, newOrderPlate, vehicles]);
  
  const handleStatusChange = async (order: ServiceOrder, newStatus: ServiceOrder['status']) => {
      const updates: Partial<ServiceOrder> = { status: newStatus };
      
      // Capture Start Time when moving to In Progress
      if (newStatus === 'EM_ANDAMENTO' && !order.startTime) {
          updates.startTime = new Date().toISOString();
      }

      // Capture Completion Time when moving to Done
      if (newStatus === 'CONCLUIDO') {
          updates.completedAt = new Date().toISOString();
          // In a real app, you'd get the current user's name
          updates.completedBy = "Usuário"; 
      }
      await onUpdateOrder(order.id, updates);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddOrder) return;

      const vehicle = vehicles.find(v => v.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === newOrderPlate.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      if (!vehicle) {
          alert("Veículo não encontrado! Verifique a placa.");
          return;
      }

      if (!newOrderTitle || !newOrderDetails) {
          alert("Preencha o tipo de serviço e os detalhes.");
          return;
      }

      // Get tire info if selected
      let selectedTireFireNumber = undefined;
      if (newOrderTireId) {
          const t = tires.find(x => x.id === newOrderTireId);
          if (t) selectedTireFireNumber = t.fireNumber;
      }

      setIsCreating(true);
      try {
          await onAddOrder({
              vehicleId: vehicle.id,
              vehiclePlate: vehicle.plate,
              title: newOrderTitle,
              details: newOrderDetails,
              tireId: newOrderTireId || undefined,
              tireFireNumber: selectedTireFireNumber,
              // startTime is undefined on creation. It is set when "Iniciar Serviço" is clicked.
              status: 'PENDENTE'
          });
          setIsCreateModalOpen(false);
          setNewOrderPlate('');
          setNewOrderTitle('');
          setNewOrderDetails('');
          setNewOrderTireId('');
          setIsCustomTitle(false);
      } catch (err) {
          console.error(err);
          alert("Erro ao criar Ordem de Serviço.");
      } finally {
          setIsCreating(false);
      }
  };
  
  const getDuration = (start: string, end: string) => {
      const diff = new Date(end).getTime() - new Date(start).getTime();
      if (diff < 0) return '0m';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
  };

  const getStatusPill = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'PENDENTE': return <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> ABERTA</span>;
      case 'EM_ANDAMENTO': return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse"><Loader className="h-3 w-3"/> EM EXECUÇÃO</span>;
      case 'CONCLUIDO': return <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> FINALIZADA</span>;
      default: return <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Wrench className="h-7 w-7 text-orange-600" /> Ordens de Serviço
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie as tarefas pendentes da oficina.</p>
        </div>
        {onAddOrder && (
            <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all text-sm"
            >
                <Plus className="h-4 w-4" /> Abrir O.S.
            </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por placa, título ou nº da O.S..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto">
            <button onClick={() => setFilter('PENDENTE')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filter === 'PENDENTE' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Abertas</button>
            <button onClick={() => setFilter('EM_ANDAMENTO')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filter === 'EM_ANDAMENTO' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Em Execução</button>
            <button onClick={() => setFilter('CONCLUIDO')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filter === 'CONCLUIDO' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Finalizadas</button>
            <button onClick={() => setFilter('ALL')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${filter === 'ALL' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Todas</button>
         </div>
      </div>
      
      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
             <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                     <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-1 rounded">#{String(order.orderNumber).padStart(4, '0')}</span>
                     {getStatusPill(order.status)}
                   </div>
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">{order.title}</h3>
                   <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3"/> {order.vehiclePlate}</span>
                      {order.tireFireNumber && <span className="flex items-center gap-1"><Disc className="h-3 w-3"/> {order.tireFireNumber}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> Aberto em: {new Date(order.createdAt).toLocaleString()}</span>
                      
                      {order.startTime && (
                          <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                              <Clock className="h-3 w-3"/> Início Serviço: {new Date(order.startTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                      )}

                      {order.status === 'CONCLUIDO' && order.completedAt && (
                          <>
                              <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 px-2 py-0.5 rounded font-bold">
                                  <CheckCircle2 className="h-3 w-3"/> Fim: {new Date(order.completedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-700">
                                  <Timer className="h-3 w-3"/> Execução: {getDuration(order.startTime || order.createdAt, order.completedAt)}
                              </span>
                          </>
                      )}
                   </div>
                   <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3">{order.details}</p>
                </div>
                {order.status !== 'CONCLUIDO' && (
                  <div className="flex md:flex-col gap-2 shrink-0 self-start md:self-center">
                    {order.status === 'PENDENTE' && <button onClick={() => handleStatusChange(order, 'EM_ANDAMENTO')} className="w-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 p-2 rounded-lg transition-colors flex items-center gap-1"><Loader className="h-3 w-3"/> Iniciar Serviço</button>}
                    {order.status === 'EM_ANDAMENTO' && <button onClick={() => handleStatusChange(order, 'CONCLUIDO')} className="w-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 p-2 rounded-lg transition-colors flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Finalizar</button>}
                  </div>
                )}
             </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
             <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50"/>
             <p className="font-bold">Nenhuma Ordem de Serviço encontrada.</p>
          </div>
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Plus className="h-5 w-5 text-orange-600"/> Nova Ordem de Serviço
                      </h3>
                      <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500"/></button>
                  </div>
                  <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Placa do Veículo</label>
                          <input 
                              type="text" 
                              required 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-black uppercase"
                              placeholder="ABC-1234"
                              value={newOrderPlate}
                              onChange={e => {
                                  setNewOrderPlate(e.target.value.toUpperCase());
                                  setNewOrderTireId(''); // Reset tire selection on plate change
                              }}
                          />
                      </div>
                      
                      {/* TIRE SELECTION (OPTIONAL) */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Pneu Vinculado (Opcional)</label>
                          <select 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold text-sm"
                              value={newOrderTireId}
                              onChange={(e) => setNewOrderTireId(e.target.value)}
                          >
                              <option value="">Nenhum Pneu Selecionado</option>
                              
                              {availableTiresForSelection.mountedTires.length > 0 && (
                                  <optgroup label="Montados no Veículo">
                                      {availableTiresForSelection.mountedTires.map(t => (
                                          <option key={t.id} value={t.id}>{t.fireNumber} - Pos: {t.position}</option>
                                      ))}
                                  </optgroup>
                              )}
                              
                              {availableTiresForSelection.retreadingTires.length > 0 && (
                                  <optgroup label="Em Recapagem">
                                      {availableTiresForSelection.retreadingTires.map(t => (
                                          <option key={t.id} value={t.id}>{t.fireNumber} - {t.brand} (Em Recapagem)</option>
                                      ))}
                                  </optgroup>
                              )}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Serviço (Título)</label>
                          {settings?.serviceTypes && settings.serviceTypes.length > 0 && !isCustomTitle ? (
                              <select 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                value={newOrderTitle}
                                onChange={(e) => {
                                    if (e.target.value === '__OTHER__') {
                                        setNewOrderTitle('');
                                        setIsCustomTitle(true);
                                    } else {
                                        setNewOrderTitle(e.target.value);
                                    }
                                }}
                              >
                                  <option value="">Selecione o Modelo...</option>
                                  {settings.serviceTypes.map(type => (
                                      <option key={type.id} value={type.name}>{type.name}</option>
                                  ))}
                                  <option value="__OTHER__">Outro (Digitar Manualmente)</option>
                              </select>
                          ) : (
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      required 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                      placeholder="Ex: Troca de Óleo, Rodízio..."
                                      value={newOrderTitle}
                                      onChange={e => setNewOrderTitle(e.target.value)}
                                      autoFocus={isCustomTitle}
                                  />
                                  {settings?.serviceTypes && settings.serviceTypes.length > 0 && (
                                      <button 
                                        type="button" 
                                        onClick={() => setIsCustomTitle(false)} 
                                        className="absolute right-3 top-3 text-xs text-blue-500 font-bold hover:underline"
                                      >
                                          Voltar à Lista
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Detalhes do Serviço</label>
                          <textarea 
                              required 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white min-h-[100px] resize-none text-sm"
                              placeholder="Descreva o que precisa ser feito..."
                              value={newOrderDetails}
                              onChange={e => setNewOrderDetails(e.target.value)}
                          />
                      </div>

                      <div className="pt-2 flex gap-3">
                          <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                          <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                              {isCreating ? <Loader className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} Abrir O.S.
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
