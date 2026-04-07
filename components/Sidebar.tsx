
import { FC, ChangeEvent } from 'react';
import { LayoutDashboard, List, PlusCircle, LogOut, ChevronRight, Moon, Sun, ArrowRightLeft, Truck, ClipboardCheck, Recycle, Trash2, PieChart, TrendingUp, DollarSign, MapPin, Wrench, Package, Users, Settings, Layers, Disc, SwitchCamera, Car, LifeBuoy, UserSquare2, Layout, FileBarChart, Grid, Mic, Radio, Activity, Leaf, Trophy, Building2, AlertTriangle, Fuel } from 'lucide-react';
import { TabView, UserLevel, SystemSettings, ModuleType } from '../types';

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (e: ChangeEvent<HTMLInputElement>) => void;
  userLevel: UserLevel;
  userName: string;
  settings?: SystemSettings;
  activeModule: ModuleType;
  onChangeModule: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Sidebar: FC<SidebarProps> = ({ 
  currentTab, 
  onTabChange, 
  isMobileOpen, 
  setIsMobileOpen, 
  onLogout, 
  userLevel, 
  userName, 
  settings, 
  activeModule, 
  onChangeModule, 
  darkMode, 
  toggleDarkMode 
}) => {
  const allMenuItems = [
    // --- MÓDULO PNEUS ---
    { id: 'register', label: 'Cadastrar Pneu', icon: PlusCircle, modules: ['TIRES'] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, modules: ['TIRES'] },
    { id: 'inventory', label: 'Estoque de Pneus', icon: Disc, modules: ['TIRES'] },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, modules: ['TIRES'] }, 
    { id: 'inspection', label: 'Inspeção Pro', icon: ClipboardCheck, modules: ['TIRES'] },
    { id: 'movement', label: 'Movimentação', icon: ArrowRightLeft, modules: ['TIRES'] },
    { id: 'esg-panel', label: 'Painel ESG', icon: Leaf, modules: ['TIRES'] },
    { id: 'demand-forecast', label: 'Previsão de Compra', icon: TrendingUp, modules: ['TIRES'] },
    { id: 'retreader-ranking', label: 'Ranking de Fornecedores', icon: Trophy, modules: ['TIRES'] },
    { id: 'retreading', label: 'Recapagem', icon: Recycle, modules: ['TIRES'] },
    { id: 'scrap', label: 'Sucata/Descarte', icon: Trash2, modules: ['TIRES'] },
    
    // --- MÓDULO VEÍCULOS ---
    { id: 'fleet', label: 'Cadastro de Veículos', icon: Truck, modules: ['VEHICLES'] },
    { id: 'fuel', label: 'Abastecimento', icon: Fuel, modules: ['FUEL'] },
    { id: 'maintenance', label: 'Manutenção', icon: Activity, modules: ['MECHANICAL'] },
    { id: 'brand-models', label: 'Marcas e Modelos', icon: Car, modules: ['VEHICLES'] },
    { id: 'drivers', label: 'Motoristas', icon: UserSquare2, modules: ['VEHICLES'] },
    { id: 'service-orders', label: 'Oficina', icon: Wrench, modules: ['MECHANICAL'] },
    { id: 'tracker', label: 'Rastreador', icon: Radio, modules: ['VEHICLES'], creatorOnly: true },
    { id: 'location', label: 'Rastreamento', icon: MapPin, modules: ['VEHICLES'] },
    { id: 'occurrences', label: 'Ocorrências', icon: AlertTriangle, modules: ['VEHICLES'] },
    { id: 'reports', label: 'Relatórios', icon: FileBarChart, modules: ['VEHICLES', 'TIRES'] },
    { id: 'vehicle-types', label: 'Tipos de Veículos', icon: Layers, modules: ['VEHICLES'] },

    // --- MÓDULO OFICINA/PEÇAS ---
    { id: 'service', label: 'Almoxarifado (Peças)', icon: Package, modules: ['MECHANICAL'] },
    { id: 'partners', label: 'Parceiros/Fornecedores', icon: Users, modules: ['MECHANICAL', 'TIRES'] },

    // --- COMPARTILHADOS ---
    { id: 'settings', label: 'Configurações', icon: Settings, modules: ['TIRES', 'MECHANICAL', 'VEHICLES'] }
  ];

  const menuItems = allMenuItems.filter(item => {
    const isModuleMatch = item.modules.includes(activeModule);
    const isCreatorMatch = !(item as any).creatorOnly || userLevel === 'CREATOR';
    return isModuleMatch && isCreatorMatch;
  });

  // Alteração: Z-Index aumentado para sobrepor elementos do mapa (z-[9999])
  const baseClasses = `fixed z-[9999] w-72 bg-[#020617] text-slate-300 transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-800/50 h-screen inset-y-0 left-0`;
  const mobileClasses = isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0";

  const getModuleIcon = () => {
    if (activeModule === 'TIRES') return <Disc className="h-4 w-4 text-white" />;
    if (activeModule === 'VEHICLES') return <Truck className="h-4 w-4 text-white" />;
    if (activeModule === 'FUEL') return <Fuel className="h-4 w-4 text-white" />;
    return <Package className="h-4 w-4 text-white" />;
  };

  const getModuleLabel = () => {
    if (activeModule === 'TIRES') return 'Pneus';
    if (activeModule === 'VEHICLES') return 'Veículos';
    if (activeModule === 'FUEL') return 'Abastecimento';
    return 'Oficina';
  };

  const getModuleColor = () => {
    if (activeModule === 'TIRES') return 'bg-blue-600';
    if (activeModule === 'VEHICLES') return 'bg-emerald-600';
    if (activeModule === 'FUEL') return 'bg-amber-600';
    return 'bg-orange-600';
  };

  const getActiveColorClass = () => {
    if (activeModule === 'TIRES') return 'bg-blue-600 shadow-blue-600/20';
    if (activeModule === 'VEHICLES') return 'bg-emerald-600 shadow-emerald-600/20';
    if (activeModule === 'FUEL') return 'bg-amber-600 shadow-amber-600/20';
    return 'bg-orange-600 shadow-orange-600/20';
  };

  return (
    <>
      {/* Backdrop com z-index alto para ficar abaixo do menu mas acima do resto */}
      {isMobileOpen && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9998] lg:hidden" onClick={() => setIsMobileOpen(false)} />}
      <aside className={`${baseClasses} ${mobileClasses} overflow-hidden shadow-2xl`}>
        <div className="p-6 shrink-0">
          <div className="flex items-center gap-3 mb-8">
            {settings?.logoUrl ? (
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-white/10 shadow-lg shadow-blue-900/20">
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                </div>
            ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <LifeBuoy className="h-7 w-7 text-white" />
                </div>
            )}
            <div>
              <h1 className="font-black text-2xl text-white tracking-tight leading-none">GM Control</h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pro Edition</span>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between mb-2 backdrop-blur-sm">
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getModuleColor()} shadow-lg`}>
                   {getModuleIcon()}
                </div>
                <div>
                   <p className="text-[10px] text-slate-500 uppercase font-bold leading-none mb-1">Módulo Ativo</p>
                   <p className="text-sm font-bold text-white leading-none">{getModuleLabel()}</p>
                </div>
             </div>
             <button onClick={onChangeModule} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors" title="Trocar Módulo">
                <SwitchCamera className="h-5 w-5" />
             </button>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar py-2">
          {menuItems.map((item) => {
            const Icon = item.icon as any;
            const isActive = currentTab === item.id;
            const activeColorClass = getActiveColorClass();

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id as TabView);
                  setIsMobileOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium text-sm group ${
                  isActive ? `${activeColorClass} text-white shadow-lg translate-x-1` : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800/50 bg-[#020617]">
          <button onClick={toggleDarkMode} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-400 hover:text-white transition-colors mb-2 rounded-xl hover:bg-white/5">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          
          <div className="bg-slate-900/80 rounded-2xl p-4 flex items-center justify-between border border-slate-800">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{userLevel}</p>
              </div>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all" title="Sair">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
