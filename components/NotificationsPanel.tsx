
import React, { useState, useMemo } from 'react';
import { Tire, SystemSettings, Vehicle, ArrivalAlert } from '../types';
import { X, MapPin, CheckCircle2, Clock, Trash2, Bell, Wrench, CalendarClock } from 'lucide-react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tires: Tire[];
  vehicles: Vehicle[];
  settings: SystemSettings;
  arrivalAlerts: ArrivalAlert[];
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, tires, vehicles, settings, arrivalAlerts }) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter alerts: only show those not dismissed
  const visibleAlerts = useMemo(() => {
    return arrivalAlerts.filter(alert => !dismissedIds.has(alert.id));
  }, [arrivalAlerts, dismissedIds]);

  const handleClearAll = () => {
    const newDismissed = new Set(dismissedIds);
    arrivalAlerts.forEach(a => newDismissed.add(a.id));
    setDismissedIds(newDismissed);
  };

  const totalAlerts = visibleAlerts.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600"/>
              Notificações de Agendamento
              {totalAlerts > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{totalAlerts}</span>}
            </h3>
            <p className="text-xs text-slate-500">Alertas de chegada e serviços agendados.</p>
          </div>
          <div className="flex items-center gap-2">
             {totalAlerts > 0 && (
                 <button onClick={handleClearAll} className="p-2 hover:bg-red-50 text-red-500 rounded-full transition-colors flex items-center gap-1" title="Limpar Tudo">
                    <Trash2 className="h-4 w-4" />
                 </button>
             )}
             <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="h-5 w-5" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
          
          {/* EMPTY STATE */}
          {totalAlerts === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <CheckCircle2 className="h-16 w-16 mb-4 text-green-500" />
                  <p className="font-bold text-slate-600">Nenhum agendamento</p>
                  <p className="text-xs">Tudo em dia com seus veículos.</p>
              </div>
          )}

          {/* LIST OF ARRIVAL ALERTS */}
          {visibleAlerts.sort((a, b) => {
            // Arrived first, then by date
            if (a.status === 'ARRIVED' && b.status !== 'ARRIVED') return -1;
            if (a.status !== 'ARRIVED' && b.status === 'ARRIVED') return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }).map(alert => (
            <div 
              key={alert.id} 
              className={`bg-white p-4 rounded-2xl border shadow-sm flex items-start gap-3 relative overflow-hidden group transition-all hover:shadow-md ${alert.status === 'ARRIVED' ? 'border-green-100' : 'border-blue-100'}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${alert.status === 'ARRIVED' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              
              <div className={`p-2 rounded-xl shrink-0 ${alert.status === 'ARRIVED' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                {alert.status === 'ARRIVED' ? <CheckCircle2 className="h-5 w-5"/> : <Clock className="h-5 w-5"/>}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase ${alert.status === 'ARRIVED' ? 'text-green-600' : 'text-blue-600'}`}>
                      {alert.status === 'ARRIVED' ? 'Veículo Chegou' : 'Em Trânsito'}
                    </p>
                    <h4 className="font-bold text-slate-800 text-sm">{alert.vehiclePlate}</h4>
                  </div>
                  <button 
                    onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))} 
                    className="text-slate-300 hover:text-slate-500 p-1 -mr-2 -mt-2"
                  >
                    <X className="h-3 w-3"/>
                  </button>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>Destino: <span className="font-semibold">{alert.targetName}</span></span>
                  </div>
                  
                  {alert.services && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
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

