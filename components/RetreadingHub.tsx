
import React, { useState, useMemo, useEffect } from 'react';
import { Tire, TireStatus, RetreadOrder, TreadPattern, RetreadOrderItem, ToastType, SystemSettings } from '../types';
import { storageService } from '../services/storageService';
import { Recycle, Search, Send, CheckCircle2, X, Truck, DollarSign, Calendar, Clock, Filter, Users, Trash2, Plus, Disc, PenLine, Inbox, PackageCheck, ListTodo, AlertCircle, LayoutGrid, PlusCircle, ArrowRight, Wallet, History, AlertTriangle, ChevronRight, TrendingDown, Paperclip, FileText, Wrench, Factory, CheckSquare, Printer } from 'lucide-react';

interface RetreadingHubProps {
  tires: Tire[];
  retreadOrders: RetreadOrder[];
  onUpdateTire: (tire: Tire) => Promise<void>;
  onNotification: (type: ToastType, title: string, message: string) => void;
  settings?: SystemSettings;
}

// --- WORKFLOW VISUAL COMPONENT ---
const OrderTimeline: React.FC<{ order: RetreadOrder }> = ({ order }) => {
    const steps = [
        { id: 'SENT', label: 'Enviado', icon: Truck },
        { id: 'PRODUCTION', label: 'Na Recapadora', icon: Factory },
        { id: 'RETURN', label: 'Retornado', icon: CheckCircle2 }
    ];

    // Determine current step based on dates
    let currentStepIndex = 0;
    const now = new Date();
    const sentDate = new Date(order.sentDate);
    const returnDate = order.returnedDate ? new Date(order.returnedDate) : null;
    
    if (order.status === 'CONCLUIDO' || returnDate) {
        currentStepIndex = 2;
    } else {
        // Simulação de progresso temporal para "Na Recapadora"
        // Se passou mais de 2 dias do envio e ainda não voltou, assume "Em Produção"
        const daysSinceSent = (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSent > 2) {
            currentStepIndex = 1;
        }
    }

    return (
        <div className="flex items-center w-full mt-4 relative">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 -z-0 rounded-full"></div>
            <div 
                className="absolute top-1/2 left-0 h-1 bg-green-500 transition-all duration-1000 rounded-full -z-0" 
                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            ></div>

            <div className="flex justify-between w-full z-10">
                {steps.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase mt-2 ${isCurrent ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const RetreadingHub: React.FC<RetreadingHubProps> = ({ tires, retreadOrders, onUpdateTire, onNotification, settings }) => {
  const [activeTab, setActiveTab] = useState<'SEND' | 'TRACK' | 'PARTNERS'>('TRACK');
  const [selectedTireIds, setSelectedTireIds] = useState<Set<string>>(new Set());
  
  // Search state for Send Tab
  const [sendSearchTerm, setSendSearchTerm] = useState('');

  // Staging State (Cesta de Envio)
  const [stagedItems, setStagedItems] = useState<RetreadOrderItem[]>([]);
  
  // Service Mode State
  const [serviceMode, setServiceMode] = useState<'RETREAD' | 'REPAIR'>('RETREAD');
  
  const [retreaderId, setRetreaderId] = useState('');
  const [treadPatternId, setTreadPatternId] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState(''); 
  
  const [batchCost, setBatchCost] = useState(''); 
  const [serviceDetails, setServiceDetails] = useState('');
  const [collectionFile, setCollectionFile] = useState<string | null>(null);
  
  // DATE SELECTION STATE (Substitui dias fixos)
  const [returnDate, setReturnDate] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 15); // Padrão 15 dias
      return d.toISOString().split('T')[0];
  });

  const [filterRetreader, setFilterRetreader] = useState<string>('ALL');

  const [partners, setPartners] = useState<{id: string, name: string}[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  
  const [treadPatterns, setTreadPatterns] = useState<TreadPattern[]>([]);
  const [newTreadPattern, setNewTreadPattern] = useState<Partial<TreadPattern>>({ 
    name: '', 
    type: 'LISO', 
    retreaderId: '',
    standardDepth: 18.0,
    fixedCost: 0
  });
  
  const [costInput, setCostInput] = useState('');
  const [depthInput, setDepthInput] = useState('18.0');

  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);

  const [receivingOrder, setReceivingOrder] = useState<RetreadOrder | null>(null);
  const [receiveData, setReceiveData] = useState<Record<string, { cost: number, newDepth: number, treadType: 'LISO' | 'BORRACHUDO', status: 'APROVADO' | 'RECUSADO', rejectionReason: string }>>({});

  useEffect(() => {
     const unsubP = storageService.subscribeToRetreaders(setPartners);
     const unsubT = storageService.subscribeToTreadPatterns(setTreadPatterns);
     return () => { unsubP(); unsubT(); };
  }, []);

  const savingsData = useMemo(() => {
    const concluded = retreadOrders.filter(o => o.status === 'CONCLUIDO');
    const totalSpent = concluded.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    let savings = 0;
    concluded.forEach(order => {
        order.tireIds.forEach(id => {
            const tire = tires.find(t => t.id === id);
            const tirePrice = tire ? (tire.price || 2500) : 2500;
            const retreadCostPerTire = (order.totalCost || 0) / (order.tireIds.length || 1);
            savings += (tirePrice - retreadCostPerTire);
        });
    });
    return { savings, spent: totalSpent };
  }, [retreadOrders, tires]);

  const eligibleTires = useMemo(() => {
    const stagedIds = new Set(stagedItems.map(i => i.tireId));
    return tires.filter(t => 
        t.status === TireStatus.USED && 
        !t.vehicleId && 
        !stagedIds.has(t.id) &&
        (t.fireNumber.toLowerCase().includes(sendSearchTerm.toLowerCase()) || 
         t.brand.toLowerCase().includes(sendSearchTerm.toLowerCase()))
    );
  }, [tires, stagedItems, sendSearchTerm]);

  const tiresInRetread = useMemo(() => {
    return tires.filter(t => t.status === TireStatus.RETREADING);
  }, [tires]);
  
  const filteredBandsByRetreader = useMemo(() => {
      if (!retreaderId) return [];
      return treadPatterns.filter(tp => tp.retreaderId === retreaderId);
  }, [retreaderId, treadPatterns]);

  const retreaderNamesForFilter = useMemo(() => {
    const names = new Set(retreadOrders.map(o => o.retreaderName));
    return Array.from(names).sort();
  }, [retreadOrders]);

  const filteredOrders = useMemo(() => {
    return retreadOrders
      .filter(o => filterRetreader === 'ALL' || o.retreaderName === filterRetreader)
      .sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());
  }, [retreadOrders, filterRetreader]);

  const toggleSelection = (id: string) => {
    setSelectedTireIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- ACTIONS ---

  const handlePatternSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const pid = e.target.value;
      setTreadPatternId(pid);
      if (pid) {
          const pattern = treadPatterns.find(p => p.id === pid);
          if (pattern && pattern.fixedCost) {
              setBatchCost(pattern.fixedCost.toString());
          } else {
              setBatchCost('');
          }
      } else {
          setBatchCost('');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              onNotification('warning', 'Arquivo Grande', 'O anexo deve ter no máximo 2MB.');
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setCollectionFile(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddToStage = () => {
      if (selectedTireIds.size === 0) {
          onNotification('warning', 'Seleção Vazia', 'Selecione ao menos um pneu para adicionar ao lote.');
          return;
      }
      
      let itemName = '';
      if (serviceMode === 'RETREAD') {
          if (!treadPatternId) {
              onNotification('warning', 'Banda Obrigatória', 'Selecione o desenho da banda de rodagem.');
              return;
          }
          const pattern = treadPatterns.find(p => p.id === treadPatternId);
          if (!pattern) return;
          itemName = pattern.name;
      } else {
          if (!selectedServiceType) {
              onNotification('warning', 'Serviço Obrigatório', 'Selecione o tipo de serviço.');
              return;
          }
          itemName = selectedServiceType;
      }

      const unitCost = batchCost ? parseFloat(batchCost.replace(',', '.')) : 0;

      const newItems: RetreadOrderItem[] = [];
      Array.from(selectedTireIds).forEach(id => {
          const tire = tires.find(t => t.id === id);
          if (tire) {
              newItems.push({
                  tireId: tire.id,
                  fireNumber: tire.fireNumber,
                  pattern: itemName, // Stores pattern name OR service name
                  cost: isNaN(unitCost) ? 0 : unitCost,
                  serviceDetails: serviceDetails
              });
          }
      });

      setStagedItems(prev => [...prev, ...newItems]);
      setSelectedTireIds(new Set()); // Clear selection
      setTreadPatternId(''); 
      setSelectedServiceType('');
      setBatchCost('');
      setServiceDetails('');
      onNotification('success', 'Adicionado ao Lote', `${newItems.length} pneus adicionados.`);
  };

  const handleRemoveFromStage = (index: number) => {
      setStagedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendToRetread = async () => {
    const partner = partners.find(p => p.id === retreaderId);
    
    if (stagedItems.length === 0 || !partner) {
      onNotification('error', 'Ordem Incompleta', 'A cesta está vazia ou o parceiro não foi selecionado.');
      return;
    }
    
    const partnerName: string = partner.name;
    const tiresToSend = stagedItems.map(i => i.tireId);
    const orderNumber = (retreadOrders.reduce((max, o) => Math.max(max, o.orderNumber), 0) || 0) + 1;
    
    // Usar data selecionada
    const expectedDate = new Date(returnDate);
    const expectedDateStr = expectedDate.toISOString();

    const distinctPatterns = Array.from(new Set(stagedItems.map(i => i.pattern))) as string[];
    const patternLabel = distinctPatterns.length === 1 ? distinctPatterns[0] : 'MISTO / VÁRIOS';

    const totalEstimatedCost = stagedItems.reduce((acc, item) => acc + (item.cost || 0), 0);

    const newOrder: RetreadOrder = {
        id: Date.now().toString(),
        orderNumber,
        retreaderName: partnerName,
        requestedTreadPattern: patternLabel,
        sentDate: new Date().toISOString(),
        expectedReturnDate: expectedDateStr,
        tireIds: tiresToSend,
        tireDetails: stagedItems.map(i => ({ id: i.tireId, fireNumber: i.fireNumber })),
        items: stagedItems, 
        status: 'ENVIADO',
        totalCost: totalEstimatedCost,
        collectionOrderUrl: collectionFile || undefined
    };
    
    await storageService.addRetreadOrder(newOrder);

    const updates: Partial<Tire>[] = [];
    stagedItems.forEach(item => {
        const tire = tires.find(t => t.id === item.tireId);
        if (tire) {
            updates.push({
                id: tire.id,
                status: TireStatus.RETREADING,
                location: partnerName,
                history: [...(tire.history || []), {
                    date: new Date().toISOString(),
                    action: 'ENVIADO_RECAPAGEM',
                    details: `Enviado para ${partnerName}. Serviço: ${item.pattern}. ${item.serviceDetails ? `Obs: ${item.serviceDetails}` : ''}`
                }]
            });
        }
    });
    
    await storageService.updateTireBatch(updates);

    onNotification('success', 'Ordem Enviada', `Ordem #${orderNumber} criada com ${tiresToSend.length} pneus.`);
    setStagedItems([]);
    setRetreaderId('');
    setTreadPatternId('');
    setSelectedServiceType('');
    setBatchCost('');
    setServiceDetails('');
    setSendSearchTerm('');
    setCollectionFile(null);
    setServiceMode('RETREAD');
    
    setFilterRetreader('ALL');
    setActiveTab('TRACK');
  };

  const handleAddPartner = async () => {
      if (!newPartnerName.trim()) return;
      await storageService.addRetreader(newPartnerName.trim());
      setNewPartnerName('');
      onNotification('success', 'Parceiro Adicionado', 'Novo parceiro cadastrado.');
  };

  const handleDeletePartner = async (id: string) => {
      if (confirm("Remover este parceiro do catálogo? Isso não afetará ordens passadas.")) {
          await storageService.deleteRetreader(id);
          onNotification('info', 'Removido', 'Parceiro removido do catálogo.');
      }
  };

  const handleEditTreadPattern = (pattern: TreadPattern) => {
      setEditingPatternId(pattern.id);
      setNewTreadPattern(pattern);
      setCostInput(pattern.fixedCost ? String(pattern.fixedCost) : '');
      setDepthInput(pattern.standardDepth ? String(pattern.standardDepth) : '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
      setEditingPatternId(null); 
      setNewTreadPattern({ name: '', type: 'LISO', retreaderId: '', standardDepth: 18.0, fixedCost: 0 });
      setCostInput('');
      setDepthInput('18.0');
  };

  const handleAddTreadPattern = async () => {
      if (!newTreadPattern.name?.trim() || !newTreadPattern.retreaderId) {
          onNotification('warning', 'Dados Incompletos', 'Informe o nome da banda e a recapadora responsável.');
          return;
      }

      const costVal = parseFloat(costInput.replace(',', '.')) || 0;
      const depthVal = parseFloat(depthInput.replace(',', '.')) || 18.0;

      const patternData = {
          name: newTreadPattern.name.trim(),
          type: newTreadPattern.type || 'LISO',
          retreaderId: newTreadPattern.retreaderId,
          standardDepth: depthVal,
          fixedCost: costVal,
          brand: newTreadPattern.brand
      };

      if (editingPatternId) {
          await storageService.updateTreadPattern(editingPatternId, patternData);
          onNotification('success', 'Banda Atualizada', 'Informações do desenho atualizadas.');
      } else {
          await storageService.addTreadPattern(patternData);
          onNotification('success', 'Banda Cadastrada', 'Novo desenho adicionado ao catálogo.');
      }
      
      resetForm();
  };

  const handleDeleteTreadPattern = async (id: string) => {
      if (confirm("Remover esta banda de rodagem do catálogo?")) {
          await storageService.deleteTreadPattern(id);
          onNotification('info', 'Removido', 'Desenho de banda excluído.');
      }
  };

  const handleStartReceiving = (order: RetreadOrder) => {
    const orderItems = order.items || order.tireIds.map(id => ({ tireId: id, pattern: order.requestedTreadPattern || 'Desconhecida', fireNumber: '', cost: 0 }));

    const initialData: Record<string, { cost: number, newDepth: number, treadType: 'LISO' | 'BORRACHUDO', status: 'APROVADO' | 'RECUSADO', rejectionReason: string }> = {};
    
    orderItems.forEach(item => {
       const pattern = treadPatterns.find(p => p.name === item.pattern);
       const suggestedCost = item.cost || pattern?.fixedCost || 0;
       const suggestedDepth = pattern?.standardDepth || 18.0;
       const suggestedType = pattern?.type || 'LISO';
       initialData[item.tireId] = { cost: suggestedCost, newDepth: suggestedDepth, treadType: suggestedType, status: 'APROVADO', rejectionReason: '' };
    });

    setReceiveData(initialData);
    setReceivingOrder(order);
  };

  const handleReceiveDataChange = (tireId: string, field: string, value: any) => {
      setReceiveData(prev => ({
          ...prev,
          [tireId]: {
              ...prev[tireId],
              [field]: value
          }
      }));
  };

  const handleReceiveTires = async () => {
    if (!receivingOrder) return;

    const updates: Partial<Tire>[] = [];
    let totalCost = 0;
    
    receivingOrder.tireIds.forEach(id => {
      const tire = tires.find(t => t.id === id);
      const data = receiveData[id] || { cost: 0, newDepth: 18.0, treadType: 'LISO', status: 'APROVADO', rejectionReason: '' };
      
      if (tire) {
        if (data.status === 'APROVADO') {
            updates.push({
                id: tire.id,
                status: TireStatus.RETREADED,
                location: 'Almoxarifado',
                retreader: receivingOrder.retreaderName,
                retreadCost: data.cost,
                retreadCount: (tire.retreadCount || 0) + 1,
                totalInvestment: Number(tire.totalInvestment || tire.price || 0) + Number(data.cost || 0),
                currentTreadDepth: data.newDepth,
                originalTreadDepth: data.newDepth,
                treadType: data.treadType as 'LISO' | 'BORRACHUDO',
                history: [...(tire.history || []), {
                    date: new Date().toISOString(),
                    action: 'RETORNO_RECAPAGEM',
                    details: `Retorno ${receivingOrder.retreaderName}. Custo: R$${data.cost}. Sulco: ${data.newDepth}mm (${data.treadType}).`
                }]
            });
            totalCost += data.cost;
        } else {
            // RECUSADO
            updates.push({
                id: tire.id,
                status: TireStatus.DAMAGED,
                location: 'Sucata',
                history: [...(tire.history || []), {
                    date: new Date().toISOString(),
                    action: 'DESCARTE',
                    details: `Recusado na recapagem (${receivingOrder.retreaderName}). Motivo: ${data.rejectionReason}`
                }]
            });
            // Cost for rejected tires is usually 0, or just an inspection fee. We add it to totalCost if they entered a cost.
            totalCost += data.cost;
        }
      }
    });

    await storageService.updateTireBatch(updates);
    
    await storageService.updateRetreadOrder(receivingOrder.id, {
        status: 'CONCLUIDO',
        returnedDate: new Date().toISOString(),
        totalCost
    });
    
    onNotification('success', 'Recebimento Concluído', `Ordem #${receivingOrder.orderNumber} finalizada. Pneus processados.`);
    setReceivingOrder(null);
    setReceiveData({});
  };

  const calculateTimeline = (order: RetreadOrder) => {
    const start = new Date(order.sentDate).getTime();
    const end = order.expectedReturnDate ? new Date(order.expectedReturnDate).getTime() : start + (15 * 24 * 60 * 60 * 1000);
    const now = order.status === 'CONCLUIDO' && order.returnedDate ? new Date(order.returnedDate).getTime() : Date.now();
    
    const total = end - start;
    const elapsed = now - start;
    const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    const isLate = daysLeft < 0 && order.status !== 'CONCLUIDO';
    
    return { progress, daysLeft, isLate };
  };

  const handlePrintManifest = (order: RetreadOrder) => {
      const win = window.open('', '_blank');
      if (!win) return;

      const html = `
          <html>
          <head>
              <title>Romaneio de Envio #${order.orderNumber}</title>
              <style>
                  body { font-family: sans-serif; padding: 20px; color: #333; }
                  h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                  .header { margin-bottom: 30px; }
                  .header p { margin: 5px 0; }
                  table { border-collapse: collapse; margin-top: 20px; width: 100%; }
                  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                  th { background-color: #f5f5f5; }
                  .footer { margin-top: 50px; text-align: center; }
                  .signature { margin-top: 50px; display: flex; justify-content: space-around; }
                  .sig-line { border-top: 1px solid #333; width: 200px; padding-top: 5px; }
              </style>
          </head>
          <body>
              <h1>Romaneio de Envio para Recapagem</h1>
              <div class="header">
                  <p><strong>Ordem:</strong> #${String(order.orderNumber).padStart(4, '0')}</p>
                  <p><strong>Parceiro (Recapadora):</strong> ${order.retreaderName}</p>
                  <p><strong>Data de Envio:</strong> ${new Date(order.sentDate).toLocaleDateString()}</p>
                  <p><strong>Previsão de Retorno:</strong> ${new Date(order.expectedReturnDate || '').toLocaleDateString()}</p>
                  <p><strong>Total de Pneus:</strong> ${order.tireIds.length}</p>
              </div>
              
              <table>
                  <thead>
                      <tr>
                          <th>Item</th>
                          <th>Nº de Fogo</th>
                          <th>Serviço Solicitado</th>
                          <th>Detalhes</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${(order.items || order.tireDetails.map(t => ({ fireNumber: t.fireNumber, pattern: order.requestedTreadPattern, serviceDetails: '' }))).map((item, idx) => `
                          <tr>
                              <td>${idx + 1}</td>
                              <td><strong>${item.fireNumber}</strong></td>
                              <td>${item.pattern}</td>
                              <td>${item.serviceDetails || '-'}</td>
                          </tr>
                      `).join('')}
                  </tbody>
              </table>

              <div class="signature">
                  <div style="text-align: center;">
                      <div class="sig-line">Assinatura do Responsável (Envio)</div>
                  </div>
                  <div style="text-align: center;">
                      <div class="sig-line">Assinatura do Recebedor (Recapadora)</div>
                  </div>
              </div>
              
              <div class="footer">
                  <p>Gerado pelo sistema GM Control Pro em ${new Date().toLocaleString()}</p>
              </div>
              <script>
                  window.onload = function() { window.print(); }
              </script>
          </body>
          </html>
      `;
      win.document.write(html);
      win.document.close();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* HEADER TABS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Recycle className="h-7 w-7 text-purple-600" /> Controle de Reformas & Serviços
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie o ciclo de vida estendido e serviços externos da frota.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto overflow-x-auto shadow-inner">
           <button onClick={() => setActiveTab('TRACK')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'TRACK' ? 'bg-white dark:bg-slate-700 shadow-md text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><Clock className="h-4 w-4"/> Cronograma</button>
           <button onClick={() => setActiveTab('SEND')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'SEND' ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><Send className="h-4 w-4"/> Enviar Pneus</button>
           <button onClick={() => setActiveTab('PARTNERS')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'PARTNERS' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><Users className="h-4 w-4"/> Catálogo</button>
        </div>
      </div>

      {activeTab === 'PARTNERS' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right duration-300">
            {/* PARTNER MANAGEMENT */}
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Truck className="h-5 w-5 text-emerald-500"/> Novo Parceiro (Recapadora/Oficina)</h3>
                  <div className="flex gap-2">
                     <input type="text" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} placeholder="Nome Fantasia..." className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white font-bold" />
                     <button onClick={handleAddPartner} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl shadow-lg transition-all"><Plus className="h-6 w-6"/></button>
                  </div>
               </div>
               
               <div className="space-y-3">
                  <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest px-1 flex items-center gap-2"><ListTodo className="h-4 w-4"/> Parceiros Cadastrados ({partners.length})</h3>
                  <div className="grid grid-cols-1 gap-3">
                     {partners.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:border-emerald-300 transition-all shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Users className="h-5 w-5"/></div>
                              <span className="font-bold text-slate-800 dark:text-white text-lg">{p.name}</span>
                           </div>
                           <button onClick={() => handleDeletePartner(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"><Trash2 className="h-5 w-5"/></button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* TREAD PATTERN MANAGEMENT */}
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Disc className="h-5 w-5 text-blue-500"/> 
                    {editingPatternId ? 'Editar Desenho de Banda' : 'Novo Desenho de Banda'}
                  </h3>
                  <div className="space-y-3">
                     <select 
                        value={newTreadPattern.retreaderId} 
                        onChange={e => setNewTreadPattern({...newTreadPattern, retreaderId: e.target.value})}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                     >
                        <option value="">Selecione a Recapadora...</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" value={newTreadPattern.name} onChange={e => setNewTreadPattern({...newTreadPattern, name: e.target.value})} placeholder="Modelo (ex: Vipal V167)..." className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" />
                        
                        <div className="relative">
                           <input 
                              type="number" 
                              step="0.01" 
                              value={costInput} 
                              onChange={e => setCostInput(e.target.value)} 
                              placeholder="Valor (R$)..." 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white font-bold pl-10" 
                           />
                           <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-emerald-500" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="relative">
                           <input 
                              type="number" 
                              step="0.1" 
                              value={depthInput} 
                              onChange={e => setDepthInput(e.target.value)} 
                              placeholder="Sulco Padrão..." 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold pr-10" 
                           />
                           <span className="absolute right-3 top-3.5 text-xs font-bold text-slate-400">mm</span>
                        </div>
                        <select value={newTreadPattern.type} onChange={e => setNewTreadPattern({...newTreadPattern, type: e.target.value as any})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-white">
                           <option value="LISO">LISO (Direcional)</option>
                           <option value="BORRACHUDO">BORRACHUDO (Tração)</option>
                        </select>
                     </div>
                     
                     <div className="flex gap-2">
                        {editingPatternId && (
                           <button onClick={resetForm} className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black transition-all">
                              Cancelar
                           </button>
                        )}
                        <button onClick={handleAddTreadPattern} className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2">
                           {editingPatternId ? <CheckCircle2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />} 
                           {editingPatternId ? 'Atualizar Banda' : 'Salvar Banda'}
                        </button>
                     </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest px-1 flex items-center gap-2"><ListTodo className="h-4 w-4"/> Bandas Disponíveis ({treadPatterns.length})</h3>
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                     {treadPatterns.map(p => {
                        const partnerName = partners.find(ptr => ptr.id === p.retreaderId)?.name || 'Recapadora não definida';
                        return (
                           <div key={p.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group hover:border-blue-300 transition-all shadow-sm">
                              <div className="flex items-center gap-3">
                                 <div className={`p-2.5 rounded-xl ${p.type === 'BORRACHUDO' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <Disc className="h-5 w-5"/>
                                 </div>
                                 <div>
                                    <span className="font-bold text-slate-800 dark:text-white block text-sm">{p.name}</span>
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase text-slate-400 mt-0.5">
                                       <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{p.standardDepth}mm</span>
                                       <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{money(p.fixedCost || 0)}</span>
                                       <span>{partnerName}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-1">
                                 <button onClick={() => handleEditTreadPattern(p)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Editar"><PenLine className="h-4 w-4"/></button>
                                 <button onClick={() => handleDeleteTreadPattern(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Excluir"><Trash2 className="h-4 w-4"/></button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         </div>
      )}

      {activeTab === 'TRACK' && (
         <>
            {/* KPI OVERVIEW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Clock className="h-16 w-16"/></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Aguardando Retorno</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{tiresInRetread.length} <span className="text-sm text-slate-400 font-medium">pneus</span></h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-green-500"><TrendingDown className="h-16 w-16"/></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Economia Gerada</p>
                    <h3 className="text-3xl font-black text-green-600 dark:text-green-400">{money(savingsData.savings)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><History className="h-16 w-16"/></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Ordens</p>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white">{retreadOrders.length}</h3>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 mb-6 items-center">
               <div className="flex-1 w-full relative">
                  <Filter className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <select 
                    value={filterRetreader} 
                    onChange={(e) => setFilterRetreader(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none text-slate-800 dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="ALL">Todos os Parceiros</option>
                    {retreaderNamesForFilter.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
               </div>
            </div>

            {filteredOrders.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-left duration-300">
                    {filteredOrders.map(order => {
                    const { progress, daysLeft, isLate } = calculateTimeline(order);
                    
                    const summary = (order.items || order.tireDetails.map(t => ({ pattern: order.requestedTreadPattern }))).reduce((acc: any, item: any) => {
                        acc[item.pattern] = (acc[item.pattern] || 0) + 1;
                        return acc;
                    }, {});

                    return (
                        <div key={order.id} className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm hover:shadow-xl transition-all overflow-hidden ${order.status === 'CONCLUIDO' ? 'border-slate-200 dark:border-slate-800 opacity-90' : isLate ? 'border-red-200 dark:border-red-900/50' : 'border-slate-100 dark:border-slate-800'}`}>
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${order.status === 'CONCLUIDO' ? 'bg-green-50 text-green-600' : isLate ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}`}>
                                        <Truck className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg shadow-sm">#{String(order.orderNumber).padStart(4, '0')}</span>
                                            <h3 className="font-black text-xl text-slate-800 dark:text-white leading-none">{order.retreaderName}</h3>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-400">
                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> Enviado: {new Date(order.sentDate).toLocaleDateString()}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="flex items-center gap-1 font-black text-purple-600 uppercase tracking-tighter">
                                                {Object.entries(summary).map(([pat, count]) => `${count}x ${pat}`).join(', ')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    {order.status === 'CONCLUIDO' ? (
                                        <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl">
                                            <CheckCircle2 className="h-5 w-5"/> Finalizado em {new Date(order.returnedDate || '').toLocaleDateString()}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end w-full md:w-auto">
                                            <div className={`text-xs font-bold mb-2 flex items-center gap-1 ${isLate ? 'text-red-500' : 'text-slate-500'}`}>
                                                {isLate ? <AlertTriangle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}
                                                {isLate ? `ATRASADO ${Math.abs(daysLeft)} DIAS` : `PREVISÃO: ${daysLeft} DIAS`}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold mt-1">
                                                Retorno em: {new Date(order.expectedReturnDate || new Date()).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                </div>

                                {/* WORKFLOW VISUALIZER */}
                                <OrderTimeline order={order} />

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800 mt-6">
                                    <div className="flex flex-wrap gap-2">
                                        {order.tireDetails.slice(0, 16).map((t, i) => (
                                            <span key={i} className="text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">{t.fireNumber}</span>
                                        ))}
                                        {order.tireDetails.length > 16 && <span className="text-[10px] font-bold text-slate-400 px-2 py-1 flex items-center">+{order.tireDetails.length - 16} outros</span>}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 items-center">
                                    <button 
                                        onClick={() => handlePrintManifest(order)}
                                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 mr-4"
                                    >
                                        <Printer className="h-4 w-4"/> Imprimir Romaneio
                                    </button>
                                    {order.collectionOrderUrl && (
                                        <button 
                                            onClick={() => {
                                                const win = window.open();
                                                if(win) win.document.write(`<iframe src="${order.collectionOrderUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                            }}
                                            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mr-4"
                                        >
                                            <FileText className="h-4 w-4"/> Ver Ordem de Coleta
                                        </button>
                                    )}
                                    {order.status !== 'CONCLUIDO' && (
                                        <button 
                                            onClick={() => handleStartReceiving(order)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
                                        >
                                            <Inbox className="h-4 w-4"/> Registrar Recebimento
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Nenhuma ordem encontrada.</p>
                </div>
            )}
         </>
      )}

      {activeTab === 'SEND' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
              {/* Left Column: Selection */}
              <div className="lg:col-span-2 flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                          <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><ListTodo className="h-5 w-5 text-blue-500"/> Estoque de Carcaças</h3>
                          <p className="text-xs text-slate-400">Pneus "Usados" disponíveis para serviço externo</p>
                      </div>
                      
                      {/* SEARCH AVAILABLE TIRES */}
                      <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input 
                              type="text" 
                              placeholder="Buscar fogo ou marca..." 
                              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                              value={sendSearchTerm}
                              onChange={e => setSendSearchTerm(e.target.value)}
                          />
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
                      {eligibleTires.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <AlertCircle className="h-10 w-10 mb-2 opacity-30"/>
                              <p className="font-medium">Nenhum pneu disponível com o filtro atual.</p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                              {eligibleTires.map(t => (
                                  <div 
                                      key={t.id} 
                                      onClick={() => toggleSelection(t.id)}
                                      className={`p-4 rounded-2xl border cursor-pointer transition-all relative group shadow-sm flex flex-col justify-between ${selectedTireIds.has(t.id) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                                  >
                                      {selectedTireIds.has(t.id) && <div className="absolute top-3 right-3 text-blue-600 bg-white rounded-full"><CheckCircle2 className="h-5 w-5 fill-current"/></div>}
                                      <div>
                                          <div className="font-black text-lg text-slate-800 dark:text-white">{t.fireNumber}</div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">{t.brand}</div>
                                          <div className="text-[10px] text-slate-400 uppercase">{t.model}</div>
                                      </div>
                                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                                          <div className="text-[10px] font-bold text-slate-400">DOT {t.dot}</div>
                                          <div className="text-xs font-black text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{t.currentTreadDepth}mm</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

              {/* Right Column: Config & Submit */}
              <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-950">
                      <h3 className="font-bold text-indigo-900 dark:text-white flex items-center gap-2"><Inbox className="h-5 w-5"/> Manifesto de Envio</h3>
                  </div>
                  
                  <div className="p-5 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                      {/* STEP 1: PARTNER */}
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">1. Selecionar Parceiro</label>
                          <select 
                              value={retreaderId} 
                              onChange={e => { setRetreaderId(e.target.value); setTreadPatternId(''); }} 
                              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-slate-700 dark:text-white"
                          >
                              <option value="">Selecione...</option>
                              {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>

                      {/* STEP 2: MODE SELECT */}
                      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <button 
                              onClick={() => setServiceMode('RETREAD')}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${serviceMode === 'RETREAD' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-300' : 'text-slate-500'}`}
                          >
                              Recapagem
                          </button>
                          <button 
                              onClick={() => setServiceMode('REPAIR')}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${serviceMode === 'REPAIR' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-orange-300' : 'text-slate-500'}`}
                          >
                              Outros Serviços
                          </button>
                      </div>

                      {/* STEP 3: ITEM CONFIG */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Configurar Item</span>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{selectedTireIds.size} selecionados</span>
                          </div>
                          
                          <div className="space-y-3">
                              {serviceMode === 'RETREAD' ? (
                                  <select 
                                      value={treadPatternId} 
                                      onChange={handlePatternSelect}
                                      disabled={!retreaderId}
                                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      <option value="">Desenho da Banda...</option>
                                      {filteredBandsByRetreader.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                                  </select>
                              ) : (
                                  <select 
                                      value={selectedServiceType} 
                                      onChange={(e) => setSelectedServiceType(e.target.value)}
                                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-orange-500"
                                  >
                                      <option value="">Tipo de Serviço...</option>
                                      {settings?.serviceTypes?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                      <option value="Conserto">Conserto Geral</option>
                                      <option value="Vulcanizacao">Vulcanização</option>
                                      <option value="Duplagem">Duplagem</option>
                                  </select>
                              )}

                              <div className="relative">
                                  <input 
                                      type="number" 
                                      placeholder="Custo Unitário (R$)..." 
                                      className="w-full pl-9 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-emerald-500"
                                      value={batchCost}
                                      onChange={e => setBatchCost(e.target.value)}
                                  />
                                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-emerald-500" />
                              </div>

                              <input 
                                  type="text" 
                                  placeholder="Detalhes Adicionais (Opcional)..." 
                                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                                  value={serviceDetails}
                                  onChange={e => setServiceDetails(e.target.value)}
                              />

                              <button 
                                  onClick={handleAddToStage}
                                  disabled={selectedTireIds.size === 0 || (serviceMode === 'RETREAD' ? !treadPatternId : !selectedServiceType)}
                                  className="w-full py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold text-xs hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                              >
                                  <PlusCircle className="h-4 w-4"/> Adicionar à Cesta
                              </button>
                          </div>
                      </div>

                      {/* DATE SELECTOR (NEW REQUIREMENT) */}
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">4. Previsão de Retorno</label>
                          <input 
                              type="date"
                              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                              value={returnDate}
                              onChange={e => setReturnDate(e.target.value)}
                          />
                      </div>

                      {/* STEP 5: FILE ATTACHMENT */}
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">5. Anexar Ordem de Coleta (Opcional)</label>
                          <label className={`w-full p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors ${collectionFile ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}>
                              <Paperclip className={`h-4 w-4 ${collectionFile ? 'text-green-600' : 'text-slate-400'}`}/>
                              <span className={`text-xs font-bold ${collectionFile ? 'text-green-600' : 'text-slate-500'}`}>
                                  {collectionFile ? 'Arquivo Anexado' : 'Clique para enviar foto/PDF'}
                              </span>
                              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                          </label>
                      </div>

                      {/* STEP 6: BASKET LIST */}
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Itens na Cesta</label>
                          <div className="space-y-2">
                              {stagedItems.length === 0 ? (
                                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-300">
                                      <Inbox className="h-8 w-8 mx-auto mb-1 opacity-50"/>
                                      <p className="text-xs font-bold">Cesta Vazia</p>
                                  </div>
                              ) : (
                                  stagedItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group">
                                          <div>
                                              <span className="font-black text-sm text-slate-800 dark:text-white block">{item.fireNumber}</span>
                                              <span className="text-[10px] font-bold text-slate-500 uppercase">{item.pattern}</span>
                                              {item.serviceDetails && <span className="text-[9px] text-blue-500 block mt-0.5 font-medium">+ {item.serviceDetails}</span>}
                                          </div>
                                          <div className="flex items-center gap-3">
                                              <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">{money(item.cost || 0)}</span>
                                              <button onClick={() => handleRemoveFromStage(idx)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-full transition-colors"><X className="h-4 w-4"/></button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>

                  {/* FOOTER TOTAL */}
                  <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-end mb-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">Total Estimado</span>
                          <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{money(stagedItems.reduce((a,b) => a + (b.cost || 0), 0))}</span>
                      </div>
                      <button 
                          onClick={handleSendToRetread}
                          disabled={stagedItems.length === 0}
                          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                          <Send className="h-5 w-5 group-hover:translate-x-1 transition-transform"/> Gerar Ordem de Serviço
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* RECEIVE MODAL */}
      {receivingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2"><PackageCheck className="h-6 w-6 text-green-600"/> Recebimento de Pneus</h3>
                          <p className="text-sm text-slate-500">Ordem #{String(receivingOrder.orderNumber).padStart(4, '0')} • {receivingOrder.retreaderName}</p>
                      </div>
                      <button onClick={() => setReceivingOrder(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"><X className="h-6 w-6 text-slate-500"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs border-b border-slate-100 dark:border-slate-800 sticky top-0 shadow-sm z-10">
                              <tr>
                                  <th className="p-4">Fogo</th>
                                  <th className="p-4">Serviço/Banda</th>
                                  <th className="p-4 w-32">Status</th>
                                  <th className="p-4 w-48">Detalhes (Sulco / Motivo)</th>
                                  <th className="p-4 w-40">Custo Final (R$)</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {receivingOrder.tireIds.map(id => {
                                  const tire = tires.find(t => t.id === id);
                                  const data = receiveData[id] || { cost: 0, newDepth: 18, treadType: 'LISO', status: 'APROVADO', rejectionReason: '' };
                                  const itemSpec = receivingOrder.items?.find(i => i.tireId === id);
                                  
                                  if (!tire) return null;

                                  return (
                                      <tr key={id} className={`hover:bg-slate-50 dark:hover:bg-slate-800 ${data.status === 'RECUSADO' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                          <td className="p-4 font-black text-slate-800 dark:text-white">{tire.fireNumber}</td>
                                          <td className="p-4 text-slate-600 dark:text-slate-300">
                                              {itemSpec?.pattern || receivingOrder.requestedTreadPattern}
                                              {itemSpec?.serviceDetails && <div className="text-[9px] text-blue-500 mt-1 font-bold">+ {itemSpec.serviceDetails}</div>}
                                          </td>
                                          <td className="p-4">
                                              <select 
                                                  className={`w-full p-2 border rounded-lg text-xs font-bold outline-none ${data.status === 'RECUSADO' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                                                  value={data.status}
                                                  onChange={e => handleReceiveDataChange(id, 'status', e.target.value)}
                                              >
                                                  <option value="APROVADO">APROVADO</option>
                                                  <option value="RECUSADO">RECUSADO</option>
                                              </select>
                                          </td>
                                          <td className="p-4">
                                              {data.status === 'APROVADO' ? (
                                                  <div className="flex gap-2">
                                                      <input 
                                                          type="number" step="0.1"
                                                          className="w-16 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold outline-none focus:border-green-500"
                                                          value={data.newDepth}
                                                          onChange={e => handleReceiveDataChange(id, 'newDepth', parseFloat(e.target.value))}
                                                          title="Novo Sulco (mm)"
                                                      />
                                                      <select 
                                                          className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                                                          value={data.treadType}
                                                          onChange={e => handleReceiveDataChange(id, 'treadType', e.target.value)}
                                                      >
                                                          <option value="LISO">LISO</option>
                                                          <option value="BORRACHUDO">BORRACHUDO</option>
                                                      </select>
                                                  </div>
                                              ) : (
                                                  <input 
                                                      type="text"
                                                      placeholder="Motivo da recusa..."
                                                      className="w-full p-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-lg text-sm font-bold outline-none focus:border-red-500 text-red-700 dark:text-red-400"
                                                      value={data.rejectionReason}
                                                      onChange={e => handleReceiveDataChange(id, 'rejectionReason', e.target.value)}
                                                  />
                                              )}
                                          </td>
                                          <td className="p-4">
                                              <div className="relative">
                                                  <input 
                                                      type="number" step="0.01"
                                                      className="w-full pl-6 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold outline-none focus:border-green-500"
                                                      value={data.cost}
                                                      onChange={e => handleReceiveDataChange(id, 'cost', parseFloat(e.target.value))}
                                                  />
                                                  <span className="absolute left-2 top-2 text-xs font-bold text-slate-400">R$</span>
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                      <div>
                          <p className="text-xs font-bold text-slate-500 uppercase">Custo Total do Serviço</p>
                          <p className="text-2xl font-black text-green-600 dark:text-green-400">{money(Object.values(receiveData).reduce<number>((a, b: any) => a + (b.cost || 0), 0))}</p>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setReceivingOrder(null)} className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                          <button onClick={handleReceiveTires} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5"/> Confirmar Entrada
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
