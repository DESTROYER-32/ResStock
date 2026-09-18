import React, { useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  ArrowDownRight,
  Truck,
  Package,
  Layers,
  Filter,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { useCurrency, CurrencyIcon } from '../context/CurrencyContext';

export default function AlertsView({
  items,
  selectedDepartment,
  setSelectedDepartment,
  onStockInItem
}) {
  const { currency, formatAmount } = useCurrency();
  const [filterDept, setFilterDept] = useState(selectedDepartment || 'All');
  const [severityFilter, setSeverityFilter] = useState('All'); // 'All', 'zero', 'low'

  // Filter items needing reorder (stock <= min_threshold)
  const alertItems = items.filter((item) => {
    if (item.current_stock > item.min_threshold) return false;
    if (filterDept !== 'All' && item.department !== filterDept) return false;
    if (severityFilter === 'zero' && item.current_stock !== 0) return false;
    if (severityFilter === 'low' && item.current_stock === 0) return false;
    return true;
  }).sort((a, b) => {
    // Sort zero stock items first, then by lowest percentage of threshold
    if (a.current_stock === 0 && b.current_stock > 0) return -1;
    if (b.current_stock === 0 && a.current_stock > 0) return 1;
    return (a.current_stock / a.min_threshold) - (b.current_stock / b.min_threshold);
  });

  const zeroCount = items.filter(i => (filterDept === 'All' || i.department === filterDept) && i.current_stock === 0).length;
  const lowCount = items.filter(i => (filterDept === 'All' || i.department === filterDept) && i.current_stock > 0 && i.current_stock <= i.min_threshold).length;

  // Calculate total recommended reorder cost
  const totalReorderEstCost = alertItems.reduce((acc, itm) => {
    const suggestedQty = Math.max(1, (itm.min_threshold * 2) - itm.current_stock);
    return acc + (suggestedQty * itm.cost_per_unit);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Alert Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Out of stock card */}
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Out of Stock (Zero)</span>
            <div className="text-3xl font-extrabold text-rose-600 mt-1">{zeroCount}</div>
            <p className="text-[11px] text-rose-700 mt-0.5">Critical service bottleneck</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <XCircle className="w-7 h-7" />
          </div>
        </div>

        {/* Low stock card */}
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Low Stock Warning</span>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">{lowCount}</div>
            <p className="text-[11px] text-amber-700 mt-0.5">At or below par threshold</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>

        {/* Estimated Reorder Cost */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Est. Restock Expense</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {formatAmount(totalReorderEstCost)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">To restore healthy par levels (2x min)</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700">
            <CurrencyIcon className="w-6 h-6 text-amber-400" currency={currency} />
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Filter Alerts:</span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {['All', 'Kitchen', 'Housekeeping', 'Bar'].map((dept) => (
              <button
                key={dept}
                onClick={() => {
                  setFilterDept(dept);
                  setSelectedDepartment(dept);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  filterDept === dept ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="All">All Severity Levels</option>
            <option value="zero">Out of Stock Only (Red)</option>
            <option value="low">Low Stock Only (Amber)</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid / Cards */}
      <div className="space-y-3">
        {alertItems.length > 0 ? (
          alertItems.map((item) => {
            const isZero = item.current_stock === 0;
            const suggestedOrder = Math.max(1, (item.min_threshold * 2) - item.current_stock);
            const estCost = (suggestedOrder * item.cost_per_unit).toFixed(2);

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isZero ? 'border-rose-200 bg-rose-50/20' : 'border-amber-200 bg-amber-50/15'
                }`}
              >
                {/* Left: Item identity & status badge */}
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isZero ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {isZero ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                      {isZero ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          Low Stock
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.department}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="font-mono text-slate-400">{item.sku}</span>
                      <span>•</span>
                      <span>Category: {item.category}</span>
                      {item.supplier && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span>Supplier: {item.supplier}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle: Stock statistics */}
                <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200/80 text-center text-xs min-w-[280px]">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Current</div>
                    <div className={`text-base font-extrabold ${isZero ? 'text-rose-600' : 'text-amber-600'}`}>
                      {item.current_stock} <span className="text-[11px] font-normal text-slate-500">{item.unit}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Min Par</div>
                    <div className="text-base font-bold text-slate-700">
                      {item.min_threshold} <span className="text-[11px] font-normal text-slate-500">{item.unit}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Suggested Reorder</div>
                    <div className="text-base font-bold text-emerald-600">
                      +{suggestedOrder} <span className="text-[11px] font-normal text-slate-500">{item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Restock Action Button */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-slate-400">Est. PO Cost</div>
                    <div className="text-xs font-bold text-slate-800">{formatAmount(estCost)}</div>
                  </div>

                  <button
                    onClick={() => onStockInItem(item)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Quick Restock (Stock In)</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-slate-900">All Stock Levels Healthy!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No items in {filterDept} currently require restocking. All inventories are above minimum safety thresholds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
