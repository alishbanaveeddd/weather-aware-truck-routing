import type { Route } from '../types';
import { useRoutingStore } from '../store/useRoutingStore';
import { formatDuration, formatDistance, riskBadgeClass } from '../utils/format';

interface Props {
  route: Route;
}

const ROUTE_COLORS = ['#2563eb', '#059669', '#d97706'];

export default function RouteCard({ route }: Props) {
  const { selectedRouteIndex, selectRoute } = useRoutingStore();
  const isSelected = selectedRouteIndex === route.index;
  const color = ROUTE_COLORS[route.index % ROUTE_COLORS.length];

  const s = route.score;
  const overallRisk = (() => {
    if (s.no_travel_miles > 0 || s.no_travel_count > 0) return 'No Travel';
    if (s.severe_miles > 0 || s.severe_count > 0) return 'Severe';
    if (s.high_miles > 0 || s.high_count > 0) return 'High';
    if (s.moderate_miles > 0 || s.moderate_count > 0) return 'Moderate';
    return 'Low';
  })();

  return (
    <div
      onClick={() => selectRoute(isSelected ? null : route.index)}
      className={`rounded-lg border-2 p-3.5 cursor-pointer transition-all shadow-sm ${
        isSelected
          ? 'border-blue-600 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
          : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-gray-900">
                Route {route.rank}: {route.name || `Option ${route.index + 1}`}
              </span>
              {route.recommended && (
                <span className="text-[10px] uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                  ★ Best Choice
                </span>
              )}
            </div>
          </div>
        </div>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${riskBadgeClass(
            overallRisk
          )}`}
        >
          {overallRisk}
        </span>
      </div>

      {route.recommended && route.recommendation_reason && (
        <div className="mb-2 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-medium">
          ✓ {route.recommendation_reason}
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-700 py-1.5 border-t border-b border-gray-100">
        <div className="flex items-center gap-1">
          <span className="text-gray-400">📏</span>
          <span>{formatDistance(route.distance_miles)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">⏱</span>
          <span className="font-semibold">{formatDuration(route.duration_seconds)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-red-500 font-bold">🔴 Severe:</span>
          <span className={s.severe_miles > 0 ? 'font-bold text-red-600' : 'text-gray-600'}>
            {s.severe_miles} mi ({s.severe_count} pts)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-orange-500 font-bold">🟠 High:</span>
          <span className={s.high_miles > 0 ? 'font-semibold text-orange-600' : 'text-gray-600'}>
            {s.high_miles} mi ({s.high_count} pts)
          </span>
        </div>
        {s.no_travel_miles > 0 && (
          <div className="col-span-2 flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
            <span>⛔ No Travel:</span>
            <span>{s.no_travel_miles} mi ({s.no_travel_count} checkpoints)</span>
          </div>
        )}
        <div className="col-span-2 flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
          <span>Avg Weather Risk: <strong className="text-gray-800">{s.avg_risk_score.toFixed(2)}</strong> / 4.0</span>
          <span>{route.checkpoints.length} Checkpoints</span>
        </div>
      </div>

      {/* Segmented Risk Bar across entire trip */}
      <div className="mt-2.5">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Trip Risk Distribution</span>
          <span>{isSelected ? 'Selected (view on map)' : 'Click to inspect'}</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-100 border border-gray-200">
          {renderRiskBar(route)}
        </div>
      </div>
    </div>
  );
}

function renderRiskBar(route: Route) {
  const totalMiles = Math.max(route.distance_miles, 1);
  const s = route.score;
  const segments = [
    { label: 'Low', miles: s.low_miles, color: '#22c55e' },
    { label: 'Moderate', miles: s.moderate_miles, color: '#eab308' },
    { label: 'High', miles: s.high_miles, color: '#f97316' },
    { label: 'Severe', miles: s.severe_miles, color: '#ef4444' },
    { label: 'No Travel', miles: s.no_travel_miles, color: '#7c3aed' },
  ];

  return segments
    .filter((seg) => seg.miles > 0)
    .map((seg) => {
      const pct = (seg.miles / totalMiles) * 100;
      return (
        <div
          key={seg.label}
          title={`${seg.label} Risk: ${seg.miles} mi (${pct.toFixed(0)}%)`}
          style={{ width: `${pct}%`, backgroundColor: seg.color }}
          className="transition-all hover:opacity-80"
        />
      );
    });
}
