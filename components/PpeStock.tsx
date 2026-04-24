import React, { FC, useState, useEffect, useMemo } from 'react';
import { Package, Plus, Search, Filter, ArrowUpRight, ArrowDownRight, AlertTriangle, ShieldCheck, X, Save, Trash2, Tag, Layers } from 'lucide-react';
import { storageService } from '../services/storageService';
import { PpeStockItem, Collaborator } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PpeStockProps {
  orgId: string;
  collaborators: Collaborator[];
}

export const PpeStock: FC<PpeStockProps> = ({ orgId, collaborators }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ppeItems, setPpeItems] = useState<PpeStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PpeStockItem | null>(null);
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [movementData, setMovementData] = useState({
    quantity: '',
    notes: '',
    collaboratorId: ''
  });

  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: 'UN',
    quantity: '0',
    minQuantity: '5',
    caNumber: '',
    description: ''
  });

  useEffect(() => {
    const unsub = storageService.subscribeToPpeStock(orgId, (items) => {
      setPpeItems(items);
      setLoading(false);
    });
    return () => unsub();
  }, [orgId]);

  const filteredItems = useMemo(() => {
    return ppeItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.caNumber && item.caNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [ppeItems, searchTerm]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemData.name || !newItemData.quantity || !newItemData.unit) return;

    try {
      const item: PpeStockItem = {
        id: Date.now().toString(),
        name: newItemData.name,
        unit: newItemData.unit,
        quantity: Number(newItemData.quantity),
        minQuantity: Number(newItemData.minQuantity),
        caNumber: newItemData.caNumber,
        description: newItemData.description,
        updatedAt: new Date().toISOString()
      };

      await storageService.addPpeStockItem(orgId, item);
      setIsModalOpen(false);
      setNewItemData({
        name: '',
        unit: 'UN',
        quantity: '0',
        minQuantity: '5',
        caNumber: '',
        description: ''
      });
    } catch (error) {
      console.error("Error creating PPE item:", error);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !movementData.quantity) return;

    try {
      const qty = Number(movementData.quantity);
      const newQty = movementType === 'ENTRY' ? selectedItem.quantity + qty : selectedItem.quantity - qty;
      
      if (newQty < 0) {
        alert("Quantidade insuficiente em estoque!");
        return;
      }

      await storageService.updatePpeStockItem(orgId, selectedItem.id, {
        quantity: newQty,
        updatedAt: new Date().toISOString()
      });

      // Optionally log movement here
      
      setIsMovementModalOpen(false);
      setSelectedItem(null);
      setMovementData({
        quantity: '',
        notes: '',
        collaboratorId: ''
      });
    } catch (error) {
      console.error("Error handling movement:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    try {
      await storageService.deletePpeStockItem(orgId, id);
    } catch (error) {
      console.error("Error deleting PPE item:", error);
    }
  };

  const itemsBelowMin = ppeItems.filter(i => i.quantity < i.minQuantity).length;

  return (
    <div className="p-8 max-w-7xl mx-auto scroll-smooth">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-purple-600" />
            Estoque de EPI
          </h2>
          <p className="text-slate-500 font-medium">Controle de Equipamentos de Proteção Individual</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Novo Item / Entrada
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 w-fit mb-4">
            <Package className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total de Itens</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{ppeItems.length}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-sm border-l-4 ${itemsBelowMin > 0 ? 'border-red-500 border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800'}`}
        >
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 w-fit mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Abaixo do Mínimo</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{itemsBelowMin}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 w-fit mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Itens em Conformidade</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{ppeItems.length - itemsBelowMin}</p>
        </motion.div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CA..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-medium dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-bold px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">CA</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Quantidade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Mínimo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">Carregando estoque...</td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                      {item.caNumber || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 dark:text-white">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {item.id}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black ${item.quantity < item.minQuantity ? 'text-red-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
                        {item.quantity}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">
                    {item.minQuantity} {item.unit}
                  </td>
                  <td className="px-6 py-4">
                    {item.quantity < item.minQuantity ? (
                      <span className="flex items-center gap-1.5 text-red-600 font-black text-[10px] uppercase bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        Reposição
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit flex items-center gap-1.5">
                         <ShieldCheck className="h-3 w-3" /> Normal
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setMovementType('EXIT');
                          setIsMovementModalOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" 
                        title="Dar Baixa (Saída)"
                      >
                        <ArrowDownRight className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setMovementType('ENTRY');
                          setIsMovementModalOpen(true);
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" 
                        title="Entrada"
                      >
                        <ArrowUpRight className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && !loading && (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nenhum item encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO ITEM */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Novo Item / Cadastro
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Nome do Item</label>
                   <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white"
                      value={newItemData.name}
                      onChange={e => setNewItemData({...newItemData, name: e.target.value.toUpperCase()})}
                      placeholder="EX: CAPACETE DE SEGURANÇA"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">CA (Opcional)</label>
                      <input
                          type="text"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white"
                          value={newItemData.caNumber}
                          onChange={e => setNewItemData({...newItemData, caNumber: e.target.value.toUpperCase()})}
                          placeholder="EX: 12345"
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Unidade</label>
                      <select
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white"
                          value={newItemData.unit}
                          onChange={e => setNewItemData({...newItemData, unit: e.target.value})}
                      >
                         <option value="UN">UNIDADE</option>
                         <option value="PAR">PAR</option>
                         <option value="KG">KG</option>
                         <option value="LT">LITRO</option>
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Qtd Inicial</label>
                      <input
                          type="number"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white"
                          value={newItemData.quantity}
                          onChange={e => setNewItemData({...newItemData, quantity: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Qtd Mínima</label>
                      <input
                          type="number"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white"
                          value={newItemData.minQuantity}
                          onChange={e => setNewItemData({...newItemData, minQuantity: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Descrição</label>
                   <textarea
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white min-h-[80px]"
                      value={newItemData.description}
                      onChange={e => setNewItemData({...newItemData, description: e.target.value})}
                   />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 py-3 rounded-xl text-white font-black hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="h-5 w-5" />
                  Salvar Cadastro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MOVIMENTAÇÃO (ENTRADA/BAIXA) */}
      <AnimatePresence>
        {isMovementModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsMovementModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  {movementType === 'ENTRY' ? (
                    <><ArrowUpRight className="h-5 w-5 text-emerald-500" /> Entrada</>
                  ) : (
                    <><ArrowDownRight className="h-5 w-5 text-red-500" /> Baixa / Entrega</>
                  )}
                </h3>
                <button onClick={() => setIsMovementModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Item Selecionado</p>
                 <p className="font-bold text-slate-900 dark:text-white">{selectedItem.name}</p>
                 <p className="text-sm font-bold text-slate-500">Saldo Atual: {selectedItem.quantity} {selectedItem.unit}</p>
              </div>

              <form onSubmit={handleMovement} className="space-y-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Quantidade</label>
                   <input
                      type="number"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-black text-lg text-center dark:text-white"
                      value={movementData.quantity}
                      onChange={e => setMovementData({...movementData, quantity: e.target.value})}
                      placeholder="0"
                      autoFocus
                   />
                </div>

                {movementType === 'EXIT' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Entregar para (Opcional)</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white"
                      value={movementData.collaboratorId}
                      onChange={e => setMovementData({...movementData, collaboratorId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {collaborators.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 ml-1 tracking-wider">Anotações</label>
                   <textarea
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 font-bold dark:text-white min-h-[60px]"
                      value={movementData.notes}
                      onChange={e => setMovementData({...movementData, notes: e.target.value})}
                   />
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl text-white font-black transition-all flex items-center justify-center gap-2 ${
                    movementType === 'ENTRY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <Save className="h-5 w-5" />
                  Confirmar {movementType === 'ENTRY' ? 'Entrada' : 'Baixa'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
