
import React, { useMemo, useState, useEffect } from 'react';
import { Tire, SystemSettings, Vehicle } from '../types';
import { X, AlertOctagon, MapPin, Loader2, Truck, Ban, Wrench, Trash2, ToggleLeft, ToggleRight, Crosshair, CheckCircle2, Clock, RotateCcw, Gauge, BrainCircuit, Sparkles, CalendarClock } from 'lucide-react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tires: Tire[];
  vehicles: Vehicle[];
  settings: SystemSettings;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, tires, vehicles, settings }) => {
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [filterNearby, setFilterNearby] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // --- GET LOCATION ON OPEN ---
  useEffect(() => {
    if (isOpen && "geolocation" in navigator) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsLoadingLocation(false);
        },
        (err) => {
          console.warn("Erro GPS:", err);
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [isOpen]);

  // --- DISTANCE CALCULATION ---
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
  };

  const isVehicleNearby = (vehicle: Vehicle) => {
      if (!userCoords || !vehicle.lastLocation || !vehicle.lastLocation.lat) return false;
      const dist = calculateDistance(userCoords.lat, userCoords.lng, vehicle.lastLocation.lat, vehicle.lastLocation.lng);
      return dist <= (settings.alertRadius || 1000);
  };

  // --- ALERTAS DE MANUTENÇÃO (ROTATION & CALIBRATION) ---
  const maintenanceAlerts = useMemo(() => {
      const alerts: { id: string, type: 'ROTATION' | 'CALIBRATION' | 'KM', title: string, message: string, severity: 'WARNING' | 'CRITICAL', vehicle?: Vehicle }[] = [];
      const rotationInterval = settings.rotationIntervalKm || 15000;
      const calibrationDays = settings.calibrationIntervalDays || 15;
      const now = Date.now();

      // 1. Alertas por Veículo/Pneu
      tires.forEach(t => {
          if (!t.vehicleId) return; // Skip stock tires for rotation
          const v = vehicles.find(veh => veh.id === t.vehicleId);
          if (!v) return;
          if (filterNearby && !isVehicleNearby(v)) return;

          // RODÍZIO
          const kmRun = t.installOdometer ? (v.odometer - t.installOdometer) : 0;
          if (kmRun > rotationInterval) {
              const id = `rot-${t.id}`;
              if (!dismissedIds.has(id)) {
                  alerts.push({
                      id,
                      type: 'ROTATION',
                      title: 'Sugestão de Rodízio',
                      message: `Pneu ${t.fireNumber} (Pos ${t.position}) rodou ${Math.round(kmRun/1000)}k km na mesma posição.`,
                      severity: 'WARNING',
                      vehicle: v
                  });
              }
          }

          // CALIBRAGEM
          let daysSinceInspection = 999;
          if (t.lastInspectionDate) {
              const lastDate = new Date(t.lastInspectionDate).getTime();
              daysSinceInspection = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
          } else {
              // Se nunca inspecionado, usa data de instalação se recente
              if (t.installDate) {
                  const installTime = new Date(t.installDate).getTime();
                  daysSinceInspection = Math.floor((now - installTime) / (1000 * 60 * 60 * 24));
              }
          }

          if (daysSinceInspection > calibrationDays) {
              const id = `cal-${t.id}`;
              if (!dismissedIds.has(id)) {
                  alerts.push({
                      id,
                      type: 'CALIBRATION',
                      title: 'Calibragem Vencida',
                      message: `Pneu ${t.fireNumber} sem inspeção há ${daysSinceInspection} dias.`,
                      severity: 'WARNING',
                      vehicle: v
                  });
              }
          }
      });

      return alerts;
  }, [tires, vehicles, settings, filterNearby, userCoords, dismissedIds]);

  // --- PREDIÇÃO INTELIGENTE (IA/Forecast) ---
  const predictionAlerts = useMemo(() => {
      const alerts: { id: string, title: string, message: string, daysLeft: number, vehicle?: Vehicle }[] = [];
      const criticalDepth = settings.minTreadDepth || 3.0;
      
      tires.forEach(t => {
          if (!t.vehicleId) return;
          const v = vehicles.find(veh => veh.id === t.vehicleId);
          if (!v) return;
          if (filterNearby && !isVehicleNearby(v)) return;

          // Só gera predição se não estiver crítico ainda
          if (t.currentTreadDepth <= criticalDepth) return;

          const monthlyKm = v.avgMonthlyKm || settings.defaultMonthlyKm || 10000;
          const dailyKm = monthlyKm / 30;
          
          // Cálculo de desgaste real
          const original = t.originalTreadDepth || 18.0;
          const current = t.currentTreadDepth;
          let kmRun = t.totalKms || 0;
          if (t.installOdometer) kmRun += Math.max(0, v.odometer - t.installOdometer);

          // Se tem histórico suficiente, projeta
          if (kmRun > 5000 && (original - current) > 1.0) {
              const wearRate = (original - current) / kmRun; // mm por km
              const remainingRubber = current - criticalDepth;
              const remainingKm = remainingRubber / wearRate;
              const daysLeft = Math.floor(remainingKm / dailyKm);

              if (daysLeft <= 45 && daysLeft > 0) {
                  const id = `pred-${t.id}`;
                  if (!dismissedIds.has(id)) {
                      alerts.push({
                          id,
                          title: 'Predição de Troca',
                          message: `Baseado no seu uso, o pneu ${t.fireNumber} (Pos ${t.position}) precisará de troca em aproximadamente ${daysLeft} dias.`,
                          daysLeft,
                          vehicle: v
                      });
                  }
              }
          }
      });

      return alerts.sort((a,b) => a.daysLeft - b.daysLeft);
  }, [tires, vehicles, settings, filterNearby, userCoords, dismissedIds]);

  // --- ALERTAS DE FROTA (FALTA DE PNEUS) ---
  const fleetAlerts = useMemo(() => {
      const alerts: { id: string, type: 'MISSING', title: string, message: string, severity: 'CRITICAL', vehicle: Vehicle }[] = [];
      
      vehicles.forEach(v => {
          if (filterNearby && !isVehicleNearby(v)) return;

          const mountedCount = tires.filter(t => t.vehicleId === v.id).length;
          const expectedTires = v.type === 'CAVALO' ? 2 + ((v.axles - 1) * 4) : v.axles * 4;
          const missingCount = expectedTires - mountedCount;

          if (missingCount > 0) {
              const id = `missing-${v.id}`;
              if (!dismissedIds.has(id)) {
                  alerts.push({
                      id,
                      type: 'MISSING',
                      title: `SEGURANÇA (PNEUS)`,
                      message: `Veículo ${v.plate} circula com falta de ${missingCount} pneus montados.`,
                      severity: 'CRITICAL',
                      vehicle: v
                  });
              }
          }
      });

      return alerts;
  }, [vehicles, tires, settings, filterNearby, userCoords, dismissedIds]);

  const handleClearAll = () => {
      const newDismissed = new Set(dismissedIds);
      fleetAlerts.forEach(a => newDismissed.add(a.id));
      maintenanceAlerts.forEach(a => newDismissed.add(a.id));
      predictionAlerts.forEach(a => newDismissed.add(a.id));
      setDismissedIds(newDismissed);
  };

  const totalAlerts = fleetAlerts.length + maintenanceAlerts.length + predictionAlerts.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600"/>
              Central de Inteligência
              {totalAlerts > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{totalAlerts}</span>}
            </h3>
            <p className="text-xs text-slate-500">Monitoramento e previsões em tempo real.</p>
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

        {/* TOOLBAR */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white flex justify-between items-center">
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setFilterNearby(!filterNearby)}
                    className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${filterNearby ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-500'}`}
                    disabled={!userCoords && !isLoadingLocation}
                >
                    {filterNearby ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>}
                    {filterNearby ? 'Apenas Próximos' : 'Todos os Alertas'}
                </button>
                {isLoadingLocation && <Loader2 className="h-3 w-3 animate-spin text-blue-500"/>}
            </div>
            {userCoords && filterNearby && (
                <div className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <Crosshair className="h-3 w-3"/> GPS Ativo
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/50">
          
          {/* EMPTY STATE */}
          {totalAlerts === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <CheckCircle2 className="h-16 w-16 mb-4 text-green-500" />
                  <p className="font-bold text-slate-600">Tudo limpo!</p>
                  <p className="text-xs">Nenhuma recomendação pendente.</p>
              </div>
          )}

          {/* 1. SEGURANÇA (CRÍTICO) */}
          {fleetAlerts.length > 0 && (
             <div className="animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-black text-red-500 uppercase tracking-wider flex items-center gap-2 px-1 mb-3">
                   <AlertOctagon className="h-3 w-3" /> Prioridade Alta
                </h4>
                <div className="space-y-2">
                   {fleetAlerts.map(alert => (
                      <div key={alert.id} className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-start gap-3 relative overflow-hidden">
                         <div className="p-2 bg-white rounded-xl shrink-0 text-red-500 shadow-sm">
                            <Ban className="h-5 w-5"/>
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black uppercase text-red-600">{alert.title}</p>
                                <button onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))} className="text-red-300 hover:text-red-500 p-1 -mr-2 -mt-2"><X className="h-3 w-3"/></button>
                            </div>
                            <p className="text-xs text-red-800 leading-tight mt-1 font-medium">{alert.message}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* 2. PREDIÇÕES DE IA */}
          {predictionAlerts.length > 0 && (
             <div className="animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-black text-purple-600 uppercase tracking-wider flex items-center gap-2 px-1 mb-3">
                   <BrainCircuit className="h-3 w-3" /> Insights de IA (Futuro)
                </h4>
                <div className="space-y-2">
                   {predictionAlerts.map(alert => (
                      <div key={alert.id} className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex items-start gap-3 relative overflow-hidden group">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 group-hover:w-1.5 transition-all"></div>
                         <div className="p-2 bg-purple-50 rounded-xl shrink-0 text-purple-600">
                            <CalendarClock className="h-5 w-5"/>
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black uppercase text-purple-600">{alert.title}</p>
                                <button onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))} className="text-slate-300 hover:text-purple-500 p-1 -mr-2 -mt-2"><X className="h-3 w-3"/></button>
                            </div>
                            <p className="text-xs text-slate-600 leading-tight mt-1">{alert.message}</p>
                            <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase bg-slate-100 inline-block px-2 py-0.5 rounded">
                                {alert.vehicle?.plate}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* 3. MANUTENÇÃO PREVENTIVA */}
          {maintenanceAlerts.length > 0 && (
             <div className="animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-black text-orange-500 uppercase tracking-wider flex items-center gap-2 px-1 mb-3">
                   <Wrench className="h-3 w-3" /> Manutenção Preventiva
                </h4>
                <div className="space-y-2">
                   {maintenanceAlerts.map(alert => (
                      <div key={alert.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex items-start gap-3 relative overflow-hidden">
                         <div className="p-2 bg-orange-50 rounded-xl shrink-0 text-orange-500">
                            {alert.type === 'ROTATION' ? <RotateCcw className="h-5 w-5"/> : <Gauge className="h-5 w-5"/>}
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black uppercase text-orange-500">{alert.title}</p>
                                <button onClick={() => setDismissedIds(prev => new Set(prev).add(alert.id))} className="text-slate-300 hover:text-orange-500 p-1 -mr-2 -mt-2"><X className="h-3 w-3"/></button>
                            </div>
                            <p className="text-xs text-slate-600 leading-tight mt-1">{alert.message}</p>
                            <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase">
                                Veículo: {alert.vehicle?.plate}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
