
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { Branch } from '../types';
import { Plus, Building2, MapPin, Hash, FileText, Trash2, Edit2, Loader2, Search, X } from 'lucide-react';

export const BranchManagement = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    location: '',
    code: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToBranches((data) => {
      setBranches(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (showForm && mapContainerRef.current && !mapInstance.current) {
      const L = (window as any).L;
      if (!L) return;

      // Pequeno delay para garantir que o container esteja renderizado com as dimensões corretas
      setTimeout(() => {
        if (!mapContainerRef.current) return;

        const initialLat = formData.lat || -15.7801;
        const initialLng = formData.lng || -47.9292;
        const initialZoom = formData.lat ? 15 : 4;

        mapInstance.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance.current);

        if (formData.lat && formData.lng) {
          markerRef.current = L.marker([formData.lat, formData.lng]).addTo(mapInstance.current);
        }

        mapInstance.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setFormData(prev => ({ ...prev, lat, lng }));
          
          if (markerRef.current) {
            markerRef.current.setLatLng(e.latlng);
          } else {
            markerRef.current = L.marker(e.latlng).addTo(mapInstance.current);
          }
        });
      }, 100);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, [showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await storageService.updateBranch(editingBranch.id, formData);
      } else {
        const newBranch: Branch = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString()
        };
        await storageService.addBranch(newBranch);
      }
      setShowForm(false);
      setEditingBranch(null);
      setFormData({ name: '', cnpj: '', location: '', code: '', lat: undefined, lng: undefined });
    } catch (error) {
      console.error("Error saving branch:", error);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      cnpj: branch.cnpj,
      location: branch.location,
      code: branch.code,
      lat: branch.lat,
      lng: branch.lng
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja realmente excluir esta filial?")) {
      await storageService.deleteBranch(id);
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.cnpj.includes(searchTerm) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestão de Filiais</h1>
          <p className="text-slate-500 font-medium">Cadastre e gerencie as unidades da sua empresa</p>
        </div>
          <button
            onClick={() => {
              setEditingBranch(null);
              setFormData({ name: '', cnpj: '', location: '', code: '', lat: undefined, lng: undefined });
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Nova Filial
          </button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ ou código..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold">Carregando filiais...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
          <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Nenhuma filial encontrada</h3>
          <p className="text-slate-500">Comece cadastrando a primeira unidade da sua empresa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(branch)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(branch.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-1">{branch.name}</h3>
              <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-wider mb-4">
                Cód: {branch.code}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-slate-500">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-bold">{branch.cnpj}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-bold">{branch.location}</span>
                  {branch.lat && branch.lng && (
                    <a 
                      href={`https://www.google.com/maps?q=${branch.lat},${branch.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                      title="Ver no Google Maps"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-xl font-black text-slate-800">
                {editingBranch ? 'Editar Filial' : 'Nova Filial'}
              </h2>
              <button 
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Nome da Filial</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="Ex: Matriz São Paulo"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">CNPJ</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={e => setFormData({...formData, cnpj: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Código</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="Ex: FIL-01"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Localização / Endereço</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    placeholder="Cidade, Estado ou Endereço Completo"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-500 uppercase mb-2 ml-1">Localização no Mapa</label>
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                    <div ref={mapContainerRef} className="h-full w-full z-0" />
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-lg border border-slate-100 pointer-events-none">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Clique no mapa para selecionar</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500"
                    placeholder="0.000000"
                    value={formData.lat || ''}
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase mb-1 ml-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-slate-500"
                    placeholder="0.000000"
                    value={formData.lng || ''}
                    readOnly
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  {editingBranch ? 'Salvar Alterações' : 'Cadastrar Filial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
