
export enum TireStatus {
  NEW = 'Novo',
  USED = 'Usado',
  RETREADING = 'Em Recapagem',
  RETREADED = 'Recauchutado',
  DAMAGED = 'Danificado/Descarte'
}

export type UserLevel = 'JUNIOR' | 'PLENO' | 'SENIOR' | 'CREATOR';

export type ModuleType = 'TIRES' | 'MECHANICAL' | 'VEHICLES';

export interface TireHistoryLog {
  date: string;
  action: 'CADASTRADO' | 'MONTADO' | 'DESMONTADO' | 'EDITADO' | 'INSPECAO' | 'REPARO' | 'ENVIADO_RECAPAGEM' | 'RETORNO_RECAPAGEM' | 'CONFERENCIA' | 'DESCARTE';
  details: string;
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // ex: "Criou Pneu", "Editou Veículo"
  details: string;
  module: ModuleType;
  timestamp: string;
}

export type VisualDamage = 'CORTE' | 'BOLHA' | 'DESGASTE_IRREGULAR' | 'FURO' | 'OUTRO';

export interface Tire {
  id: string;
  fireNumber: string;
  brand: string;
  model: string;
  width: number;
  profile: number;
  rim: number;
  dot: string;
  status: TireStatus;
  location: string;
  quantity: number;
  price: number;
  purchaseDate?: string; // Data da compra
  notes?: string;
  
  // New Fields
  treadType?: 'LISO' | 'BORRACHUDO';
  retreader?: string;
  retreadCost?: number;

  vehicleId?: string | null;
  position?: string | null;
  installOdometer?: number;
  installDate?: string; // Data da montagem no veículo atual
  
  totalKms: number;
  firstLifeKms: number;
  retreadKms: number;
  totalInvestment: number;
  costPerKm: number;
  retreadCount: number;

  originalTreadDepth: number;
  currentTreadDepth: number;
  
  treadReadings?: {
    depth1: number;
    depth2: number;
    depth3: number;
    depth4: number;
  };

  pressure: number;
  targetPressure: number;
  lastInspectionDate?: string;

  history: TireHistoryLog[];
  
  // --- V4.0 Fields ---
  visualDamages?: VisualDamage[];
  damagePhotoUrl?: string;
  dotPhotoUrl?: string;
}

export interface VehicleLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  updatedAt: string;
}

// Added Driver interface
export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  phone: string;
  status: string;
  hiredDate: string;
  notes?: string;
}

export interface VehicleBrandModel {
  id: string;
  brand: string;
  model: string;
  type: 'CAVALO' | 'CARRETA';
  axles: number;
  maintenancePlanId?: string;
  oilChangeInterval?: number;
  oilLiters?: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  axles: number;
  type: 'CAVALO' | 'CARRETA';
  odometer: number;
  totalCost: number; // Added totalCost
  avgMonthlyKm?: number; // For forecast
  lastLocation?: VehicleLocation;
  currentDriverId?: string; // Added currentDriverId property
  lastAutoUpdateDate?: string; // Data da última atualização automática de KM (para carretas)
  sascarCode?: string; // Cód. Sascar para integração
  brandModelId?: string; // Reference to VehicleBrandModel
  
  // Extended fields for "RG"
  vin?: string; // Chassi
  year?: number;
  color?: string;
  fuelType?: string;
  fleetNumber?: string; // Prefixo
  speed?: number;
  ignition?: boolean;
  brand?: string;
  engine?: string;
  transmission?: string;
  renavam?: string;
  tiresBrand?: string;
  tiresSize?: string;

  // --- Maintenance Fields ---
  revisionIntervalKm?: number; // KM de Revisão
  oilLiters?: number; // Qtd Litros Óleo
  lastPreventiveKm?: number; // KM da última preventiva
  lastPreventiveDate?: string; // Data da última preventiva
}

export interface LocationPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface ArrivalAlert {
  id: string;
  vehiclePlate: string;
  targetName: string;
  targetLat: number;
  targetLng: number;
  radius: number; // in meters
  status: 'PENDING' | 'ARRIVED';
  createdAt: string;
  createdBy: string;
  actualArrivalDate?: string;
  services?: string;
  minOdometer?: number; // Added for PMS scheduling
}

export interface TireModelDefinition {
  id: string;
  brand: string;
  model: string;
  width: number;
  profile: number;
  rim: number;
  standardPressure: number;
  originalDepth: number;
  // Novos campos para previsão específica
  estimatedLifespanKm?: number; // Ex: 80000 km
  limitDepth?: number; // Ex: 3.0 mm (substitui o global se definido)
}

export interface ServiceTypeDefinition {
  id: string;
  name: string; // Ex: Troca de Óleo, Rodízio, Freios
  description?: string;
}

export interface TreadPattern {
  id: string;
  name: string;
  retreaderId: string; // Vínculo com a recapadora responsável
  brand?: string;
  type: 'LISO' | 'BORRACHUDO';
  standardDepth: number; // Sulco padrão da banda (ex: 18.0)
  fixedCost: number; // Valor fixo da reforma para esta banda
}

export interface StandardProcedure {
  id: string;
  name: string;
  category: 'OIL' | 'ELECTRICAL' | 'MECHANICAL' | 'OTHER';
  description?: string;
  estimatedCost?: number;
  parts?: { name: string; quantity: number }[];
}

export interface SystemSettings {
  minTreadDepth: number;
  warningTreadDepth: number;
  standardPressure: number;
  maintenanceIntervalKm: number;
  alertRadius: number;
  lastGlobalAuditDate?: string;
  logoUrl?: string;
  tireModels?: TireModelDefinition[];
  serviceTypes?: ServiceTypeDefinition[]; // Novo campo para modelos de serviço
  standardProcedures?: StandardProcedure[]; // Novos procedimentos padrões
  defaultMonthlyKm: number; // For forecast
  trailerDailyAverageKm?: number; // Média diária fixa para rodagem de carretas
  rotationIntervalKm?: number; // Novo: Intervalo para rodízio
  calibrationIntervalDays?: number; // Novo: Dias máx sem inspeção/calibragem
  savedPoints?: LocationPoint[]; // Novos pontos salvos para agendamento
}

export interface TeamMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserLevel;
  allowedModules?: ModuleType[];
  permissions?: string[];
  createdAt: string;
  lastLogin?: string; // Novo campo
  password?: string; // Para persistência local mock
}

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: 'PECA' | 'FILTRO' | 'OLEO' | 'FERRAMENTA' | 'EPI' | 'OUTROS';
  quantity: number;
  minQuantity: number;
  unit: string;
  averageCost: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'ENTRY' | 'EXIT';
  quantity: number;
  unitCost?: number;
  totalValue: number;
  date: string;
  user: string;
  notes?: string;
}

// --- V5.0 Interfaces ---
export interface Collaborator {
  id: string;
  name: string;
  position: string;
  salary: number;
  hourlyRate?: number;
  isActive: boolean;
  hiredDate: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  vehicleId: string;
  vehiclePlate: string;
  maintenancePlanId?: string; // Added maintenancePlanId, removed tireId/tireFireNumber
  title: string;
  details: string;
  startTime?: string; // New field for start time
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  totalCost?: number;
  laborCost?: number; // New: Labor cost
  laborHours?: number; // New: Hours worked
  collaboratorId?: string; // New: Linked collaborator
  collaboratorName?: string; // New: Collaborator name for history
  parts?: { name: string; quantity: number; unitCost: number }[];
  maintenanceBaseId?: string;
  maintenanceBaseName?: string;
  arrivalAlertId?: string;
  isPreventiveMaintenance?: boolean;
  date?: string; // Data da O.S. (pode ser diferente de createdAt)
  createdBy: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
  odometer?: number;
}

export interface RetreadOrderItem {
  tireId: string;
  fireNumber: string;
  pattern: string; // Banda específica para este pneu
  cost?: number; // Custo específico acordado
  serviceDetails?: string; // Serviços adicionais (manchão, conserto, etc)
}

export interface RetreadOrder {
    id: string;
    orderNumber: number;
    retreaderName: string;
    sentDate: string;
    expectedReturnDate?: string;
    returnedDate?: string;
    tireIds: string[];
    tireDetails: { id: string; fireNumber: string; }[];
    items?: RetreadOrderItem[]; // Novo campo para detalhar banda por pneu
    requestedTreadPattern?: string; // Mantido para compatibilidade, agora será "MISTO" se houver várias
    status: 'ENVIADO' | 'EM_PRODUCAO' | 'CONCLUIDO';
    totalCost?: number;
    notes?: string;
    collectionOrderUrl?: string; // Novo campo para comprovante de coleta
}

// --- Shared Inspection Types ---
export interface InspectionRecord {
    pressure?: number;
    depth?: number;
    depth1?: number;
    depth2?: number;
    depth3?: number;
    depth4?: number;
    use3Point?: boolean;
    notes: string;
    isInspected: boolean;
    visualDamages?: VisualDamage[];
    damagePhoto?: File | null;
    damagePhotoUrl?: string;
    capPresent?: boolean;
    valveCondition?: 'OK' | 'BAD';
}

export interface TireLoan {
  id: string;
  tireId: string;
  fireNumber: string;
  borrowerName: string;
  borrowerContact?: string;
  loanDate: string;
  expectedReturnDate?: string;
  returnDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  notes?: string;
}

export interface TrackerSettings {
  apiUrl: string;
  user: string;
  pass: string;
  active: boolean;
}

export interface MaintenancePlan {
  id: string;
  name: string;
  description?: string;
  type: 'KM' | 'DATE';
  intervalKm?: number;
  intervalDays?: number;
  isActive: boolean;
  stockItemIds?: string[]; // Linked items from stock
}

export interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  planId: string;
  lastPerformedKm?: number;
  lastPerformedDate?: string;
  nextDueKm?: number;
  nextDueDate?: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
}

export type TabView = 'dashboard' | 'inventory' | 'register' | 'movement' | 'inspection' | 'fleet' | 'maintenance' | 'service' | 'location' | 'settings' | 'financial' | 'scrap' | 'demand-forecast' | 'retreading' | 'service-orders' | 'drivers' | 'acoustic-check' | 'reports' | 'esg-panel' | 'retreader-ranking' | 'tire-loans' | 'tracker' | 'brand-models';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}
