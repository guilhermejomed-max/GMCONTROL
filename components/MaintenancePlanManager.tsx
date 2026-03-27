import React, { useState } from 'react';
import { MaintenancePlan, MaintenanceSchedule, Vehicle, StockItem } from '../types';
import { ClipboardList, Plus, Search, Calendar, Truck, Save, X, Trash2 } from 'lucide-react';
import { storageService } from '../services/storageService';

interface Props {
  orgId: string;
  plans: MaintenancePlan[];
  schedules: MaintenanceSchedule[];
  vehicles: Vehicle[];
  stockItems: StockItem[];
  defaultBranchId?: string;
}

export const MaintenancePlanManager: React.FC<Props> = ({ orgId, plans, schedules, vehicles, stockItems, defaultBranchId }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanType, setNewPlanType] = useState<'KM' | 'DATE'>('KM');
  const [newPlanInterval, setNewPlanInterval] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanStockItems, setNewPlanStockItems] = useState<string[]>([]);
  const [newStockItemId, setNewStockItemId] = useState('');

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedPlanForSchedule, setSelectedPlanForSchedule] = useState<MaintenancePlan | null>(null);
  const [scheduleVehicleId, setScheduleVehicleId] = useState('');
  const [scheduleDueKm, setScheduleDueKm] = useState('');
  const [scheduleDueDate, setScheduleDueDate] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName || !newPlanInterval) return;

    await storageService.addMaintenancePlan(orgId, {
      id: Date.now().toString(),
      name: newPlanName,
      description: newPlanDescription,
      type: newPlanType,
      intervalKm: newPlanType === 'KM' ? Number(newPlanInterval) : undefined,
      intervalDays: newPlanType === 'DATE' ? Number(newPlanInterval) : undefined,
      isActive: true,
      stockItemIds: newPlanStockItems,
      branchId: defaultBranchId
    });

    setIsCreateModalOpen(false);
    setNewPlanName('');
    setNewPlanInterval('');
    setNewPlanDescription('');
    setNewPlanStockItems([]);
    setNewStockItemId('');
  };

  const handleDeletePlan = async (id: string) => {
    setIsDeleteConfirmOpen(id);
  };

  const confirmDeletePlan = async () => {
    if (isDeleteConfirmOpen) {
      await storageService.deleteMaintenancePlan(orgId, isDeleteConfirmOpen);
      setIsDeleteConfirmOpen(null);
    }
  };

  const handleSchedulePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForSchedule || !scheduleVehicleId) return;

    await storageService.addMaintenanceSchedule(orgId, {
      id: Date.now().toString(),
      planId: selectedPlanForSchedule.id,
      vehicleId: scheduleVehicleId,
      status: 'PENDING',
      nextDueKm: selectedPlanForSchedule.type === 'KM' ? Number(scheduleDueKm) : undefined,
      nextDueDate: selectedPlanForSchedule.type === 'DATE' ? scheduleDueDate : undefined,
      branchId: defaultBranchId
    });

    setIsScheduleModalOpen(false);
    setSelectedPlanForSchedule(null);
    setScheduleVehicleId('');
    setScheduleDueKm('');
    setScheduleDueDate('');
  };

  const openScheduleModal = (plan: MaintenancePlan) => {
    setSelectedPlanForSchedule(plan);
    setIsScheduleModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          Planos Cadastrados
        </h3>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all text-sm"
        >
          <Plus className="h-4 w-4" /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan, index) => (
          <div key={`plan-${plan.id}-${index}`} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
            <button 
              onClick={() => handleDeletePlan(plan.id)}
              className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <h4 className="font-bold text-slate-800 dark:text-white text-lg">{plan.name}</h4>
            {plan.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>}
            
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                {plan.type === 'KM' ? <Truck className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {plan.type === 'KM' ? `${plan.intervalKm?.toLocaleString()} km` : `${plan.intervalDays} dias`}
              </span>
              <button 
                onClick={() => openScheduleModal(plan)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg transition-colors"
              >
                <Calendar className="h-3 w-3" /> Programar
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <ClipboardList className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum plano de manutenção cadastrado.</p>
          </div>
        )}
      </div>

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" /> Confirmar Exclusão
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">Tem certeza que deseja excluir este plano de manutenção? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button type="button" onClick={() => setIsDeleteConfirmOpen(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={confirmDeletePlan} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {isScheduleModalOpen && selectedPlanForSchedule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" /> Programar Manutenção
              </h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSchedulePlan} className="p-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">{selectedPlanForSchedule.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Intervalo: {selectedPlanForSchedule.type === 'KM' ? `${selectedPlanForSchedule.intervalKm?.toLocaleString()} km` : `${selectedPlanForSchedule.intervalDays} dias`}
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pesquisar Placa</label>
                <input 
                  type="text" 
                  placeholder="Digite a placa para filtrar..."
                  className="w-full px-3 py-2 mb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                />
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Veículo</label>
                <select 
                  required
                  value={scheduleVehicleId}
                  onChange={e => setScheduleVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                >
                  <option value="">Selecione um veículo...</option>
                  {vehicles
                    .filter(v => v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()))
                    .sort((a, b) => a.plate.localeCompare(b.plate))
                    .map(v => (
                    <option key={`vehicle-${v.id}`} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                  ))}
                </select>
              </div>

              {selectedPlanForSchedule.type === 'KM' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quilometragem para Troca</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={scheduleDueKm}
                    onChange={e => setScheduleDueKm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    placeholder="Ex: 150000"
                  />
                  {scheduleVehicleId && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      KM Atual do Veículo: {vehicles.find(v => v.id === scheduleVehicleId)?.odometer?.toLocaleString() || 0} km
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Vencimento</label>
                  <input 
                    type="date" 
                    required
                    value={scheduleDueDate}
                    onChange={e => setScheduleDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                  <Save className="h-4 w-4" /> Programar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" /> Novo Plano de Manutenção
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Serviço</label>
                <input 
                  type="text" 
                  required
                  value={newPlanName}
                  onChange={e => setNewPlanName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  placeholder="Ex: Troca de Óleo"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  value={newPlanDescription}
                  onChange={e => setNewPlanDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  placeholder="Detalhes do serviço..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Controle</label>
                  <select 
                    value={newPlanType}
                    onChange={e => setNewPlanType(e.target.value as 'KM' | 'DATE')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="KM">Por Quilometragem</option>
                    <option value="DATE">Por Tempo (Dias)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Intervalo</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={newPlanInterval}
                    onChange={e => setNewPlanInterval(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    placeholder={newPlanType === 'KM' ? "Ex: 10000" : "Ex: 180"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Itens do Almoxarifado (Opcional)</label>
                <div className="flex gap-2 mb-2">
                  <select 
                    value={newStockItemId}
                    onChange={e => setNewStockItemId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  >
                    <option value="">Selecione um item...</option>
                    {stockItems.map(item => (
                      <option key={`stock-${item.id}`} value={item.id}>{item.name} ({item.code})</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => {
                        if (newStockItemId) {
                            setNewPlanStockItems([...newPlanStockItems, newStockItemId]);
                            setNewStockItemId('');
                        }
                    }}
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {newPlanStockItems.length > 0 && (
                  <ul className="space-y-1">
                    {newPlanStockItems.map((itemId, idx) => {
                      const item = stockItems.find(i => i.id === itemId);
                      return (
                        <li key={`new-stock-${itemId}-${idx}`} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{item?.name || 'Item desconhecido'}</span>
                          <button 
                            type="button" 
                            onClick={() => setNewPlanStockItems(newPlanStockItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                  <Save className="h-4 w-4" /> Salvar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
