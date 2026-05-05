import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { Employee } from '../types';
import { Plus, Search, User, Calendar, CreditCard, FileText, Camera, Trash2, Edit2, X, Check, Loader2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RHModuleProps {
  orgId: string;
}

export const RHModule: React.FC<RHModuleProps> = ({ orgId }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>({
    name: '',
    role: '',
    birthDate: '',
    startDate: new Date().toISOString().split('T')[0],
    rg: '',
    cnh: '',
    photoUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = storageService.subscribeToEmployees(orgId, (data) => {
      setEmployees(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [orgId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSaving(true);
    try {
      if (editingId) {
        await storageService.updateEmployee(orgId, editingId, formData);
      } else {
        await storageService.addEmployee(orgId, formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      birthDate: '',
      startDate: new Date().toISOString().split('T')[0],
      rg: '',
      cnh: '',
      photoUrl: ''
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      role: employee.role || '',
      birthDate: employee.birthDate,
      startDate: employee.startDate || (employee.createdAt ? new Date(employee.createdAt).toISOString().split('T')[0] : ''),
      rg: employee.rg,
      cnh: employee.cnh,
      photoUrl: employee.photoUrl || ''
    });
    setEditingId(employee.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este colaborador?')) {
      await storageService.deleteEmployee(orgId, id);
    }
  };

  const filteredEmployees = employees.filter(e => 
    (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.rg || '').includes(searchTerm) ||
    (e.cnh || '').includes(searchTerm) ||
    (e.role && e.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Recursos Humanos</h2>
          <p className="text-slate-500">Gerenciamento e cadastro de colaboradores</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Cadastrar Funcionario
        </button>
      </div>

      {/* SEARCH AND TOTALS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, cargo, RG ou CNH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
          <span className="text-purple-700 font-medium">Total de Colaboradores</span>
          <span className="text-2xl font-bold text-purple-900">{employees.length}</span>
        </div>
      </div>

      {/* EMPLOYEE LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            <p className="text-slate-500 font-medium">Carregando colaboradores...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-slate-50 p-6 rounded-full mb-4">
              <User className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhum funcionario encontrado</h3>
            <p className="text-slate-500 max-w-sm">
              {searchTerm ? 'Tente ajustar sua pesquisa.' : 'Comece cadastrando seu primeiro colaborador no botao acima.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo/Funcao</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                          {employee.photoUrl ? (
                            <img src={employee.photoUrl} alt={employee.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <User className="h-6 w-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{employee.name}</p>
                          <p className="text-xs text-slate-500">Inicio: {employee.startDate ? new Date(employee.startDate).toLocaleDateString('pt-BR') : '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        employee.role?.toUpperCase() === 'MOTORISTA' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {employee.role || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CreditCard className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">RG:</span> {employee.rg}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">CNH:</span> {employee.cnh || 'Nao informado'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
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
        )}
      </div>

      {/* REGISTRATION MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* MODAL HEADER */}
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {editingId ? 'Editar Funcionario' : 'Cadastro de Funcionario'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">Preencha as informacoes do colaborador</p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* FORM CONTENT */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* PHOTO COLUMN */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="h-32 w-32 rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center group-hover:border-purple-300 transition-all">
                        {formData.photoUrl ? (
                          <img src={formData.photoUrl} alt="Foto" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Camera className="h-10 w-10 text-slate-300 group-hover:text-purple-400 transition-colors" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 p-2 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-wider">Foto do Colaborador</p>
                  </div>

                  {/* INFO FIELDS */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Joao da Silva"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Funcao / Cargo</label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="MOTORISTA">MOTORISTA</option>
                          <option value="MECANICO">MECANICO</option>
                          <option value="AJUDANTE">AJUDANTE</option>
                          <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                          <option value="GERENTE">GERENTE</option>
                          <option value="OPERADOR">OPERADOR</option>
                          <option value="OUTRO">OUTRO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Data de Inicio</label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Data de Nascimento</label>
                        <input
                          type="date"
                          required
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">RG / Identidade</label>
                        <input
                          type="text"
                          required
                          value={formData.rg}
                          onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                          placeholder="00.000.000-0"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">CNH (Opcional)</label>
                      <input
                        type="text"
                        value={formData.cnh}
                        onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                        placeholder="No da Carteira de Habilitacao"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-[2] px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    {editingId ? 'Salvar Alteracoes' : 'Concluir Cadastro'}
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
