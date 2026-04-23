
import React, { FC, ChangeEvent, useState } from 'react';
import { LayoutDashboard, List, PlusCircle, LogOut, ChevronRight, Moon, Sun, ArrowRightLeft, Truck, ClipboardCheck, Recycle, Trash2, PieChart, TrendingUp, DollarSign, MapPin, Wrench, Package, Users, Settings, Layers, Disc, SwitchCamera, Car, LifeBuoy, UserSquare2, Layout, FileBarChart, Grid, Mic, Radio, Activity, Leaf, Trophy, Building2, AlertTriangle, Fuel, Droplets } from 'lucide-react';
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
  userPhotoUrl?: string;
  onUpdatePhoto?: (base64: string) => void;
  settings?: SystemSettings;
  activeModule: ModuleType;
  allowedModules: ModuleType[];
  onChangeModule: () => void;
  onSelectModule?: (module: ModuleType) => void;
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
  userPhotoUrl,
  onUpdatePhoto,
  settings, 
  activeModule, 
  allowedModules,
  onChangeModule, 
  onSelectModule,
  darkMode, 
  toggleDarkMode 
}) => {
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);

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
    { id: 'fuel-gas', label: 'Abastecimento a GÁS', icon: Fuel, modules: ['FUEL'] },
    { id: 'maintenance', label: 'Manutenção', icon: Activity, modules: ['MECHANICAL'] },
    { id: 'brand-models', label: 'Marcas e Modelos', icon: Car, modules: ['VEHICLES'] },
    { id: 'drivers', label: 'Motoristas', icon: UserSquare2, modules: ['VEHICLES'] },
    { id: 'service-orders', label: 'Oficina', icon: Wrench, modules: ['MECHANICAL'] },
    { id: 'tracker', label: 'Rastreador', icon: Radio, modules: ['VEHICLES'], creatorOnly: true },
    { id: 'location', label: 'Rastreamento', icon: MapPin, modules: ['VEHICLES'] },
    { id: 'occurrences', label: 'Ocorrências', icon: AlertTriangle, modules: ['VEHICLES'] },
    { id: 'reports-tires', label: 'Relatórios de Pneus', icon: FileBarChart, modules: ['TIRES'] },
    { id: 'reports-vehicles', label: 'Relatórios de Veículos', icon: FileBarChart, modules: ['VEHICLES'] },
    { id: 'reports-maintenance', label: 'Relatórios de Manutenção', icon: FileBarChart, modules: ['MECHANICAL'] },
    { id: 'reports-fuel', label: 'Relatórios de Abastecimento', icon: FileBarChart, modules: ['FUEL'] },
    { id: 'vehicle-types', label: 'Tipos de Veículos', icon: Layers, modules: ['VEHICLES'] },
    { id: 'fuel-types', label: 'Tipos de Combustíveis', icon: Droplets, modules: ['FUEL'] },

    // --- MÓDULO OFICINA/PEÇAS ---
    { id: 'service', label: 'Almoxarifado (Peças)', icon: Package, modules: ['MECHANICAL'] },
    { id: 'waste-disposal', label: 'Descarte de Resíduos', icon: Trash2, modules: ['MECHANICAL'] },
    { id: 'partners', label: 'Parceiros/Fornecedores', icon: Users, modules: ['MECHANICAL', 'TIRES'] },

    // --- COMPARTILHADOS ---
    { id: 'settings', label: 'Configurações', icon: Settings, modules: ['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL'] }
  ];

  const menuItems = allMenuItems.filter(item => {
    const isModuleMatch = item.modules.includes(activeModule);
    const isCreatorMatch = !(item as any).creatorOnly || userLevel === 'CREATOR';
    return isModuleMatch && isCreatorMatch;
  });

  // Alteração: Z-Index aumentado para sobrepor elementos do mapa (z-[9999])
  const baseClasses = `fixed z-[9999] w-72 bg-[#020617] text-slate-300 transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-800/50 h-screen inset-y-0 left-0`;
  const mobileClasses = isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0";

  const getModuleIconFor = (mod: ModuleType) => {
    if (mod === 'TIRES') return <Disc className="h-4 w-4 text-white" />;
    if (mod === 'VEHICLES') return <Truck className="h-4 w-4 text-white" />;
    if (mod === 'FUEL') return <Fuel className="h-4 w-4 text-white" />;
    return <Wrench className="h-4 w-4 text-white" />;
  };

  const getModuleLabelFor = (mod: ModuleType) => {
    if (mod === 'TIRES') return 'Pneus';
    if (mod === 'VEHICLES') return 'Veículo';
    if (mod === 'FUEL') return 'Abastecimento';
    return 'Oficina';
  };

  const getModuleColorFor = (mod: ModuleType) => {
    if (mod === 'TIRES') return 'bg-blue-600';
    if (mod === 'VEHICLES') return 'bg-emerald-600';
    if (mod === 'FUEL') return 'bg-amber-600';
    return 'bg-orange-600';
  };

  const getModuleIcon = () => getModuleIconFor(activeModule);
  const getModuleLabel = () => getModuleLabelFor(activeModule);
  const getModuleColor = () => getModuleColorFor(activeModule);

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

          <div className="relative">
            <button 
              onClick={() => allowedModules.length > 1 && setIsModuleDropdownOpen(!isModuleDropdownOpen)}
              className={`w-full bg-slate-900/50 p-4 rounded-2xl border ${isModuleDropdownOpen ? 'border-blue-500/50' : 'border-slate-800'} flex items-center justify-between mb-2 backdrop-blur-sm transition-all ${allowedModules.length > 1 ? 'hover:bg-slate-800/50 cursor-pointer' : 'cursor-default'}`}
            >
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getModuleColor()} shadow-lg`}>
                     {getModuleIcon()}
                  </div>
                  <div className="text-left">
                     <p className="text-[10px] text-slate-500 uppercase font-bold leading-none mb-1">Módulo Ativo</p>
                     <p className="text-sm font-bold text-white leading-none">{getModuleLabel()}</p>
                  </div>
               </div>
               {allowedModules.length > 1 && (
                 <div className="p-2 rounded-full text-slate-500 transition-colors">
                    <ChevronRight className={`h-5 w-5 transition-transform ${isModuleDropdownOpen ? 'rotate-90' : ''}`} />
                 </div>
               )}
            </button>

            {isModuleDropdownOpen && allowedModules.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 py-2">
                {allowedModules.map(mod => (
                  <button
                    key={mod}
                    onClick={() => {
                      if (onSelectModule) {
                        onSelectModule(mod);
                      } else {
                        // Fallback
                        onChangeModule();
                      }
                      setIsModuleDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${activeModule === mod ? 'bg-slate-800/50' : ''}`}
                  >
                    <div className={`p-1.5 rounded-lg ${getModuleColorFor(mod)} shadow-sm`}>
                       {getModuleIconFor(mod)}
                    </div>
                    <span className={`text-sm font-bold ${activeModule === mod ? 'text-white' : 'text-slate-400'}`}>
                      {getModuleLabelFor(mod)}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
          
          <div className="bg-slate-900/80 rounded-2xl p-3 flex items-center gap-3 border border-slate-800">
            <label className="relative group cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center transition-all group-hover:border-blue-500">
                {userPhotoUrl ? (
                  <img src={userPhotoUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <UserSquare2 className="h-6 w-6 text-slate-500" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <SwitchCamera className="h-4 w-4 text-white" />
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) {
                    alert("A foto deve ter no máximo 500KB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (onUpdatePhoto) onUpdatePhoto(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }} 
              />
            </label>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate leading-tight">
                {userName.includes('@') 
                  ? userName.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  : userName}
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{userLevel}</p>
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
