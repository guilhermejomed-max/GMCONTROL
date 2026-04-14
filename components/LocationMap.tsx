import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Vehicle, Tire, SystemSettings } from '../types';
import { Navigation, MapPin, Search, Truck, Container, X, Layers, Sun, Moon, Satellite, ShieldCheck, AlertTriangle, AlertOctagon, User, Activity, Wrench, ExternalLink, Disc, Zap, Gauge } from 'lucide-react';

declare global {
  interface Window {
    L: any; // Leaflet Global
  }
}

interface LocationMapProps {
  vehicles: Vehicle[];
  tires: Tire[];
  branches?: any[];
  defaultBranchId?: string;
  settings?: SystemSettings;
  onSync: (showModal?: boolean) => Promise<number>;
  onUpdateSettings: (settings: SystemSettings) => Promise<void>;
}

type FilterStatus = 'ALL' | 'OK' | 'WARNING' | 'CRITICAL';
type MapLayer = 'light' | 'dark' | 'satellite';

export const LocationMap: React.FC<LocationMapProps> = ({ 
  vehicles: allVehicles, 
  tires: allTires, 
  branches = [],
  defaultBranchId,
  settings, 
  onSync, 
  onUpdateSettings 
}) => {
  const vehicles = allVehicles;

  const tires = useMemo(() => {
    // Pneus agora são universais
    return allTires;
  }, [allTires]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingPoint, setIsSavingPoint] = useState(false);
  const [newPointCoords, setNewPointCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newPointName, setNewPointName] = useState('');
  const [newPointRadius, setNewPointRadius] = useState(500);
  const handleSync = async () => {
    setIsSyncing(true);
    await onSync(true);
    setIsSyncing(false);
  };
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const hasInitialFitRef = useRef(false);
  
  const [activeLayer, setActiveLayer] = useState<MapLayer>('light');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [closestVehicle, setClosestVehicle] = useState<Vehicle | null>(null);
  const [searchText, setSearchText] = useState('');
  
  // Controle do Menu de Serviços
  const [showServiceMenu, setShowServiceMenu] = useState(false);

  // Auto-detect dark mode
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setActiveLayer('dark');
    }
  }, []);

  // Resetar menu de serviços ao trocar de veículo
  useEffect(() => {
      setShowServiceMenu(false);
  }, [selectedVehicleId]);

  // --- MAP RESIZE FIX ---
  useEffect(() => {
      const resizeObserver = new ResizeObserver(() => {
          if (mapInstance.current) {
              mapInstance.current.invalidateSize();
          }
      });

      if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
      }

      const timer = setTimeout(() => {
          if (mapInstance.current) mapInstance.current.invalidateSize();
      }, 500);

      return () => {
          resizeObserver.disconnect();
          clearTimeout(timer);
      };
  }, []);

  const SAFETY_LIMIT = settings?.minTreadDepth || 3.0;
  const WARNING_LIMIT = settings?.warningTreadDepth || 5.0;

  const getVehicleStats = useCallback((vehicleId: string) => {
    const mountedTires = tires.filter(t => t.vehicleId === vehicleId);
    const critical = mountedTires.filter(t => t.currentTreadDepth <= SAFETY_LIMIT).length;
    const warning = mountedTires.filter(t => t.currentTreadDepth > SAFETY_LIMIT && t.currentTreadDepth <= WARNING_LIMIT).length;
    
    let health: 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' = 'OK';
    if (mountedTires.length === 0) health = 'UNKNOWN';
    else if (critical > 0) health = 'CRITICAL';
    else if (warning > 0) health = 'WARNING';

    return { health, critical, warning, totalTires: mountedTires.length };
  }, [tires, SAFETY_LIMIT, WARNING_LIMIT]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => v.lastLocation && typeof v.lastLocation.lat === 'number' && typeof v.lastLocation.lng === 'number')
      .map(v => ({ ...v, ...getVehicleStats(v.id) }))
      .filter(v => {
        if (searchText && !v.plate.toLowerCase().includes(searchText.toLowerCase()) && !v.model.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (filterStatus === 'ALL') return true;
        return v.health === filterStatus;
      });
  }, [vehicles, getVehicleStats, filterStatus, searchText]);

  const selectedVehicleData = useMemo(() => filteredVehicles.find(v => v.id === selectedVehicleId), [filteredVehicles, selectedVehicleId]);

  // Calcular veículo mais próximo
  useEffect(() => {
    if (selectedVehicleData && selectedVehicleData.lastLocation) {
        const { lat, lng } = selectedVehicleData.lastLocation;
        let closest = null;
        let minDistance = Infinity;
        filteredVehicles.forEach(v => {
            if (v.id === selectedVehicleData.id || !v.lastLocation) return;
            const dist = Math.sqrt(Math.pow(v.lastLocation.lat - lat, 2) + Math.pow(v.lastLocation.lng - lng, 2));
            if (dist < minDistance) {
                minDistance = dist;
                closest = v;
            }
        });
        setClosestVehicle(closest);
    } else {
        setClosestVehicle(null);
    }
  }, [selectedVehicleData, filteredVehicles]);

  const stats = useMemo(() => {
      return {
          total: filteredVehicles.length,
          critical: filteredVehicles.filter(v => v.health === 'CRITICAL').length,
          warning: filteredVehicles.filter(v => v.health === 'WARNING').length,
          ok: filteredVehicles.filter(v => v.health === 'OK').length
      };
  }, [filteredVehicles]);

  // --- LEAFLET INITIALIZATION ---
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstance.current) {
        const L = window.L;
        // Init map with a neutral view, will fitBounds later
        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([-14.2350, -51.9253], 4); // Center of Brazil

        L.control.attribution({ prefix: false }).addAttribution('&copy; OpenStreetMap').addTo(map);
        
        mapInstance.current = map;
        markerLayerRef.current = L.layerGroup().addTo(map);

        // Map Click Listener
        map.on('click', (e: any) => {
            setNewPointCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
            setIsSavingPoint(true);
        });
        
        setTimeout(() => map.invalidateSize(), 100);
    }

    // Layer switching
    const map = mapInstance.current;
    
    const L = window.L;
    let tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; // Default Light
    
    if (activeLayer === 'dark') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (activeLayer === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }

    map.eachLayer((layer: any) => {
        if (layer._url) map.removeLayer(layer);
    });

    L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(map);

  }, [activeLayer]);

  // --- MARKER RENDERING & FIT BOUNDS ---
  useEffect(() => {
      if (!mapInstance.current || !window.L || !markerLayerRef.current) return;
      const L = window.L;
      const map = mapInstance.current;
      const layerGroup = markerLayerRef.current;
      
      layerGroup.clearLayers();

      const bounds = L.latLngBounds([]);
      let hasValidLocation = false;

      filteredVehicles.forEach(v => {
          if (!v.lastLocation || v.lastLocation.lat === undefined || v.lastLocation.lng === undefined) return;
          
          // Garantir que lat/lng sejam números
          const lat = Number(v.lastLocation.lat);
          const lng = Number(v.lastLocation.lng);
          
          if (isNaN(lat) || isNaN(lng)) return;

          const latLng = [lat, lng];
          bounds.extend(latLng);
          hasValidLocation = true;

          const isSelected = v.id === selectedVehicleId;
          const isClosest = v.id === closestVehicle?.id;
          
          let bgColor = '#64748b'; 
          if (v.health === 'OK') bgColor = '#10b981';
          else if (v.health === 'WARNING') bgColor = '#f59e0b';
          else if (v.health === 'CRITICAL') bgColor = '#ef4444';

          const truckIconSvg = v.type === 'CAVALO' 
            ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="15" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /><line x1="5" y1="14" x2="9" y2="14" /><line x1="15" y1="14" x2="19" y2="14" /><line x1="4" y1="18" x2="4" y2="21" /><line x1="20" y1="18" x2="20" y2="21" /></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></svg>`;

          const size = isSelected ? 48 : (isClosest ? 40 : 36);
          
          const html = `
            <div style="
                width: ${size}px; height: ${size}px; 
                background-color: ${bgColor}; 
                border: 2px solid white; border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                position: relative;
                transform: ${isSelected ? 'scale(1.1) translateY(-5px)' : (isClosest ? 'scale(1.05)' : 'scale(1)')};
                transition: all 0.3s ease;
            ">
                <div style="width: ${size * 0.6}px; height: ${size * 0.6}px;">${truckIconSvg}</div>
                ${isSelected ? `<div style="position: absolute; bottom: -6px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${bgColor};"></div>` : ''}
                ${isClosest ? `<div style="position: absolute; top: -20px; background: white; color: black; padding: 2px 5px; border-radius: 4px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Mais Próximo</div>` : ''}
            </div>
          `;

          const icon = L.divIcon({
              className: 'custom-vehicle-marker',
              html: html,
              iconSize: [size, size],
              iconAnchor: [size/2, size]
          });

          const marker = L.marker(latLng, { icon: icon })
              .on('click', () => handleSelectVehicle(v));
          
          layerGroup.addLayer(marker);
      });

      // --- SAVED POINTS RENDERING ---
      if (settings?.savedPoints) {
          settings.savedPoints.forEach(p => {
              const latLng = [p.lat, p.lng];
              
              // Circle for radius
              const circle = L.circle(latLng, {
                  radius: p.radius,
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.1,
                  weight: 1
              });
              layerGroup.addLayer(circle);

              // Marker for point
              const pointIcon = L.divIcon({
                  className: 'custom-point-marker',
                  html: `
                    <div style="
                        width: 24px; height: 24px; 
                        background-color: #3b82f6; 
                        border: 2px solid white; border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                  `,
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
              });

              const marker = L.marker(latLng, { icon: pointIcon })
                  .bindPopup(`<b>${p.name}</b><br/>Raio: ${p.radius}m`);
              
              layerGroup.addLayer(marker);
          });
      }

      // Lógica de Zoom Automático (Fit Bounds)
      // Ajusta o mapa para mostrar todos os veículos se houver veículos e nenhum estiver selecionado.
      if (hasValidLocation && !selectedVehicleId) {
          // Invalidate size antes do fit para garantir que o mapa tenha as dimensões corretas
          map.invalidateSize();
          
          // Pequeno timeout para garantir que o DOM esteja pronto
          setTimeout(() => {
              map.fitBounds(bounds, { 
                  padding: [50, 50],
                  maxZoom: 15,
                  animate: true,
                  duration: 1
              });
          }, 100);
      }

  }, [filteredVehicles, selectedVehicleId]); 

  const handleSelectVehicle = (vehicle: any) => {
      setSelectedVehicleId(vehicle.id);
      if (mapInstance.current && vehicle.lastLocation) {
          mapInstance.current.flyTo([vehicle.lastLocation.lat, vehicle.lastLocation.lng], 16, {
              animate: true,
              duration: 1.5
          });
      }
  };

  const handleServiceSearch = (query: string) => {
      if (selectedVehicleData?.lastLocation) {
          const { lat, lng } = selectedVehicleData.lastLocation;
          // FIX: Utilizar uma estrutura de URL mais específica com o parâmetro 'data' para forçar a centralização.
          const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},15z/data=!3m1!4b1`;
          window.open(url, '_blank');
      } else {
          alert("Localização do veículo não disponível.");
      }
  };

  const handleSavePoint = async () => {
      if (!newPointCoords || !newPointName.trim()) return;

      const newPoint = {
          id: Date.now().toString(),
          name: newPointName,
          lat: newPointCoords.lat,
          lng: newPointCoords.lng,
          radius: newPointRadius
      };

      const updatedSettings = {
          ...settings!,
          savedPoints: [...(settings?.savedPoints || []), newPoint]
      };

      await onUpdateSettings(updatedSettings);
      setIsSavingPoint(false);
      setNewPointName('');
      setNewPointCoords(null);
  };

  const handleSaveCurrentLocation = () => {
      if (!navigator.geolocation) {
          alert("Geolocalização não suportada pelo seu navegador.");
          return;
      }

      navigator.geolocation.getCurrentPosition((position) => {
          setNewPointCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
          });
          setIsSavingPoint(true);
      }, (error) => {
          console.error("Erro ao obter localização:", error);
          alert("Não foi possível obter sua localização atual.");
      });
  };

  const getTimeAgo = (dateStr?: string) => {
      if (!dateStr) return 'Desconhecido';
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Agora mesmo';
      if (mins < 60) return `Há ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Há ${hours} h`;
      return new Date(dateStr).toLocaleDateString();
  };

  const formatCity = (loc: any) => {
      if (loc?.city && loc.city !== 'Desconhecida') return loc.city;
      if (loc?.lat && loc?.lng) return `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`;
      return 'Posição n/d';
  };

  const formatFullAddress = (loc: any) => {
      if (loc?.address && loc.address !== 'Coordenadas GPS' && loc.city !== 'Desconhecida') return loc.address;
      if (loc?.lat && loc?.lng) return `Lat: ${loc.lat.toFixed(5)}, Lng: ${loc.lng.toFixed(5)}`;
      return 'Endereço não identificado';
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-100px)] w-full gap-4 relative isolate">
       
       {/* SIDEBAR LIST */}
       <div className="lg:w-80 w-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 h-[35%] lg:h-full order-2 lg:order-1 flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
             <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                   <Navigation className="h-5 w-5 text-blue-600" /> Frota
                </h2>
                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-600 dark:text-slate-300">{filteredVehicles.length}</span>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar veículo..." 
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                />
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-white dark:bg-slate-900">
             {filteredVehicles.map(v => (
                <div 
                  key={v.id} 
                  onClick={() => handleSelectVehicle(v)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedVehicleId === v.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${selectedVehicleId === v.id ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            {v.type === 'CAVALO' ? <Truck className="h-4 w-4" /> : <Container className="h-4 w-4" />}
                         </div>
                         <div>
                             <div className="font-black text-slate-800 dark:text-white text-sm">{v.plate}</div>
                             <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">{v.model}</div>
                         </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${v.health === 'OK' ? 'bg-green-500' : v.health === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                   </div>
                   <div className="mt-2 flex justify-between items-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
                       <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {formatCity(v.lastLocation)}</span>
                       <span>{getTimeAgo(v.lastLocation?.updatedAt)}</span>
                   </div>
                </div>
             ))}
          </div>
       </div>

       {/* MAP PANEL */}
       <div className="flex-1 relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 z-10 lg:h-full h-[60%] order-1 lg:order-2">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 outline-none bg-slate-200 dark:bg-slate-800" />
          
          <div className="absolute top-4 left-4 z-[400] flex gap-2 pointer-events-none">
             <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl p-2 md:p-3 shadow-lg flex items-center gap-2 md:gap-4 pointer-events-auto scale-75 md:scale-100 origin-top-left transition-transform">
                 <div className="text-center px-2">
                     <div className="text-xl font-black text-slate-800 dark:text-white leading-none">{stats.total}</div>
                     <div className="text-[9px] font-bold text-slate-500 uppercase">Frota</div>
                 </div>
                 <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                 <div className="text-center px-2">
                     <div className="text-xl font-black text-red-600 leading-none">{stats.critical}</div>
                     <div className="text-[9px] font-bold text-red-500 uppercase">Críticos</div>
                 </div>
                 <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                 <div className="text-center px-2">
                     <div className="text-xl font-black text-green-600 leading-none">{stats.ok}</div>
                     <div className="text-[9px] font-bold text-green-500 uppercase">Saudáveis</div>
                 </div>
             </div>
          </div>

          <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
             <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-lg flex flex-col gap-1 pointer-events-auto">
                 <button onClick={handleSync} disabled={isSyncing} className={`p-2 rounded-lg transition-all ${isSyncing ? 'animate-spin' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title="Sincronizar Agora"><Zap className="h-5 w-5"/></button>
                 <button onClick={handleSaveCurrentLocation} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all" title="Salvar Minha Localização"><MapPin className="h-5 w-5"/></button>
                 <button onClick={() => setActiveLayer('light')} className={`p-2 rounded-lg transition-all ${activeLayer === 'light' ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title="Mapa Padrão"><Sun className="h-5 w-5"/></button>
                 <button onClick={() => setActiveLayer('dark')} className={`p-2 rounded-lg transition-all ${activeLayer === 'dark' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title="Mapa Escuro"><Moon className="h-5 w-5"/></button>
                 <button onClick={() => setActiveLayer('satellite')} className={`p-2 rounded-lg transition-all ${activeLayer === 'satellite' ? 'bg-green-100 text-green-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`} title="Satélite"><Satellite className="h-5 w-5"/></button>
             </div>
          </div>

          {selectedVehicleData && (
             <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:top-4 md:bottom-auto md:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl z-[1000] border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4 zoom-in-95 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/80">
                   <div>
                      <h3 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-2">
                          {selectedVehicleData.plate}
                          {selectedVehicleData.health === 'OK' && <ShieldCheck className="h-5 w-5 text-green-500"/>}
                          {selectedVehicleData.health === 'WARNING' && <AlertTriangle className="h-5 w-5 text-yellow-500"/>}
                          {selectedVehicleData.health === 'CRITICAL' && <AlertOctagon className="h-5 w-5 text-red-500"/>}
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{selectedVehicleData.model}</p>
                   </div>
                   <button onClick={() => setSelectedVehicleId(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-400"/></button>
                </div>
                
                <div className="p-4 space-y-4">
                   <div className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
                       <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><MapPin className="h-4 w-4"/></div>
                       <div className="flex-1">
                           <p className="font-bold mb-0.5">Localização Atual</p>
                           <p className="leading-snug opacity-80">{formatFullAddress(selectedVehicleData.lastLocation)}</p>
                           <p className="text-[9px] text-slate-400 mt-1 font-mono">{getTimeAgo(selectedVehicleData.lastLocation?.updatedAt)}</p>
                       </div>
                   </div>

                   <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                       <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><Gauge className="h-4 w-4"/></div>
                       <div className="flex-1">
                           <p className="font-bold mb-0.5">Hodômetro</p>
                           <p className="font-mono text-sm">{selectedVehicleData.odometer?.toLocaleString()} km</p>
                       </div>
                   </div>

                   <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                       <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Activity className="h-3 w-3"/> Status dos Pneus</h4>
                       <div className="grid grid-cols-3 gap-2 text-center">
                           <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                               <div className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleData.totalTires}</div>
                               <div className="text-[9px] text-slate-400">Total</div>
                           </div>
                           <div className={`bg-white dark:bg-slate-900 p-2 rounded-lg border ${selectedVehicleData.warning > 0 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10' : 'border-slate-100 dark:border-slate-700'}`}>
                               <div className={`text-lg font-black ${selectedVehicleData.warning > 0 ? 'text-yellow-600' : 'text-slate-800 dark:text-white'}`}>{selectedVehicleData.warning}</div>
                               <div className="text-[9px] text-slate-400">Atenção</div>
                           </div>
                           <div className={`bg-white dark:bg-slate-900 p-2 rounded-lg border ${selectedVehicleData.critical > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-700'}`}>
                               <div className={`text-lg font-black ${selectedVehicleData.critical > 0 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>{selectedVehicleData.critical}</div>
                               <div className="text-[9px] text-slate-400">Críticos</div>
                           </div>
                       </div>
                   </div>

                   {selectedVehicleData.currentDriverId && (
                       <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                           <User className="h-3 w-3"/> <span className="font-bold">Motorista Vinculado</span>
                       </div>
                   )}

                   {showServiceMenu ? (
                       <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                           <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Selecione o Serviço</p>
                           <div className="grid grid-cols-2 gap-2">
                               <button onClick={() => handleServiceSearch('Oficina Mecânica')} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all text-[10px] font-bold gap-1 text-slate-600 dark:text-slate-300">
                                   <Wrench className="h-4 w-4"/> MANUTENÇÃO
                               </button>
                               <button onClick={() => handleServiceSearch('Posto de Molas')} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-orange-500 hover:text-orange-600 transition-all text-[10px] font-bold gap-1 text-slate-600 dark:text-slate-300">
                                   <Layers className="h-4 w-4"/> POSTO DE MOLA
                               </button>
                               <button onClick={() => handleServiceSearch('Borracharia')} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:text-purple-600 transition-all text-[10px] font-bold gap-1 text-slate-600 dark:text-slate-300">
                                   <Disc className="h-4 w-4"/> BORRACHARIA
                               </button>
                               <button onClick={() => handleServiceSearch('Loja de Baterias')} className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-600 transition-all text-[10px] font-bold gap-1 text-slate-600 dark:text-slate-300">
                                   <Zap className="h-4 w-4"/> BATERIA
                               </button>
                           </div>
                           <button onClick={() => setShowServiceMenu(false)} className="w-full py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                       </div>
                   ) : (
                       <button
                           onClick={() => setShowServiceMenu(true)}
                           className="w-full mt-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 text-xs"
                       >
                           <Search className="h-4 w-4" /> Localizar Serviços
                       </button>
                   )}
                </div>
             </div>
          )}

          {/* SAVE POINT MODAL */}
          {isSavingPoint && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-[2000] flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-blue-600" /> Salvar Ponto
                          </h3>
                          <button onClick={() => setIsSavingPoint(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button>
                      </div>
                      <div className="p-4 space-y-4">
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Ponto</label>
                              <input 
                                type="text" 
                                value={newPointName}
                                onChange={e => setNewPointName(e.target.value)}
                                placeholder="Ex: Base Central, Cliente X..."
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                autoFocus
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Raio de Alerta (metros)</label>
                              <input 
                                type="number" 
                                value={newPointRadius}
                                onChange={e => setNewPointRadius(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                              />
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                              <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                                  Este ponto será salvo nas configurações globais e poderá ser usado para agendamentos e alertas de chegada.
                              </p>
                          </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                          <button 
                            onClick={() => setIsSavingPoint(false)}
                            className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleSavePoint}
                            disabled={!newPointName.trim()}
                            className="flex-1 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
                          >
                            Salvar Ponto
                          </button>
                      </div>
                  </div>
              </div>
          )}
       </div>
    </div>
  );
};
