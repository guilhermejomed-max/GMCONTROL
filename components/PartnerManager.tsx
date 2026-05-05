import React, { useState, useEffect } from 'react';
import { Partner } from '../types';
import { storageService } from '../services/storageService';
import { Plus, Trash2, Edit2, Save, X, Phone, MapPin, FileText, UserRound } from 'lucide-react';

type PartnerFormData = {
  name: string;
  cnpj: string;
  phone: string;
  address: string;
  responsible: string;
};

const emptyPartnerForm: PartnerFormData = {
  name: '',
  cnpj: '',
  phone: '',
  address: '',
  responsible: ''
};

export const PartnerManager: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerFormData>(emptyPartnerForm);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCost, setNewServiceCost] = useState<number>(0);

  useEffect(() => {
    return storageService.subscribeToPartners(orgId, setPartners);
  }, [orgId]);

  const resetForm = () => {
    setEditingPartner(null);
    setFormData(emptyPartnerForm);
  };

  const handleEditPartner = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name || '',
      cnpj: partner.cnpj || '',
      phone: partner.phone || '',
      address: partner.address || '',
      responsible: partner.responsible || ''
    });
  };

  const handleSavePartner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) return;

    const payload: Partner = {
      ...(editingPartner || { id: Date.now().toString(), services: [] }),
      name: formData.name.trim(),
      cnpj: formData.cnpj.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      responsible: formData.responsible.trim()
    };

    if (editingPartner) {
      await storageService.updatePartner(orgId, payload);
    } else {
      await storageService.addPartner(orgId, payload);
    }

    resetForm();
  };

  const handleDeletePartner = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este parceiro?')) {
      await storageService.deletePartner(orgId, id);
    }
  };

  const handleAddService = (partner: Partner) => {
    if (!newServiceName.trim()) return;
    const updatedPartner = {
      ...partner,
      services: [...(partner.services || []), { id: Date.now().toString(), name: newServiceName.trim(), cost: newServiceCost }]
    };
    storageService.updatePartner(orgId, updatedPartner);
    setNewServiceName('');
    setNewServiceCost(0);
  };

  const handleDeleteService = (partner: Partner, serviceId: string) => {
    const updatedPartner = {
      ...partner,
      services: (partner.services || []).filter(s => s.id !== serviceId)
    };
    storageService.updatePartner(orgId, updatedPartner);
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Parceiros / Fornecedores</h2>
          <p className="text-sm font-bold text-slate-500">Cadastro de oficinas, fornecedores e prestadores.</p>
        </div>
      </div>

      <form onSubmit={handleSavePartner} className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">
            {editingPartner ? 'Editar parceiro' : 'Novo parceiro'}
          </h3>
          {editingPartner && (
            <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1">
              <X className="h-4 w-4" /> Cancelar edicao
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <input
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do parceiro"
            className="xl:col-span-2 p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
            required
          />
          <input
            value={formData.cnpj}
            onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
            placeholder="CNPJ"
            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
          />
          <input
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Telefone"
            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
          />
          <input
            value={formData.responsible}
            onChange={e => setFormData({ ...formData, responsible: e.target.value })}
            placeholder="Responsavel"
            className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
          />
          <input
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            placeholder="Endereco"
            className="md:col-span-2 xl:col-span-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
          />
          <button type="submit" className="bg-blue-600 text-white px-5 py-3 rounded-lg font-black hover:bg-blue-700 flex items-center justify-center gap-2">
            {editingPartner ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingPartner ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>

      <div className="grid gap-5">
        {partners.map(partner => (
          <div key={partner.id} className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{partner.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs font-bold text-slate-500">
                  {partner.cnpj && <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> {partner.cnpj}</span>}
                  {partner.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> {partner.phone}</span>}
                  {partner.responsible && <span className="flex items-center gap-2"><UserRound className="h-4 w-4" /> {partner.responsible}</span>}
                  {partner.address && <span className="flex items-center gap-2 sm:col-span-2"><MapPin className="h-4 w-4" /> {partner.address}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditPartner(partner)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDeletePartner(partner.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-black text-sm text-slate-700 dark:text-slate-200">Servicos Prestados</h4>
              {(partner.services || []).map(s => (
                <div key={s.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.name} - R$ {Number(s.cost || 0).toFixed(2)}</span>
                  <button onClick={() => handleDeleteService(partner, s.id)} className="text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <input value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="Nome do servico" className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white" />
                <input type="number" value={newServiceCost} onChange={e => setNewServiceCost(Number(e.target.value))} placeholder="Custo" className="sm:w-28 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-white" />
                <button onClick={() => handleAddService(partner)} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
