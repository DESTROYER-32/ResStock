import {
  Boxes,
  AlertTriangle,
  XCircle,
  ArrowDownRight,
  ArrowUpRight,
  Utensils,
  Wine,
  Sparkles,
  ChevronRight,
  TrendingUp,
  PackagePlus,
  PlusCircle,
  Clock,
  ShieldAlert,
  Beer,
  Coffee,
  Pizza,
  ShoppingBag,
  Store,
  Layers,
  Package
} from 'lucide-react';
import { useCurrency, CurrencyIcon } from '../context/CurrencyContext';

const DEPT_ICON_MAP = {
  Utensils,
  Wine,
  Sparkles,
  Beer,
  Coffee,
  Pizza,
  ShoppingBag,
  Boxes,
  Package,
  Store,
  Layers
};

export default function DashboardView({
  stats,
  selectedDepartment,
  setSelectedDepartment,
  departmentsList = [],
  setCurrentView,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAddItem,
  onStockInItem
}) {
  const { currency, formatAmount } = useCurrency();
  const overall = stats?.overall || {};
  const departments = stats?.departments || [];
  const criticalItems = stats?.criticalItems || [];

  return (
    <div className="space-y-6">
      {/* Critical Zero Inventory Banner if any items are out of stock */}
      {overall.out_of_stock > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">
                Critical Zero Stock Alert: {overall.out_of_stock} item{overall.out_of_stock > 1 ? 's' : ''} currently completely out of stock!
              </div>
              <p className="text-xs text-rose-700 mt-0.5">
                Kitchen stations and bars may experience service disruption without immediate restock.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('alerts')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <span>Resolve Stockouts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Value</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CurrencyIcon className="w-5 h-5" currency={currency} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatAmount(overall.total_valuation || 0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Current holdings valuation</span>
            </div>
          </div>
        </div>

        {/* Total Items */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracked SKUs</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {overall.total_items || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{overall.in_stock || 0} in stock</span>
              <span>• across departments</span>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => setCurrentView('alerts')}
          className="p-5 rounded-2xl bg-white border border-amber-200/90 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Low Stock Warning</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              {overall.low_stock || 0}
            </div>
            <div className="text-[11px] text-amber-700/80 mt-1 flex items-center gap-1">
              <span>Below minimum threshold</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>

        {/* Out of Stock Items */}
        <div
          onClick={() => setCurrentView('alerts')}
          className="p-5 rounded-2xl bg-white border border-rose-200/90 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-rose-400 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Zero Stock</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">
              {overall.out_of_stock || 0}
            </div>
            <div className="text-[11px] text-rose-700/80 mt-1 flex items-center gap-1">
              <span>Immediate restock required</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Core Stock Workflow Actions Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col lg:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="max-w-xl">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Core Restaurant Workflow
          </span>
          <h3 className="text-xl font-bold text-white mt-2">
            Receive Deliveries or Issue Stock to Stations
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Record incoming stock deliveries (Stock In) or issue items to prep cooks, bartenders, and housekeeping attendants (Stock Out). The system automatically validates thresholds and maintains full audit history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={onOpenStockIn}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 transition active:scale-98"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Receive Stock (Stock In)</span>
          </button>

          <button
            onClick={onOpenStockOut}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition active:scale-98"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Issue Stock (Stock Out)</span>
          </button>
        </div>
      </div>

      {/* Department Breakdown Cards (Kitchen, Housekeeping, Bar) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Department Inventory Health
          </h3>
          <span className="text-xs text-slate-400">Click any card to filter inventory</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => {
            const deptMeta = departmentsList.find(d => d.name === dept.department);
            const Icon = (deptMeta && DEPT_ICON_MAP[deptMeta.icon]) || DEPT_ICON_MAP[dept.department] || Boxes;
            const isCurrent = selectedDepartment === dept.department;
            const healthPct = dept.total_items > 0
              ? Math.round((dept.in_stock / dept.total_items) * 100)
              : 100;

            return (
              <div
                key={dept.department}
                onClick={() => {
                  setSelectedDepartment(dept.department);
                  setCurrentView('inventory');
                }}
                className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md ${
                  isCurrent ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-xs' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{dept.department}</h4>
                      <p className="text-[11px] text-slate-400">{dept.total_items} items tracked</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Progress Bar of Health */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span className="text-slate-500">Stock In Stock</span>
                    <span className={healthPct > 70 ? 'text-emerald-600' : 'text-amber-600'}>
                      {healthPct}% Healthy
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(dept.in_stock / (dept.total_items || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${(dept.low_stock / (dept.total_items || 1)) * 100}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${(dept.out_of_stock / (dept.total_items || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Valuation</span>
                    <div className="font-bold text-slate-800">
                      {formatAmount(dept.total_valuation || 0, 0)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {dept.out_of_stock > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {dept.out_of_stock} out
                      </span>
                    )}
                    {dept.low_stock > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        {dept.low_stock} low
                      </span>
                    )}
                    {dept.out_of_stock === 0 && dept.low_stock === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        Optimal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Restock Queue Table with 1-Click Stock In Action */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Priority Restock Queue
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Items at or below minimum threshold needing replenishment
            </p>
          </div>

          <button
            onClick={() => setCurrentView('alerts')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Full Alerts View</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Item & SKU</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Stock Status</th>
                <th className="py-3 px-4 font-semibold">Current / Min</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criticalItems.length > 0 ? (
                criticalItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.department}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.status === 'OUT_OF_STOCK' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {item.current_stock} <span className="font-normal text-slate-500">{item.unit}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Min threshold: {item.min_threshold} {item.unit}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.supplier || 'Standard Distributor'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onStockInItem(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Stock In</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No critical stock items right now! Everything is above par level.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
