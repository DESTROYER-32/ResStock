import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, RefreshCw, Sparkles, Layers, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function ClearDataModal({
  isOpen,
  onClose,
  selectedDepartment,
  departmentsList = [],
  onDataChanged,
  showToast
}) {
  const [scope, setScope] = useState('All');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClear = async () => {
    setLoading(true);
    try {
      const res = await api.clearDemoData(scope);
      showToast({ type: 'success', message: res.message });
      setConfirming(false);
      onDataChanged();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to clear data' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSample = async () => {
    setLoading(true);
    try {
      const res = await api.seedDemoData();
      showToast({ type: 'success', message: res.message });
      onDataChanged();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to restore demo data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Clear Inventory & Transactions</h3>
              <p className="text-xs text-white/80">Wipe demo data to start fresh with your real stock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Reset to Clean Slate</span>
            </div>
            <p className="leading-relaxed text-slate-700">
              This will remove active stock items and transaction logs according to your chosen scope below. Use this when you are ready to upload your real restaurant stock via Excel or enter it manually.
            </p>
            <div className="text-[11px] font-semibold text-emerald-700 pt-1">
              ✓ User accounts and logins will NOT be deleted.
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select What to Clear:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              {[
                { id: 'All', label: 'All Departments (Everything)' },
                ...(departmentsList.length > 0
                  ? departmentsList.map(d => ({ id: d.name, label: `${d.name} Only` }))
                  : [
                      { id: 'Kitchen', label: 'Kitchen Only' },
                      { id: 'Housekeeping', label: 'Housekeeping Only' },
                      { id: 'Bar', label: 'Bar Only' }
                    ]
                )
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScope(opt.id)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    scope === opt.id
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {!confirming ? (
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear {scope === 'All' ? 'All Inventory Data' : `${scope} Inventory Data`}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleRestoreSample}
                  disabled={loading}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Demo Sample Items Instead</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-center">
              <p className="font-bold text-xs text-slate-900">
                Are you sure you want to clear <u>{scope === 'All' ? 'ALL inventory items' : `all ${scope} items`}</u>?
              </p>
              <p className="text-[11px] text-slate-500">
                This action will delete the selected stock records and reset their counts to 0.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{loading ? 'Clearing...' : 'Yes, Wipe Data'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
