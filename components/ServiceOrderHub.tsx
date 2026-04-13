import React, { useState, useMemo } from 'react';
import { ServiceOrder, Vehicle, SystemSettings, Tire, TireStatus, ArrivalAlert, MaintenancePlan, MaintenanceSchedule, VehicleBrandModel, StockItem, Driver, Partner, Collaborator, UserLevel, AVAILABLE_PERMISSIONS, ModuleType, Branch, AxleSelection } from '../types';
import { Wrench, Search, ChevronDown, CheckCircle2, Loader, AlertTriangle, Calendar, Truck, Disc, Plus, X, Save, Clock, Timer, Bell, ClipboardList, CheckSquare, Package, Trash2, UserCircle, DollarSign, Settings, Shield, Lock, Building2, Tag } from 'lucide-react';
import { storageService } from '../services/storageService';
import { MaintenancePlanManager } from './MaintenancePlanManager';
import { ServiceOrderOpening } from './ServiceOrderOpening';

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
  collaborators?: Collaborator[];
  partners?: Partner[];
  drivers?: Driver[];
  onAddCollaborator?: (collaborator: Collaborator) => Promise<void>;
  onUpdateCollaborator?: (id: string, updates: Partial<Collaborator>) => Promise<void>;
  onDeleteCollaborator?: (id: string) => Promise<void>;
  userLevel: UserLevel;
  classifications?: any[];
  sectors?: any[];
  currentUser?: { name?: string; email?: string };
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
  userLevel,
  drivers = [],
  classifications = [],
  sectors = [],
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<TabView>('ORDERS');
  const [filter, setFilter] = useState<StatusFilter>('PENDENTE');
  const [fuelFilter, setFuelFilter] = useState<'ALL' | 'DIESEL' | 'GAS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllOrders, setShowAllOrders] = useState(false);

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

  React.useEffect(() => {
    if (initialModalOpen) {
      setIsCreateModalOpen(true);
      onCloseInitialModal?.();
    }
  }, [initialModalOpen, initialVehicleId, onCloseInitialModal]);

  const [isPreventiveMaintenance, setIsPreventiveMaintenance] = useState(false);
  
  const [editOrderTireId, setEditOrderTireId] = useState('');
  
  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [editOrderTitle, setEditOrderTitle] = useState('');
  const [editOrderDetails, setEditOrderDetails] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editOrderCollaboratorId, setEditOrderCollaboratorId] = useState('');
  const [editOrderLaborHours, setEditOrderLaborHours] = useState<number | ''>('');
  const [editOrderServiceType, setEditOrderServiceType] = useState<'INTERNAL' | 'EXTERNAL' | 'BOTH'>('INTERNAL');
  const [editOrderProviderName, setEditOrderProviderName] = useState('');
  const [editOrderExternalServiceCost, setEditOrderExternalServiceCost] = useState<number | ''>('');
  const [editOrderPartnerId, setEditOrderPartnerId] = useState('');
  const [editOrderServiceId, setEditOrderServiceId] = useState('');
  const [editOrderAxles, setEditOrderAxles] = useState<AxleSelection[]>([]);
  const [editOrderSectorId, setEditOrderSectorId] = useState('');
  const [editOrderClassificationId, setEditOrderClassificationId] = useState('');
  const [editOrderParts, setEditOrderParts] = useState<{ name: string; quantity: number; unitCost: number }[]>([]);
  const [editSelectedStockItemId, setEditSelectedStockItemId] = useState('');
  const [editSelectedStockItemQty, setEditSelectedStockItemQty] = useState(1);

  const [isUpdating, setIsUpdating] = useState(false);
  const [viewingOrderDetails, setViewingOrderDetails] = useState<ServiceOrder | null>(null);

  const editingVehicle = useMemo(() => {
    if (!editingOrder) return null;
    return vehicles.find(v => v.id === editingOrder.vehicleId);
  }, [editingOrder, vehicles]);

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

  const maintenanceAlerts = useMemo(() => {
    return maintenanceSchedules.filter(s => {
      const vehicle = vehicles.find(v => v.id === s.vehicleId);
      if (!vehicle || !s.nextDueKm) return false;
      return vehicle.odometer >= s.nextDueKm;
    });
  }, [maintenanceSchedules, vehicles]);

  const filteredOrders = useMemo(() => {
    return serviceOrders
      .filter(order => {
        if (filter !== 'ALL' && order.status !== filter) return false;
        
        // Fuel Filter
        if (fuelFilter !== 'ALL') {
          const vehicle = vehicles.find(v => v.id === order.vehicleId);
          const fuel = vehicle?.fuelType?.toUpperCase() || '';
          if (fuelFilter === 'DIESEL' && !fuel.includes('DIESEL')) return false;
          if (fuelFilter === 'GAS' && !fuel.includes('GAS') && !fuel.includes('GÁS')) return false;
        }

        if (searchTerm && 
            !order.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !order.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !String(order.orderNumber).includes(searchTerm)) {
          return false;
        }
        return true;
      });
  }, [serviceOrders, filter, searchTerm, fuelFilter, vehicles]);

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
      setEditOrderTireId(order.tireId || '');
      setEditOrderSectorId(order.sectorId || '');
      setEditOrderClassificationId(order.classificationId || '');
      setEditOrderAxles(order.axles || []);
      
      // Try to find partner and service ID for the dropdowns
      if (order.providerName) {
          const partner = partners.find(p => p.name === order.providerName);
          if (partner) {
              setEditOrderPartnerId(partner.id);
              if (order.services && order.services.length > 0) {
                  setEditOrderServiceId(order.services[0].id);
              }
          }
      } else {
          setEditOrderPartnerId('');
          setEditOrderServiceId('');
      }
  };

  const handleUpdateOrderDetails = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingOrder) return;

      setIsUpdating(true);
      try {
          const collaborator = filteredCollaborators.find(c => c.id === editOrderCollaboratorId);
          const laborCost = (collaborator && editOrderLaborHours) ? (collaborator.hourlyRate || (collaborator.salary / 220)) * Number(editOrderLaborHours) : 0;

          const partner = partners.find(p => p.id === editOrderPartnerId);
          const service = partner?.services.find(s => s.id === editOrderServiceId);
          const tire = tires.find(t => t.id === editOrderTireId);
          const sector = sectors.find(s => s.id === editOrderSectorId);
          const classification = classifications.find(c => c.id === editOrderClassificationId);

          await onUpdateOrder(editingOrder.id, {
              title: editOrderTitle,
              details: editOrderDetails,
              tireId: editOrderTireId || undefined,
              tireFireNumber: tire?.fireNumber,
              date: editOrderDate,
              axles: editOrderAxles.length > 0 ? editOrderAxles : undefined,
              serviceType: editOrderServiceType,
              providerName: (editOrderServiceType === 'EXTERNAL' || editOrderServiceType === 'BOTH') ? (partner?.name || editOrderProviderName) : undefined,
              externalServiceCost: (editOrderServiceType === 'EXTERNAL' || editOrderServiceType === 'BOTH') && editOrderExternalServiceCost !== '' ? Number(editOrderExternalServiceCost) : undefined,
              services: (editOrderServiceType === 'EXTERNAL' || editOrderServiceType === 'BOTH') && service ? [{ 
                  id: service.id, 
                  name: service.name, 
                  cost: (editOrderExternalServiceCost !== '' ? Number(editOrderExternalServiceCost) : 0),
                  axles: editOrderAxles.length > 0 ? editOrderAxles : undefined
              }] : undefined,
              parts: editOrderParts.length > 0 ? editOrderParts : undefined,
              collaboratorId: (editOrderServiceType === 'INTERNAL' || editOrderServiceType === 'BOTH') ? (editOrderCollaboratorId || undefined) : undefined,
              collaboratorName: (editOrderServiceType === 'INTERNAL' || editOrderServiceType === 'BOTH') ? collaborator?.name : undefined,
              laborHours: (editOrderServiceType === 'INTERNAL' || editOrderServiceType === 'BOTH') ? (editOrderLaborHours !== '' ? Number(editOrderLaborHours) : undefined) : undefined,
              laborCost: (editOrderServiceType === 'INTERNAL' || editOrderServiceType === 'BOTH') ? (laborCost > 0 ? laborCost : undefined) : undefined,
              sectorId: editOrderSectorId || undefined,
              sectorName: sector?.name,
              classificationId: editOrderClassificationId || undefined,
              classificationName: classification?.name
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{serviceOrders.filter(o => o.status === 'PENDENTE').length}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Abertas</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Loader className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{serviceOrders.filter(o => o.status === 'EM_ANDAMENTO').length}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Em Execução</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{serviceOrders.filter(o => o.status === 'CONCLUIDO').length}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Finalizadas</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Wrench className="h-5 w-5 text-slate-600" />
                </div>
                <span className="text-2xl font-black text-slate-800 dark:text-white">{serviceOrders.length}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Geral</p>
        </div>
      </div>

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
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por placa, título ou nº da O.S..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['ALL', 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'] as StatusFilter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all ${filter === f ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            {f === 'ALL' ? 'Todos' : f === 'PENDENTE' ? 'Abertas' : f === 'EM_ANDAMENTO' ? 'Em Execução' : 'Finalizadas'}
                        </button>
                    ))}
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                        onClick={() => setFuelFilter('ALL')} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all ${fuelFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        TODOS COMBUST.
                    </button>
                    <button 
                        onClick={() => setFuelFilter('DIESEL')} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all ${fuelFilter === 'DIESEL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'}`}
                    >
                        DIESEL
                    </button>
                    <button 
                        onClick={() => setFuelFilter('GAS')} 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all ${fuelFilter === 'GAS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'}`}
                    >
                        GÁS
                    </button>
                </div>
                {onAddOrder && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all text-sm active:scale-95 ml-auto lg:ml-0"
                    >
                        <Plus className="h-4 w-4" /> Abrir O.S.
                    </button>
                )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(showAllOrders ? filteredOrders : filteredOrders.slice(0, 10)).map(order => (
              <div key={order.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-orange-500/30 transition-all duration-300 flex flex-col overflow-hidden">
                 {/* Card Header */}
                 <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black px-2 py-0.5 rounded-lg tracking-wider">
                                #{String(order.orderNumber).padStart(4, '0')}
                            </span>
                            {getStatusPill(order.status)}
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-white leading-tight mt-1 group-hover:text-orange-600 transition-colors">{order.title}</h3>
                    </div>
                    {/* License Plate Badge */}
                    <div 
                        onClick={() => order.status === 'CONCLUIDO' && setViewingOrderDetails(order)}
                        className={`flex flex-col items-center bg-white dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-700 rounded-md px-2 py-0.5 shadow-sm ${order.status === 'CONCLUIDO' ? 'cursor-pointer hover:scale-105 transition-transform active:scale-95' : ''}`}
                    >
                        <div className="w-full h-1 bg-blue-600 rounded-t-sm mb-0.5"></div>
                        <span className="text-[10px] font-black text-slate-800 dark:text-white tracking-widest uppercase">{order.vehiclePlate}</span>
                    </div>
                 </div>

                 {/* Card Body */}
                 <div className="p-4 flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            <Calendar className="h-3 w-3 text-orange-500"/> 
                            {order.date ? new Date(order.date + (order.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        {order.odometer && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                <Timer className="h-3 w-3 text-blue-500"/> {order.odometer.toLocaleString()} KM
                            </span>
                        )}
                        {order.axles && order.axles.length > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-800/50">
                                <Disc className="h-3 w-3 text-purple-500"/> Eixos: {order.axles.map(a => `${a.axle}${a.side === 'BOTH' ? '' : a.side === 'LEFT' ? 'E' : 'D'}`).join(', ')}
                            </span>
                        )}
                        {order.collaboratorName && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <UserCircle className="h-3 w-3"/> {order.collaboratorName}
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                        "{order.details}"
                    </p>

                    {/* Costs Section */}
                    {(order.laborCost || order.externalServiceCost) && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
                            {order.laborCost && order.laborCost > 0 && (
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Mão de Obra</span>
                                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">R$ {order.laborCost.toFixed(2)}</span>
                                </div>
                            )}
                            {order.externalServiceCost && order.externalServiceCost > 0 && (
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ext. / Peças</span>
                                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">R$ {order.externalServiceCost.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Parts Section */}
                    {order.parts && order.parts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {order.parts.slice(0, 3).map((part, idx) => (
                                <span key={idx} className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[9px] px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700/50 flex items-center gap-1">
                                    <Package className="h-2.5 w-2.5 text-blue-400" /> {part.name}
                                </span>
                            ))}
                            {order.parts.length > 3 && (
                                <span className="text-[9px] font-bold text-slate-400">+{order.parts.length - 3} mais</span>
                            )}
                        </div>
                    )}
                 </div>

                 {/* Card Footer / Actions */}
                 <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {order.status === 'EM_ANDAMENTO' && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                                <Clock className="h-3 w-3"/> {getDuration(order.startTime || order.createdAt, new Date().toISOString())}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-1.5">
                        <button 
                            onClick={() => handleOpenEditModal(order)} 
                            className="p-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-90"
                            title="Editar O.S."
                        >
                            <Wrench className="h-4 w-4"/>
                        </button>
                        {order.status === 'PENDENTE' && (
                            <button 
                                onClick={() => handleStatusChange(order, 'EM_ANDAMENTO')} 
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <Loader className="h-3 w-3"/> Iniciar
                            </button>
                        )}
                        {order.status === 'EM_ANDAMENTO' && (
                            <button 
                                onClick={() => handleStatusChange(order, 'CONCLUIDO')} 
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-green-600/20"
                            >
                                <CheckCircle2 className="h-3 w-3"/> Finalizar
                            </button>
                        )}
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center p-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 text-slate-400 flex flex-col items-center justify-center gap-4">
               <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full">
                  <Wrench className="h-12 w-12 opacity-20"/>
               </div>
               <div className="space-y-1">
                  <p className="font-black text-slate-800 dark:text-white">Nenhuma Ordem de Serviço encontrada</p>
                  <p className="text-xs">Tente ajustar seus filtros ou buscar por outro termo.</p>
               </div>
            </div>
          )}

          {filteredOrders.length > 10 && (
            <div className="flex justify-center pt-10">
              <button 
                onClick={() => setShowAllOrders(!showAllOrders)}
                className="px-12 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black tracking-widest transition-all active:scale-95 flex items-center gap-3 shadow-sm"
              >
                {showAllOrders ? 'MOSTRAR MENOS' : `VER TODAS AS ORDENS (${filteredOrders.length})`}
                <ChevronDown className={`h-4 w-4 transition-transform ${showAllOrders ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </>
      )}

      {/* NEW CREATE ORDER MODAL */}
      <ServiceOrderOpening 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        onSubmit={async (orderData) => {
          if (onAddOrder) {
            // Create Arrival Alert if a base is selected
            if (orderData.maintenanceBaseId && settings?.savedPoints) {
              const base = settings.savedPoints.find(p => p.id === orderData.maintenanceBaseId);
              if (base) {
                const newAlert: ArrivalAlert = {
                  id: Date.now().toString() + Math.random().toString(36).substring(7),
                  vehiclePlate: orderData.vehiclePlate || '',
                  targetName: base.name,
                  targetLat: base.lat,
                  targetLng: base.lng,
                  radius: base.radius || settings.alertRadius || 500,
                  services: `O.S.: ${orderData.title || 'Manutenção'}`,
                  status: 'PENDING',
                  createdAt: new Date().toISOString(),
                  createdBy: 'Sistema (O.S.)',
                  branchId: defaultBranchId
                };
                await storageService.addArrivalAlert(orgId, newAlert);
                orderData.arrivalAlertId = newAlert.id;
              }
            }
            await onAddOrder(orderData as any);
            setIsCreateModalOpen(false);
          }
        }}
        vehicles={vehicles || []}
        branches={branches || []}
        collaborators={collaborators || []}
        partners={partners || []}
        drivers={drivers || []}
        stockItems={stockItems || []}
        settings={settings}
        defaultBranchId={defaultBranchId}
        nextOrderNumber={serviceOrders.length > 0 ? Math.max(...serviceOrders.map(o => o.orderNumber)) + 1 : 1}
        classifications={classifications}
        sectors={sectors}
      />

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
                  <form onSubmit={handleUpdateOrderDetails} className="p-6 space-y-6">
                      {/* Section: Basic Info */}
                      <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <Truck className="h-4 w-4 text-blue-500"/>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Informações do Veículo</h4>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Veículo</label>
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-black text-sm">
                                      {editingOrder.vehiclePlate}
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Data da O.S.</label>
                                  <input 
                                      type="date"
                                      required 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                      value={editOrderDate}
                                      onChange={e => setEditOrderDate(e.target.value)}
                                  />
                              </div>

                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Pneu (Opcional)</label>
                                  <select 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                      value={editOrderTireId}
                                      onChange={e => setEditOrderTireId(e.target.value)}
                                  >
                                      <option value="">Nenhum</option>
                                      {tires
                                        .filter(t => !editingOrder.vehicleId || t.vehicleId === editingOrder.vehicleId)
                                        .map(t => (
                                          <option key={t.id} value={t.id}>#{t.fireNumber} - {t.brand}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* Section: Service Details */}
                      <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <Wrench className="h-4 w-4 text-blue-500"/>
                              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Detalhes do Serviço</h4>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Tipo de Serviço</label>
                                  <select 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                      value={editOrderServiceType}
                                      onChange={e => setEditOrderServiceType(e.target.value as 'INTERNAL' | 'EXTERNAL' | 'BOTH')}
                                  >
                                      <option value="INTERNAL">Interno</option>
                                      <option value="EXTERNAL">Externo</option>
                                      <option value="BOTH">Misto (Interno + Externo)</option>
                                  </select>
                              </div>
                              
                              {(editOrderServiceType === 'INTERNAL' || editOrderServiceType === 'BOTH') && (
                                  <div className="animate-in slide-in-from-top-2">
                                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Colaborador Interno</label>
                                      <select 
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                          value={editOrderCollaboratorId}
                                          onChange={e => setEditOrderCollaboratorId(e.target.value)}
                                      >
                                          <option value="">Selecionar...</option>
                                          {filteredCollaborators.filter(c => c.isActive || c.id === editingOrder.collaboratorId).map(c => (
                                              <option key={c.id} value={c.id}>{c.name}</option>
                                          ))}
                                      </select>
                                  </div>
                              )}

                              {(editOrderServiceType === 'EXTERNAL' || editOrderServiceType === 'BOTH') && (
                                  <div className="animate-in slide-in-from-top-2">
                                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Parceiro Externo</label>
                                      <select 
                                          required 
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                          value={editOrderPartnerId}
                                          onChange={e => {
                                              setEditOrderPartnerId(e.target.value);
                                              setEditOrderServiceId('');
                                          }}
                                      >
                                          <option value="">Selecione...</option>
                                          {partners.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                      </select>
                                  </div>
                              )}
                          </div>

                          {(editOrderServiceType === 'EXTERNAL' || editOrderServiceType === 'BOTH') && editOrderPartnerId && (
                              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Serviço Externo</label>
                                      <select 
                                          required 
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                          value={editOrderServiceId}
                                          onChange={e => {
                                              const svcId = e.target.value;
                                              setEditOrderServiceId(svcId);
                                              const partner = partners.find(p => p.id === editOrderPartnerId);
                                              const service = partner?.services.find(s => s.id === svcId);
                                              if (service) {
                                                  setEditOrderExternalServiceCost(service.cost);
                                              }
                                          }}
                                      >
                                          <option value="">Selecione...</option>
                                          {partners.find(p => p.id === editOrderPartnerId)?.services.map(s => (
                                              <option key={s.id} value={s.id}>{s.name}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Valor Externo (R$)</label>
                                      <input 
                                          type="number"
                                          required 
                                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                          value={editOrderExternalServiceCost}
                                          onChange={e => setEditOrderExternalServiceCost(e.target.value === '' ? '' : Number(e.target.value))}
                                      />
                                  </div>
                              </div>
                          )}

                          {(editOrderServiceType === 'EXTERNAL' || editOrderServiceType === 'BOTH') && !editOrderPartnerId && editOrderProviderName && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                  <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300">Fornecedor: {editOrderProviderName}</p>
                                  <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300">Valor: R$ {Number(editOrderExternalServiceCost).toFixed(2)}</p>
                              </div>
                          )}

                          {/* Axle Selection */}
                          {editingVehicle && editingVehicle.axles > 0 && (
                              <div className="space-y-2 animate-in slide-in-from-top-2">
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Vincular aos Eixos</label>
                                  <div className="flex flex-col gap-2">
                                      {Array.from({ length: editingVehicle.axles }).map((_, i) => {
                                          const axleNum = i + 1;
                                          const currentAxleSelection = editOrderAxles.find(a => a.axle === axleNum);
                                          
                                          const toggleSide = (side: 'LEFT' | 'RIGHT') => {
                                            const currentAxles = [...editOrderAxles];
                                            const index = currentAxles.findIndex(a => a.axle === axleNum);
                                            
                                            if (index === -1) {
                                              currentAxles.push({ axle: axleNum, side });
                                            } else {
                                              const existing = currentAxles[index];
                                              if (existing.side === 'BOTH') {
                                                existing.side = side === 'LEFT' ? 'RIGHT' : 'LEFT';
                                              } else if (existing.side === side) {
                                                currentAxles.splice(index, 1);
                                              } else {
                                                existing.side = 'BOTH';
                                              }
                                            }
                                            setEditOrderAxles(currentAxles);
                                          };

                                          return (
                                              <div key={axleNum} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase w-14">Eixo {axleNum}</span>
                                                  <div className="flex gap-1.5">
                                                      <button
                                                          type="button"
                                                          onClick={() => toggleSide('LEFT')}
                                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                              currentAxleSelection?.side === 'LEFT' || currentAxleSelection?.side === 'BOTH'
                                                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300'
                                                          }`}
                                                      >
                                                          E
                                                      </button>
                                                      <button
                                                          type="button"
                                                          onClick={() => toggleSide('RIGHT')}
                                                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                              currentAxleSelection?.side === 'RIGHT' || currentAxleSelection?.side === 'BOTH'
                                                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300'
                                                          }`}
                                                      >
                                                          D
                                                      </button>
                                                  </div>
                                                  {currentAxleSelection?.side === 'BOTH' && (
                                                      <span className="text-[8px] font-black text-blue-500 uppercase ml-auto">Ambos</span>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-medium italic">Selecione o lado (Esquerdo/Direito) para cada eixo.</p>
                              </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Setor</label>
                                  <select 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                      value={editOrderSectorId}
                                      onChange={e => setEditOrderSectorId(e.target.value)}
                                  >
                                      <option value="">Selecionar...</option>
                                      {sectors.map(s => (
                                          <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Classificação</label>
                                  <select 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                      value={editOrderClassificationId}
                                      onChange={e => setEditOrderClassificationId(e.target.value)}
                                  >
                                      <option value="">Selecionar...</option>
                                      {classifications.map(c => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Descrição do Serviço</label>
                                  <textarea 
                                      required 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white min-h-[100px] resize-none text-sm transition-all"
                                      value={editOrderDetails}
                                      onChange={e => setEditOrderDetails(e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1">Horas M.O.</label>
                                  <input 
                                      type="number"
                                      step="0.5"
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                      value={editOrderLaborHours}
                                      onChange={e => setEditOrderLaborHours(e.target.value === '' ? '' : Number(e.target.value))}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Section: Parts */}
                      <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                              <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-blue-500"/>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Peças e Materiais</h4>
                              </div>
                          </div>
                          
                          <div className="space-y-3">
                              <div className="flex gap-2 items-center">
                                  <select 
                                    className="w-[200px] h-[45px] p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold transition-all"
                                    value={editSelectedStockItemId}
                                    onChange={e => setEditSelectedStockItemId(e.target.value)}
                                  >
                                      <option value="">Selecionar Peça...</option>
                                      {stockItems.map(item => (
                                          <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                                      ))}
                                  </select>
                                  <input 
                                    type="number" 
                                    min="1"
                                    className="w-20 h-[45px] p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold text-center transition-all"
                                    value={editSelectedStockItemQty}
                                    onChange={e => setEditSelectedStockItemQty(Number(e.target.value))}
                                  />
                                  <button 
                                    type="button"
                                    onClick={handleAddPartToEdit}
                                    className="h-[45px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all active:scale-90 flex items-center justify-center shadow-lg shadow-blue-600/20"
                                  >
                                      <Plus className="h-5 w-5" />
                                  </button>
                              </div>

                              {editOrderParts.length > 0 && (
                                  <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                      {editOrderParts.map((part, index) => (
                                          <div key={index} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                              <div className="flex flex-col">
                                                  <span className="text-[10px] font-bold text-slate-800 dark:text-white">{part.name}</span>
                                                  <span className="text-[9px] text-slate-500">R$ {part.unitCost.toFixed(2)} / un</span>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  <span className="text-[10px] font-black text-slate-800 dark:text-white">x{part.quantity}</span>
                                                  <button 
                                                    type="button"
                                                    onClick={() => handleRemovePartFromEdit(index)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                  >
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center px-1">
                                          <span className="text-[10px] font-black text-slate-500 uppercase">Total Peças</span>
                                          <span className="text-xs font-black text-slate-800 dark:text-white">R$ {editOrderParts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0).toFixed(2)}</span>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">Cancelar</button>
                          <button type="submit" disabled={isUpdating} className="flex-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95">
                              {isUpdating ? <Loader className="h-5 w-5 animate-spin"/> : <Save className="h-5 w-5"/>} Salvar Alterações
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* VIEW ORDER DETAILS MODAL */}
      {viewingOrderDetails && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                              <CheckCircle2 className="h-6 w-6 text-emerald-600"/>
                          </div>
                          <div>
                              <h3 className="font-black text-xl text-slate-800 dark:text-white">Ordem de Serviço Finalizada</h3>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">#{String(viewingOrderDetails.orderNumber).padStart(4, '0')}</p>
                          </div>
                      </div>
                      <button onClick={() => setViewingOrderDetails(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                          <X className="h-6 w-6 text-slate-500"/>
                      </button>
                  </div>

                  {/* Content */}
                  <div className="p-8 overflow-y-auto space-y-8">
                      {/* Vehicle & Date Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Veículo</span>
                              <div className="flex flex-col items-center w-fit bg-white dark:bg-slate-800 border-2 border-slate-800 dark:border-slate-700 rounded-md px-3 py-1 shadow-sm">
                                  <div className="w-full h-1 bg-blue-600 rounded-t-sm mb-0.5"></div>
                                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">{viewingOrderDetails.vehiclePlate}</span>
                              </div>
                          </div>
                          <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Data de Conclusão</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-orange-500"/>
                                  {viewingOrderDetails.completedAt ? new Date(viewingOrderDetails.completedAt).toLocaleDateString() : 'N/A'}
                              </p>
                          </div>
                          <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Hodômetro</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                  <Timer className="h-4 w-4 text-blue-500"/>
                                  {viewingOrderDetails.odometer?.toLocaleString()} KM
                              </p>
                          </div>
                          <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Responsável</span>
                              <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                  <UserCircle className="h-4 w-4 text-purple-500"/>
                                  {viewingOrderDetails.collaboratorName || viewingOrderDetails.providerName || 'N/A'}
                              </p>
                          </div>
                          {viewingOrderDetails.axles && viewingOrderDetails.axles.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Eixos Vinculados</span>
                                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                    <Disc className="h-4 w-4"/>
                                    {viewingOrderDetails.axles.map(a => `Eixo ${a.axle} (${a.side === 'BOTH' ? 'Ambos' : a.side === 'LEFT' ? 'Esq' : 'Dir'})`).join(', ')}
                                </p>
                            </div>
                          )}
                          {viewingOrderDetails.sectorName && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Setor</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-indigo-500"/>
                                    {viewingOrderDetails.sectorName}
                                </p>
                            </div>
                          )}
                          {viewingOrderDetails.classificationName && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Classificação</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-pink-500"/>
                                    {viewingOrderDetails.classificationName}
                                </p>
                            </div>
                          )}
                      </div>

                      {/* Service Title & Details */}
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <h4 className="font-black text-slate-800 dark:text-white text-lg">{viewingOrderDetails.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                              "{viewingOrderDetails.details}"
                          </p>
                      </div>

                      {/* Financial Summary */}
                      <div className="space-y-4">
                          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-500"/> Resumo Financeiro
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Mão de Obra</span>
                                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">R$ {viewingOrderDetails.laborCost?.toFixed(2) || '0.00'}</p>
                              </div>
                              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">Peças / Externo</span>
                                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                                      R$ {((viewingOrderDetails.externalServiceCost || 0) + (viewingOrderDetails.parts?.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) || 0)).toFixed(2)}
                                  </p>
                              </div>
                              <div className="p-4 bg-slate-800 dark:bg-slate-700 rounded-2xl shadow-lg">
                                  <span className="text-[10px] font-black text-slate-400 uppercase">Total Geral</span>
                                  <p className="text-xl font-black text-white">
                                      R$ {((viewingOrderDetails.laborCost || 0) + (viewingOrderDetails.externalServiceCost || 0) + (viewingOrderDetails.parts?.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) || 0)).toFixed(2)}
                                  </p>
                              </div>
                          </div>
                      </div>

                      {/* Parts List */}
                      {viewingOrderDetails.parts && viewingOrderDetails.parts.length > 0 && (
                          <div className="space-y-4">
                              <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                  <Package className="h-4 w-4 text-blue-500"/> Peças Utilizadas
                              </h5>
                              <div className="grid grid-cols-1 gap-2">
                                  {viewingOrderDetails.parts.map((part, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                                  <Package className="h-4 w-4 text-slate-400"/>
                                              </div>
                                              <div>
                                                  <p className="text-sm font-bold text-slate-800 dark:text-white">{part.name}</p>
                                                  <p className="text-[10px] text-slate-500">Valor Unitário: R$ {part.unitCost.toFixed(2)}</p>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-sm font-black text-slate-800 dark:text-white">x{part.quantity}</p>
                                              <p className="text-[10px] font-bold text-emerald-600">R$ {(part.quantity * part.unitCost).toFixed(2)}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
                      <button 
                          onClick={() => setViewingOrderDetails(null)}
                          className="px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-slate-600 transition-all active:scale-95 shadow-lg"
                      >
                          Fechar Detalhes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

interface CollaboratorManagerProps {
  collaborators: Collaborator[];
  defaultBranchId?: string;
  branches?: Branch[];
  onAdd?: (collaborator: Collaborator) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Collaborator>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const CollaboratorManager: React.FC<CollaboratorManagerProps> = ({ collaborators, defaultBranchId, branches = [], onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState<number | ''>('');
  const [hiredDate, setHiredDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState(defaultBranchId || '');
  const [isActive, setIsActive] = useState(true);
  const [allowedModules, setAllowedModules] = useState<ModuleType[]>(['MECHANICAL']);
  const [permissions, setPermissions] = useState<string[]>([]);
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
          hourlyRate: Number(salary) / 220,
          allowedModules,
          permissions
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
          branchId: branchId || defaultBranchId,
          allowedModules,
          permissions
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
    setAllowedModules(['MECHANICAL']);
    setPermissions([]);
  };

  const handleEdit = (c: Collaborator) => {
    setEditingCollaborator(c);
    setName(c.name);
    setPosition(c.position);
    setSalary(c.salary);
    setHiredDate(c.hiredDate);
    setBranchId(c.branchId || '');
    setIsActive(c.isActive);
    setAllowedModules(c.allowedModules || ['MECHANICAL']);
    setPermissions(c.permissions || []);
    setIsModalOpen(true);
  };

  const toggleModule = (mod: ModuleType) => {
    setAllowedModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const togglePermission = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Shield className="h-3 w-3"/> Módulos Permitidos</label>
                  <div className="space-y-1">
                    {(['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL'] as ModuleType[]).map(mod => (
                      <label key={mod} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={allowedModules.includes(mod)} 
                          onChange={() => toggleModule(mod)} 
                          className="w-3 h-3 text-blue-600 rounded" 
                        />
                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                          {mod === 'TIRES' ? 'Pneus' : mod === 'MECHANICAL' ? 'Manutenção' : mod === 'VEHICLES' ? 'Veículos' : 'Combustível'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Lock className="h-3 w-3"/> Permissões</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {AVAILABLE_PERMISSIONS.map(perm => (
                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={permissions.includes(perm.id)} 
                          onChange={() => togglePermission(perm.id)} 
                          className="w-3 h-3 text-blue-600 rounded" 
                        />
                        <span className="text-[10px] text-slate-700 dark:text-slate-300">{perm.label}</span>
                      </label>
                    ))}
                  </div>
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
