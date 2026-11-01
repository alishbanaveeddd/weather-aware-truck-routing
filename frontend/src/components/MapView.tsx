import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useRoutingStore } from '../store/useRoutingStore';
import type { Route, Checkpoint } from '../types';
import HeatmapLayer from './HeatmapLayer';
import { format } from 'date-fns';

const ROUTE_COLORS = ['#2563eb', '#059669', '#d97706'];
const ROUTE_WEIGHTS = [6, 4.5, 4.5];

// Auto-fit map viewport to routes with margin
function BoundsUpdater({ routes }: { routes: Route[] }) {
  const map = useMap();
  const { setMapBbox } = useRoutingStore();

  useEffect(() => {
    if (!routes.length) return;
    const allCoords = routes.flatMap((r) =>
      r.geometry.map((c): [number, number] => [c[1], c[0]])
    );
    if (allCoords.length === 0) return;
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    setMapBbox({
      minLat: sw.lat,
      minLon: sw.lng,
      maxLat: ne.lat,
      maxLon: ne.lng,
    });
  }, [routes, map, setMapBbox]);

  return null;
}

interface CheckpointMarkerProps {
  cp: Checkpoint;
  routeColor: string;
}

function CheckpointMarker({ cp, routeColor }: CheckpointMarkerProps) {
  const riskColor = cp.risk_color;
  const eta = new Date(cp.arrival_dt);
  const rainIn = (cp.rain_in_per_hr ?? cp.rain_mm_per_hr / 25.4).toFixed(2);
  const snowIn = (cp.snow_in_per_hr ?? cp.snow_mm_per_hr / 25.4).toFixed(2);
  const tempF = Math.round((cp.temperature_c * 9) / 5 + 32);

  // Size based on severity
  const radius = cp.risk_score >= 3 ? 9 : cp.risk_score >= 1 ? 6.5 : 4.5;

  return (
    <CircleMarker
      center={[cp.lat, cp.lon]}
      radius={radius}
      pathOptions={{
        color: cp.risk_score >= 2 ? '#ffffff' : routeColor,
        fillColor: riskColor,
        fillOpacity: 0.95,
        weight: cp.risk_score >= 2 ? 2.5 : 1.5,
      }}
    >
      <Popup minWidth={220} className="custom-popup">
        <div className="text-xs space-y-1.5 p-0.5">
          <div className="flex items-center justify-between border-b pb-1">
            <span
              className="font-bold text-sm px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: riskColor }}
            >
              {cp.risk_label} Risk
            </span>
            <span className="font-mono text-gray-500 font-bold">Mile {cp.distance_miles.toFixed(0)}</span>
          </div>

          <div className="text-gray-700 font-medium">
            🕐 <strong>ETA:</strong> {format(eta, 'EEE, MMM d • HH:mm')}
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1.5 rounded border border-gray-200">
            <div>💨 <strong>Wind:</strong> {cp.wind_mph.toFixed(0)} mph</div>
            <div>🌡 <strong>Temp:</strong> {cp.temperature_c.toFixed(0)}°C ({tempF}°F)</div>
            <div>🌧 <strong>Rain:</strong> {rainIn}" /hr</div>
            <div>❄️ <strong>Snow:</strong> {snowIn}" /hr</div>
          </div>

          {cp.load_warnings && cp.load_warnings.length > 0 && (
            <div className="bg-red-50 text-red-800 p-1.5 rounded text-[11px] font-semibold border border-red-200">
              ⚠️ {cp.load_warnings.join(' • ')}
            </div>
          )}

          {cp.description && (
            <div className="text-[11px] text-gray-500 italic capitalize">
              Forecast: {cp.description}
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function MapView() {
  const { routes, selectedRouteIndex, selectRoute, heatmapPoints, showHeatmap } = useRoutingStore();

  const activeRoute = selectedRouteIndex !== null
    ? routes.find((r) => r.index === selectedRouteIndex)
    : routes.find((r) => r.recommended) || routes[0];

  return (
    <MapContainer
      center={[39.8283, -98.5795]}
      zoom={4}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {routes.length > 0 && <BoundsUpdater routes={routes} />}

      {/* Corridor Weather Heatmap */}
      {showHeatmap && heatmapPoints.length > 0 && (
        <HeatmapLayer points={heatmapPoints} />
      )}

      {/* Route Polylines */}
      {routes.map((route) => {
        const latLngs: [number, number][] = route.geometry.map((c) => [c[1], c[0]]);
        const color = ROUTE_COLORS[route.index % ROUTE_COLORS.length];
        const isSelected = selectedRouteIndex === route.index;
        const isRecommended = route.recommended;

        const weight = isSelected
          ? 7
          : isRecommended && selectedRouteIndex === null
          ? 6
          : ROUTE_WEIGHTS[route.index % ROUTE_WEIGHTS.length];

        const opacity =
          selectedRouteIndex !== null
            ? isSelected
              ? 0.95
              : 0.35
            : isRecommended
            ? 0.95
            : 0.65;

        return (
          <Polyline
            key={`route-poly-${route.index}`}
            positions={latLngs}
            eventHandlers={{
              click: () => selectRoute(isSelected ? null : route.index),
            }}
            pathOptions={{
              color,
              weight,
              opacity,
              dashArray: !isRecommended && !isSelected ? '6 6' : undefined,
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <strong>Route {route.rank} ({route.name || `Option ${route.index + 1}`})</strong>
                <div>Distance: {route.distance_miles} miles</div>
                <div>Travel Time: {Math.round(route.duration_seconds / 3600)}h</div>
                <div>Avg Risk: {route.score.avg_risk_score}</div>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {/* Checkpoint Markers for the currently inspected route */}
      {activeRoute &&
        activeRoute.checkpoints.map((cp) => (
          <CheckpointMarker
            key={`cp-${activeRoute.index}-${cp.index}`}
            cp={cp}
            routeColor={ROUTE_COLORS[activeRoute.index % ROUTE_COLORS.length]}
          />
        ))}

      {/* Origin & Destination Pin Markers */}
      {routes[0] && (
        <>
          <CircleMarker
            center={[routes[0].origin.lat, routes[0].origin.lon]}
            radius={11}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#1d4ed8',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <span className="font-bold text-blue-700 uppercase tracking-wide">Trip Origin</span>
                <p className="font-semibold text-gray-900 mt-0.5">{routes[0].origin.label}</p>
              </div>
            </Popup>
          </CircleMarker>

          <CircleMarker
            center={[routes[0].destination.lat, routes[0].destination.lon]}
            radius={11}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#7c3aed',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <span className="font-bold text-purple-700 uppercase tracking-wide">Destination</span>
                <p className="font-semibold text-gray-900 mt-0.5">{routes[0].destination.label}</p>
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}
    </MapContainer>
  );
}
