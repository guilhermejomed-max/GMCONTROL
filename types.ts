
export enum TireStatus {
  NEW = 'Novo',
  USED = 'Usado',
  RETREADING = 'Em Recapagem',
  RETREADED = 'Recauchutado',
  DAMAGED = 'Danificado/Descarte'
}

export type UserLevel = 'JUNIOR' | 'PLENO' | 'SENIOR';

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

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  axles: number;
  type: 'CAVALO' | 'CARRETA';
  odometer: number;
  avgMonthlyKm?: number; // For forecast
  lastLocation?: VehicleLocation;
  currentDriverId?: string; // Added currentDriverId property
  lastAutoUpdateDate?: string; // Data da última atualização automática de KM (para carretas)
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
  defaultMonthlyKm: number; // For forecast
  trailerDailyAverageKm?: number; // Média diária fixa para rodagem de carretas
  rotationIntervalKm?: number; // Novo: Intervalo para rodízio
  calibrationIntervalDays?: number; // Novo: Dias máx sem inspeção/calibragem
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
export interface ServiceOrder {
  id: string;
  orderNumber: number;
  vehicleId: string;
  vehiclePlate: string;
  tireId?: string;
  tireFireNumber?: string;
  title: string;
  details: string;
  startTime?: string; // New field for start time
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  createdBy: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
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

export type TabView = 'dashboard' | 'inventory' | 'register' | 'movement' | 'inspection' | 'fleet' | 'maintenance' | 'service' | 'location' | 'settings' | 'financial' | 'scrap' | 'strategic-analysis' | 'demand-forecast' | 'retreading' | 'service-orders' | 'drivers' | 'acoustic-check' | 'reports';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}
