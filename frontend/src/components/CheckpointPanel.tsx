import { useState, useMemo } from 'react';
import type { Route, Checkpoint, RiskLabel } from '../types';
import { riskBadgeClass } from '../utils/format';
import { format } from 'date-fns';

interface Props {
  route: Route;
}

export default function CheckpointPanel({ route }: Props) {
  const [filterRisk, setFilterRisk] = useState<string>('ALL');

  const filteredCheckpoints = useMemo(() => {
    if (filterRisk === 'ALL') return route.checkpoints;
    return route.checkpoints.filter((cp) => cp.risk_label.toUpperCase() === filterRisk);
  }, [route.checkpoints, filterRisk]);

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Subheader and Quick Risk Filters */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pb-1 border-b border-gray-100 flex-shrink-0">
        <span className="text-[11px] text-gray-500 font-medium">
          Sampled every <strong className="text-gray-700">{route.interval_miles || 25} mi</strong>
        </span>

        {/* Filter Pills */}
        <div className="flex items-center gap-1">
          {['ALL', 'HIGH', 'SEVERE', 'NO TRAVEL'].map((r) => {
            const isAll = r === 'ALL';
            const count = isAll
              ? route.checkpoints.length
              : route.checkpoints.filter((c) => c.risk_label.toUpperCase() === r).length;

            if (!isAll && count === 0) return null;

            return (
              <button
                key={r}
                type="button"
                onClick={() => setFilterRisk(r)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                  filterRisk === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isAll ? 'All' : r}: {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fully Scrollable Table with Sticky Header */}
      <div className="flex-1 min-h-0 overflow-auto border border-gray-200 rounded-lg shadow-xs bg-white">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="sticky top-0 bg-gray-100/95 backdrop-blur-md z-10 text-gray-700 shadow-xs border-b border-gray-200">
            <tr>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">Mile</th>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">ETA</th>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">Wind</th>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">Rain</th>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">Snow</th>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">Temp</th>
              <th className="px-2.5 py-2 font-bold whitespace-nowrap">Risk Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCheckpoints.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">
                  No checkpoints match the selected filter.
                </td>
              </tr>
            ) : (
              filteredCheckpoints.map((cp) => (
                <CheckpointRow key={cp.index} cp={cp} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckpointRow({ cp }: { cp: Checkpoint }) {
  const eta = new Date(cp.arrival_dt);
  const rainIn = (cp.rain_in_per_hr ?? cp.rain_mm_per_hr / 25.4).toFixed(2);
  const snowIn = (cp.snow_in_per_hr ?? cp.snow_mm_per_hr / 25.4).toFixed(2);
  const tempF = Math.round((cp.temperature_c * 9) / 5 + 32);

  const hasLoadWarning = cp.load_warnings && cp.load_warnings.length > 0;

  return (
    <tr className="hover:bg-blue-50/60 transition-colors">
      <td className="px-2.5 py-2 font-mono font-semibold text-gray-800 whitespace-nowrap">
        {cp.distance_miles.toFixed(0)} mi
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap text-gray-600 font-medium">
        {format(eta, 'MMM d, HH:mm')}
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap">
        <span
          className={
            cp.wind_mph >= 45
              ? 'font-bold text-red-600'
              : cp.wind_mph >= 35
              ? 'font-semibold text-orange-600'
              : 'text-gray-700'
          }
        >
          {cp.wind_mph.toFixed(0)} mph
        </span>
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap">
        {Number(rainIn) > 0 ? (
          <span className="font-semibold text-blue-700">{rainIn}"</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap">
        {Number(snowIn) > 0 ? (
          <span className="font-bold text-indigo-700">{snowIn}"</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap text-gray-700">
        {cp.temperature_c.toFixed(0)}°C <span className="text-gray-400 text-[10px]">({tempF}°F)</span>
      </td>
      <td className="px-2.5 py-2 whitespace-nowrap">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${riskBadgeClass(
              cp.risk_label as RiskLabel
            )}`}
          >
            {cp.risk_label}
          </span>
          {hasLoadWarning && (
            <span
              className="text-[9px] text-red-700 font-bold leading-tight"
              title={cp.load_warnings?.join(' • ')}
            >
              ⚠️ Load Rule
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
