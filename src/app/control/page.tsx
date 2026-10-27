'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Sliders, 
  ShieldAlert, 
  Lock,
  RefreshCw,
  AlertCircle,
  Radio
} from 'lucide-react';
import { HARDWARE_PINS, SystemMode, CommandStatus } from '@/types/iot';

interface RelayControlItem {
  id: 'pump' | 'led' | 'buzzer' | 'spare';
  name: string;
  channel: string;
  pin: number;
  description: string;
  state: boolean;
  status: CommandStatus;
  isLocked: boolean;
  lockReason?: string;
  activeCommandId?: string | null;
}

export default function ControlPage() {
  const [mode, setMode] = useState<SystemMode>('MANUAL');
  const [modePending, setModePending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHardwareOnline, setIsHardwareOnline] = useState(false);
  const activePollers = useRef<Map<string, NodeJS.Timeout>>(new Map());

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
      isLocked: false,
    },
    {
      id: 'led',
      name: 'Farm Field LED / Grow Light',
      channel: 'IN2',
      pin: HARDWARE_PINS.RELAY_CH2_LED,
      description: 'Controls high-intensity nighttime or greenhouse supplemental lighting.',
      state: false,
      status: 'SUCCEEDED',
      isLocked: false,
    },
    {
      id: 'buzzer',
      name: 'Acoustic Alarm Buzzer',
      channel: 'IN3',
      pin: HARDWARE_PINS.RELAY_CH3_BUZZER,
      description: 'Audible annunciator for critical low water, pump timeout or security motion alerts.',
      state: false,
      status: 'SUCCEEDED',
      isLocked: false,
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
      lockReason: 'Validation safety rule: CH4 is reserved and locked OFF.',
    },
  ]);

  // Fetch initial device state on mount
  useEffect(() => {
    let mounted = true;
    async function fetchState() {
      try {
        const res = await fetch('/api/device/state');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.deviceState) {
          setIsHardwareOnline(Boolean(data.deviceState.isOnline));
          setMode(data.deviceState.mode || 'MANUAL');

          const serverRelays = data.deviceState.relays as Record<string, boolean> | undefined;
          if (serverRelays) {
            setRelays((prev) =>
              prev.map((r) => {
                if (r.activeCommandId) return r; // Don't overwrite if actively awaiting acknowledgement
                const key = r.id === 'led' ? 'light' : r.id;
                return {
                  ...r,
                  state: Boolean(serverRelays[key]),
                };
              })
            );
          }
        }
      } catch {
        // Fallback default
      }
    }

    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
      // Clean up pollers
      activePollers.current.forEach((t) => clearInterval(t));
      activePollers.current.clear();
    };
  }, []);

  // Poll command status until terminal state (SUCCEEDED, FAILED, TIMED_OUT)
  const pollCommandAck = (commandId: string, relayId: string, targetState: boolean) => {
    if (activePollers.current.has(commandId)) return;

    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s max

    const poller = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/commands?commandId=${commandId}`);
        if (!res.ok) {
          if (attempts >= maxAttempts) cleanup();
          return;
        }

        const data = await res.json();
        const cmd = data.command;
        if (!cmd) return;

        setRelays((prev) =>
          prev.map((r) => {
            if (r.id === relayId && r.activeCommandId === commandId) {
              const status = cmd.status as CommandStatus;
              return {
                ...r,
                status,
                // Only flip the energized state if acknowledged as SUCCEEDED
                state: status === 'SUCCEEDED' ? targetState : r.state,
                activeCommandId: status === 'EXECUTING' || status === 'QUEUED' ? commandId : null,
              };
            }
            return r;
          })
        );

        if (cmd.status === 'SUCCEEDED' || cmd.status === 'FAILED' || cmd.status === 'TIMED_OUT') {
          if (cmd.status === 'FAILED') {
            setErrorMessage(`Command execution failed: ${cmd.error_details || cmd.message || 'Hardware rejected command'}`);
          } else if (cmd.status === 'TIMED_OUT') {
            setErrorMessage('Command timed out awaiting ESP32 hardware acknowledgement (60s limit).');
          }
          cleanup();
        }
      } catch {
        if (attempts >= maxAttempts) cleanup();
      }
    }, 2000);

    function cleanup() {
      clearInterval(poller);
      activePollers.current.delete(commandId);
    }

    activePollers.current.set(commandId, poller);
  };

  const handleToggle = async (id: 'pump' | 'led' | 'buzzer' | 'spare') => {
    setErrorMessage(null);
    const targetItem = relays.find((r) => r.id === id);
    if (!targetItem || targetItem.isLocked) return;

    if (mode === 'AUTO') {
      setErrorMessage('Manual relay toggling is restricted in AUTO mode. Switch to MANUAL mode first to command actuators directly.');
      return;
    }

    const nextState = !targetItem.state;
    let commandName = '';
    if (id === 'pump') commandName = nextState ? 'PUMP_ON' : 'PUMP_OFF';
    else if (id === 'led') commandName = nextState ? 'LIGHT_ON' : 'LIGHT_OFF';
    else if (id === 'buzzer') commandName = nextState ? 'BUZZER_ON' : 'BUZZER_OFF';

    // Mark as QUEUED locally
    setRelays((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'QUEUED' } : r))
    );

    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'ESP32-AGRI-01',
          command: commandName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to dispatch command to server.');
        setRelays((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'FAILED' } : r))
        );
        return;
      }

      const commandId = data.commandId;
      setRelays((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'QUEUED', activeCommandId: commandId } : r
        )
      );

      // Start polling for actual hardware acknowledgement
      pollCommandAck(commandId, id, nextState);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setErrorMessage(msg);
      setRelays((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'FAILED' } : r))
      );
    }
  };

  const handleSetMode = async (targetMode: SystemMode) => {
    if (mode === targetMode || modePending) return;
    setErrorMessage(null);
    setModePending(true);

    try {
      const command = targetMode === 'AUTO' ? 'SET_MODE_AUTO' : 'SET_MODE_MANUAL';
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'ESP32-AGRI-01',
          command,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to dispatch mode command.');
        return;
      }

      setMode(targetMode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setErrorMessage(msg);
    } finally {
      setModePending(false);
    }
  };

  const handleEmergencyAllOff = async () => {
    setErrorMessage(null);
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'ESP32-AGRI-01',
          command: 'ALL_OFF',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to dispatch emergency shutdown command.');
        return;
      }

      // Mark all non-locked as QUEUED
      setRelays((prev) =>
        prev.map((r) => (!r.isLocked ? { ...r, status: 'QUEUED' } : r))
      );

      const commandId = data.commandId;
      if (commandId) {
        // Poll for completion
        const poller = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/commands?commandId=${commandId}`);
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.command?.status === 'SUCCEEDED') {
                clearInterval(poller);
                setRelays((prev) =>
                  prev.map((r) => ({
                    ...r,
                    state: false,
                    status: 'SUCCEEDED',
                    activeCommandId: null,
                  }))
                );
              }
            }
          } catch {
            clearInterval(poller);
          }
        }, 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Emergency shutdown dispatch error';
      setErrorMessage(msg);
    }
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

        {/* Error Alert Display */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Command Rejected / Interlock Active</p>
                <p className="mt-0.5 text-slate-300 font-mono text-[11px]">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Operating Strategy</span>
                {isHardwareOnline ? (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-mono flex items-center gap-1">
                    <Radio className="h-2.5 w-2.5" /> Device Online
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.2 text-[10px] font-mono">
                    Device Polling Awaiting
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">Control Mode: {mode}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {mode === 'MANUAL'
                  ? 'Manual Mode: Relays are commanded directly by authenticated operator dashboard actions.'
                  : 'Automatic Mode: Relays are controlled by ESP32 hysteresis firmware rules based on calibrated thresholds.'}
              </p>
            </div>

            <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 self-start md:self-auto">
              <button
                onClick={() => handleSetMode('MANUAL')}
                disabled={modePending}
                className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'MANUAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                MANUAL OVERRIDE
              </button>
              <button
                onClick={() => handleSetMode('AUTO')}
                disabled={modePending}
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
                <li><strong>Low-Water Pump Lockout:</strong> When the water sensor reading falls below ADC 600, pump actuation is locked out to prevent pump burnout.</li>
                <li><strong>Asynchronous Acknowledgment:</strong> Relays only show energized once the hardware successfully executes the command and acknowledges via <code>/api/device/ack</code>.</li>
                <li><strong>Channel 4 Spare:</strong> Kept strictly locked to prevent unassigned relay switching.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Relay Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {relays.map((relay) => {
            const isEnergized = relay.state;
            const isPending = relay.status === 'QUEUED' || relay.status === 'EXECUTING';

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
                    <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                      relay.status === 'SUCCEEDED' ? 'bg-slate-800 text-slate-400' :
                      relay.status === 'QUEUED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      relay.status === 'EXECUTING' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                      relay.status === 'TIMED_OUT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isPending && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                      Ack: {relay.status}
                    </span>

                    <button
                      onClick={() => handleToggle(relay.id)}
                      disabled={relay.isLocked || isPending}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
                        relay.isLocked
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : isEnergized
                          ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-950/50'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/50'
                      }`}
                    >
                      {isPending
                        ? 'DISPATCHING...'
                        : isEnergized
                        ? 'DE-ENERGIZE'
                        : 'ENERGIZE'}
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
