
import React, { useState } from 'react';
import { 
  X, Save, Truck, User, Building2, Calendar, Clock, 
  Search, ClipboardList, Wrench, CheckCircle2, AlertTriangle,
  Package, DollarSign, UserCircle, Tag, Box, Info
} from 'lucide-react';
import { ServiceOrder, Vehicle, Branch, Collaborator, Partner, Driver, StockItem } from '../types';

interface ServiceOrderOpeningProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Partial<ServiceOrder>) => void;
  vehicles: Vehicle[];
  branches: Branch[];
  collaborators: Collaborator[];
  partners: Partner[];
  drivers: Driver[];
  stockItems: StockItem[];
  settings?: any;
  defaultBranchId?: string;
  nextOrderNumber: number;
}

export const ServiceOrderOpening: React.FC<ServiceOrderOpeningProps> = ({
  isOpen,
  onClose,
  onSubmit,
  vehicles,
  branches,
  collaborators,
  partners,
  drivers,
  stockItems,
  settings,
  defaultBranchId,
  nextOrderNumber
}) => {
  const [formData, setFormData] = useState<Partial<ServiceOrder>>({
    branchId: defaultBranchId || '',
    orderNumber: nextOrderNumber,
    status: 'PENDENTE',
    date: new Date().toISOString().split('T')[0],
    startTime: new Date().toISOString(),
    serviceType: 'INTERNAL',
    isAuthorized: true,
    isIssued: false,
    waitingInvoice: false,
    isPreventiveMaintenance: true,
    totalCost: 0,
    laborCost: 0,
    partsCost: 0,
    parts: [],
  });

  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState(1);

  const handleAddPart = () => {
    if (!selectedPartId) return;
    const item = stockItems.find(i => i.id === selectedPartId);
    if (!item) return;

    const existingParts = formData.parts || [];
    const existingIndex = existingParts.findIndex(p => p.name === item.name);

    let newParts;
    if (existingIndex >= 0) {
      newParts = [...existingParts];
      newParts[existingIndex].quantity += selectedPartQty;
    } else {
      newParts = [...existingParts, {
        name: item.name,
        quantity: selectedPartQty,
        unitCost: item.averageCost
      }];
    }

    const newPartsCost = newParts.reduce((acc, p) => acc + (p.quantity * p.unitCost), 0);
    setFormData(prev => ({ 
      ...prev, 
      parts: newParts,
      partsCost: newPartsCost
    }));
    setSelectedPartId('');
    setSelectedPartQty(1);
  };

  const handleRemovePart = (index: number) => {
    const newParts = (formData.parts || []).filter((_, i) => i !== index);
    const newPartsCost = newParts.reduce((acc, p) => acc + (p.quantity * p.unitCost), 0);
    setFormData(prev => ({ 
      ...prev, 
      parts: newParts,
      partsCost: newPartsCost
    }));
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleId = e.target.value;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleId,
        vehiclePlate: vehicle.plate,
        odometer: vehicle.odometer,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const inputClass = "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs font-medium text-slate-700";
  const labelClass = "block text-[10px] font-bold text-blue-800 mb-0.5 whitespace-nowrap";
  const sectionTitleClass = "text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200 flex items-center gap-2";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#EBEBEB] w-full max-w-5xl rounded-lg shadow-2xl border border-slate-400 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-slate-200 px-4 py-2 border-b border-slate-400 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Abertura de Ordem de Serviço</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-300 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          {/* Top Row: Filial, OS */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-6">
              <label className={labelClass}>Filial :</label>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  className="w-12 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-center" 
                  value={formData.branchId?.substring(0, 2) || '1'} 
                  readOnly 
                />
                <select 
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Selecione...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-span-6">
              <label className={labelClass}>Número da OS :</label>
              <input 
                type="text" 
                className={`${inputClass} bg-white font-bold text-blue-700`} 
                value={formData.orderNumber} 
                readOnly 
              />
            </div>
          </div>

          {/* Row 1: Manutenção, Tipo */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-6">
              <label className={labelClass}>Manutenção :</label>
              <select name="maintenanceType" className={inputClass} onChange={handleChange}>
                <option value="Veículo">Veículo</option>
                <option value="Pneu">Pneu</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div className="col-span-6">
              <label className={labelClass}>Tipo :</label>
              <select name="serviceType" value={formData.serviceType} className={inputClass} onChange={handleChange}>
                <option value="INTERNAL">Serviços Interno</option>
                <option value="EXTERNAL">Serviços Externo</option>
                <option value="BOTH">Misto</option>
              </select>
            </div>
          </div>

          {/* Row 2: Indisponibilidade */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12">
              <label className={labelClass}>Gerou Indisponibilidade :</label>
              <select name="indisponibilidade" className={inputClass} onChange={handleChange}>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>

          {/* Row 4: Datas e Horas */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className={labelClass}>Data / Hora Entrada :</label>
              <input type="text" name="date" value={formData.date + ' ' + new Date().toLocaleTimeString().substring(0, 5)} className={inputClass} readOnly />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Duração dos proc. :</label>
              <input type="text" name="duration" className={inputClass} value="00:00" readOnly />
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Prev. Entrega :</label>
              <input type="text" name="estimatedDelivery" className={inputClass} value={formData.date + ' ' + new Date().toLocaleTimeString().substring(0, 5)} onChange={handleChange} />
            </div>
          </div>

          {/* Row 5: Fornecedor (Conditional) */}
          {(formData.serviceType === 'EXTERNAL' || formData.serviceType === 'BOTH') && (
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12">
                <label className={labelClass}>Fornecedor :</label>
                <div className="flex gap-1">
                  <select 
                    name="supplierName" 
                    className={inputClass} 
                    onChange={(e) => {
                      const partner = partners.find(p => p.id === e.target.value);
                      setFormData(prev => ({ ...prev, supplierName: partner?.name }));
                    }}
                  >
                    <option value="">Selecione um fornecedor...</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button type="button" className="p-1 bg-slate-300 rounded border border-slate-400"><Search className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Row 7: Veículo, Box */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <label className={labelClass}>Placa do Veículo :</label>
              <div className="flex gap-1">
                <select 
                  name="vehicleId" 
                  className={inputClass} 
                  value={formData.vehicleId} 
                  onChange={handleVehicleChange}
                >
                  <option value="">Selecione...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate}</option>
                  ))}
                </select>
                <button type="button" className="p-1 bg-slate-300 rounded border border-slate-400"><Calendar className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="col-span-5">
              <input type="text" className={`${inputClass} bg-slate-200`} value={formData.vehiclePlate ? `${formData.vehiclePlate} - ${vehicles.find(v => v.id === formData.vehicleId)?.brand || ''} ${vehicles.find(v => v.id === formData.vehicleId)?.model || ''}` : ''} readOnly />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Box :</label>
              <input type="text" name="box" className={inputClass} onChange={handleChange} />
            </div>
          </div>

          {/* Row 9: KM Entrada / Saída */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <label className={labelClass}>Km/Horimetro Entrada :</label>
              <input type="number" name="odometer" value={formData.odometer} className={inputClass} onChange={handleChange} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Km/Horimetro Saída :</label>
              <input type="number" name="exitOdometer" className={inputClass} onChange={handleChange} />
            </div>
            <div className="col-span-6">
              <div className="bg-slate-200 border border-slate-300 rounded px-2 py-1 text-[9px] text-slate-500">
                Ultima OS encerrada : 12609 / Km saída : 307225 / Data : 09/03/26 09:48
              </div>
            </div>
          </div>

          {/* Row 11: Funcionário */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className={labelClass}>Funcionário :</label>
              <input type="text" name="employeeId" className={inputClass} onChange={handleChange} />
            </div>
            <div className="col-span-8">
              <select 
                name="employeeId" 
                className={inputClass} 
                onChange={(e) => {
                  const c = collaborators.find(col => col.id === e.target.value);
                  setFormData(prev => ({ ...prev, employeeId: c?.id, employeeName: c?.name }));
                }}
              >
                <option value="">Selecione...</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 12: Setor */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className={labelClass}>Setor :</label>
              <input type="text" name="sectorId" className={inputClass} value="1" readOnly />
            </div>
            <div className="col-span-8">
              <input type="text" name="sectorName" className={`${inputClass} bg-slate-200`} value="MANUTENCAO" readOnly />
            </div>
          </div>

          {/* Row 13: Classificação */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className={labelClass}>Classificação :</label>
              <div className="flex gap-1">
                <input type="text" name="classificationId" className={inputClass} value="37" onChange={handleChange} />
                <button type="button" className="p-1 bg-slate-300 rounded border border-slate-400"><Calendar className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="col-span-8">
              <input type="text" name="classificationName" className={`${inputClass} bg-yellow-100`} value="PREVENTIVA" readOnly />
            </div>
          </div>

          {/* Row 13.5: Base de Manutenção (Added for Arrival Alert) */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12">
              <label className={labelClass}>Base de Manutenção (Gera Alerta de Chegada) :</label>
              <select 
                name="maintenanceBaseId" 
                className={inputClass} 
                value={formData.maintenanceBaseId || ''} 
                onChange={(e) => {
                  const baseId = e.target.value;
                  const base = settings?.savedPoints?.find((p: any) => p.id === baseId);
                  setFormData(prev => ({ 
                    ...prev, 
                    maintenanceBaseId: baseId,
                    maintenanceBaseName: base?.name 
                  }));
                }}
              >
                <option value="">Nenhuma base selecionada</option>
                {settings?.savedPoints?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 14: Serviços Solicitados */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <label className={labelClass}>Serviços solicitados :</label>
              <textarea 
                name="details" 
                className={`${inputClass} h-12 resize-none`} 
                value={formData.details}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          {/* Row 15: Observações */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <label className={labelClass}>Observações :</label>
              <textarea 
                name="notes" 
                className={`${inputClass} h-12 resize-none`} 
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          {/* Row 16: Peças (Added) */}
          <div className="space-y-2 border border-slate-300 rounded p-3 bg-slate-100/50">
            <h3 className={sectionTitleClass}>
              <Package className="h-3 w-3" /> Peças e Materiais
            </h3>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-8">
                <label className={labelClass}>Selecionar Peça :</label>
                <select 
                  className={inputClass}
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                >
                  <option value="">Selecione uma peça do estoque...</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} (R$ {item.averageCost.toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Qtd :</label>
                <input 
                  type="number" 
                  className={inputClass}
                  value={selectedPartQty}
                  onChange={(e) => setSelectedPartQty(Number(e.target.value))}
                  min="1"
                />
              </div>
              <div className="col-span-2">
                <button 
                  type="button"
                  onClick={handleAddPart}
                  className="w-full py-1 bg-blue-600 text-white rounded text-[10px] font-bold uppercase hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {formData.parts && formData.parts.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded bg-white overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-2 py-1 text-left">Peça</th>
                      <th className="px-2 py-1 text-center">Qtd</th>
                      <th className="px-2 py-1 text-right">Unit</th>
                      <th className="px-2 py-1 text-right">Total</th>
                      <th className="px-2 py-1 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.parts.map((part, index) => (
                      <tr key={index} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1 font-medium">{part.name}</td>
                        <td className="px-2 py-1 text-center">{part.quantity}</td>
                        <td className="px-2 py-1 text-right">R$ {part.unitCost.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right font-bold">R$ {(part.quantity * part.unitCost).toFixed(2)}</td>
                        <td className="px-2 py-1 text-center">
                          <button 
                            type="button"
                            onClick={() => handleRemovePart(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Row 17: Box */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12">
              <label className={labelClass}>Box :</label>
              <input type="text" name="box" className={inputClass} onChange={handleChange} />
            </div>
          </div>

          {/* Footer: Custos e Botões */}
          <div className="pt-4 border-t border-slate-400 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-800 font-black text-xs uppercase">Custo Total da OS :</span>
                <input 
                  type="number" 
                  className="w-24 px-2 py-1 bg-slate-200 border border-slate-300 rounded text-xs font-bold" 
                  value={((formData.laborCost || 0) + (formData.partsCost || 0)).toFixed(2)} 
                  readOnly 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold text-[10px] uppercase">( Valor M.O. :</span>
                <input 
                  type="number" 
                  name="laborCost"
                  className="w-20 px-2 py-1 bg-slate-200 border border-slate-300 rounded text-xs font-bold" 
                  value={formData.laborCost} 
                  onChange={handleChange}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold text-[10px] uppercase">+ Valor Peças :</span>
                <input 
                  type="number" 
                  name="partsCost"
                  className="w-20 px-2 py-1 bg-slate-200 border border-slate-300 rounded text-xs font-bold" 
                  value={formData.partsCost} 
                  onChange={handleChange}
                />
                <span className="text-slate-800 font-bold text-[10px] uppercase">)</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button"
                className="flex flex-col items-center justify-center px-4 py-1 bg-slate-100 border border-slate-400 rounded hover:bg-slate-200 transition-all group"
              >
                <ClipboardList className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-slate-700 uppercase mt-1">Liberar O.S.</span>
              </button>
              <button 
                type="submit"
                className="flex flex-col items-center justify-center px-4 py-1 bg-slate-100 border border-slate-400 rounded hover:bg-slate-200 transition-all group"
              >
                <CheckCircle2 className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-bold text-slate-700 uppercase mt-1">Aprovar O.S.</span>
              </button>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-12 gap-2 text-[9px] text-slate-500 pt-2">
            <div className="col-span-4">
              Última Interação : <span className="bg-slate-200 px-1 rounded">08/04/2026 09:25</span>
            </div>
            <div className="col-span-4">
              Usuário Abertura : <span className="bg-slate-200 px-1 rounded">GUILHERME.MARTINS</span>
            </div>
            <div className="col-span-4 text-right">
              Data Inclusão / Atualização : <span className="bg-slate-200 px-1 rounded">09/04/2026 09:26</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
