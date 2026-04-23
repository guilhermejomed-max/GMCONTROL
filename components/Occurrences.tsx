import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X,
  FileText,
  Calendar,
  User,
  Truck,
  Phone,
  Camera,
  Image as ImageIcon,
  Upload,
  Loader,
  MessageSquare,
  History,
  Building2,
  Save,
  Send,
  Smile
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Occurrence, OccurrenceReason, Vehicle, TeamMember, ServiceSector, Driver, ServiceOrder } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SearchableSelect } from './ui/SearchableSelect';

interface OccurrencesProps {
  orgId: string;
  user: any;
  occurrences: Occurrence[];
  vehicles: Vehicle[];
  reasons: OccurrenceReason[];
  sectors: ServiceSector[];
  drivers: Driver[];
  collaborators: import('../types').Collaborator[];
  teamMembers?: TeamMember[];
  paymentMethods: import('../types').PaymentMethod[];
  serviceOrders: ServiceOrder[];
  userLevel?: string;
  onGenerateOS: (occurrenceId: string, vehicleId: string) => void;
  onNotification?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const TREATMENT_SUGGESTIONS = [
  'Acionando Guincho especializado',
  'Mecânico em deslocamento para o local',
  'Em atendimento mecânico no local',
  'Veículo se deslocando para oficina própria',
  'Veículo se deslocando para oficina credenciada',
  'Aguardando orçamento de peças',
  'Aguardando aprovação de serviço',
  'Pneu trocado no local',
  'Problema elétrico resolvido',
  'Motorista orientado sobre procedimento',
  'Célula de carga verificada',
  'Sistema de ar revisado'
];

const REJECTION_REASONS = [
  'Setor Responsável Incorreto',
  'Falta de Ferramental no Local',
  'Peça Indisponível no Estoque',
  'Necessário envio para Oficina Externa',
  'Atendimento já realizado por outro setor',
  'Dados da Ocorrência Insuficientes',
  'Motorista não localizado'
];

export const Occurrences: React.FC<OccurrencesProps> = ({ 
  orgId, 
  user, 
  occurrences: initialOccurrences, 
  vehicles: initialVehicles, 
  reasons, 
  sectors, 
  drivers, 
  collaborators,
  teamMembers = [],
  paymentMethods,
  serviceOrders,
  userLevel = 'VIEWER',
  onGenerateOS,
  onNotification
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'reasons'>('list');
  const [occurrences, setOccurrences] = useState<Occurrence[]>(initialOccurrences);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);
  
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);
  const [editingReason, setEditingReason] = useState<OccurrenceReason | null>(null);
  const [selectedOccurrenceForDetails, setSelectedOccurrenceForDetails] = useState<Occurrence | null>(null);
  const [selectedOccurrenceForTreatment, setSelectedOccurrenceForTreatment] = useState<Occurrence | null>(null);
  const [selectedOccurrenceForRejection, setSelectedOccurrenceForRejection] = useState<Occurrence | null>(null);
  const [customTreatment, setCustomTreatment] = useState('');
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Generic Mentions state
  const [mentionTargetField, setMentionTargetField] = useState<'treatment' | 'description' | 'chat' | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Rejection form states
  const [rejectionReason, setRejectionReason] = useState('');
  const [redirectSectorId, setRedirectSectorId] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  // New state for linking existing OS
  const [isLinkingExistingOS, setIsLinkingExistingOS] = useState(false);
  const [selectedOSIdToLink, setSelectedOSIdToLink] = useState('');

  useEffect(() => {
    if (!selectedOccurrenceForDetails && !selectedOccurrenceForTreatment) {
      setIsLinkingExistingOS(false);
      setSelectedOSIdToLink('');
    }
  }, [selectedOccurrenceForDetails, selectedOccurrenceForTreatment]);

  // Form states
  const [occurrenceForm, setOccurrenceForm] = useState<{
    vehicleId: string;
    reasonId: string;
    description: string;
    responsibleSector: string;
    responsibleSectorId: string;
    assignedUserId: string;
    assignedUserName: string;
    driverPhone: string;
    photoUrls: string[];
    externalCost: string;
    paymentMethod: string;
  }>({
    vehicleId: '',
    reasonId: '',
    description: '',
    responsibleSector: '',
    responsibleSectorId: '',
    assignedUserId: '',
    assignedUserName: '',
    driverPhone: '',
    photoUrls: [],
    externalCost: '',
    paymentMethod: ''
  });
  
  const [isUploading, setIsUploading] = useState(false);
  
  const [reasonForm, setReasonForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    setOccurrences(initialOccurrences);
  }, [initialOccurrences]);

  useEffect(() => {
    setVehicles(initialVehicles);
  }, [initialVehicles]);

  // Deriving the selected occurrence from the live occurrences array to ensure data is always fresh
  const currentOccurrenceDetail = useMemo(() => {
    if (!selectedOccurrenceForDetails) return null;
    return occurrences.find(o => o.id === selectedOccurrenceForDetails.id) || selectedOccurrenceForDetails;
  }, [occurrences, selectedOccurrenceForDetails]);

  const currentOccurrenceForTreatment = useMemo(() => {
    if (!selectedOccurrenceForTreatment) return null;
    return occurrences.find(o => o.id === selectedOccurrenceForTreatment.id) || selectedOccurrenceForTreatment;
  }, [occurrences, selectedOccurrenceForTreatment]);

  const currentOccurrenceForRejection = useMemo(() => {
    if (!selectedOccurrenceForRejection) return null;
    return occurrences.find(o => o.id === selectedOccurrenceForRejection.id) || selectedOccurrenceForRejection;
  }, [occurrences, selectedOccurrenceForRejection]);

  const handleAddOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVehicle = vehicles.find(v => v.id === occurrenceForm.vehicleId);
    const selectedReason = reasons.find(r => r.id === occurrenceForm.reasonId);

    if (!selectedVehicle || !selectedReason) return;

    if (editingOccurrence) {
      try {
          await storageService.updateOccurrence(orgId, editingOccurrence.id, {
            vehicleId: selectedVehicle.id,
            vehiclePlate: selectedVehicle.plate,
            reasonId: selectedReason.id,
            reasonName: selectedReason.name,
            description: occurrenceForm.description,
            responsibleSector: occurrenceForm.responsibleSector,
            responsibleSectorId: occurrenceForm.responsibleSectorId,
            assignedUserId: occurrenceForm.assignedUserId,
            assignedUserName: occurrenceForm.assignedUserName,
            driverPhone: occurrenceForm.driverPhone,
            photoUrls: occurrenceForm.photoUrls,
            externalCost: occurrenceForm.externalCost ? parseFloat(occurrenceForm.externalCost) : undefined,
            paymentMethod: occurrenceForm.paymentMethod
          });
        await processMentions(occurrenceForm.description, selectedVehicle.plate);
        onNotification?.('success', 'Ocorrência Atualizada', 'Dados salvos com sucesso.');
      } catch (err) {
        onNotification?.('error', 'Erro ao Salvar', 'Tente novamente em instantes.');
      }
    } else {
      try {
        const newOccurrence: Occurrence = {
          id: Date.now().toString(),
          vehicleId: selectedVehicle.id,
          vehiclePlate: selectedVehicle.plate,
          reasonId: selectedReason.id,
          reasonName: selectedReason.name,
          description: occurrenceForm.description,
          responsibleSector: occurrenceForm.responsibleSector,
          responsibleSectorId: occurrenceForm.responsibleSectorId,
          assignedUserId: occurrenceForm.assignedUserId,
          assignedUserName: occurrenceForm.assignedUserName,
          driverPhone: occurrenceForm.driverPhone,
          photoUrls: occurrenceForm.photoUrls,
          externalCost: occurrenceForm.externalCost ? parseFloat(occurrenceForm.externalCost) : undefined,
          paymentMethod: occurrenceForm.paymentMethod,
          status: 'OPEN',
          treatments: [],
          createdAt: new Date().toISOString(),
          userId: user.uid || user.id,
          userName: user.displayName || user.name,
          branchId: user.branchId || undefined
        };
        await storageService.addOccurrence(orgId, newOccurrence);
        await processMentions(occurrenceForm.description, selectedVehicle.plate);
        onNotification?.('success', 'Ocorrência Registrada', 'Ocorrência aberta com sucesso.');
      } catch (err) {
        onNotification?.('error', 'Erro ao Registrar', 'Falha ao salvar no banco de dados.');
      }
    }
    
    setIsOccurrenceModalOpen(false);
    setEditingOccurrence(null);
    setOccurrenceForm({ 
      vehicleId: '', 
      reasonId: '', 
      description: '', 
      responsibleSector: '', 
      responsibleSectorId: '', 
      assignedUserId: '',
      assignedUserName: '',
      driverPhone: '', 
      photoUrls: [],
      externalCost: '',
      paymentMethod: ''
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    onNotification?.('info', 'Enviando Imagens', 'Aguarde o processamento...');
    try {
      const uploadPromises = Array.from(files).map(async file => {
        const path = `occurrences/${orgId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        return await storageService.uploadImage(path, file);
      });

      const urls = await Promise.all(uploadPromises);
      console.log("[Occurrences] Uploads finalizados, URLs obtidas:", urls.length);
      setOccurrenceForm(prev => ({
        ...prev,
        photoUrls: [...prev.photoUrls, ...urls]
      }));
      onNotification?.('success', 'Upload Concluído', `${files.length} imagem(ns) anexada(s).`);
    } catch (error) {
      console.error("Upload failed", error);
      onNotification?.('error', 'Erro no Upload', 'Não foi possível enviar as fotos.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setOccurrenceForm(prev => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== index)
    }));
  };

  const handleAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReason) {
      await storageService.updateOccurrenceReason(orgId, editingReason.id, {
        name: reasonForm.name,
        description: reasonForm.description
      });
    } else {
      const newReason: OccurrenceReason = {
        id: Date.now().toString(),
        name: reasonForm.name,
        description: reasonForm.description,
        branchId: user.branchId || undefined
      };
      await storageService.addOccurrenceReason(orgId, newReason);
    }
    
    setIsReasonModalOpen(false);
    setEditingReason(null);
    setReasonForm({ name: '', description: '' });
  };

  const handleUpdateStatus = async (occ: Occurrence, newStatus: 'ACCEPTED' | 'REJECTED' | 'RESOLVED', rejectionReason?: string) => {
    try {
      await storageService.updateOccurrence(orgId, occ.id, {
        status: newStatus,
        rejectionReason,
        resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : occ.resolvedAt
      });
      onNotification?.('success', 'Status Atualizado', `A ocorrência agora está como ${newStatus}.`);
    } catch (err) {
      onNotification?.('error', 'Erro', 'Não foi possível atualizar o status.');
    }
  };

  const processMentions = async (text: string, plate: string) => {
    const notifiedIds = new Set<string>();

    for (const member of teamMembers) {
      const currentUserId = user.uid || user.id;
      if (member.id === currentUserId) continue;

      const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`@${escapedName}`, 'i'); // Single 'i', test is safe.

      if (regex.test(text) && !notifiedIds.has(member.id)) {
        console.log(`Disparando notificação para ${member.name} (ID: ${member.id}) sobre placa ${plate}`);
        const currentUserName = user.displayName || user.name || user.email || 'Usuário';

        await storageService.addNotification(orgId, {
          id: 'not-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          recipientId: member.id,
          senderId: currentUserId,
          senderName: currentUserName,
          text: `Você foi marcado na ocorrência da placa: ${plate || 'Indisponível'}.`,
          read: false,
          createdAt: new Date().toISOString()
        });
        notifiedIds.add(member.id);
      }
    }
  };

  const handleAddTreatment = async (occ: Occurrence, treatmentDescription: string) => {
    if (!treatmentDescription.trim()) return;
    
    try {
      const newTreatment = {
        id: Date.now().toString(),
        description: treatmentDescription,
        userId: user.uid || user.id,
        userName: user.displayName || user.name || user.email || 'Usuário',
        createdAt: new Date().toISOString()
      };

      await storageService.addOccurrenceTreatment(orgId, occ.id, newTreatment);

      // Notify mentioned people
      await processMentions(treatmentDescription, occ.vehiclePlate);

      onNotification?.('success', 'Tratativa Adicionada', 'A tratativa foi registrada com sucesso.');
      setCustomTreatment('');
    } catch (err) {
      onNotification?.('error', 'Erro', 'Não foi possível salvar a tratativa.');
    }
  };

  const handleImportOSData = (occ: Occurrence) => {
    if (!occ.linkedServiceOrderId) {
      onNotification?.('info', 'Sem O.S. Vinculada', 'Esta ocorrência não possui uma Ordem de Serviço vinculada.');
      return;
    }
    
    const linkedOS = serviceOrders.find(os => os.id === occ.linkedServiceOrderId);
    if (!linkedOS) {
      onNotification?.('error', 'O.S. não encontrada', 'Não foi possível localizar os dados da O.S. vinculada.');
      return;
    }

    const servicesStr = linkedOS.services?.map(s => s.name).join(', ') || 'Nenhum serviço registrado';
    const partsStr = linkedOS.parts?.map(p => `${p.name} (${p.quantity}x)`).join(', ') || 'Nenhuma peça registrada';
    const costStr = (linkedOS.totalCost !== undefined) ? `R$ ${linkedOS.totalCost.toLocaleString('pt-BR')}` : 'Não informado';
    
    const summary = `📄 RESUMO DA O.S. #${linkedOS.orderNumber}:\n` +
      `--------------------------------\n` +
      `📌 Status: ${linkedOS.status}\n` +
      `🛠️ Serviços: ${servicesStr}\n` +
      `📦 Peças: ${partsStr}\n` +
      `💰 Custo Total: ${costStr}\n` +
      `👤 Responsável: ${linkedOS.collaboratorName || 'Não informado'}\n` +
      `📝 Detalhes: ${linkedOS.details || 'Sem observações'}`;

    setCustomTreatment(prev => prev ? prev + '\n\n' + summary : summary);
    onNotification?.('success', 'Dados Importados', 'Informações da O.S. foram adicionadas à tratativa.');
  };

  const handleLinkExistingOS = async (occ: Occurrence, osId: string) => {
    if (!osId) return;
    const os = serviceOrders.find(o => o.id === osId);
    if (!os) return;

    try {
      await storageService.updateOccurrence(orgId, occ.id, {
        linkedServiceOrderId: os.id,
        linkedServiceOrderNumber: os.orderNumber.toString()
      });
      await storageService.updateServiceOrder(orgId, os.id, {
        occurrenceId: occ.id
      });
      onNotification?.('success', 'Sucesso', `Ocorrência vinculada à O.S. #${os.orderNumber}`);
      
      // Update local state if needed (optional since App.tsx is sync)
      setIsLinkingExistingOS(false);
      setSelectedOSIdToLink('');
      
      if (selectedOccurrenceForDetails?.id === occ.id) {
        setSelectedOccurrenceForDetails({
          ...occ,
          linkedServiceOrderId: os.id,
          linkedServiceOrderNumber: os.orderNumber.toString()
        });
      }
      if (selectedOccurrenceForTreatment?.id === occ.id) {
        setSelectedOccurrenceForTreatment(null);
      }
    } catch (err) {
      onNotification?.('error', 'Erro', 'Não foi possível vincular a O.S.');
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedOccurrenceForRejection || !rejectionReason.trim()) return;
    
    setIsSubmittingRejection(true);
    try {
      const rejectionTreatment = {
        id: 'sys-' + Date.now().toString(),
        description: `⚠️ REJEITADA: Ocorrência recusada por ${user.displayName || user.name} motivo: "${rejectionReason}"`,
        userId: 'SYSTEM',
        userName: 'Sistema de Fluxo',
        createdAt: new Date().toISOString()
      };

      if (redirectSectorId) {
        const targetSector = sectors.find(s => s.id === redirectSectorId);
        if (targetSector) {
          rejectionTreatment.description = `⚠️ RE-DIRECIONADO: Ocorrência recusada por ${user.displayName || user.name} motivo: "${rejectionReason}". Enviado para o setor: ${targetSector.name}`;
          
          await storageService.addOccurrenceRejection(
            orgId,
            selectedOccurrenceForRejection.id,
            rejectionTreatment,
            targetSector.name,
            targetSector.id
          );
        }
      } else {
        await storageService.addOccurrenceRejection(
          orgId,
          selectedOccurrenceForRejection.id,
          rejectionTreatment,
          undefined,
          undefined
        );
      }

      const successMsg = redirectSectorId ? 'Ocorrência Redirecionada' : 'Ocorrência Recusada';
      onNotification?.('success', successMsg, 'O status foi atualizado com sucesso.');
      
      setSelectedOccurrenceForRejection(null);
      setRejectionReason('');
      setRedirectSectorId('');
    } catch (err) {
      onNotification?.('error', 'Erro ao Atualizar', 'Falha ao processar a recusa.');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleMentionChange = (value: string, pos: number, field: 'treatment' | 'description' | 'chat') => {
    setCursorPosition(pos);
    setMentionTargetField(field);

    if (field === 'treatment') setCustomTreatment(value);
    else if (field === 'chat') setChatMessage(value);
    else setOccurrenceForm(prev => ({ ...prev, description: value }));

    // Optimized mention detection
    const beforeCursor = value.slice(0, pos);
    const lastAt = beforeCursor.lastIndexOf('@');

    // Trigger if @ is found and it's the start of a word
    if (lastAt !== -1) {
      const charBeforeAt = lastAt > 0 ? beforeCursor[lastAt - 1] : null;
      if (!charBeforeAt || charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = beforeCursor.slice(lastAt + 1);
        // Don't close if query has spaces, but only if it's a short search
        if (!query.includes(' ') || query.length < 2) {
          console.log(`[Mentions] Triggered for field ${field}. Members: ${teamMembers.length}, Query: "${query}"`);
          setMentionSearch(query.trim());
          setShowMentionSuggestions(true);
          return;
        }
      }
    }
    setShowMentionSuggestions(false);
  };

  const insertMention = (member: TeamMember) => {
    if (!mentionTargetField) return;

    let currentText = '';
    if (mentionTargetField === 'treatment') currentText = customTreatment;
    else if (mentionTargetField === 'chat') currentText = chatMessage;
    else currentText = occurrenceForm.description;

    const beforeAt = currentText.slice(0, currentText.lastIndexOf('@', cursorPosition - 1));
    const afterAt = currentText.slice(cursorPosition);
    const newValue = `${beforeAt}@${member.name} ${afterAt}`;

    if (mentionTargetField === 'treatment') setCustomTreatment(newValue);
    else if (mentionTargetField === 'chat') setChatMessage(newValue);
    else setOccurrenceForm(prev => ({ ...prev, description: newValue }));

    setShowMentionSuggestions(false);
    setMentionTargetField(null);
  };

  const handleTreatmentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleMentionChange(e.target.value, e.target.selectionStart, 'treatment');
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleMentionChange(e.target.value, e.target.selectionStart, 'description');
  };

  const handleChatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleMentionChange(e.target.value, e.target.selectionStart, 'chat');
  };

  const handleSendMessage = async (occ: Occurrence) => {
    if (!chatMessage.trim()) return;
    
    setIsSendingMessage(true);
    try {
      const newMessage = {
        id: Date.now().toString(),
        text: chatMessage,
        userId: user.uid || user.id,
        userName: user.displayName || user.name || user.email || 'Usuário',
        createdAt: new Date().toISOString()
      };

      await storageService.addOccurrenceChat(orgId, occ.id, newMessage);
      
      // Notify mentioned people
      await processMentions(chatMessage, occ.vehiclePlate);

      setChatMessage('');
    } catch (err) {
      onNotification?.('error', 'Erro', 'Não foi possível enviar a mensagem.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedOccurrenceForDetails?.chat]);

  // Responsible selection options (Team + Collaborators)
  const responsibleOptions = useMemo(() => {
    const options = [
      ...teamMembers.map(m => ({ id: m.id, name: m.name, type: 'Equipe' })),
      ...collaborators.map(c => ({ id: c.id, name: c.name, type: 'Prestador/Ajudante' }))
    ];
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [teamMembers, collaborators]);

  const handleDeleteOccurrence = async (occurrence: Occurrence) => {
    if (userLevel !== 'SENIOR' && userLevel !== 'ADMIN' && userLevel !== 'CREATOR') {
      if (occurrence.status === 'PENDING_DELETION') {
        onNotification?.('error', 'Ops!', 'Esta exclusão já está aguardando aprovação de um sênior.');
        return;
      }
      if (window.confirm('Você não tem permissão para excluir. Deseja enviar para aprovação de um Sênior?')) {
        try {
          await storageService.updateOccurrence(orgId, occurrence.id, { 
            status: 'PENDING_DELETION',
            deletionRequestedBy: user.displayName || user.name || user.email || 'Usuário'
          });
          onNotification?.('success', 'Sucesso', 'Solicitação de exclusão enviada para aprovação.');
        } catch (err) {
          onNotification?.('error', 'Erro', 'Falha ao solicitar exclusão.');
        }
      }
      return;
    }

    if (window.confirm('Você é um usuário Sênior. Tem certeza que deseja excluir esta ocorrência definitivamente?')) {
      try {
        await storageService.deleteOccurrence(orgId, occurrence.id, occurrence.vehiclePlate);
        if (selectedOccurrenceForDetails?.id === occurrence.id) setSelectedOccurrenceForDetails(null);
        onNotification?.('success', 'Sucesso', 'Ocorrência excluída.');
      } catch (err) {
        onNotification?.('error', 'Erro ao Excluir', 'Verifique suas permissões ou tente novamente.');
      }
    }
  };

  const handleRestoreOccurrence = async (occurrence: Occurrence) => {
    if (window.confirm('Deseja cancelar a solicitação de exclusão e restaurar?')) {
      try {
        await storageService.updateOccurrence(orgId, occurrence.id, { 
          status: 'OPEN',
          deletionRequestedBy: ''
        });
        onNotification?.('success', 'Restaurada', 'A ocorrência voltou ao estado Aberta.');
      } catch (err) {
        onNotification?.('error', 'Erro', 'Falha ao restaurar ocorrência.');
      }
    }
  };

  const handleDeleteReason = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este motivo?')) {
      await storageService.deleteOccurrenceReason(orgId, id);
    }
  };

  const filteredOccurrences = occurrences.filter(occ => {
    const matchesSearch = occ.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         occ.reasonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         occ.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || occ.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            Gestão de Ocorrências
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Controle de quebras, reparos e fluxos do time de manutenção</p>
        </div>
        
        <div className="flex items-center gap-3">
          {(userLevel === 'SENIOR' || userLevel === 'ADMIN' || userLevel === 'CREATOR') && (
            <button
              onClick={() => {
                setEditingReason(null);
                setReasonForm({ name: '', description: '' });
                setIsReasonModalOpen(true);
              }}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow flex items-center gap-2 font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Novo Motivo
            </button>
          )}
          <button
            onClick={() => {
              setEditingOccurrence(null);
              setOccurrenceForm({ 
                vehicleId: '', 
                reasonId: '', 
                description: '', 
                responsibleSector: '', 
                responsibleSectorId: '', 
                assignedUserId: '',
                assignedUserName: '',
                driverPhone: '', 
                photoUrls: [],
                externalCost: '',
                paymentMethod: ''
              });
              setIsOccurrenceModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all hover:shadow-md flex items-center gap-2 font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Abrir Ocorrência
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 border-b-2 font-bold text-sm transition-colors relative ${
            activeTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Lista de Ocorrências
        </button>
        <button
          onClick={() => setActiveTab('reasons')}
          className={`pb-3 border-b-2 font-bold text-sm transition-colors relative ${
            activeTab === 'reasons' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Catálogo de Motivos
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-4">
          {/* Filters Bar - Bento style */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por placa, motivo, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <Filter className="text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-bold text-gray-700 outline-none focus:ring-0 cursor-pointer pr-4"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="OPEN">Abertas</option>
                  <option value="ACCEPTED">Em Andamento</option>
                  <option value="RESOLVED">Resolvidas</option>
                  <option value="REJECTED">Recusadas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Occurrences List */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA] border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Veículo</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Motivo / Descrição</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Equipe</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Valores</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Fluxo</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(showAllOccurrences ? filteredOccurrences : filteredOccurrences.slice(0, 10)).map((occ) => (
                    <tr 
                      key={occ.id} 
                      onClick={() => setSelectedOccurrenceForDetails(occ)}
                      className="hover:bg-[#FCFDFF] group transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:border-blue-100 group-hover:bg-blue-50 transition-colors">
                            <Truck className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-[13px]">{occ.vehiclePlate}</div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-1 font-medium mt-0.5">
                              {occ.driverPhone ? (
                                <>
                                  <Phone className="w-2.5 h-2.5 text-gray-400" />
                                  {occ.driverPhone}
                                </>
                              ) : (
                                `ID: ${occ.vehicleId.slice(0, 8)}`
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 text-[13px]">{occ.reasonName}</div>
                        <div className="text-[11px] text-gray-500 truncate max-w-[200px] mt-0.5" title={occ.description || 'Sem descrição'}>
                          {occ.description || 'Sem descrição...'}
                        </div>
                        {occ.photoUrls && occ.photoUrls.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {occ.photoUrls.slice(0, 3).map((url, i) => (
                              <div 
                                key={i} 
                                className="w-5 h-5 rounded overflow-hidden shadow-sm border border-gray-200/50"
                              >
                                <img src={url} alt="Evidência" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {occ.photoUrls.length > 3 && (
                              <div className="w-5 h-5 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                                +{occ.photoUrls.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-100 rounded-md text-[11px] font-bold text-gray-700">
                          <User className="w-3 h-3 text-gray-400" />
                          {(occ.userName || 'Sistema').split(' ')[0]}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {occ.externalCost ? (
                          <div className="space-y-0.5">
                            <div className="text-[13px] font-bold text-gray-900 tracking-tight">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(occ.externalCost)}
                            </div>
                            {occ.paymentMethod && (
                              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{occ.paymentMethod}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {occ.linkedServiceOrderNumber ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold whitespace-nowrap">
                            <FileText className="w-3 h-3" />
                            #{occ.linkedServiceOrderNumber}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">...</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                          occ.status === 'OPEN' ? 'bg-amber-50 text-amber-700 border-amber-200/50' :
                          occ.status === 'PENDING_DELETION' ? 'bg-red-50 text-red-600 border-red-200/50 animate-pulse' :
                          occ.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-200/50' :
                          occ.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200/50' :
                          'bg-green-50 text-green-700 border-green-200/50'
                        }`}>
                          {occ.status === 'OPEN' && 'PENDENTE'}
                          {occ.status === 'PENDING_DELETION' && 'EXCLUSÃO SOLICITADA'}
                          {occ.status === 'ACCEPTED' && 'EM ANDAMENTO'}
                          {occ.status === 'REJECTED' && 'RECUSADO'}
                          {occ.status === 'RESOLVED' && 'RESOLVIDO'}
                        </span>
                        {(occ.responsibleSector || occ.assignedUserName) && (
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            {occ.responsibleSector && (
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                {occ.responsibleSector}
                              </div>
                            )}
                          </div>
                        )}
                        {occ.status === 'PENDING_DELETION' && occ.deletionRequestedBy && (
                          <div className="text-[9px] font-bold text-red-500 uppercase mt-1">
                            Por: {occ.deletionRequestedBy.split(' ')[0]}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Workflow Actions */}
                          {occ.status === 'PENDING_DELETION' && (userLevel === 'SENIOR' || userLevel === 'ADMIN' || userLevel === 'CREATOR') ? (
                            <>
                              <button
                                onClick={() => handleRestoreOccurrence(occ)}
                                className="px-2 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                title="Cancelar Exclusão"
                              >
                                RESTAURAR
                              </button>
                              <button
                                onClick={() => handleDeleteOccurrence(occ)}
                                className="px-2 py-1.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg hover:bg-red-200 transition-colors"
                                title="Aprovar Exclusão"
                              >
                                CONFIRMAR EXCLUSÃO
                              </button>
                            </>
                          ) : occ.status === 'PENDING_DELETION' ? (
                             <span className="text-[10px] items-center text-gray-400 italic pr-2">Aguardando Avaliação</span>
                          ) : (
                            <>
                              {occ.status === 'OPEN' && (occ.assignedUserId === user.uid || (occ.responsibleSectorId && user.sectorId === occ.responsibleSectorId) || userLevel === 'CREATOR' || userLevel === 'ADMIN') && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(occ, 'ACCEPTED')}
                                    className="px-2 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition-colors"
                                    title="Aceitar Responsabilidade"
                                  >
                                    ASSUMIR
                                  </button>
                                  <button
                                    onClick={() => setSelectedOccurrenceForRejection(occ)}
                                    className="px-2 py-1.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-colors"
                                    title="Recusar Responsabilidade"
                                  >
                                    RECUSAR
                                  </button>
                                </>
                              )}

                              {occ.status === 'ACCEPTED' && (
                                <button
                                  onClick={() => setSelectedOccurrenceForTreatment(occ)}
                                  className="px-2.5 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-1 transition-all shadow-sm"
                                >
                                  <MessageSquare className="w-3 h-3" /> TRATATIVA
                                </button>
                              )}

                              {(occ.status === 'OPEN' || occ.status === 'ACCEPTED') && (
                                <button
                                  onClick={() => handleUpdateStatus(occ, 'RESOLVED')}
                                  className="w-8 h-8 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg transition-colors ml-1"
                                  title="Marcar como Resolvido"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}

                          {occ.status === 'OPEN' && (
                            <button
                              onClick={() => onGenerateOS(occ.id, occ.vehicleId)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors border ${occ.linkedServiceOrderId ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}
                              title={occ.linkedServiceOrderId ? "OS já gerada. Clique para gerar outra." : "Gerar OS a partir deste chamado"}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                          
                          <div className="w-px h-6 bg-gray-200 mx-1" />

                          <button
                            onClick={() => {
                              setEditingOccurrence(occ);
                              setOccurrenceForm({
                                vehicleId: occ.vehicleId,
                                reasonId: occ.reasonId,
                                description: occ.description || '',
                                responsibleSector: occ.responsibleSector || '',
                                responsibleSectorId: occ.responsibleSectorId || '',
                                assignedUserId: occ.assignedUserId || '',
                                assignedUserName: occ.assignedUserName || '',
                                driverPhone: occ.driverPhone || '',
                                photoUrls: occ.photoUrls || [],
                                externalCost: occ.externalCost ? occ.externalCost.toString() : '',
                                paymentMethod: occ.paymentMethod || ''
                              });
                              setIsOccurrenceModalOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOccurrence(occ)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                    </tr>
                  ))}
                  {filteredOccurrences.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <AlertTriangle className="w-8 h-8 text-gray-300" />
                          <p className="text-sm font-medium">Nenhuma ocorrência encontrada.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredOccurrences.length > 10 && (
              <div className="flex justify-center p-6 border-t border-gray-100">
                <button 
                  onClick={() => setShowAllOccurrences(!showAllOccurrences)}
                  className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
                >
                  {showAllOccurrences ? 'Ver Menos' : `Ver Todas as Ocorrências (${filteredOccurrences.length})`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Reasons List */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(showAllReasons ? reasons : reasons.slice(0, 9)).map((reason) => (
              <div key={reason.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  {(userLevel === 'SENIOR' || userLevel === 'ADMIN' || userLevel === 'CREATOR') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingReason(reason);
                          setReasonForm({
                            name: reason.name,
                            description: reason.description || ''
                          });
                          setIsReasonModalOpen(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReason(reason.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-2">{reason.name}</h3>
                <p className="text-gray-500 text-xs font-medium leading-relaxed line-clamp-3">
                  {reason.description || 'Sem descrição detalhada.'}
                </p>
              </div>
            ))}
            {reasons.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-500">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileText className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-medium">Nenhum motivo cadastrado.</p>
                </div>
              </div>
            )}
          </div>
          {reasons.length > 9 && (
            <div className="flex justify-center">
              <button 
                onClick={() => setShowAllReasons(!showAllReasons)}
                className="px-8 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2 shadow-sm"
              >
                {showAllReasons ? 'Ver Menos' : `Ver Todos os Motivos (${reasons.length})`}
              </button>
            </div>
          )}
        </div>
    )}

      {/* Occurrence Modal */}
      <AnimatePresence>
        {isOccurrenceModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[95vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingOccurrence ? 'Editar Ocorrência' : 'Registrar Ocorrência'}
                </h2>
                <button onClick={() => setIsOccurrenceModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleAddOccurrence} className="p-6 space-y-4 overflow-y-auto">
                <SearchableSelect
                  label="Veículo"
                  required
                  placeholder="Selecione um veículo..."
                  options={vehicles.map(v => ({ id: v.id, label: v.plate, subLabel: v.model }))}
                  value={occurrenceForm.vehicleId}
                  onChange={(val) => {
                    const vehicle = vehicles.find(v => v.id === val);
                    const driver = drivers.find(d => d.id === vehicle?.currentDriverId);
                    setOccurrenceForm({ 
                      ...occurrenceForm, 
                      vehicleId: val,
                      driverPhone: driver?.phone || occurrenceForm.driverPhone
                    });
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                    <select
                      required
                      value={occurrenceForm.reasonId}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, reasonId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Selecione um motivo</option>
                      {reasons.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setor Responsável *</label>
                    <select
                      required
                      value={occurrenceForm.responsibleSectorId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const sector = sectors.find(s => s.id === selectedId);
                        setOccurrenceForm({ 
                          ...occurrenceForm, 
                          responsibleSectorId: selectedId,
                          responsibleSector: sector ? sector.name : '' 
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Selecione um setor...</option>
                      {sectors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                       <User className="w-4 h-4 text-gray-400" />
                       Responsável pelo Serviço
                    </label>
                    <select
                      value={occurrenceForm.assignedUserId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const resp = responsibleOptions.find(o => o.id === id);
                        setOccurrenceForm({ 
                          ...occurrenceForm, 
                          assignedUserId: id,
                          assignedUserName: resp ? resp.name : ''
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Selecione um responsável...</option>
                      {responsibleOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name} ({opt.type})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Telefone do Motorista
                    </label>
                    <input
                      type="text"
                      value={occurrenceForm.driverPhone}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, driverPhone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: (11) 98888-7777"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custo Externo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={occurrenceForm.externalCost}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, externalCost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                    <select
                      value={occurrenceForm.paymentMethod}
                      onChange={(e) => setOccurrenceForm({ ...occurrenceForm, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Selecione...</option>
                      {paymentMethods.map(pm => (
                        <option key={pm.id} value={pm.name}>{pm.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Detalhes</label>
                  <textarea
                    value={occurrenceForm.description}
                    onChange={handleDescriptionChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="Descreva o que aconteceu... use @ para marcar alguém"
                  />

                  {/* Mentions for Description */}
                  <AnimatePresence>
                    {showMentionSuggestions && mentionTargetField === 'description' && teamMembers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-[80] max-h-40 overflow-y-auto custom-scrollbar"
                      >
                        {teamMembers
                          .filter(m => !mentionSearch || m.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                          .map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => insertMention(member)}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-0"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-800">{member.name}</div>
                              <div className="text-[10px] text-gray-500">{member.role}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-gray-400" />
                    Anexar Imagens / Evidências
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {occurrenceForm.photoUrls.map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={url} alt="Evidência" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploading ? (
                        <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400" />
                          <span className="text-[10px] font-bold text-gray-500 mt-1 uppercase">Anotar</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        disabled={isUploading} 
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsOccurrenceModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    {editingOccurrence ? 'Salvar Alterações' : 'Registrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details / History Modal (Slide-out Side Sheet) */}
      <AnimatePresence>
        {currentOccurrenceDetail && (
          <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-[2px]">
            {/* Click outside to close (optional - requires wrapper, but here we just leave backdrop) */}
            <div className="absolute inset-0" onClick={() => setSelectedOccurrenceForDetails(null)} />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white shadow-2xl w-full max-w-4xl h-full overflow-hidden flex flex-col relative z-10 border-l border-gray-200"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">Painel da Ocorrência</h2>
                    <p className="text-xs text-gray-500 font-medium tracking-wide text-[10px] uppercase">
                      ID: {currentOccurrenceDetail.id.slice(0, 8)} • PLACA: {currentOccurrenceDetail.vehiclePlate}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOccurrenceForDetails(null)} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/50">
                {/* Details Section */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-200 custom-scrollbar bg-white">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        currentOccurrenceDetail.status === 'OPEN' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        currentOccurrenceDetail.status === 'ACCEPTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        currentOccurrenceDetail.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        {currentOccurrenceDetail.status}
                      </div>
                      <div className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(currentOccurrenceDetail.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm shadow-black/5 hover:border-gray-300 transition-colors">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Motivo</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">{currentOccurrenceDetail.reasonName}</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm shadow-black/5 hover:border-gray-300 transition-colors">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Setor</div>
                        <div className="text-sm font-bold text-gray-800 leading-tight">{currentOccurrenceDetail.responsibleSector || 'Não definido'}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mb-2 tracking-wider ml-1">Descrição</div>
                      <div className="text-sm text-gray-700 bg-gray-50/80 p-5 rounded-2xl border border-gray-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {currentOccurrenceDetail.description || <span className="italic text-gray-400">Sem descrição detalhada.</span>}
                      </div>
                    </div>

                    {currentOccurrenceDetail.rejectionReason && (
                      <div className="bg-red-50/80 p-5 rounded-2xl border border-red-100/50">
                        <div className="text-[10px] text-red-500 font-bold uppercase mb-2 flex items-center gap-1.5 tracking-wider">
                           <AlertTriangle className="w-3.5 h-3.5" /> Justificativa de Recusa
                        </div>
                        <p className="text-sm text-red-800 italic leading-relaxed">"{currentOccurrenceDetail.rejectionReason}"</p>
                      </div>
                    )}

                    {currentOccurrenceDetail.photoUrls && currentOccurrenceDetail.photoUrls.length > 0 && (
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-2 tracking-wider ml-1">Anexos</div>
                        <div className="grid grid-cols-3 gap-3">
                          {currentOccurrenceDetail.photoUrls.map((url, i) => (
                            <img 
                              key={i} 
                              src={url} 
                              alt="Evidência" 
                              className="w-full h-28 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 hover:shadow-md transition-all"
                              onClick={() => window.open(url, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mb-3 flex justify-between items-center tracking-wider ml-1 border-b border-gray-100 pb-2">
                        Histórico de Tratativas
                        <History className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div className="space-y-4">
                        {currentOccurrenceDetail.treatments && currentOccurrenceDetail.treatments.length > 0 ? (
                          currentOccurrenceDetail.treatments.map((t, index) => (
                            <div key={t.id} className="relative pl-4">
                              {/* Timeline line */}
                              {index !== currentOccurrenceDetail.treatments!.length - 1 && (
                                <div className="absolute left-0 top-3 bottom-0 w-0.5 bg-gray-100 -ml-px h-full translate-y-3" />
                              )}
                              {/* Timeline dot */}
                              <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-400 ring-4 ring-white -ml-1 border border-blue-500" />
                              
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm group hover:border-blue-200 transition-colors">
                                <p className="text-[13px] text-gray-700 mb-2.5 leading-relaxed">{t.description}</p>
                                <div className="flex justify-between items-center text-[10px] font-medium">
                                  <span className="text-gray-900 border px-2 py-0.5 rounded-full bg-gray-50">{t.userName}</span>
                                  <span className="text-gray-400 group-hover:text-blue-500 transition-colors">{new Date(t.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed text-center px-4">
                            <History className="w-6 h-6 text-gray-300 mb-2" />
                            <p className="text-xs text-gray-400 font-medium">Nenhuma tratativa registrada ainda.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-10 pt-4 border-t border-gray-200 flex flex-col gap-3 pb-8">
                    {!currentOccurrenceDetail.linkedServiceOrderId && (
                      <div className="space-y-3">
                         <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <input 
                              type="checkbox" 
                              id="link_existing_details" 
                              checked={isLinkingExistingOS}
                              onChange={(e) => setIsLinkingExistingOS(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="link_existing_details" className="text-xs font-bold text-blue-800 uppercase cursor-pointer">VINCULAR A UMA O.S. JÁ ABERTA?</label>
                         </div>

                         {isLinkingExistingOS ? (
                           <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                              <select 
                                value={selectedOSIdToLink}
                                onChange={(e) => setSelectedOSIdToLink(e.target.value)}
                                className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Selecione a O.S. correspondente...</option>
                                {serviceOrders
                                  .filter(os => (os.status === 'PENDENTE' || os.status === 'EM_ANDAMENTO') && os.vehiclePlate === currentOccurrenceDetail.vehiclePlate)
                                  .map(os => (
                                    <option key={os.id} value={os.id}>
                                      O.S. #{String(os.orderNumber).padStart(4, '0')} - {os.title}
                                    </option>
                                  ))}
                              </select>
                              <button
                                disabled={!selectedOSIdToLink}
                                onClick={() => handleLinkExistingOS(currentOccurrenceDetail, selectedOSIdToLink)}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" /> VINCULAR OCORRÊNCIA À O.S.
                              </button>
                           </div>
                         ) : (
                           <button
                            onClick={() => {
                              onGenerateOS(currentOccurrenceDetail!.id, currentOccurrenceDetail!.vehicleId);
                              setSelectedOccurrenceForDetails(null);
                            }}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow"
                          >
                            <Plus className="w-4 h-4" /> ABRIR NOVA O.S. POR ESTE CHAMADO
                          </button>
                         )}
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedOccurrenceForDetails(null)}
                      className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-bold text-sm"
                    >
                      Fechar Painel
                    </button>
                  </div>
                </div>

                {/* Chat Section */}
                <div className="w-full md:w-1/2 flex flex-col bg-[#F9FAFB] relative shadow-inner">
                  <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0 shadow-sm z-10">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight">Discussão Interna</h3>
                      <p className="text-[10px] text-gray-500 font-medium">Equipe de Manutenção e Frota</p>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                    {currentOccurrenceDetail.chat && currentOccurrenceDetail.chat.length > 0 ? (
                      currentOccurrenceDetail.chat.map((msg, i) => {
                        const isMe = msg.userId === (user.uid || user.id);
                        return (
                          <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2`}>
                            <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <span className={`text-[10px] font-bold mb-1 tracking-wide uppercase ${isMe ? 'text-blue-500 pr-1' : 'text-gray-500 pl-1'}`}>
                                {msg.userName}
                              </span>
                              
                              <div className={`relative px-4 py-3 shadow-sm ${
                                isMe 
                                  ? 'bg-blue-600 text-white rounded-[20px] rounded-tr-sm' 
                                  : 'bg-white text-gray-800 rounded-[20px] rounded-tl-sm border border-gray-200/60 shadow-black/5'
                              }`}>
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                                
                                <div className={`text-[9px] mt-2 flex items-center gap-1 font-medium select-none ${isMe ? 'text-blue-200/80' : 'text-gray-400'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  {isMe && <CheckCircle2 className="w-3 h-3 opacity-90" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 opacity-60 p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                          <MessageSquare className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Nenhuma mensagem ainda.</p>
                        <p className="text-xs">Este é o canal direto para resolver dúvidas desta ocorrência.</p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-gray-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <div className="flex items-end gap-3 relative">
                      {/* Mentions for Chat */}
                      <AnimatePresence>
                        {showMentionSuggestions && mentionTargetField === 'chat' && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute bottom-full left-0 right-0 mb-3 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[9999] max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-black/5 overflow-hidden"
                          >
                            <div className="px-4 py-2 bg-gray-50/80 sticky top-0 backdrop-blur-md border-b border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <User className="w-3 flex-shrink-0" /> Mencionar Equipe
                            </div>
                            {teamMembers.length === 0 ? (
                              <div className="p-4 text-center">
                                <Loader className="w-4 h-4 animate-spin text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">Buscando equipe...</p>
                              </div>
                            ) : teamMembers.filter(m => !mentionSearch || m.name.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 ? (
                              <div className="p-4 text-center border-t border-dashed border-gray-100">
                                <p className="text-xs text-gray-400">Nenhum membro encontrado</p>
                              </div>
                            ) : (
                              teamMembers
                                .filter(m => !mentionSearch || m.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                .map((member, idx) => (
                                <button
                                  key={member.id}
                                  onClick={() => insertMention(member)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 outline-none text-sm flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold ring-2 ring-white group-hover:scale-105 transition-transform">
                                    {member.name.charAt(0)}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                    <div className="font-bold text-gray-900 leading-none mb-1 truncate">{member.name}</div>
                                    <div className="text-[10px] text-gray-500 font-medium uppercase truncate">{member.role}</div>
                                  </div>
                                </button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-inner">
                        <textarea 
                          rows={1}
                          value={chatMessage}
                          onChange={(e: any) => handleChatChange(e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !showMentionSuggestions) {
                              e.preventDefault();
                              handleSendMessage(currentOccurrenceDetail);
                            }
                          }}
                          placeholder="Digite aqui... use @ para mencionar"
                          className="w-full bg-transparent p-3.5 text-[13px] outline-none resize-none custom-scrollbar min-h-[44px] max-h-32"
                        />
                      </div>
                      <button 
                        onClick={() => handleSendMessage(currentOccurrenceDetail)}
                        disabled={!chatMessage.trim() || isSendingMessage}
                        className="w-[48px] h-[48px] flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all hover:shadow-lg hover:shadow-blue-600/20 active:scale-95 shrink-0"
                      >
                        {isSendingMessage ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Treatment Selection Modal */}
      <AnimatePresence>
        {selectedOccurrenceForTreatment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
                <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Nova Tratativa
                </h2>
                <button onClick={() => setSelectedOccurrenceForTreatment(null)} className="p-2 hover:bg-blue-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-blue-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Opções Sugeridas:</div>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {TREATMENT_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleAddTreatment(selectedOccurrenceForTreatment, suggestion);
                        setSelectedOccurrenceForTreatment(null);
                      }}
                      className="text-left p-3 text-sm bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl border border-gray-100 hover:border-blue-200 transition-all font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4 relative">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-xs font-bold text-gray-500 uppercase">Personalizada:</label>
                     {selectedOccurrenceForTreatment.linkedServiceOrderId && (
                       <button
                         onClick={() => handleImportOSData(selectedOccurrenceForTreatment)}
                         className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors shadow-sm"
                         title="Trazer detalhes do que foi feito na O.S."
                       >
                         <FileText className="w-3 h-3" />
                         IMPORTAR DADOS DA O.S.
                       </button>
                     )}
                   </div>
                   <textarea
                    value={customTreatment}
                    onChange={handleTreatmentChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Descreva outra ação... use @ para marcar alguém"
                   />

                   {/* Mentions Suggestions for Treatment */}
                   <AnimatePresence>
                     {showMentionSuggestions && mentionTargetField === 'treatment' && (
                       <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto custom-scrollbar ring-1 ring-black/5"
                       >
                         <div className="p-2 border-b border-gray-50 bg-gray-50/50 sticky top-0 backdrop-blur-sm">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Mencionar Equipe</span>
                         </div>
                         {teamMembers.length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-xs text-gray-500 italic">Carregando membros da equipe...</p>
                            </div>
                          ) : teamMembers.filter(m => !mentionSearch || m.name.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 ? (
                            <div className="p-4 text-center">
                              <p className="text-xs text-gray-400 italic">Nenhum membro encontrado para "{mentionSearch}"</p>
                            </div>
                          ) : (
                           teamMembers
                             .filter(m => !mentionSearch || m.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                             .map(member => (
                             <button
                              key={member.id}
                              onClick={() => insertMention(member)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                             >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold ring-2 ring-white">
                                 {member.name.charAt(0)}
                               </div>
                               <div>
                                 <div className="font-bold text-gray-800 leading-none mb-1">{member.name}</div>
                                 <div className="text-[10px] text-gray-500 font-medium uppercase">{member.role}</div>
                               </div>
                             </button>
                           ))
                         )}
                       </motion.div>
                     )}
                   </AnimatePresence>
                </div>
                
                {!selectedOccurrenceForTreatment.linkedServiceOrderId && (
                  <div className="space-y-3 pt-2">
                     <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <input 
                          type="checkbox" 
                          id="link_existing_treatment" 
                          checked={isLinkingExistingOS}
                          onChange={(e) => setIsLinkingExistingOS(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="link_existing_treatment" className="text-xs font-bold text-indigo-800 uppercase cursor-pointer">VINCULAR A UMA O.S. JÁ ABERTA?</label>
                     </div>

                     {isLinkingExistingOS ? (
                       <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <select 
                            value={selectedOSIdToLink}
                            onChange={(e) => setSelectedOSIdToLink(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Selecione a O.S. correspondente...</option>
                            {serviceOrders
                              .filter(os => (os.status === 'PENDENTE' || os.status === 'EM_ANDAMENTO') && os.vehiclePlate === selectedOccurrenceForTreatment.vehiclePlate)
                              .map(os => (
                                <option key={os.id} value={os.id}>
                                  O.S. #{String(os.orderNumber).padStart(4, '0')} - {os.title}
                                </option>
                              ))}
                          </select>
                          <button
                            disabled={!selectedOSIdToLink}
                            onClick={() => handleLinkExistingOS(selectedOccurrenceForTreatment, selectedOSIdToLink)}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" /> VINCULAR OCORRÊNCIA À O.S.
                          </button>
                       </div>
                     ) : (
                       <button
                        onClick={() => {
                          onGenerateOS(selectedOccurrenceForTreatment.id, selectedOccurrenceForTreatment.vehicleId);
                          setSelectedOccurrenceForTreatment(null);
                        }}
                        className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-100"
                      >
                        <Plus className="w-4 h-4" /> ABRIR NOVA O.S. POR ESTE CHAMADO
                      </button>
                     )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setSelectedOccurrenceForTreatment(null)}
                  className="flex-1 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={!customTreatment.trim()}
                  onClick={() => {
                    handleAddTreatment(selectedOccurrenceForTreatment, customTreatment);
                    setCustomTreatment('');
                    setSelectedOccurrenceForTreatment(null);
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Salvar Custom
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {selectedOccurrenceForRejection && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-red-50">
                <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
                  <X className="w-5 h-5" />
                  Recusar Ocorrência
                </h2>
                <button onClick={() => setSelectedOccurrenceForRejection(null)} className="p-2 hover:bg-red-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-red-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivo da Recusa:</label>
                  <div className="space-y-2">
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Selecione um motivo...</option>
                      {REJECTION_REASONS.map((r, i) => <option key={i} value={r}>{r}</option>)}
                      <option value="OUTRO">Outro (Descrever abaixo)</option>
                    </select>
                  </div>
                </div>

                {rejectionReason === 'OUTRO' && (
                  <textarea
                    placeholder="Descreva detalhadamente o motivo..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                )}

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Redirecionar para outro setor? (Opcional)
                  </label>
                  <select
                    value={redirectSectorId}
                    onChange={(e) => setRedirectSectorId(e.target.value)}
                    className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-900"
                  >
                    <option value="">Não redirecionar</option>
                    {sectors.filter(s => s.id !== selectedOccurrenceForRejection.responsibleSectorId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-indigo-400 italic">
                    Ao redirecionar, a ocorrência voltará para o status "ABERTA" no novo setor.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setSelectedOccurrenceForRejection(null)}
                  className="flex-1 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={!rejectionReason || isSubmittingRejection}
                  onClick={handleConfirmRejection}
                  className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmittingRejection ? <Loader className="w-4 h-4 animate-spin" /> : 'Confirmar Recusa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reason Modal */}
      <AnimatePresence>
        {isReasonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingReason ? 'Editar Motivo' : 'Novo Motivo'}
                </h2>
                <button onClick={() => setIsReasonModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleAddReason} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Motivo</label>
                  <input
                    type="text"
                    required
                    value={reasonForm.name}
                    onChange={(e) => setReasonForm({ ...reasonForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Quebra de Motor, Pneu Furado..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
                  <textarea
                    value={reasonForm.description}
                    onChange={(e) => setReasonForm({ ...reasonForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="Breve descrição sobre este motivo..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsReasonModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    {editingReason ? 'Salvar Alterações' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
