import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  AlertCircle,
  CheckCircle2,
  MapPin
} from 'lucide-react';

export default function ReceiveOrderModal({
  isOpen,
  onClose,
  order,
  onSubmit,
  loading
}) {
  // Initialize received quantities to ordered_quantity for each line item
  const [lineItems, setLineItems] = useState([]);
  const [destination, setDestination] = useState('Central Receiving Dock');
  const [receivingNotes, setReceivingNotes] = useState('');

  // Sync line items whenever order changes
  useEffect(() => {
    if (order && order.items) {
      setLineItems(order.items.map(item => ({
        order_item_id: item.id,
        item_id: item.item_id,
        item_name: item.item_name,
        sku: item.sku,
        ordered_quantity: item.ordered_quantity,
        received_quantity: item.ordered_quantity, // default to ordered quantity
        unit: item.unit,
        unit_cost: item.unit_cost
      })));
    } else {
      setLineItems([]);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleQtyChange = (orderItemId, newQty) => {
    setLineItems(prev => prev.map(item => {
      if (item.order_item_id === orderItemId) {
        return {
          ...item,
          received_quantity: Math.max(0, parseFloat(newQty) || 0)
        };
      }
      return item;
    }));
  };

  const handleSetAllToOrdered = () => {
    setLineItems(prev => prev.map(item => ({
      ...item,
      received_quantity: item.ordered_quantity
    })));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      received_items: lineItems.map(l => ({
        order_item_id: l.order_item_id,
        item_id: l.item_id,
        received_quantity: parseFloat(l.received_quantity) || 0
      })),
      notes: receivingNotes.trim(),
      destination: destination.trim()
    };
    onSubmit(order.id, payload);
  };

  const totalOrderedQty = lineItems.reduce((s, i) => s + (parseFloat(i.ordered_quantity) || 0), 0);
  const totalReceivedQty = lineItems.reduce((s, i) => s + (parseFloat(i.received_quantity) || 0), 0);
  const hasDiscrepancy = lineItems.some(i => parseFloat(i.received_quantity) !== parseFloat(i.ordered_quantity));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Receive Purchase Order</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 font-semibold">{order.order_number}</span>
              </div>
              <p className="text-xs text-emerald-100">
                Vendor: <b>{order.supplier}</b> • Department: <b>{order.department}</b>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Verify items arrived. You can <b>edit the received quantity</b> for any item if the physical delivery differed from what was ordered.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSetAllToOrdered}
            className="text-[11px] font-bold text-emerald-800 hover:underline"
          >
            Reset All to Ordered
          </button>
        </div>

        {/* Line items form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Item Name & SKU</th>
                    <th className="py-2.5 px-4 font-bold text-center">Ordered Qty</th>
                    <th className="py-2.5 px-4 font-bold text-center w-40">Received Qty (Editable)</th>
                    <th className="py-2.5 px-4 font-bold text-center">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {lineItems.map((item) => {
                    const diff = (parseFloat(item.received_quantity) || 0) - (parseFloat(item.ordered_quantity) || 0);

                    return (
                      <tr key={item.order_item_id} className="hover:bg-white transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.item_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{item.sku}</div>
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {item.ordered_quantity} <span className="text-[11px] font-normal text-slate-400">{item.unit}</span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.received_quantity}
                              onChange={(e) => handleQtyChange(item.order_item_id, e.target.value)}
                              className={`w-24 px-2.5 py-1.5 text-center font-extrabold text-sm rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                diff < 0
                                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                                  : diff > 0
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-emerald-50/50 border-emerald-300 text-emerald-900'
                              }`}
                              required
                            />
                            <span className="text-xs text-slate-500 font-medium">{item.unit}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {diff === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" /> Exact
                            </span>
                          ) : diff < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                              Short ({diff})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                              Extra (+{diff})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receiving Details: Dock / Destination & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Receiving Dock / Storage Location:
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Main Kitchen Cooler, Dry Storage Aisle 2"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Receipt Notes (Invoice #, delivery comments):
              </label>
              <input
                type="text"
                value={receivingNotes}
                onChange={(e) => setReceivingNotes(e.target.value)}
                placeholder="e.g. Invoice #9948, delivered via Sysco truck #4"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Summary Callout */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-slate-500">Summary of Incoming Stock:</div>
              <div className="font-bold text-slate-900 text-sm">
                Adding <span className="text-emerald-700">{totalReceivedQty}</span> units directly to active inventory.
              </div>
              {hasDiscrepancy && (
                <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                  Notice: Delivery quantity differs from ordered amount ({totalReceivedQty} vs {totalOrderedQty}). Inventory will reflect actual received stock.
                </div>
              )}
            </div>

            <div className="text-right text-[11px] text-slate-500">
              Audit logs will record Inbound Delivery automatically.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-700/20 transition disabled:opacity-40"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              <span>Confirm Receipt & Update Stock Immediately</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
