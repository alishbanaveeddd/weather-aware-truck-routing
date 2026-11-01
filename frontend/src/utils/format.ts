import type { RiskLabel } from '../types';

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDistance(miles: number): string {
  return `${miles.toFixed(0)} mi (${(miles * 1.60934).toFixed(0)} km)`;
}

export function riskBadgeClass(label: RiskLabel | string): string {
  switch (label) {
    case 'Low':       return 'badge-low';
    case 'Moderate':  return 'badge-moderate';
    case 'High':      return 'badge-high';
    case 'Severe':    return 'badge-severe';
    case 'No Travel': return 'badge-notravel';
    default:          return 'badge-low';
  }
}

export function riskColor(label: RiskLabel | string): string {
  switch (label) {
    case 'Low':       return '#22c55e';
    case 'Moderate':  return '#eab308';
    case 'High':      return '#f97316';
    case 'Severe':    return '#ef4444';
    case 'No Travel': return '#7c3aed';
    default:          return '#22c55e';
  }
}

