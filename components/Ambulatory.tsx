import React, { FC, useState, useEffect, useMemo } from 'react';
import { Activity, HeartPulse, UserPlus, FileText, Search, Plus, X, Save, Trash2, Calendar, ClipboardList, Stethoscope, Image as ImageIcon, Upload, Paperclip, Mail } from 'lucide-react';
import { storageService } from '../services/storageService';
import { HealthRecord, Collaborator, HealthRecordType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AmbulatoryProps {
  orgId: string;
  collaborators: Collaborator[];
}

const RECORD_TYPES: Record<HealthRecordType, string> = {
  ADMISSION: 'Admissional',
  PERIODIC: 'Periódico',
  RETURN_TO_WORK: 'Retorno ao Trabalho',
  FUNCTION_CHANGE: 'Mudança de Função',
  DISMISSAL: 'Demissional',
  CLINICAL_VISIT: 'Atendimento Clínico'
};

export const Ambulatory: FC<AmbulatoryProps> = ({ orgId, collaborators }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);

  const [formData, setFormData] = useState({
    collaboratorId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'CLINICAL_VISIT' as HealthRecordType,
    status: 'FIT' as 'FIT' | 'UNFIT' | 'RESTRICTED',
    symptoms: '',
    diagnosis: '',
    observations: '',
    doctorName: '',
    doctorCrm: '',
    asoExpirationDate: '',
    vitalSigns: {
      bloodPressure: '',
      temperature: '',
      saturation: '',
      glucose: '',
      heartRate: ''
    },
    medicationGiven: '',
    referral: '',
    attachments: [] as string[]
  });

  useEffect(() => {
    const unsub = storageService.subscribeToHealthRecords(orgId, (data) => {
      setRecords(data);
      setLoading(false);
    });
    return () => unsub();
  }, [orgId]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const collab = collaborators.find(c => c.id === r.collaboratorId);
      const nameMatch = collab?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const typeMatch = RECORD_TYPES[r.type].toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || typeMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, searchTerm, collaborators]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      todayVisits: records.filter(r => r.date.split('T')[0] === today).length,
      unfit: records.filter(r => r.status === 'UNFIT').length,
      total: records.length,
      recent: records.slice(0, 5)
    };
  }, [records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaboratorId || !formData.date || !formData.type) return;

    try {
      const collab = collaborators.find(c => c.id === formData.collaboratorId);
      const record: HealthRecord = {
        id: selectedRecord?.id || Date.now().toString(),
        ...formData,
        orgId,
        collaboratorName: collab?.name,
        createdAt: selectedRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (selectedRecord) {
        await storageService.updateHealthRecord(orgId, selectedRecord.id, record);
      } else {
        await storageService.addHealthRecord(orgId, record);
      }

      const shouldEmail = confirm('Atendimento salvo com sucesso! Deseja encaminhar uma cópia por e-mail agora?');
      if (shouldEmail) {
        handleEmailRecord(record);
      }

      setIsModalOpen(false);
      setSelectedRecord(null);
      resetForm();
    } catch (error) {
      console.error("Error saving health record:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      collaboratorId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'CLINICAL_VISIT',
      status: 'FIT',
      symptoms: '',
      diagnosis: '',
      observations: '',
      doctorName: '',
      doctorCrm: '',
      asoExpirationDate: '',
      vitalSigns: {
        bloodPressure: '',
        temperature: '',
        saturation: '',
        glucose: '',
        heartRate: ''
      },
      medicationGiven: '',
      referral: '',
      attachments: []
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 1024 * 1024) { // 1MB limit
        alert(`O arquivo ${file.name} excede o limite de 1MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index)
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este prontuário?")) return;
    try {
      await storageService.deleteHealthRecord(orgId, id);
    } catch (error) {
      console.error("Error deleting health record:", error);
    }
  };

  const handleEmailRecord = (record: HealthRecord) => {
    const collab = collaborators.find(c => c.id === record.collaboratorId);
    const dateStr = new Date(record.date).toLocaleDateString('pt-BR');
    const timeStr = new Date(record.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const subject = `Prontuário Ambulatorial: ${collab?.name || 'Colaborador'} - ${dateStr}`;
    const body = `
Detalhamento de Atendimento Ambulatorial:
------------------------------------------
Colaborador: ${collab?.name || 'Não identificado'}
Data/Hora: ${dateStr} às ${timeStr}
Tipo: ${RECORD_TYPES[record.type]}
Status: ${record.status === 'FIT' ? 'Retornou ao Trabalho' : record.status === 'UNFIT' ? 'Afastado' : 'Observação'}

SINAIS VITAIS:
P.A: ${record.vitalSigns?.bloodPressure || '-'}
Temp: ${record.vitalSigns?.temperature || '-'}°C
Sat: ${record.vitalSigns?.saturation || '-'}%
Glic: ${record.vitalSigns?.glucose || '-'}mg/dL
F.C: ${record.vitalSigns?.heartRate || '-'}bpm

RELATÓRIO:
Sintomas: ${record.symptoms || '-'}
Medicação/Conduta: ${record.medicationGiven || '-'}
Encaminhamento: ${record.referral || '-'}

Observações: ${record.observations || '-'}
------------------------------------------
Gerado pelo Sistema GM Control
    `.trim();

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto scroll-smooth">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <HeartPulse className="h-8 w-8 text-blue-600" />
            Ambulatório
          </h2>
          <p className="text-slate-500 font-medium">Atendimentos de saúde e mal-estar em serviço</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { resetForm(); setSelectedRecord(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <UserPlus className="h-5 w-5" />
            Novo Registro de Atendimento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Atendimentos Hoje', value: stats.todayVisits, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Total Fichas', value: stats.total, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Afastamentos', value: stats.unfit, icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: 'Atend. Clínicos', value: records.filter(r => r.type === 'CLINICAL_VISIT').length, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md"
          >
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} w-fit mb-4`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-800/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por colaborador ou sintomas..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Histórico de Atendimentos
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sintomas/Relato</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Conduta</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Situação</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">Carregando registros...</td>
                </tr>
              ) : filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {new Date(record.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {new Date(record.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 dark:text-white">{record.collaboratorName || 'Não identificado'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {record.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-xs truncate flex items-center gap-2">
                       {record.symptoms || RECORD_TYPES[record.type]}
                       {record.attachments && record.attachments.length > 0 && (
                         <span className="flex items-center gap-0.5 text-blue-500">
                           <Paperclip className="h-3 w-3" />
                           <span className="text-[10px] font-bold">{record.attachments.length}</span>
                         </span>
                       )}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                        {record.diagnosis || 'Em avaliação'}
                     </p>
                  </td>
                  <td className="px-6 py-4">
                    {record.status === 'FIT' ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit">
                        RETORNOU AO TRABALHO
                      </span>
                    ) : record.status === 'UNFIT' ? (
                      <span className="flex items-center gap-1 text-red-600 font-black text-[10px] uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded w-fit">
                        AFASTADO / ENCAMINHADO
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 font-black text-[10px] uppercase bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit">
                        RESTRIÇÃO TEMPORÁRIA
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleEmailRecord(record)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Encaminhar por E-mail"
                      >
                        <Mail className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => { setSelectedRecord(record); setFormData(record as any); setIsModalOpen(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(record.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO PRONTUÁRIO / ATENDIMENTO */}
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
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                  {selectedRecord ? 'Editar Atendimento' : 'Novo Atendimento Ambulatorial'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="overflow-y-auto p-0 flex-1">
                <div className="p-6 space-y-8">
                  {/* Seção 1: Identificação */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 dark:border-blue-900 pb-1">Identificação e Tempo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Colaborador</label>
                        <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold dark:text-white"
                          value={formData.collaboratorId}
                          onChange={e => setFormData({...formData, collaboratorId: e.target.value})}
                        >
                          <option value="">Selecione o colaborador...</option>
                          {collaborators.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Data/Hora Atendimento</label>
                        <input
                          type="datetime-local"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-bold dark:text-white"
                          value={formData.date.includes('T') ? formData.date.slice(0, 16) : `${formData.date}T00:00`}
                          onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Sinais Vitais */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 dark:border-emerald-900 pb-1">Sinais Vitais</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">P.A (mmHg)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center dark:text-white"
                          value={formData.vitalSigns?.bloodPressure}
                          onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, bloodPressure: e.target.value}})}
                          placeholder="120/80"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Temp. (°C)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center dark:text-white"
                          value={formData.vitalSigns?.temperature}
                          onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, temperature: e.target.value}})}
                          placeholder="36.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Sat. (%)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center dark:text-white"
                          value={formData.vitalSigns?.saturation}
                          onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, saturation: e.target.value}})}
                          placeholder="98"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Glic. (mg/dL)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center dark:text-white"
                          value={formData.vitalSigns?.glucose}
                          onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, glucose: e.target.value}})}
                          placeholder="90"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">F.C (bpm)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center dark:text-white"
                          value={formData.vitalSigns?.heartRate}
                          onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, heartRate: e.target.value}})}
                          placeholder="72"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Atendimento */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest border-b border-purple-100 dark:border-purple-900 pb-1">Detalhes do Atendimento</h4>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Sintomas / Ocorrência</label>
                      <textarea
                        required
                        placeholder="Descreva o mal-estar relatado..."
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium dark:text-white min-h-[80px]"
                        value={formData.symptoms}
                        onChange={e => setFormData({...formData, symptoms: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Conduta / Medicação</label>
                        <textarea
                          placeholder="Procedimento adotado ou remédios ministrados..."
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium dark:text-white min-h-[60px]"
                          value={formData.medicationGiven}
                          onChange={e => setFormData({...formData, medicationGiven: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Desfecho / Encaminhamento</label>
                        <textarea
                          placeholder="Ex: Mandado para casa, UPA, retornou ao setor..."
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-medium dark:text-white min-h-[60px]"
                          value={formData.referral}
                          onChange={e => setFormData({...formData, referral: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Decisão Final */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Anexos / Imagens</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.attachments?.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden group">
                          <img src={url} alt={`Anexo ${i + 1}`} className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => removeAttachment(i)}
                            className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                             <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Upload className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Anexar Foto</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>

                  {/* Seção 5: Decisão Final */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest border-b border-rose-100 dark:border-rose-900 pb-1">Status Final do Colaborador</h4>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        {[
                          { id: 'FIT', label: 'Retornou ao Trabalho', color: 'bg-emerald-500' },
                          { id: 'RESTRICTED', label: 'Em Observação', color: 'bg-amber-500' },
                          { id: 'UNFIT', label: 'Afastado / Liberado', color: 'bg-rose-500' }
                        ].map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setFormData({...formData, status: s.id as any})}
                            className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                              formData.status === s.id 
                              ? `${s.color} text-white shadow-lg` 
                              : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3 sticky bottom-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-blue-600 py-3 rounded-xl text-white font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Save className="h-5 w-5" />
                    CONCLUIR ATENDIMENTO
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
