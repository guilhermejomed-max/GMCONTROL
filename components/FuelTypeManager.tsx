import React, { useState, useEffect, FC } from 'react';
import { storageService } from '../services/storageService';
import { FuelType, VehicleBrandModel } from '../types';
import { Plus, Edit2, Trash2, Save, X, Droplets, Settings2, Info, Truck } from 'lucide-react';

interface FuelTypeManagerProps {
  orgId?: string;
  vehicleBrandModels?: VehicleBrandModel[];
}

export const FuelTypeManager: FC<FuelTypeManagerProps> = ({ orgId = 'default', vehicleBrandModels = [] }) => {
  const [types, setTypes] = useState<FuelType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<FuelType | null>(null);
  const [viewingType, setViewingType] = useState<FuelType | null>(null);
  const [formData, setFormData] = useState<Omit<FuelType, 'id'>>({
    name: '',
    description: ''
  });

  useEffect(() => {
    const unsub = storageService.subscribeToFuelTypes(orgId, setTypes);
    return () => unsub();
  }, [orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingType) {
        await storageService.updateFuelType(orgId, {
          ...editingType,
          ...formData
        });
      } else {
        await storageService.addFuelType(orgId, {
          id: formData.name.toLowerCase().replace(/\s+/g, '-'),
          ...formData
        });
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving fuel type:", error);
      alert("Erro ao salvar tipo de combustivel. Por favor, tente novamente.");
    }
  };

  const handleEdit = (type: FuelType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setTypeToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (typeToDelete) {
      try {
        await storageService.deleteFuelType(orgId, typeToDelete);
        setIsDeleteConfirmOpen(false);
        setTypeToDelete(null);
      } catch (error) {
        console.error("Error deleting fuel type:", error);
        alert("Erro ao excluir tipo de combustivel. Por favor, tente novamente.");
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleViewDetails = (type: FuelType) => {
    setViewingType(type);
  };

  const getModelsForFuel = (fuelName: string) => {
    return vehicleBrandModels.filter(bm => bm.fuelType === fuelName);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Droplets className="h-8 w-8 text-blue-600" />
            Tipos de Combustiveis
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gerencie os tipos de combustiveis disponiveis no sistema</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Novo Tipo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {types.map((type) => (
          <div 
            key={type.id} 
            className="group bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 cursor-pointer"
            onClick={() => handleViewDetails(type)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                <Droplets className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(type)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1 uppercase">{type.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">{type.description || 'Sem descricao'}</p>
            
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg w-fit">
              <Info className="h-3.5 w-3.5" />
              Ver detalhes e modelos
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalhes */}
      {viewingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                    <Droplets className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase">
                      {viewingType.name}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Detalhes do Combustivel</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingType(null)}
                  className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {viewingType.description && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <p className="text-slate-600 dark:text-slate-300 text-sm">{viewingType.description}</p>
                </div>
              )}
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Modelos Vinculados ({getModelsForFuel(viewingType.name).length})
              </h3>
              
              {getModelsForFuel(viewingType.name).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getModelsForFuel(viewingType.name).map(model => (
                    <div key={model.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm text-slate-400">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{model.brand}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{model.model}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Truck className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum modelo de veiculo vinculado a este combustivel.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Va em "Modelos de Veiculos" para vincular.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                    {editingType ? 'Editar Tipo' : 'Novo Tipo de Combustivel'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure as caracteristicas do combustivel</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome do Tipo</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white transition-all uppercase"
                    placeholder="Ex: DIESEL S10, GASOLINA, ETANOL..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Descricao (Opcional)</label>
                  <textarea
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white transition-all resize-none"
                    rows={3}
                    placeholder="Breve descricao do tipo de combustivel..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="h-5 w-5" />
                    Salvar Alteracoes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4">
                <Trash2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Excluir Tipo?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
                Tem certeza que deseja excluir este tipo de combustivel? Esta acao nao pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all"
                >
                  Nao, manter
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
