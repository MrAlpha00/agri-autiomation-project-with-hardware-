'use client';

import React from 'react';
import { Menu, ShieldAlert, WifiOff, Radio, Cpu } from 'lucide-react';
import { SystemMode } from '@/types/iot';

interface HeaderProps {
  onToggleSidebar: () => void;
  systemMode?: SystemMode;
  isHardwareOnline?: boolean;
  isDemoMode?: boolean;
  lastTelemetryTime?: string | null;
  onEmergencyStop?: () => void;
}

export function Header({
  onToggleSidebar,
  systemMode = 'MANUAL',
  isHardwareOnline = false,
  isDemoMode = true,
  lastTelemetryTime = null,
  onEmergencyStop
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-md lg:px-8">
      {/* Left section: Hamburger & Status Overview */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {/* Connection status badge */}
          {isDemoMode ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <span>DEMO MODE (Mock Telemetry)</span>
            </div>
          ) : isHardwareOnline ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <Radio className="h-3 w-3" />
              <span>ESP32-AGRI-01 ONLINE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">
              <WifiOff className="h-3 w-3" />
              <span>ESP32 OFFLINE</span>
            </div>
          )}

          {/* Mode Badge */}
          <span className={`hidden sm:inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-mono font-medium border ${
            systemMode === 'AUTO' 
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            <Cpu className="h-3 w-3" />
            MODE: {systemMode}
          </span>
        </div>
      </div>

      {/* Right section: Last Sync & Emergency Stop */}
      <div className="flex items-center gap-3">
        {/* Last telemetry heartbeat */}
        <div className="hidden md:flex flex-col text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Last Telemetry</span>
          <span className="text-xs font-mono text-slate-300">
            {lastTelemetryTime ? lastTelemetryTime : 'Awaiting Hardware Feed'}
          </span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={onEmergencyStop}
          title="Emergency Stop: Immediately de-energize water pump relay"
          className="flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 active:scale-95 transition-all"
        >
          <ShieldAlert className="h-4 w-4" />
          <span className="hidden sm:inline">EMERGENCY STOP</span>
          <span className="sm:hidden">STOP</span>
        </button>
      </div>
    </header>
  );
}
