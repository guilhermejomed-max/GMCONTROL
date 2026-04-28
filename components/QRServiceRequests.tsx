import React, { useMemo, useState } from 'react';
import { Archive, Calendar, CheckCircle2, Clock, Search, Wrench } from 'lucide-react';
import { PublicServiceRequest, ServiceOrder, Vehicle } from '../types';

interface QRServiceRequestsProps {
  requests: PublicServiceRequest[];
  vehicles: Vehicle[];
  onCreateOrder: (request: PublicServiceRequest) => Promise<ServiceOrder | void>;
  onArchive: (request: PublicServiceRequest) => Promise<void>;
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

export const QRServiceRequests: React.FC<QRServiceRequestsProps> = ({ requests, vehicles, onCreateOrder, onArchive }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'PENDENTE' | 'TODAS'>('PENDENTE');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    return requests
      .filter(request => filter === 'TODAS' || request.status === 'PENDENTE')
      .filter(request => {
        if (!term) return true;
        return request.vehiclePlate?.toUpperCase().includes(term) ||
          request.driverName?.toUpperCase().includes(term) ||
          request.title?.toUpperCase().includes(term);
      });
  }, [requests, searchTerm, filter]);

  const pendingCount = requests.filter(request => request.status === 'PENDENTE').length;
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
    if (!confirm(`Arquivar solicitação de ${request.vehiclePlate}?`)) return;
    setBusyId(request.id);
    try {
      await onArchive(request);
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
          <p className="text-[10px] font-black uppercase text-slate-400">Convertidas em O.S.</p>
          <p className="text-3xl font-black text-emerald-600">{convertedCount}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Total recebido</p>
          <p className="text-3xl font-black text-blue-600">{requests.length}</p>
        </div>
      </div>

      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Solicitações do QR</h2>
            <p className="text-sm font-bold text-slate-500">Pedidos enviados pelos motoristas no RG digital do veículo.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar placa, motorista ou serviço"
                className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filter}
              onChange={event => setFilter(event.target.value as 'PENDENTE' | 'TODAS')}
              className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold dark:text-white"
            >
              <option value="PENDENTE">Pendentes</option>
              <option value="TODAS">Todas</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(request => {
            const vehicle = vehicles.find(item => item.id === request.vehicleId || item.plate === request.vehiclePlate);
            const disabled = busyId === request.id || request.status !== 'PENDENTE';
            return (
              <div key={request.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="min-w-0">
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
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Recebido em {formatDate(request.createdAt)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Data desejada {formatDate(request.preferredDate)}</span>
                      <span>Motorista: {request.driverName}</span>
                      {vehicle?.odometer ? <span>KM atual: {vehicle.odometer.toLocaleString('pt-BR')}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0">
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
              <p className="font-black text-slate-700 dark:text-slate-200">Nenhuma solicitação encontrada.</p>
              <p className="text-sm font-bold text-slate-500">Quando o motorista enviar pelo QR, aparecerá aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
