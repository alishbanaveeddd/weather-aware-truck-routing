import { useState } from 'react';
import { useRoutingStore } from './store/useRoutingStore';
import RouteForm from './components/RouteForm';
import MapView from './components/MapView';
import RouteCard from './components/RouteCard';
import CheckpointPanel from './components/CheckpointPanel';
import HeatmapControls from './components/HeatmapControls';
import type { Route } from './types';

export default function App() {
  const { status, error, routes, selectedRouteIndex, selectRoute } = useRoutingStore();
  const [activeTab, setActiveTab] = useState<'routes' | 'checkpoints'>('routes');

  const selectedRoute = routes.find((r) => r.index === selectedRouteIndex);
  const activeRoute = selectedRoute || routes.find((r) => r.recommended) || routes[0];

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden select-none font-sans">
      {/* ── Left Control Sidebar ── */}
      <aside className="w-[420px] flex-shrink-0 bg-white border-r border-gray-200 shadow-xl flex flex-col overflow-hidden z-20">
        {/* Top Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex-shrink-0">
          <RouteForm />
        </div>

        {/* Error Alert */}
        {status === 'error' && error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
            <span>❌</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Heatmap & Forecast Slider Box */}
        {status === 'success' && routes.length > 0 && (
          <div className="px-4 pt-3 flex-shrink-0">
            <HeatmapControls />
          </div>
        )}

        {/* Routes & Checkpoints Content Area */}
        {status === 'success' && routes.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 mt-3">
            {/* Tabs Header */}
            <div className="flex border-b border-gray-200 px-4 bg-gray-50/50">
              <TabButton
                active={activeTab === 'routes'}
                onClick={() => setActiveTab('routes')}
                label={`Route Options (${routes.length})`}
              />
              <TabButton
                active={activeTab === 'checkpoints'}
                onClick={() => setActiveTab('checkpoints')}
                label={`Checkpoints (${activeRoute ? activeRoute.checkpoints.length : 0})`}
              />
            </div>

            {/* Scrollable Tab Panels */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeTab === 'routes' && (
                <>
                  <RecommendationBanner routes={routes} />
                  {routes.map((route) => (
                    <RouteCard key={route.index} route={route} />
                  ))}
                </>
              )}

              {activeTab === 'checkpoints' && activeRoute && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800">
                      Route {activeRoute.rank}: {activeRoute.name || `Option ${activeRoute.index + 1}`}
                    </span>
                    {routes.length > 1 && (
                      <select
                        value={activeRoute.index}
                        onChange={(e) => selectRoute(Number(e.target.value))}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        {routes.map((r) => (
                          <option key={r.index} value={r.index}>
                            Route {r.rank} ({r.distance_miles} mi)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <CheckpointPanel route={activeRoute} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Welcome State */}
        {status === 'idle' && (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="max-w-xs space-y-3 text-gray-500">
              <div className="text-5xl">🧭</div>
              <h3 className="text-sm font-bold text-gray-800">Weather-Aware Route Intelligence</h3>
              <p className="text-xs leading-relaxed text-gray-500">
                Calculates three alternative routes with checkpoints every 10, 25, or 50 miles. Evaluates wind gusts,
                heavy rain, and snowfall against truck load rules.
              </p>
            </div>
          </div>
        )}

        {/* Calculating / Loading State */}
        {status === 'loading' && (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="space-y-3">
              <div className="text-4xl animate-bounce">🚛 💨</div>
              <p className="text-sm font-semibold text-gray-800">Evaluating routes & forecast data…</p>
              <p className="text-xs text-gray-400">Sampling checkpoints and applying truck load risk rules</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Interactive Map View ── */}
      <main className="flex-1 relative h-full">
        <MapView />

        {/* Floating Comprehensive Risk Legend */}
        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/80 p-3.5 z-[1000] text-xs space-y-2 pointer-events-auto max-w-[210px]">
          <div className="flex items-center justify-between border-b pb-1.5">
            <span className="font-bold text-gray-900">Weather Risk Legend</span>
            <span className="text-[10px] text-gray-400 font-mono">Rules</span>
          </div>

          <div className="space-y-1">
            {[
              { label: 'Low', desc: '<25 mph, <0.1" rain', color: '#22c55e' },
              { label: 'Moderate', desc: '25-34 mph, 0.1-0.25"', color: '#eab308' },
              { label: 'High', desc: '35-44 mph, 0.25-0.5"', color: '#f97316' },
              { label: 'Severe', desc: '45-54 mph, >40k lb', color: '#ef4444' },
              { label: 'No Travel', desc: '≥55 mph, >30k lb', color: '#7c3aed' },
            ].map(({ label, desc, color }) => (
              <div key={label} className="flex items-center justify-between gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-gray-800">{label}</span>
                </div>
                <span className="text-[9px] text-gray-500 font-mono">{desc}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-1.5 space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-blue-600 rounded-full" />
              <span className="text-gray-700 font-medium">Route 1 (Primary)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-emerald-600 rounded-full" />
              <span className="text-gray-700 font-medium">Route 2 (Alternate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-1 bg-amber-600 rounded-full" />
              <span className="text-gray-700 font-medium">Route 3 (Alternate)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-xs font-bold border-b-2 transition-all ${
        active
          ? 'border-blue-600 text-blue-600 bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}

function RecommendationBanner({ routes }: { routes: Route[] }) {
  const rec = routes.find((r) => r.recommended) || routes[0];
  if (!rec) return null;

  const s = rec.score;
  const hasNoTravel = s.no_travel_miles > 0;
  const hasSevere = s.severe_miles > 0;

  const cardStyle = hasNoTravel
    ? 'bg-purple-50 border-purple-300 text-purple-900'
    : hasSevere
    ? 'bg-amber-50 border-amber-300 text-amber-900'
    : 'bg-emerald-50 border-emerald-300 text-emerald-900';

  const icon = hasNoTravel ? '⛔' : hasSevere ? '⚠️' : '🏆';

  return (
    <div className={`rounded-xl border p-3 text-xs shadow-sm ${cardStyle}`}>
      <div className="flex items-center justify-between font-bold text-sm mb-1">
        <span>
          {icon} Top Pick: Route {rec.rank} ({rec.name || 'Primary Corridor'})
        </span>
        <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-white/70">
          Rank #1
        </span>
      </div>

      <div className="text-xs space-y-0.5 opacity-90 leading-relaxed">
        {rec.recommendation_reason && <p className="font-semibold">{rec.recommendation_reason}</p>}
        <p>
          Distance: <strong>{rec.distance_miles} mi</strong> • Travel Time: <strong>{Math.round(rec.duration_seconds / 3600)}h {Math.round((rec.duration_seconds % 3600) / 60)}m</strong>
        </p>
        {hasNoTravel && (
          <p className="font-bold text-red-700">
            ⚠️ Warning: Contains {s.no_travel_miles} miles of No-Travel conditions. Consider rescheduling departure.
          </p>
        )}
      </div>
    </div>
  );
}
