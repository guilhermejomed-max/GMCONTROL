
export const AVAILABLE_PERMISSIONS = [
  // PNEUS
  { id: 'edit_tires', label: 'Cadastrar/Editar Pneus', category: 'Pneus' },
  { id: 'inspect_tires', label: 'Inspecionar Pneus', category: 'Pneus' },
  { id: 'move_tires', label: 'Movimentar Pneus', category: 'Pneus' },
  { id: 'send_retread', label: 'Enviar para Recapagem', category: 'Pneus' },
  { id: 'manage_scrap', label: 'Gerenciar Sucata/Descarte', category: 'Pneus' },
  { id: 'view_esg', label: 'Ver Painel ESG', category: 'Pneus' },
  { id: 'view_forecast_tires', label: 'Previsão de Compra', category: 'Pneus' },
  { id: 'view_ranking_retreaders', label: 'Ranking de Fornecedores', category: 'Pneus' },

  // VEÍCULOS
  { id: 'edit_vehicles', label: 'Cadastrar/Editar Veículos', category: 'Veículos' },
  { id: 'view_tracking', label: 'Ver Rastreamento', category: 'Veículos' },
  { id: 'manage_drivers', label: 'Gerenciar Motoristas', category: 'Veículos' },
  { id: 'manage_brands', label: 'Gerenciar Marcas/Modelos', category: 'Veículos' },
  { id: 'manage_vehicle_types', label: 'Gerenciar Tipos de Veículos', category: 'Veículos' },
  { id: 'occurrences_view', label: 'Ver Ocorrências', category: 'Veículos' },
  { id: 'occurrences_manage', label: 'Gerenciar Ocorrências', category: 'Veículos' },
  { id: 'manage_partners', label: 'Gerenciar Parceiros', category: 'Veículos' },

  // OFICINA & MANUTENÇÃO
  { id: 'create_service_order', label: 'Abrir Ordem de Serviço', category: 'Oficina' },
  { id: 'close_service_order', label: 'Concluir Ordem de Serviço', category: 'Oficina' },
  { id: 'manage_maintenance_plans', label: 'Planos de Manutenção', category: 'Oficina' },
  { id: 'manage_stock', label: 'Gerenciar Almoxarifado', category: 'Oficina' },
  { id: 'manage_waste', label: 'Gestão de Resíduos', category: 'Oficina' },

  // COMBUSTÍVEL
  { id: 'add_fuel', label: 'Lançar Abastecimento', category: 'Combustível' },
  { id: 'edit_fuel_station', label: 'Gerenciar Postos', category: 'Combustível' },
  { id: 'manage_fuel_types', label: 'Tipos de Combustíveis', category: 'Combustível' },

  // ADMINISTRAÇÃO
  { id: 'view_financial', label: 'Ver Financeiro & Custos', category: 'Administração' },
  { id: 'view_reports', label: 'Ver Relatórios/Dashboard', category: 'Administração' },
  { id: 'view_strategic_analysis', label: 'Análise Estratégica', category: 'Administração' },
  { id: 'manage_team', label: 'Gerenciar Equipe', category: 'Administração' },
  { id: 'manage_settings', label: 'Configurações', category: 'Administração' },
  { id: 'manage_branches', label: 'Gerenciar Filiais', category: 'Administração' },
  { id: 'delete_records', label: 'Excluir Registros (Geral)', category: 'Administração' },
  { id: 'view_logs', label: 'Ver Auditoria de Logs', category: 'Administração' },
  
  // RH
  { id: 'manage_employees', label: 'Gerenciar Colaboradores (RH)', category: 'RH' },
];

export interface Branch {
  id: string;
  name: string;
  cnpj: string;
  location: string;
  lat?: number;
  lng?: number;
  code: string;
  createdAt: string;
}

export enum TireStatus {
  NEW = 'Novo',
  USED = 'Usado',
  RETREADING = 'Em Recapagem',
  RETREADED = 'Recauchutado',
  DAMAGED = 'Danificado/Descarte'
}

export type UserLevel = 'JUNIOR' | 'PLENO' | 'SENIOR' | 'CREATOR' | 'INSPECTOR' | 'ADMIN' | 'MECHANIC' | 'MANAGER' | 'DRIVER' | 'STOCK' | 'FINANCIAL';

export type ModuleType = 'TIRES' | 'MECHANICAL' | 'VEHICLES' | 'FUEL' | 'JMDSSMAQ' | 'HR';

export interface TireHistoryLog {
  date: string;
  action: 'CADASTRADO' | 'MONTADO' | 'DESMONTADO' | 'EDITADO' | 'INSPECAO' | 'REPARO' | 'ENVIADO_RECAPAGEM' | 'RETORNO_RECAPAGEM' | 'CONFERENCIA' | 'DESCARTE' | 'TRANSFERENCIA';
  details: string;
  treadDepth?: number;
}

export interface SystemLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // ex: "Criou Pneu", "Editou Veículo"
  details: string;
  module: ModuleType;
  timestamp: string;
  branchId?: string;
  entityId?: string;
  entityType?: string;
}

export type VisualDamage = 'CORTE' | 'BOLHA' | 'DESGASTE_IRREGULAR' | 'FURO' | 'OUTRO';

export interface Tire {
  id: string;
  orgId: string;
  fireNumber: string;
  brand: string;
  model: string;
  imageUrl?: string;
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
  branchId?: string; // Filial vinculada
  
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
  lastMeasuredDepth?: number;
  lastMeasuredOdometer?: number;
  
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
  branchId?: string;
  photoUrl?: string;
  type?: 'FROTA' | 'TERCEIRO';
}

export interface TelemetryFuelPoint {
  timestamp: string; // ISO date
  odometer: number;
  litrometer: number;
}

export interface FuelType {
  id: string;
  name: string;
  description?: string;
  branchId?: string;
}

export interface VehicleType {
  id: string;
  name: string;
  defaultAxles: number;
  steerAxlesCount: number; // Number of steer axles (usually 1 or 2)
  driveAxlesCount?: number; // Number of drive axles
  description?: string;
  branchId?: string;
}

export interface VehicleBrandModel {
  id: string;
  brand: string;
  model: string;
  type: string; // Dynamic type name or ID
  axles: number;
  maintenancePlanId?: string;
  oilChangeInterval?: number;
  oilLiters?: number;
  fuelType?: string;
  branchId?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  axles: number;
  type: string; // Dynamic type name or ID
  odometer: number;
  litrometer?: number; // Total consumed fuel volume
  totalCost: number; // Added totalCost
  avgMonthlyKm?: number; // For forecast
  lastLocation?: VehicleLocation;
  currentDriverId?: string; // Added currentDriverId property
  lastAutoUpdateDate?: string; // Data da última atualização automática de KM (para carretas)
  sascarCode?: string; // Cód. Sascar para integração
  averageKmPerLiter?: number; // Média calculada
  telemetryHistory?: TelemetryFuelPoint[]; // Histórico para média móvel de 100km
  telemetryRollingAvgKml?: number; // Média de consumo 100km
  brandModelId?: string; // Reference to VehicleBrandModel
  branchId?: string; // Filial vinculada
  
  // Extended fields for "RG"
  vin?: string; // Chassi
  year?: number;
  color?: string;
  fuelType?: string;
  fleetNumber?: string; // Prefixo
  speed?: number;
  ignition?: boolean;
  consumoInstantaneo?: number;
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

  // --- Ownership ---
  ownership?: 'OWNED' | 'LEASED';
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
  branchId?: string;
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
  photoUrl?: string; // Novo: Foto do perfil
  phone?: string; // Novo: Telefone
  cpf?: string; // Novo: CPF
  birthDate?: string; // Novo: Data de Nascimento
  notes?: string; // Novo: Observações/Bio
  allowedModules?: ModuleType[];
  permissions?: string[];
  createdAt: string;
  lastLogin?: string; // Novo campo
  password?: string; // Para persistência local mock
  branchId?: string | null; // Filial vinculada
  sectorId?: string; // Novo: Setor vinculado
  sectorName?: string; // Novo: Nome do setor vinculado
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
  imageUrl?: string;
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

export interface Partner {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  address?: string;
  responsible?: string;
  services: { id: string; name: string; description?: string; cost: number }[];
  branchId?: string;
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
  branchId?: string; // Filial vinculada
  allowedModules?: ModuleType[];
  permissions?: string[];
}

export interface AxleSelection {
  axle: number;
  side: 'LEFT' | 'RIGHT' | 'BOTH';
}

export interface ServiceOrder {
  id: string;
  orderNumber: number;
  vehicleId: string;
  vehiclePlate: string;
  occurrenceId?: string; // Vínculo com a Ocorrência que gerou a OS
  maintenancePlanId?: string; // Added maintenancePlanId, removed tireId/tireFireNumber
  tireId?: string; // Re-added for linking O.S. to specific tire
  tireFireNumber?: string; // Re-added for linking O.S. to specific tire
  title: string;
  details: string;
  startTime?: string; // New field for start time
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  totalCost?: number;
  laborCost?: number; // New: Labor cost
  laborHours?: number; // New: Hours worked
  collaboratorId?: string; // New: Linked collaborator
  collaboratorName?: string; // New: Collaborator name for history
  parts?: { name: string; quantity: number; unitCost: number; itemId?: string }[];
  services?: { id: string; name: string; cost: number; axles?: AxleSelection[] }[]; // Updated: Linked services with axle side
  maintenanceBaseId?: string;
  maintenanceBaseName?: string;
  arrivalAlertId?: string;
  isPreventiveMaintenance?: boolean;
  serviceType?: 'INTERNAL' | 'EXTERNAL' | 'BOTH'; // Updated: Internal, External or Both
  providerName?: string; // New: Provider name
  externalServiceCost?: number; // New: External service cost
  date?: string; // Data da O.S. (pode ser diferente de createdAt)
  createdBy: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
  odometer?: number;
  branchId?: string;
  axles?: AxleSelection[]; // Updated: Linked axles for the whole O.S. with side
  // Extended fields for the new form layout
  contactName?: string;
  isAuthorized?: boolean;
  isIssued?: boolean;
  waitingInvoice?: boolean;
  indisponibilidade?: string;
  paymentTerm?: string;
  documentType?: string;
  estimatedDelivery?: string;
  deliveryLimit?: string;
  supplierId?: string;
  supplierName?: string;
  customerId?: string;
  customerName?: string;
  box?: string;
  prisma?: string;
  plate2?: string;
  plate3?: string;
  plate4?: string;
  exitOdometer?: number;
  driverId?: string;
  driverName?: string;
  setId?: string;
  setDescription?: string;
  employeeId?: string;
  employeeName?: string;
  line?: string;
  sectorId?: string;
  sectorName?: string;
  checklistImported?: string;
  classificationId?: string;
  classificationName?: string;
  preOrderNumber?: string;
  maintenanceContract?: string;
  decontamination?: boolean;
  tagLocator?: string;
  partsCost?: number;
  attachments?: {
    name: string;
    url: string;
    type?: string;
  }[];
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
    branchId?: string;
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
  lastSyncAt?: string;
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
  branchId?: string;
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
  branchId?: string;
}

export interface OccurrenceReason {
  id: string;
  name: string;
  description?: string;
  branchId?: string;
}

export interface Treatment {
  id: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: string;
  attachments?: {
    name: string;
    url: string;
    type?: string;
  }[];
}

export interface Occurrence {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  reasonId: string;
  reasonName: string;
  description?: string;
  responsibleSector?: string;
  responsibleSectorId?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED' | 'PENDING_DELETION'; // NOVO: Estado de exclusão pendente
  deletionRequestedBy?: string; // NOVO: Quem pediu exclusão
  rejectionReason?: string;
  treatments: Treatment[];
  chat?: ChatMessage[];
  createdAt: string;
  resolvedAt?: string;
  userId: string;
  userName: string;
  branchId?: string;
  driverPhone?: string;
  photoUrls?: string[];
  externalCost?: number;
  paymentMethod?: string;
  paymentMethodId?: string;
  linkedServiceOrderId?: string;
  linkedServiceOrderNumber?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  branchId?: string;
}

export interface FuelStation {
  id: string;
  name: string;
  cnpj: string;
  address?: string;
  city?: string;
  state?: string;
  fuelTypes?: string[];
  branchId?: string;
  createdAt: string;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  odometer: number;
  liters: number;
  kg?: number; // Added for Gas fueling
  unitPrice: number;
  totalCost: number;
  fuelType: string;
  category?: 'LIQUID' | 'GAS'; // Added category
  stationName?: string;
  stationCnpj?: string;
  driverId?: string;
  driverName?: string;
  branchId?: string;
  notes?: string;
  kmPerLiter?: number; // Calculated
}

export interface PublicServiceRequest {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverName: string;
  title: string;
  details: string;
  problemType?: string;
  driverPhone?: string;
  informedOdometer?: number;
  vehicleStopped?: boolean;
  driverLocation?: string;
  preferredDate?: string;
  urgency?: 'NORMAL' | 'ALTA' | 'CRITICA' | string;
  attachments?: {
    name: string;
    url: string;
    type?: string;
  }[];
  status: 'PENDENTE' | 'EM_ANALISE' | 'CONVERTIDA' | 'ARQUIVADA';
  createdAt: string;
  linkedServiceOrderId?: string;
  linkedServiceOrderNumber?: string;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ServiceClassification {
  id: string;
  name: string;
  branchId?: string;
}

export interface ServiceSector {
  id: string;
  name: string;
  branchId?: string;
}

export type TabView = 'dashboard' | 'inventory' | 'register' | 'movement' | 'inspection' | 'fleet' | 'fleet-issues' | 'maintenance' | 'service' | 'location' | 'settings' | 'financial' | 'scrap' | 'strategic-analysis' | 'demand-forecast' | 'retreading' | 'service-orders' | 'qr-service-requests' | 'drivers' | 'acoustic-check' | 'reports' | 'reports-tires' | 'reports-vehicles' | 'reports-maintenance' | 'reports-fuel' | 'esg-panel' | 'retreader-ranking' | 'tire-loans' | 'tracker' | 'brand-models' | 'vehicle-types' | 'fuel-types' | 'branches' | 'partners' | 'occurrences' | 'fuel' | 'fuel-gas' | 'classification-sector' | 'waste-disposal' | 'ppe-disposal' | 'tire-disposal' | 'ambulatory' | 'ppe-stock' | 'rh';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

export type FinancialCategory = 'FINE' | 'TOLL' | 'TAX' | 'INSURANCE' | 'LICENSING' | 'MAINTENANCE_PREVENTIVE' | 'MAINTENANCE_CORRECTIVE' | 'FUEL' | 'OTHER';

export interface FinancialRecord {
  id: string;
  vehicleId?: string; // Opcional, pois pode ser custo da filial
  branchId?: string;
  category: FinancialCategory;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  relatedId?: string; // ID da OS, Abastecimento, etc.
  createdAt: string;
  createdBy: string;
}

export type WasteUnit = 'KG' | 'LITERS' | 'UNITS' | 'METERS';

export interface WasteType {
  id: string;
  orgId: string;
  name: string;
  unit: WasteUnit;
  description?: string;
  category: 'WASTE' | 'PPE' | 'TIRE';
}

export interface WasteDisposalItem {
  wasteTypeId: string;
  wasteTypeName: string;
  quantity: number;
  unit: WasteUnit;
}

export interface WasteDisposal {
  id: string;
  orgId: string;
  items: WasteDisposalItem[];
  date: string;
  responsibleId: string;
  responsibleName: string;
  partnerId: string; // Partner receiving the waste
  partnerName: string;
  notes?: string;
  certificateNumber?: string; // MTR or similar
  cost?: number; // Cost of disposal
  attachmentUrl?: string;
  createdAt: string;
  
  // Workflow fields
  stage: 'AGENDAMENTO' | 'EMISSAO_MTR' | 'RETIRADA' | 'FINALIZADO';
  driverName?: string;
  vehiclePlate?: string;
  mtrDetails?: string;

  // Type of disposal
  disposalType: 'WASTE' | 'PPE' | 'TIRE';
}

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  text: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface PpeStockItem {
  id: string;
  orgId: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  caNumber?: string;
  description?: string;
  imageUrl?: string;
  updatedAt: string;
}

export type HealthRecordType = 'ADMISSION'|'PERIODIC'|'RETURN_TO_WORK'|'FUNCTION_CHANGE'|'DISMISSAL'|'CLINICAL_VISIT';

export interface HealthRecord {
  id: string;
  orgId: string;
  collaboratorId: string;
  collaboratorName?: string;
  date: string;
  type: HealthRecordType;
  symptoms?: string;
  diagnosis?: string;
  observations?: string;
  status: 'FIT' | 'UNFIT' | 'RESTRICTED';
  doctorName?: string;
  doctorCrm?: string;
  asoExpirationDate?: string;
  attachments?: string[];
  // Novos campos para atendimento clínico
  vitalSigns?: {
    bloodPressure?: string;
    temperature?: string;
    saturation?: string;
    glucose?: string;
    heartRate?: string;
  };
  medicationGiven?: string;
  referral?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  orgId: string;
  name: string;
  role: string;
  birthDate: string;
  startDate: string;
  rg: string;
  cnh: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}
