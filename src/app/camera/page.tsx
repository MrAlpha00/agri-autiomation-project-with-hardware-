'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Camera, 
  Video, 
  WifiOff, 
  RefreshCw, 
  Image as ImageIcon, 
  Info,
  ExternalLink,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

export default function CameraPage() {
  const [streamUrl, setStreamUrl] = useState(
    process.env.NEXT_PUBLIC_CAMERA_STREAM_URL || 'http://192.168.1.150:81/stream'
  );
  const [captureUrl, setCaptureUrl] = useState(
    process.env.NEXT_PUBLIC_CAMERA_CAPTURE_URL || 'http://192.168.1.150/capture'
  );
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [latestSnapshot, setLatestSnapshot] = useState<string | null>(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [isHttpsPage, setIsHttpsPage] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHttpsPage(window.location.protocol === 'https:');
    }
  }, []);

  const isLocalHttpStream = isHttpsPage && streamUrl.startsWith('http://');

  const handleCaptureSnapshot = async () => {
    setSnapshotLoading(true);
    setStreamError(false);

    try {
      // Append cache buster timestamp
      const targetUrl = `${captureUrl}${captureUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      
      const img = new Image();
      img.onload = () => {
        setLatestSnapshot(targetUrl);
        setSnapshotTimestamp(new Date().toLocaleTimeString());
        setSnapshotLoading(false);
      };
      img.onerror = () => {
        setSnapshotLoading(false);
        setStreamError(true);
      };
      img.src = targetUrl;
    } catch {
      setSnapshotLoading(false);
      setStreamError(true);
    }
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
            <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
              RHYX M21-45 (GC2145) • RGB565 / JPEG
            </span>
          </div>
        </div>

        {/* Mixed Content & Subnet Architecture Advisory */}
        {isLocalHttpStream && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-semibold text-amber-300 text-sm">
                  Browser Security Notice: Mixed-Content (HTTPS vs Local HTTP)
                </p>
                <p className="text-slate-300 leading-relaxed">
                  You are viewing this dashboard over a secure <strong>HTTPS</strong> connection, while the camera stream is configured to a plain local network <strong>HTTP</strong> address (<code>{streamUrl}</code>).
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Modern browsers block direct unencrypted HTTP sub-resources inside HTTPS web pages. To view the live feed:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li><strong>Local Testing:</strong> Open the stream directly in a new browser tab on your local Wi-Fi.</li>
                  <li><strong>Cloud Deployment:</strong> Expose the ESP32-CAM via a secure HTTPS tunnel (e.g. Cloudflare Tunnel, ngrok, or Tailscale) and update <code>NEXT_PUBLIC_CAMERA_STREAM_URL</code>.</li>
                </ul>
                <div className="pt-2">
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                  >
                    Open Camera Stream Directly In New Tab <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Stream & Snapshot Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Video Stream Viewer */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-white">Live MJPEG Stream</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Endpoint: {streamUrl}</span>
            </div>

            {/* Video Viewport */}
            <div className="relative aspect-video w-full rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {!isLocalHttpStream ? (
                <img
                  src={streamUrl}
                  alt="ESP32-CAM live stream"
                  onError={() => setStreamError(true)}
                  className="w-full h-full object-contain"
                />
              ) : null}

              {(streamError || isLocalHttpStream) && (
                <div className="flex flex-col items-center justify-center p-4">
                  <WifiOff className="h-12 w-12 text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">
                    {isLocalHttpStream ? 'Local Stream Blocked by Browser' : 'Camera Feed Offline / Unreachable'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mt-1">
                    {isLocalHttpStream
                      ? 'Local HTTP camera streams cannot be directly embedded into hosted HTTPS websites without a secure proxy or tunnel.'
                      : `Unable to establish MJPEG stream with ESP32-CAM at ${streamUrl}. Ensure camera is powered and connected to Wi-Fi.`}
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <a
                      href={streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
                    >
                      Open Stream Directly <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => {
                        setStreamError(false);
                      }}
                      className="rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      Retry Connection
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
              <span>Sensor: GC2145 (QQVGA 160x120 software JPEG)</span>
              <span className="text-slate-500 font-mono">Port: :81/stream (MJPEG)</span>
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
              <span>{snapshotLoading ? 'Capturing Frame...' : 'Capture Immediate Snapshot'}</span>
            </button>

            {/* Latest Captured Image Display */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Latest Saved Snapshot</span>
              {latestSnapshot ? (
                <div className="aspect-4/3 rounded bg-black border border-slate-800/80 overflow-hidden flex items-center justify-center">
                  <img
                    src={latestSnapshot}
                    alt="Captured snapshot"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-4/3 rounded bg-slate-900 border border-slate-800/80 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="h-8 w-8 text-slate-700 mb-2" />
                  <span className="text-xs text-slate-500">No snapshot captured yet</span>
                </div>
              )}
              <p className="mt-2 text-[10px] text-slate-500 font-mono text-center">
                Last capture: {snapshotTimestamp || 'None'}
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
