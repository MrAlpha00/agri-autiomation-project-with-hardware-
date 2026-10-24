'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { LineChart, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const isDemo = true;

  // Illustrative 24h mock trend data points
  const mockTrendPoints = [
    { time: '00:00', soilRaw: 2950, waterRaw: 2100, temp: 21.2, humidity: 75 },
    { time: '04:00', soilRaw: 2920, waterRaw: 2080, temp: 19.8, humidity: 82 },
    { time: '08:00', soilRaw: 2890, waterRaw: 2040, temp: 23.5, humidity: 68 },
    { time: '12:00', soilRaw: 2840, waterRaw: 1980, temp: 28.2, humidity: 54 },
    { time: '16:00', soilRaw: 2790, waterRaw: 1950, temp: 26.9, humidity: 58 },
    { time: '20:00', soilRaw: 2810, waterRaw: 1950, temp: 23.4, humidity: 65 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <LineChart className="h-6 w-6 text-emerald-400" />
              Historical Analytics & Trends
            </h1>
            <p className="text-sm text-slate-400">
              Time-series telemetry analysis, bounded aggregation windows, and sensor variance statistics.
            </p>
          </div>

          {/* Time range selector */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-1">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Historical Data Notice:</strong> Displaying bounded mock historical telemetry. When Supabase Postgres is connected in Phase 2, this will query indexed time-bucketed readings from <code>sensor_readings</code>.
            </span>
          </div>
        )}

        {/* Summary Statistics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Soil ADC (Min / Max / Avg)</span>
            <p className="text-2xl font-bold font-mono text-white mt-2">2790 / 2950</p>
            <span className="text-xs text-emerald-400 font-mono">Avg: 2866 ADC</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Air Temp (Min / Max / Avg)</span>
            <p className="text-2xl font-bold font-mono text-white mt-2">19.8° / 28.2°</p>
            <span className="text-xs text-cyan-400 font-mono">Avg: 23.8°C</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Reservoir Consumption</span>
            <p className="text-2xl font-bold font-mono text-white mt-2">-150 ADC</p>
            <span className="text-xs text-blue-400 font-mono">~7.1% Tank Drawdown</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-xs font-medium text-slate-400">Irrigation Cycles (24h)</span>
            <p className="text-2xl font-bold font-mono text-white mt-2">2 Cycles</p>
            <span className="text-xs text-purple-400 font-mono">Total Run: 4m 30s</span>
          </div>
        </div>

        {/* Historical Table Preview */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="text-base font-semibold text-white">Aggregated Telemetry Buckets</h3>
            <span className="text-xs text-slate-400 font-mono">Interval: 4 Hours</span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Soil ADC (GPIO34)</th>
                  <th className="py-2.5 px-3">Water ADC (GPIO35)</th>
                  <th className="py-2.5 px-3">Air Temp (DHT11)</th>
                  <th className="py-2.5 px-3">Humidity (DHT11)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {mockTrendPoints.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">{pt.time} UTC</td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">{pt.soilRaw}</td>
                    <td className="py-2.5 px-3 text-blue-400">{pt.waterRaw}</td>
                    <td className="py-2.5 px-3 text-white">{pt.temp}°C</td>
                    <td className="py-2.5 px-3 text-cyan-400">{pt.humidity}%</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                        NOMINAL
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
