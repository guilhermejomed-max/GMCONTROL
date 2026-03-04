
import React, { useState, useEffect } from 'react';
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
import { VehicleManager } from './components/VehicleManager';
import { LocationMap } from './components/LocationMap';
import { ServiceOrderHub } from './components/ServiceOrderHub';
import { ServiceManager } from './components/ServiceManager';
import { Settings } from './components/Settings';
import { DriversHub } from './components/DriversHub';
import { ReportsHub } from './components/ReportsHub';
import { NotificationsPanel } from './components/NotificationsPanel';
import { ToastNotifications } from './components/ToastNotifications';
import { GlobalHeader } from './components/GlobalHeader';
import { storageService } from './services/storageService';
import { TabView, Tire, Vehicle, ServiceOrder, RetreadOrder, SystemSettings, Driver, ToastMessage, UserLevel, ModuleType } from './types';
import { Lock, Mail, LayoutDashboard, Loader2, User, LifeBuoy, Bell, Menu, Calendar, UserCircle } from 'lucide-react';

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const [tires, setTires] = useState<Tire[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [retreadOrders, setRetreadOrders] = useState<RetreadOrder[]>([]);
  const [settings, setSettings] = useState<SystemSettings | undefined>(undefined);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  const [userRole, setUserRole] = useState<UserLevel>('SENIOR'); 
  const [activeModule, setActiveModule] = useState<ModuleType>('TIRES');
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubAuth = storageService.subscribeToAuth((u) => {
        setUser(u);
        setLoadingAuth(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return; // Only subscribe to data if logged in

    const unsubTires = storageService.subscribeToTires(setTires);
    const unsubVehicles = storageService.subscribeToVehicles(setVehicles);
    const unsubServiceOrders = storageService.subscribeToServiceOrders(setServiceOrders);
    const unsubRetreadOrders = storageService.subscribeToRetreadOrders(setRetreadOrders);
    const unsubSettings = storageService.subscribeToSettings(setSettings);
    const unsubDrivers = storageService.subscribeToDrivers(setDrivers);
    
    return () => {
        unsubTires();
        unsubVehicles();
        unsubServiceOrders();
        unsubRetreadOrders();
        unsubSettings();
        unsubDrivers();
    };
  }, [user]);

  // AUTOMATED UPDATES CHECK (Run once when data is available)
  useEffect(() => {
      if (vehicles.length > 0 && settings) {
          storageService.checkDailyTrailerIncrement(vehicles, settings);
      }
  }, [vehicles.length, settings]);

  const addToast = (type: any, title: string, message: string) => {
    const id = Date.now().toString();
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
  };

  const getPageTitle = (tab: TabView) => {
    switch (tab) {
      case 'dashboard': return 'Painel de Controle';
      case 'inventory': return 'Estoque de Pneus';
      case 'register': return 'Novo Pneu';
      case 'movement': return 'Movimentação';
      case 'inspection': return 'Hub de Inspeção';
      case 'retreading': return 'Gestão de Reformas';
      case 'scrap': return 'Sucata e Descarte';
      case 'strategic-analysis': return 'Análise Estratégica';
      case 'demand-forecast': return 'Previsão de Demanda';
      case 'financial': return 'Financeiro';
      case 'fleet': return 'Frota de Veículos';
      case 'location': return 'Rastreamento';
      case 'service-orders': return 'Ordens de Serviço';
      case 'service': return 'Almoxarifado';
      case 'settings': return 'Configurações';
      case 'drivers': return 'Motoristas';
      case 'reports': return 'Relatórios';
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
      
      <main className="lg:ml-72 min-h-screen p-3 md:p-4 lg:py-6 lg:px-8 transition-all duration-300">
        <div className="w-full space-y-4 md:space-y-6">
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
                        {/* You can add a red dot here if there are notifications */}
                    </button>
                </div>
            </header>

            {currentTab === 'dashboard' && <Dashboard tires={tires} vehicles={vehicles} serviceOrders={serviceOrders} onNavigate={setCurrentTab} settings={settings} />}
            {currentTab === 'inventory' && <InventoryList tires={tires} vehicles={vehicles} onDelete={storageService.deleteTire} onUpdateTire={storageService.updateTire} onRegister={() => setCurrentTab('register')} userLevel={userRole} />}
            {currentTab === 'scrap' && <InventoryList tires={tires} vehicles={vehicles} onDelete={storageService.deleteTire} onUpdateTire={storageService.updateTire} userLevel={userRole} viewMode="scrap" />}
            {currentTab === 'register' && <TireForm onAddTire={storageService.addTire} onCancel={() => setCurrentTab('inventory')} onFinish={() => setCurrentTab('inventory')} existingTires={tires} settings={settings} />}
            {currentTab === 'movement' && <TireMovement tires={tires} vehicles={vehicles} onUpdateTire={storageService.updateTire} userLevel={userRole} settings={settings} />}
            {currentTab === 'fleet' && <VehicleManager vehicles={vehicles} tires={tires} serviceOrders={serviceOrders} onAddVehicle={storageService.addVehicle} onDeleteVehicle={storageService.deleteVehicle} onUpdateVehicle={storageService.updateVehicle} userLevel={userRole} settings={settings} />}
            {currentTab === 'inspection' && <InspectionHub tires={tires} vehicles={vehicles} onUpdateTire={storageService.updateTire} onCreateServiceOrder={storageService.addServiceOrder} settings={settings} />}
            {currentTab === 'retreading' && <RetreadingHub tires={tires} retreadOrders={retreadOrders} onUpdateTire={storageService.updateTire} onNotification={addToast} settings={settings} />}
            {currentTab === 'strategic-analysis' && <StrategicAnalysis tires={tires} vehicles={vehicles} settings={settings} />}
            {currentTab === 'demand-forecast' && <DemandForecast tires={tires} vehicles={vehicles} settings={settings} />}
            {currentTab === 'financial' && <FinancialHub tires={tires} vehicles={vehicles} retreadOrders={retreadOrders} />}
            {currentTab === 'location' && <LocationMap vehicles={vehicles} tires={tires} settings={settings} />}
            {currentTab === 'service-orders' && <ServiceOrderHub serviceOrders={serviceOrders} vehicles={vehicles} tires={tires} onUpdateOrder={storageService.updateServiceOrder} onAddOrder={handleAddServiceOrder} settings={settings} />}
            {currentTab === 'service' && <ServiceManager userLevel={userRole} />}
            {currentTab === 'reports' && <ReportsHub tires={tires} vehicles={vehicles} serviceOrders={serviceOrders} retreadOrders={retreadOrders} />}
            {currentTab === 'settings' && <Settings currentSettings={settings || {} as any} onUpdateSettings={storageService.saveSettings} />}
            {currentTab === 'drivers' && <DriversHub drivers={drivers} vehicles={vehicles} tires={tires} onAddDriver={storageService.addDriver} onUpdateDriver={storageService.updateDriver} onDeleteDriver={storageService.deleteDriver} onUpdateVehicle={storageService.updateVehicle} />}
        </div>
      </main>

      <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} tires={tires} vehicles={vehicles} settings={settings || {} as any} />
      <ToastNotifications toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
