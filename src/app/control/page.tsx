'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Power, 
  Sliders, 
  ShieldAlert, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Droplets,
  Lightbulb,
  Volume2,
  Lock
} from 'lucide-react';
import { HARDWARE_PINS, SystemMode, CommandStatus } from '@/types/iot';

interface RelayControlItem {
  id: string;
  name: string;
  channel: string;
  pin: number;
  description: string;
  state: boolean;
  status: CommandStatus;
  isLocked: boolean;
  lockReason?: string;
}

export default function ControlPage() {
  const [mode, setMode] = useState<SystemMode>('MANUAL');
  const [isDemo] = useState(true);

  // Actuator channels
  const [relays, setRelays] = useState<RelayControlItem[]>([
    {
      id: 'pump',
      name: 'Irrigation Submersible Pump',
      channel: 'IN1',
      pin: HARDWARE_PINS.RELAY_CH1_PUMP,
      description: 'Controls the 12V DC water pump via relay channel 1. Subject to low-water safety interlock.',
      state: false,
      status: 'SUCCEEDED',
      isLocked: false
    },
    {
      id: 'led',
      name: 'Farm Field LED / Grow Light',
      channel: 'IN2',
      pin: HARDWARE_PINS.RELAY_CH2_LED,
      description: 'Controls high-intensity nighttime or greenhouse supplemental lighting.',
      state: false,
      status: 'SUCCEEDED',
      isLocked: false
    },
    {
      id: 'buzzer',
      name: 'Acoustic Alarm Buzzer',
      channel: 'IN3',
      pin: HARDWARE_PINS.RELAY_CH3_BUZZER,
      description: 'Audible annunciator for critical low water, pump timeout or security motion alerts.',
      state: false,
      status: 'SUCCEEDED',
      isLocked: false
    },
    {
      id: 'spare',
      name: 'Spare Relay Channel (CH4)',
      channel: 'IN4',
      pin: HARDWARE_PINS.RELAY_CH4_SPARE,
      description: 'Hardware reserved. Kept permanently de-energized per safety protocol.',
      state: false,
      status: 'SUCCEEDED',
      isLocked: true,
      lockReason: 'Validation safety rule: CH4 is reserved and locked OFF.'
    }
  ]);

  const handleToggle = (id: string) => {
    if (mode === 'AUTO') {
      alert('Manual relay toggling is restricted in AUTO mode. Switch to MANUAL mode first to command actuators directly.');
      return;
    }

    setRelays(prev => prev.map(item => {
      if (item.id === id && !item.isLocked) {
        return {
          ...item,
          state: !item.state,
          status: 'QUEUED'
        };
      }
      return item;
    }));

    // In demo mode, simulate command progression: QUEUED -> EXECUTING -> SUCCEEDED
    setTimeout(() => {
      setRelays(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, status: 'SUCCEEDED' };
        }
        return item;
      }));
    }, 800);
  };

  const handleEmergencyAllOff = () => {
    setRelays(prev => prev.map(item => ({
      ...item,
      state: false,
      status: 'SUCCEEDED'
    })));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="h-6 w-6 text-emerald-400" />
              Actuator Command & Relay Control
            </h1>
            <p className="text-sm text-slate-400">
              HW-316 Active-Low 4-channel relay interlocks, manual override, and command dispatch queue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEmergencyAllOff}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
            >
              <ShieldAlert className="h-4 w-4" />
              EMERGENCY ALL OFF
            </button>
          </div>
        </div>

        {/* Mode Selector Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Operating Strategy</span>
              <h2 className="text-lg font-bold text-white mt-0.5">Control Mode: {mode}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'MANUAL'
                  ? 'Manual Mode: Relays are commanded directly by authenticated operator dashboard actions.'
                  : 'Automatic Mode: Relays are controlled by ESP32 hysteresis firmware rules based on calibrated thresholds.'}
              </p>
            </div>

            <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 self-start md:self-auto">
              <button
                onClick={() => setMode('MANUAL')}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'MANUAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                MANUAL OVERRIDE
              </button>
              <button
                onClick={() => setMode('AUTO')}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'AUTO'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                AUTOMATIC RULES
              </button>
            </div>
          </div>
        </div>

        {/* Safety Interlock Guideline Notice */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300 text-sm">Hardware Interlock Safeguards</p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><strong>Active-Low Relay Logic:</strong> ESP32 GPIO LOW activates the relay coil; GPIO HIGH de-activates it. All GPIO pins are initialized HIGH upon boot to guarantee safe OFF status.</li>
                <li><strong>Low-Water Pump Lockout:</strong> When the water sensor reading falls below the safety cutoff, pump actuation is locked out to prevent pump burnout.</li>
                <li><strong>Max Runtime Watchdog:</strong> Water pump has an automatic firmware shutdown after a maximum continuous run duration.</li>
                <li><strong>Channel 4 Spare:</strong> Kept strictly locked to prevent unassigned relay switching.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Relay Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {relays.map((relay) => {
            const isEnergized = relay.state;
            return (
              <div
                key={relay.id}
                className={`rounded-xl border p-5 transition-all ${
                  isEnergized 
                    ? 'border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-950/30' 
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{relay.name}</h3>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                        {relay.channel} • GPIO{relay.pin}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{relay.description}</p>
                  </div>

                  {relay.isLocked && (
                    <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  )}
                </div>

                {relay.lockReason && (
                  <div className="mt-3 rounded bg-slate-950/60 p-2 text-[11px] text-slate-400 border border-slate-800">
                    {relay.lockReason}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${isEnergized ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-xs font-mono font-bold uppercase text-slate-300">
                      {isEnergized ? 'COIL ENERGIZED (ON)' : 'COIL OFF (SAFE)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                      relay.status === 'SUCCEEDED' ? 'bg-slate-800 text-slate-400' :
                      relay.status === 'QUEUED' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      Ack: {relay.status}
                    </span>

                    <button
                      onClick={() => handleToggle(relay.id)}
                      disabled={relay.isLocked}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                        relay.isLocked
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : isEnergized
                          ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-950/50'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/50'
                      }`}
                    >
                      {isEnergized ? 'DE-ENERGIZE' : 'ENERGIZE'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
