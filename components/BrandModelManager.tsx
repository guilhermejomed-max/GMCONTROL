import React, { useState, FC, useMemo, useEffect } from 'react';
import { VehicleBrandModel, MaintenancePlan, Vehicle, ServiceOrder, Tire, VehicleType, FuelType } from '../types';
import { storageService } from '../services/storageService';
import { Save, Trash2, PenLine, Truck, Loader2, Plus, X, Car, ClipboardList, ChevronRight, LayoutGrid, BarChart3 } from 'lucide-react';

interface BrandModelManagerProps {
  orgId: string;
  vehicleBrandModels: VehicleBrandModel[];
  maintenancePlans?: MaintenancePlan[];
  vehicles?: Vehicle[];
  serviceOrders?: ServiceOrder[];
  tires?: Tire[];
  defaultBranchId?: string;
  vehicleTypes?: VehicleType[];
  fuelTypes?: FuelType[];
}

export const BrandModelManager: FC<BrandModelManagerProps> = ({ 
  orgId,
  vehicleBrandModels: allVehicleBrandModels, 
  maintenancePlans: allMaintenancePlans = [],
  vehicles = [],
  serviceOrders = [],
  tires = [],
  defaultBranchId,
  vehicleTypes = [],
  fuelTypes = []
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  
  const vehicleBrandModels = useMemo(() => {
    return defaultBranchId ? allVehicleBrandModels.filter(bm => bm.branchId === defaultBranchId) : allVehicleBrandModels;
  }, [allVehicleBrandModels, defaultBranchId]);

  const maintenancePlans = useMemo(() => {
    return defaultBranchId ? allMaintenancePlans.filter(mp => mp.branchId === defaultBranchId) : allMaintenancePlans;
  }, [allMaintenancePlans, defaultBranchId]);

  const [formData, setFormData] = useState<Partial<VehicleBrandModel>>({
    brand: '',
    model: '',
    type: vehicleTypes.length > 0 ? vehicleTypes[0].name : '',
    axles: 3,
    maintenancePlanId: '',
    oilChangeInterval: 0,
    oilLiters: 0,
    fuelType: 'DIESEL S10',
    branchId: defaultBranchId || ''
  });

  // Group models by brand
  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(vehicleBrandModels.map(bm => bm.brand))).sort();
    return uniqueBrands.map(brand => ({
      name: brand,
      models: vehicleBrandModels.filter(bm => bm.brand === brand)
    }));
  }, [vehicleBrandModels]);

  const handleOpenAddBrand = () => {
    setIsAddingBrand(true);
    setFormData({ brand: '', model: '', type: 'CAVALO', axles: 3, maintenancePlanId: '', oilChangeInterval: 0, oilLiters: 0, fuelType: 'DIESEL S10' });
  };

  const handleOpenAddModel = (brand: string) => {
    setIsAddingModel(true);
    setEditingModelId(null);
    setFormData({ brand, model: '', type: 'CAVALO', axles: 3, maintenancePlanId: '', oilChangeInterval: 0, oilLiters: 0, fuelType: 'DIESEL S10' });
  };

  const handleOpenEditModel = (bm: VehicleBrandModel) => {
    setIsAddingModel(true);
    setEditingModelId(bm.id);
    setFormData({ 
      brand: bm.brand, 
      model: bm.model, 
      type: bm.type, 
      axles: bm.axles, 
      maintenancePlanId: bm.maintenancePlanId || '',
      oilChangeInterval: bm.oilChangeInterval || 0,
      oilLiters: bm.oilLiters || 0,
      fuelType: bm.fuelType || 'DIESEL S10'
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.model) return;
    
    setIsSaving(true);
    try {
      if (editingModelId) {
        await storageService.updateVehicleBrandModel(orgId, {
          id: editingModelId,
          ...formData
        } as VehicleBrandModel);
      } else {
        await storageService.addVehicleBrandModel(orgId, {
          id: Date.now().toString(36),
          ...formData
        } as VehicleBrandModel);
      }
      setIsAddingBrand(false);
      setIsAddingModel(false);
      setEditingModelId(null);
    } catch (error) {
      console.error("Error saving brand model:", error);
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este modelo?")) {
      try {
        await storageService.deleteVehicleBrandModel(orgId, id);
      } catch (error) {
        console.error("Error deleting brand model:", error);
        alert("Erro ao excluir.");
      }
    }
  };

  const comparisonData = useMemo(() => {
    return vehicleBrandModels.map(bm => {
      const bmVehicles = vehicles.filter(v => v.brandModelId === bm.id);
      const vehicleIds = bmVehicles.map(v => v.id);
      
      const bmServiceOrders = serviceOrders.filter(so => vehicleIds.includes(so.vehicleId));
      const totalMaintenanceCost = bmServiceOrders.reduce((sum, so) => sum + (so.totalCost || (so.parts ? so.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0)), 0);
      const totalMaintenances = bmServiceOrders.length;
      
      const bmTires = tires.filter(t => t.vehicleId && vehicleIds.includes(t.vehicleId));
      const prematureWearTires = bmTires.filter(t => 
        t.status === 'Danificado/Descarte' || 
        (t.visualDamages && t.visualDamages.length > 0)
      ).length;

      return {
        ...bm,
        vehicleCount: bmVehicles.length,
        totalMaintenances,
        totalMaintenanceCost,
        avgCostPerVehicle: bmVehicles.length > 0 ? totalMaintenanceCost / bmVehicles.length : 0,
        prematureWearTires,
        totalTires: bmTires.length
      };
    }).sort((a, b) => b.vehicleCount - a.vehicleCount);
  }, [vehicleBrandModels, vehicles, serviceOrders, tires]);

  const selectedBrandData = brands.find(b => b.name === selectedBrand);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Car className="h-7 w-7 text-blue-600" /> Marcas e Modelos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie as marcas e modelos de veiculos da sua frota.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsComparing(true)} 
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <BarChart3 className="h-5 w-5 text-indigo-500" /> Comparativo
          </button>
          <button 
            onClick={handleOpenAddBrand} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus className="h-5 w-5" /> Nova Marca
          </button>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {brands.map(brand => (
          <button
            key={brand.name}
            onClick={() => setSelectedBrand(brand.name)}
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-4 w-4 text-blue-500" />
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase truncate">{brand.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">{brand.models.length} {brand.models.length === 1 ? 'Modelo' : 'Modelos'}</p>
          </button>
        ))}

        {brands.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Nenhuma marca cadastrada</h3>
            <button onClick={handleOpenAddBrand} className="mt-4 text-blue-600 font-bold hover:underline">Cadastrar primeira marca</button>
          </div>
        )}
      </div>

      {/* Brand Models Modal */}
      {selectedBrand && selectedBrandData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-[95%] max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-3">
                  <Truck className="h-6 w-6 text-blue-600" /> {selectedBrand}
                </h3>
                <p className="text-sm text-slate-500 font-medium">Modelos cadastrados para esta marca</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenAddModel(selectedBrand)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
                >
                  <Plus className="h-4 w-4" /> Novo Modelo
                </button>
                <button onClick={() => setSelectedBrand(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-6 w-6 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 px-2">Modelo</th>
                    <th className="pb-3 px-2">Tipo</th>
                    <th className="pb-3 px-2">Combustivel</th>
                    <th className="pb-3 px-2">Eixos</th>
                    <th className="pb-3 px-2">Troca de Oleo</th>
                    <th className="pb-3 px-2">Litragem</th>
                    <th className="pb-3 px-2">Plano PMJ</th>
                    <th className="pb-3 px-2 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {selectedBrandData.models.map(bm => (
                    <tr key={bm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="py-4 px-2 font-bold text-slate-800 dark:text-white">{bm.model}</td>
                      <td className="py-4 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {bm.type}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 uppercase">
                          {bm.fuelType || 'DIESEL S10'}
                        </span>
                      </td>
                      <td className="py-4 px-2 font-bold text-slate-600 dark:text-slate-400">{bm.axles}</td>
                      <td className="py-4 px-2 font-bold text-slate-600 dark:text-slate-400">
                        {bm.oilChangeInterval ? `${bm.oilChangeInterval.toLocaleString('pt-BR')} km` : '-'}
                      </td>
                      <td className="py-4 px-2 font-bold text-slate-600 dark:text-slate-400">
                        {bm.oilLiters ? `${bm.oilLiters} L` : '-'}
                      </td>
                      <td className="py-4 px-2">
                        {bm.maintenancePlanId ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                            <ClipboardList className="h-3 w-3" />
                            {maintenancePlans.find(p => p.id === bm.maintenancePlanId)?.name || 'Plano...'}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEditModel(bm)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <PenLine className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(bm.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal (Brand or Model) */}
      {(isAddingBrand || isAddingModel) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-[95%] max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {isAddingBrand ? 'Nova Marca' : (editingModelId ? 'Editar Modelo' : 'Novo Modelo')}
              </h3>
              <button onClick={() => { setIsAddingBrand(false); setIsAddingModel(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">MARCA</label>
                  <input 
                    required 
                    readOnly={isAddingModel}
                    type="text" 
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold ${isAddingModel ? 'opacity-60 cursor-not-allowed' : ''}`} 
                    value={formData.brand} 
                    onChange={e => setFormData({...formData, brand: e.target.value.toUpperCase()})} 
                    placeholder="Ex: VOLVO"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">MODELO</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold" 
                    value={formData.model} 
                    onChange={e => setFormData({...formData, model: e.target.value.toUpperCase()})} 
                    placeholder="Ex: FH 540"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">TIPO</label>
                  <select 
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                    value={formData.type} 
                    onChange={e => {
                      const selectedType = vehicleTypes.find(vt => vt.name === e.target.value);
                      setFormData({
                        ...formData, 
                        type: e.target.value,
                        axles: selectedType?.defaultAxles || formData.axles
                      });
                    }}
                  >
                    <option value="">Selecione o tipo</option>
                    {vehicleTypes.map(vt => (
                      <option key={vt.id} value={vt.name}>{vt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">EIXOS</label>
                  <input 
                    required 
                    type="number" 
                    min="1"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                    value={formData.axles} 
                    onChange={e => setFormData({...formData, axles: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">INTERVALO TROCA DE OLEO (KM)</label>
                <input 
                  type="number" 
                  min="0"
                  step="1000"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.oilChangeInterval || ''} 
                  onChange={e => setFormData({...formData, oilChangeInterval: Number(e.target.value)})} 
                  placeholder="Ex: 50000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">LITRAGEM DE OLEO (L)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.oilLiters || ''} 
                  onChange={e => setFormData({...formData, oilLiters: Number(e.target.value)})} 
                  placeholder="Ex: 35"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">TIPO DE COMBUSTIVEL</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.fuelType || ''} 
                  onChange={e => setFormData({...formData, fuelType: e.target.value})}
                >
                  <option value="">Selecione o combustivel</option>
                  {fuelTypes.map(ft => (
                    <option key={ft.id} value={ft.name}>{ft.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">PLANO DE MANUTENCAO (PMJ)</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={formData.maintenancePlanId || ''} 
                  onChange={e => setFormData({...formData, maintenancePlanId: e.target.value})}
                >
                  <option value="">Nenhum plano vinculado</option>
                  {maintenancePlans.map(plan => (
                    <option key={`plan-${plan.id}`} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsAddingBrand(false); setIsAddingModel(false); }} 
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingModelId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isComparing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-[95%] max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-indigo-500" /> Comparativo de Marcas e Modelos
                </h3>
                <p className="text-sm text-slate-500 font-medium">Analise de rentabilidade, manutencoes e desgastes prematuros</p>
              </div>
              <button onClick={() => setIsComparing(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-3 px-2">Marca / Modelo</th>
                      <th className="pb-3 px-2 text-center">Veiculos</th>
                      <th className="pb-3 px-2 text-center">Manutencoes</th>
                      <th className="pb-3 px-2 text-right">Custo Total</th>
                      <th className="pb-3 px-2 text-right">Custo Medio/Veiculo</th>
                      <th className="pb-3 px-2 text-center">Desgaste Prematuro (Pneus)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {comparisonData.map(data => (
                      <tr key={data.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-2">
                          <div className="font-bold text-slate-800 dark:text-white uppercase">{data.brand}</div>
                          <div className="text-xs text-slate-500 font-medium">{data.model}</div>
                        </td>
                        <td className="py-4 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                          {data.vehicleCount}
                        </td>
                        <td className="py-4 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                          {data.totalMaintenances}
                        </td>
                        <td className="py-4 px-2 text-right font-bold text-red-600 dark:text-red-400">
                          R$ {data.totalMaintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-2 text-right font-bold text-orange-600 dark:text-orange-400">
                          R$ {data.avgCostPerVehicle.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            data.prematureWearTires > 0 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {data.prematureWearTires} {data.prematureWearTires === 1 ? 'pneu' : 'pneus'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {comparisonData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                          Nenhum dado disponivel para comparacao.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
