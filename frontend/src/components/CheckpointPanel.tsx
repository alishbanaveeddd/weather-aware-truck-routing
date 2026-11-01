import type { Route, Checkpoint } from '../types';
import { riskBadgeClass } from '../utils/format';
import { format } from 'date-fns';

interface Props {
  route: Route;
}

export default function CheckpointPanel({ route }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500 flex justify-between items-center px-1">
        <span>Sampled every {route.interval_miles || 25} miles</span>
        <span>{route.checkpoints.length} Checkpoints total</span>
      </div>

      <div className="overflow-x-auto max-h-[380px] border border-gray-200 rounded-lg shadow-inner bg-white">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="sticky top-0 bg-gray-100/95 backdrop-blur-sm z-10 text-gray-700 shadow-sm">
            <tr>
              <th className="px-2 py-2 font-bold border-b">Mile</th>
              <th className="px-2 py-2 font-bold border-b">ETA</th>
              <th className="px-2 py-2 font-bold border-b">Wind</th>
              <th className="px-2 py-2 font-bold border-b">Rain</th>
              <th className="px-2 py-2 font-bold border-b">Snow</th>
              <th className="px-2 py-2 font-bold border-b">Temp</th>
              <th className="px-2 py-2 font-bold border-b">Risk Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {route.checkpoints.map((cp) => (
              <CheckpointRow key={cp.index} cp={cp} />
            ))}
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
    <tr className="hover:bg-blue-50/50 transition-colors">
      <td className="px-2 py-2 font-mono font-semibold text-gray-800">
        {cp.distance_miles.toFixed(0)} mi
      </td>
      <td className="px-2 py-2 whitespace-nowrap text-gray-600 font-medium">
        {format(eta, 'MMM d, HH:mm')}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <span className={cp.wind_mph >= 35 ? 'font-bold text-red-600' : 'text-gray-700'}>
          {cp.wind_mph.toFixed(0)} mph
        </span>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        {Number(rainIn) > 0 ? (
          <span className="font-medium text-blue-700">{rainIn}" /hr</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        {Number(snowIn) > 0 ? (
          <span className="font-bold text-indigo-700">{snowIn}" /hr</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap text-gray-700">
        {cp.temperature_c.toFixed(0)}°C <span className="text-gray-400 text-[10px]">({tempF}°F)</span>
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-col gap-0.5">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${riskBadgeClass(
              cp.risk_label
            )}`}
          >
            {cp.risk_label}
          </span>
          {hasLoadWarning && (
            <span
              className="text-[9px] text-red-700 font-semibold leading-tight"
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
