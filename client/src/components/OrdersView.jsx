import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  Plus,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Boxes,
  RefreshCw,
  Printer,
  MessageSquare
} from 'lucide-react';
import PrintPurchaseOrderModal from './PrintPurchaseOrderModal';

export default function OrdersView({
  orders = [],
  selectedDepartment,
  setSelectedDepartment,
  onOpenCreateOrder,
  onOpenReceiveOrder,
  onDeleteOrder,
  loading,
  onRefresh,
  showToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'PENDING', 'RECEIVED'
  const [vendorFilter, setVendorFilter] = useState('All');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [printModalOrder, setPrintModalOrder] = useState(null);

  // Distinct vendors
  const vendors = useMemo(() => {
    const s = new Set();
    orders.forEach(o => {
      if (o.supplier) s.add(o.supplier);
    });
    return Array.from(s).sort();
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedDepartment !== 'All' && order.department !== selectedDepartment) {
        return false;
      }
      if (statusFilter !== 'All' && order.status !== statusFilter) {
        return false;
      }
      if (vendorFilter !== 'All' && order.supplier !== vendorFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNumber = order.order_number.toLowerCase().includes(q);
        const matchVendor = order.supplier.toLowerCase().includes(q);
        const matchNotes = order.notes && order.notes.toLowerCase().includes(q);
        const matchItem = order.items && order.items.some(i => i.item_name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchNumber && !matchVendor && !matchNotes && !matchItem) return false;
      }
      return true;
    });
  }, [orders, selectedDepartment, statusFilter, vendorFilter, searchTerm]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const deptOrders = selectedDepartment === 'All' ? orders : orders.filter(o => o.department === selectedDepartment);
    const pending = deptOrders.filter(o => o.status === 'PENDING');
    const received = deptOrders.filter(o => o.status === 'RECEIVED');
    const pendingUnits = pending.reduce((sum, o) => {
      return sum + (o.items || []).reduce((s, i) => s + (parseFloat(i.ordered_quantity ?? i.quantity_ordered ?? 0)), 0);
    }, 0);
    const receivedUnits = received.reduce((sum, o) => {
      return sum + (o.items || []).reduce((s, i) => s + (parseFloat(i.received_quantity ?? i.ordered_quantity ?? 0)), 0);
    }, 0);

    return {
      total: deptOrders.length,
      pendingCount: pending.length,
      receivedCount: received.length,
      pendingUnits,
      receivedUnits
    };
  }, [orders, selectedDepartment]);

  const departments = ['All', 'Kitchen', 'Housekeeping', 'Bar'];

  const toggleExpand = (id) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            <span>Purchase Orders & Vendor Deliveries</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage vendor orders, verify received shipments, and update inventory stock levels immediately.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh orders list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          )}

          <button
            onClick={onOpenCreateOrder}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pending Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Orders</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{kpis.pendingCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting delivery & receipt</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Received Orders */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Completed Orders</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{kpis.receivedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Stock updated in inventory</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Pending PO Inbound Units */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Units on Order</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{kpis.pendingUnits}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total units awaiting delivery</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Active Vendors */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Active Vendors</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{vendors.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Suppliers with orders</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Department Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedDepartment === dept
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {dept === 'All' ? 'All Departments' : dept}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['All', 'PENDING', 'RECEIVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'All' ? 'All Statuses' : st === 'PENDING' ? '⏳ Pending' : '✓ Received'}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Vendor Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PO #, vendor, notes, or item name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>

          <div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            >
              <option value="All">All Vendors</option>
              {vendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 shadow-xs">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-700">No purchase orders found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {orders.length === 0
                ? 'Create a purchase order from low stock alerts or select items directly from your inventory table.'
                : 'No orders match your current department, status, or search filters.'}
            </p>
            <button
              onClick={onOpenCreateOrder}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Order</span>
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isPending = order.status === 'PENDING';
            const isExpanded = expandedOrderId === order.id;
            const items = order.items || [];

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition"
              >
                {/* Order Summary Bar */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: PO # & Vendor Details */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isPending ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          {order.order_number}
                        </span>

                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {order.supplier}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.department === 'Kitchen'
                            ? 'bg-amber-100 text-amber-800'
                            : order.department === 'Bar'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {order.department}
                        </span>

                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending Delivery
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Received
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                        <span>Created: {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {order.received_at && (
                          <span className="text-emerald-700 font-semibold">
                            Received: {new Date(order.received_at).toLocaleDateString()}
                          </span>
                        )}
                        <span>By: {order.created_by}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Items, Quantity, & Primary Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right pr-2">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {items.reduce((s, i) => s + (parseFloat(i.ordered_quantity ?? i.quantity_ordered ?? 0)), 0)} Units
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {items.length} line item{items.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mark as Received button for Pending orders */}
                      {isPending && (
                        <button
                          onClick={() => onOpenReceiveOrder(order)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Mark as Received</span>
                        </button>
                      )}

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition text-xs font-semibold flex items-center gap-1"
                        title={isExpanded ? 'Hide items' : 'View line items'}
                      >
                        <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Items'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {/* Print / PDF Docket Button */}
                      <button
                        onClick={() => setPrintModalOrder(order)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition text-xs font-semibold flex items-center gap-1.5"
                        title="Print purchase order docket or export as PDF"
                      >
                        <Printer className="w-4 h-4 text-slate-700" />
                        <span className="hidden sm:inline">Print / PDF</span>
                      </button>

                      {/* WhatsApp Export / Share Button */}
                      <button
                        onClick={() => setPrintModalOrder(order)}
                        className="p-2 rounded-xl text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 transition text-xs font-semibold flex items-center gap-1.5"
                        title="Share order via WhatsApp or copy message text"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Delete Pending Order */}
                      {isPending && (
                        <button
                          onClick={() => onDeleteOrder(order)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Cancel purchase order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes if present */}
                {order.notes && (
                  <div className="px-5 pb-3 text-xs text-slate-500 italic">
                    Note: "{order.notes}"
                  </div>
                )}

                {/* Expanded Line Items Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200/80 bg-slate-50/60 p-4 sm:p-5 animate-in slide-in-from-top-1">
                    <div className="text-xs font-bold text-slate-700 mb-2.5">
                      Order Manifest & Delivered Quantities:
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3 font-bold">Item Name & SKU</th>
                            <th className="py-2.5 px-3 font-bold text-center">Ordered Qty</th>
                            <th className="py-2.5 px-3 font-bold text-center">Received Qty</th>
                            <th className="py-2.5 px-3 font-bold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((line) => {
                            const isDelivered = order.status === 'RECEIVED';
                            const discrepancy = isDelivered && (line.received_quantity !== line.ordered_quantity);

                            return (
                              <tr key={line.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900">{line.item_name}</div>
                                  <div className="text-[11px] font-mono text-slate-400">{line.sku}</div>
                                </td>

                                <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                  {line.ordered_quantity} <span className="font-normal text-slate-400">{line.unit}</span>
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {isDelivered ? (
                                    <span className={`font-extrabold ${discrepancy ? 'text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md' : 'text-emerald-700 font-bold'}`}>
                                      {line.received_quantity} {line.unit}
                                      {discrepancy && (
                                        <span className="text-[10px] ml-1">
                                          ({line.received_quantity > line.ordered_quantity ? '+' : ''}{line.received_quantity - line.ordered_quantity})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Pending delivery</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  {isDelivered ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                      <CheckCircle2 className="w-3 h-3" /> Received
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                      <Clock className="w-3 h-3" /> Awaiting
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
                )}
              </div>
            );
          })
        )}
      </div>

      {/* PO Print / PDF / WhatsApp Modal */}
      <PrintPurchaseOrderModal
        isOpen={!!printModalOrder}
        order={printModalOrder}
        onClose={() => setPrintModalOrder(null)}
        showToast={showToast}
      />
    </div>
  );
}
