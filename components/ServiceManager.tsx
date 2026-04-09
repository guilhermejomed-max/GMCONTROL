
import React, { useState, useEffect, useMemo, FC } from 'react';
import { StockItem, StockMovement, UserLevel } from '../types';
import { storageService } from '../services/storageService';
import { Package, Search, Plus, ArrowUpCircle, ArrowDownCircle, History, Save, X, PenLine, ChevronRight, AlertCircle, CheckCircle2, ScanLine, Trash2, LayoutDashboard, TrendingUp, AlertTriangle, DollarSign, BarChart3, PieChart as PieIcon, Printer, ClipboardList, RotateCcw, CheckSquare } from 'lucide-react';
import { Scanner } from './Scanner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

interface ServiceManagerProps {
  orgId: string;
  userLevel: UserLevel;
}

export const ServiceManager: FC<ServiceManagerProps> = ({ orgId, userLevel }) => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STOCK' | 'MOVEMENTS' | 'AUDIT'>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('EXIT');
  const [itemFormData, setItemFormData] = useState<Partial<StockItem>>({ name: '', code: '', category: 'PECA', quantity: 0, minQuantity: 5, unit: 'UN', averageCost: 0 });
  const [movementFormData, setMovementFormData] = useState({ quantity: 1, unitCost: 0, notes: '', user: 'Sistema' });

  // Audit State
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>({});
  const [auditFilter, setAuditFilter] = useState('');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  useEffect(() => {
    const unsubStock = storageService.subscribeToStock(orgId, setItems);
    const unsubMovements = storageService.subscribeToStockMovements(orgId, setMovements);
    return () => {
      unsubStock();
      unsubMovements();
    };
  }, []);

  const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm]);

  // --- DASHBOARD STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.averageCost), 0);
    const lowStockCount = items.filter(i => i.quantity <= i.minQuantity).length;
    const totalItemsCount = items.length;
    
    // Category Distribution
    const categoryCount: Record<string, number> = {};
    items.forEach(i => { categoryCount[i.category] = (categoryCount[i.category] || 0) + 1; });
    const categoryData = Object.keys(categoryCount).map(k => ({ name: k, value: categoryCount[k] }));

    // Top Value Items
    const topValueItems = [...items]
        .sort((a,b) => (b.quantity * b.averageCost) - (a.quantity * a.averageCost))
        .slice(0, 5)
        .map(i => ({ name: i.name, value: i.quantity * i.averageCost }));

    // Movement Trends (Last 6 Months)
    const movementsByMonth: Record<string, { entry: number, exit: number }> = {};
    const today = new Date();
    for(let i=5; i>=0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('pt-BR', { month: 'short' });
        movementsByMonth[key] = { entry: 0, exit: 0 };
    }

    movements.forEach(m => {
        const d = new Date(m.date + (m.date.includes('T') ? '' : 'T12:00:00'));
        const key = d.toLocaleString('pt-BR', { month: 'short' });
        if (movementsByMonth[key]) {
            if (m.type === 'ENTRY') movementsByMonth[key].entry += m.totalValue;
            else movementsByMonth[key].exit += m.totalValue;
        }
    });

    const trendData = Object.keys(movementsByMonth).map(k => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        Entrada: movementsByMonth[k].entry,
        Saida: movementsByMonth[k].exit
    }));

    return { totalValue, lowStockCount, totalItemsCount, categoryData, topValueItems, trendData };
  }, [items, movements]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleOpenItemModal = (item?: StockItem) => {
    if (item) {
      setEditingItem(item);
      setItemFormData(item);
    } else {
      setEditingItem(null);
      setItemFormData({ name: '', code: '', category: 'PECA', quantity: 0, minQuantity: 5, unit: 'UN', averageCost: 0 });
    }
    setIsItemModalOpen(true);
  };

  const handleScanSuccess = (code: string) => {
    setScannedCode(code);
    setIsScannerOpen(false);
    
    const existingItem = items.find(i => i.code === code);
    if (existingItem) {
      handleOpenMovement(existingItem, 'ENTRY');
    } else {
      setEditingItem(null);
      setItemFormData({ 
        name: '', 
        code: code, 
        category: 'PECA', 
        quantity: 0, 
        minQuantity: 5, 
        unit: 'UN', 
        averageCost: 0 
      });
      setIsItemModalOpen(true);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await storageService.updateStockItem(orgId, { ...editingItem, ...itemFormData } as StockItem);
      } else {
        const newItem: StockItem = { id: Date.now().toString(), updatedAt: new Date().toISOString(), ...itemFormData as any };
        await storageService.addStockItem(orgId, newItem);
      }
      setIsItemModalOpen(false);
    } catch (err) {
      alert("Erro ao salvar item.");
    }
  };

  const handleOpenMovement = (item: StockItem, type: 'ENTRY' | 'EXIT') => {
    setSelectedItemForMovement(item);
    setMovementType(type);
    setMovementFormData({ quantity: 1, unitCost: item.averageCost || 0, notes: '', user: 'Usuário' });
    setIsMovementModalOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMovement) return;
    try {
      const movement: StockMovement = {
        id: Date.now().toString(),
        itemId: selectedItemForMovement.id,
        itemName: selectedItemForMovement.name,
        type: movementType,
        date: new Date().toISOString(),
        quantity: Number(movementFormData.quantity),
        unitCost: Number(movementFormData.unitCost),
        totalValue: Number(movementFormData.quantity) * Number(movementFormData.unitCost),
        user: movementFormData.user,
        notes: movementFormData.notes
      };
      await storageService.registerStockMovement(orgId, movement);
      setIsMovementModalOpen(false);
    } catch (err) {
      alert("Erro ao registrar movimentação.");
    }
  };

  const handlePrintStockReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Habilite popups para gerar o relatório.");
      return;
    }

    // Group items by category
    const categories = ['PECA', 'FILTRO', 'OLEO', 'FERRAMENTA', 'EPI', 'OUTROS'];
    const groupedItems: Record<string, StockItem[]> = {};
    const categoryStats: Record<string, { count: number, value: number }> = {};

    categories.forEach(cat => {
        groupedItems[cat] = filteredItems.filter(i => i.category === cat).sort((a,b) => a.name.localeCompare(b.name));
        const count = groupedItems[cat].length;
        const value = groupedItems[cat].reduce((acc, i) => acc + (i.quantity * i.averageCost), 0);
        categoryStats[cat] = { count, value };
    });

    // Calculate critical items
    const criticalItems = filteredItems
        .filter(i => i.quantity <= i.minQuantity)
        .sort((a, b) => {
            if (a.quantity === 0 && b.quantity !== 0) return -1;
            if (a.quantity !== 0 && b.quantity === 0) return 1;
            return a.name.localeCompare(b.name);
        });

    const totalValue = filteredItems.reduce((acc, i) => acc + (i.quantity * i.averageCost), 0);
    const totalItems = filteredItems.length;
    const criticalCount = criticalItems.length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventário Oficial - GM Control</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            font-size: 10px; 
            color: #1e293b; 
            margin: 0; 
            padding: 0; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          
          /* HEADER */
          .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 15px; border-bottom: 2px solid #0f172a; margin-bottom: 20px; }
          .logo-box { display: flex; flex-direction: column; }
          .logo-text { font-size: 24px; font-weight: 900; color: #ea580c; letter-spacing: -1px; line-height: 1; text-transform: uppercase; font-style: italic; }
          .logo-text span { color: #0f172a; }
          .report-info { text-align: right; }
          .report-title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
          .report-meta { font-size: 9px; color: #64748b; margin-top: 4px; }

          /* SCORECARD */
          .scorecard { display: flex; gap: 15px; margin-bottom: 25px; }
          .card { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc; }
          .card-title { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.5px; }
          .card-value { font-size: 16px; font-weight: 800; color: #0f172a; }
          .card.critical { background: #fef2f2; border-color: #fecaca; }
          .card.critical .card-value { color: #dc2626; }

          /* TABLES */
          .section-title { 
            font-size: 11px; 
            font-weight: 800; 
            text-transform: uppercase; 
            background: #0f172a; 
            color: white; 
            padding: 6px 10px; 
            margin-top: 20px; 
            border-radius: 4px 4px 0 0;
            display: flex;
            justify-content: space-between;
          }
          table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-bottom: 20px; page-break-inside: auto; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 8px; padding: 8px 6px; text-align: left; border-bottom: 1px solid #cbd5e1; }
          td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          
          /* COLUMNS */
          .col-code { font-family: 'Courier New', monospace; font-weight: 700; width: 70px; }
          .col-center { text-align: center; }
          .col-right { text-align: right; }
          
          /* STATUS BADGES */
          .badge { font-size: 7px; font-weight: 800; padding: 2px 5px; border-radius: 3px; text-transform: uppercase; display: inline-block; }
          .b-ok { background: #dcfce7; color: #166534; }
          .b-low { background: #fee2e2; color: #991b1b; }

          /* REPLENISHMENT SECTION */
          .alert-box { border: 2px solid #dc2626; border-radius: 6px; margin-top: 30px; overflow: hidden; page-break-inside: avoid; }
          .alert-header { background: #dc2626; color: white; font-weight: 800; padding: 8px 12px; font-size: 11px; text-transform: uppercase; }
          
          /* FOOTER */
          .footer { margin-top: 40px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
          .sig-line { width: 30%; border-top: 1px solid #0f172a; padding-top: 5px; text-align: center; font-weight: 600; font-size: 9px; color: #0f172a; }
        </style>
      </head>
      <body>
        <!-- HEADER -->
        <div class="header">
          <div class="logo-box">
            <div class="logo-text">GM<span>CONTROL</span></div>
            <div style="font-size: 9px; font-weight: 600; color: #64748b; letter-spacing: 2px;">GESTÃO INTELIGENTE</div>
          </div>
          <div class="report-info">
            <div class="report-title">Relatório de Estoque Físico</div>
            <div class="report-meta">
               Data: ${new Date().toLocaleDateString()} &bull; Hora: ${new Date().toLocaleTimeString()}<br>
               Responsável: ${userLevel === 'SENIOR' ? 'Administrador' : 'Almoxarife'}
            </div>
          </div>
        </div>

        <!-- KPI SCORECARD -->
        <div class="scorecard">
           <div class="card">
              <div class="card-title">Valor Total (BRL)</div>
              <div class="card-value">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</div>
           </div>
           <div class="card">
              <div class="card-title">Total de Itens (SKU)</div>
              <div class="card-value">${totalItems}</div>
           </div>
           <div class="card critical">
              <div class="card-title">Abaixo do Mínimo</div>
              <div class="card-value">${criticalCount}</div>
           </div>
           <div class="card">
              <div class="card-title">Categorias</div>
              <div class="card-value">${Object.keys(categoryStats).filter(k => categoryStats[k].count > 0).length}</div>
           </div>
        </div>

        <!-- CATEGORY TABLES -->
        ${categories.filter(c => groupedItems[c].length > 0).map(cat => `
           <div class="section-title">
              <span>${cat}</span>
              <span style="opacity: 0.8; font-size: 9px;">${groupedItems[cat].length} Itens</span>
           </div>
           <table>
              <thead>
                 <tr>
                    <th style="width: 30px;">#</th>
                    <th>Código</th>
                    <th>Descrição / Item</th>
                    <th class="col-center">Unid.</th>
                    <th class="col-center">Mín.</th>
                    <th class="col-center">Qtd. Sist.</th>
                    <th class="col-right">Custo Unit.</th>
                    <th class="col-right">Valor Total</th>
                    <th class="col-center">Status</th>
                 </tr>
              </thead>
              <tbody>
                 ${groupedItems[cat].map((item, idx) => {
                    const isLow = item.quantity <= item.minQuantity;
                    const statusBadge = isLow 
                       ? `<span class="badge b-low">BAIXO</span>` 
                       : `<span class="badge b-ok">OK</span>`;
                    
                    return `
                    <tr>
                       <td style="color: #94a3b8; text-align: center;">${idx + 1}</td>
                       <td class="col-code">${item.code}</td>
                       <td><strong>${item.name}</strong></td>
                       <td class="col-center" style="font-size: 9px;">${item.unit}</td>
                       <td class="col-center" style="color: #64748b;">${item.minQuantity}</td>
                       <td class="col-center" style="font-weight: 700; font-size: 11px;">${item.quantity}</td>
                       <td class="col-right" style="color: #64748b;">${new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(item.averageCost)}</td>
                       <td class="col-right" style="font-weight: 700;">${new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(item.quantity * item.averageCost)}</td>
                       <td class="col-center">${statusBadge}</td>
                    </tr>
                    `;
                 }).join('')}
              </tbody>
           </table>
        `).join('')}

        <!-- CRITICAL ITEMS / REPLENISHMENT -->
        ${criticalItems.length > 0 ? `
            <div class="alert-box">
                <div class="alert-header">
                    ⚠ Relatório de Reposição Urgente (Estoque Baixo ou Zerado)
                </div>
                <table style="border: none; margin: 0;">
                    <thead>
                        <tr>
                            <th style="color: #dc2626;">Código</th>
                            <th style="color: #dc2626;">Item</th>
                            <th style="color: #dc2626;">Categoria</th>
                            <th class="col-center" style="color: #dc2626;">Estoque Atual</th>
                            <th class="col-center" style="color: #dc2626;">Mínimo</th>
                            <th class="col-center" style="background: #fee2e2; color: #dc2626;">Déficit (Compra)</th>
                            <th class="col-right" style="color: #dc2626;">Custo Estimado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${criticalItems.map(item => {
                            const deficit = Math.max(0, item.minQuantity - item.quantity);
                            const estimatedCost = deficit * item.averageCost;
                            const isZero = item.quantity === 0;
                            
                            return `
                            <tr>
                                <td class="col-code">${item.code}</td>
                                <td><strong>${item.name}</strong></td>
                                <td style="font-size: 8px;">${item.category}</td>
                                <td class="col-center" style="font-weight: bold; ${isZero ? 'color: #dc2626;' : ''}">${item.quantity} ${item.unit}</td>
                                <td class="col-center">${item.minQuantity}</td>
                                <td class="col-center" style="font-weight: 800; background: #fff1f2; color: #dc2626;">+${deficit}</td>
                                <td class="col-right">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedCost)}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}

        <!-- SIGNATURES -->
        <div class="signatures">
           <div class="sig-line">Almoxarife / Conferente</div>
           <div class="sig-line">Gestor de Frota</div>
           <div class="sig-line">Auditoria / Diretoria</div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
           <div>GM Control Pro v4.5 &bull; Sistema de Gestão Integrada</div>
           <div>Documento de uso interno e confidencial.</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // AUDIT FUNCTIONS
  const handleUpdateAuditCount = (id: string, val: string) => {
      const num = parseInt(val);
      if (!isNaN(num) && num >= 0) {
          setAuditCounts(prev => ({ ...prev, [id]: num }));
      } else if (val === '') {
          const newCounts = { ...auditCounts };
          delete newCounts[id];
          setAuditCounts(newCounts);
      }
  };

  const handleCommitAudit = async () => {
      const updates: Promise<void>[] = [];
      let adjustmentCount = 0;

      for (const item of items) {
          if (auditCounts[item.id] !== undefined) {
              const physicalQty = auditCounts[item.id];
              const systemQty = item.quantity;
              const diff = physicalQty - systemQty;

              if (diff !== 0) {
                  // Create Adjustment Movement
                  const type = diff > 0 ? 'ENTRY' : 'EXIT';
                  const absDiff = Math.abs(diff);
                  
                  const movement: StockMovement = {
                      id: Date.now().toString() + Math.random(),
                      itemId: item.id,
                      itemName: item.name,
                      type: type,
                      quantity: absDiff,
                      unitCost: item.averageCost,
                      totalValue: absDiff * item.averageCost,
                      date: new Date().toISOString(),
                      user: 'Inventário',
                      notes: `Ajuste de Inventário. Físico: ${physicalQty} / Sist: ${systemQty}`
                  };

                  updates.push(storageService.registerStockMovement(orgId, movement));
                  adjustmentCount++;
              }
          }
      }

      if (adjustmentCount > 0) {
          if (confirm(`Confirma o ajuste de estoque para ${adjustmentCount} itens com divergência?`)) {
              await Promise.all(updates);
              setAuditCounts({});
              alert("Inventário processado com sucesso!");
              setActiveTab('STOCK');
          }
      } else {
          alert("Nenhuma divergência encontrada nos itens auditados.");
      }
  };

  const money = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 pb-24 relative animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
             <Package className="h-7 w-7 text-orange-600" /> Almoxarifado
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gestão inteligente de peças e insumos.</p>
        </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto w-full md:w-auto">
            <button onClick={() => setActiveTab('DASHBOARD')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'DASHBOARD' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><LayoutDashboard className="h-4 w-4"/> Visão Geral</button>
            <button onClick={() => setActiveTab('STOCK')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'STOCK' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><Package className="h-4 w-4"/> Estoque</button>
            <button onClick={() => setActiveTab('MOVEMENTS')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'MOVEMENTS' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><History className="h-4 w-4"/> Movimentações</button>
            <button onClick={() => setActiveTab('AUDIT')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'AUDIT' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}><ClipboardList className="h-4 w-4"/> Inventário</button>
          </div>
        </div>

      {activeTab === 'DASHBOARD' && (
         <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                     <p className="text-xs font-bold text-slate-400 uppercase">Valor em Estoque</p>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-white">{money(stats.totalValue)}</h3>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl"><DollarSign className="h-6 w-6"/></div>
               </div>
               <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                     <p className="text-xs font-bold text-slate-400 uppercase">Alertas de Reposição</p>
                     <h3 className={`text-2xl font-black ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>{stats.lowStockCount} <span className="text-sm font-medium text-slate-400">itens</span></h3>
                  </div>
                  <div className={`p-3 rounded-xl ${stats.lowStockCount > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 text-slate-400'}`}><AlertTriangle className="h-6 w-6"/></div>
               </div>
               <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                     <p className="text-xs font-bold text-slate-400 uppercase">Total de Itens (SKUs)</p>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.totalItemsCount}</h3>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl"><Package className="h-6 w-6"/></div>
               </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><PieIcon className="h-5 w-5 text-purple-500"/> Composição do Estoque</h3>
                  <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie data={stats.categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {stats.categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                           <Legend verticalAlign="middle" align="right" layout="vertical" />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-orange-500"/> Top 5 Itens (Valor Total)</h3>
                  <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topValueItems} layout="vertical" margin={{ left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} />
                           <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} cursor={{fill: 'transparent'}} />
                           <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* MOVEMENT HISTORY CHART */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
               <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500"/> Fluxo Financeiro (Últimos 6 Meses)</h3>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={stats.trendData}>
                        <defs>
                           <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorSaida" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} stroke="#94a3b8" />
                        <Tooltip formatter={(value: number) => money(value)} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                        <Legend verticalAlign="top" height={36}/>
                        <Area type="monotone" dataKey="Entrada" stroke="#10b981" fillOpacity={1} fill="url(#colorEntrada)" />
                        <Area type="monotone" dataKey="Saida" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaida)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      )}

      {activeTab !== 'DASHBOARD' && activeTab !== 'AUDIT' && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Buscar item..." className="w-full pl-10 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white placeholder-slate-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {activeTab === 'STOCK' && (
             <>
                <button onClick={() => setIsScannerOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl shadow-sm transition-colors flex items-center gap-2 font-bold" title="Entrada via Scanner"><ScanLine className="h-5 w-5" /> <span className="hidden md:inline">Entrada de Peça</span></button>
                <button onClick={handlePrintStockReport} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 font-bold" title="Imprimir Relatório"><Printer className="h-5 w-5" /> <span className="hidden md:inline">Relatório</span></button>
                <button onClick={() => handleOpenItemModal()} className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-xl shadow-lg transition-colors"><Plus className="h-6 w-6" /></button>
             </>
          )}
        </div>
      )}

      {activeTab === 'STOCK' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-4">Item / Código</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4 text-center">Quantidade</th>
                  <th className="p-4 text-right">Custo Médio</th>
                  <th className="p-4 text-right">Valor Total</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-black text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full uppercase">{item.category}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`font-black ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                        {item.quantity} <span className="text-xs font-medium text-slate-400">{item.unit}</span>
                      </div>
                      {item.quantity <= item.minQuantity && (
                        <div className="text-[9px] font-bold text-red-500 flex items-center justify-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3"/> Baixo Estoque
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right font-medium text-slate-600 dark:text-slate-400">
                      {money(item.averageCost)}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800 dark:text-white">
                      {money(item.quantity * item.averageCost)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenMovement(item, 'ENTRY')} 
                          className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                          title="Entrada"
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenMovement(item, 'EXIT')} 
                          className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                          title="Saída"
                        >
                          <ArrowDownCircle className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenItemModal(item)} 
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <PenLine className="h-4 w-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'MOVEMENTS' && (
         <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                     <tr>
                        <th className="p-4">Data</th>
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Item</th>
                        <th className="p-4 text-center">Qtd</th>
                        <th className="p-4 text-right">Valor Total</th>
                        <th className="p-4">Usuário</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {movements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           <td className="p-4 text-slate-500 dark:text-slate-400">{new Date(m.date + (m.date.includes('T') ? '' : 'T12:00:00')).toLocaleDateString()} {new Date(m.date + (m.date.includes('T') ? '' : 'T12:00:00')).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                           <td className="p-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${m.type === 'ENTRY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                 {m.type === 'ENTRY' ? 'Entrada' : 'Saída'}
                              </span>
                           </td>
                           <td className="p-4 font-bold text-slate-800 dark:text-white">{m.itemName}</td>
                           <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">{m.quantity}</td>
                           <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400">{money(m.totalValue)}</td>
                           <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{m.user}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {activeTab === 'AUDIT' && (
         <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 flex flex-col h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                       <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                       <input 
                          type="text" 
                          placeholder="Filtrar item..." 
                          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 text-sm" 
                          value={auditFilter} 
                          onChange={e => setAuditFilter(e.target.value)} 
                       />
                    </div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        Progresso: {Object.keys(auditCounts).length} / {items.length}
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => { if(confirm("Limpar contagem?")) setAuditCounts({}) }} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700">
                       <RotateCcw className="h-4 w-4"/> Zerar
                    </button>
                    <button onClick={handleCommitAudit} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all">
                       <CheckSquare className="h-4 w-4"/> Processar Ajustes
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold sticky top-0 z-10 shadow-sm">
                      <tr>
                         <th className="p-4">Item / Código</th>
                         <th className="p-4">Categoria</th>
                         <th className="p-4 text-center">Sistema (Qtd)</th>
                         <th className="p-4 text-center w-40">Contagem Física</th>
                         <th className="p-4 text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {items.filter(i => i.name.toLowerCase().includes(auditFilter.toLowerCase()) || i.code.toLowerCase().includes(auditFilter.toLowerCase())).map(item => {
                         const physical = auditCounts[item.id];
                         const hasCount = physical !== undefined;
                         const diff = hasCount ? physical - item.quantity : 0;
                         const isMatch = hasCount && diff === 0;
                         const isMissing = hasCount && diff < 0;
                         const isSurplus = hasCount && diff > 0;

                         return (
                            <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${hasCount ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''}`}>
                               <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                  <div className="text-xs text-slate-400 font-mono">{item.code}</div>
                               </td>
                               <td className="p-4 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">{item.category}</td>
                               <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-400">{item.quantity}</td>
                               <td className="p-4">
                                  <input 
                                     type="number" 
                                     className={`w-full p-2 text-center font-bold rounded-lg outline-none border focus:ring-2 ${
                                        isMatch ? 'border-green-300 bg-green-50 text-green-700 focus:ring-green-500' :
                                        isMissing ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500' :
                                        isSurplus ? 'border-blue-300 bg-blue-50 text-blue-700 focus:ring-blue-500' :
                                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-purple-500 text-slate-800 dark:text-white'
                                     }`}
                                     placeholder="-"
                                     value={physical ?? ''}
                                     onChange={e => handleUpdateAuditCount(item.id, e.target.value)}
                                  />
                               </td>
                               <td className="p-4 text-center">
                                  {hasCount ? (
                                     isMatch ? <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full"><CheckCircle2 className="h-3 w-3"/> OK</span> :
                                     isMissing ? <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full"><AlertTriangle className="h-3 w-3"/> {diff}</span> :
                                     <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full"><TrendingUp className="h-3 w-3"/> +{diff}</span>
                                  ) : (
                                     <span className="text-xs text-slate-400 italic">Pendente</span>
                                  )}
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
            </div>
         </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ScanLine className="h-6 w-6 text-blue-600" /> Escanear Código de Barras
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
                Aponte a câmera para o código de barras do item para realizar a entrada.
              </p>
              <div className="aspect-video bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 relative">
                <Scanner onScan={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />
                <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-32 border-2 border-blue-500 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-950 flex justify-center">
              <button onClick={() => setIsScannerOpen(false)} className="px-8 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black text-slate-800 dark:text-white">{editingItem ? 'Editar Item' : 'Novo Item'}</h3>
               <button onClick={() => setIsItemModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="h-5 w-5 text-slate-500"/></button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Nome do Item</label>
                 <input required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold" value={itemFormData.name} onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Código</label>
                    <input required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white" value={itemFormData.code} onChange={e => setItemFormData({ ...itemFormData, code: e.target.value })} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Categoria</label>
                    <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white font-bold" value={itemFormData.category} onChange={e => setItemFormData({...itemFormData, category: e.target.value as any})}>
                       <option value="PECA">Peça</option>
                       <option value="FILTRO">Filtro</option>
                       <option value="OLEO">Óleo/Fluido</option>
                       <option value="FERRAMENTA">Ferramenta</option>
                       <option value="EPI">EPI</option>
                       <option value="OUTROS">Outros</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Estoque Mínimo</label>
                   <input type="number" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white" value={itemFormData.minQuantity} onChange={e => setItemFormData({ ...itemFormData, minQuantity: Number(e.target.value) })} />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Custo Médio (R$)</label>
                   <input type="number" step="0.01" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white" value={itemFormData.averageCost} onChange={e => setItemFormData({ ...itemFormData, averageCost: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg transition-colors">Salvar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isMovementModalOpen && selectedItemForMovement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="text-center mb-6">
               <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">{movementType === 'ENTRY' ? 'Entrada de Estoque' : 'Saída de Estoque'}</h3>
               <p className="text-sm font-bold text-orange-600">{selectedItemForMovement.name}</p>
            </div>
            <form onSubmit={handleSaveMovement} className="space-y-4">
              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block text-center">Quantidade</label>
                 <div className="flex items-center justify-center">
                    <button type="button" onClick={() => setMovementFormData(p => ({...p, quantity: Math.max(1, p.quantity - 1)}))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-lg">-</button>
                    <input type="number" required className="w-24 p-2 text-center text-3xl font-black bg-transparent outline-none text-slate-800 dark:text-white" value={movementFormData.quantity} onChange={e => setMovementFormData({ ...movementFormData, quantity: Number(e.target.value) })} />
                    <button type="button" onClick={() => setMovementFormData(p => ({...p, quantity: p.quantity + 1}))} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-lg">+</button>
                 </div>
              </div>
              
              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Observações</label>
                 <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-white" placeholder="Motivo, OS, Fornecedor..." value={movementFormData.notes} onChange={e => setMovementFormData({ ...movementFormData, notes: e.target.value })} />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-colors ${movementType === 'ENTRY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
