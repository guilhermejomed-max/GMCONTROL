
import React, { useState, useEffect, FC, FormEvent, ChangeEvent } from 'react';
import { Tire, TireStatus, SystemSettings, TireModelDefinition, Vehicle } from '../types';
import { Save, Flame, Loader2, CheckCircle2, Plus, X, Search, Activity, Ruler, CircleDollarSign, BookOpen, Calendar, ArrowLeft, Tag, Layers, Truck } from 'lucide-react';
import QRCode from 'react-qr-code';

interface TireFormProps {
  onAddTire: (tire: Tire) => Promise<void>;
  onCancel: () => void;
  onFinish?: () => void;
  settings?: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
  existingTires?: Tire[];
  vehicles?: Vehicle[];
  autoMountVehicleId?: string;
  autoMountPosition?: string;
}

export const TireForm: FC<TireFormProps> = ({ onAddTire, onCancel, onFinish, settings, onUpdateSettings, existingTires = [], vehicles = [], autoMountVehicleId, autoMountPosition }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [successTire, setSuccessTire] = useState<Tire | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  
  const initialFormData = {
    fireNumber: '', 
    brand: '', 
    model: '', 
    width: 295, 
    profile: 80, 
    rim: 22.5, 
    dot: '', 
    status: TireStatus.NEW, 
    location: '', 
    quantity: 1, 
    price: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    originalTreadDepth: 18.0, 
    currentTreadDepth: 18.0, 
    targetPressure: 110, 
    treadType: 'LISO', 
    retreader: '', 
    retreadCost: 0,
    totalKms: 0,
    firstLifeKms: 0,
    retreadKms: 0,
    retreadCount: 0,
    vehicleId: autoMountVehicleId || '',
    position: autoMountPosition || ''
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
      if (formData.status === TireStatus.NEW) {
          setFormData(prev => ({ ...prev, currentTreadDepth: prev.originalTreadDepth }));
      }
  }, [formData.originalTreadDepth, formData.status]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: ['width', 'profile', 'rim', 'quantity', 'price', 'originalTreadDepth', 'currentTreadDepth', 'targetPressure', 'retreadCost', 'totalKms', 'firstLifeKms', 'retreadKms', 'retreadCount'].includes(name) ? Number(value) : value 
    }));
  };

  const handleConditionChange = (e: ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      let status = TireStatus.NEW;
      let retreadCount = 0;
      let kms = 0;

      if (val === 'USED') {
          status = TireStatus.USED;
          kms = 10000;
      } else if (val === 'RETREADED') {
          status = TireStatus.RETREADED;
          retreadCount = 1;
          kms = 50000;
      }

      setFormData(prev => ({
          ...prev,
          status,
          retreadCount,
          totalKms: kms
      }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const normalizedFireNumber = formData.fireNumber.trim().toUpperCase();
      if (existingTires.some(t => t.fireNumber.toUpperCase() === normalizedFireNumber)) {
          alert(`Erro: Fogo "${normalizedFireNumber}" já cadastrado.`);
          setIsSaving(false);
          return;
      }
      
      const selectedVehicle = formData.vehicleId ? vehicles.find(v => v.id === formData.vehicleId) : null;
      
      const newTire: Tire = {
        id: Date.now().toString(36),
        ...formData,
        fireNumber: normalizedFireNumber,
        brand: formData.brand.trim().toUpperCase(),
        model: formData.model.trim().toUpperCase(),
        currentTreadDepth: formData.currentTreadDepth,
        pressure: formData.targetPressure,
        history: [{ date: new Date().toISOString(), action: 'CADASTRADO', details: formData.vehicleId ? `Novo pneu registrado e montado no veículo ${selectedVehicle?.plate || ''}.` : 'Novo pneu registrado no estoque.' }],
        totalKms: formData.totalKms,
        firstLifeKms: formData.firstLifeKms,
        retreadKms: formData.retreadKms,
        totalInvestment: formData.price,
        costPerKm: 0,
        retreadCount: formData.retreadCount,
        treadType: formData.treadType as 'LISO' | 'BORRACHUDO',
        purchaseDate: formData.purchaseDate,
        status: formData.status,
        vehicleId: formData.vehicleId || undefined,
        position: formData.position || undefined,
        installOdometer: selectedVehicle ? selectedVehicle.odometer : undefined,
        installDate: formData.vehicleId ? new Date().toISOString() : undefined,
        location: selectedVehicle ? selectedVehicle.plate : 'Estoque'
      };
      await onAddTire(newTire);
      setSuccessTire(newTire); 
    } catch (error) {
      alert("Erro ao salvar pneu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectFromCatalog = (item: TireModelDefinition) => {
    setFormData(prev => ({ 
      ...prev, 
      brand: item.brand, 
      model: item.model, 
      width: item.width, 
      profile: item.profile, 
      rim: item.rim, 
      originalTreadDepth: item.originalDepth, 
      targetPressure: item.standardPressure 
    }));
    setIsSelectorOpen(false);
  };

  const filteredCatalog = settings?.tireModels?.filter(m => 
     (m.brand || '').toLowerCase().includes(catalogSearch.toLowerCase()) || 
     (m.model || '').toLowerCase().includes(catalogSearch.toLowerCase())
  ) || [];

  if (successTire) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] animate-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-slate-900 w-full max-w-xl p-10 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-emerald-400 to-green-600"></div>
            
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Pneu Registrado!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">O item foi adicionado ao estoque com sucesso.</p>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 inline-flex flex-col items-center mb-8 shadow-sm">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <QRCode value={successTire.fireNumber} size={160} />
                </div>
                <div className="mt-4 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identificação</p>
                    <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{successTire.fireNumber}</p>
                </div>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={() => onFinish?.()} 
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold transition-all"
                >
                    Voltar ao Estoque
                </button>
                <button 
                    onClick={() => { setSuccessTire(null); setFormData(prev => ({ ...prev, fireNumber: '' })); }} 
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="h-5 w-5"/> Cadastrar Outro
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
         <div>
            <button onClick={onCancel} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-2 text-sm font-bold">
                <ArrowLeft className="h-4 w-4"/> Voltar
            </button>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Novo Registro de Pneu</h2>
         </div>
         
         {settings && (
            <button 
               onClick={() => setIsSelectorOpen(true)}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
               <BookOpen className="h-5 w-5" /> Importar do Catálogo
            </button>
         )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* COL 1: IDENTIDADE */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Tag className="h-32 w-32"/></div>
           
           <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Flame className="h-4 w-4"/></div>
              Identificação
           </h4>
           
           <div className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Nº Fogo (ID Único)</label>
                <input 
                    required 
                    type="text" 
                    name="fireNumber" 
                    value={formData.fireNumber} 
                    onChange={e => setFormData({...formData, fireNumber: e.target.value.toUpperCase()})} 
                    className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-3xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-800 dark:text-white uppercase placeholder-slate-300 text-center tracking-widest transition-all" 
                    placeholder="0000" 
                    autoFocus
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Marca</label>
                    <input required type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-800 dark:text-white uppercase" placeholder="EX: MICHELIN" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Modelo</label>
                    <input required type="text" name="model" value={formData.model} onChange={handleChange} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-800 dark:text-white uppercase" placeholder="EX: X MULTI Z" />
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">DOT (Semana/Ano)</label>
                 <input type="text" name="dot" value={formData.dot} onChange={handleChange} maxLength={4} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-blue-500 text-slate-800 dark:text-white text-center tracking-[0.5em]" placeholder="0000" />
              </div>
           </div>
        </div>

        {/* COL 2: TÉCNICA */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Layers className="h-32 w-32"/></div>

           <h4 className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Ruler className="h-4 w-4"/></div>
              Especificações
           </h4>
           
           <div className="space-y-6 relative z-10">
               <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">Largura</label><input type="number" name="width" value={formData.width} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-white text-center" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">Perfil</label><input type="number" name="profile" value={formData.profile} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-white text-center" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 text-center">Aro</label><input type="number" name="rim" value={formData.rim} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-white text-center" /></div>
               </div>

               <div>
                   <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Tipo de Banda</label>
                   <div className="grid grid-cols-2 gap-3">
                       <button 
                           type="button" 
                           onClick={() => setFormData({...formData, treadType: 'LISO'})}
                           className={`p-4 rounded-2xl font-bold text-sm transition-all border-2 ${formData.treadType === 'LISO' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'}`}
                       >
                           Liso (Direcional)
                       </button>
                       <button 
                           type="button" 
                           onClick={() => setFormData({...formData, treadType: 'BORRACHUDO'})}
                           className={`p-4 rounded-2xl font-bold text-sm transition-all border-2 ${formData.treadType === 'BORRACHUDO' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'}`}
                       >
                           Borrachudo (Tração)
                       </button>
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Sulco Original (mm)</label>
                      <input type="number" step="0.1" name="originalTreadDepth" value={formData.originalTreadDepth} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Pressão Alvo (PSI)</label>
                      <input type="number" name="targetPressure" value={formData.targetPressure} onChange={handleChange} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white" />
                  </div>
               </div>
           </div>
        </div>

        {/* COL 3: ORIGEM & FINANCEIRO */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
           <div>
               <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Activity className="h-4 w-4"/></div>
                  Origem & Custo
               </h4>
               
               <div className="space-y-6">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Condição Inicial</label>
                       <select 
                          className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-emerald-500 text-slate-800 dark:text-white appearance-none"
                          value={formData.status === TireStatus.RETREADED ? 'RETREADED' : (formData.status === TireStatus.USED ? 'USED' : 'NEW')}
                          onChange={handleConditionChange}
                       >
                           <option value="NEW">Novo (0km)</option>
                           <option value="USED">Usado (Original)</option>
                           <option value="RETREADED">Recapado</option>
                       </select>
                   </div>

                   {formData.status !== TireStatus.NEW && (
                       <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in slide-in-from-top-2">
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">KM 1ª Vida</label>
                                   <input type="number" name="totalKms" value={formData.totalKms} onChange={handleChange} className="w-full p-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-center outline-none" />
                               </div>
                               <div>
                                   <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Sulco Atual</label>
                                   <input type="number" step="0.1" name="currentTreadDepth" value={formData.currentTreadDepth} onChange={handleChange} className="w-full p-2 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-center outline-none" />
                               </div>
                           </div>
                       </div>
                   )}

                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Data Compra</label>
                      <div className="relative">
                         <Calendar className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                         <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold outline-none focus:border-emerald-500 text-slate-800 dark:text-white" />
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Valor Unitário</label>
                      <div className="relative">
                         <CircleDollarSign className="absolute left-4 top-4 h-6 w-6 text-emerald-600" />
                         <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border-2 border-emerald-100 dark:border-emerald-900 rounded-2xl text-2xl font-black outline-none focus:border-emerald-500 text-emerald-700 dark:text-emerald-400 placeholder-emerald-200" placeholder="0.00" />
                      </div>
                   </div>
               </div>
           </div>

           <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[1.5rem] font-black text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                    Confirmar Registro
                </button>
           </div>
        </div>

      </form>

      {/* CATALOG MODAL */}
      {isSelectorOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
               <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                  <h3 className="font-black text-xl text-slate-800 dark:text-white flex items-center gap-3"><BookOpen className="h-6 w-6 text-indigo-600"/> Catálogo de Padrões</h3>
                  <button onClick={() => setIsSelectorOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500"><X className="h-6 w-6"/></button>
               </div>
               <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                     <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                     <input 
                        autoFocus
                        type="text" 
                        placeholder="Buscar marca ou modelo..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                     />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {filteredCatalog.map((item) => (
                        <button 
                           key={item.id} 
                           onClick={() => handleSelectFromCatalog(item)}
                           className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                        >
                           <div className="font-black text-slate-800 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">{item.brand}</div>
                           <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{item.model}</div>
                           <div className="mt-3 flex flex-wrap gap-2">
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg font-bold">{item.width}/{item.profile} R{item.rim}</span>
                              <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg font-bold">{item.originalDepth}mm</span>
                           </div>
                        </button>
                     ))}
                     {(!settings?.tireModels || settings.tireModels.length === 0) ? (
                        <div className="col-span-full text-center py-12 text-slate-400 font-medium">
                           O catálogo está vazio. Adicione modelos nas Configurações.
                        </div>
                     ) : filteredCatalog.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-400 font-medium">Nenhum modelo encontrado para sua busca.</div>
                     ) : null}
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
