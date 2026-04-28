import React, { useState } from 'react';
import { Activity, Calendar, Fuel, Gauge, LogIn, MapPin, Send, ShieldCheck, Truck, User, Wrench } from 'lucide-react';
import { FuelEntry, ServiceOrder, Vehicle } from '../types';
import { calculateRollingFuelEfficiency } from '../lib/fuelUtils';

interface VehicleRGPublicProps {
  vehicle?: Vehicle;
  fuelEntries: FuelEntry[];
  serviceOrders: ServiceOrder[];
  onBack?: () => void;
  isLoading?: boolean;
  error?: string;
  onCreateServiceRequest?: (request: {
    driverName: string;
    title: string;
    details: string;
    preferredDate: string;
    urgency: string;
  }) => Promise<void>;
}

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

export const VehicleRGPublic: React.FC<VehicleRGPublicProps> = ({ vehicle, fuelEntries, serviceOrders, onBack, isLoading, error, onCreateServiceRequest }) => {
  const storageKey = vehicle?.id ? `gmcontrol-rg-driver-${vehicle.id}` : 'gmcontrol-rg-driver';
  const [driverName, setDriverName] = useState(() => localStorage.getItem(storageKey) || '');
  const [nameInput, setNameInput] = useState(() => localStorage.getItem(storageKey) || '');
  const [serviceTitle, setServiceTitle] = useState('Revisao solicitada pelo motorista');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [urgency, setUrgency] = useState('NORMAL');
  const [serviceDetails, setServiceDetails] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Truck className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-pulse" />
          <h1 className="text-2xl font-black mb-2">Carregando RG do veiculo</h1>
          <p className="text-slate-400 font-bold">Aguarde enquanto buscamos os dados do QR Code.</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Truck className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <h1 className="text-2xl font-black mb-2">RG do veiculo nao encontrado</h1>
          <p className="text-slate-400 font-bold">{error || 'Confira se o QR Code pertence a esta frota ou se o veiculo ainda esta cadastrado.'}</p>
          {onBack && (
            <button onClick={onBack} className="mt-6 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black">
              Voltar ao GM Control
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleDriverLogin = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) return;
    localStorage.setItem(storageKey, cleanName);
    setDriverName(cleanName);
  };

  const handleServiceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onCreateServiceRequest || !driverName.trim()) return;
    if (!serviceTitle.trim() || !serviceDetails.trim()) {
      alert('Informe o tipo de servico e descreva o que precisa ser feito.');
      return;
    }

    setIsSending(true);
    try {
      await onCreateServiceRequest({
        driverName: driverName.trim(),
        title: serviceTitle.trim(),
        details: serviceDetails.trim(),
        preferredDate: serviceDate,
        urgency
      });
      setServiceTitle('Revisao solicitada pelo motorista');
      setServiceDate(new Date().toISOString().split('T')[0]);
      setUrgency('NORMAL');
      setServiceDetails('');
      alert('Solicitacao enviada para a oficina.');
    } catch (error: any) {
      alert(error?.message || 'Nao foi possivel enviar a solicitacao.');
    } finally {
      setIsSending(false);
    }
  };

  if (!driverName) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <form onSubmit={handleDriverLogin} className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center mb-5">
            <Truck className="h-8 w-8" />
          </div>
          <p className="text-xs font-black uppercase text-blue-300">RG digital do veiculo</p>
          <h1 className="text-4xl font-black mb-2">{vehicle.plate}</h1>
          <p className="text-sm font-bold text-slate-400 mb-6">Informe seu nome para acessar o RG e solicitar servicos para este veiculo.</p>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2">Nome do motorista</label>
          <div className="relative mb-4">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              value={nameInput}
              onChange={event => setNameInput(event.target.value)}
              className="w-full pl-10 pr-3 py-3 rounded-lg bg-slate-900 border border-white/10 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite seu nome"
              autoFocus
            />
          </div>
          <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center justify-center gap-2">
            <LogIn className="h-5 w-5" />
            Entrar no RG
          </button>
        </form>
      </div>
    );
  }

  const vehicleFuelEntries = fuelEntries.filter(entry => entry.vehicleId === vehicle.id);
  const rollingFuel = calculateRollingFuelEfficiency(vehicleFuelEntries, 1000);
  const vehicleOrders = serviceOrders.filter(order => order.vehicleId === vehicle.id);
  const openOrders = vehicleOrders.filter(order => order.status !== 'CONCLUIDO' && order.status !== 'CANCELADO').length;
  const lastMaintenance = vehicleOrders
    .filter(order => order.status === 'CONCLUIDO')
    .sort((a, b) => new Date(b.completedAt || b.date || b.createdAt).getTime() - new Date(a.completedAt || a.date || a.createdAt).getTime())[0];
  const nextPreventiveKm = (vehicle.lastPreventiveKm || 0) + (vehicle.revisionIntervalKm || 0);
  const remainingKm = nextPreventiveKm > 0 ? nextPreventiveKm - (vehicle.odometer || 0) : 0;

  const cards = [
    { label: 'Hodometro', value: `${(vehicle.odometer || 0).toLocaleString('pt-BR')} km`, icon: <Gauge className="h-5 w-5" /> },
    { label: 'Media abastecimento', value: rollingFuel.average > 0 ? `${rollingFuel.average.toFixed(2)} km/l` : '-', icon: <Fuel className="h-5 w-5" /> },
    { label: 'Media telemetria', value: vehicle.telemetryRollingAvgKml ? `${vehicle.telemetryRollingAvgKml.toFixed(2)} km/l` : '-', icon: <Activity className="h-5 w-5" /> },
    { label: 'OS abertas', value: openOrders.toString(), icon: <Wrench className="h-5 w-5" /> }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-5 py-6 md:py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-blue-300">RG digital do veiculo</p>
              <h1 className="text-3xl md:text-5xl font-black leading-none">{vehicle.plate}</h1>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-black">
              Voltar
            </button>
          )}
        </div>
        <div className="mb-5 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-300">Motorista logado</p>
            <p className="font-black">{driverName}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(storageKey);
              setDriverName('');
              setNameInput('');
            }}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-black"
          >
            Trocar motorista
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-bold text-slate-400">{vehicle.brand || '-'} {vehicle.model || ''}</p>
                <h2 className="text-2xl font-black">{vehicle.type || 'Veiculo'} {vehicle.year ? `- ${vehicle.year}` : ''}</h2>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-black ${vehicle.ownership === 'LEASED' ? 'bg-purple-500/20 text-purple-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                {vehicle.ownership === 'LEASED' ? 'LOCADO' : 'PROPRIO'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cards.map(card => (
                <div key={card.label} className="rounded-lg bg-slate-900 border border-white/10 p-4">
                  <div className="text-blue-300 mb-3">{card.icon}</div>
                  <p className="text-[10px] font-black uppercase text-slate-500">{card.label}</p>
                  <p className="text-xl font-black">{card.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-black">Identificacao</h2>
            </div>
            <div className="space-y-3 text-sm">
              <Info label="Frota / Prefixo" value={vehicle.fleetNumber || '-'} />
              <Info label="Chassi" value={vehicle.vin || '-'} />
              <Info label="Renavam" value={vehicle.renavam || '-'} />
              <Info label="Combustivel" value={vehicle.fuelType || '-'} />
              <Info label="Cod. rastreador" value={vehicle.sascarCode || '-'} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-blue-300 mb-4">
              <MapPin className="h-5 w-5" />
              <h2 className="font-black">Ultima posicao</h2>
            </div>
            <p className="text-2xl font-black">{vehicle.lastLocation?.city || vehicle.lastLocation?.address || '-'}</p>
            <p className="text-sm font-bold text-slate-400 mt-1">Atualizado em {formatDate(vehicle.lastLocation?.updatedAt)}</p>
            <p className="text-sm font-bold text-slate-400">Ignicao: {vehicle.ignition ? 'Ligada' : 'Desligada'}</p>
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-amber-300 mb-4">
              <Wrench className="h-5 w-5" />
              <h2 className="font-black">Preventiva</h2>
            </div>
            <p className="text-2xl font-black">{remainingKm > 0 ? `${remainingKm.toLocaleString('pt-BR')} km restantes` : 'Vencida ou nao configurada'}</p>
            <p className="text-sm font-bold text-slate-400 mt-1">Ultima preventiva: {formatDate(vehicle.lastPreventiveDate || lastMaintenance?.completedAt || lastMaintenance?.date)}</p>
            <p className="text-sm font-bold text-slate-400">Intervalo: {(vehicle.revisionIntervalKm || 0).toLocaleString('pt-BR')} km</p>
          </section>
        </div>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 mt-5">
          <div className="flex items-center gap-2 text-emerald-300 mb-4">
            <Calendar className="h-5 w-5" />
            <h2 className="font-black">Agendar servico</h2>
          </div>
          <form onSubmit={handleServiceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de servico</label>
              <input
                value={serviceTitle}
                onChange={event => setServiceTitle(event.target.value)}
                className="w-full p-3 rounded-lg bg-slate-900 border border-white/10 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data desejada</label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={event => setServiceDate(event.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-white/10 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Urgencia</label>
                <select
                  value={urgency}
                  onChange={event => setUrgency(event.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-white/10 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Critica</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">O que precisa ser feito?</label>
              <textarea
                value={serviceDetails}
                onChange={event => setServiceDetails(event.target.value)}
                className="w-full min-h-28 p-3 rounded-lg bg-slate-900 border border-white/10 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Descreva barulho, falha, vazamento, troca, revisao ou qualquer observacao"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button disabled={isSending} className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black flex items-center gap-2">
                <Send className="h-5 w-5" />
                {isSending ? 'Enviando...' : 'Enviar para oficina'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-2">
    <span className="font-bold text-slate-500">{label}</span>
    <span className="font-black text-right break-all">{value}</span>
  </div>
);
