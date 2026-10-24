'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Camera, 
  Video, 
  WifiOff, 
  RefreshCw, 
  ShieldAlert, 
  Image as ImageIcon, 
  ExternalLink,
  Settings,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function CameraPage() {
  const [streamUrl, setStreamUrl] = useState('http://192.168.1.150:81/stream');
  const [captureUrl, setCaptureUrl] = useState('http://192.168.1.150/capture');
  const [isCommissioned, setIsCommissioned] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);

  const handleCaptureSnapshot = () => {
    setSnapshotLoading(true);
    // Simulate capture request for phase 1 shell
    setTimeout(() => {
      setSnapshotLoading(false);
      alert('Snapshot trigger sent. Note: ESP32-CAM is not yet connected to the local network or private subnet.');
    }, 1000);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Camera className="h-6 w-6 text-emerald-400" />
              ESP32-CAM Field Vision & Snapshots
            </h1>
            <p className="text-sm text-slate-400">
              Dedicated Wi-Fi camera unit for visual crop inspection, canopy health, and security surveillance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-mono text-amber-300">
              STATUS: AWAITING COMMISSIONING
            </span>
          </div>
        </div>

        {/* Remote vs Local Networking Architecture Notice */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-semibold text-blue-300 text-sm">
                Engineering Network Architecture: Local LAN vs Cloud HTTPS
              </p>
              <p className="text-slate-300 leading-relaxed">
                As per system design specifications, an ESP32-CAM webserver running on a private IP (e.g. <code>192.168.x.x</code>) cannot be accessed directly by a hosted public HTTPS dashboard due to browser Mixed-Content security restrictions and NAT routing.
              </p>
              <p className="text-slate-300 leading-relaxed">
                <strong>Recommended remote viewing path:</strong> Use an authenticated snapshot upload workflow where the ESP32-CAM captures a JPEG frame and posts it via HTTPS to Supabase Storage, or stream via a secure Tailscale / WireGuard private tunnel.
              </p>
            </div>
          </div>
        </div>

        {/* Live Stream & Snapshot Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Video Stream Viewer */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-white">Live MJPEG Stream</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Target: {streamUrl}</span>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video w-full rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              <WifiOff className="h-12 w-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Camera Feed Offline</p>
              <p className="text-xs text-slate-500 max-w-md mt-1">
                Unable to establish MJPEG stream with ESP32-CAM at <code>{streamUrl}</code>. Ensure the camera module is powered, connected to the same local Wi-Fi, and firmware is running.
              </p>
              <button
                onClick={() => alert('Checking connection to camera IP...')}
                className="mt-4 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Retry Stream Connection
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
              <span>Resolution Target: SVGA (800x600) / UXGA (1600x1200)</span>
              <span className="text-slate-500 font-mono">Continuous Video: NOT ENABLED (Snapshots on demand)</span>
            </div>
          </div>

          {/* Snapshot Action & Last Capture */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">Snapshot Capture</h2>
              </div>
            </div>

            {/* Snapshot Trigger Button */}
            <button
              onClick={handleCaptureSnapshot}
              disabled={snapshotLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-98 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${snapshotLoading ? 'animate-spin' : ''}`} />
              <span>{snapshotLoading ? 'Triggering Capture...' : 'Capture Immediate Snapshot'}</span>
            </button>

            {/* Last Captured Image Placeholder */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Latest Saved Snapshot</span>
              <div className="aspect-4/3 rounded bg-slate-900 border border-slate-800/80 flex flex-col items-center justify-center p-4 text-center">
                <Camera className="h-8 w-8 text-slate-700 mb-2" />
                <span className="text-xs text-slate-500">No snapshot captured yet</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-500 font-mono text-center">
                Last capture: None
              </p>
            </div>

            {/* Camera Network Config */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 block">Endpoints</span>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block">Stream URL</label>
                <input
                  type="text"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block">Capture URL</label>
                <input
                  type="text"
                  value={captureUrl}
                  onChange={(e) => setCaptureUrl(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
