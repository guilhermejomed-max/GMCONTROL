import React, { useState, FC } from 'react';
import { VehicleBrandModel, MaintenancePlan } from '../types';
import { storageService } from '../services/storageService';
import { Settings, Save, Trash2, PenLine, Truck, Loader2, Plus, X, Car, ClipboardList } from 'lucide-react';

interface BrandModelManagerProps {
  vehicleBrandModels: VehicleBrandModel[];
  maintenancePlans?: MaintenancePlan[];
}

export const BrandModelManager: FC<BrandModelManagerProps> = ({ vehicleBrandModels, maintenancePlans = [] }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VehicleBrandModel>>({
    brand: '',
    model: '',
    type: 'CAVALO',
    axles: 3
  });

  const handleOpenAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ brand: '', model: '', type: 'CAVALO', axles: 3, maintenancePlanId: '' });
  };

  const handleOpenEdit = (bm: VehicleBrandModel) => {
    setIsAdding(true);
    setEditingId(bm.id);
    setFormData({ brand: bm.brand, model: bm.model, type: bm.type, axles: bm.axles, maintenancePlanId: bm.maintenancePlanId || '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.model) return;
    
    setIsSaving(true);
    try {
      if (editingId) {
        await storageService.updateVehicleBrandModel({
          id: editingId,
          ...formData
        } as VehicleBrandModel);
      } else {
        await storageService.addVehicleBrandModel({
          id: Date.now().toString(36),
          ...formData
        } as VehicleBrandModel);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ brand: '', model: '', type: 'CAVALO', axles: 3, maintenancePlanId: '' });
    } catch (error) {
      console.error("Error saving brand model:", error);
      alert("Erro ao salvar marca/modelo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta marca/modelo?")) {
      try {
        await storageService.deleteVehicleBrandModel(id);
      } catch (error) {
        console.error("Error deleting brand model:", error);
        alert("Erro ao excluir marca/modelo.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Car className="h-7 w-7 text-blue-600" /> Marcas e Modelos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie as marcas e modelos de veículos da sua frota.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={handleOpenAdd} 
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" /> <span className="hidden md:inline">Nova Marca/Modelo</span><span className="md:hidden">Novo</span>
            </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {editingId ? 'Editar Marca/Modelo' : 'Nova Marca/Modelo'}
            </h3>
            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MARCA</label>
                <input 
                  required 
                  type="text" 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold" 
                  value={formData.brand} 
                  onChange={e => setFormData({...formData, brand: e.target.value.toUpperCase()})} 
                  placeholder="Ex: VOLVO"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MODELO</label>
                <input 
                  required 
                  type="text" 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold" 
                  value={formData.model} 
                  onChange={e => setFormData({...formData, model: e.target.value.toUpperCase()})} 
                  placeholder="Ex: FH 540"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">TIPO</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as 'CAVALO' | 'CARRETA'})}
                >
                  <option value="CAVALO">Cavalo</option>
                  <option value="CARRETA">Carreta</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">EIXOS</label>
                <input 
                  required 
                  type="number" 
                  min="1"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.axles} 
                  onChange={e => setFormData({...formData, axles: Number(e.target.value)})} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">PLANO DE MANUTENÇÃO (PMS)</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.maintenancePlanId || ''} 
                  onChange={e => setFormData({...formData, maintenancePlanId: e.target.value})}
                >
                  <option value="">Nenhum plano vinculado</option>
                  {maintenancePlans.map(plan => (
                    <option key={`plan-${plan.id}`} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSaving} 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of existing brand models */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {vehicleBrandModels.length === 0 ? (
          <div className="text-center p-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Nenhuma marca/modelo cadastrada</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cadastre as marcas e modelos dos seus veículos para facilitar o preenchimento e gerar relatórios precisos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Marca</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Modelo</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Eixos</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plano de Manutenção</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vehicleBrandModels.map(bm => (
                  <tr key={bm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800 dark:text-white">{bm.brand}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-white">{bm.model}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        bm.type === 'CAVALO' 
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>
                        {bm.type}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">{bm.axles}</td>
                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                      {bm.maintenancePlanId ? (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <ClipboardList className="h-4 w-4" />
                          {maintenancePlans.find(p => p.id === bm.maintenancePlanId)?.name || 'Plano não encontrado'}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(bm)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PenLine className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(bm.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
};
