import React, { useState, useMemo } from 'react';
import { Tire, TireStatus, Vehicle, UserLevel } from '../types';
import { Trash2, AlertTriangle, Package, Search, Plus, X, CheckCircle2, Disc } from 'lucide-react';

interface ScrapHubProps {
  tires: Tire[];
  vehicles: Vehicle[];
  branches?: any[];
  defaultBranchId?: string;
  onUpdateTire: (tire: Tire) => Promise<void>;
  userLevel: UserLevel;
}

const ScrapHub: React.FC<ScrapHubProps> = ({ tires, vehicles, branches = [], defaultBranchId, onUpdateTire, userLevel }) => {
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [selectedTireId, setSelectedTireId] = useState('');
  const [discardReason, setDiscardReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const scrappedTires = useMemo(() => {
    return tires.filter(t => {
      const isScrap = t.status === TireStatus.DAMAGED;
      const matchesBranch = !defaultBranchId || t.branchId === defaultBranchId;
      return isScrap && matchesBranch;
    });
  }, [tires, defaultBranchId]);

  const activeTires = useMemo(() => {
    return tires.filter(t => {
      const isNotScrap = t.status !== TireStatus.DAMAGED;
      const matchesBranch = !defaultBranchId || t.branchId === defaultBranchId;
      return isNotScrap && matchesBranch;
    });
  }, [tires, defaultBranchId]);

  const stats = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};

    scrappedTires.forEach(t => {
      brandCounts[t.brand] = (brandCounts[t.brand] || 0) + 1;
      modelCounts[t.model] = (modelCounts[t.model] || 0) + 1;
      
      const discardLog = t.history?.find(h => h.action === 'DESCARTE');
      if (discardLog) {
        const match = discardLog.details.match(/Motivo: (.*)/);
        const reason = match ? match[1] : discardLog.details;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    });

    const getTop = (counts: Record<string, number>) => {
      let top = '-';
      let max = 0;
      for (const [key, val] of Object.entries(counts)) {
        if (val > max) {
          max = val;
          top = key;
        }
      }
      return { name: top, count: max };
    };

    return {
      topBrand: getTop(brandCounts),
      topModel: getTop(modelCounts),
      topReason: getTop(reasonCounts)
    };
  }, [scrappedTires]);

  const handleDiscard = async () => {
    if (!selectedTireId || !discardReason) return;
    const tire = tires.find(t => t.id === selectedTireId);
    if (!tire) return;

    const updatedTire: Tire = {
      ...tire,
      status: TireStatus.DAMAGED,
      location: 'Sucata',
      vehicleId: null,
      position: null,
      history: [
        ...(tire.history || []),
        {
          date: new Date().toISOString(),
          action: 'DESCARTE',
          details: `Motivo: ${discardReason}`
        }
      ]
    };

    await onUpdateTire(updatedTire);
    setIsDiscardModalOpen(false);
    setSelectedTireId('');
    setDiscardReason('');
  };

  const filteredScrapped = scrappedTires.filter(t => 
    t.fireNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Sucata e Descarte</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Análise e gestão de pneus descartados.</p>
        </div>
        <button 
          onClick={() => setIsDiscardModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Trash2 className="h-5 w-5" /> Lançar Descarte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Disc className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca Mais Descartada</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">{stats.topBrand.name}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">{stats.topBrand.count} descartes registrados</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modelo Mais Descartado</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">{stats.topModel.name}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">{stats.topModel.count} descartes registrados</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo Principal</p>
              <h3 className="text-xl font-black text-slate-800 dark:text-white truncate" title={stats.topReason.name}>{stats.topReason.name}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">{stats.topReason.count} ocorrências</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Histórico de Descartes</h3>
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar pneu..." 
              className="w-full md:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-5">Fogo / ID</th>
                <th className="p-5">Marca & Modelo</th>
                <th className="p-5">Motivo do Descarte</th>
                <th className="p-5">Data do Descarte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredScrapped.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">Nenhum descarte encontrado.</td>
                </tr>
              ) : (
                filteredScrapped.map(t => {
                  const discardLog = t.history?.find(h => h.action === 'DESCARTE');
                  const reason = discardLog ? discardLog.details.replace('Motivo: ', '') : '-';
                  const date = discardLog ? new Date(discardLog.date).toLocaleDateString('pt-BR') : '-';
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-5 font-black text-slate-800 dark:text-white">{t.fireNumber}</td>
                      <td className="p-5">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{t.brand}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{t.model}</div>
                      </td>
                      <td className="p-5 text-slate-600 dark:text-slate-400">{reason}</td>
                      <td className="p-5 text-slate-600 dark:text-slate-400">{date}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDiscardModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Trash2 className="h-6 w-6 text-red-500" /> Lançar Descarte
              </h3>
              <button onClick={() => setIsDiscardModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecione o Pneu</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-red-500"
                  value={selectedTireId}
                  onChange={e => setSelectedTireId(e.target.value)}
                >
                  <option value="">-- Selecione --</option>
                  {activeTires.map(t => (
                    <option key={t.id} value={t.id}>{t.fireNumber} - {t.brand} {t.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivo do Descarte</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-red-500 mb-3"
                  value={discardReason}
                  onChange={e => setDiscardReason(e.target.value)}
                >
                  <option value="">-- Selecione ou digite abaixo --</option>
                  <option value="Corte">Corte</option>
                  <option value="Bolha">Bolha</option>
                  <option value="Desgaste Irregular">Desgaste Irregular</option>
                  <option value="Furo">Furo</option>
                  <option value="Fim de Vida Útil">Fim de Vida Útil</option>
                  <option value="Recusado na Recapagem">Recusado na Recapagem</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Ou digite outro motivo..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-red-500"
                  value={discardReason}
                  onChange={e => setDiscardReason(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsDiscardModalOpen(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDiscard}
                disabled={!selectedTireId || !discardReason}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold shadow-lg transition-colors"
              >
                Confirmar Descarte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapHub;
