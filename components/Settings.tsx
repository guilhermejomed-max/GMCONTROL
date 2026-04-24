
import React, { useState, useEffect, useMemo } from 'react';
import { SystemSettings, TeamMember, UserLevel, ModuleType, TireModelDefinition, SystemLog, ServiceTypeDefinition, LocationPoint, Branch, AVAILABLE_PERMISSIONS, ServiceSector, ServiceClassification, WasteType, WasteUnit } from '../types';
import { storageService } from '../services/storageService';
import { Save, Users, Settings as SettingsIcon, Trash2, Plus, Lock, Activity, Check, Image as ImageIcon, Upload, PenLine, Shield, X, AlertTriangle, BookOpen, Clock, List, Search, ClipboardList, Milestone, Truck, CalendarClock, Wrench, MapPin, FileText, Download, Building2, Grid, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { BranchManagement } from './BranchManagement';

interface SettingsProps {
  orgId: string;
  currentSettings: SystemSettings;
  onUpdateSettings: (s: SystemSettings) => void;
  branches: Branch[];
  sectors: ServiceSector[];
  classifications: ServiceClassification[];
  paymentMethods: import('../types').PaymentMethod[];
}

export const Settings: React.FC<SettingsProps> = ({ orgId, currentSettings, onUpdateSettings, branches, sectors, classifications, paymentMethods }) => {
  const [activeTab, setActiveTab] = useState<string>('GENERAL');
  
  // Categorias do Menu
  const MENU_GROUPS = [
    {
      title: 'Configurações',
      items: [
        { id: 'GENERAL', label: 'Parâmetros', icon: SettingsIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'CATALOG', label: 'Catálogo de Pneus', icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
        { id: 'OFICINA', label: 'Oficina', icon: Wrench, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      ]
    },
    {
      title: 'Organização',
      items: [
        { id: 'BRANCHES', label: 'Filiais', icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { id: 'SECTOR', label: 'Setor', icon: Grid, color: 'text-purple-600', bg: 'bg-purple-50' },
        { id: 'PAYMENTS', label: 'Pagamentos', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'POINTS', label: 'Pontos de Destino', icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-50' },
      ]
    },
    {
      title: 'Pessoas e Acesso',
      items: [
        { id: 'TEAM', label: 'Equipe', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
      ]
    },
    {
      title: 'Suporte',
      items: [
        { id: 'MANUAL', label: 'Manual', icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50' },
        { id: 'logs', label: 'Auditoria Global', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
      ]
    }
  ];

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
  const [regSectorId, setRegSectorId] = useState<string>('');
  
  // Permission States
  const [regModules, setRegModules] = useState<ModuleType[]>(['TIRES']);
  const [regPermissions, setRegPermissions] = useState<string[]>([]);
  
  // Custom Profile States
  const [regPhotoUrl, setRegPhotoUrl] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regNotes, setRegNotes] = useState('');

  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Activity Logs State
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logUserName, setLogUserName] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [viewingGlobalLogs, setViewingGlobalLogs] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // --- CATALOG STATE ---
  const [catalogItems, setCatalogItems] = useState<TireModelDefinition[]>([]);
  const [newModel, setNewModel] = useState<Partial<TireModelDefinition>>({
     brand: '', model: '', width: 295, profile: 80, rim: 22.5, standardPressure: 110, originalDepth: 18.0, estimatedLifespanKm: 80000, limitDepth: 3.0
  });

  // --- NEW SETTINGS STATE ---
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newSector, setNewSector] = useState('');
  const [newClassification, setNewClassification] = useState('');

  // --- WASTE TYPES STATE ---
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [newWasteTypeName, setNewWasteTypeName] = useState('');
  const [newWasteTypeUnit, setNewWasteTypeUnit] = useState<WasteUnit>('KG');
  const [newWasteTypeCategory, setNewWasteTypeCategory] = useState<'WASTE' | 'PPE' | 'TIRE'>('WASTE');

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

  useEffect(() => {
    const unsubWasteTypes = storageService.subscribeToWasteTypes(orgId, setWasteTypes);
    return () => unsubWasteTypes();
  }, [orgId]);

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
    setRegSectorId('');
    setRegModules(['TIRES']);
    setRegPermissions([]);
    setRegPhotoUrl('');
    setRegPhone('');
    setRegCpf('');
    setRegBirthDate('');
    setRegNotes('');
    setEditingMemberId(null);
    setIsMemberFormOpen(false);
  };

  const openEditMember = (member: TeamMember) => {
    const [first, ...rest] = member.name.split(' ');
    setRegFirstName(first);
    setRegLastName(rest.join(' '));
    setRegRole(member.role);
    setRegBranchId(member.branchId || '');
    setRegSectorId(member.sectorId || '');
    setRegModules(member.allowedModules || ['TIRES']);
    setRegPermissions(member.permissions || []);
    setRegPhotoUrl(member.photoUrl || '');
    setRegPhone(member.phone || '');
    setRegCpf(member.cpf || '');
    setRegBirthDate(member.birthDate || '');
    setRegNotes(member.notes || '');
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
      const selectedSector = sectors.find(s => s.id === regSectorId);
      const memberData: Partial<TeamMember> = {
        name: `${regFirstName} ${regLastName}`.trim(),
        role: regRole,
        branchId: regBranchId || null,
        sectorId: regSectorId || undefined,
        sectorName: selectedSector?.name || undefined,
        allowedModules: regModules,
        permissions: regPermissions,
        photoUrl: regPhotoUrl || undefined,
        phone: regPhone || undefined,
        cpf: regCpf || undefined,
        birthDate: regBirthDate || undefined,
        notes: regNotes || undefined
      };

      if (editingMemberId) {
         await storageService.updateTeamMember(orgId, editingMemberId, memberData);
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
            regBranchId || undefined,
            regSectorId || undefined,
            selectedSector?.name || undefined,
            memberData
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

  const handleMemberPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("A foto deve ter no máximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRegPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
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

  const handleAddWasteType = async () => {
    if (!newWasteTypeName.trim()) return;
    try {
      await storageService.addWasteType(orgId, {
        name: newWasteTypeName.trim(),
        unit: newWasteTypeUnit,
        category: newWasteTypeCategory,
        orgId
      });
      setNewWasteTypeName('');
    } catch (error) {
      console.error("Failed to add waste type", error);
    }
  };

  const handleDeleteWasteType = async (id: string) => {
    if (!confirm("Deseja remover este item de resíduo?")) return;
    try {
      await storageService.deleteWasteType(orgId, id);
    } catch (error) {
      console.error("Failed to delete waste type", error);
    }
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
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden sticky top-6">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
             <h3 className="font-bold text-slate-800 dark:text-white uppercase text-[10px] tracking-widest">Configuração do Sistema</h3>
          </div>
          <div className="p-3 space-y-6">
             {MENU_GROUPS.map((group) => (
               <div key={group.title}>
                 <h4 className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{group.title}</h4>
                 <div className="space-y-1">
                   {group.items.map((item) => (
                     <button
                       key={item.id}
                       onClick={() => {
                         if (item.id === 'logs') openGlobalLogs();
                         else setActiveTab(item.id);
                       }}
                       className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                         activeTab === item.id 
                           ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                           : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'
                       }`}
                     >
                       <div className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
                          <item.icon className="h-4 w-4" />
                       </div>
                       {item.label}
                     </button>
                   ))}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1">
        
       {/* LOGS MODAL (Mantive a lógica do modal original por compatibilidade) */}
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
                     <div className="flex items-center gap-2">
                        {viewingGlobalLogs && (
                           <button 
                              onClick={async () => {
                                 if (confirm("Deseja realmente limpar os últimos registros de auditoria? Esta ação é irreversível.")) {
                                    setLoadingLogs(true);
                                    await storageService.clearGlobalLogs(orgId);
                                    const logs = await storageService.getGlobalLogs(orgId, 200);
                                    setCurrentLogs(logs);
                                    setLoadingLogs(false);
                                 }
                              }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                           >
                              <Trash2 className="h-3 w-3" /> Limpar Lote
                           </button>
                        )}
                        <button onClick={() => setLogsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="h-5 w-5"/></button>
                     </div>
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h2>
           <p className="text-slate-500 text-sm">Gerencie parâmetros globais e controle de acesso.</p>
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
        <>
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

              <div className="pt-6 border-t border-slate-100 flex justify-end items-center">
                 <button type="submit" disabled={isSaving} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    {saveSuccess ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />} {saveSuccess ? 'Salvo!' : 'Salvar Alterações'}
                 </button>
              </div>
           </form>
        </div>
        </>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'PAYMENTS' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center gap-2 mb-6">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <DollarSign className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Formas de Pagamento</h3>
                 <p className="text-sm text-slate-500">Cadastre as opções para pagamentos de ocorrências externas.</p>
               </div>
             </div>

             <div className="flex gap-2 mb-6">
               <input
                 type="text"
                 value={newPaymentMethod}
                 onChange={(e) => setNewPaymentMethod(e.target.value)}
                 placeholder="PIX, Cartão Bradesco, Dinheiro..."
                 className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
               />
               <button
                 onClick={async () => {
                   if (!newPaymentMethod.trim()) return;
                   await storageService.addPaymentMethod(orgId, {
                     id: Date.now().toString(),
                     name: newPaymentMethod.trim()
                   });
                   setNewPaymentMethod('');
                 }}
                 className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold"
               >
                 Adicionar
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
               {paymentMethods.map((method) => (
                 <div key={method.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <span className="font-bold text-slate-700">{method.name}</span>
                   <button
                     onClick={() => storageService.deletePaymentMethod(orgId, method.id)}
                     className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
         </div>
      )}

      {/* SECTOR TAB */}
      {activeTab === 'SECTOR' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center gap-2 mb-6">
               <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                 <Grid className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Setor / Departamentos</h3>
                 <p className="text-sm text-slate-500">Departamentos responsáveis pelas ocorrências.</p>
               </div>
             </div>

             <div className="flex gap-2 mb-6">
               <input
                 type="text"
                 value={newSector}
                 onChange={(e) => setNewSector(e.target.value)}
                 placeholder="Mecânica, Financeiro, Logística..."
                 className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
               />
               <button
                 onClick={async () => {
                   if (!newSector.trim()) return;
                   await storageService.addSector(orgId, {
                     id: Date.now().toString(),
                     name: newSector.trim()
                   });
                   setNewSector('');
                 }}
                 className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold"
               >
                 Adicionar
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
               {sectors.map((sector) => (
                 <div key={sector.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <span className="font-bold text-slate-700">{sector.name}</span>
                   <button
                     onClick={() => storageService.deleteSector(orgId, sector.id)}
                     className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               ))}
             </div>
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
         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Configurações da Oficina</h3>
                    <p className="text-sm text-slate-500 font-medium">Gestão de resíduos, operações e procedimentos técnicos.</p>
                  </div>
               </div>
               <button 
                  onClick={(e) => handleSaveSettings(e)} 
                  disabled={isSaving} 
                  className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 ${saveSuccess ? 'bg-green-600' : 'bg-slate-900 hover:bg-slate-800'}`}
               >
                  {saveSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} 
                  {saveSuccess ? 'Alterações Salvas' : 'Salvar Preferências'}
               </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* 1. ITENS PARA DESCARTE */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-indigo-500 rounded-lg text-white">
                             <Trash2 className="w-4 h-4" />
                           </div>
                           <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                               Catálogo de Resíduos
                           </h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-widest leading-none">
                           {wasteTypes.length} Itens Cadastrados
                        </span>
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col xl:flex-row gap-8">
                            {/* Formulário lateral */}
                            <div className="w-full xl:w-80 shrink-0">
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 sticky top-6">
                                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Adicionar Novo Item</h5>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-500 ml-1">DESCRIÇÃO DO RESÍDUO</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm" 
                                                placeholder="Ex: Óleo Usado" 
                                                value={newWasteTypeName}
                                                onChange={(e) => setNewWasteTypeName(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Unidade</label>
                                                <select 
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm text-slate-700"
                                                    value={newWasteTypeUnit}
                                                    onChange={(e) => setNewWasteTypeUnit(e.target.value as WasteUnit)}
                                                >
                                                    <option value="KG">KG</option>
                                                    <option value="LITERS">Litros</option>
                                                    <option value="UNITS">UN</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">Categoria</label>
                                                <select 
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm text-slate-700"
                                                    value={newWasteTypeCategory}
                                                    onChange={(e) => setNewWasteTypeCategory(e.target.value as any)}
                                                >
                                                    <option value="WASTE">Resíduo</option>
                                                    <option value="PPE">EPI</option>
                                                    <option value="TIRE">Pneu</option>
                                                </select>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleAddWasteType}
                                            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 mt-2"
                                        >
                                            <Plus className="h-4 w-4" /> Adicionar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Grid de Itens */}
                            <div className="flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
                                    {wasteTypes.map(type => (
                                        <div key={type.id} className="flex flex-col bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDeleteWasteType(type.id)} 
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Excluir"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="font-bold text-slate-800 text-sm mb-3 truncate pr-6">{type.name}</div>
                                            <div className="mt-auto flex items-center gap-2">
                                                <span className="text-[9px] px-2 py-1 bg-slate-100 text-slate-500 rounded-lg font-black uppercase tracking-tight">{type.unit}</span>
                                                <span className={`text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tight ${
                                                    type.category === 'WASTE' ? 'bg-orange-50 text-orange-600' :
                                                    type.category === 'PPE' ? 'bg-purple-50 text-purple-600' :
                                                    'bg-blue-50 text-blue-600'
                                                }`}>
                                                    {type.category === 'WASTE' ? 'Resíduo' : type.category === 'PPE' ? 'EPI' : 'Pneu'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {wasteTypes.length === 0 && (
                                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-3">
                                                <Trash2 className="h-8 w-8 opacity-20 text-slate-400" />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-widest">Nenhum item cadastrado no catálogo</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. TIPOS DE SERVIÇO */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-slate-600" />
                           <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                               Operações e Tipos de Serviço (Itens da O.S.)
                           </h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                           {serviceTypes.length} TIPOS
                        </span>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4">
                                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-4">Nova Operação</label>
                                    <div className="space-y-4">
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 focus:border-slate-800 transition-all placeholder:text-slate-300 shadow-sm" 
                                            placeholder="Ex: Troca de Óleo, Alinhamento..." 
                                            value={newServiceType || ''} 
                                            onChange={e => setNewServiceType(e.target.value)} 
                                        />
                                        <button 
                                            onClick={handleAddServiceType} 
                                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                                        >
                                            <Plus className="h-4 w-4"/> Adicionar ao Catálogo
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-8">
                                {serviceTypes.length === 0 ? (
                                    <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3">
                                            <List className="h-6 w-6 opacity-30 text-slate-500" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum tipo de serviço cadastrado</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {serviceTypes.map(st => (
                                            <div key={st.id} className="bg-slate-50/30 p-4 px-5 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-300 hover:bg-white hover:shadow-md transition-all group">
                                                <span className="text-[13px] font-black text-slate-700 truncate pr-2 uppercase tracking-tight">{st.name}</span>
                                                <button 
                                                    onClick={() => handleDeleteServiceType(st.id)} 
                                                    className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5"/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. PROCEDIMENTOS PADRÕES */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500" />
                           <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                               Checklists e Procedimentos Padrões (SOP)
                           </h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">
                           {standardProcedures.length} PROCEDIMENTOS
                        </span>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-4">
                                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">Nome Comercial</label>
                                        <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm" placeholder="Ex: Revisão 10.000km" value={newProcedure.name || ''} onChange={e => setNewProcedure({...newProcedure, name: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                        <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">Categoria</label>
                                        <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer appearance-none shadow-sm" value={newProcedure.category || 'OIL'} onChange={e => setNewProcedure({...newProcedure, category: e.target.value})}>
                                            <option value="OIL">Troca de Óleo</option>
                                            <option value="ELECTRICAL">Elétrica</option>
                                            <option value="MECHANICAL">Mecânica</option>
                                            <option value="OTHER">Outros</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wider">Passo a Passo</label>
                                        <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all h-36 resize-none shadow-sm" placeholder="1. Verificar nível do fluido&#10;2. Trocar juntas..." value={newProcedure.description || ''} onChange={e => setNewProcedure({...newProcedure, description: e.target.value})} />
                                    </div>
                                    <button onClick={handleAddProcedure} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
                                        <Plus className="h-4 w-4" /> Criar Procedimento
                                    </button>
                                </div>
                            </div>

                            <div className="lg:col-span-8">
                                {standardProcedures.length === 0 ? (
                                    <div className="py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 h-full">
                                        <div className="p-3 bg-white rounded-2xl shadow-sm mb-3">
                                            <ClipboardList className="h-6 w-6 opacity-30 text-slate-500" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum procedimento cadastrado</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {standardProcedures.map(p => (
                                            <div key={p.id} className="bg-slate-50/20 p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:bg-white hover:shadow-lg transition-all group relative">
                                                <div className="absolute top-4 right-4">
                                                    <button 
                                                        onClick={() => { if(confirm("Deseja apagar este procedimento?")) handleDeleteProcedure(p.id); }} 
                                                        className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4"/>
                                                    </button>
                                                </div>
                                                <div className="mb-3">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-tight ${
                                                        p.category === 'OIL' ? 'bg-orange-50 text-orange-600' :
                                                        p.category === 'ELECTRICAL' ? 'bg-blue-50 text-blue-600' :
                                                        p.category === 'MECHANICAL' ? 'bg-indigo-50 text-indigo-600' :
                                                        'bg-slate-50 text-slate-600'
                                                    }`}>
                                                        {p.category === 'OIL' ? 'Óleo' : p.category === 'ELECTRICAL' ? 'Elétrica' : p.category === 'MECHANICAL' ? 'Mecânica' : 'Geral'}
                                                    </span>
                                                </div>
                                                <h5 className="font-bold text-slate-800 mb-2 pr-8">{p.name}</h5>
                                                <div className="h-px w-full bg-slate-100 mb-3" />
                                                <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed line-clamp-5 scrollbar-thin overflow-y-auto max-h-[120px] font-medium">{p.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                 {!isMemberFormOpen && (
                    <button onClick={() => setIsMemberFormOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all"><Plus className="h-4 w-4" /> Novo Membro</button>
                 )}
              </div>
            </div>
            
            {isMemberFormOpen && (
               <div className="bg-slate-50 p-6 rounded-xl border border-purple-100 mb-8 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">{editingMemberId ? <PenLine className="h-4 w-4"/> : <Plus className="h-4 w-4" />} {editingMemberId ? 'Editar Usuário' : 'Novo Usuário'}</h4><button onClick={resetMemberForm} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5"/></button></div>
                  <form onSubmit={handleMemberSubmit} className="space-y-6">
                     <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex flex-col items-center gap-3">
                           <div className="h-24 w-24 rounded-2xl bg-white border-2 border-dashed border-purple-200 flex items-center justify-center overflow-hidden relative group shadow-sm transition-all hover:border-purple-400">
                              {regPhotoUrl ? (
                                 <>
                                    <img src={regPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setRegPhotoUrl('')} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white text-[10px] font-bold transition-opacity">Remover</button>
                                 </>
                              ) : (
                                 <div className="flex flex-col items-center text-purple-300">
                                    <ImageIcon className="h-8 w-8 mb-1" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Foto</span>
                                 </div>
                              )}
                              <input type="file" accept="image/*" onChange={handleMemberPhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                           </div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Pergaminho/JPG</p>
                        </div>

                        <div className="flex-1 space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Nome</label><input type="text" required className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regFirstName || ''} onChange={e => setRegFirstName(e.target.value)} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Sobrenome</label><input type="text" required className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regLastName || ''} onChange={e => setRegLastName(e.target.value)} /></div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Telefone</label><input type="text" placeholder="(00) 00000-0000" className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regPhone || ''} onChange={e => setRegPhone(e.target.value)} /></div>
                              <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">CPF</label><input type="text" placeholder="000.000.000-00" className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regCpf || ''} onChange={e => setRegCpf(e.target.value)} /></div>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Data Nasc.</label><input type="date" className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regBirthDate || ''} onChange={e => setRegBirthDate(e.target.value)} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Senha {editingMemberId && '(Em branco p/ manter)'}</label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="text" placeholder="******" minLength={6} className="w-full pl-9 p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regPassword || ''} onChange={e => setRegPassword(e.target.value)} /></div></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Bio / Notas</label><input type="text" placeholder="Breve resumo sobre o colaborador..." className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" value={regNotes || ''} onChange={e => setRegNotes(e.target.value)} /></div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-6">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">NívelHierárquico</label><select className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl shadow-sm outline-none focus:border-purple-500 font-bold" value={regRole || 'JUNIOR'} onChange={e => setRegRole(e.target.value as UserLevel)}><option value="JUNIOR">Operacional (Junior)</option><option value="PLENO">Gerencial (Pleno)</option><option value="SENIOR">Administrador (Senior)</option><option value="INSPECTOR">Inspetor (Restrito)</option></select></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Setor</label><select className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl shadow-sm outline-none focus:border-purple-500 font-bold" value={regSectorId || ''} onChange={e => setRegSectorId(e.target.value)}><option value="">Nenhum Setor</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1 tracking-wider uppercase">Filial</label><select className="w-full p-2.5 bg-white text-black border border-slate-300 rounded-xl shadow-sm outline-none focus:border-purple-500 font-bold" value={regBranchId || ''} onChange={e => setRegBranchId(e.target.value)}><option value="">Todas as Filiais</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-xl border border-slate-200">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><Shield className="h-3 w-3"/> Módulos Permitidos</label><div className="space-y-2">
                           <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('VEHICLES')} onChange={() => toggleModule('VEHICLES')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Veículo</span></label>
                           <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('FUEL')} onChange={() => toggleModule('FUEL')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Abastecimento</span></label>
                           <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('TIRES')} onChange={() => toggleModule('TIRES')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Pneus</span></label>
                           <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('MECHANICAL')} onChange={() => toggleModule('MECHANICAL')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">Oficina</span></label>
                           <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded"><input type="checkbox" checked={regModules.includes('JMDSSMAQ')} onChange={() => toggleModule('JMDSSMAQ')} className="w-4 h-4 text-purple-600 rounded" /><span className="text-sm font-medium text-slate-700">JMDSSMAQ</span></label>
                        </div></div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                              <Lock className="h-3 w-3"/> Permissões Detalhadas
                           </label>
                           <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar bg-slate-50/50 p-3 rounded-xl border border-slate-200 shadow-inner">
                              {Object.entries(
                                 AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
                                    const cat = (perm as any).category || 'Outros';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(perm);
                                    return acc;
                                 }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>)
                              ).map(([category, perms]) => (
                                 <div key={category} className="space-y-1">
                                    <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-widest px-1.5 mb-1 flex items-center gap-2">
                                       <div className="h-1 w-2 rounded-full bg-purple-400" /> {category}
                                    </h5>
                                    <div className="grid grid-cols-1 gap-1">
                                       {perms.map(perm => (
                                          <label key={perm.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-slate-100 group">
                                             <input 
                                                type="checkbox" 
                                                checked={regPermissions.includes(perm.id)} 
                                                onChange={() => togglePermission(perm.id)} 
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 transition-all cursor-pointer" 
                                             />
                                             <span className="text-[11px] text-slate-600 font-semibold group-hover:text-slate-900 transition-colors tracking-tight">{perm.label}</span>
                                          </label>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
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
                        <th className="p-3">Setor</th>
                        <th className="p-3">Filial</th>
                        <th className="p-3">Módulos</th>
                        <th className="p-3 text-center">Último Acesso</th>
                        <th className="p-3 rounded-tr-lg text-right">Ações</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {teamMembers.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50 group">
                           <td className="p-3">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                    {member.photoUrl ? (
                                       <img src={member.photoUrl} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-400">
                                          <Users className="h-5 w-5" />
                                        </div>
                                     )}
                                  </div>
                                  <div className="min-w-0">
                                     <div className="font-bold text-slate-800 truncate">{member.name}</div>
                                     <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                        <Shield className="h-3 w-3" /> {member.username}
                                     </div>
                                  </div>
                               </div>
                            </td>
                            <td className="p-3">
                               <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                     member.role === 'SENIOR' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                     member.role === 'PLENO' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                                     member.role === 'INSPECTOR' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 
                                     'bg-green-50 text-green-600 border border-green-100'
                                  }`}>
                                     {member.role}
                                  </span>
                                  {member.phone && (
                                     <div className="text-[10px] text-slate-400 font-medium">{member.phone}</div>
                                  )}
                               </div>
                            </td>
                           <td className="p-3">
                              {member.sectorName ? (
                                 <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                    {member.sectorName}
                                 </span>
                              ) : (
                                 <span className="text-xs text-slate-400 italic">-</span>
                               )}
                           </td>
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
  </div>
);
};
