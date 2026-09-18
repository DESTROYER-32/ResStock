import React, { useState } from 'react';
import {
  Settings,
  Trash2,
  UserPlus,
  X,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Coins
} from 'lucide-react';
import { api } from '../api';
import { useCurrency, CurrencyIcon, AVAILABLE_CURRENCIES } from '../context/CurrencyContext';

export default function AdminSettingsModal({
  isOpen,
  onClose,
  onDataCleared,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('clean'); // 'clean', 'user', or 'currency'
  const { currency, setCurrency, formatAmount, currencies } = useCurrency();
  const [customCurrency, setCustomCurrency] = useState('');

  // User form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Staff');
  const [department, setDepartment] = useState('Kitchen');

  // Reset data form state
  const [clearScope, setClearScope] = useState('All');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.register({
        username,
        password,
        name,
        role,
        department
      });
      showToast({ type: 'success', message: `Staff user "${username}" created successfully.` });
      setUsername('');
      setPassword('');
      setName('');
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDataSubmit = async (e) => {
    e.preventDefault();
    if (!confirmPassword.trim()) {
      showToast({ type: 'error', message: 'Please enter your password to authorize reset.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.clearDemoData(clearScope, confirmPassword.trim());
      showToast({ type: 'success', message: res.message });
      setConfirmPassword('');
      setConfirmCheckbox(false);
      onDataCleared();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Data reset failed. Check your password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">System Settings & Administration</h3>
              <p className="text-xs text-slate-400">Manage user accounts and database maintenance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('clean')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'clean'
                ? 'border-amber-500 text-amber-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Reset Data</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('user')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'user'
                ? 'border-amber-500 text-amber-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>Add Staff</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'currency'
                ? 'border-amber-500 text-amber-800 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Currency ({currency})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {activeTab === 'clean' && (
            <form onSubmit={handleClearDataSubmit} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Permanent Database Reset</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  This will permanently wipe inventory items, purchase orders, and transaction audit logs for the selected scope. User login accounts are never deleted.
                </p>
              </div>

              {/* Department Scope Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Scope to Clear:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'All', label: 'Entire Database (All)' },
                    { id: 'Kitchen', label: 'Kitchen Only' },
                    { id: 'Housekeeping', label: 'Housekeeping Only' },
                    { id: 'Bar', label: 'Bar Only' }
                  ].map(sc => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setClearScope(sc.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition ${
                        clearScope === sc.id
                          ? 'bg-rose-50/80 border-rose-400 text-rose-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password Requirement Input */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Admin Password Verification (Required) *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter your current password to authorize reset"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  You must confirm your account password before this destructive action will be accepted.
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  required
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  I understand this action is permanent and cannot be reversed.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!confirmCheckbox || !confirmPassword.trim() || loading}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Authorize & Reset {clearScope === 'All' ? 'All Data' : `${clearScope} Data`}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'user' && (
            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Username *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. chef_john"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Kitchen Manager">Kitchen Manager</option>
                    <option value="Bar Manager">Bar Manager</option>
                    <option value="Housekeeping Lead">Housekeeping Lead</option>
                    <option value="Admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Kitchen">Kitchen</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Bar">Bar</option>
                    <option value="All">All Departments</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'currency' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                  <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Display Currency Configuration</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Select your store's preferred monetary currency. Indian Rupee (₹) is default. This immediately updates inventory valuations, alerts, and cost displays across all views.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-2">Preset Currencies:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currencies.map(c => {
                    const isSelected = currency === c.symbol;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.symbol);
                          showToast({ type: 'success', message: `Currency set to ${c.name}` });
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                            <span className="text-base text-amber-600">{c.symbol}</span>
                            <span>{c.code}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{c.country}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom currency symbol input */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700">Custom Currency Symbol / Code:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value)}
                    placeholder="e.g. Rs., CHF, ¥, Kr..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    maxLength={5}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customCurrency.trim()) return;
                      setCurrency(customCurrency.trim());
                      showToast({ type: 'success', message: `Currency set to ${customCurrency.trim()}` });
                      setCustomCurrency('');
                    }}
                    disabled={!customCurrency.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Format Preview</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                    <div className="text-slate-400 text-[10px]">Total Inventory Value</div>
                    <div className="text-sm font-black text-amber-400 mt-0.5">{formatAmount(245800.50)}</div>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                    <div className="text-slate-400 text-[10px]">Single Item Unit Cost</div>
                    <div className="text-sm font-black text-white mt-0.5">{formatAmount(140.00)}</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
