import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  Building,
  User,
  PackageCheck,
  PackageMinus
} from 'lucide-react';

export default function StockFlowView({
  items,
  selectedDepartment,
  onStockIn,
  onStockOut,
  recentTransactions,
  loading
}) {
  // Stock In state
  const [inItemId, setInItemId] = useState('');
  const [inQty, setInQty] = useState('');
  const [inSource, setInSource] = useState('Vendor Inbound PO');
  const [inNotes, setInNotes] = useState('');
  const [inError, setInError] = useState('');

  // Stock Out state
  const [outItemId, setOutItemId] = useState('');
  const [outQty, setOutQty] = useState('');
  const [outDest, setOutDest] = useState('Prep Line Station');
  const [outNotes, setOutNotes] = useState('');
  const [outError, setOutError] = useState('');

  const relevantItems = items.filter(
    i => selectedDepartment === 'All' || i.department === selectedDepartment
  );

  // Selected item lookup
  const selectedInItem = items.find(i => i.id.toString() === inItemId);
  const selectedOutItem = items.find(i => i.id.toString() === outItemId);

  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    if (!inItemId) {
      setInError('Please choose an item to receive.');
      return;
    }
    const q = parseFloat(inQty);
    if (isNaN(q) || q <= 0) {
      setInError('Quantity must be greater than 0.');
      return;
    }
    setInError('');
    await onStockIn({
      item_id: parseInt(inItemId),
      quantity: q,
      destination_or_source: inSource,
      notes: inNotes
    });
    setInQty('');
    setInNotes('');
  };

  const handleStockOutSubmit = async (e) => {
    e.preventDefault();
    if (!outItemId) {
      setOutError('Please choose an item to issue.');
      return;
    }
    const q = parseFloat(outQty);
    if (isNaN(q) || q <= 0) {
      setOutError('Quantity must be greater than 0.');
      return;
    }
    if (selectedOutItem && selectedOutItem.current_stock < q) {
      setOutError(`Insufficient stock! Available: ${selectedOutItem.current_stock} ${selectedOutItem.unit}`);
      return;
    }
    setOutError('');
    await onStockOut({
      item_id: parseInt(outItemId),
      quantity: q,
      destination_or_source: outDest,
      notes: outNotes
    });
    setOutQty('');
    setOutNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory Flow Workstation</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Fast terminal for warehouse and kitchen staff to log inbound supply deliveries and record outbound inventory issued to restaurant stations.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4" /> Receive Inbound
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" /> Issue Outbound
          </span>
        </div>
      </div>

      {/* Side-by-Side In & Out Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: STOCK IN (Receive) */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Order / Receive Stock (Stock In)</h3>
                  <p className="text-[11px] text-white/80">Adds inventory directly to active stock</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                Inbound
              </span>
            </div>

            <form onSubmit={handleStockInSubmit} className="p-5 space-y-4">
              {inError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{inError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Item to Receive *
                </label>
                <select
                  value={inItemId}
                  onChange={(e) => setInItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose item from {selectedDepartment} --</option>
                  {relevantItems.map((itm) => (
                    <option key={itm.id} value={itm.id}>
                      [{itm.department}] {itm.name} (Currently: {itm.current_stock} {itm.unit})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInItem && (
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Count</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {selectedInItem.current_stock} {selectedInItem.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">After Receiving</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {selectedInItem.current_stock + (parseFloat(inQty) || 0)} {selectedInItem.unit}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={inQty}
                    onChange={(e) => setInQty(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Supplier / Delivery PO
                  </label>
                  <input
                    type="text"
                    value={inSource}
                    onChange={(e) => setInSource(e.target.value)}
                    placeholder="e.g. Sysco PO-9023"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Receiving Notes (Optional)
                </label>
                <input
                  type="text"
                  value={inNotes}
                  onChange={(e) => setInNotes(e.target.value)}
                  placeholder="e.g. Stored in Walk-in cooler 1, inspected intact"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Confirm Stock In (Receive Delivery)</span>
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: STOCK OUT (Issue) */}
        <div className="bg-white rounded-2xl border border-blue-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <PackageMinus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Issue Stock (Stock Out)</h3>
                  <p className="text-[11px] text-white/80">Deducts inventory issued to service stations</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white uppercase tracking-wider">
                Outbound
              </span>
            </div>

            <form onSubmit={handleStockOutSubmit} className="p-5 space-y-4">
              {outError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{outError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Item to Issue *
                </label>
                <select
                  value={outItemId}
                  onChange={(e) => setOutItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose item from {selectedDepartment} --</option>
                  {relevantItems.map((itm) => (
                    <option key={itm.id} value={itm.id} disabled={itm.current_stock <= 0}>
                      [{itm.department}] {itm.name} (Stock: {itm.current_stock} {itm.unit}) {itm.current_stock <= 0 ? '(OUT OF STOCK)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOutItem && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Available Stock</span>
                    <span className={`text-sm font-extrabold ${selectedOutItem.current_stock <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {selectedOutItem.current_stock} {selectedOutItem.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Remaining After Issue</span>
                    <span className="text-sm font-extrabold text-blue-700">
                      {Math.max(0, selectedOutItem.current_stock - (parseFloat(outQty) || 0))} {selectedOutItem.unit}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity Issued *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={outQty}
                    onChange={(e) => setOutQty(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Issued To / Station
                  </label>
                  <input
                    type="text"
                    value={outDest}
                    onChange={(e) => setOutDest(e.target.value)}
                    placeholder="e.g. Line Station 2, Bar Well, Rooms"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason / Purpose (Optional)
                </label>
                <input
                  type="text"
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                  placeholder="e.g. Dinner service rush replenishment"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Confirm Stock Out (Issue to Station)</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Live Recent Transactions Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Recent Inventory Movements
            </h3>
          </div>
          <span className="text-xs text-slate-400">Live transaction stream</span>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {recentTransactions && recentTransactions.length > 0 ? (
            recentTransactions.slice(0, 8).map((tx) => {
              const isIn = tx.type === 'IN';
              return (
                <div key={tx.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isIn ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{tx.item_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{tx.sku}</span>
                        <span>•</span>
                        <span>{tx.destination_or_source || 'Station'}</span>
                        <span>•</span>
                        <span>By {tx.user_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-extrabold text-sm ${isIn ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {isIn ? '+' : '-'}{tx.quantity}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {tx.previous_stock} → {tx.new_stock}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">
              No transactions recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
