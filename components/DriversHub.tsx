
import React, { useState, useMemo, FC } from 'react';
import { Driver, Vehicle, Tire } from '../types';
import { UserSquare2, Search, Plus, Trash2, PenLine, Phone, FileBadge, Truck, Calendar, X, Save, Leaf, AlertTriangle, Trophy } from 'lucide-react';

interface DriversHubProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  tires: Tire[];
  onAddDriver: (driver: Driver) => Promise<void>;
  onUpdateDriver: (driver: Driver) => Promise<void>;
  onDeleteDriver: (id: string) => Promise<void>;
  onUpdateVehicle: (vehicle: Vehicle) => Promise<void>;
}

export const DriversHub: FC<DriversHubProps> = ({ drivers, vehicles, tires, onAddDriver, onUpdateDriver, onDeleteDriver, onUpdateVehicle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: '',
    licenseNumber: '',
    licenseCategory: 'E',
    licenseExpiry: '',
    phone: '',
    status: 'ATIVO',
    hiredDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const [assignedVehicleId, setAssignedVehicleId] = useState<string>('');

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.licenseNumber.includes(searchTerm)
    );
  }, [drivers, searchTerm]);

  // --- ECO SCORE ALGORITHM ---
  // Calculates score
  const getDriverScore = (driverId: string) => {
      // Mock score for now, would depend on telemetry or tire wear rate
      return 100;
  };

  const handleOpenModal = (driver?: Driver) => {
      if (driver) {
          setEditingDriver(driver);
          setFormData(driver);
          const vehicle = vehicles.find(v => v.currentDriverId === driver.id);
          setAssignedVehicleId(vehicle ? vehicle.id : '');
      } else {
          setEditingDriver(null);
          setFormData({
            name: '',
            licenseNumber: '',
            licenseCategory: 'E',
            licenseExpiry: '',
            phone: '',
            status: 'ATIVO',
            hiredDate: new Date().toISOString().slice(0, 10),
            notes: ''
          });
          setAssignedVehicleId('');
      }
      setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      try {
          let driverId = editingDriver?.id;

          if (editingDriver) {
              const updatedDriver = { ...editingDriver, ...formData } as Driver;
              await onUpdateDriver(updatedDriver);
          } else {
              driverId = Date.now().toString();
              const newDriver = { 
                  id: driverId, 
                  ...formData 
              } as Driver;
              await onAddDriver(newDriver);
          }

          // Handle Vehicle Assignment
          if (assignedVehicleId) {
              // 1. If assigned vehicle is different from previous, clear previous
              if (editingDriver) {
                  const prevVehicle = vehicles.find(v => v.currentDriverId === editingDriver.id);
                  if (prevVehicle && prevVehicle.id !== assignedVehicleId) {
                      await onUpdateVehicle({ ...prevVehicle, currentDriverId: undefined });
                  }
              }
              // 2. Assign to new vehicle
              const newVehicle = vehicles.find(v => v.id === assignedVehicleId);
              if (newVehicle) {
                  await onUpdateVehicle({ ...newVehicle, currentDriverId: driverId });
              }
          } else if (editingDriver) {
              // Unassign if cleared
              const prevVehicle = vehicles.find(v => v.currentDriverId === editingDriver.id);
              if (prevVehicle) {
                  await onUpdateVehicle({ ...prevVehicle, currentDriverId: undefined });
              }
          }

          setIsModalOpen(false);
      } catch (err) {
          console.error(err);
          alert("Erro ao salvar motorista.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Remover este motorista?")) {
          await onDeleteDriver(id);
          // Unassign vehicle
          const vehicle = vehicles.find(v => v.currentDriverId === id);
          if (vehicle) {
              await onUpdateVehicle({ ...vehicle, currentDriverId: undefined });
          }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
             <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                <UserSquare2 className="h-7 w-7 text-blue-600" /> Gestão de Motoristas
             </h2>
             <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Controle de condutores e atribuição de veículos.</p>
          </div>
          <button 
             onClick={() => handleOpenModal()} 
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all"
          >
             <Plus className="h-4 w-4"/> Novo Motorista
          </button>
       </div>

       <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input 
             type="text" 
             placeholder="Buscar por nome ou CNH..." 
             className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white placeholder-slate-400"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
          />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map(driver => {
             const assignedVehicle = vehicles.find(v => v.currentDriverId === driver.id);
             return (
                <div key={driver.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-lg">
                            {driver.name.substring(0,2).toUpperCase()}
                         </div>
                         <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">{driver.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                               <FileBadge className="h-3 w-3" /> CNH: {driver.licenseCategory}
                            </div>
                         </div>
                      </div>
                      <div className="flex gap-1">
                         <button onClick={() => handleOpenModal(driver)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"><PenLine className="h-4 w-4"/></button>
                         <button onClick={() => handleDelete(driver.id)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4"/></button>
                      </div>
                   </div>
                   
                   <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                         <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2"><Truck className="h-4 w-4"/> Veículo</span>
                         <span className="font-bold text-slate-800 dark:text-white">{assignedVehicle ? assignedVehicle.plate : 'Não atribuído'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                         <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2"><Phone className="h-4 w-4"/> Contato</span>
                         <span className="font-medium text-slate-700 dark:text-slate-300">{driver.phone || '-'}</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <Calendar className="h-3 w-3" /> Admissão: {new Date(driver.hiredDate).toLocaleDateString()}
                   </div>
                </div>
             );
          })}
       </div>

       {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingDriver ? 'Editar Motorista' : 'Novo Motorista'}</h3>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400"><X className="h-5 w-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white dark:bg-slate-900">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Nome Completo</label>
                      <input required type="text" className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-800 dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">CNH</label><input required type="text" className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-800 dark:text-white" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Categoria</label><select className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-800 dark:text-white" value={formData.licenseCategory} onChange={e => setFormData({...formData, licenseCategory: e.target.value})}><option value="C">C</option><option value="D">D</option><option value="E">E</option></select></div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Validade CNH</label><input type="date" className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-800 dark:text-white" value={formData.licenseExpiry} onChange={e => setFormData({...formData, licenseExpiry: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Telefone</label><input type="text" className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-800 dark:text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Veículo Atribuído</label>
                      <select className="w-full p-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg outline-none focus:border-blue-500 text-slate-800 dark:text-white" value={assignedVehicleId} onChange={e => setAssignedVehicleId(e.target.value)}>
                         <option value="">Sem veículo</option>
                         {[...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)).map(v => (
                            <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                         ))}
                      </select>
                   </div>
                   <div className="flex justify-end gap-2 pt-4">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                      <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};