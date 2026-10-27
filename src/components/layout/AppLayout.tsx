'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isHardwareOnline, setIsHardwareOnline] = useState(false);
  const [lastTelemetryTime, setLastTelemetryTime] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch('/api/config/status');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          const hw = data.hardwareStatus;
          if (hw && hw.isOnline) {
            setIsHardwareOnline(true);
            setIsDemoMode(false);
            setLastTelemetryTime(hw.lastSeen ? new Date(hw.lastSeen).toLocaleTimeString() : 'Active');
          } else {
            setIsHardwareOnline(false);
            // Keep demo mode clearly labeled until actual hardware data is received
            setIsDemoMode(true);
            if (hw?.lastSeen) {
              setLastTelemetryTime(`Offline (Last seen ${new Date(hw.lastSeen).toLocaleTimeString()})`);
            } else {
              setLastTelemetryTime('Offline (Awaiting Hardware Feed)');
            }
          }
        }
      } catch {
        // Fallback default
      }
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleEmergencyStop = () => {
    alert('Emergency Stop triggered: Commanded immediate de-energize of Water Pump (GPIO18 -> HIGH / Active-Low OFF).');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isDemoMode={isDemoMode}
          isHardwareOnline={isHardwareOnline}
          systemMode="MANUAL"
          lastTelemetryTime={lastTelemetryTime || 'Offline (Awaiting Hardware Feed)'}
          onEmergencyStop={handleEmergencyStop}
        />

        {/* Demo Mode & Hardware Status Advisory Banner */}
        {isDemoMode && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Hardware Advisory:</strong> Running in <strong>Demo Shell Mode</strong>. Telemetry shown is simulated for interface verification until live ESP32 DevKit V1 telemetry is received by the backend.
                </span>
              </div>
              <Link
                href="/settings"
                className="shrink-0 underline hover:text-amber-100 font-medium ml-2"
              >
                Backend Configuration Status →
              </Link>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
          <p>
            Smart Agriculture IoT System • ESP32 DevKit V1 (38-pin) • HW-316 4-Channel Active-Low Relay • ESP32-CAM
          </p>
        </footer>
      </div>
    </div>
  );
}
