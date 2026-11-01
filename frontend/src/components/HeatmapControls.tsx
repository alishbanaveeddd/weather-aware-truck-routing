import { useState, useEffect, useRef } from 'react';
import { useRoutingStore } from '../store/useRoutingStore';
import { fetchHeatmap } from '../api/routingApi';

export default function HeatmapControls() {
  const {
    showHeatmap,
    setShowHeatmap,
    forecastHour,
    setForecastHour,
    setHeatmapPoints,
    mapBbox,
    routes,
  } = useRoutingStore();

  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  async function loadHeatmap(hour: number) {
    if (!mapBbox || routes.length === 0) return;
    setLoading(true);
    try {
      const points = await fetchHeatmap(mapBbox, hour);
      setHeatmapPoints(points);
    } catch (e) {
      console.error('Heatmap fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleHeatmap() {
    if (!showHeatmap) {
      setShowHeatmap(true);
      await loadHeatmap(forecastHour);
    } else {
      setShowHeatmap(false);
      setIsPlaying(false);
    }
  }

  async function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const hour = Number(e.target.value);
    setForecastHour(hour);
    if (showHeatmap) {
      await loadHeatmap(hour);
    }
  }

  // Auto-play animation through 48 hour forecast
  useEffect(() => {
    if (isPlaying && showHeatmap) {
      timerRef.current = window.setInterval(() => {
        setForecastHour((prev) => {
          const next = (prev + 3) % 51;
          loadHeatmap(next);
          return next;
        });
      }, 1400);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, showHeatmap]);

  if (routes.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🌡️</span>
          <span className="text-xs font-bold text-gray-800">Corridor Weather Heatmap</span>
        </div>
        <button
          onClick={toggleHeatmap}
          disabled={loading && !isPlaying}
          className={`text-xs px-3 py-1 rounded-full font-bold shadow-sm transition-all ${
            showHeatmap
              ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-500/30'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
        >
          {showHeatmap ? 'Active (ON)' : 'Enable Heatmap'}
        </button>
      </div>

      {showHeatmap && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Forecast Horizon:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                +{forecastHour} hours
              </span>
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-[11px] px-2 py-0.5 rounded font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={48}
            step={1}
            value={forecastHour}
            onChange={handleSliderChange}
            className="w-full accent-blue-600 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>Departure (0h)</span>
            <span>+12h</span>
            <span>+24h</span>
            <span>+36h</span>
            <span>+48h</span>
          </div>

          {/* Color Gradient Legend */}
          <div className="pt-1">
            <div
              className="h-2 rounded-full shadow-inner"
              style={{
                background:
                  'linear-gradient(to right, #22c55e 0%, #eab308 30%, #f97316 60%, #ef4444 85%, #7c3aed 100%)',
              }}
            />
            <div className="flex justify-between text-[9px] text-gray-500 font-semibold mt-0.5 px-0.5">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Severe</span>
              <span>No Travel</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
