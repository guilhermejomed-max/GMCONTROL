
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InventoryList } from './components/InventoryList';
import { TireForm } from './components/TireForm';
import { TireMovement } from './components/TireMovement';
import { InspectionHub } from './components/InspectionHub';
import { RetreadingHub } from './components/RetreadingHub';
import { StrategicAnalysis } from './components/StrategicAnalysis';
import { DemandForecast } from './components/DemandForecast';
import { FinancialHub } from './components/FinancialHub';
import { EsgPanel } from './components/EsgPanel';
import { RetreaderRanking } from './components/RetreaderRanking';
import ScrapHub from './components/ScrapHub';
import { VehicleManager } from './components/VehicleManager';
import { BrandModelManager } from './components/BrandModelManager';
import { LocationMap } from './components/LocationMap';
import { ServiceOrderHub } from './components/ServiceOrderHub';
import { MaintenanceDashboard } from './components/MaintenanceDashboard';
import { ServiceManager } from './components/ServiceManager';
import { Settings } from './components/Settings';
import { DriversHub } from './components/DriversHub';
import { ReportsHub } from './components/ReportsHub';
import TrackerSettingsComponent from './components/TrackerSettings';
import { NotificationsPanel } from './components/NotificationsPanel';
import { ToastNotifications } from './components/ToastNotifications';
import { GlobalHeader } from './components/GlobalHeader';
import { storageService } from './services/storageService';
import { sascarService } from './services/sascarService';
import { TabView, Tire, Vehicle, VehicleBrandModel, ServiceOrder, RetreadOrder, SystemSettings, Driver, ToastMessage, UserLevel, ModuleType, TrackerSettings, ArrivalAlert } from './types';
import { Lock, Mail, LayoutDashboard, Loader2, User, LifeBuoy, Bell, Menu, Calendar, UserCircle, X } from 'lucide-react';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        // Passamos o username limpo para o registro
        await storageService.register(username, pass, name);
      } else {
        await storageService.login(username, pass);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
      setLoading(true);
      await storageService.login('demo', 'demo'); // Triggers mock mode in service
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
            <LifeBuoy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">GM Control Pro</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão Inteligente de Frotas e Pneus</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                  placeholder="Seu Nome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuário (nome.sobrenome)</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 lowercase"
                placeholder="joao.silva"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().trim())}
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input 
                type="password" 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                placeholder="••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
           <button onClick={handleDemo} className="w-full py-2 text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mb-2">
              Modo Demonstração (Offline)
           </button>
           <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-xs text-slate-400 hover:text-slate-600 underline">
              {isRegistering ? 'Já tenho uma conta' : 'Não tenho conta? Cadastre-se'}
           </button>
        </div>
      </div>
    </div>
  );
};

export const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App State
  const [currentTab, setCurrentTab] = useState<TabView>('dashboard');
  const [isReportsFullScreen, setIsReportsFullScreen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleBrandModels, setVehicleBrandModels] = useState<VehicleBrandModel[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<import('./types').MaintenancePlan[]>([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<import('./types').MaintenanceSchedule[]>([]);
  const [retreadOrders, setRetreadOrders] = useState<RetreadOrder[]>([]);
  const [settings, setSettings] = useState<SystemSettings | undefined>(undefined);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [collaborators, setCollaborators] = useState<import('./types').Collaborator[]>([]);
  const [arrivalAlerts, setArrivalAlerts] = useState<ArrivalAlert[]>([]);
  const [stockItems, setStockItems] = useState<import('./types').StockItem[]>([]);
  
  const [userRole, setUserRole] = useState<UserLevel>('SENIOR'); 
  const [activeModule, setActiveModule] = useState<ModuleType>('TIRES');
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettings | null>(null);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean, updatedPlates: string[] }>({ isOpen: false, updatedPlates: [] });
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | null>(null);
  const [shouldOpenOSModal, setShouldOpenOSModal] = useState(false);

  useEffect(() => {
    setIsReportsFullScreen(false);
  }, [currentTab]);

  useEffect(() => {
    const unsubAuth = storageService.subscribeToAuth((u) => {
        setUser(u);
        if (u && u.email && (u.email.toLowerCase().trim() === 'gui@gmail.com' || u.email.toLowerCase().trim() === 'guilherme.jomed@gmail.com')) {
            setUserRole('CREATOR');
        } else {
            setUserRole('SENIOR');
        }
        setLoadingAuth(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return; // Only subscribe to data if logged in

    const unsubTires = storageService.subscribeToTires(setTires);
    const unsubVehicles = storageService.subscribeToVehicles(setVehicles);
    const unsubVehicleBrandModels = storageService.subscribeToVehicleBrandModels(setVehicleBrandModels);
    const unsubServiceOrders = storageService.subscribeToServiceOrders(setServiceOrders);
    const unsubMaintenancePlans = storageService.subscribeToMaintenancePlans(setMaintenancePlans);
    const unsubMaintenanceSchedules = storageService.subscribeToMaintenanceSchedules(setMaintenanceSchedules);
    const unsubRetreadOrders = storageService.subscribeToRetreadOrders(setRetreadOrders);
    const unsubSettings = storageService.subscribeToSettings(setSettings);
    const unsubDrivers = storageService.subscribeToDrivers(setDrivers);
    const unsubCollaborators = storageService.subscribeToCollaborators(setCollaborators);
    const unsubTracker = storageService.subscribeToTrackerSettings(setTrackerSettings);
    const unsubArrivalAlerts = storageService.subscribeToArrivalAlerts(setArrivalAlerts);
    const unsubStockItems = storageService.subscribeToStock(setStockItems);
    
    return () => {
        unsubTires();
        unsubVehicles();
        unsubVehicleBrandModels();
        unsubServiceOrders();
        unsubMaintenancePlans();
        unsubMaintenanceSchedules();
        unsubRetreadOrders();
        unsubSettings();
        unsubDrivers();
        unsubCollaborators();
        unsubTracker();
        unsubArrivalAlerts();
        unsubStockItems();
    };
  }, [user]);

  // AUTOMATED UPDATES CHECK (Run once when data is available)
  useEffect(() => {
      if (vehicles.length > 0 && settings) {
          storageService.checkDailyTrailerIncrement(vehicles, settings);
      }
  }, [vehicles.length, settings]);

  // ARRIVAL ALERTS CHECK
  useEffect(() => {
    if (vehicles.length === 0 || arrivalAlerts.length === 0) return;

    const activeAlerts = arrivalAlerts.filter(a => a.status === 'PENDING');
    if (activeAlerts.length === 0) return;

    activeAlerts.forEach(alert => {
      const vehicle = vehicles.find(v => v.plate === alert.vehiclePlate);
      if (vehicle && vehicle.lastLocation) {
        // Check if there is a minimum odometer requirement for this alert
        if (alert.minOdometer && vehicle.odometer < alert.minOdometer) {
          return; // Skip if vehicle hasn't reached the required mileage
        }

        const { lat, lng } = vehicle.lastLocation;
        
        // Calculate distance (Haversine formula)
        const R = 6371e3; // metres
        const φ1 = lat * Math.PI/180;
        const φ2 = alert.targetLat * Math.PI/180;
        const Δφ = (alert.targetLat - lat) * Math.PI/180;
        const Δλ = (alert.targetLng - lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // in metres

        const radius = alert.radius || 500;
        if (distance <= radius) {
          // Vehicle arrived!
          storageService.updateArrivalAlert(alert.id, { 
            status: 'ARRIVED', 
            actualArrivalDate: new Date().toISOString() 
          });
          
          // Check for maintenance status of the arriving vehicle
          const currentKm = vehicle.odometer || 0;
          const lastPreventiveKm = vehicle.lastPreventiveKm || 0;
          const revisionInterval = vehicle.revisionIntervalKm || 10000;
          const nextPreventiveKm = lastPreventiveKm + revisionInterval;
          const kmRemaining = nextPreventiveKm - currentKm;
          
          let maintenanceAlert = "";
          if (kmRemaining <= 0) {
            maintenanceAlert = `O veículo ${vehicle.plate} chegou e está com MANUTENÇÃO VENCIDA há ${Math.abs(kmRemaining)} km!`;
          } else if (kmRemaining <= 1000) {
            maintenanceAlert = `O veículo ${vehicle.plate} chegou e está PRÓXIMO da manutenção (faltam ${kmRemaining} km).`;
          } else {
            maintenanceAlert = `O veículo ${vehicle.plate} chegou ao destino: ${alert.targetName}`;
          }

          addToast(kmRemaining <= 0 ? 'error' : (kmRemaining <= 1000 ? 'warning' : 'success'), 
                   'Chegada de Veículo', maintenanceAlert);
          
          // Voice Alert (TTS)
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(maintenanceAlert);
            utterance.lang = 'pt-BR';
            window.speechSynthesis.speak(utterance);
          }
          
          // Also check if there are other vehicles overdue
          const otherOverdue = vehicles.filter(v => {
            if (v.id === vehicle.id) return false;
            const next = (v.lastPreventiveKm || 0) + (v.revisionIntervalKm || 10000);
            return (v.odometer || 0) >= next;
          });

          if (otherOverdue.length > 0) {
            setTimeout(() => {
              addToast('info', 'Resumo de Manutenção', `Existem outros ${otherOverdue.length} veículos com manutenção vencida na frota.`);
            }, 2000);
          }
          
          // Also log activity
          storageService.logActivity("Chegada", maintenanceAlert, 'VEHICLES');
        }
      }
    });
  }, [vehicles, arrivalAlerts]);

  // OVERDUE MAINTENANCE + NEARBY BASE ALERT
  const alertedOverdueRef = useRef<Record<string, string>>({}); // vehicleId -> lastAlertedBaseId
  useEffect(() => {
    if (vehicles.length === 0 || !settings?.savedPoints || settings.savedPoints.length === 0) return;

    const overdueCavalo = vehicles.filter(v => {
      if (v.type !== 'CAVALO') return false;
      const nextDue = (v.lastPreventiveKm || 0) + (v.revisionIntervalKm || 10000);
      return (v.odometer || 0) >= nextDue;
    });

    if (overdueCavalo.length === 0) return;

    overdueCavalo.forEach(vehicle => {
      if (!vehicle.lastLocation) return;
      const { lat, lng } = vehicle.lastLocation;

      settings.savedPoints?.forEach(point => {
        // Calculate distance (Haversine formula)
        const R = 6371e3; // metres
        const φ1 = lat * Math.PI/180;
        const φ2 = point.lat * Math.PI/180;
        const Δφ = (point.lat - lat) * Math.PI/180;
        const Δλ = (point.lng - lng) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // in metres

        const radius = point.radius || 500;
        if (distance <= radius) {
          // Check if we already alerted for this vehicle at this base
          if (alertedOverdueRef.current[vehicle.id] === point.id) return;
          
          alertedOverdueRef.current[vehicle.id] = point.id;
          
          const kmOverdue = (vehicle.odometer || 0) - ((vehicle.lastPreventiveKm || 0) + (vehicle.revisionIntervalKm || 10000));
          const alertMsg = `ALERTA CRÍTICO: O veículo ${vehicle.plate} está com MANUTENÇÃO VENCIDA há ${kmOverdue.toLocaleString()} km e acaba de chegar em ${point.name}!`;
          
          addToast('error', 'Manutenção Vencida na Base', alertMsg);
          
          // Voice Alert (TTS)
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(alertMsg);
            utterance.lang = 'pt-BR';
            window.speechSynthesis.speak(utterance);
          }
          
          storageService.logActivity("Alerta Manutenção", alertMsg, 'VEHICLES');
        } else {
          // If vehicle is no longer at this base, clear the ref so it can alert again if it returns
          if (alertedOverdueRef.current[vehicle.id] === point.id) {
            delete alertedOverdueRef.current[vehicle.id];
          }
        }
      });
    });
  }, [vehicles, settings?.savedPoints]);

  // SASCAR SYNC FUNCTION
  const isSyncingRef = useRef(false);
  const syncSascar = async (showModal: boolean = false) => {
    if (isSyncingRef.current) {
      if (showModal) addToast('info', 'Sincronização em andamento', 'Aguarde a conclusão da sincronização atual.');
      return 0;
    }
    
    const currentVehicles = vehicles;
    if (currentVehicles.length === 0) {
      if (showModal) addToast('warning', 'Sem Veículos', 'Não há veículos cadastrados para sincronizar.');
      return 0;
    }

    if (!trackerSettings?.active) {
      if (showModal) addToast('warning', 'Integração Desativada', 'A integração com a Sascar está desativada nas configurações.');
      return 0;
    }

    isSyncingRef.current = true;
    let totalUpdated = 0;
    
    if (showModal) addToast('info', 'Sincronizando', 'Buscando dados na Sascar...');

    try {
      // 1. Otimização de Dados: Deduplicação de placas/IDs para evitar chamadas redundantes
      const plates = Array.from(new Set(
        currentVehicles
          .map(v => String(v.sascarCode || v.plate || ""))
          .filter(p => p && p.length > 0)
      ));
      
      console.log(`[Sascar Sync] Iniciando sincronização para ${plates.length} veículos...`);
      storageService.logActivity("Sincronização Sascar", `Iniciada para ${plates.length} veículos`, 'VEHICLES');
      
      const CHUNK_SIZE = 20;
      const chunks: string[][] = [];
      
      if (plates.length === 0) {
        chunks.push([]); // Chamada vazia para buscar a fila/buffer geral
      } else {
        for (let i = 0; i < plates.length; i += CHUNK_SIZE) {
          chunks.push(plates.slice(i, i + CHUNK_SIZE));
        }
      }

      // 2. Processamento Sequencial: Evita que lotes posteriores expirem o timeout enquanto esperam o primeiro lote (que limpa a fila)
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = i + 1;
        const totalChunks = chunks.length;
        
        try {
          console.log(`[Sascar Sync] Solicitando lote ${chunkId}/${totalChunks}...`);
          const result = await sascarService.getVehicles(
            chunk.length > 0 ? chunk : undefined, 
            trackerSettings || undefined
          );
          
          console.log(`[Sascar Sync] Lote ${chunkId}/${totalChunks} recebido.`);
          results.push(result.data?.return || result.data?.retornar || result.data || []);
        } catch (error: any) {
          console.error(`[Sascar Sync] Falha no lote ${chunkId}/${totalChunks}:`, error.message);
          // Continuamos para o próximo lote mesmo se um falhar
        }
      }

      // 4. Consolidação: Processar todos os itens recebidos e remover duplicatas
      const allRawItems = results.flat();
      const updatesBatch: any[] = [];
      const processedIds = new Set<string>();
      const updatedPlatesList: string[] = [];

      allRawItems.forEach((item: any) => {
        let sv = item;
        if (typeof item === 'string') {
          try { 
            sv = JSON.parse(item); 
            if (typeof sv === 'string') sv = JSON.parse(sv); 
          } catch (e) { return; }
        }

        const sascarId = parseInt(String(sv.idVeiculo || sv.id || "").replace(/\D/g, ""), 10);
        const sascarPlate = String(sv.placa || sv.plate || "").replace(/[^A-Z0-9]/gi, '').toUpperCase();
        
        if (isNaN(sascarId) && !sascarPlate) return;
        
        const uniqueKey = !isNaN(sascarId) ? `id_${sascarId}` : `plate_${sascarPlate}`;
        if (processedIds.has(uniqueKey)) return;
        processedIds.add(uniqueKey);

        const localVehicle = currentVehicles.find(v => {
          const idApp = parseInt(String(v.sascarCode || "").replace(/\D/g, ""), 10);
          if (!isNaN(idApp) && !isNaN(sascarId) && idApp === sascarId) return true;
          
          const plateApp = String(v.plate || "").replace(/[^A-Z0-9]/gi, '').toUpperCase();
          if (plateApp && sascarPlate && plateApp === sascarPlate) return true;
          
          return false;
        });

        if (localVehicle) {
          const rawOdo = sv.odometer || sv.odometroExato || sv.odometro || 0;
          const finalOdo = Math.round(Number(rawOdo));
          const lat = Number(sv.latitude || sv.lat || 0);
          const lng = Number(sv.longitude || sv.lng || 0);

          updatesBatch.push({
            id: localVehicle.id,
            odometer: finalOdo,
            lastLocation: {
              ...localVehicle.lastLocation,
              lat: lat,
              lng: lng,
              address: sv.lastLocation?.address || sv.address || sv.rua || localVehicle.lastLocation?.address || 'Coordenadas GPS',
              city: sv.lastLocation?.city || sv.city || sv.cidade || localVehicle.lastLocation?.city || 'Desconhecida',
              state: sv.lastLocation?.state || sv.state || sv.uf || localVehicle.lastLocation?.state || '',
              updatedAt: sv.lastLocation?.updatedAt || sv.dataPosicaoIso || new Date().toISOString()
            },
            lastAutoUpdateDate: new Date().toISOString()
          });
          updatedPlatesList.push(localVehicle.plate);
        }
      });

      if (updatesBatch.length > 0) {
        await storageService.updateVehicleBatch(updatesBatch);
        totalUpdated = updatesBatch.length;
        console.log(`[Sascar Sync] Sincronização finalizada: ${totalUpdated} veículos atualizados.`);
        if (!showModal) addToast('success', 'Sincronização Automática', `${totalUpdated} veículos atualizados.`);
      } else {
        console.log("[Sascar Sync] Nenhum dado novo para atualizar.");
        if (showModal) addToast('info', 'Sincronização', 'Nenhum dado novo encontrado para os veículos cadastrados.');
      }
      
      if (showModal) {
        setSyncModal({ isOpen: true, updatedPlates: updatedPlatesList });
      }
      
      return totalUpdated;
    } catch (error: any) {
      console.error("[Sascar Sync] Erro crítico:", error);
      addToast('error', 'Erro na Sincronização', error.message || 'Falha ao comunicar com a Sascar.');
      return 0;
    } finally {
      isSyncingRef.current = false;
    }
  };

  const handleSimulateArrival = async (plate: string, baseId: string) => {
    if (!settings?.savedPoints) return;
    const base = settings.savedPoints.find(p => p.id === baseId);
    if (!base) return;

    // Find the vehicle and update its location to the base location
    const vehicle = vehicles.find(v => v.plate === plate);
    if (!vehicle) return;

    const updatedVehicle: Vehicle = {
      ...vehicle,
      lastLocation: {
        ...vehicle.lastLocation,
        lat: base.lat,
        lng: base.lng,
        address: `Simulação: ${base.name}`
      }
    };

    await storageService.updateVehicle(updatedVehicle);
    addToast('info', 'Simulação', `Localização do veículo ${plate} atualizada para ${base.name}`);
  };

  // Auto-sync when entering location tab
  useEffect(() => {
    if (currentTab === 'location' && user && trackerSettings?.active) {
      syncSascar();
    }
  }, [currentTab, !!user, trackerSettings?.active]);

  const addToast = (type: any, title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleGlobalSearch = (type: 'tire' | 'vehicle', id: string) => {
      if (type === 'tire') {
          setCurrentTab('inventory');
      } else {
          setCurrentTab('fleet');
      }
  };

  const toggleDarkMode = () => {
      setDarkMode(!darkMode);
      document.documentElement.classList.toggle('dark');
  };

  // Wrapper function to properly construct Service Order before saving
  const handleAddServiceOrder = async (partialOrder: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt' | 'createdBy'>) => {
      const maxOrderNum = serviceOrders.reduce((max, o) => Math.max(max, o.orderNumber), 0);
      
      const newOrder: ServiceOrder = {
          ...partialOrder,
          id: Date.now().toString(),
          orderNumber: maxOrderNum + 1,
          createdAt: new Date().toISOString(),
          createdBy: user?.displayName || user?.email || 'Usuário do Sistema'
      };

      await storageService.addServiceOrder(newOrder);
      addToast('success', 'Ordem Criada', `O.S. #${newOrder.orderNumber} aberta com sucesso.`);

      const vehicle = vehicles.find(v => v.id === newOrder.vehicleId);
      if (vehicle) {
          const updates: Partial<Vehicle> = {};
          
          // Update vehicle odometer if the OS odometer is higher
          if (newOrder.odometer && newOrder.odometer > (vehicle.odometer || 0)) {
              updates.odometer = newOrder.odometer;
          }

          if (newOrder.isPreventiveMaintenance) {
              const formattedDate = newOrder.date 
                  ? newOrder.date.split('-').reverse().join('/') 
                  : new Date().toLocaleDateString('pt-BR');

              updates.lastPreventiveKm = newOrder.odometer || vehicle.odometer || 0;
              updates.lastPreventiveDate = formattedDate;
              
              addToast('info', 'Manutenção Preventiva', `KM de troca de óleo atualizado para ${updates.lastPreventiveKm} km.`);
          }

          if (Object.keys(updates).length > 0) {
              await storageService.updateVehicle({
                  ...vehicle,
                  ...updates
              });
          }
      }
  };

  const getPageTitle = (tab: TabView) => {
    switch (tab) {
      case 'dashboard': return 'Painel de Controle';
      case 'inventory': return 'Estoque de Pneus';
      case 'register': return 'Novo Pneu';
      case 'movement': return 'Movimentação';
      case 'inspection': return 'Hub de Inspeção';
      case 'retreading': return 'Gestão de Reformas';
      case 'retreader-ranking': return 'Ranking de Fornecedores';
      case 'scrap': return 'Sucata e Descarte';
      case 'strategic-analysis': return 'Análise Estratégica';
      case 'demand-forecast': return 'Previsão de Demanda';
      case 'financial': return 'Financeiro';
      case 'esg-panel': return 'Painel ESG';
      case 'fleet': return 'Frota de Veículos';
      case 'maintenance': return 'Gestão de Preventivas';
      case 'brand-models': return 'Marcas e Modelos';
      case 'location': return 'Rastreamento';
      case 'service-orders': return 'Oficina';
      case 'service': return 'Almoxarifado';
      case 'settings': return 'Configurações';
      case 'drivers': return 'Motoristas';
      case 'reports': return 'Relatórios';
      case 'tracker': return 'Configurações do Rastreador';
      default: return 'GM Control';
    }
  };

  if (loadingAuth) {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="h-10 w-10 text-blue-500 animate-spin" /></div>;
  }

  if (!user) {
      return <LoginScreen />;
  }

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {!isReportsFullScreen && (
        <Sidebar 
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          onLogout={storageService.logout}
          onExportData={() => {}}
          onImportData={() => {}}
          userLevel={userRole}
          userName={user.displayName || user.email || 'Usuário'}
          settings={settings}
          activeModule={activeModule}
          onChangeModule={() => setActiveModule(prev => prev === 'TIRES' ? 'VEHICLES' : prev === 'VEHICLES' ? 'MECHANICAL' : 'TIRES')}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}
      
      <main className={`${!isReportsFullScreen ? 'lg:ml-72' : ''} min-h-screen p-3 md:p-4 lg:py-6 lg:px-8 transition-all duration-300`}>
        <div className="w-full space-y-4 md:space-y-6">
            {!isReportsFullScreen && (
              <header className="sticky top-0 z-30 mb-4 md:mb-6 px-3 py-2 md:py-3 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-xl md:rounded-2xl">
                  <div className="flex items-center gap-2 pl-1 min-w-fit">
                      <button className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors" onClick={() => setIsMobileOpen(true)}>
                          <Menu className="h-6 w-6" />
                      </button>
                      <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-white hidden sm:block whitespace-nowrap">
                          {getPageTitle(currentTab)}
                      </h1>
                  </div>

                  {/* Mobile Title (When hidden on larger) */}
                  <h1 className="text-sm font-black text-slate-800 dark:text-white sm:hidden whitespace-nowrap truncate flex-1">
                      {getPageTitle(currentTab)}
                  </h1>

                  <div className="flex-1 flex justify-end md:justify-center max-w-4xl mx-auto px-2">
                      {/* Compact Search on Mobile */}
                      <GlobalHeader tires={tires} vehicles={vehicles} onResultClick={handleGlobalSearch} />
                  </div>

                  <div className="flex items-center justify-end gap-2 min-w-fit">
                      <span className="hidden lg:flex bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 items-center gap-2 shadow-sm backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-900 cursor-default">
                          <Calendar className="h-4 w-4 text-blue-600" /> 
                          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>

                      <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 md:p-2.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 bg-white/50 dark:bg-slate-900/50 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600">
                          <Bell className="h-5 w-5" />
                          {(arrivalAlerts.filter(a => a.status === 'PENDING' || a.status === 'ARRIVED').length + 
                            maintenanceSchedules.filter(s => s.status === 'OVERDUE').length +
                            tires.filter(t => t.currentTreadDepth <= (settings?.minTreadDepth || 3)).length) > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 animate-pulse">
                                  {arrivalAlerts.filter(a => a.status === 'PENDING' || a.status === 'ARRIVED').length + 
                                   maintenanceSchedules.filter(s => s.status === 'OVERDUE').length +
                                   tires.filter(t => t.currentTreadDepth <= (settings?.minTreadDepth || 3)).length}
                              </span>
                          )}
                      </button>
                  </div>
              </header>
            )}

            {currentTab === 'dashboard' && (
              <Dashboard 
                tires={tires} 
                vehicles={vehicles} 
                serviceOrders={serviceOrders} 
                onNavigate={setCurrentTab} 
                settings={settings} 
                onOpenServiceOrder={(vehicleId) => {
                  setPreselectedVehicleId(vehicleId);
                  setShouldOpenOSModal(true);
                  setCurrentTab('service-orders');
                }}
              />
            )}
            {currentTab === 'inventory' && <InventoryList tires={tires} vehicles={vehicles} serviceOrders={serviceOrders} maintenancePlans={maintenancePlans} maintenanceSchedules={maintenanceSchedules} onDelete={storageService.deleteTire} onUpdateTire={storageService.updateTire} onRegister={() => setCurrentTab('register')} userLevel={userRole} />}
            {currentTab === 'scrap' && <ScrapHub tires={tires} vehicles={vehicles} onUpdateTire={storageService.updateTire} userLevel={userRole} />}
            {currentTab === 'register' && <TireForm onAddTire={storageService.addTire} onCancel={() => setCurrentTab('inventory')} onFinish={() => setCurrentTab('inventory')} existingTires={tires} settings={settings} vehicles={vehicles} />}
            {currentTab === 'movement' && <TireMovement tires={tires} vehicles={vehicles} onUpdateTire={storageService.updateTire} onAddTire={storageService.addTire} userLevel={userRole} settings={settings} />}
            {currentTab === 'brand-models' && <BrandModelManager vehicleBrandModels={vehicleBrandModels} maintenancePlans={maintenancePlans} vehicles={vehicles} serviceOrders={serviceOrders} tires={tires} />}
            {currentTab === 'fleet' && <VehicleManager 
              vehicles={vehicles} 
              vehicleBrandModels={vehicleBrandModels} 
              tires={tires} 
              serviceOrders={serviceOrders}
              maintenancePlans={maintenancePlans}
              maintenanceSchedules={maintenanceSchedules}
              onAddVehicle={storageService.addVehicle} 
              onDeleteVehicle={storageService.deleteVehicle} 
              onUpdateVehicle={storageService.updateVehicle}
              onUpdateServiceOrder={storageService.updateServiceOrder}
              onDeleteAlert={storageService.deleteArrivalAlert}
              onSimulateArrival={handleSimulateArrival}
              userLevel={userRole}
              settings={settings}
              trackerSettings={trackerSettings}
              onSyncSascar={syncSascar}
            />}
            {currentTab === 'inspection' && <InspectionHub tires={tires} vehicles={vehicles} onUpdateTire={storageService.updateTire} onCreateServiceOrder={storageService.addServiceOrder} settings={settings} />}
            {currentTab === 'retreading' && <RetreadingHub tires={tires} retreadOrders={retreadOrders} onUpdateTire={storageService.updateTire} onNotification={addToast} settings={settings} />}
            {currentTab === 'retreader-ranking' && <RetreaderRanking tires={tires} retreadOrders={retreadOrders} />}
            {currentTab === 'strategic-analysis' && <StrategicAnalysis tires={tires} vehicles={vehicles} settings={settings} />}
            {currentTab === 'demand-forecast' && <DemandForecast tires={tires} vehicles={vehicles} settings={settings} />}
            {currentTab === 'financial' && <FinancialHub tires={tires} vehicles={vehicles} retreadOrders={retreadOrders} />}
            {currentTab === 'esg-panel' && <EsgPanel tires={tires} retreadOrders={retreadOrders} />}
            {currentTab === 'maintenance' && (
              <MaintenanceDashboard 
                vehicles={vehicles} 
                maintenanceSchedules={maintenanceSchedules} 
                maintenancePlans={maintenancePlans} 
                vehicleBrandModels={vehicleBrandModels}
                onOpenServiceOrder={(vehicleId) => {
                  setPreselectedVehicleId(vehicleId);
                  setShouldOpenOSModal(true);
                  setCurrentTab('service-orders');
                }}
              />
            )}
            {currentTab === 'location' && <LocationMap vehicles={vehicles} tires={tires} settings={settings} onSync={syncSascar} />}
            {currentTab === 'service-orders' && (
              <ServiceOrderHub 
                serviceOrders={serviceOrders} 
                maintenancePlans={maintenancePlans} 
                maintenanceSchedules={maintenanceSchedules} 
                vehicles={vehicles} 
                vehicleBrandModels={vehicleBrandModels} 
                tires={tires} 
                stockItems={stockItems} 
                onUpdateOrder={storageService.updateServiceOrder} 
                onUpdateOrderBatch={storageService.updateServiceOrderBatch}
                onAddOrder={handleAddServiceOrder} 
                settings={settings} 
                arrivalAlerts={arrivalAlerts} 
                initialVehicleId={preselectedVehicleId || undefined}
                initialModalOpen={shouldOpenOSModal}
                onCloseInitialModal={() => setShouldOpenOSModal(false)}
                collaborators={collaborators}
                onAddCollaborator={storageService.addCollaborator}
                onUpdateCollaborator={storageService.updateCollaborator}
                onDeleteCollaborator={storageService.deleteCollaborator}
              />
            )}
            {currentTab === 'service' && <ServiceManager userLevel={userRole} />}
            {currentTab === 'reports' && <ReportsHub tires={tires} vehicles={vehicles} serviceOrders={serviceOrders} retreadOrders={retreadOrders} vehicleBrandModels={vehicleBrandModels} onFullScreenToggle={setIsReportsFullScreen} />}
            {currentTab === 'settings' && <Settings currentSettings={settings || {} as any} onUpdateSettings={storageService.saveSettings} />}
            {currentTab === 'drivers' && <DriversHub drivers={drivers} vehicles={vehicles} tires={tires} onAddDriver={storageService.addDriver} onUpdateDriver={(driver) => storageService.updateDriver(driver.id, driver)} onDeleteDriver={storageService.deleteDriver} onUpdateVehicle={storageService.updateVehicle} />}
            {currentTab === 'tracker' && userRole === 'CREATOR' && <TrackerSettingsComponent />}
        </div>
      </main>

      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        tires={tires} 
        vehicles={vehicles} 
        settings={settings || {} as any} 
        arrivalAlerts={arrivalAlerts} 
        maintenanceSchedules={maintenanceSchedules}
        maintenancePlans={maintenancePlans}
        onDeleteAlert={storageService.deleteArrivalAlert}
      />
      <ToastNotifications toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {syncModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Sincronização Concluída</h3>
              <button onClick={() => setSyncModal({ isOpen: false, updatedPlates: [] })} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {syncModal.updatedPlates.length > 0 ? (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    Foram atualizados {syncModal.updatedPlates.length} veículos com sucesso:
                  </p>
                  <div className="max-h-60 overflow-y-auto bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <ul className="space-y-2">
                      {syncModal.updatedPlates.map((plate, idx) => (
                        <li key={idx} className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          {plate}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600 text-center py-4">
                  Nenhum veículo precisou ser atualizado no momento.
                </p>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSyncModal({ isOpen: false, updatedPlates: [] })}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
