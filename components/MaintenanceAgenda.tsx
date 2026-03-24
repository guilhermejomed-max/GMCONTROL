
import React, { FC, useMemo, useState, useEffect } from 'react';
import { Tire, SystemSettings, TabView, TireStatus, Vehicle } from '../types';
import { AlertOctagon, AlertTriangle, ArrowRight, MessageCircle, Mail, Gauge, ArrowUpCircle, Truck, MapPin, Navigation, CheckCircle2 } from 'lucide-react';

interface MaintenanceAgendaProps {
  tires: Tire[];
  vehicles: Vehicle[];
  settings?: SystemSettings;
  onNavigate: (tab: TabView) => void;
  onOpenServiceOrder?: (vehicleId: string) => void;
}

export const MaintenanceAgenda: FC<MaintenanceAgendaProps> = ({ tires, vehicles, settings, onNavigate, onOpenServiceOrder }) => {
  const minDepth = settings?.minTreadDepth || 3;
  const warnDepth = settings?.warningTreadDepth || 5;
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<'LOADING' | 'FOUND' | 'DENIED'>('LOADING');

  // Obter localização do usuário ao montar
  useEffect(() => {
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  });
                  setLocationStatus('FOUND');
              },
              (error) => {
                  console.warn("Erro GPS:", error);
                  setLocationStatus('DENIED');
              },
              { enableHighAccuracy: true }
          );
      } else {
          setLocationStatus('DENIED');
      }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // Raio da terra em metros
      const phi1 = lat1 * Math.PI/180;
      const phi2 = lat2 * Math.PI/180;
      const deltaPhi = (lat2-lat1) * Math.PI/180;
      const deltaLambda = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distância em metros
  };

  const { vehicleGroups, warningTires } = useMemo(() => {
      // 1. Filtrar apenas pneus ATIVOS e MONTADOS EM VEÍCULOS (com vehicleId)
      const activeTires = tires.filter(t => 
          t.status !== TireStatus.RETREADING && 
          t.status !== TireStatus.DAMAGED && 
          t.vehicleId // Garante que tem placa/veículo
      );

      const criticalItems: { tire: Tire, reason: 'DEPTH' | 'KM' }[] = [];
      const warning: Tire[] = [];

      activeTires.forEach(t => {
          let isCritical = false;
          let reason: 'DEPTH' | 'KM' = 'DEPTH';

          // Check Depth
          if (t.currentTreadDepth <= minDepth) {
              isCritical = true;
              reason = 'DEPTH';
          } 
          
          // Check Mileage (Already filtered for vehicleId above)
          if (!isCritical) {
              const run = (t.totalKms || 0) + (t.installOdometer ? 0 : 0); 
              const modelDef = settings?.tireModels?.find(m => m.brand === t.brand && m.model === t.model);
              const limit = modelDef?.estimatedLifespanKm || 80000;
              
              if (run > limit) {
                  isCritical = true;
                  reason = 'KM';
              }
          }

          if (isCritical) {
              criticalItems.push({ tire: t, reason });
          } else if (t.currentTreadDepth <= warnDepth) {
              warning.push(t);
          }
      });

      // Group Critical by Vehicle
      const groups: Record<string, { plate: string, vehicle: Vehicle | undefined, items: { tire: Tire, reason: 'DEPTH' | 'KM' }[] }> = {};
      
      criticalItems.forEach(item => {
          const vId = item.tire.vehicleId!;
          if (!groups[vId]) {
              const vehicleObj = vehicles.find(v => v.id === vId);
              groups[vId] = {
                  plate: vehicleObj ? vehicleObj.plate : item.tire.location,
                  vehicle: vehicleObj,
                  items: []
              };
          }
          groups[vId].items.push(item);
      });

      let finalGroups = Object.values(groups);

      // FILTRO DE PROXIMIDADE (1KM)
      // Se tivermos a localização do usuário, filtramos apenas os que estão a < 1000m
      if (userLocation) {
          finalGroups = finalGroups.filter(g => {
              if (!g.vehicle?.lastLocation?.lat || !g.vehicle?.lastLocation?.lng) return false;
              const dist = calculateDistance(
                  userLocation.lat, userLocation.lng,
                  g.vehicle.lastLocation.lat, g.vehicle.lastLocation.lng
              );
              return dist <= 1000; // 1km
          });
      } else if (locationStatus === 'DENIED') {
          // Se não tiver GPS permitido, mostrar vazio ou mostrar mensagem (optei por não mostrar nada crítico de longe para respeitar a regra)
          // Para ser útil, vamos mostrar vazio e um aviso na UI
          finalGroups = []; 
      }

      return {
          vehicleGroups: finalGroups,
          warningTires: warning.sort((a,b) => a.currentTreadDepth - b.currentTreadDepth)
      };
  }, [tires, vehicles, settings, userLocation, locationStatus]);

  const handleShareCritical = (channel: 'whatsapp' | 'email') => {
      const subject = "Agenda de Manutenção Urgente (Próximos) - GM Control";
      let text = `⚠️ *AGENDA DE MANUTENÇÃO URGENTE (RAIO 1KM)*\n\n`;
      
      vehicleGroups.forEach(group => {
          text += `🚛 *Veículo: ${group.plate}* (${group.items.length} trocas)\n`;
          group.items.forEach(({ tire, reason }) => {
             const reasonText = reason === 'KM' ? 'KM EXCEDIDO' : `SULCO BAIXO (${tire.currentTreadDepth}mm)`;
             text += `   - Pneu ${tire.fireNumber} (Pos ${tire.position}): ${reasonText}\n`;
          });
          text += `\n`;
      });
      
      if (channel === 'whatsapp') {
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      } else {
          window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`);
      }
  };

  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
        <span>Agenda de Ações</span>
        {locationStatus === 'LOADING' && <span className="text-[10px] text-blue-500 animate-pulse">Buscando GPS...</span>}
        {locationStatus === 'DENIED' && <span className="text-[10px] text-orange-500">GPS Inativo (Ative para ver agenda local)</span>}
        {locationStatus === 'FOUND' && <span className="text-[10px] text-green-600 flex items-center gap-1"><Navigation className="h-3 w-3"/> Raio 1km</span>}
      </h3>
      
      <div className="space-y-4">
        {/* Critical Section (Grouped by Vehicle - Nearby Only) */}
        {vehicleGroups.length > 0 ? (
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 relative z-10">
              <h4 className="font-bold text-red-800 dark:text-red-400 flex items-center gap-2 text-sm">
                <AlertOctagon className="h-5 w-5" />
                Ação Imediata ({vehicleGroups.length} Veículos)
              </h4>
              <div className="flex gap-2">
                 <button 
                    onClick={() => handleShareCritical('whatsapp')} 
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
                 >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                 </button>
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              {vehicleGroups.map((group, idx) => {
                  let distText = '';
                  if (userLocation && group.vehicle?.lastLocation) {
                      const d = calculateDistance(userLocation.lat, userLocation.lng, group.vehicle.lastLocation.lat, group.vehicle.lastLocation.lng);
                      distText = d < 1000 ? `${Math.round(d)}m` : `${(d/1000).toFixed(1)}km`;
                  }

                  return (
                    <div 
                      key={idx} 
                      onClick={() => onOpenServiceOrder?.(group.vehicle?.id || '')}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm flex flex-col gap-3 group cursor-pointer hover:border-red-300 dark:hover:border-red-800 transition-colors"
                    >
                      
                      {/* Vehicle Header */}
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                              <Truck className="h-5 w-5 text-slate-400"/>
                              <div>
                                  <span className="font-black text-slate-800 dark:text-white text-base block">{group.plate}</span>
                                  {distText && <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5"><MapPin className="h-3 w-3"/> a {distText}</span>}
                              </div>
                          </div>
                          <span className="text-xs font-black bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-sm shadow-red-200 dark:shadow-none">
                              <ArrowUpCircle className="h-3 w-3"/> {group.items.length} TROCAS
                          </span>
                      </div>

                      {/* List of Tires */}
                      <div className="grid grid-cols-1 gap-2">
                          {group.items.map(({ tire, reason }, tIdx) => (
                              <div key={tIdx} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                  <div className="flex flex-col">
                                      <span className="font-bold text-slate-700 dark:text-slate-300">Pneu {tire.fireNumber} <span className="text-slate-400 font-normal">| Pos {tire.position}</span></span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{tire.brand} {tire.model}</span>
                                  </div>
                                  <div className="text-right">
                                      {reason === 'KM' ? (
                                          <span className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                              <Gauge className="h-3 w-3"/> KM Limite
                                          </span>
                                      ) : (
                                          <span className="font-bold text-red-600 dark:text-red-400 block">
                                              Sulco {tire.currentTreadDepth}mm
                                          </span>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        ) : (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl text-center">
                {locationStatus === 'FOUND' ? (
                    <>
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-50"/>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Nenhum veículo crítico próximo.</p>
                        <p className="text-[10px] text-slate-400">Raio de busca: 1km</p>
                    </>
                ) : (
                    <>
                        <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2"/>
                        <p className="text-sm font-bold text-slate-500">Localização necessária.</p>
                        <p className="text-[10px] text-slate-400">Ative o GPS para ver veículos críticos próximos.</p>
                    </>
                )}
            </div>
        )}

        {/* Warning Section (Keep global or hide based on preference? Assuming only Immediate Action needs filter as per prompt) */}
        {/* Keeping Warnings visible but maybe less prominent or unfiltered as they are not 'Immediate Action' */}
        {warningTires.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-5 w-5" />
                Atenção Próxima ({warningTires.length})
              </h4>
            </div>
             <div className="space-y-2">
              {warningTires.slice(0, 3).map(tire => (
                <div key={tire.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 shadow-sm flex items-center justify-between group cursor-pointer hover:border-amber-300 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">
                        {tire.location}
                    </p>
                     <p className="text-xs text-slate-500 mt-1">
                      Fogo: {tire.fireNumber} (Pos {tire.position})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-black text-amber-600 dark:text-amber-500">{tire.currentTreadDepth}mm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
