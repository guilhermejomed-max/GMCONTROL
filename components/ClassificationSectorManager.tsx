
import React, { useState, useEffect } from 'react';
import { 
  Grid, Plus, Trash2, Save, X, Search, 
  Layers, Layout, Building2, Tag, ChevronRight
} from 'lucide-react';
import { ServiceClassification, ServiceSector, Branch } from '../types';
import { storageService } from '../services/storageService';

interface ClassificationSectorManagerProps {
  orgId: string;
  branches: Branch[];
}

export const ClassificationSectorManager: React.FC<ClassificationSectorManagerProps> = ({ orgId, branches }) => {
  const [classifications, setClassifications] = useState<ServiceClassification[]>([]);
  const [sectors, setSectors] = useState<ServiceSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classification' | 'sector'>('classification');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', branchId: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cData, sData] = await Promise.all([
          storageService.getClassifications(orgId),
          storageService.getSectors(orgId)
        ]);
        setClassifications(cData);
        setSectors(sData);
      } catch (error) {
        console.error("Error loading classification/sector data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [orgId]);

  const handleOpenModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, branchId: item.branchId || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', branchId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return;

    try {
      if (activeTab === 'classification') {
        if (editingItem) {
          await storageService.updateClassification(orgId, editingItem.id, formData);
        } else {
          await storageService.addClassification(orgId, formData);
        }
        const updated = await storageService.getClassifications(orgId);
        setClassifications(updated);
      } else {
        if (editingItem) {
          await storageService.updateSector(orgId, editingItem.id, formData);
        } else {
          await storageService.addSector(orgId, formData);
        }
        const updated = await storageService.getSectors(orgId);
        setSectors(updated);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      if (activeTab === 'classification') {
        await storageService.deleteClassification(orgId, id);
        setClassifications(prev => prev.filter(c => c.id !== id));
      } else {
        await storageService.deleteSector(orgId, id);
        setSectors(prev => prev.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const items = activeTab === 'classification' ? classifications : sectors;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Grid className="h-8 w-8 text-orange-600" />
            Classificação e Setor
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Gerencie as classificações de serviço e os setores da oficina.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-600/20 transition-all hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Novo {activeTab === 'classification' ? 'Classificação' : 'Setor'}
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('classification')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'classification' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Classificações
        </button>
        <button 
          onClick={() => setActiveTab('sector')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'sector' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Setores
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl">
                {activeTab === 'classification' ? <Tag className="h-6 w-6 text-orange-600" /> : <Layers className="h-6 w-6 text-orange-600" />}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-600 transition-colors">
                  <Save className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">{item.name}</h3>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Building2 className="h-3 w-3" />
              {branches.find(b => b.id === item.branchId)?.name || 'Todas as Filiais'}
            </div>
          </div>
        ))}

        {items.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Search className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nenhum registro encontrado</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm">
              Comece cadastrando uma nova classificação ou setor para organizar seus serviços.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {editingItem ? 'Editar' : 'Nova'} {activeTab === 'classification' ? 'Classificação' : 'Setor'}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Preencha os dados abaixo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Registro</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Layout className="h-5 w-5" />
                  </div>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Preventiva, Mecânica, Elétrica..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-slate-800 dark:text-white font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Filial Vinculada</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <select 
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-slate-800 dark:text-white font-bold appearance-none focus:ring-2 focus:ring-orange-500 transition-all"
                  >
                    <option value="">Todas as Filiais</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-4 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5" />
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
