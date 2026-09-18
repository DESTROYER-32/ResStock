import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  History,
  FileSpreadsheet,
  LogOut,
  Utensils,
  Wine,
  Sparkles,
  Layers,
  Store,
  ChevronRight,
  X,
  Settings,
  ShoppingBag,
  Beer,
  Coffee,
  Pizza,
  Package
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

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

export default function Sidebar({
  currentView,
  setCurrentView,
  selectedDepartment,
  setSelectedDepartment,
  stats,
  currentUser,
  onLogout,
  onOpenAdminSettings,
  mobileOpen,
  setMobileOpen,
  departmentsList = []
}) {
  const { formatAmount } = useCurrency();

  const departments = [
    { id: 'All', name: 'All Departments', icon: Layers, color: 'text-indigo-400' },
    ...(departmentsList.length > 0
      ? departmentsList.map(d => ({
          id: d.name,
          name: d.name,
          icon: DEPT_ICON_MAP[d.icon] || Layers,
          color: d.color || 'text-indigo-400'
        }))
      : [
          { id: 'Kitchen', name: 'Kitchen', icon: Utensils, color: 'text-amber-400' },
          { id: 'Housekeeping', name: 'Housekeeping', icon: Sparkles, color: 'text-teal-400' },
          { id: 'Bar', name: 'Bar', icon: Wine, color: 'text-purple-400' }
        ])
  ];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory Items', icon: Boxes },
    { id: 'stock-flow', label: 'Stock In / Out', icon: ArrowLeftRight, highlight: true },
    {
      id: 'alerts',
      label: 'Alerts & Reorders',
      icon: AlertTriangle,
      badge: (stats?.overall?.out_of_stock || 0) + (stats?.overall?.low_stock || 0),
      badgeColor: 'bg-rose-500 text-white'
    },
    {
      id: 'orders',
      label: 'Purchase Orders',
      icon: ShoppingBag,
      badge: stats?.overall?.pending_orders || 0,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    { id: 'transactions', label: 'Transaction Log', icon: History },
    { id: 'excel', label: 'Excel Import / Export', icon: FileSpreadsheet }
  ];

  const getDeptAlerts = (deptName) => {
    if (!stats?.departments) return 0;
    if (deptName === 'All') {
      return (stats?.overall?.out_of_stock || 0) + (stats?.overall?.low_stock || 0);
    }
    const d = stats.departments.find(item => item.department === deptName);
    return d ? (d.out_of_stock + d.low_stock) : 0;
  };

  const handleNavClick = (viewId) => {
    setCurrentView(viewId);
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleDeptClick = (deptId) => {
    setSelectedDepartment(deptId);
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50
        w-72 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0
        border-r border-slate-800 transition-transform duration-300 ease-in-out
        lg:static lg:h-full lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-bold">
                <Store className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h1 className="font-bold text-base text-white tracking-tight">ResStock Pro</h1>
                <p className="text-[11px] text-slate-400 font-medium">Restaurant Inventory OS</p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Department Switcher Section */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Department Focus</span>
              {currentUser?.role === 'Admin' ? (
                <button
                  type="button"
                  onClick={() => onOpenAdminSettings && onOpenAdminSettings('departments')}
                  title="Add or Remove Departments"
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 transition hover:underline cursor-pointer"
                >
                  <span>+ Edit</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">Switch View</span>
              )}
            </div>
            <div className="space-y-1">
              {departments.map((dept) => {
                const Icon = dept.icon;
                const isSelected = selectedDepartment === dept.id;
                const alertCount = getDeptAlerts(dept.id);

                return (
                  <button
                    key={dept.id}
                    onClick={() => handleDeptClick(dept.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-inner'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${dept.color}`} />
                      <span>{dept.name}</span>
                    </div>
                    {alertCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                        {alertCount} alert{alertCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Navigation Links */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700/80 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor || 'bg-amber-500 text-slate-950'}`}>
                        {item.badge}
                      </span>
                    )}

                    {item.highlight && !item.badge && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Quick
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Metrics Badge Card */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs space-y-2">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{selectedDepartment} Summary</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Tracked Items</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {stats?.overall?.total_items || 0}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Valuation</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {formatAmount(stats?.overall?.total_valuation || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {currentUser?.name || 'Staff User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.role || 'Team Member'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {currentUser?.role === 'Admin' && (
                <button
                  onClick={onOpenAdminSettings}
                  title="System & Database Settings"
                  className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 p-1.5 rounded-lg transition"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onLogout}
                title="Log out"
                className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
