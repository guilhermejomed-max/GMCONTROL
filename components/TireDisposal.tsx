import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Calendar, Download, ExternalLink, FileText, Loader2, PackageCheck, Plus, Recycle, Search, ShieldCheck, Trash2, Truck, User, X } from 'lucide-react';
import { Collaborator, Partner, WasteDisposal, WasteDisposalItem, WasteType } from '../types';
import { storageService } from '../services/storageService';

interface TireDisposalProps {
  orgId: string;
  partners: Partner[];
  collaborators: Collaborator[];
}

export const TireDisposal: React.FC<TireDisposalProps> = ({ orgId, partners, collaborators }) => {
  const [disposals, setDisposals] = useState<WasteDisposal[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [items, setItems] = useState<WasteDisposalItem[]>([]);
  const [currentItem, setCurrentItem] = useState({ wasteTypeId: '', quantity: '' });
  const [metadata, setMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    responsibleId: '',
    partnerId: '',
    transporter: '',
    collectionPlate: '',
    mtrNumber: '',
    cost: '',
    notes: ''
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

  const tireTypes = useMemo(() => {
    return wasteTypes.filter(type => type.category === 'TIRE');
  }, [wasteTypes]);

  const tireTypeIds = useMemo(() => new Set(tireTypes.map(type => type.id)), [tireTypes]);

  const tireDisposals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return disposals
      .filter(disposal => disposal.disposalType === 'TIRE')
      .map(disposal => ({
        ...disposal,
        items: disposal.items.filter(item => tireTypeIds.has(item.wasteTypeId) || item.wasteTypeName.toLowerCase().includes('pneu'))
      }))
      .filter(disposal => disposal.items.length > 0)
      .filter(disposal => {
        if (!query) return true;
        return (
          disposal.items.some(item => item.wasteTypeName.toLowerCase().includes(query)) ||
          disposal.partnerName.toLowerCase().includes(query) ||
          disposal.responsibleName.toLowerCase().includes(query) ||
          (disposal.certificateNumber || '').toLowerCase().includes(query) ||
          (disposal.vehiclePlate || '').toLowerCase().includes(query) ||
          (disposal.driverName || '').toLowerCase().includes(query)
        );
      });
  }, [disposals, searchTerm, tireTypeIds]);

  const stats = useMemo(() => {
    const totalTires = tireDisposals.reduce((sum, disposal) => {
      return sum + disposal.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    const finished = tireDisposals.filter(disposal => disposal.stage === 'FINALIZADO').length;
    const pending = tireDisposals.length - finished;
    const totalCost = tireDisposals.reduce((sum, disposal) => sum + (disposal.cost || 0), 0);
    return { totalTires, finished, pending, totalCost };
  }, [tireDisposals]);

  const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const statCards: { label: string; value: string; Icon: React.ElementType }[] = [
    { label: 'Pneus descartados', value: stats.totalTires.toLocaleString('pt-BR'), Icon: PackageCheck },
    { label: 'Processos pendentes', value: stats.pending.toLocaleString('pt-BR'), Icon: AlertCircle },
    { label: 'Processos finalizados', value: stats.finished.toLocaleString('pt-BR'), Icon: ShieldCheck },
    { label: 'Custo de destinacao', value: money(stats.totalCost), Icon: FileText }
  ];

  const resetForm = () => {
    setItems([]);
    setCurrentItem({ wasteTypeId: '', quantity: '' });
    setSelectedFile(null);
    setMetadata({
      date: new Date().toISOString().split('T')[0],
      responsibleId: '',
      partnerId: '',
      transporter: '',
      collectionPlate: '',
      mtrNumber: '',
      cost: '',
      notes: ''
    });
  };

  const handleAddItem = () => {
    const quantity = Number(currentItem.quantity);
    const tireType = tireTypes.find(type => type.id === currentItem.wasteTypeId);
    if (!tireType || !Number.isInteger(quantity) || quantity <= 0) {
      alert('Selecione o tipo de pneu/sucata e informe uma quantidade inteira.');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        wasteTypeId: tireType.id,
        wasteTypeName: tireType.name,
        quantity,
        unit: tireType.unit
      }
    ]);
    setCurrentItem({ wasteTypeId: '', quantity: '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0 || !metadata.responsibleId || !metadata.partnerId) {
      alert('Adicione pelo menos um pneu e preencha responsavel e destino ambiental.');
      return;
    }

    const responsible = collaborators.find(person => person.id === metadata.responsibleId);
    const partner = partners.find(item => item.id === metadata.partnerId);
    if (!responsible || !partner) return;

    setUploading(true);
    try {
      let attachmentUrl = '';
      if (selectedFile) {
        const path = `tire-disposal/${orgId}/${Date.now()}_${selectedFile.name}`;
        attachmentUrl = await storageService.uploadFile(path, selectedFile);
      }

      const disposal: WasteDisposal = {
        id: Date.now().toString(),
        orgId,
        disposalType: 'TIRE',
        items,
        date: metadata.date,
        responsibleId: responsible.id,
        responsibleName: responsible.name,
        partnerId: partner.id,
        partnerName: partner.name,
        driverName: metadata.transporter,
        vehiclePlate: metadata.collectionPlate,
        certificateNumber: metadata.mtrNumber,
        cost: metadata.cost ? Number(metadata.cost) : undefined,
        notes: metadata.notes,
        mtrDetails: metadata.notes,
        attachmentUrl,
        stage: 'AGENDAMENTO',
        createdAt: new Date().toISOString()
      };

      await storageService.addWasteDisposal(orgId, disposal);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar descarte de pneus:', error);
      alert('Erro ao salvar descarte de pneus.');
    } finally {
      setUploading(false);
    }
  };

  const updateStage = (id: string, stage: WasteDisposal['stage']) => {
    storageService.updateWasteDisposal(orgId, id, { stage });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Recycle className="h-8 w-8 text-emerald-600" />
            Descarte de Pneus
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Baixa ambiental exclusiva de pneus inserviveis, sucata, MTR e laudo de destinacao.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Plus className="h-5 w-5" />
          Novo Descarte de Pneus
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, Icon }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-2">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-black text-emerald-950 dark:text-emerald-100">Modulo exclusivo para pneus.</p>
          <p className="text-xs text-emerald-900/70 dark:text-emerald-200/70 mt-1">Use este fluxo para registrar lote, quantidade, destino ambiental, coleta, MTR e laudo dos pneus baixados.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar por pneu, destino, MTR, coleta..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
            />
          </div>
          <button className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 border border-slate-200 dark:border-slate-700">
            <Download className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Lote de pneus</th>
                <th className="px-5 py-4">Destino ambiental</th>
                <th className="px-5 py-4">Coleta</th>
                <th className="px-5 py-4">MTR / Laudo</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tireDisposals.map(disposal => (
                <tr key={disposal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      disposal.stage === 'FINALIZADO'
                        ? 'bg-emerald-100 text-emerald-700'
                        : disposal.stage === 'RETIRADA'
                          ? 'bg-purple-100 text-purple-700'
                          : disposal.stage === 'EMISSAO_MTR'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                    }`}>
                      {disposal.stage === 'AGENDAMENTO' ? 'Agendado' : disposal.stage === 'EMISSAO_MTR' ? 'MTR' : disposal.stage === 'RETIRADA' ? 'Retirada' : 'Finalizado'}
                    </span>
                    <div className="mt-2">
                      {disposal.stage === 'AGENDAMENTO' && (
                        <button onClick={() => updateStage(disposal.id, 'EMISSAO_MTR')} className="text-[10px] font-black text-blue-600 hover:underline">Emitir MTR</button>
                      )}
                      {disposal.stage === 'EMISSAO_MTR' && (
                        <button onClick={() => updateStage(disposal.id, 'RETIRADA')} className="text-[10px] font-black text-amber-600 hover:underline">Marcar retirada</button>
                      )}
                      {disposal.stage === 'RETIRADA' && (
                        <button onClick={() => updateStage(disposal.id, 'FINALIZADO')} className="text-[10px] font-black text-emerald-600 hover:underline">Finalizar descarte</button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {disposal.items.map((item, index) => (
                        <div key={`${item.wasteTypeId}-${index}`} className="flex items-center gap-2">
                          <span className="font-black text-slate-800 dark:text-white">{item.wasteTypeName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                            {item.quantity} un
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(disposal.date).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{disposal.partnerName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Responsavel: {disposal.responsibleName}</p>
                    {disposal.cost !== undefined && <p className="text-[10px] text-slate-500 font-bold mt-1">{money(disposal.cost)}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      <p className="flex items-center gap-2"><Truck className="h-4 w-4 text-slate-400" /> {disposal.vehiclePlate || 'Sem placa'}</p>
                      <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> {disposal.driverName || 'Sem transportador'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-2">
                      <span className="inline-flex px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {disposal.certificateNumber || 'Sem MTR'}
                      </span>
                      {disposal.attachmentUrl && (
                        <a href={disposal.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Ver laudo
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => storageService.deleteWasteDisposal(orgId, disposal.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {tireDisposals.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-bold">Nenhum descarte de pneus encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} />
            <motion.div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Registrar descarte de pneus</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Pneus do lote</p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_48px] gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de pneu/sucata</label>
                      <select value={currentItem.wasteTypeId} onChange={event => setCurrentItem(prev => ({ ...prev, wasteTypeId: event.target.value }))} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold">
                        <option value="">Selecione...</option>
                        {tireTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Quantidade</label>
                      <input type="number" min="1" step="1" value={currentItem.quantity} onChange={event => setCurrentItem(prev => ({ ...prev, quantity: event.target.value }))} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-center" />
                    </div>
                    <button type="button" onClick={handleAddItem} disabled={tireTypes.length === 0} className="h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {tireTypes.length === 0 && <p className="text-[10px] font-bold text-red-500">Cadastre um tipo da categoria PNEU/TIRE nas configuracoes para registrar descarte.</p>}
                  {items.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                      {items.map((item, index) => (
                        <div key={`${item.wasteTypeId}-${index}`} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{item.wasteTypeName}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-emerald-700">{item.quantity} un</span>
                            <button type="button" onClick={() => setItems(prev => prev.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-red-600">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data do descarte</label>
                    <input type="date" required value={metadata.date} onChange={event => setMetadata(prev => ({ ...prev, date: event.target.value }))} className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Destino ambiental</label>
                    <select required value={metadata.partnerId} onChange={event => setMetadata(prev => ({ ...prev, partnerId: event.target.value }))} className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold">
                      <option value="">Selecione...</option>
                      {partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Responsavel pela baixa</label>
                    <select required value={metadata.responsibleId} onChange={event => setMetadata(prev => ({ ...prev, responsibleId: event.target.value }))} className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold">
                      <option value="">Selecione...</option>
                      {collaborators.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">MTR / Certificado</label>
                    <input value={metadata.mtrNumber} onChange={event => setMetadata(prev => ({ ...prev, mtrNumber: event.target.value }))} placeholder="Ex: MTR-PNEUS-001" className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transportador</label>
                    <input value={metadata.transporter} onChange={event => setMetadata(prev => ({ ...prev, transporter: event.target.value }))} placeholder="Empresa ou motorista da coleta" className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Placa da coleta</label>
                    <input value={metadata.collectionPlate} onChange={event => setMetadata(prev => ({ ...prev, collectionPlate: event.target.value }))} placeholder="Placa do veiculo de coleta" className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold uppercase" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Custo de destinacao</label>
                    <input type="number" step="0.01" value={metadata.cost} onChange={event => setMetadata(prev => ({ ...prev, cost: event.target.value }))} placeholder="0,00" className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">MTR / laudo ambiental</label>
                    <label className="h-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 cursor-pointer hover:border-emerald-500">
                      <input type="file" className="hidden" onChange={event => setSelectedFile(event.target.files?.[0] || null)} />
                      <FileText className="h-4 w-4" />
                      {selectedFile ? selectedFile.name : 'Selecionar arquivo'}
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Observacoes do lote</label>
                    <textarea value={metadata.notes} onChange={event => setMetadata(prev => ({ ...prev, notes: event.target.value }))} placeholder="Motivo do descarte, lote, avarias, recusas de recapagem e observacoes ambientais..." className="w-full min-h-[100px] px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold" />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-5 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black">
                    Cancelar
                  </button>
                  <button type="submit" disabled={uploading || items.length === 0 || tireTypes.length === 0} className="flex-[2] px-5 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
                    Confirmar descarte de pneus
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
