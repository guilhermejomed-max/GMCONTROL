
import React, { useState, useMemo, useEffect } from 'react';
import { Tire, Vehicle, ServiceOrder, RetreadOrder, TireStatus } from '../types';
import { FileText, Filter, Printer, Columns, Calendar, Search, Check, FileBarChart, RefreshCw, AlertCircle } from 'lucide-react';

interface ReportsHubProps {
  tires: Tire[];
  vehicles: Vehicle[];
  serviceOrders: ServiceOrder[];
  retreadOrders: RetreadOrder[];
  vehicleBrandModels?: any[];
}

type ReportSource = 'TIRES' | 'VEHICLES' | 'MOVEMENTS' | 'COSTS' | 'SUMMARY' | 'MAINTENANCE' | 'BRAND_MODELS';

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
      { id: 'model', label: 'Modelo', accessor: (v: Vehicle) => v.model },
      { id: 'type', label: 'Tipo', accessor: (v: Vehicle) => v.type },
      { id: 'odometer', label: 'Hodômetro', accessor: (v: Vehicle) => v.odometer?.toLocaleString() || '0' },
      { id: 'tireCount', label: 'Qtd Pneus', accessor: (v: Vehicle, ctx: any) => ctx.tires?.filter((t: Tire) => t.vehicleId === v.id).length || 0 },
      { id: 'location', label: 'Última Loc.', accessor: (v: Vehicle) => v.lastLocation?.city || '-' },
      { id: 'lastUpdate', label: 'Atualização', accessor: (v: Vehicle) => formatDate(v.lastLocation?.updatedAt || '') },
    ],
    MAINTENANCE: [
      { id: 'date', label: 'Data', accessor: (o: ServiceOrder) => formatDate(o.createdAt) },
      { id: 'vehicle', label: 'Veículo', accessor: (o: ServiceOrder, ctx: any) => ctx.vehicles?.find((v: Vehicle) => v.id === o.vehicleId)?.plate || '-' },
      { id: 'title', label: 'Serviço', accessor: (o: ServiceOrder) => o.title },
      { id: 'status', label: 'Status', accessor: (o: ServiceOrder) => o.status },
      { id: 'cost', label: 'Custo Total', accessor: (o: ServiceOrder) => o.totalCost || (o.parts ? o.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0), format: money },
      { id: 'mechanic', label: 'Mecânico', accessor: (o: ServiceOrder) => o.completedBy || '-' },
    ],
    MOVEMENTS: [
      { id: 'date', label: 'Data', accessor: (log: any) => formatDate(log.date) },
      { id: 'tire', label: 'Pneu', accessor: (log: any, ctx: any) => ctx.tires?.find((t: Tire) => t.id === log.tireId)?.fireNumber || (log.details?.match(/Pneu ([0-9A-Z]+)/)?.[1] || 'N/D') },
      { id: 'action', label: 'Ação', accessor: (log: any) => log.action },
      { id: 'details', label: 'Detalhes', accessor: (log: any) => log.details },
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
    ]
};

export const ReportsHub: React.FC<ReportsHubProps> = ({ tires = [], vehicles = [], serviceOrders = [], retreadOrders = [], vehicleBrandModels = [] }) => {
  const [source, setSource] = useState<ReportSource>('VEHICLES');
  
  // Inicializa com as colunas padrão
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
      COLUMN_DEFINITIONS['VEHICLES'].slice(0, 8).map(c => c.id)
  );
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');

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
  };

  // --- HANDLER PARA TROCA DE FONTE ---
  // Atualiza a fonte e as colunas simultaneamente para evitar renderização vazia
  const handleSourceChange = (newSource: ReportSource) => {
      setSource(newSource);
      // Seleciona automaticamente as primeiras 8 colunas da nova fonte
      const defaultCols = COLUMN_DEFINITIONS[newSource].slice(0, 8).map(c => c.id);
      setSelectedColumns(defaultCols);
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
      rawData = [...serviceOrders];
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
        value: o.totalCost || (o.items ? o.items.reduce((sum, i) => sum + (i.cost || 0), 0) : 0),
        desc: `Ordem #${o.orderNumber}`
      }));

      const services = serviceOrders.filter(o => o.status === 'CONCLUIDO').map(o => ({
        date: o.completedAt || o.createdAt,
        type: 'MANUTENÇÃO',
        ref: o.vehiclePlate,
        value: o.totalCost || (o.parts ? o.parts.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) : 0), 
        desc: o.title
      }));

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
    return rawData.filter(item => {
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
        return str.includes(search);
      }

      return true;
    });
  }, [source, tires, vehicles, serviceOrders, retreadOrders, startDate, endDate, searchText]);

  // --- FUNÇÕES DE INTERFACE ---
  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
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
      <html>
        <head>
          <title>Relatório Personalizado - GM Control</title>
          <style>
            body { font-family: sans-serif; font-size: 10px; color: #333; }
            h1 { font-size: 16px; margin-bottom: 5px; text-transform: uppercase; color: #0f172a; }
            .meta { font-size: 9px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f1f5f9; text-align: left; padding: 6px; border-bottom: 1px solid #ccc; font-size: 9px; text-transform: uppercase; }
            td { padding: 6px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) { background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>Relatório: ${source === 'TIRES' ? 'Inventário de Pneus' : source === 'VEHICLES' ? 'Frota de Veículos' : source === 'MAINTENANCE' ? 'Manutenção' : source === 'COSTS' ? 'Financeiro Completo' : 'Histórico de Movimentação'}</h1>
          <div class="meta">Gerado em ${new Date().toLocaleString()} • ${reportData.length} registros</div>
          <table>
            <thead>
              <tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
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
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <FileBarChart className="h-7 w-7 text-indigo-600"/> Gerador de Relatórios
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monte tabelas dinâmicas cruzando informações do sistema.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setStartDate(''); setEndDate(''); setSearchText(''); }} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm">
            <RefreshCw className="h-4 w-4" /> Limpar
          </button>
          <button onClick={handlePrint} disabled={reportData.length === 0} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all text-sm disabled:opacity-50">
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        
        {/* SIDEBAR DE CONFIGURAÇÃO */}
        <div className="w-full lg:w-80 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-y-auto custom-scrollbar flex-shrink-0">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Filter className="h-4 w-4"/> Configuração</h3>
          </div>
          
          <div className="p-5 space-y-6">
            {/* FONTE DE DADOS */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">1. Fonte de Dados</label>
              <select 
                value={source} 
                onChange={(e) => handleSourceChange(e.target.value as ReportSource)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VEHICLES">Frota e KM</option>
                <option value="BRAND_MODELS">Marcas e Modelos</option>
                <option value="MAINTENANCE">Manutenção</option>
              </select>
            </div>

            {/* FILTROS */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">2. Filtros</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                    <button onClick={() => setDateRange('WEEK')} className="flex-1 p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold">Última Semana</button>
                    <button onClick={() => setDateRange('MONTH')} className="flex-1 p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold">Último Mês</button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                  <input 
                    type="text" 
                    placeholder="Busca textual..." 
                    className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block">De</label>
                    <input type="date" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block">Até</label>
                    <input type="date" className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* SELEÇÃO DE COLUNAS */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>3. Colunas Visíveis</span>
                <span className="text-indigo-500">{selectedColumns.length} sel.</span>
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {COLUMN_DEFINITIONS[source].map(col => (
                  <label key={col.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${selectedColumns.includes(col.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'}`}>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedColumns.includes(col.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                      {selectedColumns.includes(col.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className={`text-xs font-bold ${selectedColumns.includes(col.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>{col.label}</span>
                    <input type="checkbox" className="hidden" checked={selectedColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO (TABELA) */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-slate-400"/>
                <span className="text-xs font-bold text-slate-500 uppercase">Pré-visualização</span>
             </div>
             <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-600 dark:text-slate-400">{reportData.length} registros</span>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar p-4 relative">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase font-bold sticky top-0 z-10">
                  <tr>
                    {colsToRender.length > 0 ? colsToRender.map(c => (
                      <th key={c.id} className="p-3 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap">{c.label}</th>
                    )) : (
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Nenhuma coluna selecionada</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {reportData.length === 0 ? (
                    <tr>
                        <td colSpan={Math.max(colsToRender.length, 1)} className="p-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center opacity-60">
                                <AlertCircle className="h-10 w-10 mb-2"/>
                                <span>Nenhum dado encontrado para os filtros atuais.</span>
                            </div>
                        </td>
                    </tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {colsToRender.length > 0 ? colsToRender.map(c => {
                          const val = c.accessor(row, renderContext);
                          return (
                            <td key={c.id} className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {c.format ? c.format(val) : (val !== undefined && val !== null ? val : '-')}
                            </td>
                          );
                        }) : (
                            <td className="p-3 text-center text-slate-400">-</td>
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
  );
};
