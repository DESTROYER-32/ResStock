import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  RefreshCw,
  AlertTriangle,
  XCircle,
  ChevronRight
} from 'lucide-react';

export default function Navbar({
  currentView,
  selectedDepartment,
  stats,
  onOpenStockIn,
  onOpenStockOut,
  onOpenAddItem,
  onOpenExcelModal,
  onRefresh,
  loading,
  setMobileOpen,
  onNavigateToAlerts
}) {
  const [alertsDropdownOpen, setAlertsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const totalAlerts = (stats?.overall?.out_of_stock || 0) + (stats?.overall?.low_stock || 0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAlertsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewTitles = {
    dashboard: 'Operations Dashboard',
    inventory: 'Master Inventory Management',
    'stock-flow': 'Stock In & Stock Out Workstation',
    alerts: 'Low Stock & Reorder Alerts',
    orders: 'Purchase Orders & Vendor Receipts',
    transactions: 'Transaction & Audit Logs',
    excel: 'Excel Import & Export Center'
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {selectedDepartment}
            </span>
            <span className="text-slate-300">/</span>
            <h2 className="text-base font-bold text-slate-900 leading-none">
              {viewTitles[currentView] || 'Inventory Dashboard'}
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
            Track, balance, and reorder kitchen, housekeeping & bar stock seamlessly
          </p>
        </div>
      </div>

      {/* Right side: Action Buttons & Alerts */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh live stock counts"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
        </button>

        {/* Alerts Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setAlertsDropdownOpen(!alertsDropdownOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Stock alerts"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center shadow-xs">
                {totalAlerts > 9 ? '9+' : totalAlerts}
              </span>
            )}
          </button>

          {/* Alert Dropdown Panel */}
          {alertsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Inventory Alerts ({totalAlerts})</span>
                </div>
                <button
                  onClick={() => {
                    setAlertsDropdownOpen(false);
                    onNavigateToAlerts();
                  }}
                  className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {stats?.criticalItems && stats.criticalItems.length > 0 ? (
                  stats.criticalItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setAlertsDropdownOpen(false);
                        onNavigateToAlerts();
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition"
                    >
                      {item.status === 'OUT_OF_STOCK' ? (
                        <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0">
                          <XCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-slate-400">{item.sku}</span>
                          <span>•</span>
                          <span>{item.department}</span>
                        </div>
                        <div className="text-[11px] font-medium mt-1">
                          {item.status === 'OUT_OF_STOCK' ? (
                            <span className="text-rose-600 font-semibold">0 {item.unit} (Out of Stock)</span>
                          ) : (
                            <span className="text-amber-600 font-semibold">{item.current_stock} {item.unit} (Min: {item.min_threshold})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No critical stock alerts right now. All items healthy!
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-slate-100 text-center bg-slate-50/70 rounded-b-xl">
                <button
                  onClick={() => {
                    setAlertsDropdownOpen(false);
                    onNavigateToAlerts();
                  }}
                  className="w-full text-center text-xs font-semibold text-slate-700 hover:text-amber-600 transition"
                >
                  Go to Reorder & Alerts Dashboard →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Button: Stock In */}
        <button
          onClick={onOpenStockIn}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 transition"
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Stock In</span>
        </button>

        {/* Quick Action Button: Stock Out */}
        <button
          onClick={onOpenStockOut}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-600/20 transition"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Stock Out</span>
        </button>

        {/* Quick Action Button: Add Item */}
        <button
          onClick={onOpenAddItem}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Item</span>
        </button>

        {/* Excel Import/Export Trigger */}
        <button
          onClick={onOpenExcelModal}
          className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
          title="Upload or export Excel spreadsheets"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Excel Sync</span>
        </button>
      </div>
    </header>
  );
}
