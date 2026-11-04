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
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const selectedRoute = routes.find((r) => r.index === selectedRouteIndex);
  const activeRoute = selectedRoute || routes.find((r) => r.recommended) || routes[0];

  return (
    <div className="flex h-screen w-screen bg-gray-100 overflow-hidden select-none font-sans relative">
      {/* ── Toggle Sidebar Button (When Sidebar is Closed) ── */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-[1100] bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 flex items-center gap-2 transition-all"
        >
          <span>☰</span> Open Trip Panel
        </button>
      )}

      {/* ── Left Control Sidebar ── */}
      {isSidebarOpen && (
        <aside className="w-[450px] max-w-[95vw] flex-shrink-0 bg-white border-r border-gray-200 shadow-2xl flex flex-col h-full overflow-hidden z-20 transition-all duration-300">
          {/* Top Header / Collapsible Form Area */}
          <div className="border-b border-gray-200 bg-gray-50/70 flex-shrink-0 transition-all">
            {routes.length > 0 && isFormCollapsed ? (
              /* Compact Trip Header when collapsed */
              <div className="p-3 flex items-center justify-between gap-2 bg-blue-50/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 truncate">
                    <span>📍</span>
                    <span className="truncate">
                      {routes[0].origin.label.split(',')[0]} ➔ {routes[0].destination.label.split(',')[0]}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>⚖️ {routes[0].load_weight_lb?.toLocaleString()} lbs</span>
                    <span>•</span>
                    <span>{routes.length} options ready</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsFormCollapsed(false)}
                    className="text-[11px] font-bold text-blue-700 bg-white hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-colors shadow-xs"
                  >
                    Edit Trip ▾
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                    title="Collapse Sidebar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              /* Full Route Form */
              <div className="p-3.5 relative">
                <div className="flex justify-end items-center mb-1">
                  {routes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsFormCollapsed(true)}
                      className="text-[11px] text-gray-500 hover:text-blue-600 font-semibold px-2 py-0.5 rounded hover:bg-gray-200/60 transition-colors"
                    >
                      ▲ Minimize Form
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-200/60 ml-1"
                    title="Close Sidebar"
                  >
                    ✕
                  </button>
                </div>
                <RouteForm onSuccess={() => setIsFormCollapsed(true)} />
              </div>
            )}
          </div>

          {/* Error Alert */}
          {status === 'error' && error && (
            <div className="mx-3 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2 flex-shrink-0">
              <span>❌</span>
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Heatmap & Forecast Slider Box */}
          {status === 'success' && routes.length > 0 && (
            <div className="px-3 pt-2.5 flex-shrink-0">
              <HeatmapControls />
            </div>
          )}

          {/* Routes & Checkpoints Tabbed Section (Flex-1 for Smooth Scrolling) */}
          {status === 'success' && routes.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 mt-2">
              {/* Tabs Bar */}
              <div className="flex border-b border-gray-200 px-3 bg-gray-50/70 flex-shrink-0">
                <TabButton
                  active={activeTab === 'routes'}
                  onClick={() => setActiveTab('routes')}
                  label={`Route Options (${routes.length})`}
                  icon="🛣️"
                />
                <TabButton
                  active={activeTab === 'checkpoints'}
                  onClick={() => setActiveTab('checkpoints')}
                  label={`Checkpoints (${activeRoute ? activeRoute.checkpoints.length : 0})`}
                  icon="📍"
                />
              </div>

              {/* Tab 1: Route Options List */}
              {activeTab === 'routes' && (
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                  <RecommendationBanner routes={routes} />
                  {routes.map((route) => (
                    <RouteCard key={route.index} route={route} />
                  ))}
                </div>
              )}

              {/* Tab 2: Checkpoints Table with Direct Route Switcher */}
              {activeTab === 'checkpoints' && activeRoute && (
                <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
                  {/* Route Switcher header */}
                  <div className="flex items-center justify-between mb-2 flex-shrink-0 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            activeRoute.index === 0
                              ? '#2563eb'
                              : activeRoute.index === 1
                              ? '#059669'
                              : '#d97706',
                        }}
                      />
                      Viewing Route {activeRoute.rank}:
                    </span>

                    <select
                      value={activeRoute.index}
                      onChange={(e) => selectRoute(Number(e.target.value))}
                      className="text-xs font-semibold border border-gray-300 rounded px-2 py-1 bg-white shadow-xs focus:ring-1 focus:ring-blue-500"
                    >
                      {routes.map((r) => (
                        <option key={r.index} value={r.index}>
                          Route {r.rank} ({r.distance_miles} mi • Avg Risk: {r.score.avg_risk_score})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fully scrollable table without cutoffs */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <CheckpointPanel route={activeRoute} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Idle State */}
          {status === 'idle' && (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="max-w-xs space-y-2 text-gray-500">
                <div className="text-4xl">🧭</div>
                <h3 className="text-sm font-bold text-gray-800">Weather-Aware Routing Engine</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enter an origin & destination or select a quick demo scenario to analyze routes, wind rules, and weather risks.
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {status === 'loading' && (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div className="space-y-3">
                <div className="text-4xl animate-bounce">🚛 💨</div>
                <p className="text-sm font-bold text-gray-800">Generating 3 Safe Routes…</p>
                <p className="text-xs text-gray-400">Sampling checkpoints and applying truck load risk rules</p>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ── Main Interactive Map View ── */}
      <main className="flex-1 relative h-full">
        <MapView />

        {/* Floating Comprehensive Risk Legend */}
        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200/80 p-3 z-[1000] text-xs space-y-2 pointer-events-auto max-w-[210px]">
          <div className="flex items-center justify-between border-b pb-1">
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
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-gray-800">{label}</span>
                </div>
                <span className="text-[9px] text-gray-500 font-mono">{desc}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-1 space-y-1 text-[11px]">
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
  icon,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
        active
          ? 'border-blue-600 text-blue-600 bg-white'
          : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
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
    <div className={`rounded-xl border p-2.5 text-xs shadow-xs ${cardStyle}`}>
      <div className="flex items-center justify-between font-bold text-sm mb-1">
        <span>
          {icon} Top Pick: Route {rec.rank} ({rec.name || 'Primary Corridor'})
        </span>
        <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-white/80">
          Rank #1
        </span>
      </div>

      <div className="text-xs space-y-0.5 opacity-90 leading-relaxed">
        {rec.recommendation_reason && <p className="font-semibold">{rec.recommendation_reason}</p>}
        <p>
          Distance: <strong>{rec.distance_miles} mi</strong> • Travel Time:{' '}
          <strong>
            {Math.round(rec.duration_seconds / 3600)}h {Math.round((rec.duration_seconds % 3600) / 60)}m
          </strong>
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
