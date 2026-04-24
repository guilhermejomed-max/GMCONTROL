
import { useState, useMemo, FC, FormEvent, ChangeEvent, useEffect } from 'react';
import { Vehicle, VehicleBrandModel, UserLevel, VehicleLocation, Tire, SystemSettings, ServiceOrder, TrackerSettings, ArrivalAlert, MaintenancePlan, MaintenanceSchedule, Branch, VehicleType, FuelType, FuelEntry } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash2, X, Truck, Container, Gauge, Search, MapPin, Loader2, LocateFixed, Upload, FileSpreadsheet, FileText, PenLine, AlertTriangle, AlertOctagon, Ban, Wrench, CheckSquare, Square, MoreHorizontal, RotateCcw, Radio, Calendar, Bell, Check, Milestone, Activity, History, Disc, Settings, Save, CheckCircle2, Fuel, ChevronRight, LayoutGrid, Printer, Building2, RefreshCw } from 'lucide-react';
import { sascarService } from '../services/sascarService';
import { DigitalTwin } from './DigitalTwin';
import { getAllValidPositions } from '../lib/vehicleUtils';

const SASCAR_CODES_CSV = `GBX3J82;1639616
DAJ5H64;2215706
GCE5G02;1445274
GGC8A28;1590307
FCZ2G83;1577457
FPY7H26;1716132
EHH1I41;1685967
GHV9759;1239852
FGX8606;1403430
GGZ9G24;1698429
TMD6E28;2166023
FYZ5B31;1609984
EHH1962;1392781
EHH3A75;1696296
CDX0074;1392782
GBB9G73;1450874
EDU8C62;1851666
FLX9H76;1750770
GDD7C71;1716135
CQL0E74;1806480
EHH9A90;520508
FIE4967;1411830
RHA7C60;2198999
STT1J01;2251785
DPC3D64;520488
EZU6644;1639628
SUU4F68;2039100
RBB1G99;1477200
GHZ5H28;1674718
GIE3049;1189319
FKK6B03;1716133
DUH0B52;1943868
GBT6G75;1330239
MIW2420;563572
GGC3E29;1161559
EYA3F72;1888334
CDX0071;1328757
FMZ9F05;1881578
ENN2C02;1825936
FPQ1F05;1874435
FCO8E14;1892729
SWP2G45;2143746
GHZ8D73;520487
DUH0D52;1954772
EXN3H08;1470416
IUF4H69;1791846
GCV0B66;1924596
BSX3G15;1888336
GCV0B73;1955396
FNR7G23;1945442
FPQ6D14;1945105
FHH3D41;1946035
FYB4J63;520485
SVG5I37;2143744
FOR9479;1340085
DPB7G81;996570
DTT0J45;1570365
DUH0G72;2065758
DUU5J13;2075455
FCN1G83;1704874
SSS2I03;1958155
GDH6B36;1433383
GDA4589;2031125
FZO2F64;1816364
EHH9H65;1850510
FGA4D42;1750767
SST7H08;1958154
EWH2A20;536785
FJR3D66;1732464
FLX5D99;2127564
EZU6H02;1737488
SSY1F91;837801
STT3E74;2039103
IXW4H96;1923919
EJX9A22;1950989
RJG8E39;1953783
SWO5D66;1974463
EHW6060;1357611
SWT8B78;2034057
SUO9A93;2052718
SVO4D71;2052712
FUX0G54;1750769
FMU5C09;1989201
SWT7A63;2052717
SFW7I58;2142913
DNJ1F40;1925016
JAX7F40;2016160
SSR9H21;2052715
DUH0F52;2052713
SWW1J95;2039059
SVL0G47;2073831
DAJ4J42;2073827
DUH2E24;2123392
DAJ4J82;2126846
FDZ2A95;881405
TBG4B75;2183145
FXG9H71;1442865
DDF3G21;2039107
GID1E75;1477199
SVM8G85;2099373
SSX0I98;1958153
SWH2C17;2106775
DAJ5E03;2102396
BZR8G23;1888335
DUH0A52;1903010
DAJ0G24;2117576
EEK3G45;2155478
SVM0A66;2099366
EHH7462;520516
FLZ6H98;1601215
DAJ4J62;2081632
GDL1A61;1435212
GIX1019;1154056
SGC8H06;1985799
DAJ3J21;2081631
FZI0G13;1856071
RBG7A56;1630760
EMP9D51;2158232
QRI8F67;2045459
GCV0I91;2164731
FCF0B85;2134687
DAJ5E64;2117682
HKA6H61;2112746
SVM6G24;2099367
EDU6G48;1294968
DAJ5D01;2123052
MRA6122;520539
MFH7864;1879600
SFW8C57;2142914
DUH1E62;2171245
TBC3H50;2172349
FHC1F92;2201015
TMD0I78;2166024
GEH0F93;2172971
SVP5C71;2073829
DAJ5E74;2176201
TKI3E40;2166929
SVP8G07;2073830
TBC3H66;2172347
SUT2B63;2054173
TLL9B77;2152306
TBG4B71;2183107
EVS1C62;2174160
DUH0F41;2052716
BZB9D63;1339556
CUZ0I01;2189094
QJU0G20;2187920
GDD2C85;1814752
TMD0A68;2179117
TMD5G27;2179086
TBC3H54;2172348
DUU8B53;2195331
TBC3H51;2172350
TIT7E67;2166021
TKI6H95;2166927
FCY4A78;1609983
TMD0A73;2179120
TMD0A76;2188619
TIQ0F74;2183714
DAJ5D44;2081634
GCV0B16;1743777
CUZ0I03;2195799
CNI4860;1347015
TIS3G34;2194839
FBY3889;2190102
QJS0I20;2037577
TBH7I73;2189760
DUH3H62;2208957
SWT8G56;2036123
TMD8I55;2179103
DPF0988;520510
TIU4B05;2166931
FTE0E41;1750772
TLO4E05;2169597
EVS2H62;2174164
FZR1E14;2210234
TMD0A71;2179115
SUB7I83;2054169
EVS0F91;2171247
GHF0G55;1824193
TJO1H56;2212137
FXE0G65;1777546
DAJ5D32;2123802
EVS1J52;2173030
TBG4B74;2183122
PQJ1G16;2161251
FPX7D86;1874444
DAJ5F63;2176203
CUC4410;520497
GER6I64;2189743
SSW3A65;1957839
RMZ0G67;2207070
DAJ3I72;2029989
PPV8A16;2045823
TBH7I48;2189765
SVP0E27;1816222
SUG2E86;2214423
CDL7106;520541
GIK1J15;1609988
DAJ5G41;2215703
RKO8C83;1952102
OVJ9C24;1992674
FNN7D24;1768761
QJW4I29;2222392
RPH6D64;2087899
ESS7G33;1825935
TBH7I71;2189749
FCM8G15;1984529
EVS7J83;2217986
TBG4B72;2184788
EVS1F71;2223989
FXD6D01;1892726
FIE0A42;2171260
FTU8C81;1750771
UFC0A27;2226360
UFC0A16;2226361
DUH2G41;2239436
GCV3B27;2007263
EJW0H19;2065789
UFC0A29;2226350
FXE0H43;1874443
UFC0A49;2228322
TIW0F21;2194840
PRO4D68;2166806
EHH7460;520514
FNG2H61;2237690
UFC0A06;2226358
UFC2F15;2226382
EYT7E62;967559
UFC0A24;2226389
QSY5D29;2225655
UFC3B17;2226387
UFC0A28;2226349
DUH0H42;2072052
CSK1015;520547
RBE2C06;2251517
GGH0G57;2159103
UFC5D27;2226390
FMO5F02;2238021
SUQ8A53;2194837
QTY6E09;2240681
UFC0A15;2226386
TLQ0C19;2166419
SPJ3A16;2246285
SVF8G61;2194838
EVS1H13;2173554
UFC9B82;2236070
FSX0G86;1777544
FXD4B71;2228312
RBE0A90;2251515
FDZ2B52;1892725
SFQ5D29;1822507
TJY0B04;2254022
EVS1D32;2012172
FIV1H06;2235547
MQF9730;520522
GDR1H28;1478033
SWP1F91;2255047
FSS2H65;1578030
FZP4J65;2258772
RJG8E38;1952103
DUH3G42;2240685
EUD8F27;2256039
GGX3D12;1834406
SUB9E14;2183713
FYS0H29;2247221
RKO8C55;1952104
GHE1C16;1843007
EVS8J83;2258596
GDX8B75;1824194
EKU3J75;2258074
FQQ7E61;1814749
SRK0E52;2262737
EVS9H64;2258720
GBB3H24;1814750
SFQ9A94;1822508
GGA5A74;1540968
EVS3C41;2173028
GGV5D15;933426
SUX9F68;2258594
FDD9I91;1679973
TJQ4F58;2263838
GHL2E83;1824090
DUH0I32;2130634
GDF7E16;1689674
FWO6I42;2095023
GHE3H15;1600962
GHT8H34;1824195
GBN0D25;1381015
STT6D12;2039093
MQL5684;520544
DUH4F62;2258595
EVS2G91;2171246
GDI8H71;1642109
FXQ1H73;1777542
GEV3F26;1843006
RAA0J67;1874708
GIX1623;2183712
7367SFS;2258717
RXP5G37;1687002
SXA7A63;2043704
EUL8E93;1640820
TJR9D91;2133977
CFY9J94;1851116
DXB8H01;1851117
SVV0G11;1678465
DPF8535;1678469
TLL9F03;2161287
TLL0F88;2161288
FNZ6C25;1616895
TJF0B61;2220005
UES4I35;2220006
UFC3F53;2220008
SXJ0D03;2177396
SXI9G03;2177397
UFO2C37;2260809
TJF0A63;2220450
SWG7C92;2062964
SVV3E18;2016804
BYZ8D76;1873811
CDR4A62;1873813
CQU7J43;1873814
BYI3D82;1873815
CQL4I31;1873816
QTR5E12;1690716
FJF7A63;1827714
QTR5F12;1690914
RYY0A11;2013059
BPQ6H14;1849271
BYY8H02;1849272
SUT0A44;2044299
TKE0A28;2174584
DMC2D72;1923451
STX0C82;2134083
STX0D61;2134084
STX0D54;2134086
STX0C83;2134087
STX0B32;2134088
STX0B61;2134089
STX0B03;2134090
STX0B92;2134091
STX0D76;2134092
STX0B04;2134093
CQU3H14;1917980
CUA9E36;1917981
EDO4E43;1908328
STX0A83;2134152
TJA9E51;2196112
TJQ6G15;2196116
TJA0A15;2196117
TJB7E46;2196119
TJG5B42;2196121
TPM3D14;2196127
TPM3E34;2196129
TLB1B53;2196131
TPL6I79;2249158
UDB8I22;2227943
GJK5J75;1672664
GAH7B37;1672665
GGV3G02;1672666
EDU8A62;1846211
RLD7C49;1700344
STR3I24;2029991
SXX8I48;2233817
TPI4H48;2233818
CQU2F95;1877227
TLJ4J66;2156003
TLJ6E46;2156004
TKH1E51;2171253
TPN2F19;2249795
CVN6281;1945605
SUT6I47;2041329
SUT8J94;2041330
FFI8151;1663429
FFW8241;1663435
UDW1I40;2261039
UDH6J71;2261046
SUM0H63;2100155
TKD8F58;2171788
BZB8F24;1920625
TKW1I97;2171926
EHH9091;1663915
EJV2302;1663917
ESS6E18;1663941
FFD1H21;1663952
FFI8152;1663956
FFI8154;1663958
FJF0728;1663965
REA6B16;1663995
EDU6651;1663997
TPM3C64;2209872
RYP3J81;1998674
FCV5B21;1837663
BPO1J13;1859032
STS8G48;2017391
FYU6F11;1837793
STX0A41;2131800
BYP8D62;1874448
CQU0E55;1874449
BQU9H62;1874450
GIT0G44;2252493
TIV8H57;2153304
TIV5A47;2153305
SWQ5A86;2063894
STZ0B34;2063895
SVK0A53;2063897
SUY2I48;2063898
STX2A41;2017781
TPZ5D47;2237652
UDN7D17;2228016
TPY1I67;2228019
QSY1I10;2228020
TKF1F44;2228021
TLP6A02;2228024
CKU0253;1636126
CQU7940;1636127
CQU8C54;1636128
CUC6J48;1636129
CUC7058;1636130
CYB1643;1636132
DPC3591;1636139
TPJ3D00;1636140
DPC3595;1636142
UGP2E74;2259136
TKU0F19;2169674
SWI0H98;2085759
SWK0B96;2085884
FYZ5G13;1667349
SXA6J93;2045497
SXA4J93;2045498
SXA6F13;2045499
SVV6F23;2076423
EOE7C86;1766729
RYY0A61;2014518
SXA6I23;2045500
STX0C63;2135084
STL9E01;2020370
STU6E14;2020372
STL2E14;2020374
DPC3037;1559084
BMR9A15;1673408
CVN6280;1946036
GED9G85;1955741
SWU8H52;2098250
STY9A16;2098251
TLI3J05;2219436
RDZ7A09;1574494
TLL8B15;2219440
EFW3H19;1664000
STX0C84;2135815
UDV2A35;2271520
CQU1D21;1946667
GIT9D43;1670119
TKG3I43;2172901
CYB1593;2216319
DYH7F51;1838720
CPL2D71;1556578
CSK1031;1556581
GEL9289;1556582
CSK1176;1556583
CUC6940;1556585
CZX4G43;1556587
CKU6C31;2101868
CYR0707;1556616
CZX4931;1556618
DAJ6689;1556619
DJC9888;1556620
DJE7D93;1556624
DPC3A43;1556625
DRF5G15;1556629
DYA7G24;1556630
STZ8H98;1556631
EWU2334;1556633
EWU2335;1556634
EWU2355;1556636
EWU2366;1556637
FYK6288;1556641
GIA9856;1556643
GIT7585;1556644
GIX9754;1556646
MTX6276;1556649
ODN9193;1556650
ODR3728;1556651
ODR3730;1556653
REA6C16;1556655
CUC6951;1556688
CQQ7G41;2101955
SVV6G59;1912826
TLN9F71;2222643
ATO9070;1897043
SUH1J45;2086316
SSY7F66;2086326
FYJ4F24;1609985
EXU8I36;1630763
EZL7G16;1850497
GDO5C17;1782349
FQU4G94;1782350
GDU2F34;1782354
CQU4B36;1782356
GDX2D42;1652287`;

interface VehicleManagerProps {
  orgId: string;
  vehicles: Vehicle[];
  vehicleBrandModels?: VehicleBrandModel[];
  tires: Tire[];
  serviceOrders: ServiceOrder[];
  maintenancePlans?: MaintenancePlan[];
  maintenanceSchedules?: MaintenanceSchedule[];
  branches?: Branch[];
  defaultBranchId?: string;
  onAddVehicle: (v: Vehicle) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onUpdateVehicle: (v: Vehicle) => Promise<void>;
  onUpdateServiceOrder?: (id: string, updates: Partial<ServiceOrder>) => Promise<void>;
  onDeleteAlert?: (id: string) => Promise<void>;
  onSimulateArrival?: (plate: string, baseId: string) => Promise<void>;
  userLevel: UserLevel;
  settings: SystemSettings | null;
  trackerSettings: TrackerSettings | null;
  onSyncSascar?: (showModal?: boolean) => Promise<number>;
  vehicleTypes?: VehicleType[];
  fuelTypes?: FuelType[];
  fuelEntries?: FuelEntry[];
  arrivalAlerts?: ArrivalAlert[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const VehicleManager: FC<VehicleManagerProps> = ({ 
  orgId, 
  vehicles, 
  vehicleBrandModels = [], 
  tires, 
  serviceOrders, 
  maintenancePlans = [], 
  maintenanceSchedules = [], 
  branches = [], 
  defaultBranchId, 
  onAddVehicle, 
  onDeleteVehicle, 
  onUpdateVehicle, 
  onUpdateServiceOrder, 
  onDeleteAlert, 
  onSimulateArrival, 
  userLevel, 
  settings, 
  trackerSettings, 
  onSyncSascar,
  vehicleTypes: propVehicleTypes = [],
  fuelTypes = [],
  fuelEntries = [],
  arrivalAlerts = [],
  onLoadMore,
  hasMore
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncingSascar, setIsSyncingSascar] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [updatingLocationId, setUpdatingLocationId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVehicleRG, setSelectedVehicleRG] = useState<Vehicle | null>(null);
  const [activeRGTab, setActiveRGTab] = useState<'geral' | 'manutencao' | 'pneus' | 'combustivel'>('geral');
  const [selectedAxle, setSelectedAxle] = useState<number | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'EMPTY' | 'MAINTENANCE'>('ALL');
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  
  // Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingData, setSchedulingData] = useState({
    targetName: '',
    targetLat: 0,
    targetLng: 0,
    radius: 500, // meters
    services: '',
  });
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [vehicleAlerts, setVehicleAlerts] = useState<ArrivalAlert[]>([]);

  useEffect(() => {
    if (selectedVehicleRG) {
      setVehicleAlerts(arrivalAlerts.filter(a => a.vehiclePlate === selectedVehicleRG.plate));
      setActiveRGTab('geral');
      setSelectedAxle('ALL');
    }
  }, [selectedVehicleRG, arrivalAlerts]);

  useEffect(() => {
    if (selectedVehicleRG) {
      const updated = vehicles.find(v => v.id === selectedVehicleRG.id);
      if (!updated) {
        setSelectedVehicleRG(null);
      } else if (JSON.stringify(updated) !== JSON.stringify(selectedVehicleRG)) {
        setSelectedVehicleRG(updated);
      }
    }
  }, [vehicles, selectedVehicleRG]);

  const pendingServiceOrders = useMemo(() => {
    if (!selectedVehicleRG) return [];
    return serviceOrders.filter(so => so.vehicleId === selectedVehicleRG.id && so.status === 'PENDENTE');
  }, [serviceOrders, selectedVehicleRG]);

  const vehicleFuelEntries = useMemo(() => {
    if (!selectedVehicleRG) return [];
    return fuelEntries.filter(fe => fe.vehicleId === selectedVehicleRG.id);
  }, [fuelEntries, selectedVehicleRG]);

  const vehicleMaintenanceOrders = useMemo(() => {
    if (!selectedVehicleRG) return [];
    return serviceOrders.filter(so => so.vehicleId === selectedVehicleRG.id && so.status === 'CONCLUIDO');
  }, [serviceOrders, selectedVehicleRG]);

  const rgStats = useMemo(() => {
    const fuelCost = vehicleFuelEntries.reduce((sum, fe) => sum + (fe.totalCost || 0), 0);
    const maintenanceCost = vehicleMaintenanceOrders.reduce((sum, so) => {
      const partsCost = so.parts ? so.parts.reduce((pSum, p) => pSum + (p.quantity * p.unitCost), 0) : 0;
      return sum + (so.totalCost || (partsCost + (so.laborCost || 0) + (so.externalServiceCost || 0)));
    }, 0);
    
    const sortedEntries = [...vehicleFuelEntries].sort((a, b) => a.odometer - b.odometer);
    
    let totalKm = 0;
    let litersUsed = 0;

    if (sortedEntries.length >= 2) {
      const firstEntry = sortedEntries[0];
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      
      totalKm = lastEntry.odometer - firstEntry.odometer;
      
      // Liters consumed in the interval: Sum liters from 2nd entry onwards
      litersUsed = sortedEntries.slice(1).reduce((acc, fe) => {
        const isGasE = fe.category === 'GAS' || 
                       String(fe.fuelType || '').toUpperCase().includes('GNV') || 
                       String(fe.fuelType || '').toUpperCase().includes('GÁS') ||
                       (Number(fe.kg) > 0);
        const volume = isGasE ? (Number(fe.liters) || Number(fe.kg) || 0) : (Number(fe.liters) || 0);
        return acc + volume;
      }, 0);
    }
    
    // totalLiters for UI display (all recorded liters)
    const totalLitersRecorded = vehicleFuelEntries.reduce((sum, fe) => sum + (fe.liters || 0), 0);
    
    const avgConsumptionRefueling = litersUsed > 0 ? totalKm / litersUsed : 0;
    
    return {
      totalLiters: totalLitersRecorded,
      fuelCost,
      maintenanceCost,
      totalCost: fuelCost + maintenanceCost,
      totalKm,
      avgConsumptionRefueling,
      avgConsumptionLitrometer: 0,
      diff: 0
    };
  }, [vehicleFuelEntries, vehicleMaintenanceOrders, selectedVehicleRG]);

  const handlePrintMaintenanceReport = () => {
    if (!selectedVehicleRG) return;

    const vehicleOrders = serviceOrders
      .filter(so => so.vehicleId === selectedVehicleRG.id && so.status === 'CONCLUIDO')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const vehicleFuel = fuelEntries.filter(fe => fe.vehicleId === selectedVehicleRG.id);

    const totalMaintenanceSpent = vehicleOrders.reduce((acc, so) => acc + (so.totalCost || (so.parts ? so.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0) + (so.laborCost || 0) + (so.externalServiceCost || 0)), 0);
    const totalFuelSpent = vehicleFuel.reduce((acc, fe) => acc + (fe.totalCost || 0), 0);
    const totalSpent = totalMaintenanceSpent + totalFuelSpent;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Relatório de Manutenção - ${selectedVehicleRG.plate}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .vehicle-info { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-box { background: #f9f9f9; padding: 10px; border-radius: 8px; }
            .info-label { font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase; }
            .info-value { font-size: 16px; font-weight: bold; }
            .summary { margin-bottom: 30px; background: #eef2ff; padding: 15px; border-radius: 8px; border: 1px solid #c7d2fe; }
            .summary-label { font-size: 14px; font-weight: bold; color: #4338ca; }
            .summary-value { font-size: 24px; font-weight: 900; color: #1e1b4b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f3f4f6; padding: 10px; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; vertical-align: top; }
            .parts-list { font-size: 11px; color: #666; margin-top: 5px; }
            .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Geral de Manutenção</h1>
            <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <div class="vehicle-info">
            <div class="info-box">
              <div class="info-label">Veículo / Placa</div>
              <div class="info-value">${selectedVehicleRG.brand || ''} ${selectedVehicleRG.model} - ${selectedVehicleRG.plate}</div>
            </div>
            <div class="info-box">
              <div class="info-label">KM Atual</div>
              <div class="info-value">${selectedVehicleRG.odometer?.toLocaleString() || '0'} km</div>
            </div>
          </div>

          <div className="summary" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
              <div class="summary-label">MANUTENÇÃO</div>
              <div class="summary-value" style="font-size: 18px;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMaintenanceSpent)}</div>
            </div>
            <div>
              <div class="summary-label">COMBUSTÍVEL</div>
              <div class="summary-value" style="font-size: 18px;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFuelSpent)}</div>
            </div>
            <div style="border-left: 2px solid #c7d2fe; padding-left: 15px;">
              <div class="summary-label">INVESTIMENTO TOTAL</div>
              <div class="summary-value">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 15%">Data</th>
                <th style="width: 10%">KM</th>
                <th style="width: 30%">Serviço / Descrição</th>
                <th style="width: 30%">Peças / Itens</th>
                <th style="width: 15%">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${vehicleOrders.map(so => `
                <tr>
                  <td>${so.date ? new Date(so.date + (so.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : new Date(so.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td>${so.odometer?.toLocaleString() || '-'}</td>
                  <td>
                    <strong>${so.title}</strong>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">${so.details || ''}</div>
                  </td>
                  <td>
                    ${so.parts && so.parts.length > 0 ? `
                      <div class="parts-list">
                        ${so.parts.map(p => `• ${p.quantity}x ${p.name} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.unitCost)})`).join('<br>')}
                      </div>
                    ` : 'Nenhum item registrado'}
                  </td>
                  <td style="font-weight: bold">
                    ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(so.totalCost || (so.parts ? so.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 30px;">
            <h2 style="font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Histórico de Abastecimento</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>KM</th>
                  <th>Litros</th>
                  <th>Preço Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${vehicleFuel.sort((a, b) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime()).map(fe => `
                  <tr>
                    <td>${new Date(fe.date + (fe.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}</td>
                    <td>${fe.odometer.toLocaleString()}</td>
                    <td>${fe.liters.toLocaleString()} L</td>
                    <td>${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fe.unitPrice)}</td>
                    <td style="font-weight: bold">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fe.totalCost)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            GM Control Pro - Sistema de Gestão de Frotas
          </div>

          <script>
            window.onload = () => {
              window.print();
              // window.close(); // Optional: close after printing
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleAddAlert = async () => {
    if (!selectedVehicleRG) return;
    if (!schedulingData.targetName || !schedulingData.targetLat || !schedulingData.targetLng) {
      alert("Preencha todos os campos do agendamento.");
      return;
    }

    setIsSavingAlert(true);
    try {
      const newAlert: ArrivalAlert = {
        id: Date.now().toString(),
        vehiclePlate: selectedVehicleRG.plate,
        targetName: schedulingData.targetName,
        targetLat: schedulingData.targetLat,
        targetLng: schedulingData.targetLng,
        radius: schedulingData.radius,
        services: schedulingData.services,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        createdBy: 'Usuário', // Ideally from auth
        branchId: defaultBranchId
      };
      await storageService.addArrivalAlert(orgId, newAlert);
      setIsScheduling(false);
      setSchedulingData({ targetName: '', targetLat: 0, targetLng: 0, radius: 500, services: '' });
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar agendamento.");
    } finally {
      setIsSavingAlert(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    // Using direct deletion as window.confirm is not supported in iframes
    try {
      if (onDeleteAlert) {
        await onDeleteAlert(id);
      } else {
        await storageService.deleteArrivalAlert(orgId, id);
      }
    } catch (error) {
      console.error("Error deleting alert:", error);
    }
  };

  const handleCancelServiceOrder = async (orderId: string) => {
    if (!onUpdateServiceOrder) return;
    try {
      await onUpdateServiceOrder(orderId, { status: 'CANCELADO' });
    } catch (error) {
      console.error("Error cancelling service order:", error);
    }
  };

  const handleSimulateArrival = async (baseId: string) => {
    if (!selectedVehicleRG || !onSimulateArrival) return;
    try {
      await onSimulateArrival(selectedVehicleRG.plate, baseId);
    } catch (error) {
      console.error("Error simulating arrival:", error);
    }
  };

  useEffect(() => {
    const importCodes = async () => {
      if (localStorage.getItem('sascar_codes_imported_v1') === 'true') return;
      if (vehicles.length === 0) return; // Wait until vehicles are loaded

      const lines = SASCAR_CODES_CSV.split('\n');
      const codeMap = new Map<string, string>();
      lines.forEach(line => {
        const [plate, code] = line.split(';');
        if (plate && code) {
          codeMap.set(plate.trim().toUpperCase(), code.trim());
        }
      });

      let importedCount = 0;
      for (const vehicle of vehicles) {
        const cleanPlate = vehicle.plate.replace(/[^A-Z0-9]/g, '').substring(0, 7).toUpperCase();
        const code = codeMap.get(cleanPlate);
        if (code && vehicle.sascarCode !== code) {
          await onUpdateVehicle({ ...vehicle, sascarCode: code });
          importedCount++;
        }
      }

      console.log(`Imported ${importedCount} Sascar codes.`);
      localStorage.setItem('sascar_codes_imported_v1', 'true');
    };

    importCodes();
  }, [vehicles, onUpdateVehicle]);
  
  // Bulk Actions State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Brand Models State
  const [isManagingBrandModels, setIsManagingBrandModels] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(propVehicleTypes);

  useEffect(() => {
    if (propVehicleTypes.length > 0) {
      setVehicleTypes(propVehicleTypes);
    } else {
      const unsub = storageService.subscribeToVehicleTypes(orgId, setVehicleTypes);
      return () => unsub();
    }
  }, [orgId, propVehicleTypes]);

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [editingBrandModelId, setEditingBrandModelId] = useState<string | null>(null);
  const [brandModelFormData, setBrandModelFormData] = useState<Omit<VehicleBrandModel, 'id'>>({
    brand: '',
    model: '',
    type: 'CAVALO',
    axles: 3,
    maintenancePlanId: undefined
  });

  const handleSaveBrandModel = async (e: FormEvent) => {
    e.preventDefault();
    if (editingBrandModelId) {
      await storageService.updateVehicleBrandModel(orgId, { id: editingBrandModelId, ...brandModelFormData });
    } else {
      await storageService.addVehicleBrandModel(orgId, { id: Date.now().toString(), ...brandModelFormData });
    }
    setEditingBrandModelId(null);
    setIsAddingBrand(false);
    setIsAddingModel(false);
    setBrandModelFormData({ brand: '', model: '', type: 'CAVALO', axles: 3, maintenancePlanId: undefined });
  };

  const handleDeleteBrandModel = async (id: string) => {
    if (window.confirm("Deseja excluir esta marca/modelo?")) {
      await storageService.deleteVehicleBrandModel(orgId, id);
    }
  };

  // Undo Import State
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    brand: '',
    brandModelId: '',
    axles: 3,
    type: 'CAVALO',
    odometer: 0,
    sascarCode: '',
    vin: '',
    year: '',
    color: '',
    fuelType: 'DIESEL S10',
    fleetNumber: '',
    engine: '',
    transmission: '',
    renavam: '',
    tiresBrand: '',
    tiresSize: '',
    revisionIntervalKm: 10000,
    oilLiters: 0,
    lastPreventiveKm: 0,
    lastPreventiveDate: '',
    branchId: defaultBranchId || '',
    ownership: 'OWNED'
  });

  // Função para analisar o estado do veículo
  const getVehicleStatus = (vehicle: Vehicle) => {
      const mountedTires = tires.filter(t => t.vehicleId === vehicle.id);
      
      // 1. Falta de Pneus
      const validPositions = getAllValidPositions(vehicle, vehicleTypes);
      const expectedTires = validPositions.length;
      const missingTiresCount = Math.max(0, expectedTires - mountedTires.length);
      const isMissingTires = missingTiresCount > 0;

      // 2. Pneus Baixos (Críticos)
      const minDepth = settings?.minTreadDepth || 3.0;
      const criticalTires = mountedTires.filter(t => t.currentTreadDepth <= minDepth);
      const hasLowTread = criticalTires.length > 0;

      // 3. Manutenção Preventiva
      const brandModel = vehicleBrandModels.find(bm => bm.id === vehicle.brandModelId);
      const maintenanceInterval = vehicle.revisionIntervalKm || brandModel?.oilChangeInterval || settings?.maintenanceIntervalKm || 10000;
      
      // Find the most recent completed preventive service order
      const vehicleServiceOrders = serviceOrders.filter(so => 
        so.vehicleId === vehicle.id && 
        so.status === 'CONCLUIDO' && 
        so.isPreventiveMaintenance
      );

      const latestPreventiveOS = [...vehicleServiceOrders].sort((a, b) => {
        const dateA = new Date(a.completedAt || a.date || a.createdAt).getTime();
        const dateB = new Date(b.completedAt || b.date || b.createdAt).getTime();
        return dateB - dateA;
      })[0];

      const lastServiceKm = latestPreventiveOS?.odometer || vehicle.lastPreventiveKm || 0;
      const currentKm = vehicle.odometer || 0;
      
      // Find next scheduled maintenance from PMJ
      const vehicleSchedules = maintenanceSchedules.filter(s => s.vehicleId === vehicle.id);
      const nextSchedule = [...vehicleSchedules]
        .filter(s => s.nextDueKm)
        .sort((a, b) => (a.nextDueKm || 0) - (b.nextDueKm || 0))[0];

      const nextDueKm = nextSchedule?.nextDueKm || (lastServiceKm + maintenanceInterval);
      const kmToNextMaintenance = Math.max(0, nextDueKm - currentKm);
      
      let isMaintenanceOverdue = vehicle.type !== 'CARRETA' && kmToNextMaintenance <= 0;
      const isMaintenanceNear = vehicle.type !== 'CARRETA' && kmToNextMaintenance <= 1500 && !isMaintenanceOverdue;
      
      // If lastServiceKm is 0 and odometer is high, it's definitely overdue
      if (lastServiceKm === 0 && currentKm >= maintenanceInterval && !nextSchedule && vehicle.type !== 'CARRETA') {
        isMaintenanceOverdue = true;
      }
      
      // Verifica se algum pneu passou da vida útil estimada (padrão 80k se não houver catálogo)
      const hasExpiredTires = mountedTires.some(t => {
          const run = Math.max(0, vehicle.odometer - (t.installOdometer || 0));
          const totalRun = (t.totalKms || 0) + run;
          
          // Tenta pegar do catálogo nas configurações, senão usa 80k
          const modelDef = settings?.tireModels?.find(m => m.brand === t.brand && m.model === t.model);
          const limit = modelDef?.estimatedLifespanKm || 80000;
          
          return totalRun >= limit;
      });

      const isHighKm = isMaintenanceOverdue || isMaintenanceNear || hasExpiredTires;

      return {
          isMissingTires,
          missingCount: missingTiresCount,
          hasLowTread,
          lowTreadCount: criticalTires.length,
          isHighKm,
          isMaintenanceOverdue,
          isMaintenanceNear,
          hasExpiredTires,
          mountedCount: mountedTires.length,
          kmToNextMaintenance
      };
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesSearch = v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            v.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      const status = getVehicleStatus(v);

      if (filterType === 'CRITICAL') return status.hasLowTread;
      if (filterType === 'EMPTY') return status.isMissingTires;
      if (filterType === 'MAINTENANCE') return status.isMaintenanceOverdue || status.isMaintenanceNear;

      return true;
    }).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicles, searchTerm, tires, settings, filterType, vehicleBrandModels]);

  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVehicles, currentPage]);

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      plate: '',
      model: '',
      brand: '',
      brandModelId: '',
      axles: 3,
      type: 'CAVALO',
      odometer: 0,
      sascarCode: '',
      vin: '',
      year: '',
      color: '',
      fuelType: 'DIESEL S10',
      fleetNumber: '',
      engine: '',
      transmission: '',
      renavam: '',
      tiresBrand: '',
      tiresSize: '',
      revisionIntervalKm: 10000,
      oilLiters: 0,
      lastPreventiveKm: 0,
      lastPreventiveDate: '',
      branchId: defaultBranchId || '',
      ownership: 'OWNED'
    });
    setIsAdding(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      plate: vehicle.plate,
      model: vehicle.model,
      brand: vehicle.brand || '',
      brandModelId: vehicle.brandModelId || '',
      axles: vehicle.axles,
      type: vehicle.type,
      odometer: vehicle.odometer,
      sascarCode: vehicle.sascarCode || '',
      vin: vehicle.vin || '',
      year: vehicle.year ? vehicle.year.toString() : '',
      color: vehicle.color || '',
      fuelType: vehicle.fuelType || 'DIESEL S10',
      fleetNumber: vehicle.fleetNumber || '',
      engine: vehicle.engine || '',
      transmission: vehicle.transmission || '',
      renavam: vehicle.renavam || '',
      tiresBrand: vehicle.tiresBrand || '',
      tiresSize: vehicle.tiresSize || '',
      revisionIntervalKm: vehicle.revisionIntervalKm || 10000,
      oilLiters: vehicle.oilLiters || 0,
      lastPreventiveKm: vehicle.lastPreventiveKm || 0,
      lastPreventiveDate: vehicle.lastPreventiveDate || '',
      branchId: vehicle.branchId || '',
      ownership: vehicle.ownership || 'OWNED'
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const vehicleData: any = {
        ...formData,
        plate: formData.plate.toUpperCase(),
        year: formData.year ? parseInt(formData.year) : undefined,
        revisionIntervalKm: Number(formData.revisionIntervalKm),
        oilLiters: Number(formData.oilLiters),
        lastPreventiveKm: Number(formData.lastPreventiveKm)
      };

      if (editingId) {
        // Update existing vehicle
        const existingVehicle = vehicles.find(v => v.id === editingId);
        if (existingVehicle) {
          const updatedVehicle: Vehicle = {
            ...existingVehicle,
            ...vehicleData
          };
          await onUpdateVehicle(updatedVehicle);
        }
      } else {
        // Create new vehicle
        const newVehicle: Vehicle = {
          id: Date.now().toString(36),
          ...vehicleData,
          totalCost: 0
        };
        await onAddVehicle(newVehicle);
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({ 
        plate: '', model: '', brand: '', brandModelId: '', axles: 3, type: 'CAVALO', odometer: 0, sascarCode: '',
        vin: '', year: '', color: '', fuelType: 'DIESEL S10', fleetNumber: '',
        engine: '', transmission: '', renavam: '', tiresBrand: '', tiresSize: '',
        revisionIntervalKm: 10000, oilLiters: 0, lastPreventiveKm: 0, lastPreventiveDate: '',
        branchId: defaultBranchId || '',
        ownership: 'OWNED'
      });
    } catch (error) {
      alert("Erro ao salvar veículo.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- BULK ACTIONS & UNDO ---
  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set<string>(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredVehicles.length) {
          setSelectedIds(new Set());
      } else {
          const newSet = new Set(filteredVehicles.map(v => v.id));
          setSelectedIds(newSet);
      }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.size === 0) return;
      if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} veículos? Esta ação não pode ser desfeita.`)) return;

      setIsBulkDeleting(true);
      try {
          const deletePromises = Array.from(selectedIds).map(id => onDeleteVehicle(id));
          await Promise.all(deletePromises);
          
          setIsSelectionMode(false);
          setSelectedIds(new Set());
          alert(`${selectedIds.size} veículos removidos com sucesso.`);
      } catch (err) {
          console.error(err);
          alert("Erro ao excluir alguns veículos. Tente novamente.");
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const handleUndoImport = async () => {
      if (lastImportedIds.length === 0) return;
      if (!confirm(`Deseja desfazer a última importação? Isso removerá ${lastImportedIds.length} veículos criados.`)) return;

      setIsBulkDeleting(true);
      try {
          const deletePromises = lastImportedIds.map(id => onDeleteVehicle(id));
          await Promise.all(deletePromises);
          setLastImportedIds([]);
          alert("Importação desfeita com sucesso.");
      } catch (err) {
          console.error(err);
          alert("Erro ao desfazer importação.");
      } finally {
          setIsBulkDeleting(false);
      }
  };

  const handleUpdateLocation = async (vehicle: Vehicle) => {
    // Se o veículo tem código Sascar ou placa, tenta sincronizar via Sascar primeiro
    if (vehicle.sascarCode || vehicle.plate) {
      setUpdatingLocationId(vehicle.id);
      try {
        if (onSyncSascar) {
          const updatedCount = await onSyncSascar();
          if (updatedCount > 0) {
            // O useEffect cuidará de atualizar o selectedVehicleRG no estado local
            return;
          } else {
            console.log("Sascar sync returned 0 updates for this vehicle, falling back to manual GPS.");
          }
        }
      } catch (error) {
        console.error("Erro ao sincronizar via Sascar:", error);
      } finally {
        setUpdatingLocationId(null);
      }
    }

    if (!confirm(`VOCÊ ESTÁ AO LADO DO VEÍCULO?\n\nEsta função usa o GPS do SEU CELULAR/PC para definir onde o veículo está.\n\nClique em OK apenas se você estiver fisicamente junto ao veículo.`)) {
      return;
    }

    if (!("geolocation" in navigator)) {
      alert("Geolocalização não suportada neste navegador.");
      return;
    }

    setUpdatingLocationId(vehicle.id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const address = data.display_name?.split(',')[0] || 'Localização Manual (Dispositivo)';
          const city = data.address?.city || data.address?.town || data.address?.village || 'Desconhecida';
          const state = data.address?.state || '';

          const locationUpdate: VehicleLocation = {
            lat: latitude, lng: longitude, address: address, city: city, state: state, updatedAt: new Date().toISOString()
          };

          await onUpdateVehicle({ ...vehicle, lastLocation: locationUpdate });
        } catch (error) {
          console.error("Erro ao obter endereço", error);
          await onUpdateVehicle({ ...vehicle, lastLocation: { lat: latitude, lng: longitude, address: 'Coordenadas GPS (Manual)', city: 'Desconhecida', state: '', updatedAt: new Date().toISOString() } });
        } finally {
          setUpdatingLocationId(null);
        }
      },
      (error) => {
        alert("Erro ao obter localização: " + error.message);
        setUpdatingLocationId(null);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };

  const handleImportExcel = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setLastImportedIds([]); // Reset previous undo history on new import

    try {
        const XLSX = await import('xlsx');
        const reader = new FileReader();
        
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                
                const data = XLSX.utils.sheet_to_json(ws);
                const dataByCol = XLSX.utils.sheet_to_json(ws, { header: 'A', defval: '' });
                if (dataByCol.length > 0) dataByCol.shift();

                let updatedCount = 0;
                let createdCount = 0;
                let notFoundCount = 0;
                let kmUpdatedCount = 0;

                const parseCoordinate = (val: any) => {
                    if (val === undefined || val === null || String(val).trim() === '') return NaN;
                    let str = String(val).trim().replace(/,/g, '.');
                    const match = str.match(/-?\d+(\.\d+)?/);
                    if (!match) return NaN;
                    const num = parseFloat(match[0]);
                    if (!isNaN(num) && Math.abs(num) <= 180 && num !== 0) return num;
                    return NaN;
                };

                const parseOdometer = (val: any) => {
                    if (val === undefined || val === null) return 0;
                    if (typeof val === 'number') return Math.floor(val);
                    let str = String(val).trim().toUpperCase();
                    str = str.replace(/[A-Z]/g, '').trim();
                    if (str.includes('.')) str = str.replace(/\./g, '');
                    if (str.includes(',')) str = str.replace(',', '.');
                    str = str.replace(/[^0-9.]/g, '');
                    const num = parseFloat(str);
                    return isNaN(num) ? 0 : Math.floor(num);
                };

                const updatesBatch: any[] = [];
                const createsBatch: Vehicle[] = [];

                for (let i = 0; i < data.length; i++) {
                    const row: any = data[i];
                    const colRow: any = dataByCol[i] || {};

                    const normalizedRow: any = {};
                    Object.keys(row).forEach(k => {
                        const cleanKey = k.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, ""); 
                        normalizedRow[cleanKey] = row[k];
                    });

                    const getKey = (possibleKeys: string[]) => {
                        for (const k of possibleKeys) { if (normalizedRow[k]) return normalizedRow[k]; }
                        const allKeys = Object.keys(normalizedRow);
                        for (const k of possibleKeys) { const found = allKeys.find(ak => ak.includes(k)); if (found) return normalizedRow[found]; }
                        return null;
                    };

                    const plate = getKey(['PLACA', 'VEICULO']);
                    const lat = parseCoordinate(getKey(['LATITUDE', 'LAT', 'GPSLAT', 'Y']));
                    const lng = parseCoordinate(getKey(['LONGITUDE', 'LONG', 'GPSLON', 'X']));
                    
                    let odometerVal = colRow['I']; 
                    if (!odometerVal) odometerVal = getKey(['HODOMETRO', 'ODOMETRO', 'KM', 'KMATUAL', 'KMTOTAL']);
                    const odometer = parseOdometer(odometerVal);

                    const rawAddress = getKey(['ENDERECO', 'RUA', 'LOGRADOURO', 'LOCAL', 'LOCALIZACAO']);
                    const city = getKey(['CIDADE', 'MUNICIPIO']);
                    const state = getKey(['ESTADO', 'UF']);
                    
                    let finalAddress = rawAddress;
                    if (!finalAddress || String(finalAddress).length <= 3) {
                        if (city && state) finalAddress = `${city} - ${state}`;
                        else if (city) finalAddress = city;
                        else if (state) finalAddress = `Em trânsito (${state})`;
                        else finalAddress = 'Localização Atualizada';
                    } else {
                        if (city && !String(finalAddress).includes(city)) finalAddress = `${finalAddress} - ${city}`;
                    }
                    
                    if (plate) {
                        const cleanPlate = plate.toString().toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
                        const vehicle = vehicles.find(v => v.plate.replace(/[^A-Z0-9]/g, '') === cleanPlate);
                        
                        if (vehicle) {
                            const updates: Partial<Vehicle> = { id: vehicle.id };
                            let hasChanges = false;
                            
                            if (!isNaN(lat) && !isNaN(lng)) {
                                updates.lastLocation = { lat, lng, address: String(finalAddress), city: city || 'Desconhecida', state: state || '', updatedAt: new Date().toISOString() };
                                hasChanges = true;
                            }
                            if (odometer > 0 && odometer !== vehicle.odometer) {
                                updates.odometer = odometer;
                                hasChanges = true;
                                kmUpdatedCount++;
                            }

                            // Se o veículo não tem intervalo de revisão, tenta pegar do modelo
                            if (!vehicle.revisionIntervalKm) {
                                const brandModelName = normalizedRow['MODELO'] || normalizedRow['MARCAMODELO'];
                                if (brandModelName) {
                                    const bm = vehicleBrandModels.find(m => 
                                        brandModelName.toString().toUpperCase().includes(m.model.toUpperCase()) ||
                                        m.model.toUpperCase().includes(brandModelName.toString().toUpperCase())
                                    );
                                    if (bm?.oilChangeInterval) {
                                        updates.revisionIntervalKm = bm.oilChangeInterval;
                                        hasChanges = true;
                                    }
                                    if (bm?.oilLiters) {
                                        updates.oilLiters = bm.oilLiters;
                                        hasChanges = true;
                                    }
                                }
                            }

                            if (hasChanges) {
                                updatesBatch.push(updates);
                                updatedCount++;
                            }
                        } else {
                            const brandModelName = normalizedRow['MODELO'] || normalizedRow['MARCAMODELO'];
                            let brandModelId = '';
                            let revisionIntervalKm = 10000;
                            let oilLiters = 0;

                            if (brandModelName) {
                                const bm = vehicleBrandModels.find(m => 
                                    brandModelName.toString().toUpperCase().includes(m.model.toUpperCase()) ||
                                    m.model.toUpperCase().includes(brandModelName.toString().toUpperCase())
                                );
                                if (bm) {
                                    brandModelId = bm.id;
                                    revisionIntervalKm = bm.oilChangeInterval || 10000;
                                    oilLiters = bm.oilLiters || 0;
                                }
                            }

                            const newVehicle: Vehicle = {
                                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                plate: plate.toString().toUpperCase().trim(),
                                model: brandModelName || 'Modelo Importado',
                                brandModelId,
                                revisionIntervalKm,
                                oilLiters,
                                type: 'CAVALO',
                                axles: Number(normalizedRow['EIXOS']) || 3,
                                odometer: odometer,
                                totalCost: 0,
                                avgMonthlyKm: 10000
                            };
                            if (!isNaN(lat) && !isNaN(lng)) {
                                newVehicle.lastLocation = { lat, lng, address: String(finalAddress), city: city || '', state: state || '', updatedAt: new Date().toISOString() };
                            }
                            createsBatch.push(newVehicle);
                            createdCount++;
                        }
                    } else {
                        notFoundCount++;
                    }
                }

                if (updatesBatch.length > 0) await storageService.updateVehicleBatch(orgId, updatesBatch);
                
                if (createsBatch.length > 0) {
                    await storageService.importDataBatch(orgId, [], createsBatch);
                    setLastImportedIds(createsBatch.map(v => v.id)); // Armazena IDs para desfazer
                }

                alert(`Importação Concluída:\n\nAtualizados: ${updatedCount}\nNovos: ${createdCount}\nIgnorados: ${notFoundCount}`);
            } catch (err: any) {
                console.error(err);
                alert(`Erro ao processar arquivo: ${err.message}`);
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    } catch (err: any) {
        alert(`Erro na biblioteca: ${err.message}`);
        setIsImporting(false);
    }
    e.target.value = '';
  };

  const handleSyncSascar = async () => {
    if (onSyncSascar) {
        setIsSyncingSascar(true);
        try {
            await onSyncSascar(true);
        } finally {
            setIsSyncingSascar(false);
        }
        return;
    }
    
    setIsSyncingSascar(true);
    try {
      // Passar os IDs (sascarCode) e placas para buscar os veículos cadastrados
      const plates = vehicles.flatMap(v => [String(v.sascarCode || ""), String(v.plate || "")]).filter(p => p && p.length > 0);
      
      console.log(`[Sascar Sync Debug] Veículos cadastrados:`, vehicles.map(v => ({ id: v.id, plate: v.plate, sascarCode: v.sascarCode })));
      console.log(`[Sascar Sync] Iniciando sincronização para ${plates.length} identificadores...`);
      
      const CHUNK_SIZE = 50;
      let updatedCount = 0;
      const bestUpdates = new Map(); // Usaremos isso para filtrar o melhor ponto de cada carro

      console.log(`[Sascar Sync] Sincronizando ${plates.length} veículos...`);
      
      const results = [];
      try {
          console.log(`[Sascar Sync] Solicitando posições...`);
          const result = await sascarService.getVehicles(plates, trackerSettings || undefined);
          results.push(result.data || []);
      } catch (err) {
          console.error(`[Sascar Sync] Erro na sincronização:`, err);
      }

      results.flat().forEach((item: any) => {
                  let sv = item;

                  // CORREÇÃO 2: Decodifica o texto da Sascar para virar um objeto real
                  if (typeof item === 'string') {
                      try {
                          sv = JSON.parse(item);
                          if (typeof sv === 'string') sv = JSON.parse(sv); // Segundo parse se necessário
                      } catch (e) { return; }
                  }

                  const idSascar = parseInt(String(sv.idVeiculo || sv.id || "").replace(/\D/g, ""), 10);
                  const fullPlate = String(sv.placa || sv.plate || "").replace(/[^A-Z0-9-]/gi, '').toUpperCase();
                  const sascarPlate = String(sv.placa || sv.plate || "").replace(/[^A-Z0-9]/gi, '').toUpperCase();
                  
                  if (isNaN(idSascar) && !sascarPlate) return;

                  // CORREÇÃO 3: Match Blindado (converte ID do App e ID da Sascar para Inteiro)
                  const localVehicle = vehicles.find(v => {
                      // Match por ID
                      const idApp = parseInt(String(v.sascarCode || "").replace(/\D/g, ""), 10);
                      if (!isNaN(idApp) && !isNaN(idSascar) && idApp === idSascar) return true;
                      
                      // Match por Placa
                      const plateApp = String(v.plate || "").replace(/[^A-Z0-9]/gi, '').toUpperCase();
                      if (plateApp && sascarPlate && plateApp === sascarPlate) return true;
                      
                      return false;
                  });

                  if (localVehicle) {
                      console.log(`[Sascar Sync Debug] Match encontrado: Local=${localVehicle.plate} (ID=${localVehicle.sascarCode}) <-> Sascar=${sascarPlate} (ID=${idSascar})`);
                      const dataPosicaoNova = new Date(sv.lastLocation?.updatedAt || sv.dataPosicaoIso || sv.dataPosicao || new Date()).getTime();
                      
                      const matchKey = !isNaN(idSascar) ? idSascar : fullPlate;

                      // Só adiciona se não houver dados desse carro ainda OU se esse ponto for mais novo
                      if (!bestUpdates.has(matchKey) || dataPosicaoNova > bestUpdates.get(matchKey).timestamp) {
                          const rawOdo = sv.odometer || sv.odometroExato || sv.odometro || 0;
                          const latVal = Number(sv.latitude || sv.lat || 0);
                          const lngVal = Number(sv.longitude || sv.lng || 0);
                          
                          const isInvalidPosition = latVal === 0 && lngVal === 0;
                          const finalLat = isInvalidPosition ? (localVehicle.lastLocation?.lat || 0) : latVal;
                          const finalLng = isInvalidPosition ? (localVehicle.lastLocation?.lng || 0) : lngVal;
                          
                          console.log(`[Sascar Sync Debug] Atualizando dados: Odo=${rawOdo}, Lat=${finalLat}, Lng=${finalLng}`);

                          bestUpdates.set(matchKey, {
                              timestamp: dataPosicaoNova,
                              updateData: {
                                  id: localVehicle.id,
                                  odometer: Math.round(Number(rawOdo)),
                                  lastLocation: {
                                      ...localVehicle.lastLocation,
                                      lat: finalLat,
                                      lng: finalLng,
                                      address: isInvalidPosition ? (localVehicle.lastLocation?.address || 'Coordenadas GPS') : (sv.lastLocation?.address || sv.rua || sv.address || 'Coordenadas GPS'),
                                      city: isInvalidPosition ? (localVehicle.lastLocation?.city || 'Desconhecida') : (sv.lastLocation?.city || sv.cidade || sv.city || 'Desconhecida'),
                                      state: isInvalidPosition ? (localVehicle.lastLocation?.state || '') : (sv.lastLocation?.state || sv.uf || sv.state || ''),
                                      updatedAt: sv.lastLocation?.updatedAt || sv.dataPosicaoIso || new Date().toISOString()
                                  },
                                  lastAutoUpdateDate: new Date().toISOString()
                              }
                          });
                          updatedCount++;
                      }
                  } else {
                      console.log(`[Sascar Sync Debug] Nenhum match encontrado para: Sascar=${sascarPlate} (ID=${idSascar})`, sv);
                  }
              });

      // Agora transformamos o Map no array de updates final
      const updatesBatch = Array.from(bestUpdates.values()).map(item => item.updateData);

      if (updatesBatch.length > 0) {
          console.log(`[Sascar Sync] Aplicando ${updatesBatch.length} atualizações no banco...`);
          await storageService.updateVehicleBatch(orgId, updatesBatch);
          console.log(`[Sascar Sync] ${updatesBatch.length} veículos atualizados com sucesso.`);
          alert(`Sucesso! ${updatesBatch.length} veículos do GM CONTROL foram atualizados.`);
      } else {
          console.log("[Sascar Sync] Nenhum veículo local correspondente encontrado nos dados da Sascar.");
          alert("Nenhum veículo correspondente foi encontrado para atualizar.");
      }
    } catch (error) {
        console.error(`[Sascar Sync] Erro ao sincronizar:`, error);
        alert("Falha técnica ao sincronizar. Verifique o console.");
    } finally {
        setIsSyncingSascar(false);
    }
  };

  const quickStats = useMemo(() => {
      let missingTires = 0;
      let lowTread = 0;
      let maintenance = 0;
      vehicles.forEach(v => {
          const s = getVehicleStatus(v);
          if(s.isMissingTires) missingTires++;
          if(s.hasLowTread) lowTread++;
          if(s.isHighKm) maintenance++;
      });
      return { missingTires, lowTread, maintenance };
  }, [vehicles, tires, settings]);

  const isCarreta = formData.type?.toUpperCase().includes('CARRETA') || vehicleTypes.find(vt => vt.name === formData.type)?.steerAxlesCount === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Truck className="h-7 w-7 text-blue-600" /> Minha Frota
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie veículos e atualize localizações em tempo real.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setIsManagingBrandModels(true)} 
              className="flex-1 md:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm hover:border-slate-400 transition-all"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Marcas e Modelos</span>
              <span className="md:hidden">Modelos</span>
            </button>
            <button 
              onClick={handleSyncSascar} 
              disabled={isSyncingSascar}
              className={`flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isSyncingSascar ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isSyncingSascar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              <span className="hidden md:inline">{isSyncingSascar ? 'Sincronizando...' : 'Sincronizar Sascar'}</span>
              <span className="md:hidden">Sascar</span>
            </button>
            <label className={`flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                <span className="hidden md:inline">{isImporting ? 'Importando...' : 'Importar Excel'}</span>
                <span className="md:hidden">Importar</span>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} disabled={isImporting} />
            </label>
            <button 
              onClick={handleOpenAdd} 
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" /> <span className="hidden md:inline">Novo Veículo</span><span className="md:hidden">Novo</span>
            </button>
        </div>
      </div>

      {/* BANNER DE DESFAZER IMPORTAÇÃO */}
      {lastImportedIds.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-orange-600">
                      <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">Importação Recente</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Você adicionou {lastImportedIds.length} veículos agora. Algo errado?</p>
                  </div>
              </div>
              <button 
                  onClick={handleUndoImport}
                  disabled={isBulkDeleting}
                  className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 transition-colors"
              >
                  {isBulkDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : <RotateCcw className="h-3 w-3" />}
                  Desfazer Importação
              </button>
          </div>
      )}

      {/* FILTER BAR / STATUS BAR */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar veículo por placa ou modelo..." 
              className="w-full pl-10 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          {/* SELECTION ACTIONS */}
          {userLevel === 'SENIOR' && (
              <button 
                onClick={toggleSelectionMode} 
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap ${isSelectionMode ? 'bg-slate-800 text-white border-slate-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
              >
                  {isSelectionMode ? <X className="h-4 w-4"/> : <CheckSquare className="h-4 w-4"/>}
                  {isSelectionMode ? 'Cancelar Seleção' : 'Selecionar / Excluir em Massa'}
              </button>
          )}

          {!isSelectionMode && (
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                <button onClick={() => setFilterType('ALL')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${filterType === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>Todos</button>
                <button onClick={() => setFilterType('EMPTY')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${filterType === 'EMPTY' ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900'}`}><Ban className="h-3 w-3"/> Sem Pneus</button>
                <button onClick={() => setFilterType('CRITICAL')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${filterType === 'CRITICAL' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'}`}><AlertOctagon className="h-3 w-3"/> Críticos</button>
                <button onClick={() => setFilterType('MAINTENANCE')} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 border ${filterType === 'MAINTENANCE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900'}`}><Wrench className="h-3 w-3"/> Manutenção</button>
            </div>
          )}
      </div>

      {/* SELECTION TOOLBAR (If Active) */}
      {isSelectionMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                  <button onClick={toggleSelectAll} className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 hover:underline">
                      {selectedIds.size === filteredVehicles.length ? <CheckSquare className="h-4 w-4"/> : <Square className="h-4 w-4"/>}
                      {selectedIds.size === filteredVehicles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                  <span className="text-xs text-slate-500 font-medium">|</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedIds.size} selecionados</span>
              </div>
              <button 
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || isBulkDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
              >
                  {isBulkDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : <Trash2 className="h-3 w-3"/>}
                  Excluir Selecionados
              </button>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedVehicles.map(vehicle => {
          const status = getVehicleStatus(vehicle);
          const isSelected = selectedIds.has(vehicle.id);
          
          return (
            <div 
                key={vehicle.id} 
                onClick={() => isSelectionMode ? toggleSelection(vehicle.id) : setSelectedVehicleRG(vehicle)}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm group transition-all relative overflow-hidden cursor-pointer 
                    ${isSelectionMode 
                        ? (isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100') 
                        : (status.hasLowTread || status.isMaintenanceOverdue || status.isMissingTires || status.hasExpiredTires
                            ? 'border-red-200 dark:border-red-900/50' 
                            : status.isMaintenanceNear 
                                ? 'border-yellow-300 dark:border-yellow-900/50 bg-yellow-50/10'
                                : 'border-slate-200 dark:border-slate-800')
                    }`}
            >
              {isSelectionMode && (
                  <div className="absolute top-4 right-4 text-blue-600">
                      {isSelected ? <CheckSquare className="h-6 w-6 fill-blue-100"/> : <Square className="h-6 w-6 text-slate-300"/>}
                  </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                    {vehicle.type === 'CAVALO' || vehicle.type === 'BI-TRUCK' ? <Truck className="h-6 w-6" /> : <Container className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-white">{vehicle.plate}</h3>
                    <div className="flex flex-col">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                        {vehicle.brandModelId 
                          ? (() => {
                              const bm = vehicleBrandModels.find(b => b.id === vehicle.brandModelId);
                              return bm ? `${bm.brand} ${bm.model}` : vehicle.model;
                            })()
                          : vehicle.model}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase">
                          {vehicle.type}
                        </span>
                        {vehicle.fuelType && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 uppercase">
                            {vehicle.fuelType}
                          </span>
                        )}
                      </div>
                      {vehicle.branchId ? (
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {branches.find(b => b.id === vehicle.branchId)?.name || 'Filial não encontrada'}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Sem Filial
                        </p>
                      )}
                      {vehicle.ownership === 'LEASED' && (
                        <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1 mt-0.5 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded w-fit">
                          <FileText className="h-3 w-3" />
                          Locado
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {!isSelectionMode && (
                    <div className="flex gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleUpdateLocation(vehicle); }}
                            disabled={updatingLocationId === vehicle.id}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Marcar Veículo na Minha Posição"
                        >
                            {updatingLocationId === vehicle.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <LocateFixed className="h-4 w-4"/>}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(vehicle); }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Editar Veículo"
                        >
                            <PenLine className="h-4 w-4" />
                        </button>
                        {userLevel === 'SENIOR' && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteVehicle(vehicle.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir Veículo">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
              </div>
              
              {/* ALERTAS VISUAIS NO CARD */}
              <div className="flex flex-wrap gap-2 mb-3">
                  {status.isMissingTires && (
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1 border border-orange-200">
                          <Ban className="h-3 w-3"/> Faltam {status.missingCount} pneus
                      </span>
                  )}
                  {status.hasLowTread && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded flex items-center gap-1 border border-red-200">
                          <AlertOctagon className="h-3 w-3"/> {status.lowTreadCount} pneus baixos
                      </span>
                  )}
                  {status.isMaintenanceOverdue && (
                      <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 border border-red-700">
                          <AlertTriangle className="h-3 w-3"/> Manutenção Vencida
                      </span>
                  )}
                  {status.isMaintenanceNear && (
                      <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2 py-1 rounded flex items-center gap-1 border border-yellow-500">
                          <AlertTriangle className="h-3 w-3"/> Manutenção Próxima
                      </span>
                  )}
                  {status.hasExpiredTires && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1 border border-purple-200">
                          <History className="h-3 w-3"/> Pneus Vencidos
                      </span>
                  )}
                  {!status.isMissingTires && !status.hasLowTread && !status.isMaintenanceOverdue && !status.isMaintenanceNear && !status.hasExpiredTires && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 border border-green-200">
                          OK
                      </span>
                  )}
              </div>

              <div className="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-800 pt-3 mb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                    <Gauge className="h-4 w-4" /> {vehicle.odometer.toLocaleString()} km
                  </div>
                  {vehicle.averageKmPerLiter ? (
                    <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                      <Fuel className="h-3 w-3" /> {vehicle.averageKmPerLiter.toFixed(2)} km/L <span className="text-[8px] uppercase opacity-70">(Abast.)</span>
                    </div>
                  ) : null}
                  {vehicle.sascarCode && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      Cód. Sascar: {vehicle.sascarCode}
                    </div>
                  )}
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded text-xs font-bold">{vehicle.axles} Eixos</span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                 <div className="flex items-start gap-2">
                    <MapPin className={`h-4 w-4 mt-0.5 ${vehicle.lastLocation ? 'text-green-500' : 'text-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                          {vehicle.lastLocation?.address || 'Localização não definida'}
                       </p>
                       <p className="text-[10px] text-slate-400 mt-0.5">
                          {vehicle.lastLocation?.updatedAt 
                             ? `Atualizado: ${new Date(vehicle.lastLocation.updatedAt).toLocaleDateString()} ${new Date(vehicle.lastLocation.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` 
                             : 'Sem registro de GPS'}
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
          >
            Anterior
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return <span key={page} className="px-2 py-2 text-slate-400">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
          >
            Próxima
          </button>
        </div>
      )}

      {selectedVehicleRG && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" /> 
                RG do Veículo: {selectedVehicleRG.plate}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsScheduling(!isScheduling)} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${isScheduling ? 'bg-orange-100 text-orange-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  <Calendar className="h-4 w-4" />
                  {isScheduling ? 'Fechar Agendamento' : 'Novo Agendamento'}
                </button>
                <button onClick={() => setSelectedVehicleRG(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
              <button 
                onClick={() => setActiveRGTab('geral')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${activeRGTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Informações Gerais
              </button>
              <button 
                onClick={() => setActiveRGTab('manutencao')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${activeRGTab === 'manutencao' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Manutenção & Histórico
              </button>
              <button 
                onClick={() => setActiveRGTab('pneus')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${activeRGTab === 'pneus' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Pneus
              </button>
              <button 
                onClick={() => setActiveRGTab('combustivel')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${activeRGTab === 'combustivel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Combustível
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {activeRGTab === 'geral' && (
                  <>
                    {isScheduling && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 p-4 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm flex items-center gap-2">
                          <Bell className="h-4 w-4" /> Configurar Alerta de Chegada
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecionar Ponto Salvo</label>
                            <select 
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-white"
                              onChange={e => {
                                const point = settings?.savedPoints?.find(p => p.id === e.target.value);
                                if (point) {
                                  setSchedulingData({
                                    targetName: point.name,
                                    targetLat: point.lat,
                                    targetLng: point.lng,
                                    radius: point.radius,
                                    services: schedulingData.services
                                  });
                                }
                              }}
                            >
                              <option value="">-- Selecione um local cadastrado --</option>
                              {settings?.savedPoints?.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <p className="text-[9px] text-slate-400 mt-1 italic">Ou preencha os campos abaixo manualmente</p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Destino</label>
                            <input 
                              type="text" 
                              placeholder="Ex: Porto de Santos" 
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              value={schedulingData.targetName}
                              onChange={e => setSchedulingData({...schedulingData, targetName: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Raio de Alerta (metros)</label>
                            <input 
                              type="number" 
                              placeholder="500" 
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              value={schedulingData.radius}
                              onChange={e => setSchedulingData({...schedulingData, radius: Number(e.target.value)})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Latitude</label>
                            <input 
                              type="number" 
                              step="any"
                              placeholder="-23.9618" 
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              value={schedulingData.targetLat}
                              onChange={e => setSchedulingData({...schedulingData, targetLat: Number(e.target.value)})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Longitude</label>
                            <input 
                              type="number" 
                              step="any"
                              placeholder="-46.3322" 
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                              value={schedulingData.targetLng}
                              onChange={e => setSchedulingData({...schedulingData, targetLng: Number(e.target.value)})}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serviços a realizar</label>
                            <textarea 
                              placeholder="Descreva o que será feito no veículo (ex: Troca de óleo, Revisão de freios...)" 
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm min-h-[80px]"
                              value={schedulingData.services}
                              onChange={e => setSchedulingData({...schedulingData, services: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setIsScheduling(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                          <button 
                            onClick={handleAddAlert}
                            disabled={isSavingAlert}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                          >
                            {isSavingAlert ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Salvar Agendamento
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Mini Map Section */}
                        <div className="md:col-span-3 space-y-2">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 h-48 relative group">
                                {selectedVehicleRG.lastLocation ? (
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        frameBorder="0" 
                                        scrolling="no" 
                                        marginHeight={0} 
                                        marginWidth={0} 
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedVehicleRG.lastLocation.lng - 0.005},${selectedVehicleRG.lastLocation.lat - 0.005},${selectedVehicleRG.lastLocation.lng + 0.005},${selectedVehicleRG.lastLocation.lat + 0.005}&layer=mapnik&marker=${selectedVehicleRG.lastLocation.lat},${selectedVehicleRG.lastLocation.lng}`}
                                        className="grayscale-[0.2] contrast-[1.1]"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                        <MapPin className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-xs font-bold">Sem localização registrada</p>
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2">
                                    <button 
                                        onClick={() => handleUpdateLocation(selectedVehicleRG)}
                                        disabled={updatingLocationId === selectedVehicleRG.id}
                                        className="bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-blue-600 hover:text-blue-700 transition-all flex items-center gap-2 text-[10px] font-bold"
                                    >
                                        {updatingLocationId === selectedVehicleRG.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <LocateFixed className="h-3 w-3" />
                                        )}
                                        Atualizar GPS
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleUpdateLocation(selectedVehicleRG)}
                                disabled={updatingLocationId === selectedVehicleRG.id}
                                className="w-full flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-left group"
                            >
                                <div className="bg-blue-600 p-2 rounded-lg text-white group-hover:scale-110 transition-transform">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-0.5 flex justify-between">
                                        Localização Atual
                                        <span className="text-slate-400 font-normal normal-case">Clique para atualizar</span>
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                        {selectedVehicleRG.lastLocation?.address || 'Endereço não identificado'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {selectedVehicleRG.lastLocation?.updatedAt 
                                            ? `Última atualização: ${new Date(selectedVehicleRG.lastLocation.updatedAt).toLocaleString()}` 
                                            : 'Sem registro de data/hora'}
                                    </p>
                                </div>
                            </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Marca / Modelo</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">
                              {selectedVehicleRG.brandModelId 
                                ? (() => {
                                    const bm = vehicleBrandModels.find(b => b.id === selectedVehicleRG.brandModelId);
                                    return bm ? `${bm.brand} ${bm.model}` : selectedVehicleRG.model;
                                  })()
                                : selectedVehicleRG.model}
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Tipo</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.type}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Eixos</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.axles}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Hodômetro</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.odometer.toLocaleString()} km</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Litrômetro (Bomba/Can)</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.litrometer ? `${selectedVehicleRG.litrometer.toLocaleString()} L` : 'N/A'}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Média (KM/L)</p>
                              <Activity className="h-3 w-3 text-emerald-500" />
                            </div>
                            <p className="text-lg font-black text-slate-800 dark:text-white">
                                {rgStats.avgConsumptionRefueling ? rgStats.avgConsumptionRefueling.toFixed(2) : '0.00'} KM/L
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Ano</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.year || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Cor</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.color || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Combustível</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.fuelType || 'DIESEL S10'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Frota #</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{selectedVehicleRG.fleetNumber || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Propriedade</p>
                            <p className={`text-lg font-black ${selectedVehicleRG.ownership === 'LEASED' ? 'text-purple-600' : 'text-slate-800 dark:text-white'}`}>
                              {selectedVehicleRG.ownership === 'LEASED' ? 'Locado' : 'Próprio'}
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Chassi (VIN)</p>
                            <p className="text-sm font-black text-slate-800 dark:text-white truncate" title={selectedVehicleRG.vin}>{selectedVehicleRG.vin || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                <Activity className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Consumo Diesel</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-xl font-black text-slate-800 dark:text-white truncate">{rgStats.totalLiters.toLocaleString()} <span className="text-sm font-bold text-slate-500">L</span></p>
                                <p className="text-[10px] font-bold text-slate-500 mt-1">Investimento: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rgStats.fuelCost)}</p>
                              </div>
                            </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                                <Wrench className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Manutenção</span>
                            </div>
                            <p className="text-xl font-black text-slate-800 dark:text-white truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rgStats.maintenanceCost)}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">Total acumulado</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                <LayoutGrid className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Resumo Geral</span>
                            </div>
                            <p className="text-xl font-black text-slate-800 dark:text-white truncate">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rgStats.totalCost)}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">Diesel + Manutenção</p>
                        </div>
                    </div>

                {(vehicleAlerts.length > 0 || pendingServiceOrders.length > 0) && (
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white mb-3 text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" /> Agendamentos Ativos
                    </h4>
                    <div className="space-y-2">
                      {/* Arrival Alerts */}
                      {vehicleAlerts.map(alert => (
                        <div key={alert.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">{alert.targetName}</p>
                            {alert.services && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                                <Wrench className="h-3 w-3 inline mr-1" />
                                {alert.services}
                              </p>
                            )}
                            {alert.minOdometer && (
                              <p className="text-xs text-orange-500 font-bold mt-0.5">
                                <Gauge className="h-3 w-3 inline mr-1" />
                                Avisar após: {alert.minOdometer.toLocaleString()} km
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500">Raio: {alert.radius}m | Status: <span className={alert.status === 'ARRIVED' ? 'text-green-600 font-black' : 'text-orange-600'}>{alert.status}</span></p>
                          </div>
                          <div className="flex items-center gap-1">
                            {alert.status === 'PENDING' && (
                              <button 
                                onClick={() => {
                                  const base = settings?.savedPoints?.find(p => p.name === alert.targetName);
                                  if (base) handleSimulateArrival(base.id);
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Simular Chegada (Teste)"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteAlert(alert.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Pending Service Orders */}
                      {pendingServiceOrders.map(so => (
                        <div key={so.id} className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded uppercase">O.S. Pendente</span>
                              <p className="font-bold text-sm text-slate-800 dark:text-white">{so.title}</p>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 italic truncate max-w-[250px]">{so.details}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Criada em: {new Date(so.createdAt).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="p-2 text-blue-600">
                              <Wrench className="h-4 w-4" />
                            </div>
                            <button 
                              onClick={() => handleCancelServiceOrder(so.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="Cancelar O.S."
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-600" /> Pneus Montados ({tires.filter(t => t.vehicleId === selectedVehicleRG.id).length})
                    </h4>
                    <DigitalTwin 
                      vehicle={selectedVehicleRG} 
                      mountedTires={tires.filter(t => t.vehicleId === selectedVehicleRG.id)} 
                      settings={settings} 
                      vehicleTypes={vehicleTypes}
                    />
                </div>
                  </>
                )}

                {activeRGTab === 'combustivel' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" /> Histórico de Abastecimento
                      </h3>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Telemetria (Litrômetro)</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{selectedVehicleRG.litrometer ? `${selectedVehicleRG.litrometer.toLocaleString()} L` : 'N/A'}</p>
                        </div>
                        <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Média Km/L</p>
                          <p className="text-sm font-black text-blue-600">{rgStats.avgConsumptionRefueling.toFixed(2)} KM/L</p>
                        </div>
                        <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Gasto</p>
                          <p className="text-sm font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rgStats.fuelCost)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {vehicleFuelEntries.length > 0 ? (
                        vehicleFuelEntries.sort((a, b) => new Date(b.date + (b.date.includes('T') ? '' : 'T12:00:00')).getTime() - new Date(a.date + (a.date.includes('T') ? '' : 'T12:00:00')).getTime()).map(entry => (
                          <div key={entry.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                <Fuel className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800 dark:text-white">{new Date(entry.date + (entry.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{entry.stationName || 'Posto não informado'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-800 dark:text-white">{entry.liters.toLocaleString()} L</p>
                              <p className="text-[10px] font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.totalCost)}</p>
                            </div>
                            <div className="text-right ml-4 pl-4 border-l border-slate-100 dark:border-slate-800">
                              <p className="text-xs font-black text-slate-800 dark:text-white">{entry.odometer.toLocaleString()} KM</p>
                              {entry.kmPerLiter && (
                                <p className="text-[10px] font-bold text-orange-600">{entry.kmPerLiter.toFixed(2)} KM/L</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                          <Fuel className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-bold">Nenhum abastecimento registrado para este veículo.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeRGTab === 'manutencao' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Total Gasto em Manutenção</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            serviceOrders
                              .filter(so => so.vehicleId === selectedVehicleRG.id && so.status === 'CONCLUIDO')
                              .reduce((acc, so) => acc + (so.totalCost || (so.parts ? so.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0) + (so.laborCost || 0) + (so.externalServiceCost || 0)), 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Ordens Concluídas</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                          {serviceOrders.filter(so => so.vehicleId === selectedVehicleRG.id && so.status === 'CONCLUIDO').length}
                        </p>
                      </div>
                      {(() => {
                        const status = getVehicleStatus(selectedVehicleRG);
                        const boxColor = status.isMaintenanceOverdue 
                          ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' 
                          : status.isMaintenanceNear 
                            ? 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900/30'
                            : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30';
                        const textColor = status.isMaintenanceOverdue 
                          ? 'text-red-600' 
                          : status.isMaintenanceNear 
                            ? 'text-yellow-600'
                            : 'text-blue-600';
                        
                        return (
                          <div className={`p-4 rounded-2xl border ${boxColor}`}>
                            <p className={`text-[10px] font-bold uppercase mb-1 ${textColor}`}>Próxima Preventiva</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">
                              {status.kmToNextMaintenance.toLocaleString()} km
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 italic">
                              {status.isMaintenanceOverdue ? 'Manutenção Vencida!' : 'Restantes para a troca'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-600" /> Próximos Serviços (PMJ)
                        </h4>
                        {maintenanceSchedules.filter(s => s.vehicleId === selectedVehicleRG.id && s.status === 'PENDING').length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            Nenhuma manutenção programada para este veículo.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {maintenanceSchedules
                              .filter(s => s.vehicleId === selectedVehicleRG.id && s.status === 'PENDING')
                              .map(schedule => {
                                const plan = maintenancePlans.find(p => p.id === schedule.planId);
                                return (
                                  <div key={schedule.id} className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{plan?.name || 'Plano Desconhecido'}</p>
                                        {schedule.nextDueDate && (
                                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                            <Calendar className="h-3 w-3" /> Vencimento: {new Date(schedule.nextDueDate).toLocaleDateString('pt-BR')}
                                          </p>
                                        )}
                                        {schedule.nextDueKm && (
                                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                            <Gauge className="h-3 w-3" /> Troca com: {schedule.nextDueKm.toLocaleString()} km
                                          </p>
                                        )}
                                      </div>
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-100 text-orange-700">
                                        Programado
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-blue-600" /> Serviços Realizados
                          </h4>
                          {serviceOrders.filter(so => so.vehicleId === selectedVehicleRG.id && so.status === 'CONCLUIDO').length > 0 && (
                            <button 
                              onClick={handlePrintMaintenanceReport}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all border border-blue-100 dark:border-blue-800"
                            >
                              <Printer className="h-3.5 w-3.5" /> Imprimir Relatório
                            </button>
                          )}
                        </div>
                        {serviceOrders.filter(so => so.vehicleId === selectedVehicleRG.id).length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            Nenhuma ordem de serviço registrada para este veículo.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {serviceOrders
                              .filter(so => so.vehicleId === selectedVehicleRG.id)
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map(so => (
                                <div key={so.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-bold text-sm text-slate-800 dark:text-white">{so.title}</p>
                                      <p className="text-[10px] text-slate-500">{new Date(so.createdAt).toLocaleDateString('pt-BR')} • OS #{so.id.slice(-5).toUpperCase()}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                      so.status === 'CONCLUIDO' ? 'bg-green-100 text-green-700' :
                                      so.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-700' :
                                      'bg-orange-100 text-orange-700'
                                    }`}>
                                      {so.status === 'CONCLUIDO' ? 'Concluída' : so.status === 'EM_ANDAMENTO' ? 'Em Execução' : 'Pendente'}
                                    </span>
                                  </div>
                                  <div className="space-y-3 pt-2 border-t border-slate-50 dark:border-slate-700">
                                    {so.parts && so.parts.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Peças e Insumos:</p>
                                        {so.parts.map((part, idx) => (
                                          <div key={idx} className="flex justify-between text-[10px]">
                                            <span className="text-slate-600 dark:text-slate-400">{part.quantity}x {part.name}</span>
                                            <span className="font-bold text-slate-800 dark:text-white">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.unitCost * part.quantity)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <p className="text-[10px] text-slate-500 italic truncate max-w-[60%]">{so.details}</p>
                                      <p className="font-black text-sm text-slate-800 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(so.totalCost || (so.parts ? so.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0) + (so.laborCost || 0) + (so.externalServiceCost || 0))}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeRGTab === 'pneus' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">Investimento em Pneus</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            tires
                              .filter(t => t.vehicleId === selectedVehicleRG.id)
                              .reduce((acc, t) => acc + (t.totalInvestment || t.price || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                        <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Custo por KM Médio</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                          {(() => {
                            const vehicleTires = tires.filter(t => t.vehicleId === selectedVehicleRG.id);
                            let totalConsumed = 0;
                            let totalKms = 0;
                            vehicleTires.forEach(t => {
                              const investment = t.totalInvestment || t.price || 0;
                              const totalKm = t.totalKms || 0;
                              
                              if (totalKm > 0) {
                                  totalConsumed += investment;
                                  totalKms += totalKm;
                              }
                            });
                            return totalKms > 0 ? `R$ ${(totalConsumed / totalKms).toFixed(4)}` : 'R$ 0,0000';
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                          <Disc className="h-4 w-4 text-blue-600" /> Detalhes dos Pneus Atuais
                        </h4>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl overflow-x-auto no-scrollbar">
                          <button 
                            onClick={() => setSelectedAxle('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${selectedAxle === 'ALL' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Todos
                          </button>
                          {Array.from({ length: selectedVehicleRG.axles || 0 }).map((_, i) => (
                            <button 
                              key={i}
                              onClick={() => setSelectedAxle(i + 1)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${selectedAxle === i + 1 ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                              Eixo {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {(() => {
                          const vehicleTires = tires.filter(t => t.vehicleId === selectedVehicleRG.id);
                          const filteredTires = selectedAxle === 'ALL' 
                            ? vehicleTires 
                            : vehicleTires.filter(t => t.position?.startsWith(selectedAxle.toString()));

                          if (filteredTires.length === 0) {
                            return (
                              <p className="text-xs text-slate-400 text-center py-8 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                {selectedAxle === 'ALL' ? 'Nenhum pneu montado neste veículo.' : `Nenhum pneu montado no Eixo ${selectedAxle}.`}
                              </p>
                            );
                          }

                          return filteredTires.map(tire => (
                            <div key={tire.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                                <Disc className="h-6 w-6 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-black text-slate-800 dark:text-white">#{tire.fireNumber}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{tire.brand} {tire.model}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-black text-blue-600">{tire.currentTreadDepth}mm</p>
                                    <p className="text-[9px] text-slate-400">Sulco Atual</p>
                                  </div>
                                </div>
                                <div className="mt-2 grid grid-cols-4 gap-2 border-t border-slate-50 dark:border-slate-700 pt-2">
                                  <div>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold">Posição</p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{tire.position}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold">KM Rodado</p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{((tire.totalKms || 0) + (tire.installOdometer ? Math.max(0, selectedVehicleRG.odometer - tire.installOdometer) : 0)).toLocaleString()} km</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold">Recapagens</p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{tire.retreadCount}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] text-slate-400 uppercase font-bold">CPK</p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                      R$ {((((tire.totalKms || 0) + (tire.installOdometer ? Math.max(0, selectedVehicleRG.odometer - tire.installOdometer) : 0))) > 0 ? (Number(tire.totalInvestment || tire.price || 0) / ((tire.totalKms || 0) + (tire.installOdometer ? Math.max(0, selectedVehicleRG.odometer - tire.installOdometer) : 0))) : 0).toFixed(4)}
                                    </p>
                                  </div>
                                </div>
                                
                                {tire.history && tire.history.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Histórico Recente:</p>
                                    <div className="space-y-1.5">
                                      {tire.history.slice(-3).reverse().map((log, idx) => (
                                        <div key={idx} className="flex gap-2 items-start text-[9px]">
                                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-700 dark:text-slate-300 leading-none">{new Date(log.date + (log.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')} - {log.action}</p>
                                            <p className="text-slate-500 italic truncate">{log.details}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
      
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" /> 
                {editingId ? 'Editar Veículo' : 'Novo Veículo'}
              </h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Branch Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Propriedade</label>
                  <select
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                    value={formData.ownership || 'OWNED'}
                    onChange={e => setFormData({ ...formData, ownership: e.target.value as any })}
                  >
                    <option value="OWNED">Próprio</option>
                    <option value="LEASED">Locado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Filial de Serviço (Opcional)</label>
                  <select
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold"
                    value={formData.branchId || ''}
                    onChange={e => setFormData({ ...formData, branchId: e.target.value || undefined })}
                  >
                    <option value="">Nenhuma Filial</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">PLACA</label>
                  <input required type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold" value={formData.plate || ''} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">TIPO</label>
                  <select 
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="">Selecione o tipo</option>
                    {vehicleTypes.map(vt => (
                      <option key={vt.id} value={vt.name}>{vt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MARCA / MODELO</label>
                  <select
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                    value={formData.brandModelId || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedBM = vehicleBrandModels.find(bm => bm.id === selectedId);
                      setFormData({
                        ...formData,
                        brandModelId: selectedId,
                        brand: selectedBM?.brand || '',
                        model: selectedBM?.model || '',
                        axles: selectedBM?.axles || formData.axles,
                        revisionIntervalKm: (selectedBM?.oilChangeInterval && selectedBM.oilChangeInterval > 0) 
                          ? selectedBM.oilChangeInterval 
                          : formData.revisionIntervalKm,
                        oilLiters: (selectedBM?.oilLiters && selectedBM.oilLiters > 0)
                          ? selectedBM.oilLiters
                          : formData.oilLiters,
                        fuelType: selectedBM?.fuelType || formData.fuelType
                      });
                    }}
                  >
                    <option value="">Selecione uma Marca/Modelo</option>
                    {vehicleBrandModels.map(bm => (
                      <option key={bm.id} value={bm.id}>
                        {bm.brand} - {bm.model} ({bm.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">EIXOS</label>
                  <input type="number" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.axles ?? 3} onChange={e => setFormData({...formData, axles: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">HODÔMETRO</label>
                  <input type="number" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.odometer ?? 0} onChange={e => setFormData({...formData, odometer: Number(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">ANO</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.year || ''} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="Ex: 2022" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">COR</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.color || ''} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="Ex: Branco" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">FROTA #</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.fleetNumber || ''} onChange={e => setFormData({...formData, fleetNumber: e.target.value})} placeholder="Ex: 1020" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">RENAVAM</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.renavam || ''} onChange={e => setFormData({...formData, renavam: e.target.value})} placeholder="Renavam" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">CHASSI (VIN)</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.vin || ''} onChange={e => setFormData({...formData, vin: e.target.value})} placeholder="Número do Chassi" />
                </div>
              </div>
              {!isCarreta && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MOTOR</label>
                    <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.engine || ''} onChange={e => setFormData({...formData, engine: e.target.value})} placeholder="Ex: D13" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">CÂMBIO</label>
                    <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.transmission || ''} onChange={e => setFormData({...formData, transmission: e.target.value})} placeholder="Ex: I-Shift" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {!isCarreta && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">COMBUSTÍVEL</label>
                    <select 
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                      value={formData.fuelType || ''} 
                      onChange={e => setFormData({...formData, fuelType: e.target.value})}
                    >
                      <option value="">Selecione o combustível</option>
                      {fuelTypes.map(ft => (
                        <option key={ft.id} value={ft.name}>{ft.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={isCarreta ? "col-span-2" : ""}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">CÓD. SASCAR (Opcional)</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.sascarCode || ''} onChange={e => setFormData({...formData, sascarCode: e.target.value})} placeholder="ID Sascar" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MARCA PNEU PADRÃO</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.tiresBrand || ''} onChange={e => setFormData({...formData, tiresBrand: e.target.value})} placeholder="Ex: Michelin" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">MEDIDA PNEU PADRÃO</label>
                  <input type="text" className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.tiresSize || ''} onChange={e => setFormData({...formData, tiresSize: e.target.value})} placeholder="Ex: 295/80 R22.5" />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50 space-y-4">
                <h4 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Parâmetros de Manutenção
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className={isCarreta ? "col-span-2" : ""}>
                    <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">KM DE REVISÃO (INTERVALO)</label>
                    <input type="number" className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" value={formData.revisionIntervalKm ?? 10000} onChange={e => setFormData({...formData, revisionIntervalKm: Number(e.target.value)})} />
                  </div>
                  {!isCarreta && (
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">QTD LITROS ÓLEO</label>
                      <input type="number" className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" value={formData.oilLiters ?? 0} onChange={e => setFormData({...formData, oilLiters: Number(e.target.value)})} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">KM ÚLTIMA PREVENTIVA</label>
                    <input type="number" className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.lastPreventiveKm ?? 0} onChange={e => setFormData({...formData, lastPreventiveKm: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">DATA ÚLTIMA PREVENTIVA</label>
                    <input type="date" className="w-full p-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white" value={formData.lastPreventiveDate || ''} onChange={e => setFormData({...formData, lastPreventiveDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all">{isSaving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isManagingBrandModels && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                <Settings className="h-6 w-6 text-blue-600" /> 
                Gerenciar Marcas e Modelos
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsAddingBrand(true);
                    setBrandModelFormData({ brand: '', model: '', type: 'CAVALO', axles: 3 });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
                >
                  <Plus className="h-4 w-4" /> Nova Marca
                </button>
                <button onClick={() => setIsManagingBrandModels(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Brands Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from(new Set(vehicleBrandModels.map(bm => bm.brand))).sort().map(brand => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className="group bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-md transition-all text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-black text-slate-800 dark:text-white text-base uppercase truncate">{brand}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {vehicleBrandModels.filter(bm => bm.brand === brand).length} Modelos
                    </p>
                  </button>
                ))}
              </div>

              {vehicleBrandModels.length === 0 && (
                <div className="text-center py-20">
                  <LayoutGrid className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma marca cadastrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Models Modal */}
      {selectedBrand && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-white uppercase flex items-center gap-2">
                  <Truck className="h-6 w-6 text-blue-600" /> {selectedBrand}
                </h3>
                <p className="text-xs text-slate-500">Modelos cadastrados</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsAddingModel(true);
                    setEditingBrandModelId(null);
                    setBrandModelFormData({ brand: selectedBrand, model: '', type: 'CAVALO', axles: 3 });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="h-3 w-3" /> Novo Modelo
                </button>
                <button onClick={() => setSelectedBrand(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {vehicleBrandModels.filter(bm => bm.brand === selectedBrand).map(bm => (
                  <div key={bm.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl group">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{bm.model}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">{bm.type} • {bm.axles} Eixos</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setIsAddingModel(true);
                          setEditingBrandModelId(bm.id);
                          setBrandModelFormData({ brand: bm.brand, model: bm.model, type: bm.type, axles: bm.axles, maintenancePlanId: bm.maintenancePlanId });
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <PenLine className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteBrandModel(bm.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal (Brand or Model) */}
      {(isAddingBrand || isAddingModel) && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">
                {isAddingBrand ? 'Nova Marca' : (editingBrandModelId ? 'Editar Modelo' : 'Novo Modelo')}
              </h3>
              <button onClick={() => { setIsAddingBrand(false); setIsAddingModel(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveBrandModel} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">MARCA</label>
                  <input 
                    required 
                    readOnly={isAddingModel}
                    type="text" 
                    className={`w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold ${isAddingModel ? 'opacity-60 cursor-not-allowed' : ''}`} 
                    value={brandModelFormData.brand} 
                    onChange={e => setBrandModelFormData({...brandModelFormData, brand: e.target.value.toUpperCase()})} 
                    placeholder="Ex: VOLVO"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">MODELO</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white uppercase font-bold" 
                    value={brandModelFormData.model} 
                    onChange={e => setBrandModelFormData({...brandModelFormData, model: e.target.value.toUpperCase()})} 
                    placeholder="Ex: FH 540"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">TIPO</label>
                  <select 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                    value={brandModelFormData.type} 
                    onChange={e => setBrandModelFormData({...brandModelFormData, type: e.target.value})}
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
                    value={brandModelFormData.axles} 
                    onChange={e => setBrandModelFormData({...brandModelFormData, axles: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 tracking-wider">PLANO DE MANUTENÇÃO (PMJ)</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold" 
                  value={brandModelFormData.maintenancePlanId || ''} 
                  onChange={e => setBrandModelFormData({...brandModelFormData, maintenancePlanId: e.target.value})}
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
                  {editingBrandModelId ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
