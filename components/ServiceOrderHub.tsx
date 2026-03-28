import React, { useState, useMemo } from 'react';
import { ServiceOrder, Vehicle, SystemSettings, Tire, TireStatus, ArrivalAlert, MaintenancePlan, MaintenanceSchedule, VehicleBrandModel, StockItem } from '../types';
import { Wrench, Search, ChevronDown, CheckCircle2, Loader, AlertTriangle, Calendar, Truck, Disc, Plus, X, Save, Clock, Timer, Bell, ClipboardList, CheckSquare, Package, Trash2, UserCircle, DollarSign } from 'lucide-react';
import { storageService } from '../services/storageService';
import { MaintenancePlanManager } from './MaintenancePlanManager';

interface ServiceOrderHubProps {
  orgId: string;
  serviceOrders: ServiceOrder[];
  branches?: any[];
  defaultBranchId?: string;
  maintenancePlans?: MaintenancePlan[];
  maintenanceSchedules?: MaintenanceSchedule[];
  vehicles?: Vehicle[]; // Need vehicles to validate plate
  vehicleBrandModels?: VehicleBrandModel[];
  tires?: Tire[]; // Needed for tire selection
  stockItems?: StockItem[]; // Needed for maintenance plan items
  onUpdateOrder: (orderId: string, updates: Partial<ServiceOrder>) => Promise<void>;
  onUpdateOrderBatch?: (updates: { id: string, updates: Partial<ServiceOrder> }[]) => Promise<void>;
  onAddOrder?: (order: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt' | 'createdBy'>) => Promise<void>;
  settings?: SystemSettings;
  arrivalAlerts?: ArrivalAlert[];
  initialVehicleId?: string;
  initialModalOpen?: boolean;
  onCloseInitialModal?: () => void;
  collaborators?: import('../types').Collaborator[];
  partners?: import('../types').Partner[];
  onAddCollaborator?: (collaborator: import('../types').Collaborator) => Promise<void>;
  onUpdateCollaborator?: (id: string, updates: Partial<import('../types').Collaborator>) => Promise<void>;
  onDeleteCollaborator?: (id: string) => Promise<void>;
  userLevel: import('../types').UserLevel;
}

type StatusFilter = 'ALL' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
type TabView = 'ORDERS' | 'PMJ' | 'COLLABORATORS';

export const ServiceOrderHub: React.FC<ServiceOrderHubProps> = ({ 
  orgId,
  serviceOrders: allServiceOrders, 
  branches = [],
  defaultBranchId,
  maintenancePlans = [], 
  maintenanceSchedules = [], 
  vehicles: allVehicles = [], 
  vehicleBrandModels = [], 
  tires: allTires = [], 
  stockItems = [], 
  onUpdateOrder, 
  onUpdateOrderBatch,
  onAddOrder, 
  settings, 
  arrivalAlerts: allArrivalAlerts = [], 
  initialVehicleId, 
  initialModalOpen, 
  onCloseInitialModal,
  collaborators = [],
  partners = [],
  onAddCollaborator,
  onUpdateCollaborator,
  onDeleteCollaborator,
  userLevel
}) => {
  const [activeTab, setActiveTab] = useState<TabView>('ORDERS');
  const [filter, setFilter] = useState<StatusFilter>('PENDENTE');
  const [searchTerm, setSearchTerm] = useState('');

  const serviceOrders = useMemo(() => {
    return defaultBranchId ? allServiceOrders.filter(so => so.branchId === defaultBranchId) : allServiceOrders;
  }, [allServiceOrders, defaultBranchId]);

  const vehicles = allVehicles;

  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);

  const filteredCollaborators = useMemo(() => {
    return defaultBranchId ? collaborators.filter(c => c.branchId === defaultBranchId) : collaborators;
  }, [collaborators, defaultBranchId]);

  const arrivalAlerts = useMemo(() => {
    return defaultBranchId ? allArrivalAlerts.filter(a => a.branchId === defaultBranchId) : allArrivalAlerts;
  }, [allArrivalAlerts, defaultBranchId]);

  const filteredMaintenancePlans = useMemo(() => {
    return defaultBranchId ? maintenancePlans.filter(p => p.branchId === defaultBranchId) : maintenancePlans;
  }, [maintenancePlans, defaultBranchId]);

  const filteredMaintenanceSchedules = useMemo(() => {
    return defaultBranchId ? maintenanceSchedules.filter(s => s.branchId === defaultBranchId) : maintenanceSchedules;
  }, [maintenanceSchedules, defaultBranchId]);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrderVehicleId, setNewOrderVehicleId] = useState('');

  React.useEffect(() => {
    if (initialModalOpen) {
      setIsCreateModalOpen(true);
      if (initialVehicleId) {
        setNewOrderVehicleId(initialVehicleId);
      }
      onCloseInitialModal?.();
    }
  }, [initialModalOpen, initialVehicleId, onCloseInitialModal]);
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderMaintenancePlanId, setNewOrderMaintenancePlanId] = useState('');
  const [newOrderDetails, setNewOrderDetails] = useState('');
  const [newOrderMaintenanceBaseId, setNewOrderMaintenanceBaseId] = useState('');
  const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [newOrderOdometer, setNewOrderOdometer] = useState<number | ''>('');
  const [isPreventiveMaintenance, setIsPreventiveMaintenance] = useState(false);
  const [newOrderCollaboratorId, setNewOrderCollaboratorId] = useState('');
  const [newOrderPartnerId, setNewOrderPartnerId] = useState('');
  const [newOrderServiceId, setNewOrderServiceId] = useState('');
  const [newOrderLaborHours, setNewOrderLaborHours] = useState<number | ''>(1);
  
  const [newOrderServiceType, setNewOrderServiceType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [newOrderProviderName, setNewOrderProviderName] = useState('');
  const [newOrderExternalServiceCost, setNewOrderExternalServiceCost] = useState<number | ''>('');
  
  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [editOrderTitle, setEditOrderTitle] = useState('');
  const [editOrderDetails, setEditOrderDetails] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editOrderCollaboratorId, setEditOrderCollaboratorId] = useState('');
  const [editOrderLaborHours, setEditOrderLaborHours] = useState<number | ''>('');
  const [editOrderServiceType, setEditOrderServiceType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [editOrderProviderName, setEditOrderProviderName] = useState('');
  const [editOrderExternalServiceCost, setEditOrderExternalServiceCost] = useState<number | ''>('');
  const [editOrderParts, setEditOrderParts] = useState<{ name: string; quantity: number; unitCost: number }[]>([]);
  const [editSelectedStockItemId, setEditSelectedStockItemId] = useState('');
  const [editSelectedStockItemQty, setEditSelectedStockItemQty] = useState(1);

  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Parts Selection State
  const [newOrderParts, setNewOrderParts] = useState<{ itemId: string; name: string; quantity: number; unitCost: number }[]>([]);
  const [selectedStockItemId, setSelectedStockItemId] = useState('');
  const [selectedStockItemQty, setSelectedStockItemQty] = useState(1);

  const handleUpdatePartQty = (itemId: string, newQty: number) => {
      if (newQty < 1) return;
      setNewOrderParts(newOrderParts.map(p => 
          p.itemId === itemId ? { ...p, quantity: newQty } : p
      ));
  };

  const handleEditUpdatePartQty = (index: number, newQty: number) => {
      if (newQty < 1) return;
      const updatedParts = [...editOrderParts];
      updatedParts[index].quantity = newQty;
      setEditOrderParts(updatedParts);
  };

  const handleAddPartToEdit = () => {
      if (!editSelectedStockItemId) return;
      const item = stockItems.find(i => i.id === editSelectedStockItemId);
      if (!item) return;

      const existingIndex = editOrderParts.findIndex(p => p.name === item.name);
      if (existingIndex >= 0) {
          const updatedParts = [...editOrderParts];
          updatedParts[existingIndex].quantity += editSelectedStockItemQty;
          setEditOrderParts(updatedParts);
      } else {
          setEditOrderParts([...editOrderParts, {
              name: item.name,
              quantity: editSelectedStockItemQty,
              unitCost: item.averageCost
          }]);
      }
      setEditSelectedStockItemId('');
      setEditSelectedStockItemQty(1);
  };

  const handleRemovePartFromEdit = (index: number) => {
      setEditOrderParts(editOrderParts.filter((_, i) => i !== index));
  };

  const handleAddPart = () => {
      if (!selectedStockItemId) return;
      const item = stockItems.find(i => i.id === selectedStockItemId);
      if (!item) return;

      const existing = newOrderParts.find(p => p.itemId === selectedStockItemId);
      if (existing) {
          setNewOrderParts(newOrderParts.map(p => 
              p.itemId === selectedStockItemId ? { ...p, quantity: p.quantity + selectedStockItemQty } : p
          ));
      } else {
          setNewOrderParts([...newOrderParts, {
              itemId: item.id,
              name: item.name,
              quantity: selectedStockItemQty,
              unitCost: item.averageCost
          }]);
      }
      setSelectedStockItemId('');
      setSelectedStockItemQty(1);
  };

  const handleRemovePart = (itemId: string) => {
      setNewOrderParts(newOrderParts.filter(p => p.itemId !== itemId));
  };

  const maintenanceAlerts = useMemo(() => {
    return maintenanceSchedules.filter(s => {
      const vehicle = vehicles.find(v => v.id === s.vehicleId);
      if (!vehicle || !s.nextDueKm) return false;
      return vehicle.odometer >= s.nextDueKm;
    });
  }, [maintenanceSchedules, vehicles]);

  const pendingAlertsForVehicle = useMemo(() => {
      if (!newOrderVehicleId) return [];
      const vehicle = vehicles.find(v => v.id === newOrderVehicleId);
      if (!vehicle) return [];
      return arrivalAlerts.filter(a => 
          a.status === 'PENDING' && 
          a.vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, '') === vehicle.plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      );
  }, [arrivalAlerts, newOrderVehicleId, vehicles]);

  const vehicleMaintenancePlan = useMemo(() => {
    if (!newOrderVehicleId) return null;
    const vehicle = vehicles.find(v => v.id === newOrderVehicleId);
    if (!vehicle || !vehicle.brandModelId) return null;
    
    const brandModel = vehicleBrandModels.find(bm => bm.id === vehicle.brandModelId);
    if (!brandModel || !brandModel.maintenancePlanId) return null;

    return maintenancePlans.find(p => p.id === brandModel.maintenancePlanId) || null;
  }, [newOrderVehicleId, vehicles, vehicleBrandModels, maintenancePlans]);

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
      const selectedVehicle = vehicles.find(v => v.id === newOrderVehicleId);
      
      const mountedTires = selectedVehicle ? tires.filter(t => t.vehicleId === selectedVehicle.id) : [];
      const retreadingTires = tires.filter(t => t.status === TireStatus.RETREADING);
      
      return { mountedTires, retreadingTires };
  }, [tires, newOrderVehicleId, vehicles]);
  
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

          // Update Maintenance Schedule if applicable
          const vehicle = vehicles.find(v => v.plate === order.vehiclePlate);
          if (vehicle) {
              const orderCost = order.totalCost || 0;
              if (orderCost > 0) {
                  await storageService.updateVehicle(orgId, {
                      ...vehicle,
                      totalCost: (vehicle.totalCost || 0) + orderCost
                  });
              }

              if (order.maintenancePlanId) {
                  const plan = maintenancePlans.find(p => p.id === order.maintenancePlanId);
              if (plan && plan.intervalKm) {
                  const newLastPerformedKm = vehicle.odometer;
                  const newNextDueKm = newLastPerformedKm + plan.intervalKm;
                  
                  const schedule = maintenanceSchedules.find(s => s.vehicleId === vehicle.id && s.planId === plan.id);
                  if (schedule) {
                      await storageService.updateMaintenanceSchedule(orgId, schedule.id, {
                          lastPerformedKm: newLastPerformedKm,
                          lastPerformedDate: new Date().toISOString(),
                          nextDueKm: newNextDueKm,
                          status: 'PENDING'
                      });
                  } else {
                      await storageService.addMaintenanceSchedule(orgId, {
                          id: Date.now().toString(),
                          vehicleId: vehicle.id,
                          planId: plan.id,
                          lastPerformedKm: newLastPerformedKm,
                          lastPerformedDate: new Date().toISOString(),
                          nextDueKm: newNextDueKm,
                          status: 'PENDING'
                      });
                  }

                  // Schedule next service alert if base is known
                  if (order.maintenanceBaseId && settings?.savedPoints) {
                      const base = settings.savedPoints.find(p => p.id === order.maintenanceBaseId);
                      if (base) {
                          const newAlert: ArrivalAlert = {
                              id: Date.now().toString() + Math.random().toString(36).substring(7),
                              vehiclePlate: vehicle.plate,
                              targetName: base.name,
                              targetLat: base.lat,
                              targetLng: base.lng,
                              radius: base.radius || settings.alertRadius || 500,
                              services: `Próxima PMJ: ${plan.name}`,
                              status: 'PENDING',
                              createdAt: new Date().toISOString(),
                              createdBy: 'Sistema (PMJ)',
                              minOdometer: newNextDueKm,
                              branchId: defaultBranchId
                          };
                          await storageService.addArrivalAlert(orgId, newAlert);
                      }
                  }
              }
          }
      }
      }
      await onUpdateOrder(order.id, updates);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!onAddOrder) return;

      const vehicle = vehicles.find(v => v.id === newOrderVehicleId);
      if (!vehicle) {
          alert("Por favor, selecione um veículo.");
          return;
      }

      if (!newOrderDetails) {
          alert("Preencha os detalhes do serviço.");
          return;
      }


      setIsCreating(true);
      try {
          let arrivalAlertId: string | undefined = undefined;
          
          // Create Arrival Alert if a base is selected
          if (newOrderMaintenanceBaseId && settings?.savedPoints) {
            const base = settings.savedPoints.find(p => p.id === newOrderMaintenanceBaseId);
            if (base) {
              const newAlert: ArrivalAlert = {
                id: Date.now().toString(),
                vehiclePlate: vehicle.plate,
                targetName: base.name,
                targetLat: base.lat,
                targetLng: base.lng,
                radius: base.radius || settings.alertRadius || 500,
                services: `O.S.: ${newOrderTitle || 'Manutenção'}`,
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                createdBy: 'Sistema (O.S.)',
                branchId: defaultBranchId
              };
              await storageService.addArrivalAlert(orgId, newAlert);
              arrivalAlertId = newAlert.id;
            }
          }

          const collaborator = filteredCollaborators.find(c => c.id === newOrderCollaboratorId);
          const laborCost = (collaborator && newOrderLaborHours) ? (collaborator.hourlyRate || (collaborator.salary / 220)) * Number(newOrderLaborHours) : 0;
          
          const partner = partners.find(p => p.id === newOrderPartnerId);
          const service = partner?.services.find(s => s.id === newOrderServiceId);

              await onAddOrder({
              vehicleId: vehicle.id,
              vehiclePlate: vehicle.plate,
              title: newOrderTitle || (newOrderDetails.length > 40 ? newOrderDetails.substring(0, 40) + '...' : newOrderDetails) || 'Manutenção',
              details: newOrderDetails,
              date: newOrderDate,
              serviceType: newOrderServiceType,
              providerName: newOrderServiceType === 'EXTERNAL' ? partner?.name : undefined,
              externalServiceCost: newOrderServiceType === 'EXTERNAL' ? (newOrderExternalServiceCost !== '' ? Number(newOrderExternalServiceCost) : 0) : undefined,
              services: newOrderServiceType === 'EXTERNAL' && service ? [{ id: service.id, name: service.name, cost: (newOrderExternalServiceCost !== '' ? Number(newOrderExternalServiceCost) : 0) }] : undefined,
              maintenancePlanId: newOrderMaintenancePlanId || undefined,
              maintenanceBaseId: newOrderMaintenanceBaseId || undefined,
              maintenanceBaseName: settings?.savedPoints?.find(p => p.id === newOrderMaintenanceBaseId)?.name,
              arrivalAlertId,
              isPreventiveMaintenance,
              odometer: newOrderOdometer !== '' ? newOrderOdometer : undefined,
              parts: newOrderParts.length > 0 ? newOrderParts.map(p => ({ name: p.name, quantity: p.quantity, unitCost: p.unitCost })) : undefined,
              collaboratorId: newOrderCollaboratorId || undefined,
              collaboratorName: collaborator?.name,
              laborHours: newOrderLaborHours !== '' ? Number(newOrderLaborHours) : undefined,
              laborCost: laborCost > 0 ? laborCost : undefined,
              branchId: defaultBranchId,
              // startTime is undefined on creation. It is set when "Iniciar Serviço" is clicked.
              status: 'PENDENTE'
          });
          setIsCreateModalOpen(false);
          setNewOrderVehicleId('');
          setNewOrderTitle('');
          setNewOrderDetails('');
          setNewOrderDate(new Date().toISOString().split('T')[0]);
          setNewOrderMaintenancePlanId('');
          setNewOrderMaintenanceBaseId('');
          setNewOrderOdometer('');
          setIsPreventiveMaintenance(false);
          setNewOrderParts([]);
          setNewOrderCollaboratorId('');
          setNewOrderLaborHours('');
          setNewOrderServiceType('INTERNAL');
          setNewOrderPartnerId('');
          setNewOrderServiceId('');
          setNewOrderProviderName('');
          setNewOrderExternalServiceCost('');
      } catch (err) {
          console.error(err);
          alert("Erro ao criar Ordem de Serviço.");
      } finally {
          setIsCreating(false);
      }
  };

  const handleOpenEditModal = (order: ServiceOrder) => {
      setEditingOrder(order);
      setEditOrderTitle(order.title);
      setEditOrderDetails(order.details);
      setEditOrderDate(order.date || '');
      setEditOrderParts(order.parts || []);
      setEditOrderCollaboratorId(order.collaboratorId || '');
      setEditOrderLaborHours(order.laborHours || '');
      setEditOrderServiceType(order.serviceType || 'INTERNAL');
      setEditOrderProviderName(order.providerName || '');
      setEditOrderExternalServiceCost(order.externalServiceCost || '');
  };

  const handleUpdateOrderDetails = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingOrder) return;

      setIsUpdating(true);
      try {
          const collaborator = filteredCollaborators.find(c => c.id === editOrderCollaboratorId);
          const laborCost = (collaborator && editOrderLaborHours) ? (collaborator.hourlyRate || (collaborator.salary / 220)) * Number(editOrderLaborHours) : 0;

          await onUpdateOrder(editingOrder.id, {
              title: editOrderTitle,
              details: editOrderDetails,
              date: editOrderDate,
              serviceType: editOrderServiceType,
              providerName: editOrderServiceType === 'EXTERNAL' ? editOrderProviderName : undefined,
              externalServiceCost: editOrderServiceType === 'EXTERNAL' && editOrderExternalServiceCost !== '' ? Number(editOrderExternalServiceCost) : undefined,
              parts: editOrderParts.length > 0 ? editOrderParts : undefined,
              collaboratorId: editOrderCollaboratorId || undefined,
              collaboratorName: collaborator?.name,
              laborHours: editOrderLaborHours !== '' ? Number(editOrderLaborHours) : undefined,
              laborCost: laborCost > 0 ? laborCost : undefined
          });
          setEditingOrder(null);
      } catch (err) {
          console.error(err);
          alert("Erro ao atualizar Ordem de Serviço.");
      } finally {
          setIsUpdating(false);
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
              <Wrench className="h-7 w-7 text-orange-600" /> Oficina
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie as tarefas e planos de manutenção.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('ORDERS')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ORDERS' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Wrench className="h-4 w-4" /> Ordens de Serviço
          </button>
          <button 
            onClick={() => setActiveTab('PMJ')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'PMJ' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <ClipboardList className="h-4 w-4" /> Plano de Manutenção (PMJ)
          </button>
          <button 
            onClick={() => setActiveTab('COLLABORATORS')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'COLLABORATORS' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <UserCircle className="h-4 w-4" /> Colaboradores
          </button>
        </div>
      </div>

      {maintenanceAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4"/> Manutenção Vencida
            </h4>
            <ul className="space-y-1">
                {maintenanceAlerts.map(s => {
                    const vehicle = vehicles.find(v => v.id === s.vehicleId);
                    return (
                        <li key={s.id} className="text-xs text-red-700 dark:text-red-400">
                            Veículo <span className="font-bold">{vehicle?.plate}</span> atingiu o limite de KM (Vencido em: {s.nextDueKm} km).
                        </li>
                    );
                })}
            </ul>
        </div>
      )}

      {activeTab === 'PMJ' ? (
        <MaintenancePlanManager orgId={orgId} plans={filteredMaintenancePlans} schedules={filteredMaintenanceSchedules} vehicles={vehicles} stockItems={stockItems} defaultBranchId={defaultBranchId} userLevel={userLevel} />
      ) : activeTab === 'COLLABORATORS' ? (
        <CollaboratorManager 
          collaborators={filteredCollaborators}
          defaultBranchId={defaultBranchId}
          branches={branches}
          onAdd={onAddCollaborator} 
          onUpdate={onUpdateCollaborator} 
          onDelete={onDeleteCollaborator} 
        />
      ) : (
        <>
          <div className="flex justify-end gap-2">
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
          <div key={order.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
             <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded">#{String(order.orderNumber).padStart(4, '0')}</span>
                     {getStatusPill(order.status)}
                   </div>
                   <h3 className="font-bold text-base text-slate-800 dark:text-white">{order.title}</h3>
                   <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3"/> {order.vehiclePlate}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {order.date ? `Data: ${new Date(order.date + 'T12:00:00').toLocaleDateString()}` : `Aberto em: ${new Date(order.createdAt).toLocaleString()}`}</span>
                      
                      {order.odometer && (
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-700">
                              <Timer className="h-3 w-3"/> KM: {order.odometer.toLocaleString()}
                          </span>
                      )}

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

                      {order.collaboratorName && (
                          <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded font-bold border border-blue-200 dark:border-blue-800">
                              <UserCircle className="h-3 w-3"/> {order.collaboratorName} {order.laborHours ? `(${order.laborHours}h)` : ''}
                          </span>
                      )}

                      {order.laborCost && order.laborCost > 0 && (
                          <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                              <DollarSign className="h-3 w-3"/> Mão de Obra: R$ {order.laborCost.toFixed(2)}
                          </span>
                      )}
                      {order.externalServiceCost && order.externalServiceCost > 0 && (
                          <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded font-bold border border-amber-200 dark:border-amber-800">
                              <DollarSign className="h-3 w-3"/> Serviço Externo: R$ {order.externalServiceCost.toFixed(2)}
                          </span>
                      )}
                      {order.providerName && (
                          <span className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-800">
                              <Truck className="h-3 w-3"/> Prestador: {order.providerName}
                          </span>
                      )}
                   </div>
                   <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3">{order.details}</p>
                   
                   {order.parts && order.parts.length > 0 && (
                       <div className="mt-3 flex flex-wrap gap-2">
                           {order.parts.map((part, idx) => (
                               <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                   <Package className="h-3 w-3 text-blue-500" /> {part.name} ({part.quantity})
                               </span>
                           ))}
                       </div>
                   )}
                </div>

                {order.status !== 'CONCLUIDO' && (
                  <div className="flex md:flex-col gap-1 shrink-0 self-start md:self-center">
                    <button onClick={() => handleOpenEditModal(order)} className="w-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded transition-colors flex items-center gap-1"><Wrench className="h-3 w-3"/> Editar</button>
                    {order.status === 'PENDENTE' && <button onClick={() => handleStatusChange(order, 'EM_ANDAMENTO')} className="w-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 p-1.5 rounded transition-colors flex items-center gap-1"><Loader className="h-3 w-3"/> Iniciar</button>}
                    {order.status === 'EM_ANDAMENTO' && <button onClick={() => handleStatusChange(order, 'CONCLUIDO')} className="w-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 p-1.5 rounded transition-colors flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Finalizar</button>}
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
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Serviço</label>
                              <select 
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                  value={newOrderServiceType}
                                  onChange={e => setNewOrderServiceType(e.target.value as 'INTERNAL' | 'EXTERNAL')}
                              >
                                  <option value="INTERNAL">Interno</option>
                                  <option value="EXTERNAL">Externo</option>
                              </select>
                          </div>
                          {newOrderServiceType === 'EXTERNAL' && (
                              <>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Parceiro (Obrigatório)</label>
                                      <select 
                                          required 
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                          value={newOrderPartnerId}
                                          onChange={e => {
                                              setNewOrderPartnerId(e.target.value);
                                              setNewOrderServiceId('');
                                          }}
                                      >
                                          <option value="">Selecione um parceiro...</option>
                                          {partners.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                      </select>
                                  </div>
                                  {newOrderPartnerId && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Serviço (Obrigatório)</label>
                                          <select 
                                              required 
                                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                              value={newOrderServiceId}
                                              onChange={e => {
                                                  const svcId = e.target.value;
                                                  setNewOrderServiceId(svcId);
                                                  const partner = partners.find(p => p.id === newOrderPartnerId);
                                                  const service = partner?.services.find(s => s.id === svcId);
                                                  if (service) {
                                                      setNewOrderExternalServiceCost(service.cost);
                                                  }
                                              }}
                                          >
                                              <option value="">Selecione um serviço...</option>
                                              {partners.find(p => p.id === newOrderPartnerId)?.services.map(s => (
                                                  <option key={s.id} value={s.id}>{s.name} - R$ {s.cost.toFixed(2)}</option>
                                              ))}
                                          </select>
                                      </div>
                                  )}
                                  {newOrderPartnerId && newOrderServiceId && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor do Serviço (R$)</label>
                                          <input 
                                              type="number"
                                              required 
                                              placeholder="0.00"
                                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                              value={newOrderExternalServiceCost}
                                              onChange={e => setNewOrderExternalServiceCost(e.target.value === '' ? '' : Number(e.target.value))}
                                          />
                                      </div>
                                  )}
                              </>
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Veículo (Obrigatório)</label>
                          <select 
                              required 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                              value={newOrderVehicleId}
                              onChange={e => {
                                  const vid = e.target.value;
                                  setNewOrderVehicleId(vid);
                                  const v = vehicles.find(veh => veh.id === vid);
                                  if (v) {
                                      setNewOrderOdometer(v.odometer);
                                  }
                              }}
                          >
                              <option value="">Selecione um veículo...</option>
                              {vehicles.map(v => (
                                  <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data da O.S.</label>
                          <input 
                              type="date"
                              required 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                              value={newOrderDate}
                              onChange={e => setNewOrderDate(e.target.value)}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Hodômetro Atual (KM)</label>
                          <input 
                              type="number"
                              required 
                              placeholder="KM do veículo no momento"
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                              value={newOrderOdometer}
                              onChange={e => setNewOrderOdometer(Number(e.target.value))}
                          />
                      </div>
                      
                      {pendingAlertsForVehicle.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                  <Bell className="h-4 w-4"/> Agendamentos Pendentes
                              </h4>
                              <ul className="space-y-2">
                                  {pendingAlertsForVehicle.map(alert => (
                                      <li key={alert.id} className="text-xs text-blue-700 dark:text-blue-400 bg-white dark:bg-blue-950/50 p-2 rounded border border-blue-100 dark:border-blue-900">
                                          <span className="font-bold">{alert.targetName}</span> - Criado em: {new Date(alert.createdAt).toLocaleDateString()}
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}

                      {vehicleMaintenancePlan && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4"/> Plano Sugerido (PMJ)
                              </h4>
                              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">
                                  Este veículo possui o plano <strong>{vehicleMaintenancePlan.name}</strong> vinculado ao seu modelo.
                              </p>
                              <button 
                                  type="button"
                                  onClick={() => {
                                      setNewOrderTitle(`PMJ: ${vehicleMaintenancePlan.name}`);
                                      setNewOrderMaintenancePlanId(vehicleMaintenancePlan.id);
                                      setNewOrderDetails(`PMJ: ${vehicleMaintenancePlan.name}\n\nObservações:\n`);
                                      
                                      // Auto-add parts from PMJ if available
                                      if (vehicleMaintenancePlan.stockItemIds && vehicleMaintenancePlan.stockItemIds.length > 0) {
                                          const pmjParts = vehicleMaintenancePlan.stockItemIds.map(id => {
                                              const item = stockItems.find(i => i.id === id);
                                              if (item) {
                                                  return {
                                                      itemId: item.id,
                                                      name: item.name,
                                                      quantity: 1,
                                                      unitCost: item.averageCost
                                                  };
                                              }
                                              return null;
                                          }).filter(p => p !== null) as any[];
                                          setNewOrderParts(pmjParts);
                                      }
                                  }}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                  <CheckSquare className="h-4 w-4" /> Aplicar Plano Sugerido
                              </button>
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Vincular PMJ (Opcional)</label>
                          <select 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                            value={newOrderMaintenancePlanId}
                            onChange={(e) => {
                                const planId = e.target.value;
                                setNewOrderMaintenancePlanId(planId);
                                if (planId) {
                                    const plan = maintenancePlans.find(p => p.id === planId);
                                    if (plan) {
                                        setNewOrderTitle(`PMJ: ${plan.name}`);
                                        setNewOrderDetails(`PMJ: ${plan.name}\n\nObservações:\n`);
                                        
                                        // Auto-add parts from PMJ if available
                                        if (plan.stockItemIds && plan.stockItemIds.length > 0) {
                                            const pmjParts = plan.stockItemIds.map(id => {
                                                const item = stockItems.find(i => i.id === id);
                                                if (item) {
                                                    return {
                                                        itemId: item.id,
                                                        name: item.name,
                                                        quantity: 1,
                                                        unitCost: item.averageCost
                                                    };
                                                }
                                                return null;
                                            }).filter(p => p !== null) as any[];
                                            setNewOrderParts(pmjParts);
                                        }
                                    }
                                }
                            }}
                          >
                              <option value="">Nenhum PMJ selecionado</option>
                              {maintenancePlans.map(plan => (
                                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Base de Manutenção (Alerta de Chegada)</label>
                          <select 
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                            value={newOrderMaintenanceBaseId}
                            onChange={(e) => setNewOrderMaintenanceBaseId(e.target.value)}
                          >
                              <option value="">Nenhuma base selecionada</option>
                              {settings?.savedPoints?.map(point => (
                                  <option key={point.id} value={point.id}>{point.name}</option>
                              ))}
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            O sistema avisará quando o veículo chegar nesta base.
                          </p>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <input 
                              type="checkbox" 
                              id="isPreventive"
                              checked={isPreventiveMaintenance}
                              onChange={(e) => setIsPreventiveMaintenance(e.target.checked)}
                              className="mt-1 h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor="isPreventive" className="text-sm font-bold text-blue-800 dark:text-blue-300 cursor-pointer">
                              Esta é uma manutenção preventiva (Óleo e Filtros)
                              <span className="block text-[10px] font-normal text-blue-600 dark:text-blue-400 mt-0.5">
                                  Ao criar esta O.S., o KM atual do veículo será registrado como a última troca, calculando automaticamente a próxima revisão.
                              </span>
                          </label>
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

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Colaborador / Mecânico</label>
                              <select 
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold text-sm"
                                  value={newOrderCollaboratorId}
                                  onChange={e => setNewOrderCollaboratorId(e.target.value)}
                              >
                                  <option value="">Selecionar...</option>
                                  {filteredCollaborators.filter(c => c.isActive).map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Horas de Mão de Obra</label>
                              <input 
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold text-sm"
                                  placeholder="Ex: 2.5"
                                  value={newOrderLaborHours}
                                  onChange={e => setNewOrderLaborHours(e.target.value === '' ? '' : Number(e.target.value))}
                              />
                          </div>
                      </div>

                      <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-500"/> Peças do Almoxarifado
                          </label>
                          
                          <div className="grid grid-cols-1 gap-2">
                              <select 
                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                                value={selectedStockItemId}
                                onChange={e => setSelectedStockItemId(e.target.value)}
                              >
                                  <option value="">Selecionar Peça...</option>
                                  {stockItems.map(item => (
                                      <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                                  ))}
                              </select>
                              <div className="flex gap-2">
                                  <input 
                                    type="number" 
                                    min="1"
                                    className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                                    value={selectedStockItemQty}
                                    onChange={e => setSelectedStockItemQty(Number(e.target.value))}
                                  />
                                  <button 
                                    type="button"
                                    onClick={handleAddPart}
                                    className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center"
                                  >
                                      <Plus className="h-5 w-5" />
                                  </button>
                              </div>
                          </div>

                          {newOrderParts.length > 0 && (
                              <div className="space-y-2 mt-3">
                                  {newOrderParts.map(part => (
                                      <div key={part.itemId} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                                          <div className="flex flex-col flex-1">
                                              <span className="font-bold text-slate-800 dark:text-white">{part.name}</span>
                                              <span className="text-[10px] text-slate-500">Unit: R$ {part.unitCost.toFixed(2)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <input 
                                                type="number" 
                                                min="1"
                                                className="w-12 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white text-center"
                                                value={part.quantity}
                                                onChange={e => handleUpdatePartQty(part.itemId, Number(e.target.value))}
                                              />
                                              <button 
                                                type="button"
                                                onClick={() => handleRemovePart(part.itemId)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                              >
                                                  <Trash2 className="h-4 w-4" />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-white">
                                      <span>Total em Peças:</span>
                                      <span>R$ {newOrderParts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0).toFixed(2)}</span>
                                  </div>
                              </div>
                          )}
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

      {/* EDIT ORDER MODAL */}
      {editingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-blue-600"/> Editar O.S. #{String(editingOrder.orderNumber).padStart(4, '0')}
                      </h3>
                      <button onClick={() => setEditingOrder(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500"/></button>
                  </div>
                  <form onSubmit={handleUpdateOrderDetails} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo de Serviço</label>
                              <select 
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                  value={editOrderServiceType}
                                  onChange={e => setEditOrderServiceType(e.target.value as 'INTERNAL' | 'EXTERNAL')}
                              >
                                  <option value="INTERNAL">Interno</option>
                                  <option value="EXTERNAL">Externo</option>
                              </select>
                          </div>
                          {editOrderServiceType === 'EXTERNAL' && (
                              <>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Fornecedor (Obrigatório)</label>
                                      <input 
                                          type="text"
                                          required 
                                          placeholder="Nome do fornecedor"
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                          value={editOrderProviderName}
                                          onChange={e => setEditOrderProviderName(e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor do Serviço (R$)</label>
                                      <input 
                                          type="number"
                                          required 
                                          placeholder="0.00"
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold"
                                          value={editOrderExternalServiceCost}
                                          onChange={e => setEditOrderExternalServiceCost(e.target.value === '' ? '' : Number(e.target.value))}
                                      />
                                  </div>
                              </>
                          )}
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Veículo</label>
                          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-sm">
                              {editingOrder.vehiclePlate}
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Detalhes do Serviço</label>
                          <textarea 
                              required 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white min-h-[100px] resize-none text-sm"
                              value={editOrderDetails}
                              onChange={e => setEditOrderDetails(e.target.value)}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data da O.S.</label>
                          <input 
                              type="date"
                              required 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                              value={editOrderDate}
                              onChange={e => setEditOrderDate(e.target.value)}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Colaborador / Mecânico</label>
                              <select 
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold text-sm"
                                  value={editOrderCollaboratorId}
                                  onChange={e => setEditOrderCollaboratorId(e.target.value)}
                              >
                                  <option value="">Selecionar...</option>
                                  {filteredCollaborators.filter(c => c.isActive || c.id === editingOrder.collaboratorId).map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Horas de Mão de Obra</label>
                              <input 
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold text-sm"
                                  placeholder="Ex: 2.5"
                                  value={editOrderLaborHours}
                                  onChange={e => setEditOrderLaborHours(e.target.value === '' ? '' : Number(e.target.value))}
                              />
                          </div>
                      </div>

                      <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-500"/> Peças do Almoxarifado
                          </label>
                          
                          <div className="grid grid-cols-1 gap-2">
                              <select 
                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                                value={editSelectedStockItemId}
                                onChange={e => setEditSelectedStockItemId(e.target.value)}
                              >
                                  <option value="">Selecionar Peça...</option>
                                  {stockItems.map(item => (
                                      <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                                  ))}
                              </select>
                              <div className="flex gap-2">
                                  <input 
                                    type="number" 
                                    min="1"
                                    className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                                    value={editSelectedStockItemQty}
                                    onChange={e => setEditSelectedStockItemQty(Number(e.target.value))}
                                  />
                                  <button 
                                    type="button"
                                    onClick={handleAddPartToEdit}
                                    className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center"
                                  >
                                      <Plus className="h-5 w-5" />
                                  </button>
                              </div>
                          </div>

                          {editOrderParts.length > 0 && (
                              <div className="space-y-2 mt-3">
                                  {editOrderParts.map((part, index) => (
                                      <div key={index} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                                          <div className="flex flex-col flex-1">
                                              <span className="font-bold text-slate-800 dark:text-white">{part.name}</span>
                                              <span className="text-[10px] text-slate-500">Unit: R$ {part.unitCost.toFixed(2)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <input 
                                                type="number" 
                                                min="1"
                                                className="w-12 p-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white text-center"
                                                value={part.quantity}
                                                onChange={e => handleEditUpdatePartQty(index, Number(e.target.value))}
                                              />
                                              <button 
                                                type="button"
                                                onClick={() => handleRemovePartFromEdit(index)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                              >
                                                  <Trash2 className="h-4 w-4" />
                                              </button>
                                          </div>
                                      </div>
                                  ))}
                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-800 dark:text-white">
                                      <span>Total em Peças:</span>
                                      <span>R$ {editOrderParts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0).toFixed(2)}</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="pt-2 flex gap-3">
                          <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                          <button type="submit" disabled={isUpdating} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                              {isUpdating ? <Loader className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} Salvar Alterações
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
      </>
      )}
    </div>
  );
};

interface CollaboratorManagerProps {
  collaborators: import('../types').Collaborator[];
  defaultBranchId?: string;
  branches?: import('../types').Branch[];
  onAdd?: (collaborator: import('../types').Collaborator) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<import('../types').Collaborator>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const CollaboratorManager: React.FC<CollaboratorManagerProps> = ({ collaborators, defaultBranchId, branches = [], onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<import('../types').Collaborator | null>(null);
  
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState<number | ''>('');
  const [hiredDate, setHiredDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState(defaultBranchId || '');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdd || !onUpdate) return;

    setLoading(true);
    try {
      if (editingCollaborator) {
        await onUpdate(editingCollaborator.id, {
          name,
          position,
          salary: Number(salary),
          hiredDate,
          isActive,
          branchId,
          hourlyRate: Number(salary) / 220 // Assuming 220 hours per month
        });
      } else {
        await onAdd({
          id: Date.now().toString(),
          name,
          position,
          salary: Number(salary),
          hiredDate,
          isActive,
          hourlyRate: Number(salary) / 220,
          branchId: branchId || defaultBranchId
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar colaborador.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingCollaborator(null);
    setName('');
    setPosition('');
    setSalary('');
    setHiredDate(new Date().toISOString().split('T')[0]);
    setBranchId(defaultBranchId || '');
    setIsActive(true);
  };

  const handleEdit = (c: import('../types').Collaborator) => {
    setEditingCollaborator(c);
    setName(c.name);
    setPosition(c.position);
    setSalary(c.salary);
    setHiredDate(c.hiredDate);
    setBranchId(c.branchId || '');
    setIsActive(c.isActive);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Gestão de Colaboradores</h3>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all text-sm"
        >
          <Plus className="h-4 w-4" /> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {collaborators.map(c => (
          <div key={c.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">{c.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{c.position}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {c.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Salário:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">R$ {c.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Custo/Hora:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">R$ {c.hourlyRate?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Admissão:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(c.hiredDate + 'T12:00:00').toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(c)} className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors">Editar</button>
              {onDelete && (
                <button onClick={() => { if(confirm('Excluir colaborador?')) onDelete(c.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-600"/> {editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input 
                  type="text" required 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                  value={name} onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo / Função</label>
                <input 
                  type="text" required 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                  value={position} onChange={e => setPosition(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salário Mensal (R$)</label>
                  <input 
                    type="number" required 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                    value={salary} onChange={e => setSalary(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Admissão</label>
                  <input 
                    type="date" required 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                    value={hiredDate} onChange={e => setHiredDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filial Responsável</label>
                  <select 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                    value={branchId}
                    onChange={e => setBranchId(e.target.value)}
                  >
                    <option value="">Selecione uma filial</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input 
                    type="checkbox" id="isActive"
                    checked={isActive} onChange={e => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Colaborador Ativo</label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all">
                  {loading ? <Loader className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
