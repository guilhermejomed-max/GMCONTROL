
import React, { useState, useEffect, useRef } from 'react';
import { WasteManagement } from './components/WasteManagement';
import { PartnerManager } from './components/PartnerManager';
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
import { Ambulatory } from './components/Ambulatory';
import { PpeStock } from './components/PpeStock';
import { RetreaderRanking } from './components/RetreaderRanking';
import ScrapHub from './components/ScrapHub';
import { VehicleManager } from './components/VehicleManager';
import { FleetIssue, FleetIssuesPanel } from './components/FleetIssuesPanel';
import { BrandModelManager } from './components/BrandModelManager';
import { VehicleTypeManager } from './components/VehicleTypeManager';
import { FuelTypeManager } from './components/FuelTypeManager';
import { LocationMap } from './components/LocationMap';
import { ServiceOrderHub } from './components/ServiceOrderHub';
import { MaintenanceDashboard } from './components/MaintenanceDashboard';
import { MaintenanceTVPanel } from './components/MaintenanceTVPanel';
import { FuelDashboard } from './components/FuelDashboard';
import { ServiceManager } from './components/ServiceManager';
import { Settings } from './components/Settings';
import { DriversHub } from './components/DriversHub';
import { Occurrences } from './components/Occurrences';
import { ReportsHub } from './components/ReportsHub';
import { ConsumptionReport } from './components/ConsumptionReport';
import { CommandCenter } from './components/CommandCenter';
import { VehicleRGPublic } from './components/VehicleRGPublic';
import { QRServiceRequests } from './components/QRServiceRequests';
import TrackerSettingsComponent from './components/TrackerSettings';
import { NotificationsPanel } from './components/NotificationsPanel';
import { ToastNotifications } from './components/ToastNotifications';
import { GlobalHeader } from './components/GlobalHeader';
import { RHModule } from './components/RHModule';
import { storageService } from './services/storageService';
import { sascarService } from './services/sascarService';
import { telemetryFuelService } from './services/telemetryFuelService';
import { chooseAuthoritativeOdometer, isImplausibleImportedOdometer, parseTrackerOdometerKm } from './lib/odometerUtils';
import { calculatePredictedTreadDepth, parseSascarDate } from './src/utils';
import { TabView, Tire, Vehicle, VehicleBrandModel, FuelType, ServiceOrder, RetreadOrder, SystemSettings, Driver, ToastMessage, UserLevel, ModuleType, TrackerSettings, ArrivalAlert, Branch, VehicleType, FuelEntry, FuelStation, ServiceClassification, ServiceSector, OccurrenceReason, Occurrence, WasteDisposal, PublicServiceRequest } from './types';
import { Lock, Mail, LayoutDashboard, Loader2, User, LifeBuoy, Bell, Menu, Calendar, UserCircle, X, Building2, SwitchCamera, ArrowRightLeft, Truck, Wrench, Fuel } from 'lucide-react';

const LoginScreen = ({ 
  branches, 
  selectedBranchId, 
  setSelectedBranchId 
}: { 
  branches: Branch[], 
  selectedBranchId?: string, 
  setSelectedBranchId: (id: string) => void 
}) => {
  const [username, setUsername] = useState('');
  const [pass, setPass] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const labelClass = "block text-[11px] font-black text-slate-700 uppercase mb-2 tracking-wide";
  const inputWrapClass = "relative group";
  const iconClass = "absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors";
  const inputClass = "w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 font-black text-slate-900 shadow-sm shadow-slate-950/5 placeholder:text-slate-400 transition-all";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegistering && !selectedBranchId && branches.length > 0) {
      setError('Por favor, selecione uma filial para continuar.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        // Passamos o username limpo para o registro
        await storageService.register(username, pass, name, selectedBranchId);
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
    <div className="min-h-screen relative overflow-hidden gm-login-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]" />
      <div className="relative z-10 bg-white/95 backdrop-blur-xl w-full max-w-md p-8 rounded-3xl shadow-2xl shadow-slate-950/30 border border-white/70 animate-in fade-in zoom-in-95 duration-300">
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

        <form onSubmit={handleLogin} className="space-y-4 [&_label]:!text-[11px] [&_label]:!font-black [&_label]:!text-slate-700 [&_label]:!mb-2 [&_label]:!tracking-wide">
          {isRegistering && (
            <div>
              <label className={labelClass}>Nome Completo</label>
              <div className={inputWrapClass}>
                <User className={iconClass} />
                <input 
                  type="text" 
                  className={inputClass}
                  placeholder="Seu Nome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          
          {isRegistering && (
            <div>
              <label className={labelClass}>Filial</label>
              <div className={inputWrapClass}>
                <Building2 className={iconClass} />
                <select 
                  className={`${inputClass} appearance-none`}
                  value={selectedBranchId || ''}
                  onChange={e => setSelectedBranchId(e.target.value)}
                >
                  <option value="">Selecione a Filial</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuário (nome.sobrenome)</label>
            <div className={inputWrapClass}>
              <UserCircle className={iconClass} />
              <input 
                type="text" 
                className={`${inputClass} lowercase`}
                placeholder="nome.sobrenome ou email"
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
            <div className={inputWrapClass}>
              <Lock className={iconClass} />
              <input 
                type="password" 
                className={inputClass}
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
  const orgId = user?.uid || 'default';

  // App State
  const [currentTab, setCurrentTab] = useState<TabView>('dashboard');
  const [isReportsFullScreen, setIsReportsFullScreen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [editingTire, setEditingTire] = useState<Tire | null>(null);
  
  const [tires, setTires] = useState<Tire[]>([]);
  const [financialRecords, setFinancialRecords] = useState<import('./types').FinancialRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleBrandModels, setVehicleBrandModels] = useState<VehicleBrandModel[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<import('./types').MaintenancePlan[]>([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<import('./types').MaintenanceSchedule[]>([]);
  const [retreadOrders, setRetreadOrders] = useState<RetreadOrder[]>([]);
  const [tireLoans, setTireLoans] = useState<any[]>([]);
  const [partners, setPartners] = useState<import('./types').Partner[]>([]);
  const [settings, setSettings] = useState<SystemSettings | undefined>(undefined);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [collaborators, setCollaborators] = useState<import('./types').Collaborator[]>([]);
  const [arrivalAlerts, setArrivalAlerts] = useState<ArrivalAlert[]>([]);
  const [occurrences, setOccurrences] = useState<import('./types').Occurrence[]>([]);
  const [stockItems, setStockItems] = useState<import('./types').StockItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [publicServiceRequests, setPublicServiceRequests] = useState<PublicServiceRequest[]>([]);
  const [classifications, setClassifications] = useState<ServiceClassification[]>([]);
  const [sectors, setSectors] = useState<ServiceSector[]>([]);
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);
  const [occurrenceReasons, setOccurrenceReasons] = useState<OccurrenceReason[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<import('./types').PaymentMethod[]>([]);
  const [teamMembers, setTeamMembers] = useState<import('./types').TeamMember[]>([]);
  const [notifications, setNotifications] = useState<import('./types').AppNotification[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  const [userBranchId, setUserBranchId] = useState<string | undefined>(undefined);
  
  const [userRole, setUserRole] = useState<UserLevel>('SENIOR'); 
  const [allowedModules, setAllowedModules] = useState<ModuleType[]>(['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'JMDSSMAQ', 'HR']);
  const [activeModule, setActiveModule] = useState<ModuleType>('TIRES');
  const [trackerSettings, setTrackerSettings] = useState<TrackerSettings | null>(null);
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [wasteDisposals, setWasteDisposals] = useState<WasteDisposal[]>([]);
  const [limits, setLimits] = useState({
    tires: 5000,
    vehicles: 2000,
    serviceOrders: 1000,
    fuelEntries: 5000
  });
  const [hasMore, setHasMore] = useState({
    tires: false,
    vehicles: false,
    serviceOrders: false,
    fuelEntries: false
  });

  // Helper to check if there are more items
  useEffect(() => {
    setHasMore(prev => ({
      ...prev,
      tires: false,
      vehicles: false,
      serviceOrders: serviceOrders.length >= limits.serviceOrders,
      fuelEntries: fuelEntries.length >= limits.fuelEntries
    }));
  }, [serviceOrders.length, fuelEntries.length, limits]);

  const handleLoadMore = (module: keyof typeof limits) => {
    setLimits(prev => ({
      ...prev,
      [module]: prev[module] + (module === 'tires' || module === 'vehicles' ? 1000 : 200)
    }));
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean, updatedPlates: string[] }>({ isOpen: false, updatedPlates: [] });
  const migrationDone = useRef(false);
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | null>(null);
  const [preselectedOccurrenceId, setPreselectedOccurrenceId] = useState<string | null>(null);
  const [shouldOpenOSModal, setShouldOpenOSModal] = useState(false);
  const vehicleRgId = new URLSearchParams(window.location.search).get('vehicleRg') || new URLSearchParams(window.location.search).get('id');
  const vehicleRgPlate = new URLSearchParams(window.location.search).get('plate') || '';
  const isVehicleRgRoute = window.location.pathname.includes('vehicle-rg') || Boolean(vehicleRgId);
  const [publicRgData, setPublicRgData] = useState<{ vehicle?: Vehicle; fuelEntries: FuelEntry[]; serviceOrders: ServiceOrder[]; isLoading: boolean; error?: string }>({
    fuelEntries: [],
    serviceOrders: [],
    isLoading: false
  });

  const handleGenerateOSFromOccurrence = (occurrenceId: string, vehicleId: string) => {
    setPreselectedVehicleId(vehicleId);
    setPreselectedOccurrenceId(occurrenceId);
    setShouldOpenOSModal(true);
    setCurrentTab('service-orders');
  };

  useEffect(() => {
    if (!isVehicleRgRoute || !vehicleRgId) return;

    let cancelled = false;
    setPublicRgData(prev => ({ ...prev, isLoading: true, error: undefined }));

    const query = new URLSearchParams({ id: vehicleRgId });
    if (vehicleRgPlate) query.set('plate', vehicleRgPlate);
    fetch(`/api/public/vehicle-rg?${query.toString()}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Nao foi possivel carregar o RG.');
        return data;
      })
      .then(data => {
        if (cancelled) return;
        setPublicRgData({
          vehicle: data.vehicle,
          fuelEntries: data.fuelEntries || [],
          serviceOrders: data.serviceOrders || [],
          isLoading: false
        });
      })
      .catch(error => {
        storageService.getPublicVehicleRg(vehicleRgId, vehicleRgPlate)
          .then(publicVehicle => {
            if (cancelled) return;
            if (publicVehicle) {
              setPublicRgData({ vehicle: publicVehicle, fuelEntries: [], serviceOrders: [], isLoading: false });
              return;
            }
            setPublicRgData({ fuelEntries: [], serviceOrders: [], isLoading: false, error: error?.message || 'Erro ao carregar RG.' });
          })
          .catch(fallbackError => {
            if (cancelled) return;
            setPublicRgData({ fuelEntries: [], serviceOrders: [], isLoading: false, error: fallbackError?.message || error?.message || 'Erro ao carregar RG.' });
          });
      });

    return () => {
      cancelled = true;
    };
  }, [isVehicleRgRoute, vehicleRgId, vehicleRgPlate]);

  useEffect(() => {
    setIsReportsFullScreen(false);
  }, [currentTab]);

  useEffect(() => {
    const unsubAuth = storageService.subscribeToAuth(async (u) => {
        setUser(u);
        if (u) {
            // Fetch profile to get role
            const profile = await storageService.getUserProfile(u.uid);
            if (profile) {
                // Merge auth user with profile data
                setUser({ ...u, ...profile });
                setUserRole(profile.role);
                const userModules = (profile.allowedModules || ['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'JMDSSMAQ', 'HR'])
                  .filter((m: any) => ['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'JMDSSMAQ', 'HR'].includes(m)) as ModuleType[];
                
                const finalModules = userModules.length > 0 ? userModules : ['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'JMDSSMAQ', 'HR'] as ModuleType[];
                setAllowedModules(finalModules);
                
                const initialModule = finalModules[0] || 'TIRES';
                setActiveModule(initialModule);
                
                if (profile.branchId) {
                    setSelectedBranchId(profile.branchId);
                    setUserBranchId(profile.branchId);
                } else {
                    setSelectedBranchId(undefined);
                    setUserBranchId(undefined);
                }

                // Set default tab based on module for Inspector
                if (profile.role === 'INSPECTOR') {
                    if (initialModule === 'TIRES') setCurrentTab('movement');
                    else if (initialModule === 'VEHICLES') setCurrentTab('fleet');
                    else if (initialModule === 'MECHANICAL') setCurrentTab('maintenance');
                    else if (initialModule === 'FUEL') setCurrentTab('fuel');
                }
            } else if (u.email && (u.email.toLowerCase().trim() === 'gui@gmail.com' || u.email.toLowerCase().trim() === 'guilherme.jomed@gmail.com')) {
                setUserRole('CREATOR');
                setAllowedModules(['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'JMDSSMAQ', 'HR']);
            } else if (u.email && u.email.toLowerCase().trim() === 'inspetor@gmcontrol.com') {
                setUserRole('INSPECTOR');
                setAllowedModules(['TIRES']);
                setActiveModule('TIRES');
                setCurrentTab('movement');
            } else {
                setUserRole('SENIOR');
                setAllowedModules(['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'JMDSSMAQ', 'HR']);
            }
        } else {
            setSelectedBranchId(undefined);
            setUserBranchId(undefined);
        }
        setLoadingAuth(false);
    });
    return () => unsubAuth();
  }, []);

  // 1. Global/Critical Subscriptions (Always load)
  useEffect(() => {
    if (!user && !isVehicleRgRoute) return;
    const unsubSettings = storageService.subscribeToSettings(orgId, setSettings);
    const unsubTracker = storageService.subscribeToTrackerSettings(orgId, setTrackerSettings);
    const unsubVehicleBrandModels = storageService.subscribeToVehicleBrandModels(orgId, setVehicleBrandModels);
    const unsubFuelStations = storageService.subscribeToFuelStations(setFuelStations);
    const unsubClassifications = storageService.subscribeToClassifications(setClassifications);
    const unsubSectors = storageService.subscribeToSectors(setSectors);
    const unsubPaymentMethods = storageService.subscribeToPaymentMethods(orgId, setPaymentMethods);
    const unsubTeam = storageService.subscribeToTeam(orgId, setTeamMembers);
    const unsubCollaborators = storageService.subscribeToCollaborators(orgId, setCollaborators);

    let unsubNotifications = () => {};
    if (user?.uid) {
      unsubNotifications = storageService.subscribeToNotifications(orgId, user.uid, (newNotes) => {
        setNotifications(prev => {
          const unread = newNotes.filter(n => !n.read);
          const lastRead = prev.filter(n => !n.read);
          
          if (unread.length > lastRead.length) {
            const latest = unread[0];
            if (latest && latest.senderId !== user.uid) {
              const alreadyToasted = prev.some(n => n.id === latest.id);
              if (!alreadyToasted) {
                addToast('info', `Novo Alerta: ${latest.senderName}`, latest.text);
              }
            }
          }
          return newNotes;
        });
      });
    }
    
    // One-time fetches for static data
    storageService.getBranches().then(setBranches);
    storageService.getVehicleTypes(orgId).then(setVehicleTypes);
    storageService.getFuelTypes(orgId).then(setFuelTypes);

    return () => {
        unsubSettings();
        unsubTracker();
        unsubVehicleBrandModels();
        unsubFuelStations();
        unsubClassifications();
        unsubSectors();
        unsubPaymentMethods();
        unsubTeam();
        unsubCollaborators();
        unsubNotifications();
    };
  }, [user]);

  // 2. Core Data (Needed by Dashboard and most modules)
  useEffect(() => {
    if (!user) return;
    const unsubVehicles = storageService.subscribeToVehicles(orgId, setVehicles);
    const unsubTires = storageService.subscribeToTires(orgId, setTires);
    const unsubServiceOrders = storageService.subscribeToServiceOrders(orgId, setServiceOrders, limits.serviceOrders);
    const unsubMaintenanceSchedules = storageService.subscribeToMaintenanceSchedules(orgId, setMaintenanceSchedules);
    const unsubStockItems = storageService.subscribeToStock(orgId, setStockItems);
    
    return () => {
        unsubVehicles();
        unsubTires();
        unsubServiceOrders();
        unsubMaintenanceSchedules();
        unsubStockItems();
    };
  }, [user, limits.serviceOrders, isVehicleRgRoute]);

  // 3. Tires Module Data (Lazy)
  useEffect(() => {
    if (!user || activeModule !== 'TIRES') return;
    const unsubFinancialRecords = storageService.subscribeToFinancialRecords(orgId, setFinancialRecords);
    const unsubRetreadOrders = storageService.subscribeToRetreadOrders(orgId, setRetreadOrders);
    const unsubTireLoans = storageService.subscribeToTireLoans(orgId, setTireLoans);
    
    return () => {
        unsubFinancialRecords();
        unsubRetreadOrders();
        unsubTireLoans();
    };
  }, [user, activeModule]);

  // 4. Mechanical Module Data (Lazy)
  useEffect(() => {
    if (!user || activeModule !== 'MECHANICAL') return;
    const unsubMaintenancePlans = storageService.subscribeToMaintenancePlans(orgId, setMaintenancePlans);
    const unsubPartners = storageService.subscribeToPartners(orgId, setPartners);
    const unsubPublicRequests = storageService.subscribeToPublicServiceRequests(setPublicServiceRequests);
    
    return () => {
        unsubMaintenancePlans();
        unsubPartners();
        unsubPublicRequests();
    };
  }, [user, activeModule]);

  // 5. Fuel Module Data (Lazy)
  useEffect(() => {
    if ((!user && !isVehicleRgRoute) || (activeModule !== 'FUEL' && !isVehicleRgRoute)) return;
    const unsubFuelEntries = storageService.subscribeToFuelEntries(orgId, setFuelEntries, limits.fuelEntries);
    
    return () => {
        unsubFuelEntries();
    };
  }, [user, activeModule, limits.fuelEntries, isVehicleRgRoute]);

  // 6. Other Data (Lazy - Occurrences and Fleet Specifics)
  useEffect(() => {
    if (!user || (activeModule !== 'VEHICLES' && activeModule !== 'MECHANICAL' && activeModule !== 'JMDSSMAQ' && currentTab !== 'location' && currentTab !== 'occurrences' && currentTab !== 'service-orders')) return;
    const unsubArrivalAlerts = storageService.subscribeToArrivalAlerts(orgId, setArrivalAlerts);
    const unsubDrivers = storageService.subscribeToDrivers(orgId, setDrivers);
    const unsubOccurrenceReasons = storageService.subscribeToOccurrenceReasons(orgId, setOccurrenceReasons);
    const unsubOccurrences = storageService.subscribeToOccurrences(orgId, setOccurrences);
    const unsubWasteDisposals = storageService.subscribeToWasteDisposals(orgId, setWasteDisposals);
    
    return () => {
        unsubArrivalAlerts();
        unsubDrivers();
        unsubOccurrenceReasons();
        unsubOccurrences();
        unsubWasteDisposals();
    };
  }, [user, activeModule, currentTab]);

  // MIGRATION: Set default fuelType to 'DIESEL S10' for all records that don't have one
  useEffect(() => {
    if (userRole === 'CREATOR' && !migrationDone.current && vehicles.length > 0) {
      const runMigration = async () => {
        try {
          console.log('Running fuelType migration...');
          let migratedCount = 0;

          // Migrate Brand Models
          for (const bm of vehicleBrandModels) {
            if (!bm.fuelType) {
              await storageService.updateVehicleBrandModel(orgId, { ...bm, fuelType: 'DIESEL S10' });
              migratedCount++;
            }
          }
          // Migrate Vehicles
          for (const v of vehicles) {
            if (!v.fuelType) {
              await storageService.updateVehicle(orgId, { ...v, fuelType: 'DIESEL S10' });
              migratedCount++;
            }
          }
          // Migrate Fuel Entries
          for (const e of fuelEntries) {
            if (!e.fuelType) {
              await storageService.updateFuelEntry(orgId, e.id, { fuelType: 'DIESEL S10' });
              migratedCount++;
            }
          }

          if (migratedCount > 0) {
            console.log(`FuelType migration completed: ${migratedCount} records updated.`);
          }
          migrationDone.current = true;
        } catch (error) {
          console.error('Migration failed:', error);
        }
      };
      runMigration();
    }
  }, [userRole, vehicles.length, vehicleBrandModels.length, fuelEntries.length, orgId]);

  // AUTOMATED UPDATES CHECK (Run once when data is available)
  useEffect(() => {
      if (vehicles.length > 0 && settings) {
          storageService.checkDailyTrailerIncrement(orgId, vehicles, settings);
      }
  }, [vehicles.length, settings, orgId]);

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
          storageService.updateArrivalAlert(orgId, alert.id, { 
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
          if (kmRemaining <= 0 && vehicle.type !== 'CARRETA') {
            maintenanceAlert = `O veículo ${vehicle.plate} chegou e está com MANUTENÇÃO VENCIDA há ${Math.abs(kmRemaining)} km!`;
          } else if (kmRemaining <= 1000 && vehicle.type !== 'CARRETA') {
            maintenanceAlert = `O veículo ${vehicle.plate} chegou e está PRÓXIMO da manutenção (faltam ${kmRemaining} km).`;
          } else {
            maintenanceAlert = `O veículo ${vehicle.plate} chegou ao destino: ${alert.targetName}`;
          }

          addToast(kmRemaining <= 0 ? 'error' : (kmRemaining <= 1000 ? 'warning' : 'success'), 
                   'Chegada de Veículo', maintenanceAlert);
          
          // Also check if there are other vehicles overdue
          const otherOverdue = vehicles.filter(v => {
            if (v.id === vehicle.id) return false;
            if (v.type === 'CARRETA') return false;
            const next = (v.lastPreventiveKm || 0) + (v.revisionIntervalKm || 10000);
            return (v.odometer || 0) >= next;
          });

          if (otherOverdue.length > 0) {
            setTimeout(() => {
              addToast('info', 'Resumo de Manutenção', `Existem outros ${otherOverdue.length} veículos com manutenção vencida na frota.`);
            }, 2000);
          }
          
          // Also log activity
          storageService.logActivity(orgId, "Chegada", maintenanceAlert, 'VEHICLES');
        }
      }
    });
  }, [vehicles, arrivalAlerts]);

  // OVERDUE MAINTENANCE + NEARBY BASE ALERT
  const alertedOverdueRef = useRef<Record<string, string>>({}); // vehicleId -> lastAlertedBaseId
  useEffect(() => {
    if (vehicles.length === 0 || !settings?.savedPoints || settings.savedPoints.length === 0) return;

    const overdueCavalo = vehicles.filter(v => {
      if (v.type !== 'CAVALO' && v.type !== 'BI-TRUCK') return false;
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
          
          storageService.logActivity(orgId, "Alerta Manutenção", alertMsg, 'VEHICLES');
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
  const syncSascar = async (showModal: boolean = false, vehicleIds?: string[]) => {
    if (isSyncingRef.current) {
      if (showModal) addToast('info', 'Sincronização em andamento', 'Aguarde a conclusão da sincronização atual.');
      return 0;
    }
    
    const currentVehicles = vehicleIds && vehicleIds.length > 0
      ? vehicles.filter(v => vehicleIds.includes(v.id))
      : vehicles;
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
    const normalizePlate = (value: any) => String(value || '').trim().replace(/(-\d+)+$/g, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const normalizeSascarId = (value: any) => String(value || '').replace(/\D/g, '');
    const parseTelemetryNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number(String(value).trim().replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    const parseOdometerKm = (sv: any): number => parseTrackerOdometerKm(sv);
    
    if (showModal) addToast('info', 'Sincronizando', 'Buscando dados na Sascar...');

    try {
      // 1. Otimização de Dados: Incluir tanto placas quanto códigos Sascar para busca
      const sascarTargets = currentVehicles
        .map(v => ({
          code: String(v.sascarCode || '').trim(),
          plate: String(v.plate || '').trim()
        }))
        .filter(item => item.code.length > 0);
      const plates = Array.from(new Set(sascarTargets.map(item => item.code)));
      if (plates.length === 0) {
        if (showModal) addToast('warning', 'Sem Codigo Sascar', 'Preencha o Codigo da Sascar nos veiculos para sincronizar.');
        return 0;
      }

      console.log(`[Sascar Sync] Iniciando sincronização para ${currentVehicles.length} veículos locais usando ${plates.length} termos de busca...`);
      storageService.logActivity(orgId, "Sincronização Sascar", `Iniciada para ${currentVehicles.length} veículos`, 'VEHICLES');
      
      const results = [];
      try {
          console.log(`[Sascar Sync] Solicitando posições...`);
          const result = await sascarService.getVehicles(sascarTargets, trackerSettings || undefined);
          results.push(result.data || []);
      } catch (error: any) {
          console.error(`[Sascar Sync] Falha na sincronização:`, error.message);
      }

      // 4. Consolidação: Processar todos os itens recebidos
      const allRawItems = results.flat();
      const updatesBatch: any[] = [];
      const processedLocalIds = new Set<string>();
      const updatedPlatesList: string[] = [];
      let invalidPositionCount = 0;
      let missingLitrometerCount = 0;
      let missingOdometerCount = 0;
      let stalePositionCount = 0;

      // Ordenar itens por data para garantir que pegamos o mais recente
      const sortedItems = [...allRawItems].sort((a, b) => {
        const dateA = parseSascarDate(a.lastLocation?.updatedAt || a.dataPosicao || 0);
        const dateB = parseSascarDate(b.lastLocation?.updatedAt || b.dataPosicao || 0);
        return dateB - dateA; // Mais recente primeiro
      });

      sortedItems.forEach((sv: any) => {
        const sascarId = String(sv.idVeiculo || sv.id || "").trim();
        const sascarNumericId = normalizeSascarId(sascarId);
        const sascarPlate = normalizePlate(sv.placa || sv.plate);
        
        if (!sascarId && !sascarPlate) return;
        
        // Encontrar o veículo local que corresponde a este item da Sascar
        const localVehicle = currentVehicles.find(v => {
          if (processedLocalIds.has(v.id)) return false;

          // Tentar match por ID Sascar
          if (sascarId && v.sascarCode) {
            const cleanIdApp = String(v.sascarCode).trim();
            if (cleanIdApp === sascarId) return true;
            // Tentar match numérico se ambos forem números
            if (normalizeSascarId(cleanIdApp) && sascarNumericId && normalizeSascarId(cleanIdApp) === sascarNumericId) {
              return true;
            }
          }
          
          // Tentar match por Placa
          if (sascarPlate) {
            const plateApp = normalizePlate(v.plate);
            if (plateApp && plateApp === sascarPlate) return true;
          }
          
          return false;
        });

        if (localVehicle) {
          processedLocalIds.add(localVehicle.id);
          const incomingPositionTime = parseSascarDate(sv.lastLocation?.updatedAt || sv.dataPosicaoIso || sv.dataPosicao || sv.dataHora || '');
          const savedPositionTime = parseSascarDate(localVehicle.lastLocation?.updatedAt || '');
          if (savedPositionTime > 0 && incomingPositionTime > 0 && incomingPositionTime <= savedPositionTime) {
            stalePositionCount++;
            return;
          }

          const trackerOdo = Math.round(parseOdometerKm(sv));
          if (trackerOdo <= 0) missingOdometerCount++;
          const finalOdo = chooseAuthoritativeOdometer(localVehicle.odometer || 0, trackerOdo);
          const lat = parseTelemetryNumber(sv.latitude ?? sv.lat) || 0;
          const lng = parseTelemetryNumber(sv.longitude ?? sv.lng) || 0;

          const isInvalidPosition = lat === 0 && lng === 0;
          if (isInvalidPosition) invalidPositionCount++;
          const finalLat = isInvalidPosition ? (localVehicle.lastLocation?.lat || 0) : lat;
          const finalLng = isInvalidPosition ? (localVehicle.lastLocation?.lng || 0) : lng;
          const hasLocationToPersist = !isInvalidPosition || !!localVehicle.lastLocation;

          // Telemetry fuel history
          const rawLitrometer = sv.litrometer ?? sv.litrometro ?? sv.litrometro2 ?? sv.litrometroTotal ?? sv.totalLitros ?? sv.totalCombustivel;
          const parsedLitrometer = parseTelemetryNumber(rawLitrometer);
          const hasValidLitrometer = Number.isFinite(parsedLitrometer);
          if (!hasValidLitrometer) missingLitrometerCount++;
          const currentLitrometer = hasValidLitrometer
            ? (parsedLitrometer as number)
            : localVehicle.litrometer;
          let newHistory = localVehicle.telemetryHistory ? [...localVehicle.telemetryHistory] : [];
          
          if (trackerOdo > 0 && finalOdo === trackerOdo && hasValidLitrometer && currentLitrometer! >= 0) {
            // Add new point
            const nowIso = new Date().toISOString();
            // Try not to add duplicates or very close points
            const lastPoint = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
            if (!lastPoint || (finalOdo - lastPoint.odometer >= 1) || Math.abs(currentLitrometer! - lastPoint.litrometer) >= 1) {
              newHistory.push({
                timestamp: nowIso,
                odometer: finalOdo,
                litrometer: currentLitrometer!
              });
              
              // Keep history bounded, e.g., last 2000 points
              if (newHistory.length > 2000) {
                newHistory = newHistory.slice(-2000);
              }
            }
          }

          const telemetryRollingResult = telemetryFuelService.calculateRollingAverage(newHistory, 1000);
          const newAvgKml = telemetryRollingResult ? telemetryRollingResult.avgKml : localVehicle.telemetryRollingAvgKml;

          updatesBatch.push({
            id: localVehicle.id,
            odometer: finalOdo > 0 ? finalOdo : localVehicle.odometer,
            ...(hasValidLitrometer ? { litrometer: currentLitrometer } : {}),
            telemetryHistory: newHistory,
            telemetryRollingAvgKml: newAvgKml,
            totalFuelConsumed: Number(sv.totalFuelConsumed || 0),
            ...(hasLocationToPersist ? { lastLocation: {
              ...localVehicle.lastLocation,
              lat: finalLat,
              lng: finalLng,
              address: isInvalidPosition ? (localVehicle.lastLocation?.address || 'Coordenadas GPS') : (sv.lastLocation?.address || sv.address || sv.rua || localVehicle.lastLocation?.address || 'Coordenadas GPS'),
              city: isInvalidPosition ? (localVehicle.lastLocation?.city || 'Desconhecida') : (sv.lastLocation?.city || sv.city || sv.cidade || localVehicle.lastLocation?.city || 'Desconhecida'),
              state: isInvalidPosition ? (localVehicle.lastLocation?.state || '') : (sv.lastLocation?.state || sv.state || sv.uf || localVehicle.lastLocation?.state || ''),
              updatedAt: new Date(incomingPositionTime || Date.now()).toISOString()
            } } : {}),
            speed: Number(sv.velocidade || sv.speed || 0),
            ignition: sv.ignicao === 'S' || sv.ignicao === 'true' || sv.ignicao === '1' || sv.ignition === true,
            lastAutoUpdateDate: new Date().toISOString()
          });
          updatedPlatesList.push(localVehicle.plate);
        }
      });

      if (updatesBatch.length > 0) {
        await storageService.updateVehicleBatch(orgId, updatesBatch);
        
        // Auto-update tires
        const tireUpdates: Partial<Tire>[] = [];
        updatesBatch.forEach(update => {
            const vehicle = currentVehicles.find(v => v.id === update.id);
            if (vehicle) {
                const tiresOnVehicle = tires.filter(t => t.vehicleId === vehicle.id);
                tiresOnVehicle.forEach(tire => {
                    tireUpdates.push({
                        id: tire.id,
                        currentTreadDepth: calculatePredictedTreadDepth(tire, update.odometer)
                    });
                });
            }
        });
        if (tireUpdates.length > 0) {
            await storageService.updateTireBatch(orgId, tireUpdates);
        }
        
        totalUpdated = updatesBatch.length;
        const notMatched = currentVehicles
          .filter(v => !processedLocalIds.has(v.id))
          .map(v => `${v.plate}${v.sascarCode ? ` (${v.sascarCode})` : ''}`);
        if (notMatched.length > 0 || invalidPositionCount > 0 || missingLitrometerCount > 0 || missingOdometerCount > 0 || stalePositionCount > 0) {
          console.warn('[Sascar Sync] Diagnóstico', {
            semMatch: notMatched,
            posicoesInvalidas: invalidPositionCount,
            semLitrometro: missingLitrometerCount,
            semHodometro: missingOdometerCount,
            posicoesAntigasIgnoradas: stalePositionCount,
            retornosSascar: allRawItems.length
          });
          storageService.logActivity(
            orgId,
            "Diagnóstico Sascar",
            `${notMatched.length} sem match, ${invalidPositionCount} posição inválida, ${missingLitrometerCount} sem litrometro, ${missingOdometerCount} sem hodômetro`,
            'VEHICLES'
          );
        }
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

    await storageService.updateVehicle(orgId, updatedVehicle);
    addToast('info', 'Simulação', `Localização do veículo ${plate} atualizada para ${base.name}`);
  };

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

  const auditedUpdateVehicle = async (vehicle: Vehicle) => {
      const existing = vehicles.find(v => v.id === vehicle.id);
      const nextOdometer = Number(vehicle.odometer || 0);

      if (isImplausibleImportedOdometer(nextOdometer)) {
          addToast('error', 'KM inválido', `O hodômetro de ${vehicle.plate} parece inválido: ${nextOdometer.toLocaleString('pt-BR')} km.`);
          throw new Error('Hodômetro inválido');
      }

      await storageService.updateVehicle(orgId, vehicle);

      if (!existing) return;

      const changes: string[] = [];
      if ((existing.odometer || 0) !== nextOdometer) {
          changes.push(`KM ${Number(existing.odometer || 0).toLocaleString('pt-BR')} -> ${nextOdometer.toLocaleString('pt-BR')}`);
      }
      if ((existing.sascarCode || '') !== (vehicle.sascarCode || '')) changes.push('código rastreador');
      if ((existing.renavam || '') !== (vehicle.renavam || '')) changes.push('RENAVAM');
      if ((existing.vin || '') !== (vehicle.vin || '')) changes.push('chassi');

      if (changes.length > 0) {
          storageService.logActivity(orgId, 'Auditoria Veículo', `${vehicle.plate}: ${changes.join(', ')}`, 'VEHICLES');
      }
  };

  const auditedAddVehicle = async (vehicle: Vehicle) => {
      const nextOdometer = Number(vehicle.odometer || 0);
      if (nextOdometer > 0 && isImplausibleImportedOdometer(nextOdometer)) {
          addToast('error', 'KM inválido', `O hodômetro de ${vehicle.plate} parece inválido: ${nextOdometer.toLocaleString('pt-BR')} km.`);
          throw new Error('Hodômetro inválido');
      }

      await storageService.addVehicle(orgId, vehicle);
      storageService.logActivity(orgId, 'Novo Veículo', `${vehicle.plate} cadastrado com KM ${nextOdometer.toLocaleString('pt-BR')}`, 'VEHICLES');
  };

  const auditedDeleteVehicle = async (id: string) => {
      const existing = vehicles.find(v => v.id === id);
      await storageService.deleteVehicle(orgId, id);
      storageService.logActivity(orgId, 'Excluiu Veículo', `${existing?.plate || id}`, 'VEHICLES');
  };

  // Wrapper function to properly construct Service Order before saving
  const handleUpdateServiceOrder = async (orderId: string, updates: Partial<ServiceOrder>) => {
      const existingOrder = serviceOrders.find(o => o.id === orderId);
      if (existingOrder && updates.parts) {
          // Calculate difference in parts
          const oldParts = existingOrder.parts || [];
          const newParts = updates.parts || [];

          for (const newPart of newParts) {
              if (!newPart.itemId) continue;
              const oldPart = oldParts.find(p => p.itemId === newPart.itemId);
              const oldQty = oldPart ? oldPart.quantity : 0;
              const diffQty = newPart.quantity - oldQty;

              if (diffQty > 0) {
                  // Deduct from stock
                  const stockItem = stockItems.find(si => si.id === newPart.itemId);
                  await storageService.registerStockMovement(orgId, {
                      id: Date.now().toString() + Math.random().toString(36).substring(7),
                      itemId: newPart.itemId,
                      itemName: stockItem?.name || 'Item desconhecido',
                      type: 'EXIT',
                      quantity: diffQty,
                      unitCost: stockItem?.averageCost || 0,
                      totalValue: (stockItem?.averageCost || 0) * diffQty,
                      date: new Date().toISOString(),
                      notes: `O.S. #${existingOrder.orderNumber} - Adição de peças`,
                      user: user?.displayName || user?.email || 'Sistema'
                  });
              } else if (diffQty < 0) {
                  // Return to stock
                  const stockItem = stockItems.find(si => si.id === newPart.itemId);
                  await storageService.registerStockMovement(orgId, {
                      id: Date.now().toString() + Math.random().toString(36).substring(7),
                      itemId: newPart.itemId,
                      itemName: stockItem?.name || 'Item desconhecido',
                      type: 'ENTRY',
                      quantity: Math.abs(diffQty),
                      unitCost: stockItem?.averageCost || 0,
                      totalValue: (stockItem?.averageCost || 0) * Math.abs(diffQty),
                      date: new Date().toISOString(),
                      notes: `O.S. #${existingOrder.orderNumber} - Remoção de peças`,
                      user: user?.displayName || user?.email || 'Sistema'
                  });
              }
          }

          // Check for removed parts
          for (const oldPart of oldParts) {
              if (!oldPart.itemId) continue;
              const stillExists = newParts.some(p => p.itemId === oldPart.itemId);
              if (!stillExists) {
                  // Return full quantity to stock
                  const stockItem = stockItems.find(si => si.id === oldPart.itemId);
                  await storageService.registerStockMovement(orgId, {
                      id: Date.now().toString() + Math.random().toString(36).substring(7),
                      itemId: oldPart.itemId,
                      itemName: stockItem?.name || 'Item desconhecido',
                      type: 'ENTRY',
                      quantity: oldPart.quantity,
                      unitCost: stockItem?.averageCost || 0,
                      totalValue: (stockItem?.averageCost || 0) * oldPart.quantity,
                      date: new Date().toISOString(),
                      notes: `O.S. #${existingOrder.orderNumber} - Remoção de peças`,
                      user: user?.displayName || user?.email || 'Sistema'
                  });
              }
          }
      }

      await storageService.updateServiceOrder(orgId, orderId, updates);
  };

  const handleAddServiceOrder = async (partialOrder: Omit<ServiceOrder, 'id' | 'orderNumber' | 'createdAt' | 'createdBy'>) => {
      const maxOrderNum = serviceOrders.reduce((max, o) => Math.max(max, o.orderNumber), 0);
      
      const linkedOccId = partialOrder.occurrenceId || preselectedOccurrenceId;
      
      const newOrder: ServiceOrder = {
          ...partialOrder,
          id: Date.now().toString(),
          orderNumber: maxOrderNum + 1,
          createdAt: new Date().toISOString(),
          createdBy: user?.displayName || user?.email || 'Usuário do Sistema',
          branchId: partialOrder.branchId || selectedBranchId,
          occurrenceId: linkedOccId || undefined
      };

      await storageService.addServiceOrder(orgId, newOrder);
      addToast('success', 'Ordem Criada', `O.S. #${newOrder.orderNumber} aberta com sucesso.`);

      // Link to occurrence if exists
      if (linkedOccId) {
          await storageService.updateOccurrence(orgId, linkedOccId, {
              linkedServiceOrderId: newOrder.id,
              linkedServiceOrderNumber: newOrder.orderNumber.toString()
          });
          setPreselectedOccurrenceId(null);
      }

      // Deduct parts from stock
      if (newOrder.parts && newOrder.parts.length > 0) {
          for (const part of newOrder.parts) {
              if (part.itemId) {
                  const stockItem = stockItems.find(si => si.id === part.itemId);
                  await storageService.registerStockMovement(orgId, {
                      id: Date.now().toString() + Math.random().toString(36).substring(7),
                      itemId: part.itemId,
                      itemName: stockItem?.name || 'Item desconhecido',
                      type: 'EXIT',
                      quantity: part.quantity,
                      unitCost: stockItem?.averageCost || 0,
                      totalValue: (stockItem?.averageCost || 0) * part.quantity,
                      date: new Date().toISOString(),
                      notes: `O.S. #${newOrder.orderNumber} - Veículo: ${newOrder.vehiclePlate}`,
                      user: user?.displayName || user?.email || 'Sistema'
                  });
              }
          }
      }

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
              await storageService.updateVehicle(orgId, {
                  ...vehicle,
                  ...updates
              });
              
              // Auto-update tires
              const tiresOnVehicle = tires.filter(t => t.vehicleId === vehicle.id);
              const tireUpdates = tiresOnVehicle.map(tire => ({
                  id: tire.id,
                  currentTreadDepth: calculatePredictedTreadDepth(tire, updates.odometer || vehicle.odometer || 0)
              }));
              if (tireUpdates.length > 0) {
                  await storageService.updateTireBatch(orgId, tireUpdates);
              }
          }
      }
  };

  const handleResolveFleetIssue = async (issue: FleetIssue, justification = ''): Promise<string> => {
      const vehicle = vehicles.find(v => v.id === issue.vehicleId);
      if (!vehicle) throw new Error('Veículo não encontrado.');

      if (issue.actionType === 'SYNC_SASCAR') {
          const updatedCount = await syncSascar(false, [issue.vehicleId]);
          if (updatedCount <= 0) {
              throw new Error('A Sascar não retornou atualização para este veículo. Verifique código do rastreador, placa e retorno da integração.');
          }
          storageService.logActivity(orgId, 'Correção Automática', `${vehicle.plate}: ${issue.title} corrigido via sincronização Sascar`, 'VEHICLES');
          return `${vehicle.plate}: sincronização aplicada. Confira se o alerta saiu da lista.`;
      }

      if (issue.actionType === 'CREATE_PREVENTIVE_OS') {
          const alreadyOpen = serviceOrders.some(order =>
              order.vehicleId === vehicle.id &&
              order.status !== 'CONCLUIDO' &&
              order.status !== 'CANCELADO' &&
              order.isPreventiveMaintenance
          );

          if (alreadyOpen) {
              return `${vehicle.plate}: já existe uma O.S. preventiva aberta ou pendente.`;
          }

          await handleAddServiceOrder({
              vehicleId: vehicle.id,
              vehiclePlate: vehicle.plate,
              title: 'Preventiva vencida',
              details: `O.S. aberta automaticamente pelo painel de inconsistências. ${issue.detail}`,
              status: 'PENDENTE',
              isPreventiveMaintenance: true,
              serviceType: 'INTERNAL',
              date: new Date().toISOString().split('T')[0],
              odometer: vehicle.odometer || 0,
              branchId: vehicle.branchId || selectedBranchId
          });
          storageService.logActivity(orgId, 'Correção Automática', `${vehicle.plate}: O.S. preventiva criada pelo painel de inconsistências`, 'VEHICLES');
          return `${vehicle.plate}: O.S. preventiva criada com sucesso.`;
      }

      if (['MARK_PARTIAL_FILLUP', 'DISCARD_FUEL_SEGMENT'].includes(issue.actionType)) {
          if (!issue.relatedFuelEntryId) throw new Error('Nenhum abastecimento relacionado foi encontrado para ajuste.');
          const entry = fuelEntries.find(item => item.id === issue.relatedFuelEntryId);
          if (!entry) throw new Error('Abastecimento relacionado nÃ£o encontrado.');

          const tag = issue.actionType === 'MARK_PARTIAL_FILLUP' ? '[parcial]' : '[trecho descartado]';
          const reason = justification ? ` Motivo: ${justification}` : '';
          const notes = `${entry.notes || ''}${entry.notes ? '\n' : ''}${tag} Ajustado pelo painel de inconsistencias em ${new Date().toLocaleString('pt-BR')}.${reason}`.trim();
          await storageService.updateFuelEntry(orgId, entry.id, { notes });
          storageService.logActivity(orgId, 'CorreÃ§Ã£o AutomÃ¡tica', `${vehicle.plate}: abastecimento ${entry.odometer} km marcado como ${tag}`, 'VEHICLES');
          return `${vehicle.plate}: abastecimento marcado como ${tag}.`;
      }

      if (issue.actionType === 'IGNORE_ALERT' || issue.actionType === 'REQUEST_MANUAL_REVIEW') {
          const suffix = issue.actionType === 'IGNORE_ALERT' ? 'ignorado' : 'encaminhado para conferencia manual';
          if (issue.relatedFuelEntryId) {
              const entry = fuelEntries.find(item => item.id === issue.relatedFuelEntryId);
              if (entry) {
                  const tag = issue.actionType === 'IGNORE_ALERT' ? '[ignorado]' : '[conferencia manual]';
                  const notes = `${entry.notes || ''}${entry.notes ? '\n' : ''}${tag} Alerta ${suffix} pelo painel de inconsistencias em ${new Date().toLocaleString('pt-BR')}. Motivo: ${justification || 'sem justificativa'}`.trim();
                  await storageService.updateFuelEntry(orgId, entry.id, { notes });
              }
          }
          storageService.logActivity(orgId, 'Tratamento de InconsistÃªncia', `${vehicle.plate}: ${issue.title} ${suffix}. Justificativa: ${justification || 'sem justificativa'}`, 'VEHICLES');
          return `${vehicle.plate}: alerta ${suffix}.`;
      }

      setCurrentTab('fleet');
      return `${vehicle.plate}: aberto para revisão manual.`;
  };

  const handleConvertPublicServiceRequest = async (request: PublicServiceRequest): Promise<void> => {
      const vehicle = vehicles.find(v => v.id === request.vehicleId || v.plate === request.vehiclePlate);
      const detailLines = [
          'Solicitação enviada pelo QR do RG do veículo.',
          `Motorista: ${request.driverName}`,
          request.driverPhone ? `Telefone: ${request.driverPhone}` : '',
          request.problemType ? `Tipo informado: ${request.problemType}` : '',
          request.informedOdometer ? `KM informado pelo motorista: ${request.informedOdometer.toLocaleString('pt-BR')}` : '',
          request.driverLocation ? `Local informado: ${request.driverLocation}` : '',
          `Veículo parado: ${request.vehicleStopped ? 'SIM' : 'NÃO'}`,
          `Urgência: ${request.urgency || 'NORMAL'}`,
          request.checklist?.status ? `Checklist pre-viagem: ${request.checklist.status}` : '',
          request.checklist?.criticalItems?.length ? `Itens com alerta: ${request.checklist.criticalItems.join(', ')}` : '',
          request.checklist?.observations ? `Observacoes do checklist: ${request.checklist.observations}` : '',
          `Recebida em: ${new Date(request.createdAt).toLocaleString('pt-BR')}`,
          '',
          request.details
      ].filter(Boolean).join('\n');
      await handleAddServiceOrder({
          vehicleId: vehicle?.id || request.vehicleId,
          vehiclePlate: vehicle?.plate || request.vehiclePlate,
          title: request.title,
          details: detailLines,
          status: 'PENDENTE',
          serviceType: 'INTERNAL',
          date: request.preferredDate || new Date().toISOString().split('T')[0],
          odometer: request.informedOdometer || vehicle?.odometer || 0,
          branchId: vehicle?.branchId || selectedBranchId,
          driverName: request.driverName,
          contactName: request.driverName,
          ...(request.attachments && request.attachments.length > 0 ? { attachments: request.attachments as any } : {})
      });

      const createdOrderNumber = serviceOrders.reduce((max, order) => Math.max(max, order.orderNumber), 0) + 1;
      await storageService.updatePublicServiceRequest(request.id, {
          status: 'CONVERTIDA',
          linkedServiceOrderNumber: String(createdOrderNumber)
      });
      addToast('success', 'O.S. criada', `${request.vehiclePlate}: solicitação do QR convertida em O.S.`);
  };

  const handleArchivePublicServiceRequest = async (request: PublicServiceRequest, reason?: string): Promise<void> => {
      await storageService.updatePublicServiceRequest(request.id, {
          status: 'ARQUIVADA',
          archiveReason: reason || 'Arquivada pela oficina',
          archivedAt: new Date().toISOString(),
          archivedBy: user?.displayName || user?.email || 'Sistema'
      });
      addToast('info', 'Solicitação arquivada', `${request.vehiclePlate}: solicitação do QR arquivada.`);
  };

  const handleMarkPublicServiceRequestInAnalysis = async (request: PublicServiceRequest): Promise<void> => {
      await storageService.updatePublicServiceRequest(request.id, {
          status: 'EM_ANALISE',
          reviewedAt: new Date().toISOString(),
          reviewedBy: user?.displayName || user?.email || 'Sistema'
      });
      addToast('info', 'Em análise', `${request.vehiclePlate}: solicitação marcada para conferência.`);
  };

  const getPageTitle = (tab: TabView) => {
    switch (tab) {
      case 'dashboard': return 'Painel de Controle';
      case 'command-center': return 'Painel de Comando Diário';
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
      case 'fleet-issues': return 'Inconsistências da Frota';
      case 'maintenance': return 'Gestão de Preventivas';
      case 'maintenance-tv': return 'Painel TV de Manutencao';
      case 'fuel': return 'Controle de Abastecimento';
      case 'brand-models': return 'Marcas e Modelos';
      case 'location': return 'Rastreamento';
      case 'service-orders': return 'Oficina';
      case 'qr-service-requests': return 'Solicitações do QR';
      case 'waste-disposal': return 'Descarte de Resíduos';
      case 'service': return 'Almoxarifado';
      case 'settings': return 'Configurações';
      case 'drivers': return 'Motoristas';
      case 'reports': return 'Relatórios';
      case 'reports-tires': return 'Relatórios de Pneus';
      case 'reports-vehicles': return 'Relatórios de Veículos';
      case 'reports-maintenance': return 'Relatórios de Manutenção';
      case 'reports-fuel': return 'Relatórios de Abastecimento';
      case 'branches': return 'Gestão de Filiais';
      case 'tracker': return 'Configurações do Rastreador';
      case 'classification-sector': return 'Classificação e Setor';
      case 'occurrences': return 'Módulo de Ocorrências';
      case 'rh': return 'Recursos Humanos';
      default: return 'GM Control';
    }
  };

  const handleUpdateUserPhoto = async (base64: string) => {
    if (!user?.uid) return;
    try {
      await storageService.updateTeamMember(orgId, user.uid, { photoUrl: base64 });
      setUser(prev => ({ ...prev, photoUrl: base64 }));
      addToast('success', 'Perfil Atualizado', 'Sua foto de perfil foi alterada com sucesso.');
    } catch (error) {
      console.error(error);
      addToast('error', 'Erro', 'Não foi possível atualizar sua foto.');
    }
  };

  if (loadingAuth) {
      return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="h-10 w-10 text-blue-500 animate-spin" /></div>;
  }

  if (isVehicleRgRoute) {
    return (
      <VehicleRGPublic
        vehicle={publicRgData.vehicle}
        fuelEntries={publicRgData.fuelEntries}
        serviceOrders={publicRgData.serviceOrders}
        isLoading={publicRgData.isLoading}
        error={publicRgData.error}
        onCreateServiceRequest={async request => {
          if (!vehicleRgId) throw new Error('Veículo não encontrado.');
          const publicRequest = await storageService.addPublicServiceRequest({
            ...request,
            vehicleId: publicRgData.vehicle?.id || vehicleRgId,
            vehiclePlate: publicRgData.vehicle?.plate || vehicleRgPlate
          });
          setPublicRgData(prev => ({ ...prev, serviceOrders: [publicRequest as any, ...prev.serviceOrders] }));
        }}
        onBack={user ? () => {
          window.history.pushState({}, '', window.location.origin);
          setCurrentTab('fleet');
        } : undefined}
      />
    );
  }

  if (!user) {
      return (
        <LoginScreen 
          branches={branches} 
          selectedBranchId={selectedBranchId} 
          setSelectedBranchId={setSelectedBranchId} 
        />
      );
  }

  const handleAddFuelEntry = async (entry: FuelEntry) => {
    try {
      await storageService.addFuelEntry(orgId, entry);
      addToast('success', 'Abastecimento Registrado', `Lançamento para o veículo ${entry.vehiclePlate} realizado com sucesso.`);
      
      // Update vehicle odometer and litrometro if entry values are higher
      const vehicle = vehicles.find(v => v.id === entry.vehicleId);
      if (vehicle) {
        let needsUpdate = false;
        const updatedVehicle = { ...vehicle };

        if (entry.odometer > (vehicle.odometer || 0)) {
          updatedVehicle.odometer = entry.odometer;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await storageService.updateVehicle(orgId, updatedVehicle);
        }
      }
    } catch (error) {
      addToast('error', 'Erro ao registrar', 'Não foi possível salvar o abastecimento.');
    }
  };

  const handleDeleteFuelEntry = async (id: string) => {
    try {
      await storageService.deleteFuelEntry(orgId, id);
      addToast('success', 'Registro Removido', 'O abastecimento foi excluído com sucesso.');
    } catch (error) {
      addToast('error', 'Erro ao remover', 'Não foi possível excluir o registro.');
    }
  };

  const handleAddFuelStation = async (station: FuelStation) => {
    try {
      await storageService.addFuelStation(orgId, station);
      addToast('success', 'Posto Cadastrado', `O posto ${station.name} foi cadastrado com sucesso.`);
    } catch (error) {
      addToast('error', 'Erro ao cadastrar', 'Não foi possível cadastrar o posto.');
    }
  };

  const handleUpdateFuelStation = async (id: string, data: Partial<FuelStation>) => {
    try {
      await storageService.updateFuelStation(orgId, id, data);
      addToast('success', 'Posto Atualizado', 'Os dados do posto foram atualizados com sucesso.');
    } catch (error) {
      addToast('error', 'Erro ao atualizar', 'Não foi possível atualizar os dados do posto.');
    }
  };

  const handleDeleteFuelStation = async (id: string) => {
    try {
      await storageService.deleteFuelStation(orgId, id);
      addToast('success', 'Posto Removido', 'O posto foi excluído com sucesso.');
    } catch (error) {
      addToast('error', 'Erro ao remover', 'Não foi possível excluir o posto.');
    }
  };

  if (isVehicleRgRoute) {
    return (
      <VehicleRGPublic
        vehicle={vehicles.find(vehicle => vehicle.id === vehicleRgId || vehicle.plate === vehicleRgId)}
        fuelEntries={fuelEntries}
        serviceOrders={serviceOrders}
        onCreateServiceRequest={async request => {
          const vehicle = vehicles.find(item => item.id === vehicleRgId || item.plate === vehicleRgId);
          if (!vehicle) throw new Error('Veículo não encontrado.');
          const detailLines = [
            'Solicitação enviada pelo RG do veículo.',
            `Motorista: ${request.driverName}`,
            request.driverPhone ? `Telefone: ${request.driverPhone}` : '',
            request.problemType ? `Tipo informado: ${request.problemType}` : '',
            request.informedOdometer ? `KM informado pelo motorista: ${request.informedOdometer.toLocaleString('pt-BR')}` : '',
            request.driverLocation ? `Local informado: ${request.driverLocation}` : '',
            `Veículo parado: ${request.vehicleStopped ? 'SIM' : 'NÃO'}`,
            `Urgência: ${request.urgency}`,
            '',
            request.details
          ].filter(Boolean).join('\n');
          await handleAddServiceOrder({
            vehicleId: vehicle.id,
            vehiclePlate: vehicle.plate,
            title: request.title,
            details: detailLines,
            status: 'PENDENTE',
            serviceType: 'INTERNAL',
            date: request.preferredDate,
            odometer: request.informedOdometer || vehicle.odometer || 0,
            branchId: vehicle.branchId || selectedBranchId,
            driverName: request.driverName,
            contactName: request.driverName,
            ...(request.attachments && request.attachments.length > 0 ? { attachments: request.attachments as any } : {})
          });
          storageService.logActivity(orgId, 'Agendamento pelo RG', `${vehicle.plate}: ${request.title} solicitado por ${request.driverName}`, 'VEHICLES');
        }}
        onBack={() => {
          window.history.pushState({}, '', window.location.origin);
          setCurrentTab('fleet');
        }}
      />
    );
  }

  if (userRole === 'INSPECTOR') {
    const getModuleLabel = () => {
      switch(activeModule) {
        case 'TIRES': return 'Pneus';
        case 'MECHANICAL': return 'Manutenção';
        case 'VEHICLES': return 'Frota';
        case 'FUEL': return 'Combustível';
        default: return 'Sistema';
      }
    };

    const getModuleIcon = () => {
      switch(activeModule) {
        case 'TIRES': return <ArrowRightLeft className="h-5 w-5 text-white" />;
        case 'MECHANICAL': return <Wrench className="h-5 w-5 text-white" />;
        case 'VEHICLES': return <Truck className="h-5 w-5 text-white" />;
        case 'FUEL': return <Fuel className="h-5 w-5 text-white" />;
        default: return <LifeBuoy className="h-5 w-5 text-white" />;
      }
    };

    const getModuleColor = () => {
      switch(activeModule) {
        case 'TIRES': return 'bg-blue-600';
        case 'MECHANICAL': return 'bg-indigo-600';
        case 'VEHICLES': return 'bg-emerald-600';
        case 'FUEL': return 'bg-orange-600';
        default: return 'bg-slate-600';
      }
    };

    return (
      <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
        <header className="sticky top-0 z-30 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${getModuleColor()} rounded-xl flex items-center justify-center shadow-lg`}>
              {getModuleIcon()}
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">GM Control</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Inspetor - {getModuleLabel()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {allowedModules.length > 1 && (
              <button 
                onClick={() => {
                  const currentIndex = allowedModules.indexOf(activeModule);
                  const nextIndex = (currentIndex + 1) % allowedModules.length;
                  setActiveModule(allowedModules[nextIndex]);
                }}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Trocar Módulo"
              >
                <SwitchCamera className="h-5 w-5" />
              </button>
            )}
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
            </button>
            <button 
              onClick={() => storageService.logout()} 
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-bold rounded-xl transition-all text-sm flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>
        
        <main className="p-4 max-w-5xl mx-auto pb-20">
          {activeModule === 'TIRES' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Movimentação de Pneus</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Selecione um veículo para iniciar a inspeção ou troca.</p>
              </div>
              <TireMovement 
                tires={tires} 
                vehicles={vehicles} 
                onUpdateTire={(tire) => storageService.updateTire(orgId, tire)} 
                onAddTire={(tire) => storageService.addTire(orgId, tire)} 
                userLevel={userRole} 
                settings={settings} 
              />
            </>
          )}

          {activeModule === 'VEHICLES' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Gestão de Frota</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Visualize e gerencie os veículos da frota.</p>
              </div>
              <VehicleManager 
                orgId={orgId}
                vehicles={vehicles} 
                vehicleBrandModels={vehicleBrandModels} 
                tires={tires} 
                serviceOrders={serviceOrders}
                fuelEntries={fuelEntries}
                maintenancePlans={maintenancePlans}
                maintenanceSchedules={maintenanceSchedules}
                onAddVehicle={auditedAddVehicle} 
                onDeleteVehicle={auditedDeleteVehicle} 
                onUpdateVehicle={auditedUpdateVehicle}
                onUpdateServiceOrder={(id, updates) => storageService.updateServiceOrder(orgId, id, updates)}
                onDeleteAlert={(id) => storageService.deleteArrivalAlert(orgId, id)}
                onSimulateArrival={handleSimulateArrival}
                userLevel={userRole}
                settings={settings}
                trackerSettings={trackerSettings}
                onSyncSascar={syncSascar}
                branches={branches}
                defaultBranchId={selectedBranchId}
                vehicleTypes={vehicleTypes}
                fuelTypes={fuelTypes}
                onLoadMore={() => handleLoadMore('vehicles')}
                hasMore={hasMore.vehicles}
                arrivalAlerts={arrivalAlerts}
              />
            </>
          )}

          {activeModule === 'MECHANICAL' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Manutenção</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie ordens de serviço e manutenções.</p>
              </div>
              <ServiceOrderHub 
                orgId={orgId}
                serviceOrders={serviceOrders}
                branches={branches}
                defaultBranchId={selectedBranchId}
                maintenancePlans={maintenancePlans}
                maintenanceSchedules={maintenanceSchedules}
                vehicles={vehicles}
                vehicleBrandModels={vehicleBrandModels}
                tires={tires}
                stockItems={stockItems}
                onUpdateOrder={handleUpdateServiceOrder}
                onUpdateOrderBatch={(updates) => storageService.updateServiceOrderBatch(orgId, updates)}
                onAddOrder={handleAddServiceOrder}
                settings={settings || {} as any}
                arrivalAlerts={arrivalAlerts}
                initialVehicleId={preselectedVehicleId || undefined}
                initialModalOpen={shouldOpenOSModal}
                onCloseInitialModal={() => setShouldOpenOSModal(false)}
                collaborators={collaborators}
                partners={partners}
                drivers={drivers}
                onAddCollaborator={(c) => storageService.addCollaborator(orgId, c)}
                userLevel={userRole}
                classifications={classifications}
                sectors={sectors}
                currentUser={user ? { name: user.displayName, email: user.email } : undefined}
                onLoadMore={() => handleLoadMore('serviceOrders')}
                hasMore={hasMore.serviceOrders}
              />
            </>
          )}

          {activeModule === 'FUEL' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Combustível</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Registre abastecimentos e gerencie postos.</p>
              </div>
              <FuelDashboard 
                vehicles={vehicles}
                fuelEntries={fuelEntries}
                fuelStations={fuelStations}
                drivers={drivers}
                branches={branches}
                defaultBranchId={selectedBranchId}
                onAddEntry={handleAddFuelEntry}
                onDeleteEntry={handleDeleteFuelEntry}
                onAddStation={handleAddFuelStation}
                onUpdateStation={handleUpdateFuelStation}
                onDeleteStation={handleDeleteFuelStation}
                fuelTypes={fuelTypes}
                onLoadMore={() => handleLoadMore('fuelEntries')}
                hasMore={hasMore.fuelEntries}
              />
            </>
          )}
        </main>

        <ToastNotifications toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300 overflow-x-hidden ${darkMode ? 'dark' : ''}`}>
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
          userName={user.displayName || user.name || user.email || 'Usuário'}
          userPhotoUrl={user.photoUrl}
          onUpdatePhoto={handleUpdateUserPhoto}
          settings={settings}
          activeModule={activeModule}
          allowedModules={allowedModules}
          onChangeModule={() => {
            setActiveModule(prev => {
              const currentIndex = allowedModules.indexOf(prev);
              const nextIndex = (currentIndex + 1) % allowedModules.length;
              const next = allowedModules[nextIndex];
              
              if (next === 'FUEL') setCurrentTab('fuel');
              if (next === 'TIRES') setCurrentTab('dashboard');
              if (next === 'VEHICLES') setCurrentTab('fleet');
              if (next === 'MECHANICAL') setCurrentTab('maintenance');
              return next;
            });
          }}
          onSelectModule={(mod) => {
            setActiveModule(mod);
            if (mod === 'FUEL') setCurrentTab('fuel');
            if (mod === 'TIRES') setCurrentTab('dashboard');
            if (mod === 'VEHICLES') setCurrentTab('fleet');
            if (mod === 'MECHANICAL') setCurrentTab('maintenance');
          }}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          qrPendingCount={publicServiceRequests.filter(request => request.status === 'PENDENTE' || request.status === 'EM_ANALISE').length}
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
                      {branches.length > 0 && (
                          <div className={`hidden md:flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-sm transition-all ${userBranchId ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-slate-900'}`}>
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <select
                                  value={selectedBranchId || ''}
                                  onChange={(e) => setSelectedBranchId(e.target.value || undefined)}
                                  disabled={!!userBranchId && userRole !== 'CREATOR'}
                                  className="bg-transparent border-none text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none disabled:cursor-not-allowed"
                              >
                                  <option value="">Todas as Filiais</option>
                                  {branches.map(b => (
                                      <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                              </select>
                          </div>
                      )}

                      <span className="hidden lg:flex bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 items-center gap-2 shadow-sm backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-900 cursor-default">
                          <Calendar className="h-4 w-4 text-blue-600" /> 
                          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>

                      <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 md:p-2.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 bg-white/50 dark:bg-slate-900/50 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600">
                          <Bell className="h-5 w-5" />
                          {(arrivalAlerts.filter(a => a.status === 'PENDING' || a.status === 'ARRIVED').length + 
                            maintenanceSchedules.filter(s => s.status === 'OVERDUE').length +
                            tires.filter(t => t.currentTreadDepth <= (settings?.minTreadDepth || 3)).length +
                            notifications.filter(n => !n.read).length) > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 animate-pulse">
                                  {arrivalAlerts.filter(a => a.status === 'PENDING' || a.status === 'ARRIVED').length + 
                                   maintenanceSchedules.filter(s => s.status === 'OVERDUE').length +
                                   tires.filter(t => t.currentTreadDepth <= (settings?.minTreadDepth || 3)).length +
                                   notifications.filter(n => !n.read).length}
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
                branches={branches}
                defaultBranchId={selectedBranchId}
                serviceOrders={serviceOrders} 
                onNavigate={setCurrentTab} 
                settings={settings} 
                vehicleTypes={vehicleTypes}
                onOpenServiceOrder={(vehicleId) => {
                  setPreselectedVehicleId(vehicleId);
                  setShouldOpenOSModal(true);
                  setCurrentTab('service-orders');
                }}
              />
            )}
            {currentTab === 'command-center' && (
              <CommandCenter
                vehicles={vehicles}
                tires={tires}
                serviceOrders={serviceOrders}
                fuelEntries={fuelEntries}
                occurrences={occurrences}
                publicServiceRequests={publicServiceRequests}
                onNavigate={setCurrentTab}
              />
            )}
            {currentTab === 'partners' && allowedModules.includes('MECHANICAL') && <PartnerManager orgId={orgId} />}
            {currentTab === 'inventory' && allowedModules.includes('TIRES') && (
              <InventoryList 
                tires={tires} 
                vehicles={vehicles} 
                branches={branches} 
                defaultBranchId={selectedBranchId} 
                serviceOrders={serviceOrders} 
                maintenancePlans={maintenancePlans} 
                maintenanceSchedules={maintenanceSchedules} 
                onDelete={(id) => storageService.deleteTire(orgId, id)} 
                onUpdateTire={(tire) => storageService.updateTire(orgId, tire)} 
                onUpdateServiceOrder={(id, updates) => storageService.updateServiceOrder(orgId, id, updates)} 
                onRegister={() => {
                  setEditingTire(null);
                  setCurrentTab('register');
                }} 
                onEditTire={(tire) => {
                  setEditingTire(tire);
                  setCurrentTab('register');
                }}
                onNotification={addToast} 
                userLevel={userRole} 
                vehicleTypes={vehicleTypes} 
                onLoadMore={() => handleLoadMore('tires')}
                hasMore={hasMore.tires}
              />
            )}
            {currentTab === 'scrap' && allowedModules.includes('JMDSSMAQ') && (
              <ScrapHub 
                orgId={orgId} 
                partners={partners} 
                collaborators={collaborators} 
              />
            )}
            {currentTab === 'register' && allowedModules.includes('TIRES') && (
              <TireForm 
                onAddTire={(tire) => storageService.addTire(orgId, tire)} 
                onUpdateTire={async (tire) => {
                  await storageService.updateTire(orgId, tire);
                  setEditingTire(null);
                }}
                editingTire={editingTire || undefined}
                onCancel={() => {
                  setEditingTire(null);
                  setCurrentTab('inventory');
                }} 
                onFinish={() => {
                  setEditingTire(null);
                  setCurrentTab('inventory');
                }} 
                existingTires={tires} 
                settings={settings} 
                vehicles={vehicles} 
                branches={branches} 
                defaultBranchId={selectedBranchId} 
              />
            )}
            {currentTab === 'movement' && allowedModules.includes('TIRES') && <TireMovement tires={tires} vehicles={vehicles} branches={branches} defaultBranchId={selectedBranchId} onUpdateTire={(tire) => storageService.updateTire(orgId, tire)} onAddTire={(tire) => storageService.addTire(orgId, tire)} userLevel={userRole} settings={settings} onNotification={addToast} vehicleTypes={vehicleTypes} />}
            {currentTab === 'brand-models' && allowedModules.includes('VEHICLES') && <BrandModelManager orgId={orgId} vehicleBrandModels={vehicleBrandModels} maintenancePlans={maintenancePlans} vehicles={vehicles} serviceOrders={serviceOrders} tires={tires} defaultBranchId={selectedBranchId} vehicleTypes={vehicleTypes} fuelTypes={fuelTypes} />}
            {currentTab === 'vehicle-types' && allowedModules.includes('VEHICLES') && <VehicleTypeManager orgId={orgId} />}
            {currentTab === 'fuel-types' && allowedModules.includes('FUEL') && <FuelTypeManager orgId={orgId} vehicleBrandModels={vehicleBrandModels} />}
            {currentTab === 'fleet' && allowedModules.includes('VEHICLES') && (
              <VehicleManager 
                orgId={orgId}
                vehicles={vehicles} 
                vehicleBrandModels={vehicleBrandModels} 
                tires={tires} 
                serviceOrders={serviceOrders}
                fuelEntries={fuelEntries}
                maintenancePlans={maintenancePlans}
                maintenanceSchedules={maintenanceSchedules}
                onAddVehicle={auditedAddVehicle} 
                onDeleteVehicle={auditedDeleteVehicle} 
                onUpdateVehicle={auditedUpdateVehicle}
                onUpdateServiceOrder={(id, updates) => storageService.updateServiceOrder(orgId, id, updates)}
                onDeleteAlert={(id) => storageService.deleteArrivalAlert(orgId, id)}
                onSimulateArrival={handleSimulateArrival}
                userLevel={userRole}
                settings={settings}
                trackerSettings={trackerSettings}
                onSyncSascar={syncSascar}
                branches={branches}
                defaultBranchId={selectedBranchId}
                vehicleTypes={vehicleTypes}
                fuelTypes={fuelTypes}
                onLoadMore={() => handleLoadMore('vehicles')}
                hasMore={hasMore.vehicles}
                arrivalAlerts={arrivalAlerts}
              />
            )}
            {currentTab === 'fleet-issues' && allowedModules.includes('VEHICLES') && (
              <FleetIssuesPanel
                vehicles={vehicles}
                serviceOrders={serviceOrders}
                fuelEntries={fuelEntries}
                settings={settings}
                onOpenVehicle={() => setCurrentTab('fleet')}
                onResolveIssue={handleResolveFleetIssue}
              />
            )}
            {currentTab === 'inspection' && allowedModules.includes('TIRES') && <InspectionHub tires={tires} vehicles={vehicles} branches={branches} defaultBranchId={selectedBranchId} onUpdateTire={(tire) => storageService.updateTire(orgId, tire)} onCreateServiceOrder={handleAddServiceOrder} settings={settings} vehicleTypes={vehicleTypes} />}
            {currentTab === 'retreading' && allowedModules.includes('TIRES') && (
              <RetreadingHub 
                orgId={orgId} 
                tires={tires} 
                retreadOrders={retreadOrders} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                onUpdateTire={(tire) => storageService.updateTire(orgId, tire)} 
                onNotification={addToast} 
                settings={settings} 
              />
            )}
            {currentTab === 'retreader-ranking' && allowedModules.includes('TIRES') && (
              <RetreaderRanking 
                tires={tires} 
                retreadOrders={retreadOrders} 
                branches={branches}
                defaultBranchId={selectedBranchId}
              />
            )}
            {currentTab === 'strategic-analysis' && allowedModules.includes('TIRES') && <StrategicAnalysis tires={tires} vehicles={vehicles} branches={branches} defaultBranchId={selectedBranchId} settings={settings} vehicleTypes={vehicleTypes} />}
            {currentTab === 'demand-forecast' && allowedModules.includes('TIRES') && (
              <DemandForecast 
                tires={tires} 
                vehicles={vehicles} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                settings={settings} 
              />
            )}
            {currentTab === 'financial' && allowedModules.includes('TIRES') && (
              <FinancialHub 
                tires={tires} 
                vehicles={vehicles} 
                retreadOrders={retreadOrders} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                financialRecords={financialRecords}
                orgId={orgId}
              />
            )}
            {currentTab === 'esg-panel' && allowedModules.includes('JMDSSMAQ') && (
              <EsgPanel 
                tires={tires} 
                retreadOrders={retreadOrders} 
                wasteDisposals={wasteDisposals}
                branches={branches}
                defaultBranchId={selectedBranchId}
              />
            )}
            {currentTab === 'ambulatory' && allowedModules.includes('JMDSSMAQ') && (
              <Ambulatory orgId={orgId} collaborators={collaborators} />
            )}
            {currentTab === 'rh' && allowedModules.includes('HR') && (
              <RHModule orgId={orgId} />
            )}
            {currentTab === 'maintenance' && allowedModules.includes('MECHANICAL') && (
              <MaintenanceDashboard 
                vehicles={vehicles} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                maintenanceSchedules={maintenanceSchedules} 
                maintenancePlans={maintenancePlans} 
                vehicleBrandModels={vehicleBrandModels}
                serviceOrders={serviceOrders}
                settings={settings}
                onOpenServiceOrder={(vehicleId) => {
                  setPreselectedVehicleId(vehicleId);
                  setShouldOpenOSModal(true);
                  setCurrentTab('service-orders');
                }}
              />
            )}
            {currentTab === 'maintenance-tv' && allowedModules.includes('MECHANICAL') && (
              <MaintenanceTVPanel
                vehicles={vehicles}
                serviceOrders={serviceOrders}
              />
            )}
            {currentTab === 'fuel' && allowedModules.includes('FUEL') && (
              <FuelDashboard 
                vehicles={vehicles}
                fuelEntries={fuelEntries}
                fuelStations={fuelStations}
                drivers={drivers}
                branches={branches}
                defaultBranchId={selectedBranchId}
                onAddEntry={handleAddFuelEntry}
                onDeleteEntry={handleDeleteFuelEntry}
                onAddStation={handleAddFuelStation}
                onUpdateStation={handleUpdateFuelStation}
                onDeleteStation={handleDeleteFuelStation}
                fuelTypes={fuelTypes}
                fuelCategory="LIQUID"
              />
            )}
            {currentTab === 'fuel-gas' && allowedModules.includes('FUEL') && (
              <FuelDashboard 
                vehicles={vehicles}
                fuelEntries={fuelEntries}
                fuelStations={fuelStations}
                drivers={drivers}
                branches={branches}
                defaultBranchId={selectedBranchId}
                onAddEntry={handleAddFuelEntry}
                onDeleteEntry={handleDeleteFuelEntry}
                onAddStation={handleAddFuelStation}
                onUpdateStation={handleUpdateFuelStation}
                onDeleteStation={handleDeleteFuelStation}
                fuelTypes={fuelTypes}
                fuelCategory="GAS"
              />
            )}
            {currentTab === 'location' && allowedModules.includes('VEHICLES') && (
              <LocationMap 
                vehicles={vehicles} 
                tires={tires} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                settings={settings} 
                onSync={syncSascar} 
                onUpdateSettings={(newSettings) => storageService.saveSettings(orgId, newSettings)}
              />
            )}
            {currentTab === 'service-orders' && allowedModules.includes('MECHANICAL') && (
              <ServiceOrderHub 
                orgId={orgId}
                serviceOrders={serviceOrders} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                maintenancePlans={maintenancePlans} 
                maintenanceSchedules={maintenanceSchedules} 
                vehicles={vehicles} 
                vehicleBrandModels={vehicleBrandModels} 
                tires={tires} 
                stockItems={stockItems} 
                onUpdateOrder={handleUpdateServiceOrder} 
                onUpdateOrderBatch={(updates) => storageService.updateServiceOrderBatch(orgId, updates)}
                onAddOrder={handleAddServiceOrder} 
                settings={settings} 
                arrivalAlerts={arrivalAlerts} 
                initialVehicleId={preselectedVehicleId || undefined}
                initialOccurrenceId={preselectedOccurrenceId || undefined}
                initialModalOpen={shouldOpenOSModal}
                onCloseInitialModal={() => {
                  setShouldOpenOSModal(false);
                  setPreselectedVehicleId(null);
                  setPreselectedOccurrenceId(null);
                }}
                collaborators={collaborators}
                partners={partners}
                onAddCollaborator={(c) => storageService.addCollaborator(orgId, c)}
                onUpdateCollaborator={(id, updates) => storageService.updateCollaborator(orgId, id, updates)}
                onDeleteCollaborator={(id) => storageService.deleteCollaborator(orgId, id)}
                userLevel={userRole}
                drivers={drivers}
                classifications={classifications}
                sectors={sectors}
                currentUser={user ? { name: user.displayName, email: user.email } : undefined}
                occurrences={occurrences}
              />
            )}
            {currentTab === 'qr-service-requests' && allowedModules.includes('MECHANICAL') && (
              <QRServiceRequests
                requests={publicServiceRequests}
                vehicles={vehicles}
                onCreateOrder={handleConvertPublicServiceRequest}
                onArchive={handleArchivePublicServiceRequest}
                onMarkInAnalysis={handleMarkPublicServiceRequestInAnalysis}
              />
            )}
            {currentTab === 'service' && allowedModules.includes('MECHANICAL') && <ServiceManager orgId={orgId} userLevel={userRole} items={stockItems} />}
            {currentTab === 'ppe-stock' && allowedModules.includes('JMDSSMAQ') && (
              <PpeStock orgId={orgId} collaborators={collaborators} />
            )}
            {currentTab === 'waste-disposal' && (allowedModules.includes('MECHANICAL') || allowedModules.includes('JMDSSMAQ')) && (
              <WasteManagement 
                orgId={orgId} 
                partners={partners} 
                collaborators={collaborators} 
                type="WASTE"
              />
            )}
            {currentTab === 'ppe-disposal' && allowedModules.includes('JMDSSMAQ') && (
              <WasteManagement 
                orgId={orgId} 
                partners={partners} 
                collaborators={collaborators} 
                type="PPE"
              />
            )}
            {currentTab === 'tire-disposal' && allowedModules.includes('TIRES') && (
              <WasteManagement 
                orgId={orgId} 
                partners={partners} 
                collaborators={collaborators} 
                type="TIRE"
              />
            )}
            {(currentTab === 'reports' || currentTab === 'reports-tires' || currentTab === 'reports-vehicles' || currentTab === 'reports-maintenance') && (allowedModules.includes('VEHICLES') || allowedModules.includes('TIRES')) && (
              <ReportsHub 
                tires={tires} 
                vehicles={vehicles} 
                serviceOrders={serviceOrders} 
                retreadOrders={retreadOrders} 
                occurrences={occurrences}
                fuelEntries={fuelEntries}
                branches={branches}
                defaultBranchId={selectedBranchId}
                vehicleBrandModels={vehicleBrandModels} 
                onFullScreenToggle={setIsReportsFullScreen} 
                activeModule={
                  currentTab === 'reports-tires' ? 'TIRES' :
                  currentTab === 'reports-vehicles' ? 'VEHICLES' :
                  currentTab === 'reports-maintenance' ? 'MECHANICAL' :
                  currentTab === 'reports-fuel' ? 'FUEL' :
                  activeModule
                }
                vehicleTypes={vehicleTypes}
              />
            )}
            {currentTab === 'reports-fuel' && allowedModules.includes('FUEL') && (
              <ConsumptionReport
                vehicles={vehicles}
                fuelEntries={fuelEntries}
                serviceOrders={serviceOrders}
              />
            )}
            {currentTab === 'settings' && (
              <Settings 
                orgId={orgId} 
                currentSettings={settings || {} as any} 
                onUpdateSettings={(s) => storageService.saveSettings(orgId, s)} 
                branches={branches}
                sectors={sectors}
                classifications={classifications}
                paymentMethods={paymentMethods}
              />
            )}
            {currentTab === 'drivers' && (
              <DriversHub 
                drivers={drivers} 
                vehicles={vehicles} 
                tires={tires} 
                branches={branches}
                defaultBranchId={selectedBranchId}
                onAddDriver={(d) => storageService.addDriver(orgId, d)} 
                onUpdateDriver={(driver) => storageService.updateDriver(orgId, driver.id, driver)} 
                onDeleteDriver={(id) => storageService.deleteDriver(orgId, id)} 
                onUpdateVehicle={auditedUpdateVehicle} 
              />
            )}
            {currentTab === 'occurrences' && (
              <Occurrences 
                orgId={orgId} 
                user={user} 
                occurrences={occurrences} 
                vehicles={vehicles} 
                reasons={occurrenceReasons} 
                sectors={sectors} 
                drivers={drivers} 
                collaborators={collaborators}
                paymentMethods={paymentMethods} 
                serviceOrders={serviceOrders}
                userLevel={userRole}
                onGenerateOS={handleGenerateOSFromOccurrence} 
                onNotification={addToast} 
                teamMembers={teamMembers}
              />
            )}
            {currentTab === 'tracker' && userRole === 'CREATOR' && <TrackerSettingsComponent orgId={orgId} />}
        </div>
      </main>

      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        tires={tires} 
        vehicles={vehicles} 
        branches={branches}
        defaultBranchId={selectedBranchId}
        settings={settings || {} as any} 
        arrivalAlerts={arrivalAlerts} 
        maintenanceSchedules={maintenanceSchedules}
        maintenancePlans={maintenancePlans}
        notifications={notifications}
        onDeleteAlert={(id) => storageService.deleteArrivalAlert(orgId, id)}
        onMarkRead={(id) => storageService.markNotificationAsRead(orgId, id)}
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
