
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Branch } from '../types';
import { Plus, Building2, MapPin, Hash, FileText, Trash2, Edit2, Loader2, Search } from 'lucide-react';

export const BranchManagement = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    location: '',
    code: ''
  });

  useEffect(() => {
    const unsubscribe = storageService.subscribeToBranches((data) => {
      setBranches(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await storageService.updateBranch(editingBranch.id, formData);
      } else {
        const newBranch: Branch = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString()
        };
        await storageService.addBranch(newBranch);
      }
      setShowForm(false);
      setEditingBranch(null);
      setFormData({ name: '', cnpj: '', location: '', code: '' });
    } catch (error) {
      console.error("Error saving branch:", error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      cnpj: branch.cnpj,
      location: branch.location,
      code: branch.code
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta filial?")) {
      await storageService.deleteBranch(id);
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.cnpj.includes(searchTerm) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestão de Filiais</h1>
          <p className="text-slate-500 font-medium">Cadastre e gerencie as unidades da sua empresa</p>
        </div>
        <button
          onClick={() => {
            setEditingBranch(null);
            setFormData({ name: '', cnpj: '', location: '', code: '' });
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nova Filial
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou código..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold">Carregando filiais...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Nenhuma filial encontrada</h3>
          <p className="text-slate-500">Comece cadastrando a primeira unidade da sua empresa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(branch)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(branch.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-1">{branch.name}</h3>
              <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wider mb-4">
                Cód: {branch.code}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-bold">{branch.cnpj}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-bold">{branch.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-black text-slate-800">
                {editingBranch ? 'Editar Filial' : 'Nova Filial'}
              </h2>
              <button 
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <Trash2 className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Nome da Filial</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="Ex: Matriz São Paulo"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">CNPJ</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Código</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="Ex: FIL-01"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Localização / Endereço</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="Cidade, Estado ou Endereço Completo"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  {editingBranch ? 'Salvar Alterações' : 'Cadastrar Filial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
