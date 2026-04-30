import React, { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Clock, FileText, MapPin, Paperclip, Phone, Search, Wrench } from 'lucide-react';
import { PublicServiceRequest, ServiceOrder, Vehicle } from '../types';

interface QRServiceRequestsProps {
  requests: PublicServiceRequest[];
  vehicles: Vehicle[];
  onCreateOrder: (request: PublicServiceRequest) => Promise<ServiceOrder | void>;
  onArchive: (request: PublicServiceRequest, reason?: string) => Promise<void>;
  onMarkInAnalysis: (request: PublicServiceRequest) => Promise<void>;
}

const urgencyStyle = (urgency?: string) => {
  if (urgency === 'CRITICA') return 'bg-red-50 text-red-700 border-red-100';
  if (urgency === 'ALTA') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-blue-50 text-blue-700 border-blue-100';
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

export const QRServiceRequests: React.FC<QRServiceRequestsProps> = ({
  requests,
  vehicles,
  onCreateOrder,
  onArchive,
  onMarkInAnalysis
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'PENDENTE' | 'TODAS'>('PENDENTE');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    return requests
      .filter(request => filter === 'TODAS' || request.status === 'PENDENTE' || request.status === 'EM_ANALISE')
      .filter(request => {
        if (!term) return true;
        return request.vehiclePlate?.toUpperCase().includes(term) ||
          request.driverName?.toUpperCase().includes(term) ||
          request.title?.toUpperCase().includes(term);
      });
  }, [requests, searchTerm, filter]);

  const pendingCount = requests.filter(request => request.status === 'PENDENTE').length;
  const analysisCount = requests.filter(request => request.status === 'EM_ANALISE').length;
  const convertedCount = requests.filter(request => request.status === 'CONVERTIDA').length;

  const handleCreateOrder = async (request: PublicServiceRequest) => {
    setBusyId(request.id);
    try {
      await onCreateOrder(request);
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (request: PublicServiceRequest) => {
    const reason = prompt(`Motivo para arquivar a solicitacao de ${request.vehiclePlate}:`);
    if (reason === null) return;
    setBusyId(request.id);
    try {
      await onArchive(request, reason.trim());
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkInAnalysis = async (request: PublicServiceRequest) => {
    setBusyId(request.id);
    try {
      await onMarkInAnalysis(request);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Pendentes</p>
          <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Em analise</p>
          <p className="text-3xl font-black text-blue-600">{analysisCount}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Convertidas em O.S.</p>
          <p className="text-3xl font-black text-emerald-600">{convertedCount}</p>
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Solicitacoes do QR</h2>
            <p className="text-sm font-bold text-slate-500">Pedidos enviados pelos motoristas no portal do veiculo.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar placa, motorista ou servico"
                className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filter}
              onChange={event => setFilter(event.target.value as 'PENDENTE' | 'TODAS')}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white"
            >
              <option value="PENDENTE">Pendentes e em analise</option>
              <option value="TODAS">Todas</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(request => {
            const vehicle = vehicles.find(item => item.id === request.vehicleId || item.plate === request.vehiclePlate);
            const disabled = busyId === request.id || !['PENDENTE', 'EM_ANALISE'].includes(request.status);
            return (
              <div key={request.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xl font-black text-slate-900 dark:text-white">{request.vehiclePlate}</span>
                      <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase ${urgencyStyle(request.urgency)}`}>
                        {request.urgency || 'NORMAL'}
                      </span>
                      <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-slate-500">
                        {request.status}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-800 dark:text-slate-100">{request.title}</p>
                    <p className="text-sm font-bold text-slate-500 mt-1 whitespace-pre-wrap">{request.details}</p>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Motorista</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{request.driverName}</p>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Telefone</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {request.driverPhone || '-'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">KM informado</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                          {request.informedOdometer ? request.informedOdometer.toLocaleString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Situacao</p>
                        <p className={`text-sm font-black ${request.vehicleStopped ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                          {request.vehicleStopped ? 'Veiculo parado' : 'Rodando'}
                        </p>
                      </div>
                    </div>

                    {request.driverLocation && (
                      <p className="mt-2 text-xs font-bold text-slate-500 flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> Local informado: {request.driverLocation}
                      </p>
                    )}

                    {request.checklist && (
                      <div className={`mt-3 rounded-lg border p-3 ${request.checklist.status === 'BLOQUEADO' ? 'bg-red-50 border-red-200 text-red-700' : request.checklist.status === 'ATENCAO' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        <p className="text-[10px] font-black uppercase">Checklist pre-viagem: {request.checklist.status || 'LIBERADO'}</p>
                        <p className="text-xs font-bold mt-1">
                          Alertas: {request.checklist.criticalItems?.length ? request.checklist.criticalItems.join(', ') : 'nenhum'}
                        </p>
                        {request.checklist.observations && (
                          <p className="text-xs font-bold mt-1">Obs: {request.checklist.observations}</p>
                        )}
                      </div>
                    )}

                    {request.attachments && request.attachments.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {request.attachments.map((attachment, index) => (
                          <a
                            key={`${attachment.name}-${index}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-300"
                          >
                            {attachment.type?.startsWith('image/') ? (
                              <img src={attachment.url} alt={attachment.name} className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <FileText className="h-5 w-5" />
                              </div>
                            )}
                            <span className="truncate">{attachment.name}</span>
                            <Paperclip className="h-3 w-3 ml-auto text-slate-400" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Recebido em {formatDate(request.createdAt)}</span>
                      {request.problemType ? <span>Tipo: {request.problemType}</span> : null}
                      {vehicle?.odometer ? <span>KM do cadastro: {vehicle.odometer.toLocaleString('pt-BR')}</span> : null}
                      {request.linkedServiceOrderNumber ? <span>O.S. gerada: #{request.linkedServiceOrderNumber}</span> : null}
                      {request.archiveReason ? <span>Arquivo: {request.archiveReason}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleMarkInAnalysis(request)}
                      disabled={busyId === request.id || request.status !== 'PENDENTE'}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      Em analise
                    </button>
                    <button
                      onClick={() => handleCreateOrder(request)}
                      disabled={disabled}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2"
                    >
                      <Wrench className="h-4 w-4" />
                      Gerar O.S.
                    </button>
                    <button
                      onClick={() => handleArchive(request)}
                      disabled={disabled}
                      className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-sm font-black flex items-center justify-center gap-2"
                    >
                      <Archive className="h-4 w-4" />
                      Arquivar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-black text-slate-700 dark:text-slate-200">Nenhuma solicitacao encontrada.</p>
              <p className="text-sm font-bold text-slate-500">Quando o motorista enviar pelo QR, aparecera aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
