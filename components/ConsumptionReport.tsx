import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownUp, Gauge, Fuel, TrendingDown, Wallet } from 'lucide-react';
import { FuelEntry, ServiceOrder, Vehicle } from '../types';
import { calculateRollingFuelEfficiency } from '../lib/fuelUtils';

interface ConsumptionReportProps {
  vehicles: Vehicle[];
  fuelEntries: FuelEntry[];
  serviceOrders: ServiceOrder[];
}

type SortKey = 'fuelAverage' | 'difference' | 'costPerKm' | 'alerts';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const ConsumptionReport: React.FC<ConsumptionReportProps> = ({ vehicles, fuelEntries, serviceOrders }) => {
  const [sortKey, setSortKey] = useState<SortKey>('fuelAverage');
  const [searchTerm, setSearchTerm] = useState('');

  const rows = useMemo(() => {
    return vehicles.map(vehicle => {
      const entries = fuelEntries.filter(entry => entry.vehicleId === vehicle.id);
      const rolling = calculateRollingFuelEfficiency(entries, 1000);
      const telemetryAverage = Number(vehicle.telemetryRollingAvgKml || 0);
      const differencePercent = rolling.average > 0 && telemetryAverage > 0
        ? Math.abs(((rolling.average - telemetryAverage) / telemetryAverage) * 100)
        : 0;
      const fuelCost = entries.reduce((sum, entry) => sum + (Number(entry.totalCost) || 0), 0);
      const odometers = entries.map(entry => Number(entry.odometer) || 0).filter(value => value > 0);
      const fuelDistance = odometers.length > 1 ? Math.max(...odometers) - Math.min(...odometers) : 0;
      const maintenanceCost = serviceOrders
        .filter(order => order.vehicleId === vehicle.id && order.status === 'CONCLUIDO')
        .reduce((sum, order) => {
          const partsCost = (order.parts || []).reduce((partSum, part) => partSum + ((Number(part.quantity) || 0) * (Number(part.unitCost) || 0)), 0);
          return sum + (Number(order.totalCost) || ((Number(order.laborCost) || 0) + partsCost));
        }, 0);
      const costKmBase = fuelDistance || Number(vehicle.odometer) || 0;

      return {
        vehicle,
        fuelAverage: rolling.average,
        telemetryAverage,
        differencePercent,
        fuelCost,
        maintenanceCost,
        totalCost: fuelCost + maintenanceCost,
        costPerKm: costKmBase > 0 ? (fuelCost + maintenanceCost) / costKmBase : 0,
        alerts: rolling.alerts.length,
        usedFillUps: rolling.usedFillUps,
        discardedSegments: rolling.discardedSegments
      };
    }).filter(row => {
      const term = searchTerm.trim().toUpperCase();
      return !term || row.vehicle.plate?.toUpperCase().includes(term) || row.vehicle.model?.toUpperCase().includes(term);
    }).sort((a, b) => {
      if (sortKey === 'fuelAverage') return (a.fuelAverage || 999) - (b.fuelAverage || 999);
      if (sortKey === 'difference') return b.differencePercent - a.differencePercent;
      if (sortKey === 'costPerKm') return b.costPerKm - a.costPerKm;
      return b.alerts - a.alerts;
    });
  }, [vehicles, fuelEntries, serviceOrders, sortKey, searchTerm]);

  const worstAverage = rows.find(row => row.fuelAverage > 0);
  const biggestDifference = [...rows].sort((a, b) => b.differencePercent - a.differencePercent)[0];
  const highestCost = [...rows].sort((a, b) => b.costPerKm - a.costPerKm)[0];
  const totalAlerts = rows.reduce((sum, row) => sum + row.alerts, 0);

  const sortButtons: Array<{ key: SortKey; label: string; icon: React.ReactNode }> = [
    { key: 'fuelAverage', label: 'Pior media', icon: <TrendingDown className="h-4 w-4" /> },
    { key: 'difference', label: 'Maior diferenca', icon: <ArrowDownUp className="h-4 w-4" /> },
    { key: 'costPerKm', label: 'Maior custo/km', icon: <Wallet className="h-4 w-4" /> },
    { key: 'alerts', label: 'Mais alertas', icon: <AlertTriangle className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Pior media abastecimento</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{worstAverage?.fuelAverage ? worstAverage.fuelAverage.toFixed(2) : '0,00'} km/l</p>
          <p className="text-xs font-bold text-slate-500">{worstAverage?.vehicle.plate || '-'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Maior diferenca</p>
          <p className="text-2xl font-black text-amber-600">{biggestDifference?.differencePercent.toFixed(1) || '0,0'}%</p>
          <p className="text-xs font-bold text-slate-500">{biggestDifference?.vehicle.plate || '-'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Maior custo por km</p>
          <p className="text-2xl font-black text-red-600">{money(highestCost?.costPerKm || 0)}</p>
          <p className="text-xs font-bold text-slate-500">{highestCost?.vehicle.plate || '-'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[10px] font-black uppercase text-slate-400">Alertas de consumo</p>
          <p className="text-2xl font-black text-blue-600">{totalAlerts}</p>
          <p className="text-xs font-bold text-slate-500">abastecimento, KM e trechos</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Relatorio de Consumo</h2>
            <p className="text-sm font-bold text-slate-500">Ranking por media, diferenca de telemetria, custo por km e alertas.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar placa ou modelo"
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold dark:text-white outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {sortButtons.map(button => (
                <button
                  key={button.key}
                  onClick={() => setSortKey(button.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-black flex items-center gap-2 border ${sortKey === button.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                >
                  {button.icon}
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 pr-3">Veiculo</th>
                <th className="py-3 px-3">Media abastecimento</th>
                <th className="py-3 px-3">Media telemetria</th>
                <th className="py-3 px-3">Diferenca</th>
                <th className="py-3 px-3">Custo combustivel</th>
                <th className="py-3 px-3">Custo total/km</th>
                <th className="py-3 px-3">Abast. usados</th>
                <th className="py-3 pl-3">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.vehicle.id} className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                  <td className="py-3 pr-3 font-black">
                    {row.vehicle.plate}
                    <span className="block text-xs font-bold text-slate-400">{row.vehicle.model || row.vehicle.type || '-'}</span>
                  </td>
                  <td className="py-3 px-3 font-black">{row.fuelAverage > 0 ? row.fuelAverage.toFixed(2) : '-'} km/l</td>
                  <td className="py-3 px-3">{row.telemetryAverage > 0 ? row.telemetryAverage.toFixed(2) : '-'} km/l</td>
                  <td className={`py-3 px-3 font-black ${row.differencePercent >= 30 ? 'text-red-600' : row.differencePercent >= 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {row.differencePercent > 0 ? `${row.differencePercent.toFixed(1)}%` : '-'}
                  </td>
                  <td className="py-3 px-3">{money(row.fuelCost)}</td>
                  <td className="py-3 px-3 font-black">{money(row.costPerKm)}</td>
                  <td className="py-3 px-3">{row.usedFillUps}</td>
                  <td className="py-3 pl-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-black ${row.alerts > 0 ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                      {row.alerts > 0 ? <AlertTriangle className="h-3 w-3" /> : <Gauge className="h-3 w-3" />}
                      {row.alerts}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-bold">
                    <Fuel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum veiculo encontrado.
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
