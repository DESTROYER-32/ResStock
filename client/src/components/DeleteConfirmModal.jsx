import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  item,
  items,
  onConfirm,
  loading
}) {
  if (!isOpen || (!item && (!items || items.length === 0))) return null;

  const isBulk = Boolean(items && items.length > 0);
  const itemCount = isBulk ? items.length : 1;

  const handleConfirm = () => {
    if (isBulk) {
      onConfirm(items.map(i => i.id));
    } else {
      onConfirm(item.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between text-rose-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm">
              {isBulk ? `Bulk Delete Items (${itemCount})` : 'Delete Inventory Item'}
            </h3>
          </div>
          <button onClick={onClose} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          {isBulk ? (
            <p className="text-slate-700">
              Are you sure you want to permanently delete <b className="text-rose-600">{itemCount} items</b> from inventory?
            </p>
          ) : (
            <p className="text-slate-700">
              Are you sure you want to permanently remove <b>"{item.name}"</b> (<span className="font-mono">{item.sku}</span>) from the {item.department} inventory?
            </p>
          )}

          {isBulk && (
            <div className="max-h-24 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              {items.slice(0, 8).map(i => (
                <div key={i.id} className="truncate">• {i.name} ({i.sku})</div>
              ))}
              {items.length > 8 && (
                <div className="text-amber-700 font-semibold">+ {items.length - 8} more items</div>
              )}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px]">
            This action cannot be undone. Past transaction logs will preserve audit references.
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Deleting...' : isBulk ? `Delete ${itemCount} Items` : 'Delete Item'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
