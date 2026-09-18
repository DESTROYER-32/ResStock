import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Utensils, Sparkles, Wine, ShieldCheck, Lock, User, ArrowRight, Store } from 'lucide-react';

export default function LoginView({ onLoginSuccess, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDemoUsers()
      .then(users => {
        if (Array.isArray(users)) {
          setDemoUsers(users);
        }
      })
      .catch(() => setDemoUsers([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      showToast({ type: 'success', message: `Welcome back, ${data.user.name}!` });
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demo) => {
    setUsername(demo.username);
    setPassword(demo.password);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-700/20">
        {/* Left Side: Brand & Department Highlights */}
        <div className="bg-slate-900 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Store className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">ResStock Pro</h1>
                <p className="text-xs text-slate-400">Restaurant Stock & Inventory OS</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-100 mb-3 leading-snug">
              Smart Stock Management Across Every Department
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Real-time multi-department stock tracking, automated par-level threshold alerts, instant Stock In / Out workflows, and Excel bulk sync.
            </p>

            {/* Department Badges */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Kitchen Pantry & Cold Prep</div>
                  <div className="text-xs text-slate-400">Meats, seafood, dairy, produce & dry goods</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Wine className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Bar & Cellar Inventory</div>
                  <div className="text-xs text-slate-400">Spirits, wines, craft draft kegs & mixers</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-sm">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200">Housekeeping & Sanitization</div>
                  <div className="text-xs text-slate-400">Chemicals, paper goods, towels & linens</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Secure JWT Sessions
            </span>
            <span>SQLite Embedded DB</span>
          </div>
        </div>

        {/* Right Side: Login Form & Quick Logins */}
        <div className="p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Sign in to Inventory</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your restaurant staff credentials to continue</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or chef_marco"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : (
                  <>
                    <span>Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Buttons - only shown when demo mode is active */}
            {Array.isArray(demoUsers) && demoUsers.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wider">
                  Quick Demo Logins (Click to autofill):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {demoUsers.map((demo) => (
                    <button
                      key={demo.username}
                      type="button"
                      onClick={() => handleQuickLogin(demo)}
                      className="text-left p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition group"
                    >
                      <div className="text-xs font-medium text-slate-800 group-hover:text-amber-700">
                        {demo.name ? demo.name.split(' ')[0] : demo.username} ({demo.department || 'All'})
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {demo.username} / {demo.password}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-[11px] text-slate-400">
            ResStock Pro • Restaurant Inventory OS
          </div>
        </div>
      </div>
    </div>
  );
}
