import { create } from 'zustand';
import type { Route, AppStatus, HeatmapPoint } from '../types';

interface RoutingState {
  // Status
  status: AppStatus;
  error: string | null;

  // Routes
  routes: Route[];
  recommendedIndex: number;
  selectedRouteIndex: number | null;

  // Heatmap
  heatmapPoints: HeatmapPoint[];
  forecastHour: number;
  showHeatmap: boolean;

  // Map state
  mapBbox: { minLat: number; minLon: number; maxLat: number; maxLon: number } | null;

  // Actions
  setStatus: (s: AppStatus, error?: string) => void;
  setRoutes: (routes: Route[], recommendedIndex: number) => void;
  selectRoute: (index: number | null) => void;
  setHeatmapPoints: (points: HeatmapPoint[]) => void;
  setForecastHour: (h: number | ((prev: number) => number)) => void;
  setShowHeatmap: (v: boolean) => void;
  setMapBbox: (bbox: RoutingState['mapBbox']) => void;
  reset: () => void;
}

export const useRoutingStore = create<RoutingState>((set) => ({
  status: 'idle',
  error: null,
  routes: [],
  recommendedIndex: 0,
  selectedRouteIndex: null,
  heatmapPoints: [],
  forecastHour: 0,
  showHeatmap: false,
  mapBbox: null,

  setStatus: (s, error = null) => set({ status: s, error }),
  setRoutes: (routes, recommendedIndex) =>
    set({ routes, recommendedIndex, selectedRouteIndex: null }),
  selectRoute: (index) => set({ selectedRouteIndex: index }),
  setHeatmapPoints: (points) => set({ heatmapPoints: points }),
  setForecastHour: (h) =>
    set((state) => ({
      forecastHour: typeof h === 'function' ? h(state.forecastHour) : h,
    })),
  setShowHeatmap: (v) => set({ showHeatmap: v }),
  setMapBbox: (bbox) => set({ mapBbox: bbox }),
  reset: () =>
    set({
      status: 'idle',
      error: null,
      routes: [],
      recommendedIndex: 0,
      selectedRouteIndex: null,
      heatmapPoints: [],
      forecastHour: 0,
      showHeatmap: false,
    }),
}));

