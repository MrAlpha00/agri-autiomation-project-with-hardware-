'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Activity, 
  LineChart, 
  Sliders, 
  Camera, 
  Bell, 
  Settings, 
  Cpu,
  ShieldAlert,
  Sprout,
  X
} from 'lucide-react';
import { HARDWARE_PINS } from '@/types/iot';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/dashboard', label: 'System Overview', icon: LayoutDashboard },
  { href: '/sensors', label: 'Sensor Readings', icon: Activity },
  { href: '/analytics', label: 'Historical Analytics', icon: LineChart },
  { href: '/control', label: 'Relays & Controls', icon: Sliders },
  { href: '/camera', label: 'ESP32-CAM Stream', icon: Camera },
  { href: '/events', label: 'Events & Alerts', icon: Bell },
  { href: '/settings', label: 'Calibration & Config', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-md transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                AgriSense <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-medium">IoT</span>
              </span>
              <p className="text-[11px] text-slate-400 font-mono">ESP32 DevKit V1</p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-4">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Monitoring & Automation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/50'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Fixed Hardware GPIO Pinout Reference */}
        <div className="border-t border-slate-800/80 p-3.5 bg-slate-900/40">
          <div className="flex items-center justify-between pb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              Fixed Pinout Map
            </span>
            <span className="text-[10px] text-slate-500 font-mono">HW-316 Active-L</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-400">
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">Soil ADC</span>
              <span className="text-emerald-400 font-medium">GPIO{HARDWARE_PINS.SOIL_MOISTURE_ADC}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">DHT11</span>
              <span className="text-cyan-400 font-medium">GPIO{HARDWARE_PINS.DHT11_DATA}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">Water ADC</span>
              <span className="text-blue-400 font-medium">GPIO{HARDWARE_PINS.WATER_LEVEL_ADC}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">LDR ADC</span>
              <span className="text-amber-400 font-medium">GPIO{HARDWARE_PINS.LDR_LIGHT_ADC}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">IN1 Pump</span>
              <span className="text-emerald-400 font-medium">GPIO{HARDWARE_PINS.RELAY_CH1_PUMP}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">IN2 LED</span>
              <span className="text-yellow-400 font-medium">GPIO{HARDWARE_PINS.RELAY_CH2_LED}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">IN3 Buzzer</span>
              <span className="text-purple-400 font-medium">GPIO{HARDWARE_PINS.RELAY_CH3_BUZZER}</span>
            </div>
            <div className="rounded bg-slate-950/60 p-1.5 border border-slate-800/50">
              <span className="text-slate-500 block text-[9px] uppercase">PIR Motion</span>
              <span className="text-slate-400 font-medium">GPIO{HARDWARE_PINS.PIR_MOTION}</span>
            </div>
          </div>
        </div>

        {/* Safety Note Footer */}
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Active-Low Relay Interlock: Safe OFF on reset.</span>
        </div>
      </aside>
    </>
  );
}
