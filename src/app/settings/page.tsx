'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Settings, 
  Sliders, 
  ShieldAlert, 
  Database, 
  Bell, 
  Key, 
  Save, 
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { CalibrationThresholds } from '@/types/iot';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'calibration' | 'credentials' | 'alerts'>('calibration');

  // Default calibrated baseline thresholds (editable by user)
  const [thresholds, setThresholds] = useState<CalibrationThresholds>({
    soilAirDryRaw: 3500,
    soilWaterSaturatedRaw: 1400,
    soilAutoIrrigateThresholdRaw: 3100, // Irrigate when soil dries past this ADC
    soilAutoStopThresholdRaw: 2200,      // Stop when moisture reaches this ADC
    waterEmptyRaw: 150,
    waterFullRaw: 2800,
    waterLowCutoffRaw: 600,             // Safety interlock pump lockout
    pumpMaxRuntimeSeconds: 120,         // Max run limit (safety watchdog)
    pumpCooldownSeconds: 300,           // Cooldown before next auto run
    telemetryIntervalSeconds: 5         // Reporting frequency
  });

  const [saving, setSaving] = useState(false);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Threshold calibration settings saved locally. In Phase 2, this commits to device_settings table in Supabase.');
    }, 700);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Settings className="h-6 w-6 text-emerald-400" />
              Sensor Calibration & System Settings
            </h1>
            <p className="text-sm text-slate-400">
              Set hysteresis thresholds, safety watchdogs, API credentials, and Telegram notification preferences.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('calibration')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'calibration'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            Sensor Calibration & Hysteresis
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'credentials'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="h-4 w-4" />
            Backend & Device Credentials
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'alerts'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            Alerts & Telegram
          </button>
        </div>

        {/* Tab 1: Sensor Calibration Form */}
        {activeTab === 'calibration' && (
          <form onSubmit={handleSaveThresholds} className="space-y-6">
            {/* Calibration Instructions Banner */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-blue-300 text-sm">Two-Point Calibration Procedure</p>
                  <p className="text-slate-300 leading-relaxed">
                    Soil and water level sensors produce raw 12-bit ADC integers (0 to 4095). <strong>Do not enable AUTO mode until physical calibration is performed:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>Hold probe in dry air, note raw ADC value and enter as <em>Soil Air Dry</em>.</li>
                    <li>Submerge probe in saturated test soil/water cup, note raw ADC and enter as <em>Soil Water Saturated</em>.</li>
                    <li>Set <em>Start Irrigation</em> threshold higher than <em>Stop Irrigation</em> (capacitive sensors read higher ADC when drier).</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Soil Moisture Hysteresis */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  Soil Moisture Calibration (GPIO34)
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-medium block">Soil Air-Dry Baseline (ADC 0-4095)</label>
                    <input
                      type="number"
                      value={thresholds.soilAirDryRaw}
                      onChange={(e) => setThresholds({ ...thresholds, soilAirDryRaw: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                    />
                    <span className="text-[11px] text-slate-500">Typical dry probe reading: 3400-3800</span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block">Soil Saturated Baseline (ADC 0-4095)</label>
                    <input
                      type="number"
                      value={thresholds.soilWaterSaturatedRaw}
                      onChange={(e) => setThresholds({ ...thresholds, soilWaterSaturatedRaw: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                    />
                    <span className="text-[11px] text-slate-500">Typical saturated soil reading: 1200-1600</span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <label className="text-emerald-400 font-medium block">Auto-Irrigate START Threshold (ADC)</label>
                    <input
                      type="number"
                      value={thresholds.soilAutoIrrigateThresholdRaw}
                      onChange={(e) => setThresholds({ ...thresholds, soilAutoIrrigateThresholdRaw: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-emerald-400 font-mono font-bold"
                    />
                    <span className="text-[11px] text-slate-500">Pump turns ON when dry reading rises above this</span>
                  </div>

                  <div>
                    <label className="text-cyan-400 font-medium block">Auto-Irrigate STOP Threshold (ADC)</label>
                    <input
                      type="number"
                      value={thresholds.soilAutoStopThresholdRaw}
                      onChange={(e) => setThresholds({ ...thresholds, soilAutoStopThresholdRaw: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-cyan-400 font-mono font-bold"
                    />
                    <span className="text-[11px] text-slate-500">Pump turns OFF when moisture reading drops below this</span>
                  </div>
                </div>
              </div>

              {/* Water Reservoir & Pump Safety */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-400" />
                  Water Tank & Pump Interlocks (GPIO35 & 18)
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-rose-400 font-medium block">Low-Water Cutoff Interlock (ADC 0-4095)</label>
                    <input
                      type="number"
                      value={thresholds.waterLowCutoffRaw}
                      onChange={(e) => setThresholds({ ...thresholds, waterLowCutoffRaw: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-rose-400 font-mono font-bold"
                    />
                    <span className="text-[11px] text-slate-500">Critical: Prevents pump dry-run damage</span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block">Maximum Pump Runtime (Seconds)</label>
                    <input
                      type="number"
                      value={thresholds.pumpMaxRuntimeSeconds}
                      onChange={(e) => setThresholds({ ...thresholds, pumpMaxRuntimeSeconds: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                    />
                    <span className="text-[11px] text-slate-500">Safety watchdog auto-shutdown (default: 120s)</span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block">Pump Cooldown Guard (Seconds)</label>
                    <input
                      type="number"
                      value={thresholds.pumpCooldownSeconds}
                      onChange={(e) => setThresholds({ ...thresholds, pumpCooldownSeconds: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                    />
                    <span className="text-[11px] text-slate-500">Minimum rest between auto cycles (default: 300s)</span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block">ESP32 Telemetry Transmit Rate (Seconds)</label>
                    <input
                      type="number"
                      value={thresholds.telemetryIntervalSeconds}
                      onChange={(e) => setThresholds({ ...thresholds, telemetryIntervalSeconds: Number(e.target.value) })}
                      className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                    />
                    <span className="text-[11px] text-slate-500">Frequency of HTTP POST telemetry bursts (default: 5s)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Calibration Thresholds'}</span>
            </button>
          </form>
        )}

        {/* Tab 2: Backend Credentials Overview */}
        {activeTab === 'credentials' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-400" />
              Backend Configuration Status (.env.local)
            </h3>
            <p className="text-xs text-slate-400">
              The dashboard reads environment variables securely from server runtime. Check the checklist below:
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-300 block font-semibold">NEXT_PUBLIC_SUPABASE_URL</span>
                  <span className="text-[11px] text-slate-500">Database & Storage endpoint</span>
                </div>
                <span className="text-amber-400 font-medium">PENDING CONFIGURATION</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-300 block font-semibold">SUPABASE_SERVICE_ROLE_KEY</span>
                  <span className="text-[11px] text-slate-500">Server-only device ingestion secret</span>
                </div>
                <span className="text-amber-400 font-medium">PENDING CONFIGURATION</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-300 block font-semibold">DEVICE_SHARED_SECRET</span>
                  <span className="text-[11px] text-slate-500">ESP32 header authentication secret (x-device-secret)</span>
                </div>
                <span className="text-amber-400 font-medium">PENDING CONFIGURATION</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Alerts & Telegram */}
        {activeTab === 'alerts' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-400" />
              Telegram Notification Settings
            </h3>
            <p className="text-xs text-slate-400">
              Integrate with your Telegram bot (@BotFather) to broadcast critical alerts and control relays remotely.
            </p>

            <div className="space-y-3 text-xs max-w-xl">
              <div>
                <label className="text-slate-300 font-medium block">Telegram Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz"
                  className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block">Telegram Target Chat ID</label>
                <input
                  type="text"
                  placeholder="e.g. 123456789"
                  className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => alert('Telegram integration test requires valid token in .env.local (Phase 6).')}
                className="mt-2 rounded bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Send Test Notification
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
