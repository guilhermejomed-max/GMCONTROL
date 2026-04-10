import React, { useState, useEffect } from 'react';
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
  Truck
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { Occurrence, OccurrenceReason, Vehicle, TeamMember } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { SearchableSelect } from './ui/SearchableSelect';

interface OccurrencesProps {
  user: TeamMember;
  occurrences: Occurrence[];
  vehicles: Vehicle[];
}

export const Occurrences: React.FC<OccurrencesProps> = ({ user, occurrences: initialOccurrences, vehicles: initialVehicles }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'reasons'>('list');
  const [occurrences, setOccurrences] = useState<Occurrence[]>(initialOccurrences);
  const [reasons, setReasons] = useState<OccurrenceReason[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const [showAllReasons, setShowAllReasons] = useState(false);
  
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);
  const [editingReason, setEditingReason] = useState<OccurrenceReason | null>(null);

  // Form states
  const [occurrenceForm, setOccurrenceForm] = useState({
    vehicleId: '',
    reasonId: '',
    description: ''
  });
  
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

  useEffect(() => {
    const unsubReasons = storageService.subscribeToOccurrenceReasons('', setReasons);

    return () => {
      unsubReasons();
    };
  }, []);

  const handleAddOccurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedVehicle = vehicles.find(v => v.id === occurrenceForm.vehicleId);
    const selectedReason = reasons.find(r => r.id === occurrenceForm.reasonId);

    if (!selectedVehicle || !selectedReason) return;

    if (editingOccurrence) {
      await storageService.updateOccurrence('', editingOccurrence.id, {
        vehicleId: selectedVehicle.id,
        vehiclePlate: selectedVehicle.plate,
        reasonId: selectedReason.id,
        reasonName: selectedReason.name,
        description: occurrenceForm.description
      });
    } else {
      const newOccurrence: Occurrence = {
        id: Date.now().toString(),
        vehicleId: selectedVehicle.id,
        vehiclePlate: selectedVehicle.plate,
        reasonId: selectedReason.id,
        reasonName: selectedReason.name,
        description: occurrenceForm.description,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        branchId: user.branchId || undefined
      };
      await storageService.addOccurrence('', newOccurrence);
    }
    
    setIsOccurrenceModalOpen(false);
    setEditingOccurrence(null);
    setOccurrenceForm({ vehicleId: '', reasonId: '', description: '' });
  };

  const handleAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReason) {
      await storageService.updateOccurrenceReason('', editingReason.id, {
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
      await storageService.addOccurrenceReason('', newReason);
    }
    
    setIsReasonModalOpen(false);
    setEditingReason(null);
    setReasonForm({ name: '', description: '' });
  };

  const handleResolveOccurrence = async (occurrence: Occurrence) => {
    await storageService.updateOccurrence('', occurrence.id, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString()
    });
  };

  const handleDeleteOccurrence = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta ocorrência?')) {
      await storageService.deleteOccurrence('', id);
    }
  };

  const handleDeleteReason = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este motivo?')) {
      await storageService.deleteOccurrenceReason('', id);
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            Módulo de Ocorrências
          </h1>
          <p className="text-gray-500">Gestão de quebras e problemas em veículos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingReason(null);
              setReasonForm({ name: '', description: '' });
              setIsReasonModalOpen(true);
            }}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Motivo
          </button>
          <button
            onClick={() => {
              setEditingOccurrence(null);
              setOccurrenceForm({ vehicleId: '', reasonId: '', description: '' });
              setIsOccurrenceModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Ocorrência
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'list' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Ocorrências
          {activeTab === 'list' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('reasons')}
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${
            activeTab === 'reasons' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Motivos Cadastrados
          {activeTab === 'reasons' && (
            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por placa, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">Todos os Status</option>
                <option value="OPEN">Abertas</option>
                <option value="RESOLVED">Resolvidas</option>
              </select>
            </div>
          </div>

          {/* Occurrences List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Veículo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(showAllOccurrences ? filteredOccurrences : filteredOccurrences.slice(0, 10)).map((occ) => (
                    <tr key={occ.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{occ.vehiclePlate}</div>
                            <div className="text-xs text-gray-500">ID: {occ.vehicleId.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{occ.reasonName}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{occ.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          occ.status === 'OPEN' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {occ.status === 'OPEN' ? (
                            <><Clock className="w-3 h-3" /> Aberta</>
                          ) : (
                            <><CheckCircle2 className="w-3 h-3" /> Resolvida</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{new Date(occ.createdAt).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-gray-500">{new Date(occ.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {occ.status === 'OPEN' && (
                            <button
                              onClick={() => handleResolveOccurrence(occ)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Resolver"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingOccurrence(occ);
                              setOccurrenceForm({
                                vehicleId: occ.vehicleId,
                                reasonId: occ.reasonId,
                                description: occ.description || ''
                              });
                              setIsOccurrenceModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOccurrence(occ.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOccurrences.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Nenhuma ocorrência encontrada.
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
        </>
      ) : (
        /* Reasons List */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(showAllReasons ? reasons : reasons.slice(0, 9)).map((reason) => (
              <div key={reason.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
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
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteReason(reason.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{reason.name}</h3>
              <p className="text-gray-500 text-sm line-clamp-2">{reason.description || 'Sem descrição.'}</p>
            </div>
          ))}
          {reasons.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              Nenhum motivo cadastrado.
            </div>
          )}
        </div>
        {reasons.length > 9 && (
          <div className="flex justify-center">
            <button 
              onClick={() => setShowAllReasons(!showAllReasons)}
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingOccurrence ? 'Editar Ocorrência' : 'Registrar Ocorrência'}
                </h2>
                <button onClick={() => setIsOccurrenceModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <form onSubmit={handleAddOccurrence} className="p-6 space-y-4">
                <SearchableSelect
                  label="Veículo"
                  required
                  placeholder="Selecione um veículo..."
                  options={vehicles.map(v => ({ id: v.id, label: v.plate, subLabel: v.model }))}
                  value={occurrenceForm.vehicleId}
                  onChange={(val) => setOccurrenceForm({ ...occurrenceForm, vehicleId: val })}
                />

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Detalhes</label>
                  <textarea
                    value={occurrenceForm.description}
                    onChange={(e) => setOccurrenceForm({ ...occurrenceForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                    placeholder="Descreva o que aconteceu..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
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
