import React from 'react';
import { Activity, Fuel, Gauge, MapPin, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { FuelEntry, ServiceOrder, Vehicle } from '../types';
import { calculateRollingFuelEfficiency } from '../lib/fuelUtils';

interface VehicleRGPublicProps {
  vehicle?: Vehicle;
  fuelEntries: FuelEntry[];
  serviceOrders: ServiceOrder[];
  onBack?: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

export const VehicleRGPublic: React.FC<VehicleRGPublicProps> = ({ vehicle, fuelEntries, serviceOrders, onBack }) => {
  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Truck className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <h1 className="text-2xl font-black mb-2">RG do veiculo nao encontrado</h1>
          <p className="text-slate-400 font-bold">Confira se o QR Code pertence a esta frota ou se o veiculo ainda esta cadastrado.</p>
          {onBack && (
            <button onClick={onBack} className="mt-6 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black">
              Voltar ao GM Control
            </button>
          )}
        </div>
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
