
import React, { FC, ChangeEvent, useState } from 'react';
import { LayoutDashboard, List, PlusCircle, LogOut, ChevronRight, Moon, Sun, ArrowRightLeft, Truck, ClipboardCheck, Recycle, Trash2, PieChart, TrendingUp, DollarSign, MapPin, Wrench, Package, Users, Settings, Layers, Disc, SwitchCamera, Car, LifeBuoy, UserSquare2, Layout, FileBarChart, Grid, Mic, Radio, Activity, Leaf, Trophy, Building2, AlertTriangle, Fuel, Droplets, HeartPulse, ShieldCheck, QrCode } from 'lucide-react';
import { TabView, UserLevel, SystemSettings, ModuleType } from '../types';

interface SidebarProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isDesktopCollapsed?: boolean;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (e: ChangeEvent<HTMLInputElement>) => void;
  userLevel: UserLevel;
  userName: string;
  userPhotoUrl?: string;
  onOpenProfile?: () => void;
  settings?: SystemSettings;
  activeModule: ModuleType;
  allowedModules: ModuleType[];
  onChangeModule: () => void;
  onSelectModule?: (module: ModuleType) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  qrPendingCount?: number;
}

export const Sidebar: FC<SidebarProps> = ({ 
  currentTab, 
  onTabChange, 
  isMobileOpen, 
  setIsMobileOpen, 
  isDesktopCollapsed = false,
  onLogout, 
  userLevel, 
  userName, 
  userPhotoUrl,
  onOpenProfile,
  settings, 
  activeModule, 
  allowedModules,
  onChangeModule, 
  onSelectModule,
  darkMode, 
  toggleDarkMode,
  qrPendingCount = 0
}) => {
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);

  const allMenuItems = [
    // --- MODULO PNEUS ---
    { id: 'register', label: 'Cadastrar Pneu', icon: PlusCircle, modules: ['TIRES'] },
    { id: 'inventory', label: 'Estoque de Pneus', icon: Disc, modules: ['TIRES'] },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, modules: ['TIRES'] }, 
    { id: 'inspection', label: 'Inspecao Pro', icon: ClipboardCheck, modules: ['TIRES'] },
    { id: 'movement', label: 'Movimentacao', icon: ArrowRightLeft, modules: ['TIRES'] },
    { id: 'demand-forecast', label: 'Previsao de Compra', icon: TrendingUp, modules: ['TIRES'] },
    { id: 'retreader-ranking', label: 'Ranking de Fornecedores', icon: Trophy, modules: ['TIRES'] },
    { id: 'retreading', label: 'Recapagem', icon: Recycle, modules: ['TIRES'] },
    { id: 'scrap', label: 'Sucata (Geral)', icon: Trash2, modules: ['JMDSSMAQ'], section: 'Seguranca do Trabalho' },
    { id: 'tire-disposal', label: 'Descarte de Pneus', icon: Trash2, modules: ['TIRES'] },
    
    // --- MODULO JMDSSMAQ ---
    { id: 'esg-panel', label: 'Painel ESG', icon: Leaf, modules: ['JMDSSMAQ'] },
    { id: 'ambulatory', label: 'Ambulatorio', icon: HeartPulse, modules: ['JMDSSMAQ'] },
    { id: 'ppe-stock', label: 'Estoque de EPI', icon: Package, modules: ['JMDSSMAQ'], section: 'Seguranca do Trabalho' },
    { id: 'ppe-disposal', label: 'Descarte de EPI', icon: Trash2, modules: ['JMDSSMAQ'], section: 'Seguranca do Trabalho' },
    
    // --- MODULO VEICULOS ---
    { id: 'fleet', label: 'Cadastro de Veiculos', icon: Truck, modules: ['VEHICLES'] },
    { id: 'fleet-issues', label: 'Inconsistencias', icon: ShieldCheck, modules: ['VEHICLES'] },
    { id: 'command-center', label: 'Comando Diario', icon: LayoutDashboard, modules: ['VEHICLES', 'MECHANICAL', 'FUEL', 'TIRES'] },
    { id: 'fuel', label: 'Abastecimento', icon: Fuel, modules: ['FUEL'] },
    { id: 'fuel-gas', label: 'Abastecimento a GAS', icon: Fuel, modules: ['FUEL'] },
    { id: 'maintenance', label: 'Manutencao', icon: Activity, modules: ['MECHANICAL'] },
    { id: 'maintenance-tv', label: 'Painel TV Manutencao', icon: LayoutDashboard, modules: ['MECHANICAL'] },
    { id: 'brand-models', label: 'Marcas e Modelos', icon: Car, modules: ['VEHICLES'] },
    { id: 'drivers', label: 'Motoristas', icon: UserSquare2, modules: ['VEHICLES'] },
    { id: 'service-orders', label: 'Oficina', icon: Wrench, modules: ['MECHANICAL'] },
    { id: 'qr-service-requests', label: 'Solicitacoes do QR', icon: QrCode, modules: ['MECHANICAL'] },
    { id: 'tracker', label: 'Rastreador', icon: Radio, modules: ['VEHICLES'], creatorOnly: true },
    { id: 'location', label: 'Rastreamento', icon: MapPin, modules: ['VEHICLES'] },
    { id: 'occurrences', label: 'Ocorrencias', icon: AlertTriangle, modules: ['VEHICLES'] },
    { id: 'reports-tires', label: 'Relatorios de Pneus', icon: FileBarChart, modules: ['TIRES'] },
    { id: 'reports-vehicles', label: 'Relatorios de Veiculos', icon: FileBarChart, modules: ['VEHICLES'] },
    { id: 'reports-maintenance', label: 'Relatorios de Manutencao', icon: FileBarChart, modules: ['MECHANICAL'] },
    { id: 'reports-fuel', label: 'Relatorios de Abastecimento', icon: FileBarChart, modules: ['FUEL'] },
    { id: 'vehicle-types', label: 'Tipos de Veiculos', icon: Layers, modules: ['VEHICLES'] },
    { id: 'fuel-types', label: 'Tipos de Combustiveis', icon: Droplets, modules: ['FUEL'] },

    // --- MODULO OFICINA/PECAS ---
    { id: 'service', label: 'Almoxarifado (Pecas)', icon: Package, modules: ['MECHANICAL'] },
    { id: 'waste-disposal', label: 'Descarte de Residuos', icon: Trash2, modules: ['MECHANICAL'] },
    { id: 'partners', label: 'Parceiros/Fornecedores', icon: Users, modules: ['MECHANICAL', 'TIRES'] },

    // --- COMPARTILHADOS ---
    { id: 'rh', label: 'RH - Funcionarios', icon: Users, modules: ['HR'] },
    { id: 'settings', label: 'Configuracoes', icon: Settings, modules: ['TIRES', 'MECHANICAL', 'VEHICLES', 'FUEL', 'HR'] }
  ];

  const menuItems = allMenuItems.filter(item => {
    const isModuleMatch = item.modules.includes(activeModule);
    const isCreatorMatch = !(item as any).creatorOnly || userLevel === 'CREATOR';
    return isModuleMatch && isCreatorMatch;
  });

  // Alteracao: Z-Index aumentado para sobrepor elementos do mapa (z-[9999])
  const baseClasses = `fixed z-[9999] w-72 bg-[#020617] text-slate-300 transition-transform duration-300 ease-in-out flex flex-col border-r border-slate-800/50 h-screen inset-y-0 left-0`;
  const mobileClasses = isMobileOpen ? "translate-x-0" : isDesktopCollapsed ? "-translate-x-full" : "-translate-x-full lg:translate-x-0";

  const getModuleIconFor = (mod: ModuleType) => {
    if (mod === 'TIRES') return <Disc className="h-4 w-4 text-white" />;
    if (mod === 'VEHICLES') return <Truck className="h-4 w-4 text-white" />;
    if (mod === 'FUEL') return <Fuel className="h-4 w-4 text-white" />;
    if (mod === 'JMDSSMAQ') return <Layout className="h-4 w-4 text-white" />;
    if (mod === 'HR') return <Users className="h-4 w-4 text-white" />;
    return <Wrench className="h-4 w-4 text-white" />;
  };

  const getModuleLabelFor = (mod: ModuleType) => {
    if (mod === 'TIRES') return 'Pneus';
    if (mod === 'VEHICLES') return 'Veiculo';
    if (mod === 'FUEL') return 'Abastecimento';
    if (mod === 'JMDSSMAQ') return 'JMDSSMAQ';
    if (mod === 'HR') return 'RH';
    return 'Oficina';
  };

  const getModuleColorFor = (mod: ModuleType) => {
    if (mod === 'TIRES') return 'bg-blue-600';
    if (mod === 'VEHICLES') return 'bg-emerald-600';
    if (mod === 'FUEL') return 'bg-amber-600';
    if (mod === 'JMDSSMAQ') return 'bg-purple-600';
    if (mod === 'HR') return 'bg-indigo-600';
    return 'bg-orange-600';
  };

  const getModuleIcon = () => getModuleIconFor(activeModule);
  const getModuleLabel = () => getModuleLabelFor(activeModule);
  const getModuleColor = () => getModuleColorFor(activeModule);

  const getActiveColorClass = () => {
    if (activeModule === 'TIRES') return 'bg-blue-600 shadow-blue-600/20';
    if (activeModule === 'VEHICLES') return 'bg-emerald-600 shadow-emerald-600/20';
    if (activeModule === 'FUEL') return 'bg-amber-600 shadow-amber-600/20';
    if (activeModule === 'JMDSSMAQ') return 'bg-purple-600 shadow-purple-600/20';
    if (activeModule === 'HR') return 'bg-indigo-600 shadow-indigo-600/20';
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
                     <p className="text-[10px] text-slate-500 uppercase font-bold leading-none mb-1">Modulo Ativo</p>
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
          {menuItems.map((item, index) => {
            const Icon = item.icon as any;
            const isActive = currentTab === item.id;
            const activeColorClass = getActiveColorClass();
            const showSection = item.section && (index === 0 || menuItems[index - 1].section !== item.section);

            return (
              <React.Fragment key={item.id}>
                {showSection && (
                  <p className="px-4 pt-4 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-px bg-slate-800 flex-1" />
                    {item.section}
                    <span className="h-px bg-slate-800 flex-1" />
                  </p>
                )}
                <button
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
                  {item.id === 'qr-service-requests' && qrPendingCount > 0 && (
                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      isActive ? 'bg-white text-slate-900' : 'bg-amber-500 text-white'
                    }`}>
                      {qrPendingCount > 99 ? '99+' : qrPendingCount}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800/50 bg-[#020617]">
          <button onClick={toggleDarkMode} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-400 hover:text-white transition-colors mb-2 rounded-xl hover:bg-white/5">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          
          <div className="bg-slate-900/80 rounded-2xl p-3 flex items-center gap-3 border border-slate-800">
            <button type="button" onClick={onOpenProfile} className="relative group cursor-pointer shrink-0">
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
            </button>
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
