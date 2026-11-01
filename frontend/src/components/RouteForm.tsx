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
    description: 'Very heavy load (48k lbs) • Severe wind rules',
  },
];

const INTERVAL_OPTIONS = [10, 25, 50] as const;

export default function RouteForm() {
  const [form, setForm] = useState<RouteFormValues>(DEFAULT_FORM);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve routes';
      setStatus('error', message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-xl">🚛</span> Weather-Aware Truck Router
        </h1>
        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">
          Live
        </span>
      </div>

      {/* Preset demo scenarios */}
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
          Quick Demo Scenarios
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-left text-xs px-2.5 py-1.5 rounded border border-gray-200 hover:border-blue-400 hover:bg-blue-50/60 transition-all flex flex-col"
            >
              <span className="font-semibold text-gray-800">{p.label}</span>
              <span className="text-[10px] text-gray-500">{p.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 pt-1 border-t border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Origin City / Address</label>
          <input
            type="text"
            name="origin"
            value={form.origin}
            onChange={handleChange}
            placeholder="e.g. Chicago, IL"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Destination City / Address</label>
          <input
            type="text"
            name="destination"
            value={form.destination}
            onChange={handleChange}
            placeholder="e.g. Indianapolis, IN"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Departure Date & Time</label>
          <input
            type="datetime-local"
            name="departure_datetime"
            value={form.departure_datetime}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-gray-700">Load Weight</label>
            <span className="text-xs font-mono font-bold text-blue-600">
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
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>5k (Empty)</span>
            <span className={form.load_weight_lb > 30000 ? 'text-amber-600 font-semibold' : ''}>
              &gt;30k (Heavy)
            </span>
            <span className={form.load_weight_lb > 40000 ? 'text-red-600 font-semibold' : ''}>
              &gt;40k (Severe Rule)
            </span>
            <span>80k (Max)</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Weather Sample Interval
          </label>
          <div className="grid grid-cols-3 gap-2">
            {INTERVAL_OPTIONS.map((mi) => (
              <button
                key={mi}
                type="button"
                onClick={() => setForm((p) => ({ ...p, interval_miles: mi }))}
                className={`rounded border py-1.5 text-xs font-medium transition-colors ${
                  form.interval_miles === mi
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Every {mi} mi
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition-colors mt-2"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Analyzing 3 Routes & Weather…
          </span>
        ) : (
          'Calculate & Recommend Routes ➔'
        )}
      </button>
    </form>
  );
}
