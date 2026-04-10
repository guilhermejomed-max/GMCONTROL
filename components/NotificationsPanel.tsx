
import React, { useState, useMemo } from 'react';
import { Tire, SystemSettings, Vehicle, ArrivalAlert, MaintenanceSchedule, MaintenancePlan } from '../types';
import { X, MapPin, CheckCircle2, Clock, Trash2, Bell, Wrench, CalendarClock, AlertTriangle, Gauge, Disc } from 'lucide-react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  settings: SystemSettings;
  arrivalAlerts: ArrivalAlert[];
  maintenanceSchedules?: MaintenanceSchedule[];
  maintenancePlans?: MaintenancePlan[];
  onDeleteAlert?: (id: string) => Promise<void>;
  onDeleteAllAlerts?: () => Promise<void>;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ 
  isOpen, 
  onClose, 
  tires: allTires, 
  vehicles: allVehicles, 
  branches = [],
  defaultBranchId,
  settings, 
  arrivalAlerts: allArrivalAlerts, 
  maintenanceSchedules: allMaintenanceSchedules = [], 
  maintenancePlans = [], 
  onDeleteAlert, 
  onDeleteAllAlerts 
}) => {
  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);

  const vehicles = allVehicles;

  const arrivalAlerts = useMemo(() => {
    return defaultBranchId ? allArrivalAlerts.filter(aa => aa.branchId === defaultBranchId) : allArrivalAlerts;
  }, [allArrivalAlerts, defaultBranchId]);

  const maintenanceSchedules = allMaintenanceSchedules;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Helper to check if vehicle is at any base
  const isVehicleAtBase = (vehicle?: Vehicle) => {
    if (!vehicle || !vehicle.lastLocation || !settings.savedPoints) return false;
    const { lat, lng } = vehicle.lastLocation;
    return settings.savedPoints.some(point => {
      const R = 6371e3;
      const φ1 = lat * Math.PI/180;
      const φ2 = point.lat * Math.PI/180;
      const Δφ = (point.lat - lat) * Math.PI/180;
      const Δλ = (point.lng - lng) * Math.PI/180;
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance <= (point.radius || 500);
    });
  };

  // Overdue Maintenance (Only Oil changes at base)
  const overdueMaintenance = useMemo(() => {
    const overdueFromSchedules = maintenanceSchedules.filter(s => {
      if (s.status !== 'OVERDUE') return false;
      const vehicle = vehicles.find(v => v.id === s.vehicleId);
      const plan = maintenancePlans.find(p => p.id === s.planId);
      const isOil = plan?.name.toLowerCase().includes('óleo') || plan?.name.toLowerCase().includes('oleo');
      return isOil && isVehicleAtBase(vehicle);
    });

    const overdueFromVehicles = vehicles.filter(v => {
      if (v.type !== 'CAVALO' && v.type !== 'BI-TRUCK') return false;
      const nextDue = (v.lastPreventiveKm || 0) + (v.revisionIntervalKm || 10000);
      return (v.odometer || 0) >= nextDue && isVehicleAtBase(v);
    }).map(v => ({
      id: `vehicle-overdue-${v.id}`,
      vehicleId: v.id,
      planId: 'preventive',
      status: 'OVERDUE' as const,
      nextDueKm: (v.lastPreventiveKm || 0) + (v.revisionIntervalKm || 10000),
      isVehicleBased: true
    }));

    return [...overdueFromSchedules, ...overdueFromVehicles];
  }, [maintenanceSchedules, vehicles, maintenancePlans, settings.savedPoints]);

  // Low Tread Depth Tires (Hide as per user request to show ONLY important ones)
  const criticalTires = useMemo(() => {
    return []; // tires.filter(t => t.currentTreadDepth <= (settings.minTreadDepth || 3));
  }, []);

  // Filter alerts: only show those not dismissed
  const visibleMaintenance = useMemo(() => {
    return overdueMaintenance.filter(m => !dismissedIds.has(m.id));
  }, [overdueMaintenance, dismissedIds]);

  const visibleTires = useMemo(() => {
    return criticalTires.filter(t => !dismissedIds.has(t.id));
  }, [criticalTires, dismissedIds]);

  const visibleArrivals = useMemo(() => {
    return arrivalAlerts.filter(alert => !dismissedIds.has(alert.id) && alert.status === 'ARRIVED');
  }, [arrivalAlerts, dismissedIds]);

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const dismissGroup = (ids: string[]) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const totalAlerts = visibleMaintenance.length + visibleTires.length + visibleArrivals.length;

  if (!isOpen) return null;

  const NotificationGroup = ({ title, items, children }: { title: string, items: any[], children: (item: any) => React.ReactNode }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-bold text-slate-500 uppercase">{title} ({items.length})</h4>
          <button onClick={() => dismissGroup(items.map(i => i.id))} className="text-[10px] text-blue-600 hover:underline">Ignorar todos</button>
        </div>
        {items.map(children)}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600"/>
              Notificações
              {totalAlerts > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{totalAlerts}</span>}
            </h3>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X className="h-5 w-5" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
          
          {/* EMPTY STATE */}
          {totalAlerts === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <CheckCircle2 className="h-16 w-16 mb-4 text-green-500" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum alerta pendente</p>
              </div>
          )}

          {/* OVERDUE MAINTENANCE */}
          <NotificationGroup title="Manutenção Vencida" items={visibleMaintenance}>
            {(schedule: any) => {
              const vehicle = vehicles.find(v => v.id === schedule.vehicleId);
              const planName = schedule.isVehicleBased ? 'Troca de Óleo (Preventiva)' : maintenancePlans.find(p => p.id === schedule.planId)?.name;
              return (
                <div key={schedule.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm flex items-start gap-3 relative group transition-all hover:shadow-md">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                  <div className="p-2 rounded-xl shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600">
                    <AlertTriangle className="h-5 w-5"/>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{vehicle?.plate || 'Veículo'}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Plano: <span className="font-bold">{planName}</span></p>
                  </div>
                  <button onClick={() => dismissNotification(schedule.id)} className="text-slate-300 hover:text-slate-500"><X className="h-4 w-4"/></button>
                </div>
              );
            }}
          </NotificationGroup>

          {/* CRITICAL TIRES */}
          <NotificationGroup title="Pneus em Alerta" items={visibleTires}>
            {(tire: any) => {
              const vehicle = vehicles.find(v => v.id === tire.vehicleId);
              return (
                <div key={tire.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-sm flex items-start gap-3 relative group transition-all hover:shadow-md">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                  <div className="p-2 rounded-xl shrink-0 bg-orange-50 dark:bg-orange-900/20 text-orange-600">
                    <Disc className="h-5 w-5"/>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Fogo: {tire.fireNumber}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Veículo: {vehicle?.plate || 'Estoque'} • Sulco: <span className="text-red-500 font-black">{tire.currentTreadDepth}mm</span></p>
                  </div>
                  <button onClick={() => dismissNotification(tire.id)} className="text-slate-300 hover:text-slate-500"><X className="h-4 w-4"/></button>
                </div>
              );
            }}
          </NotificationGroup>

          {/* ARRIVAL ALERTS */}
          <NotificationGroup title="Alertas de Chegada" items={visibleArrivals}>
            {(alert: any) => (
              <div key={alert.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-green-100 dark:border-green-900/30 shadow-sm flex items-start gap-3 relative group transition-all hover:shadow-md">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                <div className="p-2 rounded-xl shrink-0 bg-green-50 dark:bg-green-900/20 text-green-600">
                  <CheckCircle2 className="h-5 w-5"/>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{alert.vehiclePlate}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Destino: <span className="font-semibold">{alert.targetName}</span></p>
                </div>
                <button onClick={() => dismissNotification(alert.id)} className="text-slate-300 hover:text-slate-500"><X className="h-4 w-4"/></button>
              </div>
            )}
          </NotificationGroup>

        </div>
      </div>
    </div>
  );
};

