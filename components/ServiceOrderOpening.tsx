
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Save, Truck, User, Building2, Calendar, Clock, 
  Search, ClipboardList, Wrench, CheckCircle2, AlertTriangle,
  Package, DollarSign, UserCircle, Tag, Box, Info, ScanLine
} from 'lucide-react';
import { Scanner } from './Scanner';
import { ServiceOrder, Vehicle, Branch, Collaborator, Partner, Driver, StockItem, Occurrence } from '../types';

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
  occurrenceId?: string; // Passed from URL/modal
  vehicleId?: string; // Passed from URL/modal
  nextOrderNumber: number;
  classifications?: any[];
  sectors?: any[];
  currentUser?: { name?: string; email?: string };
  occurrences?: Occurrence[];
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
  occurrenceId,
  vehicleId,
  nextOrderNumber,
  classifications = [],
  sectors = [],
  currentUser,
  occurrences = []
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
    services: [],
    serviceItems: [],
    assignedCollaborators: [],
    axles: [],
    details: '',
    title: '',
    vehicleId: vehicleId || '',
    occurrenceId: occurrenceId || '',
    vehiclePlate: vehicleId ? vehicles.find(v => v.id === vehicleId)?.plate || '' : '',
    odometer: 0,
    indisponibilidade: 'Nao',
    supplierName: '',
    providerName: '',
    externalServiceCost: 0,
    estimatedDelivery: '',
    deliveryLimit: '',
    contactName: '',
    paymentTerm: '',
    documentType: '',
    employeeId: '',
    employeeName: '',
    sectorId: '',
    sectorName: '',
    classificationId: '',
    classificationName: '',
    maintenanceBaseId: '',
    maintenanceBaseName: '',
    box: '',
    driverId: '',
    driverName: '',
  });

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleList, setShowVehicleList] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (occurrenceId && occurrences.length > 0) {
      const occ = occurrences.find(o => o.id === occurrenceId);
      if (occ) {
        setFormData(prev => ({
          ...prev,
          title: occ.reasonName,
          details: occ.description || '',
          vehicleId: occ.vehicleId,
          vehiclePlate: occ.vehiclePlate,
          occurrenceId: occ.id,
          sectorId: occ.responsibleSectorId || '',
          sectorName: occ.responsibleSector || '',
          branchId: occ.branchId || prev.branchId
        }));
        setVehicleSearch(occ.vehiclePlate);
      }
    }
  }, [occurrenceId, occurrences, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node)) {
        setShowVehicleList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const selectVehicle = (vehicle: Vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      odometer: vehicle.odometer,
    }));
    setVehicleSearch(vehicle.plate);
    setShowVehicleList(false);
  };

  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedPartQty, setSelectedPartQty] = useState(1);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState('');

  const handleScanPart = (code: string) => {
    const item = stockItems.find(i => i.code === code);
    if (item) {
      setSelectedPartId(item.id);
      setIsScannerOpen(false);
    } else {
      alert(`Peca com codigo ${code} nao encontrada no estoque.`);
    }
  };

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
        itemId: item.id,
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

  const handleAddEmployee = () => {
    if (!selectedEmployeeId) return;
    const collaborator = collaborators.find(col => col.id === selectedEmployeeId);
    if (!collaborator) return;

    const current = formData.assignedCollaborators || [];
    if (current.some(item => item.id === collaborator.id)) {
      setSelectedEmployeeId('');
      return;
    }

    const nextEmployees = [
      ...current,
      {
        id: collaborator.id,
        name: collaborator.name,
        hourlyRate: collaborator.hourlyRate || (collaborator.salary ? collaborator.salary / 220 : undefined)
      }
    ];

    setFormData(prev => ({
      ...prev,
      assignedCollaborators: nextEmployees,
      employeeId: nextEmployees[0]?.id || '',
      employeeName: nextEmployees.map(item => item.name).join(', '),
      collaboratorId: nextEmployees[0]?.id || '',
      collaboratorName: nextEmployees.map(item => item.name).join(', ')
    }));
    setSelectedEmployeeId('');
  };

  const handleRemoveEmployee = (id: string) => {
    const nextEmployees = (formData.assignedCollaborators || []).filter(item => item.id !== id);
    setFormData(prev => ({
      ...prev,
      assignedCollaborators: nextEmployees,
      employeeId: nextEmployees[0]?.id || '',
      employeeName: nextEmployees.map(item => item.name).join(', '),
      collaboratorId: nextEmployees[0]?.id || '',
      collaboratorName: nextEmployees.map(item => item.name).join(', ')
    }));
  };

  const handleAddServiceType = () => {
    if (!selectedServiceTypeId) return;
    const serviceType = (settings?.serviceTypes || []).find((service: any) => service.id === selectedServiceTypeId);
    if (!serviceType) return;

    const currentServiceItems = formData.serviceItems || [];
    if (currentServiceItems.some(item => item.id === serviceType.id)) {
      setSelectedServiceTypeId('');
      return;
    }

    const nextServiceItems = [
      ...currentServiceItems,
      {
        id: serviceType.id,
        name: serviceType.name,
        cost: Number(serviceType.cost || 0),
        source: 'INTERNAL' as const
      }
    ];
    const nextServices = nextServiceItems.map(item => ({
      id: item.id,
      name: item.name,
      cost: Number(item.cost || 0)
    }));

    setFormData(prev => ({
      ...prev,
      serviceItems: nextServiceItems,
      services: nextServices,
      sectorId: nextServiceItems[0]?.id || '',
      sectorName: nextServiceItems.map(item => item.name).join(', '),
      title: prev.title || nextServiceItems.map(item => item.name).join(' + ')
    }));
    setSelectedServiceTypeId('');
  };

  const handleRemoveServiceType = (id: string) => {
    const nextServiceItems = (formData.serviceItems || []).filter(item => item.id !== id);
    const nextServices = nextServiceItems.map(item => ({
      id: item.id,
      name: item.name,
      cost: Number(item.cost || 0)
    }));

    setFormData(prev => ({
      ...prev,
      serviceItems: nextServiceItems,
      services: nextServices,
      sectorId: nextServiceItems[0]?.id || '',
      sectorName: nextServiceItems.map(item => item.name).join(', '),
      title: nextServiceItems.length > 0 ? nextServiceItems.map(item => item.name).join(' + ') : prev.title
    }));
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let val: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    // Convert to number if the input type is number
    if (type === 'number' && value !== '') {
      val = Number(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceNames = (formData.serviceItems || []).map(item => item.name);
    const employeeNames = (formData.assignedCollaborators || []).map(item => item.name);
    const normalizedOrder = {
      ...formData,
      title: formData.title || serviceNames.join(' + ') || 'Manutencao',
      details: [
        serviceNames.length > 0 ? `Servicos: ${serviceNames.join(', ')}` : undefined,
        employeeNames.length > 0 ? `Funcionarios: ${employeeNames.join(', ')}` : undefined,
        formData.details
      ].filter(Boolean).join('\n'),
      sectorName: serviceNames.length > 0 ? serviceNames.join(', ') : formData.sectorName,
      employeeName: employeeNames.length > 0 ? employeeNames.join(', ') : formData.employeeName,
      collaboratorId: (formData.assignedCollaborators || [])[0]?.id || formData.collaboratorId || formData.employeeId,
      collaboratorName: employeeNames.length > 0 ? employeeNames.join(', ') : formData.collaboratorName || formData.employeeName,
      totalCost: Number(formData.laborCost || 0) + Number(formData.partsCost || 0) + Number(formData.externalServiceCost || 0)
    };
    onSubmit(normalizedOrder);
  };

  const inputClass = "w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs font-medium text-slate-700";
  const labelClass = "block text-[10px] font-bold text-blue-800 mb-0.5 whitespace-nowrap";
  const sectionTitleClass = "text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200 flex items-center gap-2";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 md:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl border border-slate-400 overflow-hidden flex flex-col max-h-[98vh] md:max-h-[95vh]">
        {/* Header */}
        <div className="px-4 py-2 border-b border-slate-400 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-600 rounded">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Abertura de Ordem de Servico</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-300 rounded-full transition-colors">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          {/* Top Row: Filial, OS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-6">
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
            <div className="col-span-1 md:col-span-6">
              <label className={labelClass}>Numero da OS :</label>
              <input 
                type="text" 
                className={`${inputClass} bg-white font-bold text-blue-700`} 
                value={formData.orderNumber} 
                readOnly 
              />
            </div>
          </div>

          {/* Row 1: Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-12">
              <label className={labelClass}>Tipo :</label>
              <select name="serviceType" value={formData.serviceType} className={inputClass} onChange={handleChange}>
                <option value="INTERNAL">Servicos Interno</option>
                <option value="EXTERNAL">Servicos Externo</option>
                <option value="BOTH">Misto</option>
              </select>
            </div>
          </div>

          {/* Row 2: Indisponibilidade */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-12">
              <label className={labelClass}>Gerou Indisponibilidade :</label>
              <select name="indisponibilidade" value={formData.indisponibilidade || 'Nao'} className={inputClass} onChange={handleChange}>
                <option value="Nao">Nao</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>

          {/* Row 4: Datas e Horas */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-4">
              <label className={labelClass}>Data / Hora Entrada :</label>
              <input type="text" name="date" value={formData.date + ' ' + new Date().toLocaleTimeString().substring(0, 5)} className={inputClass} readOnly />
            </div>
            <div className="col-span-1 md:col-span-4">
              <label className={labelClass}>Duracao dos proc. :</label>
              <input type="text" name="duration" className={inputClass} value="00:00" readOnly />
            </div>
            <div className="col-span-1 md:col-span-4">
              <label className={labelClass}>Prev. Entrega :</label>
              <input type="text" name="estimatedDelivery" className={inputClass} value={formData.date + ' ' + new Date().toLocaleTimeString().substring(0, 5)} onChange={handleChange} />
            </div>
          </div>

          {/* Row 5: Fornecedor (Conditional) */}
          {(formData.serviceType === 'EXTERNAL' || formData.serviceType === 'BOTH') && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="col-span-1 md:col-span-12">
                <label className={labelClass}>Fornecedor :</label>
                <div className="flex gap-1">
                  <select 
                    name="supplierName" 
                    className={inputClass} 
                    value={partners.find(p => p.name === formData.supplierName)?.id || ''}
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

          {/* Row 7: Veiculo, Box */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-5 relative" ref={vehicleDropdownRef}>
              <label className={labelClass}>Placa do Veiculo :</label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    className={inputClass}
                    placeholder="Digite a placa..."
                    value={vehicleSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVehicleSearch(val);
                      setShowVehicleList(true);
                      if (val === '') {
                        setFormData(prev => ({ ...prev, vehicleId: '', vehiclePlate: '', odometer: 0 }));
                      }
                    }}
                    onFocus={() => setShowVehicleList(true)}
                  />
                  {showVehicleList && filteredVehicles.length > 0 && (
                    <div className="absolute z-[200] w-full mt-1 bg-white border border-slate-300 rounded shadow-lg max-h-48 overflow-y-auto">
                      {filteredVehicles.map(v => (
                        <div 
                          key={v.id}
                          className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-xs font-bold text-slate-700 border-b border-slate-100 last:border-0"
                          onClick={() => selectVehicle(v)}
                        >
                          {v.plate} - {v.brand} {v.model}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="p-1 bg-slate-300 rounded border border-slate-400"><Calendar className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="col-span-1 md:col-span-5">
              <input type="text" className={`${inputClass} bg-slate-200`} value={formData.vehiclePlate ? `${formData.vehiclePlate} - ${vehicles.find(v => v.id === formData.vehicleId)?.brand || ''} ${vehicles.find(v => v.id === formData.vehicleId)?.model || ''}` : ''} readOnly />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className={labelClass}>Box :</label>
              <input type="text" name="box" className={inputClass} value={formData.box || ''} onChange={handleChange} />
            </div>
          </div>

          {/* Row 9: KM Entrada */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-4">
              <label className={labelClass}>Km/Horimetro Entrada :</label>
              <input type="number" name="odometer" value={formData.odometer} className={inputClass} onChange={handleChange} />
            </div>
            <div className="col-span-1 md:col-span-8">
              <div className="bg-slate-200 border border-slate-300 rounded px-2 py-1 text-[9px] text-slate-500">
                Ultima OS encerrada : 12609 / Km saida : 307225 / Data : 09/03/26 09:48
              </div>
            </div>
          </div>

          {/* Row 11: Funcionario */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-9">
              <label className={labelClass}>Funcionarios :</label>
              <select className={inputClass} value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                <option value="">Selecione um funcionario...</option>
                {collaborators
                  .filter(c => c.isActive !== false && !(formData.assignedCollaborators || []).some(item => item.id === c.id))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div className="col-span-1 md:col-span-3">
              <button type="button" onClick={handleAddEmployee} className="w-full py-1.5 bg-blue-600 text-white rounded text-[10px] font-black uppercase hover:bg-blue-700">
                Adicionar
              </button>
            </div>
            {(formData.assignedCollaborators || []).length > 0 && (
              <div className="col-span-1 md:col-span-12 flex flex-wrap gap-2">
                {(formData.assignedCollaborators || []).map(employee => (
                  <span key={employee.id} className="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded text-[10px] font-black uppercase">
                    {employee.name}
                    <button type="button" onClick={() => handleRemoveEmployee(employee.id)} className="text-blue-500 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 12: Tipos de servico */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-9">
              <label className={labelClass}>Tipos de servico :</label>
              <select className={inputClass} value={selectedServiceTypeId} onChange={(e) => setSelectedServiceTypeId(e.target.value)}>
                <option value="">Selecione um servico...</option>
                {(settings?.serviceTypes || [])
                  .filter((st: any) => !(formData.serviceItems || []).some(item => item.id === st.id))
                  .map((st: any) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
              </select>
            </div>
            <div className="col-span-1 md:col-span-3">
              <button type="button" onClick={handleAddServiceType} className="w-full py-1.5 bg-blue-600 text-white rounded text-[10px] font-black uppercase hover:bg-blue-700">
                Adicionar
              </button>
            </div>
            {(formData.serviceItems || []).length > 0 && (
              <div className="col-span-1 md:col-span-12 flex flex-wrap gap-2">
                {(formData.serviceItems || []).map(service => (
                  <span key={service.id} className="inline-flex items-center gap-2 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[10px] font-black uppercase">
                    {service.name}
                    <button type="button" onClick={() => handleRemoveServiceType(service.id)} className="text-emerald-500 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 13: Classificacao */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-12">
              <label className={labelClass}>Classificacao :</label>
              <select 
                name="classificationId" 
                className={inputClass} 
                value={formData.classificationId || ''} 
                onChange={(e) => {
                  const classification = classifications.find(c => c.id === e.target.value);
                  setFormData(prev => ({ ...prev, classificationId: e.target.value, classificationName: classification?.name }));
                }}
              >
                <option value="">Selecione a Classificacao...</option>
                {classifications.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 13.5: Base de Manutencao (Added for Arrival Alert) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="col-span-1 md:col-span-12">
              <label className={labelClass}>Base de Manutencao (Gera Alerta de Chegada) :</label>
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

          {/* Axle Selection (New) */}
          {formData.vehicleId && vehicles.find(v => v.id === formData.vehicleId)?.axles && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-12">
                <label className={labelClass}>Vincular aos Eixos :</label>
                <div className="flex flex-col gap-3 mt-2">
                  {Array.from({ length: vehicles.find(v => v.id === formData.vehicleId)?.axles || 0 }).map((_, i) => {
                    const axleNum = i + 1;
                    const currentAxleSelection = formData.axles?.find(a => a.axle === axleNum);
                    
                    const toggleSide = (side: 'LEFT' | 'RIGHT') => {
                      const currentAxles = [...(formData.axles || [])];
                      const index = currentAxles.findIndex(a => a.axle === axleNum);
                      
                      if (index === -1) {
                        currentAxles.push({ axle: axleNum, side });
                      } else {
                        const existing = currentAxles[index];
                        if (existing.side === 'BOTH') {
                          existing.side = side === 'LEFT' ? 'RIGHT' : 'LEFT';
                        } else if (existing.side === side) {
                          currentAxles.splice(index, 1);
                        } else {
                          existing.side = 'BOTH';
                        }
                      }
                      setFormData(prev => ({ ...prev, axles: currentAxles }));
                    };

                    return (
                      <div key={axleNum} className="flex items-center gap-4 bg-slate-100 p-2 rounded border border-slate-200">
                        <span className="text-[10px] font-black text-slate-700 uppercase w-16">Eixo {axleNum}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSide('LEFT')}
                            className={`px-4 py-1.5 rounded text-[10px] font-black border transition-all ${
                              currentAxleSelection?.side === 'LEFT' || currentAxleSelection?.side === 'BOTH'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                : 'bg-white border-slate-300 text-slate-500 hover:border-blue-400'
                            }`}
                          >
                            ESQUERDO (E)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSide('RIGHT')}
                            className={`px-4 py-1.5 rounded text-[10px] font-black border transition-all ${
                              currentAxleSelection?.side === 'RIGHT' || currentAxleSelection?.side === 'BOTH'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                                : 'bg-white border-slate-300 text-slate-500 hover:border-blue-400'
                            }`}
                          >
                            DIREITO (D)
                          </button>
                        </div>
                        {(currentAxleSelection?.side === 'BOTH') && (
                          <span className="text-[9px] font-bold text-blue-600 uppercase ml-auto">Ambos Lados</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Row 14: Servicos Solicitados */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="col-span-1 md:col-span-12">
              <label className={labelClass}>Servicos solicitados :</label>
              <textarea 
                name="details" 
                className={`${inputClass} h-12 resize-none`} 
                value={formData.details}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          {/* Row 15: Observacoes */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="col-span-1 md:col-span-12">
              <label className={labelClass}>Observacoes :</label>
              <textarea 
                name="notes" 
                className={`${inputClass} h-12 resize-none`} 
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          {/* Row 16: Pecas (Added) */}
          <div className="space-y-2 border border-slate-300 rounded p-3 bg-slate-100/50">
            <h3 className={sectionTitleClass}>
              <Package className="h-3 w-3" /> Pecas e Materiais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="col-span-1 md:col-span-7">
                <label className={labelClass}>Selecionar Peca :</label>
                <div className="flex gap-1">
                  <select 
                    className={inputClass}
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                  >
                    <option value="">Selecione uma peca do estoque...</option>
                    {stockItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} (R$ {item.averageCost.toFixed(2)})</option>
                    ))}
                  </select>
                  <button 
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="p-1 bg-blue-100 text-blue-600 rounded border border-blue-200 hover:bg-blue-200"
                    title="Escanear Codigo"
                  >
                    <ScanLine className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className={labelClass}>Qtd :</label>
                <input 
                  type="number" 
                  className={inputClass}
                  value={selectedPartQty}
                  onChange={(e) => setSelectedPartQty(Number(e.target.value))}
                  min="1"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
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
                      <th className="px-2 py-1 text-left">Peca</th>
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

          {/* Footer: Custos e Botoes */}
          <div className="pt-4 border-t border-slate-400 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-800 font-black text-xs uppercase">Custo Total da OS :</span>
                <input 
                  type="text" 
                  className="w-24 px-2 py-1 bg-slate-200 border border-slate-300 rounded text-xs font-bold" 
                  value={(Number(formData.laborCost || 0) + Number(formData.partsCost || 0)).toFixed(2)} 
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
                <span className="text-slate-800 font-bold text-[10px] uppercase">+ Valor Pecas :</span>
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
              Ultima Interacao : <span className="bg-slate-200 px-1 rounded">08/04/2026 09:25</span>
            </div>
            <div className="col-span-4">
              Usuario Abertura : <span className="bg-slate-200 px-1 rounded">{currentUser?.name || currentUser?.email || 'GUILHERME.MARTINS'}</span>
            </div>
            <div className="col-span-4 text-right">
              Data Inclusao / Atualizacao : <span className="bg-slate-200 px-1 rounded">09/04/2026 09:26</span>
            </div>
          </div>
        </form>
      </div>

      {isScannerOpen && (
        <Scanner 
          onScan={handleScanPart} 
          onClose={() => setIsScannerOpen(false)} 
          title="Escanear Peca"
          placeholder="Codigo de barras..."
        />
      )}
    </div>
  );
};
