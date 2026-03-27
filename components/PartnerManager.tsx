import React, { useState, useEffect } from 'react';
import { Partner } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export const PartnerManager: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCost, setNewServiceCost] = useState<number>(0);

  useEffect(() => {
    return storageService.subscribeToPartners(orgId, setPartners);
  }, [orgId]);

  const handleAddPartner = async () => {
    if (!newPartnerName) return;
    const newPartner: Partner = {
      id: Date.now().toString(),
      name: newPartnerName,
      services: []
    };
    await storageService.addPartner(orgId, newPartner);
    setNewPartnerName('');
  };

  const handleDeletePartner = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este parceiro?')) {
      await storageService.deletePartner(orgId, id);
    }
  };

  const handleAddService = (partner: Partner) => {
    if (!newServiceName) return;
    const updatedPartner = {
      ...partner,
      services: [...partner.services, { id: Date.now().toString(), name: newServiceName, cost: newServiceCost }]
    };
    storageService.updatePartner(orgId, updatedPartner);
    setNewServiceName('');
    setNewServiceCost(0);
  };

  const handleDeleteService = (partner: Partner, serviceId: string) => {
    const updatedPartner = {
      ...partner,
      services: partner.services.filter(s => s.id !== serviceId)
    };
    storageService.updatePartner(orgId, updatedPartner);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Gerenciar Parceiros</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="flex gap-2">
          <input 
            value={newPartnerName}
            onChange={e => setNewPartnerName(e.target.value)}
            placeholder="Nome do novo parceiro"
            className="flex-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddPartner} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} /> Adicionar
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {partners.map(partner => (
          <div key={partner.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800">{partner.name}</h3>
              <button onClick={() => handleDeletePartner(partner.id)} className="text-red-500 hover:text-red-700"><Trash2 size={20}/></button>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700">Serviços Prestados:</h4>
              {partner.services.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                  <span className="text-sm">{s.name} - R$ {s.cost.toFixed(2)}</span>
                  <button onClick={() => handleDeleteService(partner, s.id)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                </div>
              ))}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Nome do serviço" className="flex-1 p-2 border rounded text-sm" />
                <input type="number" value={newServiceCost} onChange={e => setNewServiceCost(Number(e.target.value))} placeholder="Custo" className="w-24 p-2 border rounded text-sm" />
                <button onClick={() => handleAddService(partner)} className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700"><Plus size={20}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
