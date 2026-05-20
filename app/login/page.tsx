'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('admin@smartretail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success === true) {
        router.push('/');
        router.refresh();
      } else {
        setMessage(data.message || 'Login failed');
      }
    } catch {
      setMessage('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <span className="text-xl font-bold text-white">SR</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Smart Retail Business</h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@smartretail.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                type="password"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {message && (
              <div className="rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Secure business intelligence platform
          </div>
        </div>
      </div>
    </main>
  );
}