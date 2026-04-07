
import React, { useState, useMemo, useEffect } from 'react';
import { Tire, Vehicle, ServiceOrder, RetreadOrder, TireStatus, ModuleType, VehicleType, Occurrence } from '../types';
import { FileText, Filter, Printer, Columns, Calendar, Search, Check, FileBarChart, RefreshCw, AlertCircle, Download, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, DollarSign, Package, Truck, Wrench, Maximize, Minimize, Fuel } from 'lucide-react';
import { isSteerAxle } from '../lib/vehicleUtils';

interface ReportsHubProps {
  tires: Tire[];
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
  retreadOrders: RetreadOrder[];
  occurrences: Occurrence[];
  fuelEntries?: any[];
  branches?: any[];
  defaultBranchId?: string;
  vehicleBrandModels?: any[];
  onFullScreenToggle?: (isFull: boolean) => void;
  activeModule?: ModuleType;
  vehicleTypes?: VehicleType[];
}

type ReportSource = 'TIRES' | 'VEHICLES' | 'MOVEMENTS' | 'COSTS' | 'SUMMARY' | 'MAINTENANCE' | 'BRAND_MODELS' | 'MODEL_COSTS' | 'MISSING_TIRES' | 'OCCURRENCES' | 'FUEL';

interface ColumnDef {
  id: string;
  label: string;
  accessor: (item: any, context?: any) => any;
  format?: (val: any) => string;
}

// Helpers
const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatDate = (val: string) => {
    if (!val) return '-';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('pt-BR');
    } catch (e) {
        return val;
    }
};

// --- DEFINIÇÃO ESTÁTICA DE COLUNAS ---
const COLUMN_DEFINITIONS: Record<ReportSource, ColumnDef[]> = {
    TIRES: [
      { id: 'fireNumber', label: 'Fogo', accessor: (t: Tire) => t.fireNumber },
      { id: 'brand', label: 'Marca', accessor: (t: Tire) => t.brand },
      { id: 'model', label: 'Modelo', accessor: (t: Tire) => t.model },
      { id: 'size', label: 'Medida', accessor: (t: Tire) => `${t.width}/${t.profile} R${t.rim}` },
      { id: 'status', label: 'Status', accessor: (t: Tire) => t.status },
      { id: 'vehicle', label: 'Veículo Atual', accessor: (t: Tire, ctx: any) => ctx.vehicles?.find((v: Vehicle) => v.id === t.vehicleId)?.plate || (t.location || 'Estoque') },
      { id: 'position', label: 'Posição', accessor: (t: Tire) => t.position || '-' },
      { id: 'depth', label: 'Sulco (mm)', accessor: (t: Tire) => Number(t.currentTreadDepth || 0).toFixed(1) },
      { id: 'kms', label: 'KM Total', accessor: (t: Tire) => (t.totalKms || 0).toLocaleString() },
      { id: 'cost', label: 'Investimento', accessor: (t: Tire) => Number(t.totalInvestment || t.price || 0), format: money },
      { id: 'cpk', label: 'CPK Est.', accessor: (t: Tire, ctx: any) => {
        let currentRun = 0;
        if (t.vehicleId && t.installOdometer && ctx.vehicles) {
          const v = ctx.vehicles.find((vh: Vehicle) => vh.id === t.vehicleId);
          if (v) currentRun = Math.max(0, v.odometer - t.installOdometer);
        }
        const totalKm = (t.totalKms || 0) + currentRun;
        return totalKm > 0 ? (Number(t.totalInvestment || t.price || 0) / totalKm).toFixed(5) : '0.00000';
      }},
      { id: 'dot', label: 'DOT', accessor: (t: Tire) => t.dot || '-' },
    ],
    VEHICLES: [
      { id: 'plate', label: 'Placa', accessor: (v: Vehicle) => v.plate },
      { id: 'fleetNumber', label: 'Prefixo', accessor: (v: Vehicle) => v.fleetNumber || '-' },
      { id: 'model', label: 'Modelo', accessor: (v: Vehicle) => v.model },
      { id: 'brand', label: 'Marca', accessor: (v: Vehicle) => v.brand || '-' },
      { id: 'type', label: 'Tipo', accessor: (v: Vehicle) => v.type },
      { id: 'year', label: 'Ano', accessor: (v: Vehicle) => v.year || '-' },
      { id: 'color', label: 'Cor', accessor: (v: Vehicle) => v.color || '-' },
      { id: 'fuelType', label: 'Combustível', accessor: (v: Vehicle) => v.fuelType || '-' },
      { id: 'axles', label: 'Eixos', accessor: (v: Vehicle) => v.axles || 0 },
      { id: 'odometer', label: 'Hodômetro', accessor: (v: Vehicle) => v.odometer?.toLocaleString() || '0' },
      { id: 'vin', label: 'Chassi', accessor: (v: Vehicle) => v.vin || '-' },
      { id: 'renavam', label: 'Renavam', accessor: (v: Vehicle) => v.renavam || '-' },
      { id: 'engine', label: 'Motor', accessor: (v: Vehicle) => v.engine || '-' },
      { id: 'transmission', label: 'Câmbio', accessor: (v: Vehicle) => v.transmission || '-' },
      { id: 'tiresBrand', label: 'Marca Pneus', accessor: (v: Vehicle) => v.tiresBrand || '-' },
      { id: 'tiresSize', label: 'Medida Pneus', accessor: (v: Vehicle) => v.tiresSize || '-' },
      { id: 'tireCount', label: 'Qtd Pneus', accessor: (v: Vehicle, ctx: any) => ctx.tires?.filter((t: Tire) => t.vehicleId === v.id).length || 0 },
      { id: 'location', label: 'Última Loc.', accessor: (v: Vehicle) => v.lastLocation?.city || '-' },
      { id: 'lastUpdate', label: 'Atualização', accessor: (v: Vehicle) => formatDate(v.lastLocation?.updatedAt || '') },
    ],
    MAINTENANCE: [
      { id: 'date', label: 'Data', accessor: (o: ServiceOrder) => formatDate(o.date || o.completedAt || o.createdAt) },
      { id: 'vehicle', label: 'Veículo', accessor: (o: ServiceOrder, ctx: any) => ctx.vehicles?.find((v: Vehicle) => v.id === o.vehicleId)?.plate || '-' },
      { id: 'title', label: 'Serviço', accessor: (o: ServiceOrder) => o.title },
      { id: 'status', label: 'Status', accessor: (o: ServiceOrder) => o.status },
      { id: 'mechanic', label: 'Colaborador', accessor: (o: ServiceOrder) => o.collaboratorName || '-' },
      { id: 'laborCost', label: 'Mão de Obra', accessor: (o: ServiceOrder) => o.laborCost || 0, format: money },
      { id: 'partsCost', label: 'Peças', accessor: (o: ServiceOrder) => (o.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitCost), 0), format: money },
      { id: 'cost', label: 'Custo Total', accessor: (o: ServiceOrder) => {
        const partsCost = (o.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitCost), 0);
        return (o.laborCost || 0) + partsCost;
      }, format: money },
    ],
    MOVEMENTS: [
      { id: 'date', label: 'Data', accessor: (log: any) => formatDate(log.date) },
      { id: 'tire', label: 'Pneu', accessor: (log: any, ctx: any) => ctx.tires?.find((t: Tire) => t.id === log.tireId)?.fireNumber || (log.details?.match(/Pneu ([0-9A-Z]+)/)?.[1] || 'N/D') },
      { id: 'action', label: 'Ação', accessor: (log: any) => log.action },
      { id: 'details', label: 'Detalhes', accessor: (log: any) => log.details },
    ],
    MISSING_TIRES: [
      { id: 'plate', label: 'Placa', accessor: (m: any) => m.plate },
      { id: 'fleetNumber', label: 'Prefixo', accessor: (m: any) => m.fleetNumber },
      { id: 'model', label: 'Modelo', accessor: (m: any) => m.model },
      { id: 'axle', label: 'Eixo', accessor: (m: any) => `${m.axle}º Eixo` },
      { id: 'position', label: 'Posição', accessor: (m: any) => m.position },
    ],
    COSTS: [
      { id: 'date', label: 'Data', accessor: (item: any) => formatDate(item.date) },
      { id: 'type', label: 'Tipo Custo', accessor: (item: any) => item.type },
      { id: 'ref', label: 'Ref (Placa/Fogo)', accessor: (item: any) => item.ref },
      { id: 'value', label: 'Valor', accessor: (item: any) => item.value, format: money },
      { id: 'desc', label: 'Descrição', accessor: (item: any) => item.desc },
    ],
    SUMMARY: [
      { id: 'metric', label: 'Métrica', accessor: (item: any) => item.metric },
      { id: 'value', label: 'Valor', accessor: (item: any) => item.value },
    ],
    BRAND_MODELS: [
      { id: 'brand', label: 'Marca', accessor: (item: any) => item.brand },
      { id: 'model', label: 'Modelo', accessor: (item: any) => item.model },
      { id: 'type', label: 'Tipo', accessor: (item: any) => item.type },
      { id: 'vehicleCount', label: 'Qtd Veículos', accessor: (item: any) => item.vehicleCount },
      { id: 'totalKms', label: 'KM Total da Frota', accessor: (item: any) => item.totalKms.toLocaleString() },
      { id: 'avgKms', label: 'KM Médio', accessor: (item: any) => item.avgKms.toLocaleString() },
    ],
    MODEL_COSTS: [
      { id: 'model', label: 'Modelo do Veículo', accessor: (item: any) => item.model },
      { id: 'plate', label: 'Placa', accessor: (item: any) => item.plate },
      { id: 'date', label: 'Data', accessor: (item: any) => formatDate(item.date) },
      { id: 'service', label: 'Serviço/Manutenção', accessor: (item: any) => item.service },
      { id: 'cost', label: 'Custo', accessor: (item: any) => item.cost, format: money },
    ],
    OCCURRENCES: [
      { id: 'date', label: 'Data', accessor: (o: Occurrence) => formatDate(o.createdAt) },
      { id: 'vehicle', label: 'Veículo', accessor: (o: Occurrence) => o.vehiclePlate },
      { id: 'reason', label: 'Motivo', accessor: (o: Occurrence) => o.reasonName },
      { id: 'description', label: 'Descrição', accessor: (o: Occurrence) => o.description || '-' },
      { id: 'status', label: 'Status', accessor: (o: Occurrence) => o.status === 'OPEN' ? 'Pendente' : 'Resolvido' },
      { id: 'user', label: 'Relatado por', accessor: (o: Occurrence) => o.userName },
      { id: 'resolvedAt', label: 'Resolvido em', accessor: (o: Occurrence) => o.resolvedAt ? formatDate(o.resolvedAt) : '-' },
    ],
    FUEL: [
      { id: 'date', label: 'Data', accessor: (e: any) => formatDate(e.date) },
      { id: 'vehicle', label: 'Veículo', accessor: (e: any) => e.vehiclePlate },
      { id: 'liters', label: 'Litros', accessor: (e: any) => e.liters.toLocaleString() },
      { id: 'unitPrice', label: 'Preço Unit.', accessor: (e: any) => e.unitPrice, format: money },
      { id: 'totalCost', label: 'Total', accessor: (e: any) => e.totalCost, format: money },
      { id: 'odometer', label: 'KM', accessor: (e: any) => e.odometer.toLocaleString() },
      { id: 'station', label: 'Posto', accessor: (e: any) => e.stationName || '-' },
      { id: 'driver', label: 'Motorista', accessor: (e: any) => e.driverName || '-' },
    ]
};

export const ReportsHub: React.FC<ReportsHubProps> = ({ 
  tires: allTires = [], 
  vehicles: allVehicles = [], 
  serviceOrders: allServiceOrders = [], 
  retreadOrders: allRetreadOrders = [], 
  occurrences: allOccurrences = [],
  fuelEntries: allFuelEntries = [],
  branches = [],
  defaultBranchId,
  vehicleBrandModels = [],
  onFullScreenToggle,
  activeModule,
  vehicleTypes = []
}) => {
  const [source, setSource] = useState<ReportSource>(
    activeModule === 'TIRES' ? 'TIRES' : 
    activeModule === 'MECHANICAL' ? 'MAINTENANCE' : 'VEHICLES'
  );
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const tires = useMemo(() => {
    return defaultBranchId ? allTires.filter(t => t.branchId === defaultBranchId) : allTires;
  }, [allTires, defaultBranchId]);

  const vehicles = allVehicles;

  const serviceOrders = useMemo(() => {
    return defaultBranchId ? allServiceOrders.filter(so => so.branchId === defaultBranchId) : allServiceOrders;
  }, [allServiceOrders, defaultBranchId]);

  const retreadOrders = useMemo(() => {
    return defaultBranchId ? allRetreadOrders.filter(ro => ro.branchId === defaultBranchId) : allRetreadOrders;
  }, [allRetreadOrders, defaultBranchId]);

  const occurrences = useMemo(() => {
    return defaultBranchId ? allOccurrences.filter(o => o.branchId === defaultBranchId) : allOccurrences;
  }, [allOccurrences, defaultBranchId]);

  const fuelEntries = useMemo(() => {
    return defaultBranchId ? allFuelEntries.filter(e => e.branchId === defaultBranchId) : allFuelEntries;
  }, [allFuelEntries, defaultBranchId]);
  
  // Inicializa com as colunas padrão
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
      COLUMN_DEFINITIONS[
        activeModule === 'TIRES' ? 'TIRES' : 
        activeModule === 'MECHANICAL' ? 'MAINTENANCE' : 'VEHICLES'
      ].slice(0, 8).map(c => c.id)
  );
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPlate, setSelectedPlate] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const initialSource: ReportSource = 
      activeModule === 'TIRES' ? 'TIRES' : 
      activeModule === 'MECHANICAL' ? 'MAINTENANCE' : 'VEHICLES';
    setSource(initialSource);
    setSelectedColumns(COLUMN_DEFINITIONS[initialSource].slice(0, 8).map(c => c.id));
  }, [activeModule]);

  // --- PRESETS DE DATA ---
  const setDateRange = (range: 'WEEK' | 'MONTH') => {
      const end = new Date();
      const start = new Date();
      if (range === 'WEEK') {
          start.setDate(end.getDate() - 7);
      } else {
          start.setMonth(end.getMonth() - 1);
      }
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setSelectedModel('');
      setSelectedPlate('');
      setSelectedType('');
  };

  // --- HANDLER PARA TROCA DE FONTE ---
  // Atualiza a fonte e as colunas simultaneamente para evitar renderização vazia
  const handleSourceChange = (newSource: ReportSource) => {
      setSource(newSource);
      // Seleciona automaticamente as primeiras 8 colunas da nova fonte
      const defaultCols = COLUMN_DEFINITIONS[newSource].slice(0, 8).map(c => c.id);
      setSelectedColumns(defaultCols);
      setSelectedModel('');
      setSelectedPlate('');
      setSelectedType('');
  };

  // --- PROCESSAMENTO DE DADOS ---
  const reportData = useMemo(() => {
    let rawData: any[] = [];

    // 1. Coletar Dados
    if (source === 'TIRES') {
      rawData = [...tires];
    } else if (source === 'VEHICLES') {
      rawData = [...vehicles];
    } else if (source === 'MAINTENANCE') {
      rawData = serviceOrders.map(o => {
          const vehicle = vehicles.find(v => v.id === o.vehicleId);
          return { ...o, type: vehicle?.type || '' };
      });
      rawData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (source === 'MOVEMENTS') {
      rawData = tires.flatMap(t => (t.history || []).map(h => ({ ...h, tireId: t.id })));
      // Ordenar por data decrescente
      rawData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (source === 'COSTS') {
      const purchases = tires.map(t => ({
        date: t.purchaseDate || (t.history?.find(h => h.action === 'CADASTRADO')?.date) || new Date().toISOString(),
        type: 'AQUISIÇÃO',
        ref: t.fireNumber,
        value: t.price || 0,
        desc: `Compra ${t.brand} ${t.model}`
      }));
      
      const retreads = retreadOrders.filter(o => o.status === 'CONCLUIDO').map(o => ({
        date: o.returnedDate || o.sentDate,
        type: 'RECAPAGEM',
        ref: o.retreaderName,
        value: o.totalCost || 0,
        desc: `Ordem #${o.orderNumber}`
      }));

      const services = serviceOrders.filter(o => o.status === 'CONCLUIDO').map(o => {
        const partsCost = (o.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitCost), 0);
        const totalCost = (o.laborCost || 0) + partsCost;
        return {
          date: o.date || o.completedAt || o.createdAt,
          type: 'MANUTENÇÃO',
          ref: o.vehiclePlate,
          value: totalCost, 
          desc: `${o.title} ${o.collaboratorName ? `(${o.collaboratorName})` : ''}`
        };
      });

      rawData = [...purchases, ...retreads, ...services];
      rawData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (source === 'BRAND_MODELS') {
      const brandModelStats = vehicleBrandModels.map(bm => {
        const bmVehicles = vehicles.filter(v => v.brandModelId === bm.id);
        const vehicleCount = bmVehicles.length;
        const totalKms = bmVehicles.reduce((acc, v) => acc + (v.odometer || 0), 0);
        const avgKms = vehicleCount > 0 ? Math.round(totalKms / vehicleCount) : 0;
        
        return {
          id: bm.id,
          brand: bm.brand,
          model: bm.model,
          type: bm.type,
          vehicleCount,
          totalKms,
          avgKms
        };
      });
      rawData = brandModelStats.sort((a, b) => b.vehicleCount - a.vehicleCount);
    } else if (source === 'MODEL_COSTS') {
      const costs: any[] = [];
      serviceOrders.filter(o => o.status === 'CONCLUIDO').forEach(o => {
        const vehicle = vehicles.find(v => v.id === o.vehicleId);
        if (vehicle) {
          const partsCost = (o.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitCost), 0);
          const totalCost = (o.laborCost || 0) + partsCost;
          costs.push({
            model: vehicle.model || 'Desconhecido',
            plate: vehicle.plate,
            date: o.date || o.completedAt || o.createdAt,
            service: o.title,
            cost: totalCost,
            type: vehicle.type
          });
        }
      });
      rawData = costs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (source === 'OCCURRENCES') {
      rawData = [...occurrences];
      rawData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (source === 'FUEL') {
      rawData = [...fuelEntries];
      rawData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (source === 'MISSING_TIRES') {
      const missingTires: any[] = [];
      vehicles.forEach(vehicle => {
        const mountedTires = tires.filter(t => t.vehicleId === vehicle.id);
        
        for (let i = 0; i < (vehicle.axles || 0); i++) {
          const isSteer = isSteerAxle(vehicle.type, i, vehicleTypes);
          
          const positions = isSteer ? [`${i + 1}E`, `${i + 1}D`] : [`${i + 1}EE`, `${i + 1}EI`, `${i + 1}DI`, `${i + 1}DE`];
          
          positions.forEach(pos => {
            const hasTire = mountedTires.some(t => t.position === pos);
            if (!hasTire) {
              missingTires.push({
                plate: vehicle.plate,
                fleetNumber: vehicle.fleetNumber || 'N/A',
                model: vehicle.model,
                axle: i + 1,
                position: pos
              });
            }
          });
        }
      });
      rawData = missingTires;
    } else if (source === 'SUMMARY') {
        // Cálculo do resumo
        const filteredTires = tires.filter(t => {
            const d = new Date(t.purchaseDate || new Date());
            if (startDate && d < new Date(startDate)) return false;
            if (endDate && d > new Date(endDate)) return false;
            return true;
        });

        const discarded = filteredTires.filter(t => t.status === TireStatus.DAMAGED).length;
        const retreaded = filteredTires.reduce((acc, t) => acc + (t.retreadCount || 0), 0);
        const totalValue = filteredTires.reduce((acc, t) => acc + Number(t.totalInvestment || t.price || 0), 0);

        rawData = [
            { metric: 'Total de Pneus', value: filteredTires.length },
            { metric: 'Total Investido', value: money(totalValue) },
            { metric: 'Pneus Descartados', value: discarded },
            { metric: 'Recapagens Realizadas', value: retreaded },
        ];
        return rawData; // Retorno direto para SUMMARY
    }

    // 2. Filtrar Dados
    let filtered = rawData.filter(item => {
      // Filtro de Data
      if (startDate || endDate) {
        const itemDateStr = item.date || item.purchaseDate || item.createdAt || item.lastLocation?.updatedAt;
        if (itemDateStr) {
          const itemDate = new Date(itemDateStr);
          if (startDate) {
              const start = new Date(startDate);
              start.setHours(0,0,0,0);
              if (itemDate < start) return false;
          }
          if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (itemDate > end) return false;
          }
        }
      }

      // Filtro de Texto
      if (searchText) {
        const search = searchText.toLowerCase();
        // Cria uma string JSON apenas dos valores para busca
        const str = Object.values(item).join(' ').toLowerCase();
        if (!str.includes(search)) return false;
      }

      // Filtro de Modelo
      if (selectedModel) {
        const itemModel = (item.model || '').toLowerCase();
        if (!itemModel.includes(selectedModel.toLowerCase())) return false;
      }

      // Filtro de Placa
      if (selectedPlate) {
        const itemPlate = (item.plate || item.vehiclePlate || '').toLowerCase();
        if (!itemPlate.includes(selectedPlate.toLowerCase())) return false;
      }

      // Filtro de Tipo
      if (selectedType) {
        const itemType = (item.type || '').toLowerCase();
        if (!itemType.includes(selectedType.toLowerCase())) return false;
      }

      return true;
    });

    // 3. Ordenar Dados
    if (sortConfig) {
      const colDef = COLUMN_DEFINITIONS[source].find(c => c.id === sortConfig.key);
      if (colDef) {
        filtered.sort((a, b) => {
          const valA = colDef.accessor(a, { tires, vehicles });
          const valB = colDef.accessor(b, { tires, vehicles });

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return filtered;
  }, [source, tires, vehicles, serviceOrders, retreadOrders, startDate, endDate, searchText, sortConfig, selectedModel, selectedPlate, selectedType]);

  // --- RESUMO DO RELATÓRIO ---
  const reportSummary = useMemo(() => {
    if (reportData.length === 0) return null;

    const totalRecords = reportData.length;
    let totalValue = 0;
    let hasValue = false;

    // Tenta encontrar colunas de custo/valor
    const valueCol = COLUMN_DEFINITIONS[source].find(c => c.id === 'cost' || c.id === 'value' || c.id === 'totalCost');
    
    if (valueCol) {
      hasValue = true;
      totalValue = reportData.reduce((acc, item) => {
        const val = valueCol.accessor(item, { tires, vehicles });
        return acc + (Number(val) || 0);
      }, 0);
    }

    return {
      totalRecords,
      totalValue: hasValue ? totalValue : null,
      avgValue: hasValue && totalRecords > 0 ? totalValue / totalRecords : null
    };
  }, [reportData, source, tires, vehicles]);

  // --- FUNÇÕES DE INTERFACE ---
  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleExportCSV = () => {
    const cols = COLUMN_DEFINITIONS[source].filter(c => selectedColumns.includes(c.id));
    const context = { tires, vehicles };
    
    const header = cols.map(c => c.label).join(';');
    const rows = reportData.map(row => 
      cols.map(c => {
        const val = c.accessor(row, context);
        const formatted = c.format ? c.format(val) : (val !== undefined && val !== null ? val : '-');
        // Remove pontos e vírgulas que podem quebrar o CSV se necessário, ou apenas escapa
        return `"${String(formatted).replace(/"/g, '""')}"`;
      }).join(';')
    );

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${source.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cols = COLUMN_DEFINITIONS[source].filter(c => selectedColumns.includes(c.id));
    const context = { tires, vehicles };

    const rowsHtml = reportData.map(row => `
      <tr>
        ${cols.map(c => {
          const val = c.accessor(row, context);
          return `<td>${c.format ? c.format(val) : (val !== undefined && val !== null ? val : '-')}</td>`;
        }).join('')}
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório - GM Control</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              color: #1e293b; 
              line-height: 1.5; 
              padding: 40px;
              background: #fff;
            }
            
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 40px; 
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
            }
            
            .logo-section { display: flex; align-items: center; gap: 12px; }
            .logo-box { 
              width: 48px; 
              height: 48px; 
              background: #4f46e5; 
              border-radius: 12px; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: 20px;
            }
            
            .company-info h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
            .company-info p { font-size: 12px; color: #64748b; font-weight: 500; }
            
            .report-meta { text-align: right; }
            .report-meta h2 { font-size: 14px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .report-meta p { font-size: 11px; color: #64748b; }

            .summary-container { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
              margin-bottom: 40px; 
            }
            
            .summary-item { 
              background: #f8fafc; 
              border: 1px solid #e2e8f0; 
              padding: 16px; 
              border-radius: 16px; 
            }
            
            .summary-item .label { 
              font-size: 10px; 
              font-weight: 700; 
              color: #64748b; 
              text-transform: uppercase; 
              letter-spacing: 0.05em; 
              margin-bottom: 8px; 
            }
            
            .summary-item .value { 
              font-size: 18px; 
              font-weight: 800; 
              color: #0f172a; 
            }

            table { 
              width: 100%; 
              border-collapse: separate; 
              border-spacing: 0; 
              margin-top: 20px; 
            }
            
            th { 
              background: #f8fafc; 
              text-align: left; 
              padding: 12px 16px; 
              border-bottom: 2px solid #e2e8f0; 
              font-size: 10px; 
              text-transform: uppercase; 
              font-weight: 700; 
              color: #475569; 
              letter-spacing: 0.025em;
            }
            
            td { 
              padding: 12px 16px; 
              border-bottom: 1px solid #f1f5f9; 
              font-size: 11px; 
              color: #334155; 
            }
            
            tr:nth-child(even) td { background: #fafafa; }
            
            .footer { 
              margin-top: 50px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              display: flex; 
              justify-content: space-between; 
              font-size: 10px; 
              color: #94a3b8; 
            }

            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              @page { margin: 2cm; size: landscape; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <div class="logo-box">GM</div>
              <div class="company-info">
                <h1>GM CONTROL</h1>
                <p>Gestão Inteligente de Frotas e Pneus</p>
              </div>
            </div>
            <div class="report-meta">
              <h2>${source === 'TIRES' ? 'Inventário de Pneus' : source === 'VEHICLES' ? 'Frota de Veículos' : source === 'MAINTENANCE' ? 'Relatório de Manutenção' : source === 'COSTS' ? 'Análise Financeira' : source === 'MODEL_COSTS' ? 'Custos por Modelo' : source === 'OCCURRENCES' ? 'Relatório de Ocorrências' : 'Relatório Operacional'}</h2>
              <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
              <p>Período: ${startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'} — ${endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Hoje'}</p>
            </div>
          </div>

          ${reportSummary ? `
            <div class="summary-container">
              <div class="summary-item">
                <div class="label">Total de Registros</div>
                <div class="value">${reportSummary.totalRecords}</div>
              </div>
              ${reportSummary.totalValue !== null ? `
                <div class="summary-container-item">
                  <div class="label">Investimento Total</div>
                  <div class="value">${money(reportSummary.totalValue)}</div>
                </div>
                <div class="summary-container-item">
                  <div class="label">Custo Médio</div>
                  <div class="value">${money(reportSummary.avgValue || 0)}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="footer">
            <div>GM Control &copy; ${new Date().getFullYear()} • Sistema de Gestão</div>
            <div>Relatório Gerencial • Documento Interno</div>
          </div>

          <script>
            window.onload = function() { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- RENDERIZAR ---
  const colsToRender = COLUMN_DEFINITIONS[source].filter(c => selectedColumns.includes(c.id));
  const renderContext = { tires, vehicles };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <FileBarChart className="h-8 w-8 text-indigo-600"/> Centro de Inteligência
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Análise avançada de dados e exportação de relatórios gerenciais.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { 
            setStartDate(''); 
            setEndDate(''); 
            setSearchText(''); 
            setSelectedModel('');
            setSelectedPlate('');
            setSelectedType('');
            setSortConfig(null); 
          }} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all text-sm shadow-sm">
            <RefreshCw className="h-4 w-4" /> Resetar
          </button>
          <button 
            onClick={() => {
              const nextState = !isFullScreen;
              setIsFullScreen(nextState);
              if (onFullScreenToggle) onFullScreenToggle(nextState);
            }} 
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all text-sm shadow-sm"
          >
            {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {isFullScreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
          </button>
          <button onClick={handleExportCSV} disabled={reportData.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button onClick={handlePrint} disabled={reportData.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all text-sm disabled:opacity-50">
            <Printer className="h-4 w-4" /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
        
        {/* SIDEBAR DE CONFIGURAÇÃO */}
        {!isFullScreen && (
          <div className="w-full lg:w-80 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto custom-scrollbar flex-shrink-0">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-base"><Filter className="h-5 w-5 text-indigo-500"/> Parâmetros</h3>
            </div>
            
            <div className="p-6 space-y-8">
              {/* FONTE DE DADOS */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">1. Módulo de Dados</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'TIRES', label: 'Inventário de Pneus', icon: Package },
                    { id: 'MISSING_TIRES', label: 'Pneus Faltantes', icon: AlertCircle },
                    { id: 'VEHICLES', label: 'Frota e KM', icon: Truck },
                    { id: 'FUEL', label: 'Abastecimento', icon: Fuel },
                    { id: 'OCCURRENCES', label: 'Ocorrências', icon: AlertCircle },
                    { id: 'BRAND_MODELS', label: 'Marcas e Modelos', icon: Package },
                    { id: 'MAINTENANCE', label: 'Manutenção', icon: Wrench },
                    { id: 'MODEL_COSTS', label: 'Custos por Modelo', icon: TrendingUp }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => handleSourceChange(opt.id as ReportSource)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${source === opt.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 text-indigo-900 dark:text-indigo-300' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <opt.icon className={`h-5 w-5 ${source === opt.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTROS */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">2. Refinar Busca</label>
                <div className="space-y-4">
                  <div className="flex gap-2">
                      <button onClick={() => setDateRange('WEEK')} className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-colors">7 Dias</button>
                      <button onClick={() => setDateRange('MONTH')} className="flex-1 p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-colors">30 Dias</button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400"/>
                    <input 
                      type="text" 
                      placeholder="Filtrar resultados..." 
                      className="w-full pl-11 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white transition-all"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">Início</label>
                      <input type="date" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">Fim</label>
                      <input type="date" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">Modelo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Volvo"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                        value={selectedModel} 
                        onChange={e => setSelectedModel(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">Placa</label>
                      <input 
                        type="text" 
                        placeholder="Ex: ABC"
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                        value={selectedPlate} 
                        onChange={e => setSelectedPlate(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 block">Tipo de Veículo</label>
                    <select 
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedType}
                      onChange={e => setSelectedType(e.target.value)}
                    >
                      <option value="">Todos os tipos</option>
                      <option value="CAVALO">Cavalo</option>
                      <option value="CARRETA">Carreta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DE COLUNAS */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                  <span>3. Colunas</span>
                  <span className="text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{selectedColumns.length}</span>
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {COLUMN_DEFINITIONS[source].map(col => (
                    <label key={col.id} className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${selectedColumns.includes(col.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-100'}`}>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedColumns.includes(col.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-700'}`}>
                        {selectedColumns.includes(col.id) && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className={`text-xs font-bold ${selectedColumns.includes(col.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>{col.label}</span>
                      <input type="checkbox" className="hidden" checked={selectedColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO (TABELA) */}
        <div className={`flex-1 flex flex-col gap-8 overflow-hidden ${isFullScreen ? 'w-full' : ''}`}>
          
          {/* SUMMARY CARDS */}
          {reportSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                  <Package className="h-7 w-7"/>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total de Registros</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{reportSummary.totalRecords}</p>
                </div>
              </div>

              {reportSummary.totalValue !== null && (
                <>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                      <DollarSign className="h-7 w-7"/>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Custo Acumulado</p>
                      <p className="text-2xl font-black text-emerald-600">{money(reportSummary.totalValue)}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                      <TrendingUp className="h-7 w-7"/>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Média por Carro</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{money(reportSummary.avgValue || 0)}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <Columns className="h-5 w-5 text-indigo-500"/>
                  <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Pré-visualização dos Dados</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Status:</span>
                  <span className="text-xs font-bold bg-indigo-600 text-white px-3 py-1 rounded-full shadow-lg shadow-indigo-600/20">{reportData.length} Linhas</span>
               </div>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar relative">
               <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="bg-white dark:bg-slate-900 text-slate-400 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10">
                    <tr>
                      {colsToRender.length > 0 ? colsToRender.map(c => (
                        <th 
                          key={c.id} 
                          className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap cursor-pointer hover:text-indigo-600 transition-colors group bg-white dark:bg-slate-900"
                          onClick={() => handleSort(c.id)}
                        >
                          <div className="flex items-center gap-2">
                            {c.label}
                            {sortConfig?.key === c.id ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                        </th>
                      )) : (
                          <th className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 text-center">Selecione as colunas na barra lateral</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-sm">
                    {reportData.length === 0 ? (
                      <tr>
                          <td colSpan={Math.max(colsToRender.length, 1)} className="p-20 text-center">
                              <div className="flex flex-col items-center justify-center opacity-30">
                                  <AlertCircle className="h-16 w-16 mb-4 text-slate-300"/>
                                  <span className="text-lg font-bold text-slate-400">Nenhum dado para exibir</span>
                                  <p className="text-sm">Ajuste os filtros ou mude a fonte de dados.</p>
                              </div>
                          </td>
                      </tr>
                    ) : (
                      reportData.map((row, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-indigo-900/5 transition-colors">
                          {colsToRender.length > 0 ? colsToRender.map(c => {
                            const val = c.accessor(row, renderContext);
                            return (
                              <td key={c.id} className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                {c.format ? c.format(val) : (val !== undefined && val !== null ? val : '-')}
                              </td>
                            );
                          }) : (
                              <td className="px-6 py-4 text-center text-slate-300">-</td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
