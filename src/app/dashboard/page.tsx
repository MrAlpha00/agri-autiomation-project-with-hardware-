'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Droplets, 
  Thermometer, 
  Sun, 
  Waves, 
  ShieldAlert, 
  Power, 
  Cpu, 
  Activity, 
  Clock, 
  Radio, 
  ArrowUpRight,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { HARDWARE_PINS } from '@/types/iot';

export default function DashboardPage() {
  // Phase 1 Initial Shell Data (Marked explicitly as Demo Telemetry)
  const isDemo = true;
  const mockTelemetry = {
    temperature: 24.8,
    humidity: 62.0,
    soilRaw: 2840, // Raw ADC 0-4095
    waterRaw: 1950, // Raw ADC 0-4095
    lightRaw: 1420, // Raw ADC 0-4095
    pirState: false, // GPIO26
    timestamp: '2026-10-24 10:55:00 UTC (Demo)',
    isStale: false,
    rssi: -67
  };

  const mockRelays = {
    pump: false,    // IN1 / GPIO18
    led: false,     // IN2 / GPIO19
    buzzer: false,  // IN3 / GPIO21
    spare: false    // IN4 / GPIO22
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Title & System Status Banner */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>System Overview</span>
              {isDemo && (
                <span className="text-xs font-mono font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  DEMO DATA
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-400">
              Live status, sensor telemetry, and actuator states for Smart Farm Unit #1.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/control"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              <Power className="h-4 w-4" />
              <span>Actuator Controls</span>
            </Link>
            <Link
              href="/sensors"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Sensor Details</span>
            </Link>
          </div>
        </div>

        {/* Top Metric Cards: 4 Primary Sensors */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Soil Moisture */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Soil Moisture (Raw ADC)</span>
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                GPIO{HARDWARE_PINS.SOIL_MOISTURE_ADC}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {mockTelemetry.soilRaw}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 4095 ADC</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span className="text-emerald-400 font-medium">Status: Adequate</span>
              <span className="text-[11px] text-slate-500">Uncalibrated</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.round((mockTelemetry.soilRaw / 4095) * 100)}%` }}
              />
            </div>
          </div>

          {/* Water Tank Level */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Reservoir Water Level</span>
              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-blue-400 border border-blue-500/20">
                GPIO{HARDWARE_PINS.WATER_LEVEL_ADC}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {mockTelemetry.waterRaw}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 4095 ADC</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span className="text-blue-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Safe Level
              </span>
              <span className="text-[11px] text-slate-500">Interlock: OK</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.round((mockTelemetry.waterRaw / 4095) * 100)}%` }}
              />
            </div>
          </div>

          {/* Temperature & Humidity (DHT11) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">DHT11 Climate</span>
              <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-cyan-400 border border-cyan-500/20">
                GPIO{HARDWARE_PINS.DHT11_DATA}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                  {mockTelemetry.temperature}°C
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Air Temp</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold tracking-tight text-cyan-400 font-mono">
                  {mockTelemetry.humidity}%
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">Rel Humidity</p>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Optimal range</span>
              <span>DHT11 Single-Bus</span>
            </div>
          </div>

          {/* Ambient Light LDR */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Ambient Light (LDR)</span>
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-400 border border-amber-500/20">
                GPIO{HARDWARE_PINS.LDR_LIGHT_ADC}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {mockTelemetry.lightRaw}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 4095 ADC</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span className="text-amber-400 font-medium">Daylight Mode</span>
              <span className="text-[11px] text-slate-500">Photoresistor</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.round((mockTelemetry.lightRaw / 4095) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actuators & PIR Hardware Status */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* HW-316 4-Channel Relay Actuators */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Power className="h-4 w-4 text-emerald-400" />
                  HW-316 Relay Module Status
                </h2>
                <p className="text-xs text-slate-400">
                  Active-Low opto-isolated relay channels. Safe OFF on power reset.
                </p>
              </div>
              <Link 
                href="/control" 
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                Control Center <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* CH1: Water Pump */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">IN1: Pump</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded">
                    GPIO{HARDWARE_PINS.RELAY_CH1_PUMP}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    {mockRelays.pump ? 'ENERGIZED' : 'DE-ENERGIZED'}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${mockRelays.pump ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Irrigation Submersible</p>
              </div>

              {/* CH2: Farm LED */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">IN2: Farm LED</span>
                  <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-1 rounded">
                    GPIO{HARDWARE_PINS.RELAY_CH2_LED}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    {mockRelays.led ? 'ENERGIZED' : 'DE-ENERGIZED'}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${mockRelays.led ? 'bg-yellow-400 animate-pulse' : 'bg-slate-700'}`} />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Grow Light Illuminator</p>
              </div>

              {/* CH3: Buzzer */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">IN3: Buzzer</span>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1 rounded">
                    GPIO{HARDWARE_PINS.RELAY_CH3_BUZZER}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    {mockRelays.buzzer ? 'ALARM ON' : 'SILENT'}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${mockRelays.buzzer ? 'bg-purple-400 animate-pulse' : 'bg-slate-700'}`} />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Acoustic Alert</p>
              </div>

              {/* CH4: Spare */}
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3 opacity-75">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">IN4: Spare</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                    GPIO{HARDWARE_PINS.RELAY_CH4_SPARE}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                    SPARE (OFF)
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">Unused / Reserved</p>
              </div>
            </div>
          </div>

          {/* PIR Sensor & Camera Quick Panel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              Security & Field Vision
            </h2>

            {/* PIR Motion Sensor Card */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">PIR Motion Detector</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  GPIO{HARDWARE_PINS.PIR_MOTION}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-400 font-mono">
                  {mockTelemetry.pirState ? 'MOTION DETECTED' : 'CLEAR / NO MOTION'}
                </span>
                <span className="text-[10px] font-medium text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/60">
                  Pending Wiring Test
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                PIR module is configured for GPIO26. Awaiting final field bench testing.
              </p>
            </div>

            {/* ESP32-CAM Quick Feed link */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">ESP32-CAM Module</span>
                <span className="text-[10px] text-slate-400 font-mono">Separate Wi-Fi</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Stream Status:</span>
                <span className="text-amber-400 font-mono">Not Commissioned</span>
              </div>
              <Link
                href="/camera"
                className="mt-3 block w-full rounded bg-slate-800/80 py-1.5 text-center text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Open Camera View & Settings →
              </Link>
            </div>
          </div>
        </div>

        {/* System Diagnostics & Telemetry Info */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-slate-500" />
            <span>Target Device: <strong className="text-slate-200">ESP32 DevKit V1 (ESP32-AGRI-01)</strong></span>
            <span className="text-slate-600">•</span>
            <span>Firmware: <strong className="text-slate-200">v1.0.0-rc1</strong></span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Wi-Fi RSSI: <strong className="text-emerald-400">-67 dBm</strong></span>
            <span>Uptime: <strong className="text-slate-300">0d 0h 0m</strong></span>
            <span>Telemetry: <strong className="text-amber-400">Simulated</strong></span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
