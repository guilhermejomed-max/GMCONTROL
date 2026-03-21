
import React, { useState, useMemo } from 'react';
import { Tire, SystemSettings, Vehicle, ArrivalAlert, MaintenanceSchedule, MaintenancePlan } from '../types';
import { X, MapPin, CheckCircle2, Clock, Trash2, Bell, Wrench, CalendarClock, AlertTriangle, Gauge, Disc } from 'lucide-react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tires: Tire[];
  vehicles: Vehicle[];
  settings: SystemSettings;
  arrivalAlerts: ArrivalAlert[];
  maintenanceSchedules?: MaintenanceSchedule[];
  maintenancePlans?: MaintenancePlan[];
  onDeleteAlert?: (id: string) => Promise<void>;
  onDeleteAllAlerts?: () => Promise<void>;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ 
  isOpen, onClose, tires, vehicles, settings, arrivalAlerts, maintenanceSchedules = [], maintenancePlans = [], onDeleteAlert, onDeleteAllAlerts 
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Overdue Maintenance
  const overdueMaintenance = useMemo(() => {
    return maintenanceSchedules.filter(s => s.status === 'OVERDUE');
  }, [maintenanceSchedules]);

  // Low Tread Depth Tires
  const criticalTires = useMemo(() => {
    return tires.filter(t => t.currentTreadDepth <= (settings.minTreadDepth || 3));
  }, [tires, settings.minTreadDepth]);

  // Filter alerts: only show those not dismissed
  const visibleAlerts = useMemo(() => {
    return arrivalAlerts.filter(alert => !dismissedIds.has(alert.id));
  }, [arrivalAlerts, dismissedIds]);

  const handleClearAll = () => {
    const newDismissed = new Set(dismissedIds);
    arrivalAlerts.forEach(a => newDismissed.add(a.id));
    setDismissedIds(newDismissed);
  };

  const totalAlerts = visibleAlerts.length + overdueMaintenance.length + criticalTires.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600"/>
              Notificações do Sistema
              {totalAlerts > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{totalAlerts}</span>}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Alertas de chegada, manutenção e pneus.</p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                <X className="h-5 w-5" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
          
          {/* EMPTY STATE */}
          {totalAlerts === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <CheckCircle2 className="h-16 w-16 mb-4 text-green-500" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum alerta pendente</p>
                  <p className="text-xs">Tudo em dia com sua frota.</p>
              </div>
          )}

          {/* OVERDUE MAINTENANCE */}
          {overdueMaintenance.map(schedule => {
            const vehicle = vehicles.find(v => v.id === schedule.vehicleId);
            const plan = maintenancePlans.find(p => p.id === schedule.planId);
            return (
              <div key={schedule.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm flex items-start gap-3 relative overflow-hidden group transition-all hover:shadow-md">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                <div className="p-2 rounded-xl shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600">
                  <AlertTriangle className="h-5 w-5"/>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-red-600">Manutenção Vencida</p>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{vehicle?.plate || 'Veículo'}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Plano: <span className="font-bold">{plan?.name}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                    {schedule.nextDueKm && <span className="flex items-center gap-1"><Gauge className="h-3 w-3"/> Venceu com: {schedule.nextDueKm.toLocaleString()} km</span>}
                    {schedule.nextDueDate && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3"/> Venceu em: {new Date(schedule.nextDueDate).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* CRITICAL TIRES */}
          {criticalTires.map(tire => {
            const vehicle = vehicles.find(v => v.id === tire.vehicleId);
            return (
              <div key={tire.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-sm flex items-start gap-3 relative overflow-hidden group transition-all hover:shadow-md">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                <div className="p-2 rounded-xl shrink-0 bg-orange-50 dark:bg-orange-900/20 text-orange-600">
                  <Disc className="h-5 w-5"/>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-orange-600">Pneu em Alerta (Sulco Baixo)</p>
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Fogo: {tire.fireNumber}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Veículo: <span className="font-bold">{vehicle?.plate || 'Estoque'}</span> • Sulco: <span className="text-red-500 font-black">{tire.currentTreadDepth}mm</span>
                  </p>
                </div>
              </div>
            );
          })}

          {/* LIST OF ARRIVAL ALERTS */}
          {visibleAlerts.sort((a, b) => {
            if (a.status === 'ARRIVED' && b.status !== 'ARRIVED') return -1;
            if (a.status !== 'ARRIVED' && b.status === 'ARRIVED') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }).map(alert => (
            <div 
              key={alert.id} 
              className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm flex items-start gap-3 relative overflow-hidden group transition-all hover:shadow-md ${alert.status === 'ARRIVED' ? 'border-green-100 dark:border-green-900/30' : 'border-blue-100 dark:border-blue-900/30'}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${alert.status === 'ARRIVED' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              
              <div className={`p-2 rounded-xl shrink-0 ${alert.status === 'ARRIVED' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                {alert.status === 'ARRIVED' ? <CheckCircle2 className="h-5 w-5"/> : <Clock className="h-5 w-5"/>}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase ${alert.status === 'ARRIVED' ? 'text-green-600' : 'text-blue-600'}`}>
                      {alert.status === 'ARRIVED' ? 'Veículo Chegou' : 'Em Trânsito'}
                    </p>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{alert.vehiclePlate}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {onDeleteAlert && (
                      <button 
                        onClick={() => {
                          if (confirmDeleteId !== alert.id) {
                            setConfirmDeleteId(alert.id);
                            setTimeout(() => setConfirmDeleteId(prev => prev === alert.id ? null : prev), 3000);
                            return;
                          }
                          onDeleteAlert(alert.id);
                          setConfirmDeleteId(null);
                        }}
                        className={`p-1 transition-all ${confirmDeleteId === alert.id ? 'text-orange-500 scale-125' : 'text-slate-300 hover:text-red-500'}`}
                      >
                        {confirmDeleteId === alert.id ? <Trash2 className="h-4 w-4 animate-pulse"/> : <Trash2 className="h-3.5 w-3.5"/>}
                      </button>
                    )}
                    <button 
                      onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))} 
                      className="text-slate-300 hover:text-slate-500 p-1"
                    >
                      <X className="h-3.5 w-3.5"/>
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Destino: <span className="font-semibold">{alert.targetName}</span></span>
                  </div>
                  
                  {alert.services && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                      <Wrench className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-bold text-[10px] uppercase text-slate-400 mb-0.5">Serviços Agendados</p>
                        <p className="italic leading-relaxed">{alert.services}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pt-1">
                    <CalendarClock className="h-3 w-3" />
                    <span>Criado em: {new Date(alert.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                  
                  {alert.minOdometer && alert.status === 'PENDING' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-orange-500 font-bold">
                      <Gauge className="h-3 w-3" />
                      <span>Avisar apenas após: {alert.minOdometer.toLocaleString()} km</span>
                    </div>
                  )}

                  {alert.status === 'ARRIVED' && alert.actualArrivalDate && (
                    <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Chegada: {new Date(alert.actualArrivalDate).toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};

