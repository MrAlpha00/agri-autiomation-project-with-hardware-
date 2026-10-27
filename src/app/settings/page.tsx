'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Settings, 
  Sliders, 
  ShieldAlert, 
  Bell, 
  Key, 
  Save, 
  Info,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Send,
  Radio
} from 'lucide-react';
import { CalibrationThresholds } from '@/types/iot';

interface VariableStatus {
  key: string;
  description: string;
  isConfigured: boolean;
  isPublic: boolean;
  isSecret: boolean;
  requiredFor: string;
  source: string;
  vercelScope: string;
}

interface BackendStatusResponse {
  timestamp: string;
  isFullyConfigured: boolean;
  stats: {
    total: number;
    configured: number;
    pending: number;
  };
  supabaseHealth: {
    status: 'CONNECTED' | 'UNCONFIGURED' | 'ERROR';
    message: string;
    latencyMs?: number;
  };
  hardwareStatus: {
    isOnline: boolean;
    lastSeen: string | null;
    deviceId: string;
    note: string;
  };
  variables: VariableStatus[];
}

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

  // Dynamic backend configuration status
  const [backendStatus, setBackendStatus] = useState<BackendStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Telegram test status
  const [telegramSending, setTelegramSending] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testCustomMessage, setTestCustomMessage] = useState('');

  const loadStatus = async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch('/api/config/status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch configuration status`);
      }
      const data: BackendStatusResponse = await res.json();
      setBackendStatus(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown status check failure';
      setStatusError(msg);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/config/status')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch configuration status`);
        return res.json();
      })
      .then((data: BackendStatusResponse) => {
        if (active) {
          setBackendStatus(data);
          setLoadingStatus(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Unknown status check failure';
          setStatusError(msg);
          setLoadingStatus(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Threshold calibration settings saved locally. In Phase 2, this commits to device_settings table in Supabase.');
    }, 700);
  };

  const handleSendTelegramTest = async () => {
    setTelegramSending(true);
    setTelegramFeedback(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testCustomMessage.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setTelegramFeedback({
          success: false,
          message: data.error || data.hint || `Test notification failed (HTTP ${res.status})`,
        });
      } else {
        setTelegramFeedback({
          success: true,
          message: `${data.message} (Message ID: ${data.messageId || 'ok'})`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with test endpoint';
      setTelegramFeedback({
        success: false,
        message: msg,
      });
    } finally {
      setTelegramSending(false);
    }
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

          <button
            onClick={loadStatus}
            disabled={loadingStatus}
            className="self-start md:self-auto flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>{loadingStatus ? 'Checking Backend...' : 'Recheck Backend Health'}</span>
          </button>
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
            {backendStatus && backendStatus.stats.pending > 0 && (
              <span className="rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0.2 text-[10px] font-mono">
                {backendStatus.stats.pending} pending
              </span>
            )}
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
          <div className="space-y-6">
            {/* Status Summary & Health Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supabase Health Check */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Database & Backend Health</h3>
                  </div>
                  {backendStatus?.supabaseHealth.status === 'CONNECTED' ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> CONNECTED
                    </span>
                  ) : backendStatus?.supabaseHealth.status === 'ERROR' ? (
                    <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> ERROR
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-amber-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> UNCONFIGURED
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {backendStatus?.supabaseHealth.message || 'Checking backend status...'}
                </p>

                {backendStatus?.supabaseHealth.message?.includes('PGRST205') && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-300">
                    <strong>Schema Action Required:</strong> Open your Supabase Dashboard → SQL Editor and execute <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">supabase/schema.sql</code> to create <code className="text-amber-200">public.device_state</code> and related tables.
                  </div>
                )}

                {backendStatus?.supabaseHealth.latencyMs !== undefined && (
                  <p className="text-[11px] font-mono text-slate-500">
                    Round-trip latency: <strong className="text-slate-300">{backendStatus.supabaseHealth.latencyMs} ms</strong>
                  </p>
                )}
              </div>

              {/* Hardware Heartbeat Status */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Target ESP32 Status</h3>
                  </div>
                  {backendStatus?.hardwareStatus.isOnline ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                      ONLINE
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400">
                      OFFLINE
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {backendStatus?.hardwareStatus.note || 'Hardware status pending verification.'}
                </p>

                <p className="text-[11px] font-mono text-slate-500">
                  Target device ID: <strong className="text-slate-300">{backendStatus?.hardwareStatus.deviceId || 'ESP32-AGRI-01'}</strong>
                  {backendStatus?.hardwareStatus.lastSeen && (
                    <> • Last heartbeat: <strong className="text-slate-300">{backendStatus.hardwareStatus.lastSeen}</strong></>
                  )}
                </p>
              </div>
            </div>

            {/* Vercel Redeployment Notice */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300 text-sm">Vercel Environment Variable Deployment Rule</p>
                  <p className="text-slate-300 leading-relaxed">
                    When you add or update environment variables in <strong>Vercel Project Settings → Environment Variables</strong>, they do not automatically apply to existing running serverless functions. <strong>You must trigger a new deployment (Redeploy in Vercel or git push)</strong> for the changes to take effect in the production runtime.
                  </p>
                </div>
              </div>
            </div>

            {/* Environment Variables Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Key className="h-4 w-4 text-emerald-400" />
                    Environment Variables Runtime Checklist
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Evaluated securely by server runtime without leaking secret tokens to browser.
                  </p>
                </div>

                {backendStatus && (
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {backendStatus.stats.configured} of {backendStatus.stats.total} configured
                  </span>
                )}
              </div>

              {statusError && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {statusError}
                </div>
              )}

              <div className="space-y-3 font-mono text-xs">
                {backendStatus?.variables.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-200 font-bold">{item.key}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.isSecret
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {item.isSecret ? 'Server Secret' : 'Public'}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                          {item.vercelScope}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans">{item.description}</p>
                      <p className="text-[10px] text-slate-500 font-sans">
                        <strong>Source:</strong> {item.source}
                      </p>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      {item.isConfigured ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> CONFIGURED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-400">
                          <AlertCircle className="h-3 w-3" /> PENDING CONFIGURATION
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Alerts & Telegram */}
        {activeTab === 'alerts' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-400" />
                Telegram Notification & Alert Integration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Broadcast critical farm alerts (low water safety interlock, pump timeouts, unauthorized motion) to your Telegram chat.
              </p>
            </div>

            {/* Telegram Configuration Status Check */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-200 block">Server Runtime Configuration Status:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">TELEGRAM_BOT_TOKEN</span>
                  {backendStatus?.variables.find(v => v.key === 'TELEGRAM_BOT_TOKEN')?.isConfigured ? (
                    <span className="text-emerald-400 font-semibold">CONFIGURED</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">NOT CONFIGURED</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">TELEGRAM_CHAT_ID</span>
                  {backendStatus?.variables.find(v => v.key === 'TELEGRAM_CHAT_ID')?.isConfigured ? (
                    <span className="text-emerald-400 font-semibold">CONFIGURED</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">NOT CONFIGURED</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Configure both variables in Vercel or local <code>.env.local</code>. Secrets are read exclusively by server route handlers and never exposed in the browser.
              </p>
            </div>

            {/* Telegram Test Trigger Form */}
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="text-slate-300 font-medium text-xs block">
                  Optional Custom Test Message
                </label>
                <input
                  type="text"
                  value={testCustomMessage}
                  onChange={(e) => setTestCustomMessage(e.target.value)}
                  placeholder="e.g. Field Unit 1 bench test notification"
                  className="mt-1 w-full rounded bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 text-xs font-mono"
                />
                <span className="text-[11px] text-slate-500">Leave blank to dispatch standard system diagnostic alert.</span>
              </div>

              <button
                type="button"
                onClick={handleSendTelegramTest}
                disabled={telegramSending}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
              >
                {telegramSending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{telegramSending ? 'Dispatching to Telegram...' : 'Send Live Test Notification'}</span>
              </button>

              {/* Real Server Feedback */}
              {telegramFeedback && (
                <div className={`rounded-xl border p-4 text-xs transition-all ${
                  telegramFeedback.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {telegramFeedback.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {telegramFeedback.success ? 'Notification Sent Successfully' : 'Notification Failed'}
                      </p>
                      <p className="mt-1 text-slate-300 leading-relaxed font-mono text-[11px]">
                        {telegramFeedback.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
