import React, { useState, useMemo, useEffect } from 'react';
import { WasteDisposal, WasteType, Partner, Collaborator, WasteUnit, WasteDisposalItem } from '../types';
import { storageService } from '../services/storageService';
import { 
  Trash2, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Truck, 
  FileText, 
  Filter, 
  Download, 
  ChevronDown, 
  X,
  AlertCircle,
  TrendingDown,
  Activity,
  ArrowRight,
  Paperclip,
  ExternalLink,
  Loader2,
  ListPlus,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WasteManagementProps {
  orgId: string;
  partners: Partner[];
  collaborators: Collaborator[];
  type: 'WASTE' | 'PPE' | 'TIRE';
}

export const WasteManagement: React.FC<WasteManagementProps> = ({ orgId, partners, collaborators, type }) => {
  const [disposals, setDisposals] = useState<WasteDisposal[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form State
  const [items, setItems] = useState<WasteDisposalItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    wasteTypeId: '',
    quantity: ''
  });

  const [metadata, setMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    responsibleId: '',
    partnerId: '',
    notes: '',
    certificateNumber: '',
    cost: '',
    driverName: '',
    vehiclePlate: '',
    mtrDetails: ''
  });

  useEffect(() => {
    const unsubDisposals = storageService.subscribeToWasteDisposals(orgId, (data) => {
      setDisposals(data);
      setLoading(false);
    });
    const unsubTypes = storageService.subscribeToWasteTypes(orgId, setWasteTypes);

    return () => {
      unsubDisposals();
      unsubTypes();
    };
  }, [orgId]);

  const filteredDisposals = useMemo(() => {
    return disposals.filter(d => 
      d.disposalType === type && (
        d.items.some(item => item.wasteTypeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        d.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.certificateNumber && d.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  }, [disposals, searchTerm, type]);

  const filteredWasteTypes = useMemo(() => {
    return wasteTypes.filter(t => t.category === type);
  }, [wasteTypes, type]);

  const handleAddItem = () => {
    if (!currentItem.wasteTypeId || !currentItem.quantity) return;
    
    const wasteType = filteredWasteTypes.find(t => t.id === currentItem.wasteTypeId);
    if (!wasteType) return;

    const newItem: WasteDisposalItem = {
      wasteTypeId: wasteType.id,
      wasteTypeName: wasteType.name,
      quantity: Number(currentItem.quantity),
      unit: wasteType.unit
    };

    setItems([...items, newItem]);
    setCurrentItem({ wasteTypeId: '', quantity: '' });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !metadata.responsibleId || !metadata.partnerId) {
      alert('Por favor, adicione pelo menos um item e preencha o responsável e parceiro.');
      return;
    }

    const responsible = collaborators.find(c => c.id === metadata.responsibleId);
    const partner = partners.find(p => p.id === metadata.partnerId);

    if (!responsible || !partner) return;

    setUploading(true);
    try {
      let attachmentUrl = '';
      if (selectedFile) {
        const path = `waste-reports/${orgId}/${Date.now()}_${selectedFile.name}`;
        attachmentUrl = await storageService.uploadFile(path, selectedFile);
      }

      const newDisposal: WasteDisposal = {
        id: Date.now().toString(),
        items,
        date: metadata.date,
        responsibleId: responsible.id,
        responsibleName: responsible.name,
        partnerId: partner.id,
        partnerName: partner.name,
        notes: metadata.notes,
        certificateNumber: metadata.certificateNumber,
        cost: metadata.cost ? Number(metadata.cost) : undefined,
        attachmentUrl,
        createdAt: new Date().toISOString(),
        stage: 'AGENDAMENTO',
        driverName: metadata.driverName,
        vehiclePlate: metadata.vehiclePlate,
        mtrDetails: metadata.mtrDetails,
        disposalType: type
      };

      await storageService.addWasteDisposal(orgId, newDisposal);
      setIsModalOpen(false);
      setMetadata({
        date: new Date().toISOString().split('T')[0],
        responsibleId: '',
        partnerId: '',
        notes: '',
        certificateNumber: '',
        cost: '',
        driverName: '',
        vehiclePlate: '',
        mtrDetails: ''
      });
      setItems([]);
      setCurrentItem({ wasteTypeId: '', quantity: '' });
      setSelectedFile(null);
    } catch (error) {
      console.error("Error adding disposal:", error);
      alert("Erro ao salvar descarte.");
    } finally {
      setUploading(false);
    }
  };

  const getStats = useMemo(() => {
    const totalByUnit: Record<string, number> = {};
    disposals
      .filter(d => d.disposalType === type)
      .forEach(d => {
        d.items.forEach(item => {
          totalByUnit[item.unit] = (totalByUnit[item.unit] || 0) + item.quantity;
        });
      });
    return totalByUnit;
  }, [disposals, type]);

  const getLabels = () => {
    switch (type) {
      case 'PPE': return { title: 'Descarte de EPI', desc: 'Gerencie e registre o descarte de Equipamentos de Proteção Individual.', item: 'EPI' };
      case 'TIRE': return { title: 'Descarte de Pneus', desc: 'Gerencie e registre o descarte ambiental de pneus inservíveis.', item: 'Pneu/Sucata' };
      default: return { title: 'Descarte de Resíduos', desc: 'Gerencie e registre o descarte ambiental da oficina.', item: 'Item de Resíduo' };
    }
  };

  const labels = getLabels();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-orange-600" />
            {labels.title}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{labels.desc}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Novo Descarte / Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(getStats).map(([unit, total]) => (
          <div key={unit} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2 text-orange-600 dark:text-orange-400">
               <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <Activity className="h-4 w-4" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-wider">Total em {unit}</p>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{total.toLocaleString()} <span className="text-sm font-bold text-slate-400">{unit}</span></p>
          </div>
        ))}
        {Object.keys(getStats).length === 0 && (
           <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">Nenhum descarte registrado ainda.</p>
           </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por item, parceiro, certificado..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2">
              <button className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-orange-600 rounded-xl border border-slate-200 dark:border-slate-700 transition-all">
                <Download className="h-5 w-5" />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status / Estágio</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Itens / Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Quantidades</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Veículo / Motorista</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Certificado / Laudo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDisposals.map((disposal) => (
                <tr key={disposal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                       {disposal.stage === 'AGENDAMENTO' && (
                         <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black w-fit uppercase">Agendamento</span>
                       )}
                       {disposal.stage === 'EMISSAO_MTR' && (
                         <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black w-fit uppercase">Emissão de MTR</span>
                       )}
                       {disposal.stage === 'RETIRADA' && (
                         <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black w-fit uppercase">Aguardando Retirada</span>
                       )}
                       {disposal.stage === 'FINALIZADO' && (
                         <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black w-fit uppercase flex items-center gap-1">
                           <Activity className="h-3 w-3" /> OK - Finalizado
                         </span>
                       )}
                       
                       <div className="mt-1">
                         {disposal.stage === 'AGENDAMENTO' && (
                           <button 
                             onClick={() => storageService.updateWasteDisposal(orgId, disposal.id, { stage: 'EMISSAO_MTR' })}
                            className="text-[9px] font-black text-blue-600 hover:underline uppercase"
                           >
                             Emitir MTR →
                           </button>
                         )}
                         {disposal.stage === 'EMISSAO_MTR' && (
                           <button 
                             onClick={() => storageService.updateWasteDisposal(orgId, disposal.id, { stage: 'RETIRADA' })}
                            className="text-[9px] font-black text-amber-600 hover:underline uppercase"
                           >
                             Marcar Retirada →
                           </button>
                         )}
                         {disposal.stage === 'RETIRADA' && !disposal.attachmentUrl && (
                           <div className="flex flex-col gap-1">
                              <p className="text-[9px] font-bold text-slate-400 uppercase italic">Anexar laudo para finalizar</p>
                              <label className="text-[9px] font-black text-purple-600 hover:underline uppercase cursor-pointer">
                                  Anexar Laudo
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const path = `waste-reports/${orgId}/${Date.now()}_${file.name}`;
                                      const url = await storageService.uploadFile(path, file);
                                      storageService.updateWasteDisposal(orgId, disposal.id, { 
                                        attachmentUrl: url,
                                        stage: 'FINALIZADO'
                                      });
                                    }}
                                  />
                              </label>
                           </div>
                         )}
                         {disposal.stage === 'RETIRADA' && disposal.attachmentUrl && (
                            <button 
                              onClick={() => storageService.updateWasteDisposal(orgId, disposal.id, { stage: 'FINALIZADO' })}
                              className="text-[9px] font-black text-emerald-600 hover:underline uppercase"
                            >
                              Finalizar →
                            </button>
                         )}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 self-start">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="space-y-1">
                          {disposal.items.map((item, idx) => (
                            <p key={idx} className="font-bold text-slate-800 dark:text-white truncate">
                              {item.wasteTypeName}
                            </p>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" /> {new Date(disposal.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {disposal.items.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-black w-fit">
                          {item.quantity} {item.unit}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 opacity-50" />
                        <span className="text-sm font-bold">{disposal.vehiclePlate || 'Não inf.'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 opacity-50" />
                        <span className="text-xs">{disposal.driverName || 'Não inf.'}</span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 ml-6">{disposal.partnerName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {disposal.certificateNumber && (
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">
                          {disposal.certificateNumber}
                        </span>
                      )}
                      {disposal.attachmentUrl && (
                        <a 
                          href={disposal.attachmentUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Laudo
                        </a>
                      )}
                      {!disposal.certificateNumber && !disposal.attachmentUrl && '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => storageService.deleteWasteDisposal(orgId, disposal.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDisposals.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum registro encontrado para esta busca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-orange-600" />
                  Agendar {labels.title}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Item Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                   <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <ListPlus className="h-4 w-4" /> Adicionar Itens ao Descarte
                   </h4>
                   <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                      <div className="sm:col-span-3">
                         <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">{labels.item}</label>
                         <select
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                            value={currentItem.wasteTypeId}
                            onChange={(e) => setCurrentItem({...currentItem, wasteTypeId: e.target.value})}
                         >
                            <option value="">Selecione...</option>
                            {filteredWasteTypes.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>
                            ))}
                         </select>
                      </div>
                      <div className="sm:col-span-1">
                         <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Qtd</label>
                         <input
                            type="number"
                            step="0.01"
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm text-center"
                            value={currentItem.quantity}
                            onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                            placeholder="0"
                         />
                      </div>
                      <button 
                        type="button"
                        onClick={handleAddItem}
                        className="p-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center"
                      >
                         <Plus className="h-5 w-5" />
                      </button>
                   </div>

                   {/* Items List */}
                   {items.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                         {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-left-4">
                               <div className="flex items-center gap-3">
                                  <div className="p-1 px-2 bg-orange-50 dark:bg-orange-900/20 rounded text-[10px] font-black text-orange-600">
                                     {item.unit}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.wasteTypeName}</span>
                               </div>
                               <div className="flex items-center gap-4">
                                  <span className="text-sm font-black text-slate-900 dark:text-white">{item.quantity}</span>
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                  >
                                     <X className="h-4 w-4" />
                                  </button>
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Data do Descarte *</label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                        value={metadata.date}
                        onChange={(e) => setMetadata({...metadata, date: e.target.value})}
                        required
                      />
                   </div>

                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Destino (Parceiro) *</label>
                      <select
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                        value={metadata.partnerId}
                        onChange={(e) => setMetadata({...metadata, partnerId: e.target.value})}
                        required
                      >
                        <option value="">Selecione...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                   </div>

                   <div className="col-span-2 grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Motorista</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                          value={metadata.driverName}
                          onChange={(e) => setMetadata({...metadata, driverName: e.target.value})}
                          placeholder="Nome do motorista"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Placa do Veículo</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                          value={metadata.vehiclePlate}
                          onChange={(e) => setMetadata({...metadata, vehiclePlate: e.target.value})}
                          placeholder="Placa do veículo"
                        />
                     </div>
                   </div>

                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Responsável *</label>
                       <select
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                         value={metadata.responsibleId}
                         onChange={(e) => setMetadata({...metadata, responsibleId: e.target.value})}
                         required
                       >
                         <option value="">Selecione o Responsável...</option>
                         {collaborators.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                         ))}
                       </select>
                    </div>

                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Detalhes do MTR / Descarte</label>
                       <textarea
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm min-h-[60px]"
                         value={metadata.mtrDetails}
                         onChange={(e) => setMetadata({...metadata, mtrDetails: e.target.value})}
                         placeholder="Informações relevantes sobre o MTR..."
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Nº Certificado / MTR</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                         value={metadata.certificateNumber}
                         onChange={(e) => setMetadata({...metadata, certificateNumber: e.target.value})}
                         placeholder="Ex: MTR-2024-001"
                       />
                    </div>

                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Custo Logístico Total (R$)</label>
                       <input
                         type="number"
                         step="0.01"
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm"
                         value={metadata.cost}
                         onChange={(e) => setMetadata({...metadata, cost: e.target.value})}
                         placeholder="0,00"
                       />
                    </div>

                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Anexar Laudo de Descarte</label>
                       <div className="mt-1 flex items-center gap-3">
                          <label className="flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-orange-500 transition-all group">
                             <input 
                               type="file" 
                               className="hidden" 
                               onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                             />
                             <Paperclip className={`h-4 w-4 ${selectedFile ? 'text-green-500' : 'text-slate-400 group-hover:text-orange-500'}`} />
                             <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">
                                {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo'}
                             </span>
                          </label>
                          {selectedFile && (
                             <button 
                               type="button" 
                               onClick={() => setSelectedFile(null)}
                               className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                             >
                                <X className="h-4 w-4" />
                             </button>
                          )}
                       </div>
                    </div>

                    <div className="col-span-2">
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Observações</label>
                       <textarea
                         className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm min-h-[100px]"
                         value={metadata.notes}
                         onChange={(e) => setMetadata({...metadata, notes: e.target.value})}
                         placeholder="Detalhes adicionais sobre o descarte..."
                       />
                    </div>
                </div>

                <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-4 -mx-6 px-6 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={uploading}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || items.length === 0}
                    className="flex-[2] px-6 py-4 bg-orange-600 text-white rounded-2xl font-extrabold shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Confirmar Lançamento'
                    )}
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
