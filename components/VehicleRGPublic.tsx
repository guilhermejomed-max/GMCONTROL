import React, { useState } from 'react';
import { Activity, Calendar, CheckCircle2, FileText, Fuel, Gauge, Image as ImageIcon, LogIn, MapPin, Paperclip, Send, ShieldCheck, Trash2, Truck, User, Wrench } from 'lucide-react';
import { FuelEntry, ServiceOrder, Vehicle } from '../types';
import { calculateRollingFuelEfficiency } from '../lib/fuelUtils';
import { storageService } from '../services/storageService';

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
    problemType?: string;
    driverPhone?: string;
    informedOdometer?: number;
    vehicleStopped?: boolean;
    driverLocation?: string;
    preferredDate: string;
    urgency: string;
    checklist?: {
      tiresOk?: boolean;
      lightsOk?: boolean;
      brakesOk?: boolean;
      leaksOk?: boolean;
      documentsOk?: boolean;
      loadOk?: boolean;
      observations?: string;
      criticalItems?: string[];
      status?: 'LIBERADO' | 'ATENCAO' | 'BLOQUEADO';
    };
    attachments?: { name: string; url: string; type?: string }[];
  }) => Promise<void>;
}

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const Field: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-800 break-words">{value || '-'}</p>
  </div>
);

export const VehicleRGPublic: React.FC<VehicleRGPublicProps> = ({
  vehicle,
  fuelEntries,
  serviceOrders,
  onBack,
  isLoading,
  error,
  onCreateServiceRequest
}) => {
  const storageKey = vehicle?.id ? `gmcontrol-rg-driver-${vehicle.id}` : 'gmcontrol-rg-driver';
  const [driverName, setDriverName] = useState(() => localStorage.getItem(storageKey) || '');
  const [nameInput, setNameInput] = useState(() => localStorage.getItem(storageKey) || '');
  const [serviceTitle, setServiceTitle] = useState('Revisao solicitada pelo motorista');
  const [problemType, setProblemType] = useState('REVISAO');
  const [driverPhone, setDriverPhone] = useState('');
  const [informedOdometer, setInformedOdometer] = useState('');
  const [vehicleStopped, setVehicleStopped] = useState(false);
  const [driverLocation, setDriverLocation] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [urgency, setUrgency] = useState('NORMAL');
  const [serviceDetails, setServiceDetails] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string; type?: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [checklist, setChecklist] = useState({
    tiresOk: true,
    lightsOk: true,
    brakesOk: true,
    leaksOk: true,
    documentsOk: true,
    loadOk: true,
    observations: ''
  });
  const [isChecklistStarted, setIsChecklistStarted] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-lg bg-white border border-slate-200 p-6 text-center shadow-sm">
          <Truck className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <h1 className="text-xl font-black text-slate-900">Carregando RG</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">Buscando os dados do veiculo.</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 p-6 text-center shadow-sm">
          <Truck className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">Portal do veiculo nao encontrado</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">{error || 'Confira se o QR Code foi gerado novamente no cadastro do veiculo.'}</p>
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

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remaining = Math.max(0, 4 - attachments.length);
    const selected = files.slice(0, remaining).filter(file => file.size <= 8 * 1024 * 1024);
    if (selected.length < files.length) {
      alert('Limite: ate 4 anexos, com ate 8 MB cada.');
    }

    try {
      const uploaded = await Promise.all(selected.map(async file => {
        const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
        const path = `public-service-requests/${vehicle?.id || vehicle?.plate || 'vehicle'}/${Date.now()}_${safeName}`;
        const url = await storageService.uploadFile(path, file);
        const currentInlineSize = attachments.reduce((sum, item) => sum + (item.url.startsWith('data:') ? item.url.length : 0), 0);
        if (url.startsWith('data:') && currentInlineSize + url.length > 700000) {
          throw new Error('Arquivo muito grande para salvar sem Storage. Tente uma imagem menor.');
        }
        return { name: file.name, type: file.type, url };
      }));
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (error: any) {
      alert(error?.message || 'Nao foi possivel anexar o arquivo. Tente uma imagem menor.');
    } finally {
      event.target.value = '';
    }
  };

  const handleServiceSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onCreateServiceRequest || !driverName.trim()) return;
    const hasChecklistAlert = !checklist.tiresOk || !checklist.lightsOk || !checklist.brakesOk || !checklist.leaksOk || !checklist.documentsOk || !checklist.loadOk;
    if (!serviceTitle.trim() || (!serviceDetails.trim() && !hasChecklistAlert)) {
      alert('Informe o tipo de servico e descreva o que precisa ser feito.');
      return;
    }

    setIsSending(true);
    try {
      const criticalItems = [
        !checklist.tiresOk ? 'Pneus' : '',
        !checklist.brakesOk ? 'Freios' : '',
        !checklist.leaksOk ? 'Vazamentos' : '',
        !checklist.lightsOk ? 'Luzes/eletrica' : '',
        !checklist.documentsOk ? 'Documentacao' : '',
        !checklist.loadOk ? 'Carga/amarração' : ''
      ].filter(Boolean);
      const checklistStatus = criticalItems.some(item => ['Pneus', 'Freios', 'Vazamentos'].includes(item))
        ? 'BLOQUEADO'
        : criticalItems.length > 0
          ? 'ATENCAO'
          : 'LIBERADO';
      const checklistSummary = [
        '',
        'CHECKLIST PRE-VIAGEM',
        `Status: ${checklistStatus}`,
        `Itens com alerta: ${criticalItems.length ? criticalItems.join(', ') : 'nenhum'}`,
        checklist.observations ? `Observacoes do checklist: ${checklist.observations}` : ''
      ].filter(Boolean).join('\n');

      await onCreateServiceRequest({
        driverName: driverName.trim(),
        title: serviceTitle.trim(),
        details: `${serviceDetails.trim() || 'Checklist com alerta informado pelo motorista.'}${checklistSummary}`,
        problemType,
        driverPhone: driverPhone.trim(),
        informedOdometer: informedOdometer ? Number(informedOdometer) : undefined,
        vehicleStopped: vehicleStopped || checklistStatus === 'BLOQUEADO',
        driverLocation: driverLocation.trim(),
        preferredDate: serviceDate,
        urgency: checklistStatus === 'BLOQUEADO' ? 'CRITICA' : checklistStatus === 'ATENCAO' && urgency === 'NORMAL' ? 'ALTA' : urgency,
        checklist: {
          ...checklist,
          criticalItems,
          status: checklistStatus
        },
        attachments
      });
      setServiceTitle('Revisao solicitada pelo motorista');
      setServiceDate(new Date().toISOString().split('T')[0]);
      setUrgency('NORMAL');
      setServiceDetails('');
      setProblemType('REVISAO');
      setDriverPhone('');
      setInformedOdometer('');
      setVehicleStopped(false);
      setDriverLocation('');
      setAttachments([]);
      setChecklist({
        tiresOk: true,
        lightsOk: true,
        brakesOk: true,
        leaksOk: true,
        documentsOk: true,
        loadOk: true,
        observations: ''
      });
      alert('Solicitacao enviada para a oficina.');
    } catch (error: any) {
      alert(error?.message || 'Nao foi possivel enviar a solicitacao.');
    } finally {
      setIsSending(false);
    }
  };

  if (!driverName) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <form onSubmit={handleDriverLogin} className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white p-6">
            <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center mb-5">
              <Truck className="h-8 w-8" />
            </div>
            <p className="text-xs font-black uppercase text-blue-300">Portal do motorista</p>
            <h1 className="text-4xl font-black leading-none mt-1">{vehicle.plate}</h1>
            <p className="text-sm font-bold text-slate-300 mt-3">{vehicle.brand || '-'} {vehicle.model || ''}</p>
          </div>
          <div className="p-6">
            <label className="block text-xs font-black uppercase text-slate-500 mb-2">Nome do motorista</label>
            <div className="relative mb-4">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                value={nameInput}
                onChange={event => setNameInput(event.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite seu nome"
                autoFocus
              />
            </div>
            <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5" />
              Entrar no portal
            </button>
          </div>
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
  const preventiveStatus = remainingKm > 0 ? `${remainingKm.toLocaleString('pt-BR')} km restantes` : 'Vencida ou nao configurada';
  const blockedReasons = [
    remainingKm <= 0 ? 'Preventiva vencida' : '',
    openOrders > 0 ? `${openOrders} O.S. aberta(s)` : '',
    vehicle.lastLocation?.updatedAt && new Date(vehicle.lastLocation.updatedAt).getTime() < Date.now() - 24 * 60 * 60 * 1000 ? 'Rastreador sem atualizacao recente' : ''
  ].filter(Boolean);
  const driverPanelStatus = blockedReasons.length > 0 ? 'ATENCAO' : 'LIBERADO';
  const checklistCritical = !checklist.tiresOk || !checklist.brakesOk || !checklist.leaksOk;
  const checklistWarnings = [checklist.tiresOk, checklist.lightsOk, checklist.brakesOk, checklist.leaksOk, checklist.documentsOk, checklist.loadOk].filter(item => !item).length;

  const metricCards = [
    { label: 'Hodometro', value: `${(vehicle.odometer || 0).toLocaleString('pt-BR')} km`, icon: Gauge, color: 'text-blue-600 bg-blue-50' },
    { label: 'Media abastecimento', value: rollingFuel.average > 0 ? `${rollingFuel.average.toFixed(2)} km/l` : '-', icon: Fuel, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Media telemetria', value: vehicle.telemetryRollingAvgKml ? `${vehicle.telemetryRollingAvgKml.toFixed(2)} km/l` : '-', icon: Activity, color: 'text-violet-600 bg-violet-50' },
    { label: 'OS abertas', value: openOrders.toString(), icon: Wrench, color: openOrders > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-100' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-blue-600 flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-300">Portal do motorista</p>
                <h1 className="text-3xl md:text-5xl font-black leading-none">{vehicle.plate}</h1>
              </div>
            </div>
            {onBack && (
              <button onClick={onBack} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-black">
                Voltar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <p className="text-lg font-black">{vehicle.brand || '-'} {vehicle.model || ''}</p>
              <p className="text-sm font-bold text-slate-400">{vehicle.type || 'Veiculo'} {vehicle.year ? `- ${vehicle.year}` : ''}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-3 min-w-56">
              <p className="text-[10px] font-black uppercase text-slate-400">Motorista</p>
              <div className="flex items-center justify-between gap-3">
                <p className="font-black truncate">{driverName}</p>
                <button
                  onClick={() => {
                    localStorage.removeItem(storageKey);
                    setDriverName('');
                    setNameInput('');
                  }}
                  className="text-[10px] font-black text-blue-300 hover:text-blue-200"
                >
                  Trocar
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <section className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4">
          <button
            type="button"
            onClick={() => {
              setIsChecklistStarted(true);
              window.setTimeout(() => document.getElementById('checklist-pre-viagem')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }}
            className="text-left rounded-lg border border-blue-200 bg-blue-600 p-5 text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-blue-100">Antes de sair</p>
                <h2 className="mt-1 text-2xl font-black">Iniciar check-list</h2>
                <p className="mt-2 text-sm font-bold text-blue-100">Confirme pneus, freios, luzes, vazamentos, documentos e carga.</p>
              </div>
              <ShieldCheck className="h-9 w-9 text-blue-100" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => document.getElementById('solicitar-servico')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="text-left rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Precisa de apoio?</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Solicitar manutencao</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">Abra uma solicitacao para a oficina com fotos e observacoes.</p>
              </div>
              <Wrench className="h-8 w-8 text-slate-500" />
            </div>
          </button>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metricCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-[10px] font-black uppercase text-slate-400">{card.label}</p>
                <p className="text-lg font-black text-slate-900">{card.value}</p>
              </div>
            );
          })}
        </section>

        <section className={`rounded-lg border p-5 shadow-sm ${driverPanelStatus === 'LIBERADO' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500">Painel do motorista</p>
              <h2 className={`text-2xl font-black ${driverPanelStatus === 'LIBERADO' ? 'text-emerald-800' : 'text-amber-800'}`}>
                Veiculo {driverPanelStatus === 'LIBERADO' ? 'liberado' : 'com pendencias'}
              </h2>
              <p className="text-sm font-bold text-slate-600">
                {blockedReasons.length ? blockedReasons.join(' | ') : 'Sem bloqueios operacionais encontrados no RG.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm font-black">
              <div className="rounded-lg bg-white/80 border border-white p-3">
                <p className="text-[10px] uppercase text-slate-400">Proxima revisao</p>
                <p>{nextPreventiveKm > 0 ? `${nextPreventiveKm.toLocaleString('pt-BR')} km` : '-'}</p>
              </div>
              <div className="rounded-lg bg-white/80 border border-white p-3">
                <p className="text-[10px] uppercase text-slate-400">O.S. abertas</p>
                <p>{openOrders}</p>
              </div>
            </div>
          </div>
          {vehicleOrders.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {vehicleOrders.slice(0, 4).map(order => (
                <div key={order.id} className="rounded-lg bg-white/80 border border-white p-3">
                  <p className="text-xs font-black text-slate-900">{order.title}</p>
                  <p className="text-[11px] font-bold text-slate-500">Status: {order.status} | {formatDate(order.date || order.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="font-black text-slate-900">Identificacao</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Frota / Prefixo" value={vehicle.fleetNumber || '-'} />
              <Field label="Combustivel" value={vehicle.fuelType || '-'} />
              <Field label="Chassi" value={vehicle.vin || '-'} />
              <Field label="Renavam" value={vehicle.renavam || '-'} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h2 className="font-black text-slate-900">Operacao</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Ultima posicao</p>
                <p className="mt-1 text-xl font-black text-slate-900">{vehicle.lastLocation?.city || vehicle.lastLocation?.address || '-'}</p>
                <p className="text-xs font-bold text-slate-500">Atualizado em {formatDate(vehicle.lastLocation?.updatedAt)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ignicao" value={vehicle.ignition ? 'Ligada' : 'Desligada'} />
                <Field label="Preventiva" value={preventiveStatus} />
              </div>
            </div>
          </div>
        </section>

        <section id="checklist-pre-viagem" className={`rounded-lg border bg-white p-5 shadow-sm ${checklistCritical ? 'border-red-200' : checklistWarnings > 0 ? 'border-amber-200' : 'border-blue-100'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-5 w-5 ${checklistCritical ? 'text-red-600' : checklistWarnings > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
              <div>
                <h2 className="font-black text-slate-900">Checklist pre-viagem</h2>
                <p className="text-sm font-bold text-slate-500">Marque somente o que estiver em condicao de rodagem.</p>
              </div>
            </div>
            <span className={`px-3 py-2 rounded-lg text-xs font-black ${checklistCritical ? 'bg-red-50 text-red-700' : checklistWarnings > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {checklistCritical ? 'BLOQUEIA SAIDA' : checklistWarnings > 0 ? 'ATENCAO' : 'LIBERADO'}
            </span>
          </div>
          {!isChecklistStarted ? (
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-bold text-blue-900">O check-list ainda nao foi iniciado para esta viagem.</p>
              <button
                type="button"
                onClick={() => setIsChecklistStarted(true)}
                className="mt-4 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-black inline-flex items-center gap-2"
              >
                <ShieldCheck className="h-5 w-5" />
                Iniciar check-list
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  ['tiresOk', 'Pneus em condicao'],
                  ['lightsOk', 'Luzes e eletrica ok'],
                  ['brakesOk', 'Freios ok'],
                  ['leaksOk', 'Sem vazamentos'],
                  ['documentsOk', 'Documentacao ok'],
                  ['loadOk', 'Carga/amarracao ok']
                ].map(([key, label]) => (
                  <label key={key} className={`rounded-lg border p-3 text-sm font-black cursor-pointer ${checklist[key as keyof typeof checklist] ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[key as keyof typeof checklist])}
                      onChange={event => setChecklist(prev => ({ ...prev, [key]: event.target.checked }))}
                      className="mr-2"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <textarea
                value={checklist.observations}
                onChange={event => setChecklist(prev => ({ ...prev, observations: event.target.value }))}
                className="mt-3 w-full min-h-20 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observacoes do checklist, se houver"
              />
            </>
          )}
        </section>

        <section id="solicitar-servico" className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-black text-slate-900">Solicitar manutencao</h2>
                <p className="text-sm font-bold text-slate-500">A solicitacao sera enviada para a oficina.</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              Motorista identificado
            </div>
          </div>

          <form onSubmit={handleServiceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de problema</label>
              <select
                value={problemType}
                onChange={event => {
                  setProblemType(event.target.value);
                  const labels: Record<string, string> = {
                    PNEU: 'Problema em pneu',
                    FREIO: 'Problema no freio',
                    LUZ: 'Problema em luz/eletrica',
                    VAZAMENTO: 'Vazamento',
                    MOTOR: 'Problema no motor',
                    DOCUMENTACAO: 'Documentacao',
                    REVISAO: 'Revisao solicitada pelo motorista',
                    OUTRO: 'Solicitacao do motorista'
                  };
                  setServiceTitle(labels[event.target.value] || 'Solicitacao do motorista');
                }}
                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="REVISAO">Revisao</option>
                <option value="PNEU">Pneu</option>
                <option value="FREIO">Freio</option>
                <option value="LUZ">Luz / eletrica</option>
                <option value="VAZAMENTO">Vazamento</option>
                <option value="MOTOR">Motor</option>
                <option value="DOCUMENTACAO">Documentacao</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de servico</label>
              <input
                value={serviceTitle}
                onChange={event => setServiceTitle(event.target.value)}
                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Telefone</label>
                <input
                  value={driverPhone}
                  onChange={event => setDriverPhone(event.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">KM atual</label>
                <input
                  type="number"
                  value={informedOdometer}
                  onChange={event => setInformedOdometer(event.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={(vehicle.odometer || 0).toString()}
                />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Local atual informado pelo motorista</label>
                <input
                  value={driverLocation}
                  onChange={event => setDriverLocation(event.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: base, cliente, rodovia, cidade"
                />
              </div>
              <label className={`px-4 py-3 rounded-lg border text-sm font-black cursor-pointer ${vehicleStopped ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <input type="checkbox" checked={vehicleStopped} onChange={event => setVehicleStopped(event.target.checked)} className="mr-2" />
                Veiculo parado?
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Urgencia</label>
              <select
                value={urgency}
                onChange={event => setUrgency(event.target.value)}
                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Critica</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">O que precisa ser feito?</label>
              <textarea
                value={serviceDetails}
                onChange={event => setServiceDetails(event.target.value)}
                className="w-full min-h-28 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Descreva barulho, falha, vazamento, troca, revisao ou qualquer observacao"
              />
            </div>
            <div className="md:col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500">Anexos / fotos</p>
                  <p className="text-xs font-bold text-slate-500">Adicione foto da avaria, nota, documento ou comprovante.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-slate-100">
                    <ImageIcon className="h-4 w-4" />
                    Tirar foto
                    <input type="file" accept="image/*" capture="environment" onChange={handleAttachmentChange} className="hidden" />
                  </label>
                  <label className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-black flex items-center gap-2 cursor-pointer hover:bg-slate-100">
                    <Paperclip className="h-4 w-4" />
                    Anexar
                    <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" multiple onChange={handleAttachmentChange} className="hidden" />
                  </label>
                </div>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((attachment, index) => (
                    <div key={`${attachment.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2">
                      {attachment.type?.startsWith('image/') ? (
                        <img src={attachment.url} alt={attachment.name} className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <span className="flex-1 min-w-0 text-xs font-bold text-slate-700 truncate">{attachment.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button disabled={isSending} className="w-full sm:w-auto px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2">
                <Send className="h-5 w-5" />
                {isSending ? 'Enviando...' : 'Enviar para oficina'}
              </button>
            </div>
          </form>
        </section>

        <p className="pb-6 text-center text-[11px] font-bold text-slate-400">
          Portal do motorista atualizado em {formatDate((vehicle as any).updatedAt)}.
        </p>
      </main>
    </div>
  );
};
