'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sprout, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Authentication Shell: In Phase 2, this connects to Supabase Auth with Row Level Security.');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sprout className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AgriSense IoT Dashboard</h1>
          <p className="text-xs text-slate-400">
            Authenticated operator access for Smart Agriculture telemetry & relay automation.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur shadow-xl space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block">Email Address</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@farm.local"
                  required
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block">Password</label>
              <div className="relative mt-1">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 active:scale-98 transition-all"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <Link
              href="/dashboard"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              ← Return to Dashboard Shell
            </Link>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Protected by Row Level Security (RLS) & Device Secret Auth</span>
        </div>
      </div>
    </div>
  );
}
