
import React, { useState, useEffect, useMemo } from 'react';
import { SystemSettings, TeamMember, UserLevel, ModuleType, TireModelDefinition, SystemLog, ServiceTypeDefinition, LocationPoint, Branch, AVAILABLE_PERMISSIONS } from '../types';
import { storageService } from '../services/storageService';
import { Save, Users, Settings as SettingsIcon, Trash2, Plus, Lock, Activity, Check, Image as ImageIcon, Upload, PenLine, Shield, X, AlertTriangle, BookOpen, Clock, List, Search, ClipboardList, Milestone, Truck, CalendarClock, Wrench, MapPin, FileText, Download, Building2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { BranchManagement } from './BranchManagement';

interface SettingsProps {
  orgId: string;
  currentSettings: SystemSettings;
  onUpdateSettings: (s: SystemSettings) => void;
  branches: Branch[];
}

export const Settings: React.FC<SettingsProps> = ({ orgId, currentSettings, onUpdateSettings, branches }) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'TEAM' | 'CATALOG' | 'OFICINA' | 'POINTS' | 'MANUAL' | 'BRANCHES'>('GENERAL');
  
  // General Settings State
  const [formData, setFormData] = useState<SystemSettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Team State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Member Form State
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserLevel>('JUNIOR');
  const [regBranchId, setRegBranchId] = useState<string>('');
  
  // Permission States
  const [regModules, setRegModules] = useState<ModuleType[]>(['TIRES']);
  const [regPermissions, setRegPermissions] = useState<string[]>([]);

  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Activity Logs State
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logUserName, setLogUserName] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [viewingGlobalLogs, setViewingGlobalLogs] = useState(false);

  // --- CATALOG STATE ---
  const [catalogItems, setCatalogItems] = useState<TireModelDefinition[]>([]);
  const [newModel, setNewModel] = useState<Partial<TireModelDefinition>>({
     brand: '', model: '', width: 295, profile: 80, rim: 22.5, standardPressure: 110, originalDepth: 18.0, estimatedLifespanKm: 80000, limitDepth: 3.0
  });

  // --- SERVICES STATE ---
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDefinition[]>([]);
  const [newServiceType, setNewServiceType] = useState<string>('');

  // --- PROCEDURES STATE ---
  const [standardProcedures, setStandardProcedures] = useState<any[]>([]);
  const [newProcedure, setNewProcedure] = useState<any>({
    name: '',
    category: 'OIL',
    description: '',
    estimatedCost: 0
  });

  // --- POINTS STATE ---
  const [savedPoints, setSavedPoints] = useState<LocationPoint[]>([]);
  const [newPoint, setNewPoint] = useState<Partial<LocationPoint>>({ name: '', lat: 0, lng: 0, radius: 500 });

  useEffect(() => {
    setFormData({
      ...currentSettings,
      alertRadius: currentSettings.alertRadius || 500,
      logoUrl: currentSettings.logoUrl || '',
      tireModels: currentSettings.tireModels || [],
      serviceTypes: currentSettings.serviceTypes || [],
      standardProcedures: currentSettings.standardProcedures || [],
      trailerDailyAverageKm: currentSettings.trailerDailyAverageKm || 0,
      savedPoints: currentSettings.savedPoints || []
    });
    setCatalogItems(currentSettings.tireModels || []);
    setServiceTypes(currentSettings.serviceTypes || []);
    setStandardProcedures(currentSettings.standardProcedures || []);
    setSavedPoints(currentSettings.savedPoints || []);
  }, [currentSettings]);

  useEffect(() => {
    const unsub = storageService.subscribeToTeam(orgId, (members) => {
      setTeamMembers(members);
    });
    return () => unsub();
  }, []);

  // Filter Logs logic
  const filteredLogs = useMemo(() => {
     if (!logFilter) return currentLogs;
     const lowerFilter = logFilter.toLowerCase();
     return currentLogs.filter(log => {
        const dateStr = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        return (
           log.action.toLowerCase().includes(lowerFilter) ||
           log.details.toLowerCase().includes(lowerFilter) ||
           (log.userName && log.userName.toLowerCase().includes(lowerFilter)) ||
           dateStr.includes(lowerFilter) // Match time "10:52"
        );
     });
  }, [currentLogs, logFilter]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const finalSettings = { 
        ...formData, 
        tireModels: catalogItems, 
        serviceTypes: serviceTypes,
        standardProcedures: standardProcedures,
        savedPoints: savedPoints
      };
      await storageService.saveSettings(orgId, finalSettings);
      onUpdateSettings(finalSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to save settings", error);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- CATALOG HANDLERS ---
  const handleAddCatalogItem = () => {
     if (!newModel.brand || !newModel.model) {
        alert("Marca e Modelo são obrigatórios.");
        return;
     }
     const item: TireModelDefinition = {
        id: Date.now().toString(),
        brand: newModel.brand,
        model: newModel.model,
        width: newModel.width || 295,
        profile: newModel.profile || 80,
        rim: newModel.rim || 22.5,
        standardPressure: newModel.standardPressure || 110,
        originalDepth: newModel.originalDepth || 18.0,
        estimatedLifespanKm: newModel.estimatedLifespanKm || 80000,
        limitDepth: newModel.limitDepth
     };
     const updatedList = [...catalogItems, item];
     setCatalogItems(updatedList);
     setFormData({...formData, tireModels: updatedList});
     setNewModel({ brand: '', model: '', width: 295, profile: 80, rim: 22.5, standardPressure: 110, originalDepth: 18.0, estimatedLifespanKm: 80000, limitDepth: 3.0 });
  };

  const handleDeleteCatalogItem = (id: string) => {
     const updatedList = catalogItems.filter(i => i.id !== id);
     setCatalogItems(updatedList);
     setFormData({...formData, tireModels: updatedList});
  };

  // --- SERVICE TYPES HANDLERS ---
  const handleAddServiceType = () => {
      if (!newServiceType.trim()) return;
      const newItem: ServiceTypeDefinition = {
          id: Date.now().toString(),
          name: newServiceType.trim()
      };
      const updatedList = [...serviceTypes, newItem];
      setServiceTypes(updatedList);
      setFormData({...formData, serviceTypes: updatedList});
      setNewServiceType('');
  };

  const handleDeleteServiceType = (id: string) => {
      const updatedList = serviceTypes.filter(s => s.id !== id);
      setServiceTypes(updatedList);
      setFormData({...formData, serviceTypes: updatedList});
  };

  // --- PROCEDURES HANDLERS ---
  const handleAddProcedure = () => {
    if (!newProcedure.name.trim()) return;
    const procedure = {
      ...newProcedure,
      id: Date.now().toString()
    };
    const updatedList = [...standardProcedures, procedure];
    setStandardProcedures(updatedList);
    setFormData({...formData, standardProcedures: updatedList});
    setNewProcedure({ name: '', category: 'OIL', description: '', estimatedCost: 0 });
  };

  const handleDeleteProcedure = (id: string) => {
    const updatedList = standardProcedures.filter(p => p.id !== id);
    setStandardProcedures(updatedList);
    setFormData({...formData, standardProcedures: updatedList});
  };

  // --- POINTS HANDLERS ---
  const handleAddPoint = () => {
    if (!newPoint.name || !newPoint.lat || !newPoint.lng) {
      alert("Nome, Latitude e Longitude são obrigatórios.");
      return;
    }
    const item: LocationPoint = {
      id: Date.now().toString(),
      name: newPoint.name,
      lat: Number(newPoint.lat),
      lng: Number(newPoint.lng),
      radius: Number(newPoint.radius) || 500
    };
    const updatedList = [...savedPoints, item];
    setSavedPoints(updatedList);
    setFormData({...formData, savedPoints: updatedList});
    setNewPoint({ name: '', lat: 0, lng: 0, radius: 500 });
  };

  const handleDeletePoint = (id: string) => {
    const updatedList = savedPoints.filter(p => p.id !== id);
    setSavedPoints(updatedList);
    setFormData({...formData, savedPoints: updatedList});
  };

  // --- TEAM HANDLERS ---
  const resetMemberForm = () => {
    setRegFirstName('');
    setRegLastName('');
    setRegPassword('');
    setRegRole('JUNIOR');
    setRegBranchId('');
    setRegModules(['TIRES']);
    setRegPermissions([]);
    setEditingMemberId(null);
    setIsMemberFormOpen(false);
  };

  const openEditMember = (member: TeamMember) => {
    const [first, ...rest] = member.name.split(' ');
    setRegFirstName(first);
    setRegLastName(rest.join(' '));
    setRegRole(member.role);
    setRegBranchId(member.branchId || '');
    setRegModules(member.allowedModules || ['TIRES']);
    setRegPermissions(member.permissions || []);
    setEditingMemberId(member.id);
    setIsMemberFormOpen(true);
    setRegPassword(''); 
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regLastName) return;
    
    if (!editingMemberId && !regPassword) {
       alert("Senha é obrigatória para novos usuários.");
       return;
    }

    setIsSubmittingMember(true);
    try {
      if (editingMemberId) {
         await storageService.updateTeamMember(orgId, editingMemberId, {
            name: `${regFirstName} ${regLastName}`.trim(),
            role: regRole,
            branchId: regBranchId || null,
            allowedModules: regModules,
            permissions: regPermissions
         });
         alert("Usuário atualizado com sucesso!");
      } else {
         const createdUsername = await storageService.registerTeamMember(
            orgId,
            regFirstName, 
            regLastName, 
            regPassword, 
            regRole,
            regModules,
            regPermissions,
            regBranchId || undefined
         );
         alert(`Usuário criado!\nLogin: ${createdUsername}`);
      }
      resetMemberForm();
    } catch (error: any) {
      console.error("Failed to save member", error);
      alert(`Erro: ${error.message || "Falha na operação"}`);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este usuário? O acesso será revogado imediatamente.")) {
      await storageService.deleteTeamMember(orgId, id);
    }
  };

  const toggleModule = (mod: ModuleType) => {
     setRegModules(prev => prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]);
  };

  const togglePermission = (perm: string) => {
     setRegPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("A imagem deve ter no máximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const openActivityLog = async (member: TeamMember) => {
     setLogUserName(member.name);
     setLogFilter('');
     setViewingGlobalLogs(false);
     setLogsModalOpen(true);
     setLoadingLogs(true);
     const logs = await storageService.getLogsByUser(orgId, member.id, 150); 
     setCurrentLogs(logs);
     setLoadingLogs(false);
  };

  const openGlobalLogs = async () => {
     setLogUserName('Sistema Completo');
     setLogFilter('');
     setViewingGlobalLogs(true);
     setLogsModalOpen(true);
     setLoadingLogs(true);
     const logs = await storageService.getGlobalLogs(orgId, 200); 
     setCurrentLogs(logs);
     setLoadingLogs(false);
  };

  const downloadManual = (moduleName: string) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text(`Manual do Sistema - ${moduleName}`, 20, 20);
    
    doc.setFontSize(14);
    doc.text('Passo a Passo:', 20, 40);
    
    doc.setFontSize(12);
    let y = 50;
    
    const content: Record<string, string[]> = {
      'Gestão de Pneus': [
        '1. Acesse o módulo de Pneus no menu lateral.',
        '2. Para cadastrar um novo pneu, clique em "Novo Pneu".',
        '3. Preencha os dados técnicos (Marca, Modelo, Dimensão, DOT).',
        '4. Salve o cadastro.',
        '5. Para movimentar, vá na aba "Movimentação" e selecione o pneu e o veículo.',
        '6. Registre inspeções periodicamente na aba "Inspeções".'
      ],
      'Gestão de Frota': [
        '1. Acesse o módulo de Veículos.',
        '2. Clique em "Novo Veículo" para adicionar um caminhão ou carreta.',
        '3. Informe a placa, modelo, ano e odômetro inicial.',
        '4. Você pode visualizar a localização no "Mapa de Frota".',
        '5. Mantenha o odômetro atualizado para previsões precisas.'
      ],
      'Manutenção e Serviços': [
        '1. Acesse o módulo de Ordens de Serviço.',
        '2. Clique em "Nova O.S." para registrar uma manutenção.',
        '3. Selecione o veículo, tipo de serviço e peças utilizadas.',
        '4. Acompanhe o status (Aberta, Em Andamento, Concluída).',
        '5. Configure planos preventivos na aba "Planos de Manutenção".'
      ],
      'Gestão de Motoristas': [
        '1. Acesse o módulo de Motoristas.',
        '2. Clique em "Novo Motorista".',
        '3. Preencha os dados pessoais e informações da CNH.',
        '4. Vincule o motorista a um veículo padrão, se necessário.',
        '5. Acompanhe o vencimento da CNH e exames.'
      ],
      'Relatórios e Análises': [
        '1. Acesse o módulo de Relatórios ou Dashboard.',
        '2. No Dashboard, visualize os KPIs principais (CPK, Custos).',
        '3. Em Relatórios, escolha o tipo de relatório desejado.',
        '4. Aplique os filtros de data, veículo ou filial.',
        '5. Exporte os dados para Excel ou PDF conforme necessário.'
      ],
      'Configurações e Equipe': [
        '1. Acesse o módulo de Configurações (ícone de engrenagem).',
        '2. Na aba "Parâmetros", defina limites de sulco e alertas.',
        '3. Na aba "Equipe", cadastre novos usuários e defina permissões.',
        '4. Na aba "Catálogo", padronize as marcas e modelos de pneus.',
        '5. Salve as alterações para aplicar em todo o sistema.'
      ]
    };

    const steps = content[moduleName] || ['Conteúdo em desenvolvimento...'];
    
    steps.forEach(step => {
      doc.text(step, 20, y);
      y += 10;
    });

    doc.save(`Manual_${moduleName.replace(/ /g, '_')}.pdf`);
  };

  const ManualCard = ({ title, description }: { title: string, description: string }) => (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col h-full hover:border-sky-300 transition-colors">
      <div className="flex-1">
        <h4 className="font-bold text-slate-800 mb-2">{title}</h4>
        <p className="text-sm text-slate-500 mb-4">{description}</p>
      </div>
      <button onClick={() => downloadManual(title)} className="w-full py-2 bg-white border border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
        <Download className="h-4 w-4" /> Baixar PDF
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* LOGS MODAL */}
      {logsModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95">
               <div className="p-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex justify-between items-center mb-3">
                     <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                           {viewingGlobalLogs ? <ClipboardList className="h-5 w-5 text-purple-600"/> : <List className="h-5 w-5 text-blue-600"/>} 
                           {viewingGlobalLogs ? 'Auditoria Global' : 'Histórico Individual'}
                        </h3>
                        <p className="text-xs text-slate-500">{viewingGlobalLogs ? 'Todos os eventos recentes do sistema' : `Usuário: ${logUserName}`}</p>
                     </div>
                     <button onClick={() => setLogsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="h-5 w-5"/></button>
                  </div>
                  
                  {/* SEARCH FILTER */}
                  <div className="relative">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Filtrar por horário (ex: 10:52), usuário ou ação..." 
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={logFilter}
                        onChange={e => setLogFilter(e.target.value)}
                        autoFocus
                     />
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
                  {loadingLogs ? (
                     <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                        Carregando registros...
                     </div>
                  ) : filteredLogs.length === 0 ? (
                     <div className="text-center py-10 text-slate-400">Nenhuma atividade encontrada para o filtro.</div>
                  ) : (
                     <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-[19px] before:w-0.5 before:bg-slate-200">
                        {filteredLogs.map(log => {
                           const logTime = new Date(log.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                           const isMatch = logFilter && (logTime.includes(logFilter) || log.action.toLowerCase().includes(logFilter.toLowerCase()));
                           
                           return (
                              <div key={log.id} className={`relative pl-10 ${isMatch ? 'opacity-100 transition-transform' : 'opacity-90'}`}>
                                 <div className={`absolute left-3 top-2 w-3 h-3 rounded-full border-2 border-slate-50 z-10 ${log.module === 'MECHANICAL' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                 <div className={`bg-white p-3 rounded-lg border shadow-sm ${isMatch ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                       <span className="text-xs font-bold text-slate-800">{log.action}</span>
                                       <span className="text-[10px] text-slate-400 font-mono">
                                          {new Date(log.timestamp).toLocaleDateString()} {logTime}
                                       </span>
                                    </div>
                                    {viewingGlobalLogs && log.userName && (
                                       <div className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                                          <Users className="h-3 w-3"/> {log.userName}
                                       </div>
                                    )}
                                    <p className="text-xs text-slate-600 leading-relaxed">{log.details}</p>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-wider bg-slate-100 px-1 rounded mt-1 inline-block">{log.module === 'TIRES' ? 'Pneus' : 'Almox.'}</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
           <p className="text-slate-500 text-sm">Gerencie parâmetros globais e controle de acesso.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
           <button onClick={() => setActiveTab('GENERAL')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'GENERAL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <SettingsIcon className="h-4 w-4" /> Parâmetros
           </button>
           <button onClick={() => setActiveTab('CATALOG')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'CATALOG' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <BookOpen className="h-4 w-4" /> Catálogo de Pneus
           </button>
           <button onClick={() => setActiveTab('OFICINA')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'OFICINA' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <Wrench className="h-4 w-4" /> Oficina
           </button>
           <button onClick={() => setActiveTab('POINTS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'POINTS' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <MapPin className="h-4 w-4" /> Pontos de Destino
           </button>
           <button onClick={() => setActiveTab('TEAM')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'TEAM' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <Users className="h-4 w-4" /> Equipe
           </button>
           <button onClick={() => setActiveTab('MANUAL')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'MANUAL' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <FileText className="h-4 w-4" /> Manual
           </button>
           <button onClick={() => setActiveTab('BRANCHES')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'BRANCHES' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
             <Building2 className="h-4 w-4" /> Filiais
           </button>
        </div>
      </div>

      {/* MANUAL TAB */}
      {activeTab === 'MANUAL' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6">
               <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-600" /> Manuais do Sistema
               </h3>
               <p className="text-slate-500 text-sm mt-1">Baixe o manual passo a passo para cada módulo do sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <ManualCard title="Gestão de Pneus" description="Aprenda a cadastrar, movimentar e inspecionar pneus." />
               <ManualCard title="Gestão de Frota" description="Como gerenciar veículos, marcas e modelos." />
               <ManualCard title="Manutenção e Serviços" description="Guia sobre ordens de serviço e planos de manutenção." />
               <ManualCard title="Gestão de Motoristas" description="Passo a passo para cadastrar e gerenciar motoristas." />
               <ManualCard title="Relatórios e Análises" description="Como extrair e interpretar os dados do sistema." />
               <ManualCard title="Configurações e Equipe" description="Aprenda a configurar o sistema e gerenciar acessos." />
            </div>
         </div>
      )}

      {/* BRANCHES TAB */}
      {activeTab === 'BRANCHES' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <BranchManagement />
         </div>
      )}

      {activeTab === 'GENERAL' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
           <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="mb-8">
                 <label className="block text-sm font-bold text-slate-700 flex items-center gap-2 mb-3"><ImageIcon className="h-4 w-4 text-slate-400" /> Personalização Visual (Logo)</label>
                 <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                       {formData.logoUrl ? (
                          <>
                             <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                             <button type="button" onClick={() => setFormData({...formData, logoUrl: ''})} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-xs font-bold transition-opacity">Remover</button>
                          </>
                       ) : (<span className="text-xs text-slate-400 font-bold">Sem Logo</span>)}
                    </div>
                    <div className="flex-1">
                       <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors"><Upload className="h-4 w-4" /> Escolher Imagem <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></label>
                       <p className="text-xs text-slate-400 mt-2">Recomendado: PNG transparente (Max 500KB).</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Limite Crítico de Sulco Global (mm)</label><input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-black" value={formData.minTreadDepth ?? 3} onChange={e => setFormData({...formData, minTreadDepth: Number(e.target.value)})} /></div>
                 <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Alerta de Troca Global (mm)</label><input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-black" value={formData.warningTreadDepth ?? 5} onChange={e => setFormData({...formData, warningTreadDepth: Number(e.target.value)})} /></div>
                 <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Pressão Padrão (PSI)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-black" value={formData.standardPressure ?? 110} onChange={e => setFormData({...formData, standardPressure: Number(e.target.value)})} /></div>
                 <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Raio de Alerta Proximidade (m)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-black" value={formData.alertRadius ?? 500} onChange={e => setFormData({...formData, alertRadius: Number(e.target.value)})} /></div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                 <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Truck className="h-4 w-4 text-orange-600"/> Automação de Frota</h4>
                 <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-2"><CalendarClock className="h-4 w-4"/> Média Diária p/ Carretas (KM)</label>
                        <input 
                            type="number" 
                            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 font-bold focus:ring-2 focus:ring-orange-500 outline-none" 
                            placeholder="0 (Desativado)"
                            value={formData.trailerDailyAverageKm ?? 0} 
                            onChange={e => setFormData({...formData, trailerDailyAverageKm: Number(e.target.value)})} 
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Se definido (&gt;0), o sistema somará este valor ao hodômetro das carretas automaticamente todos os dias ao abrir o app.</p>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                  <button type="button" onClick={async () => { if(confirm("Tem certeza? Isso apagará todos os dados (pneus, serviços, estoques, logs, etc.), mantendo apenas os veículos cadastrados (com hodômetro zerado). Esta ação é irreversível.")) { await storageService.resetData(orgId); alert("Dados resetados com sucesso! A página será recarregada."); window.location.reload(); } }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 text-sm">
                     <Trash2 className="h-4 w-4" /> Resetar Dados
                  </button>
                 <button type="submit" disabled={isSaving} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    {saveSuccess ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />} {saveSuccess ? 'Salvo!' : 'Salvar Alterações'}
                 </button>
              </div>
           </form>
        </div>
      )}

      {/* CATALOG TAB */}
      {activeTab === 'CATALOG' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                     <BookOpen className="h-5 w-5 text-orange-600" /> Catálogo de Padrões
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Defina marcas, modelos e a <strong>vida útil esperada</strong> para previsão de troca.</p>
               </div>
               <button onClick={(e) => handleSaveSettings(e)} disabled={isSaving} className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-all flex items-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                  {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} Salvar Lista
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 text-sm mb-4">Adicionar Novo Modelo</h4>
                  <div className="space-y-3">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Marca</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="Ex: Michelin" value={newModel.brand || ''} onChange={e => setNewModel({...newModel, brand: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Modelo</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="Ex: X Multi Z" value={newModel.model || ''} onChange={e => setNewModel({...newModel, model: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Largura</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-black bg-white" value={newModel.width ?? 0} onChange={e => setNewModel({...newModel, width: Number(e.target.value)})} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Perfil</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-black bg-white" value={newModel.profile ?? 0} onChange={e => setNewModel({...newModel, profile: Number(e.target.value)})} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Aro</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-black bg-white" value={newModel.rim ?? 0} onChange={e => setNewModel({...newModel, rim: Number(e.target.value)})} /></div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Sulco Orig.</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-black bg-white" value={newModel.originalDepth ?? 0} onChange={e => setNewModel({...newModel, originalDepth: Number(e.target.value)})} /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">PSI Padrão</label><input type="number" className="w-full p-2 border border-slate-300 rounded text-black bg-white" value={newModel.standardPressure ?? 0} onChange={e => setNewModel({...newModel, standardPressure: Number(e.target.value)})} /></div>
                     </div>
                     
                     <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                        <h5 className="text-[10px] font-bold text-orange-700 uppercase mb-2">Parâmetros de Troca</h5>
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Vida Útil (KM)</label>
                              <input type="number" className="w-full p-2 border border-orange-200 rounded text-black bg-white focus:ring-1 focus:ring-orange-500" placeholder="80000" value={newModel.estimatedLifespanKm ?? 0} onChange={e => setNewModel({...newModel, estimatedLifespanKm: Number(e.target.value)})} />
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Limite Sulco</label>
                              <input type="number" step="0.1" className="w-full p-2 border border-orange-200 rounded text-black bg-white focus:ring-1 focus:ring-orange-500" placeholder="3.0" value={newModel.limitDepth ?? 0} onChange={e => setNewModel({...newModel, limitDepth: Number(e.target.value)})} />
                           </div>
                        </div>
                     </div>

                     <button onClick={handleAddCatalogItem} className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors mt-2 flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Adicionar à Lista</button>
                  </div>
               </div>

               <div className="lg:col-span-2 overflow-y-auto max-h-[500px]">
                  {catalogItems.length === 0 ? (
                     <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center items-center">
                        <BookOpen className="h-10 w-10 opacity-30 mb-2" />
                        <p>Nenhum modelo cadastrado.</p>
                     </div>
                  ) : (
                     <div className="space-y-2">
                        {catalogItems.map((item, idx) => (
                           <div key={item.id || idx} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm hover:border-orange-300 transition-colors">
                              <div>
                                 <div className="font-bold text-slate-800">{item.brand} - {item.model}</div>
                                 <div className="text-xs text-slate-500 flex flex-wrap gap-2 mt-1">
                                    <span className="bg-slate-100 px-1.5 rounded">{item.width}/{item.profile} R{item.rim}</span>
                                    <span className="bg-slate-100 px-1.5 rounded">Sulco: {item.originalDepth}mm</span>
                                    <span className="bg-slate-100 px-1.5 rounded">PSI: {item.standardPressure}</span>
                                    {item.estimatedLifespanKm && (
                                       <span className="bg-orange-100 text-orange-700 px-1.5 rounded font-bold border border-orange-200 flex items-center gap-1">
                                          <Milestone className="h-3 w-3"/> Max: {item.estimatedLifespanKm.toLocaleString()}km
                                       </span>
                                    )}
                                 </div>
                              </div>
                              <button onClick={() => handleDeleteCatalogItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="h-4 w-4" /></button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* OFICINA TAB */}
      {activeTab === 'OFICINA' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                     <Wrench className="h-5 w-5 text-indigo-600" /> Configurações da Oficina
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Gerencie tipos de serviço e procedimentos padrões.</p>
               </div>
               <button onClick={(e) => handleSaveSettings(e)} disabled={isSaving} className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-all flex items-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                  {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} Salvar Configurações
               </button>
            </div>

            <div className="space-y-8">
                {/* Tipos de Serviço */}
                <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <List className="h-4 w-4" /> Tipos de Serviço (Títulos)
                    </h4>
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Novo Tipo</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 p-2 border border-slate-300 rounded text-black bg-white outline-none focus:border-indigo-500" 
                                        placeholder="Ex: Troca de Óleo" 
                                        value={newServiceType || ''} 
                                        onChange={e => setNewServiceType(e.target.value)} 
                                    />
                                    <button onClick={handleAddServiceType} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded transition-colors"><Plus className="h-5 w-5"/></button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-[200px] overflow-y-auto">
                            {serviceTypes.length === 0 ? (
                                <div className="text-center text-slate-400 py-4 italic text-sm">Nenhum tipo cadastrado.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {serviceTypes.map(st => (
                                        <div key={st.id} className="bg-white p-2 px-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
                                            <span className="text-sm font-bold text-slate-700">{st.name}</span>
                                            <button onClick={() => handleDeleteServiceType(st.id)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Procedimentos Padrões */}
                <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Procedimentos Padrões (Checklists)
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">NOME DO PROCEDIMENTO</label>
                                <input type="text" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="Ex: Revisão 10k" value={newProcedure.name || ''} onChange={e => setNewProcedure({...newProcedure, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">CATEGORIA</label>
                                <select className="w-full p-2 border border-slate-300 rounded text-black bg-white" value={newProcedure.category || 'OIL'} onChange={e => setNewProcedure({...newProcedure, category: e.target.value})}>
                                    <option value="OIL">Troca de Óleo</option>
                                    <option value="ELECTRICAL">Elétrica</option>
                                    <option value="MECHANICAL">Mecânica</option>
                                    <option value="OTHER">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">DESCRIÇÃO / PASSOS</label>
                                <textarea className="w-full p-2 border border-slate-300 rounded text-black bg-white h-20" placeholder="Descreva os passos..." value={newProcedure.description || ''} onChange={e => setNewProcedure({...newProcedure, description: e.target.value})} />
                            </div>
                            <button onClick={handleAddProcedure} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                                <Plus className="h-4 w-4" /> Adicionar Procedimento
                            </button>
                        </div>

                        <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-[400px] overflow-y-auto">
                            {standardProcedures.length === 0 ? (
                                <div className="text-center text-slate-400 py-10 italic">Nenhum procedimento cadastrado.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {standardProcedures.map(p => (
                                        <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                        p.category === 'OIL' ? 'bg-orange-100 text-orange-700' :
                                                        p.category === 'ELECTRICAL' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {p.category}
                                                    </span>
                                                    <h5 className="font-bold text-slate-800 mt-1">{p.name}</h5>
                                                </div>
                                                <button onClick={() => handleDeleteProcedure(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
         </div>
      )}

      {/* POINTS TAB */}
      {activeTab === 'POINTS' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                     <MapPin className="h-5 w-5 text-emerald-600" /> Pontos de Destino Salvos
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">Cadastre locais frequentes para agilizar o agendamento de chegada dos veículos.</p>
               </div>
               <button onClick={(e) => handleSaveSettings(e)} disabled={isSaving} className={`px-4 py-2 rounded-lg font-bold text-white shadow transition-all flex items-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                  {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} Salvar Lista
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 text-sm mb-4">Adicionar Novo Ponto</h4>
                  <div className="space-y-3">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Local</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="Ex: CD Jundiaí" value={newPoint.name || ''} onChange={e => setNewPoint({...newPoint, name: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Latitude</label>
                           <input type="number" step="any" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="-23.1234" value={newPoint.lat ?? 0} onChange={e => setNewPoint({...newPoint, lat: Number(e.target.value)})} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1">Longitude</label>
                           <input type="number" step="any" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="-46.1234" value={newPoint.lng ?? 0} onChange={e => setNewPoint({...newPoint, lng: Number(e.target.value)})} />
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Raio de Alerta (Metros)</label>
                        <input type="number" className="w-full p-2 border border-slate-300 rounded text-black bg-white" placeholder="500" value={newPoint.radius ?? 500} onChange={e => setNewPoint({...newPoint, radius: Number(e.target.value)})} />
                     </div>
                     <button onClick={handleAddPoint} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors mt-2 flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Adicionar Ponto</button>
                  </div>
               </div>

               <div className="lg:col-span-2 overflow-y-auto max-h-[500px]">
                  {savedPoints.length === 0 ? (
                     <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center items-center">
                        <MapPin className="h-10 w-10 opacity-30 mb-2" />
                        <p>Nenhum ponto cadastrado.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {savedPoints.map((point) => (
                           <div key={point.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm hover:border-emerald-300 transition-colors">
                              <div>
                                 <div className="font-bold text-slate-800">{point.name}</div>
                                 <div className="text-[10px] text-slate-500 font-mono mt-1">
                                    Lat: {point.lat.toFixed(4)} | Lng: {point.lng.toFixed(4)}
                                 </div>
                                 <div className="text-[10px] font-bold text-emerald-600 mt-1">Raio: {point.radius}m</div>
                              </div>
                              <button onClick={() => handleDeletePoint(point.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="h-4 w-4" /></button>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* TEAM TAB */}
      {activeTab === 'TEAM' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6 flex justify-between items-center">
              <div><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Users className="h-5 w-5 text-purple-600" /> Gestão da Equipe</h3><p className="text-slate-500 text-sm mt-1">Controle de acesso e permissões.</p></div>
              <div className="flex gap-2">
                 <button onClick={openGlobalLogs} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all">
                    <ClipboardList className="h-4 w-4" /> Auditoria Geral
                 </button>
                 {!isMemberFormOpen && (
                    <button onClick={() => setIsMemberFormOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all"><Plus className="h-4 w-4" /> Novo Membro</button>
                 )}
              </div>
            </div>
            
            {isMemberFormOpen && (
               <div className="bg-slate-50 p-6 rounded-xl border border-purple-100 mb-8 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">{editingMemberId ? <PenLine className="h-4 w-4"/> : <Plus className="h-4 w-4" />} {editingMemberId ? 'Editar Usuário' : 'Novo Usuário'}</h4><button onClick={resetMemberForm} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button></div>
                  <form onSubmit={handleMemberSubmit} className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Nome</label><input type="text" required className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-lg outline-none focus:border-purple-500" value={regFirstName || ''} onChange={e => setRegFirstName(e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Sobrenome</label><input type="text" required className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-lg outline-none focus:border-purple-500" value={regLastName || ''} onChange={e => setRegLastName(e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Senha {editingMemberId && '(Deixe em branco para manter)'}</label><div className="relative"><Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="******" minLength={6} className="w-full pl-9 p-2.5 bg-white text-black border border-slate-300 rounded-lg outline-none focus:border-purple-500" value={regPassword || ''} onChange={e => setRegPassword(e.target.value)} /></div></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Nível de Acesso Hierárquico</label><select className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-lg outline-none focus:border-purple-500" value={regRole || 'JUNIOR'} onChange={e => setRegRole(e.target.value as UserLevel)}><option value="JUNIOR">Operacional (Junior)</option><option value="PLENO">Gerencial (Pleno)</option><option value="SENIOR">Administrador (Senior)</option><option value="INSPECTOR">Inspetor (Acesso Restrito)</option></select></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Filial Vinculada</label><select className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-lg outline-none focus:border-purple-500" value={regBranchId || ''} onChange={e => setRegBranchId(e.target.value)}><option value="">Todas as Filiais</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Shield className="h-3 w-3"/> Módulos Permitidos</label><div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('TIRES')} onChange={() => toggleModule('TIRES')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Gestão de Pneus</span></label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('MECHANICAL')} onChange={() => toggleModule('MECHANICAL')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Manutenção</span></label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('VEHICLES')} onChange={() => toggleModule('VEHICLES')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Gestão de Veículos</span></label>
                          <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('FUEL')} onChange={() => toggleModule('FUEL')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Combustível</span></label>
                        </div></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Lock className="h-3 w-3"/> Permissões Específicas</label><div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">{AVAILABLE_PERMISSIONS.map(perm => (<label key={perm.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded"><input type="checkbox" checked={regPermissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="w-4 h-4 text-purple-600 rounded" /><span className="text-xs text-slate-700">{perm.label}</span></label>))}</div></div>
                     </div>
                     <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={resetMemberForm} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button><button type="submit" disabled={isSubmittingMember} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-colors">{isSubmittingMember ? 'Salvando...' : editingMemberId ? 'Atualizar Usuário' : 'Criar Acesso'}</button></div>
                  </form>
               </div>
            )}

            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                     <tr>
                        <th className="p-3 rounded-tl-lg">Nome / Usuário</th>
                        <th className="p-3">Nível</th>
                        <th className="p-3">Filial</th>
                        <th className="p-3">Módulos</th>
                        <th className="p-3 text-center">Último Acesso</th>
                        <th className="p-3 rounded-tr-lg text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {teamMembers.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50 group">
                           <td className="p-3"><div className="font-bold text-slate-800">{member.name}</div><div className="text-xs text-slate-500 font-mono">{member.username}</div></td>
                           <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${member.role === 'SENIOR' ? 'bg-red-100 text-red-700' : member.role === 'PLENO' ? 'bg-blue-100 text-blue-700' : member.role === 'INSPECTOR' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{member.role}</span></td>
                           <td className="p-3"><span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded">{member.branchId ? branches.find(b => b.id === member.branchId)?.name || 'Desconhecida' : 'Todas'}</span></td>
                           <td className="p-3"><div className="flex gap-1">{member.allowedModules?.includes('TIRES') && <span className="w-2 h-2 rounded-full bg-blue-500" title="Pneus"></span>}{member.allowedModules?.includes('MECHANICAL') && <span className="w-2 h-2 rounded-full bg-green-500" title="Almoxarifado"></span>}{member.allowedModules?.includes('VEHICLES') && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Veículos"></span>}</div></td>
                           <td className="p-3 text-center">
                              {member.lastLogin ? (
                                 <span className="text-xs text-slate-500 flex items-center justify-center gap-1 font-mono">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    {new Date(member.lastLogin).toLocaleDateString()}
                                 </span>
                              ) : (
                                 <span className="text-xs text-slate-400 italic">Nunca</span>
                              )}
                           </td>
                           <td className="p-3 text-right">
                              <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => openActivityLog(member)} className="p-2 text-purple-500 hover:bg-purple-50 rounded transition-colors" title="Ver Atividade">
                                    <List className="h-4 w-4"/>
                                 </button>
                                 <button onClick={() => openEditMember(member)} className="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Editar">
                                    <PenLine className="h-4 w-4"/>
                                 </button>
                                 <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors" title="Remover">
                                    <Trash2 className="h-4 w-4"/>
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}
    </div>
  );
};
