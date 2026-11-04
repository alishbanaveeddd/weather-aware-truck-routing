import React, { useState } from 'react';
import { fetchRoutes } from '../api/routingApi';
import { useRoutingStore } from '../store/useRoutingStore';
import type { RouteFormValues } from '../types';

const DEFAULT_FORM: RouteFormValues = {
  origin: 'Chicago, IL',
  destination: 'Indianapolis, IN',
  departure_datetime: new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
  load_weight_lb: 42000,
  interval_miles: 25,
};

const PRESETS = [
  {
    label: 'Chicago ➔ Indianapolis',
    origin: 'Chicago, IL',
    destination: 'Indianapolis, IN',
    weight: 42000,
    interval: 25,
    description: 'Heavy Load (42k lbs) • Midwest Corridor',
  },
  {
    label: 'Denver ➔ Salt Lake City',
    origin: 'Denver, CO',
    destination: 'Salt Lake City, UT',
    weight: 35000,
    interval: 25,
    description: 'Mountain passes & potential snow conditions',
  },
  {
    label: 'Dallas ➔ Kansas City',
    origin: 'Dallas, TX',
    destination: 'Kansas City, MO',
    weight: 48000,
    interval: 50,
    description: 'Very heavy load (48k lbs) • High wind rules',
  },
];

const INTERVAL_OPTIONS = [10, 25, 50] as const;

interface RouteFormProps {
  onSuccess?: () => void;
}

export default function RouteForm({ onSuccess }: RouteFormProps) {
  const [form, setForm] = useState<RouteFormValues>(DEFAULT_FORM);
  const [showDemoScenarios, setShowDemoScenarios] = useState(true);
  const { status, setStatus, setRoutes, reset } = useRoutingStore();
  const loading = status === 'loading';

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setForm((prev) => ({
      ...prev,
      origin: preset.origin,
      destination: preset.destination,
      load_weight_lb: preset.weight,
      interval_miles: preset.interval,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setStatus('loading');
    try {
      const result = await fetchRoutes(form);
      setRoutes(result.routes, result.recommended_index);
      setStatus('success');
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve routes';
      setStatus('error', message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h1 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
          <span className="text-xl">🚛</span> Weather-Aware Router
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          Ready
        </span>
      </div>

      {/* Demo Scenarios with Close / Open toggle */}
      {showDemoScenarios ? (
        <div className="bg-blue-50/60 rounded-lg p-2.5 border border-blue-100/80 transition-all space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
              <span>⚡</span> Quick Demo Scenarios
            </span>
            <button
              type="button"
              onClick={() => setShowDemoScenarios(false)}
              className="text-[11px] text-gray-500 hover:text-gray-800 bg-white/80 hover:bg-white px-1.5 py-0.5 rounded border border-gray-200 transition-colors flex items-center gap-0.5"
              title="Close demo scenarios"
            >
              <span>✕</span> Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left text-xs px-2.5 py-1.5 rounded-md bg-white border border-blue-200/60 hover:border-blue-400 hover:shadow-sm transition-all flex flex-col group"
              >
                <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                  {p.label}
                </span>
                <span className="text-[10px] text-gray-500">{p.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center py-0.5">
          <button
            type="button"
            onClick={() => setShowDemoScenarios(true)}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
          >
            <span>⚡</span> Open Quick Demo Scenarios (3)
          </button>
        </div>
      )}

      {/* Trip Input Fields */}
      <div className="space-y-2.5 pt-1">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Origin</label>
            <input
              type="text"
              name="origin"
              value={form.origin}
              onChange={handleChange}
              placeholder="e.g. Chicago, IL"
              required
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Destination</label>
            <input
              type="text"
              name="destination"
              value={form.destination}
              onChange={handleChange}
              placeholder="e.g. Indianapolis, IN"
              required
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-0.5">Departure Date & Time</label>
          <input
            type="datetime-local"
            name="departure_datetime"
            value={form.departure_datetime}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          />
        </div>

        {/* Load Weight Slider */}
        <div className="bg-gray-50/80 rounded-lg p-2 border border-gray-200/70">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-bold text-gray-700">Load Weight</label>
            <span className="text-xs font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-xs">
              {form.load_weight_lb.toLocaleString()} lbs
            </span>
          </div>
          <input
            type="range"
            name="load_weight_lb"
            min={5000}
            max={80000}
            step={1000}
            value={form.load_weight_lb}
            onChange={handleChange}
            className="w-full accent-blue-600 cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-medium">
            <span>5k (Empty)</span>
            <span className={form.load_weight_lb > 30000 ? 'text-amber-600 font-bold' : ''}>
              &gt;30k (No Travel)
            </span>
            <span className={form.load_weight_lb > 40000 ? 'text-red-600 font-bold' : ''}>
              &gt;40k (Severe)
            </span>
            <span>80k (Max)</span>
          </div>
        </div>

        {/* Weather Sample Interval */}
        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1">
            Sample Weather Every
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {INTERVAL_OPTIONS.map((mi) => (
              <button
                key={mi}
                type="button"
                onClick={() => setForm((p) => ({ ...p, interval_miles: mi }))}
                className={`rounded-md border py-1.5 text-xs font-semibold transition-all ${
                  form.interval_miles === mi
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {mi} miles
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Analyzing Routes & Weather…
          </>
        ) : (
          'Calculate & Recommend Routes ➔'
        )}
      </button>
    </form>
  );
}
