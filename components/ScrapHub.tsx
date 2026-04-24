import React, { useState, useMemo, useEffect } from 'react';
import { WasteDisposal, WasteType, Partner, Collaborator, Tire } from '../types';
import { storageService } from '../services/storageService';
import { 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  Truck, 
  FileText, 
  Download, 
  Activity, 
  ExternalLink,
  Package,
  Filter,
  Eye
} from 'lucide-react';

interface ScrapHubProps {
  orgId: string;
  partners: Partner[];
  collaborators: Collaborator[];
}

const ScrapHub: React.FC<ScrapHubProps> = ({ orgId, partners, collaborators }) => {
  const [disposals, setDisposals] = useState<WasteDisposal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'WASTE' | 'PPE' | 'TIRE'>('ALL');

  useEffect(() => {
    const unsubDisposals = storageService.subscribeToWasteDisposals(orgId, (data) => {
      setDisposals(data);
      setLoading(false);
    });
    return () => unsubDisposals();
  }, [orgId]);

  const filteredDisposals = useMemo(() => {
    return disposals.filter(d => {
      const matchesSearch = 
        d.items.some(item => item.wasteTypeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        d.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.certificateNumber && d.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'ALL' || d.disposalType === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [disposals, searchTerm, filterType]);

  const getStats = useMemo(() => {
    const stats = {
      WASTE: 0,
      PPE: 0,
      TIRE: 0,
      TOTAL_RECORDS: filteredDisposals.length
    };
    
    filteredDisposals.forEach(d => {
      if (d.disposalType === 'WASTE') stats.WASTE++;
      if (d.disposalType === 'PPE') stats.PPE++;
      if (d.disposalType === 'TIRE') stats.TIRE++;
    });
    
    return stats;
  }, [filteredDisposals]);

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'WASTE': return 'bg-orange-100 text-orange-700';
      case 'PPE': return 'bg-purple-100 text-purple-700';
      case 'TIRE': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'WASTE': return 'Resíduo';
      case 'PPE': return 'EPI';
      case 'TIRE': return 'Pneu';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-slate-600" />
            Sucata Geral - Histórico de Descartes
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Visualização consolidada de todos os descartes realizados (Resíduos, EPI e Pneus).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Total de Registros</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{getStats.TOTAL_RECORDS}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Descartes de Resíduos</p>
          <p className="text-2xl font-black text-orange-600">{getStats.WASTE}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Descartes de EPI</p>
          <p className="text-2xl font-black text-purple-600">{getStats.PPE}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Descartes de Pneus</p>
          <p className="text-2xl font-black text-blue-600">{getStats.TIRE}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por item, parceiro, certificado..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-500 transition-all font-medium text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(['ALL', 'WASTE', 'PPE', 'TIRE'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                      filterType === t 
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t === 'ALL' ? 'TUDO' : getTypeName(t).toUpperCase()}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Itens / Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Quantidades</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Destino</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Anexos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDisposals.map((disposal) => (
                <tr key={disposal.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getBadgeStyle(disposal.disposalType)}`}>
                      {getTypeName(disposal.disposalType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     {disposal.stage === 'FINALIZADO' ? (
                       <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black w-fit uppercase">Finalizado</span>
                     ) : (
                       <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black w-fit uppercase">{disposal.stage?.replace('_', ' ')}</span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0">
                        <div className="space-y-1">
                          {disposal.items.map((item, idx) => (
                            <p key={idx} className="font-bold text-slate-800 dark:text-white truncate">
                              {item.wasteTypeName}
                            </p>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" /> {new Date(disposal.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {disposal.items.map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[10px] font-bold w-fit">
                          {item.quantity} {item.unit}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{disposal.partnerName}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Resp: {disposal.responsibleName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {disposal.attachmentUrl && (
                        <a 
                          href={disposal.attachmentUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                          title="Ver Comprovante"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      {disposal.certificateNumber && (
                        <span title={`MTR: ${disposal.certificateNumber}`} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDisposals.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ScrapHub;

