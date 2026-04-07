import React, { useState } from 'react';
import { Upload, FileUp, AlertTriangle, Check, Loader2, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FuelEntry, Vehicle, Branch, FuelStation } from '../types';

interface ImportModalProps {
  onClose: () => void;
  onImport: (entries: FuelEntry[]) => Promise<void>;
  vehicles: Vehicle[];
  branches: Branch[];
  fuelStations: FuelStation[];
}

const CloseIconComp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const FuelImportModal: React.FC<ImportModalProps> = React.memo(({ onClose, onImport, vehicles, branches, fuelStations }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: FuelEntry[], errors: string[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processExcelData(data);
      } catch (err) {
        console.error("Error reading Excel file:", err);
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processExcelData = (data: any[]) => {
    const entries: FuelEntry[] = [];
    const errors: string[] = [];

    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (val === undefined || val === null || val === '') return 0;
      const str = String(val).replace(/R\$/g, '').replace(/\s/g, '').trim();
      
      if (str.includes(',')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
      }
      
      const parsed = parseFloat(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    const parseDate = (val: any): string => {
      if (!val) return new Date().toISOString().split('T')[0];
      
      // If it's a JS Date object (from cellDates: true)
      if (val instanceof Date) {
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, '0');
        const day = String(val.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // If it's a number (Excel serial date)
      if (typeof val === 'number') {
        // Excel dates are days since 1899-12-30
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }

      const str = String(val).trim();
      if (!str) return new Date().toISOString().split('T')[0];

      // Handle DD/MM/YYYY
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return `${year}-${month}-${day}`;
        }
      }

      // Handle YYYY-MM-DD or DD-MM-YYYY
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) return str.split('T')[0];
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return `${year}-${month}-${day}`;
        }
      }

      return str;
    };

    data.forEach((row: any, i) => {
      const normalizedRow: any = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.trim().toUpperCase()] = row[key];
      });

      const dateStr = parseDate(normalizedRow['DATA']);
      const plate = String(normalizedRow['PLACA'] || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const cnpj = String(normalizedRow['CNPJ'] || normalizedRow['CPNJ'] || '');
      
      const liters = parseNum(normalizedRow['QUANTIDADE DE LT ABASTECIDO'] || normalizedRow['LITROS'] || normalizedRow['QUANTIDADE'] || normalizedRow['QTD']);
      const rawValor = parseNum(normalizedRow['VALOR'] || normalizedRow['VALOR TOTAL'] || normalizedRow['TOTAL'] || normalizedRow['VALOR PAGO']);
      const rawUnitPrice = parseNum(normalizedRow['PREÇO UNITÁRIO'] || normalizedRow['VALOR UNITÁRIO'] || normalizedRow['UNITÁRIO'] || normalizedRow['PREÇO']);
      
      const odometer = parseNum(normalizedRow['KM ATUAL'] || normalizedRow['ODOMETRO'] || normalizedRow['KM']);
      const lastOdo = parseNum(normalizedRow['ULTIMO KM'] || normalizedRow['KM ANTERIOR']);
      const kmDriven = parseNum(normalizedRow['KM RODADO'] || normalizedRow['DISTANCIA']);
      
      const vehicle = vehicles.find(v => v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === plate);
      const branch = branches.find(b => b.cnpj.replace(/\D/g, '') === cnpj?.replace(/\D/g, ''));

      if (!plate) {
        errors.push(`Linha ${i + 2}: Placa não informada.`);
        return;
      }

      if (!vehicle) {
        errors.push(`Linha ${i + 2}: Veículo com placa ${plate} não encontrado.`);
        return;
      }

      let finalOdometer = odometer;
      if ((!finalOdometer || finalOdometer === 0) && lastOdo > 0 && kmDriven > 0) {
        finalOdometer = lastOdo + kmDriven;
      }

      let totalCost = 0;
      let unitPrice = 0;

      if (rawValor > 0 && rawUnitPrice > 0) {
        totalCost = rawValor;
        unitPrice = rawUnitPrice;
      } else if (rawValor > 0) {
        if (rawValor < 20 && liters > 50) {
          unitPrice = rawValor;
          totalCost = liters * unitPrice;
        } else {
          totalCost = rawValor;
          unitPrice = liters > 0 ? totalCost / liters : 0;
        }
      } else if (rawUnitPrice > 0 && liters > 0) {
        unitPrice = rawUnitPrice;
        totalCost = liters * unitPrice;
      }

      const station = fuelStations.find(s => s.cnpj.replace(/\D/g, '') === cnpj.replace(/\D/g, ''));

      entries.push({
        id: `import-${Date.now()}-${i}`,
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.plate,
        date: dateStr || new Date().toISOString().split('T')[0],
        odometer: finalOdometer,
        liters: liters,
        unitPrice: unitPrice,
        totalCost: totalCost,
        fuelType: String(normalizedRow['COMBUSTÍVEL'] || normalizedRow['TIPO'] || 'DIESEL S10').toUpperCase(),
        stationName: station ? station.name : String(normalizedRow['POSTO'] || normalizedRow['NOME DO POSTO'] || ''),
        stationCnpj: cnpj,
        branchId: branch?.id || vehicle.branchId,
        driverName: String(normalizedRow['MOTORISTA'] || normalizedRow['NOME'] || '')
      });
    });

    setResults({ success: entries, errors });
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="p-6 sm:p-10 pb-4 sm:pb-6 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                  Importar Abastecimentos
                </h2>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest mt-1">
                  IMPORTAÇÃO EM MASSA VIA ARQUIVO EXCEL (.XLSX, .XLS)
                </p>
              </div>
            </div>
            <Zap className="h-6 w-6 text-slate-300 dark:text-slate-700" />
          </div>
        </div>

        <div className="px-4 sm:px-10 pb-6 sm:pb-10 overflow-y-auto custom-scrollbar flex-1">
          {!results ? (
            <div className="space-y-6 sm:space-y-8">
              {/* Columns Info Box */}
              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <FileUp className="h-5 w-5 text-blue-600" />
                  <h4 className="text-sm font-black text-blue-600 uppercase tracking-wider">Colunas Esperadas no Excel:</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['DATA', 'PLACA', 'CNPJ', 'QUANTIDADE DE LT ABASTECIDO', 'VALOR', 'ULTIMO KM', 'KM ATUAL', 'KM RODADO'].map(col => (
                    <div key={col} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-blue-50 dark:border-slate-700 text-center">
                      <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase">{col}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-blue-400 mt-6 italic">
                  * O sistema identificará automaticamente as colunas pelo nome no cabeçalho.
                </p>
              </div>

              {/* Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center py-10 sm:py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] sm:rounded-[3rem] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                
                <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <FileUp className="h-12 w-12 text-blue-600" />
                </div>
                
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Clique para selecionar o arquivo Excel</h3>
                <p className="text-slate-400 font-bold text-sm">Suporta formatos .xlsx e .xls</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {results.errors.length > 0 && (
                <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-3xl">
                  <h4 className="text-xs font-black text-red-600 uppercase flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5" /> Erros Encontrados ({results.errors.length})
                  </h4>
                  <ul className="text-[11px] text-red-500 font-bold space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {results.errors.map((err, idx) => <li key={idx} className="flex gap-2"><span>•</span> {err}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-500" /> Registros Válidos ({results.success.length})
                </h4>
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-3xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Data</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Placa</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Litros</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Total</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Posto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {results.success.slice(0, 10).map((e, idx) => (
                        <tr key={idx} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 font-bold text-slate-600 dark:text-slate-400">{e.date}</td>
                          <td className="p-4 font-black text-slate-800 dark:text-white">{e.vehiclePlate}</td>
                          <td className="p-4 font-bold text-slate-600 dark:text-slate-400">{e.liters.toLocaleString()}L</td>
                          <td className="p-4 font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.totalCost)}</td>
                          <td className="p-4 font-medium text-slate-500">{e.stationName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-10 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 sm:py-4 text-slate-500 font-black text-sm hover:text-slate-800 dark:hover:text-slate-200 transition-all uppercase tracking-widest"
          >
            CANCELAR
          </button>
          
          <button 
            onClick={() => results ? onImport(results.success) : fileInputRef.current?.click()}
            disabled={isProcessing || (results && results.success.length === 0)}
            className={`w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl ${
              results 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-none'
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : results ? (
              <Check className="h-5 w-5" />
            ) : null}
            {isProcessing 
              ? 'PROCESSANDO...' 
              : results 
                ? `CONFIRMAR IMPORTAÇÃO (${results.success.length})` 
                : 'SELECIONE UM ARQUIVO PARA INICIAR O PROCESSAMENTO'}
          </button>
        </div>
      </div>
    </div>
  );
});
