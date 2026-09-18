import React, { useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  X,
  AlertTriangle,
  Package,
  Layers,
  FileText,
  UserCheck,
  Building2
} from 'lucide-react';

export default function StockInOutModal({
  isOpen,
  onClose,
  type, // 'IN' or 'OUT'
  preselectedItem,
  items,
  onSubmit,
  loading
}) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [destinationOrSource, setDestinationOrSource] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const isStockIn = type === 'IN';

  useEffect(() => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem.id.toString());
      // Default common destinations / sources
      if (isStockIn) {
        setDestinationOrSource(preselectedItem.supplier ? `PO Delivery: ${preselectedItem.supplier}` : 'Supplier Delivery');
      } else {
        setDestinationOrSource(
          preselectedItem.department === 'Kitchen' ? 'Kitchen Main Line Prep' :
          preselectedItem.department === 'Bar' ? 'Main Bar Service Well' : 'Guest Rooms Daily Clean'
        );
      }
    } else if (items && items.length > 0) {
      setSelectedItemId(items[0].id.toString());
      if (isStockIn) {
        setDestinationOrSource('Supplier Delivery Inbound');
      } else {
        setDestinationOrSource('Department Line Station');
      }
    }
    setQuantity('');
    setNotes('');
    setError('');
  }, [preselectedItem, items, isStockIn, isOpen]);

  if (!isOpen) return null;

  const currentSelectedItem = items.find(i => i.id.toString() === selectedItemId) || preselectedItem;
  const numQty = parseFloat(quantity) || 0;

  // Calculate projected stock
  let projectedStock = currentSelectedItem ? currentSelectedItem.current_stock : 0;
  if (currentSelectedItem) {
    if (isStockIn) {
      projectedStock += numQty;
    } else {
      projectedStock = Math.max(0, projectedStock - numQty);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError('Please select an item.');
      return;
    }
    if (isNaN(numQty) || numQty <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }
    if (!isStockIn && currentSelectedItem && currentSelectedItem.current_stock < numQty) {
      setError(`Cannot issue ${numQty} ${currentSelectedItem.unit}. Available stock is only ${currentSelectedItem.current_stock} ${currentSelectedItem.unit}.`);
      return;
    }

    onSubmit({
      item_id: parseInt(selectedItemId),
      quantity: numQty,
      destination_or_source: destinationOrSource,
      notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between text-white ${
          isStockIn ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              {isStockIn ? <ArrowDownRight className="w-6 h-6 text-white" /> : <ArrowUpRight className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isStockIn ? 'Receive Stock (Stock In)' : 'Issue Stock (Stock Out)'}
              </h3>
              <p className="text-xs text-white/80">
                {isStockIn
                  ? 'Add delivered inventory to current quantities'
                  : 'Deduct issued items for kitchen, bar or rooms'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Inventory Item *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              {items.map((itm) => (
                <option key={itm.id} value={itm.id}>
                  [{itm.department}] {itm.name} — Current: {itm.current_stock} {itm.unit} ({itm.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Item Quick Info Card */}
          {currentSelectedItem && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Current Stock</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {currentSelectedItem.current_stock} {currentSelectedItem.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Min Par Level</span>
                <span className="font-bold text-slate-700 text-sm">
                  {currentSelectedItem.min_threshold} {currentSelectedItem.unit}
                </span>
              </div>
              <div className={isStockIn ? 'text-emerald-700' : 'text-blue-700'}>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">After Transaction</span>
                <span className="font-extrabold text-sm">
                  {projectedStock} {currentSelectedItem.unit}
                </span>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Quantity to {isStockIn ? 'Add (Receive)' : 'Deduct (Issue)'} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 5 or 24"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                {currentSelectedItem?.unit || 'units'}
              </span>
            </div>
          </div>

          {/* Source / Destination */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isStockIn ? 'Supplier / PO / Delivery Batch' : 'Destination Station / Reason'}
            </label>
            <input
              type="text"
              value={destinationOrSource}
              onChange={(e) => setDestinationOrSource(e.target.value)}
              placeholder={isStockIn ? 'e.g. Sysco PO-10294 or MedFoods Direct' : 'e.g. Saute Station, Main Bar, Banquet, Spillage'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Staff Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Temperature checked at delivery, batch 4"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50 ${
                isStockIn
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              {isStockIn ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              <span>{loading ? 'Processing...' : isStockIn ? 'Confirm Stock In' : 'Confirm Stock Out'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
