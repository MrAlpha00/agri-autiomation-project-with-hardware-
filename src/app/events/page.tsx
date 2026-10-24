'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Filter, 
  Radio, 
  Clock,
  Eye,
  Droplets,
  Terminal
} from 'lucide-react';
import { AlertEvent, AlertSeverity } from '@/types/iot';

export default function EventsPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const mockEvents: AlertEvent[] = [
    {
      id: 'evt-001',
      type: 'LOW_WATER',
      severity: 'WARNING',
      message: 'Water tank depth ADC dropped below warning threshold (ADC: 620). Pump safety interlock active.',
      timestamp: '2026-10-24 10:30:15 UTC',
      acknowledged: false
    },
    {
      id: 'evt-002',
      type: 'PUMP_OVERTIME',
      severity: 'CRITICAL',
      message: 'Irrigation pump reached 120s max runtime safety limit. Automatic cutoff triggered.',
      timestamp: '2026-10-24 09:15:00 UTC',
      acknowledged: true,
      acknowledgedAt: '2026-10-24 09:16:10 UTC'
    },
    {
      id: 'evt-003',
      type: 'MOTION_DETECTED',
      severity: 'INFO',
      message: 'PIR motion detected on GPIO26 (Test pulse received).',
      timestamp: '2026-10-24 08:42:19 UTC',
      acknowledged: true,
      acknowledgedAt: '2026-10-24 08:43:00 UTC'
    },
    {
      id: 'evt-004',
      type: 'DEVICE_OFFLINE',
      severity: 'INFO',
      message: 'System initialized in Demo Mode. Ready for hardware binding.',
      timestamp: '2026-10-24 08:00:00 UTC',
      acknowledged: true
    }
  ];

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">CRITICAL</span>;
      case 'WARNING':
        return <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">WARNING</span>;
      case 'INFO':
      default:
        return <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/30">INFO</span>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Bell className="h-6 w-6 text-emerald-400" />
              System Events & Safety Alerts
            </h1>
            <p className="text-sm text-slate-400">
              Audit log of irrigation triggers, safety interlocks, motion detections, and command outcomes.
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 p-1">
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  filterSeverity === sev
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Event Logs List */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-800/80">
            {mockEvents
              .filter(e => filterSeverity === 'ALL' || e.severity === filterSeverity)
              .map((event) => (
                <div key={event.id} className="p-4 sm:p-5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {event.severity === 'CRITICAL' ? (
                          <ShieldAlert className="h-5 w-5 text-rose-400" />
                        ) : event.severity === 'WARNING' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getSeverityBadge(event.severity)}
                          <span className="text-xs font-mono font-medium text-slate-400">[{event.type}]</span>
                          <span className="text-xs text-slate-500 font-mono">{event.timestamp}</span>
                        </div>
                        <p className="text-sm text-slate-200 mt-1 font-medium">{event.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center ml-8 sm:ml-0">
                      {event.acknowledged ? (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Acknowledged
                        </span>
                      ) : (
                        <button
                          onClick={() => alert(`Acknowledged event ${event.id}`)}
                          className="rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
