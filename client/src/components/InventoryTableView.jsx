import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  PlusCircle,
  MinusCircle,
  MapPin,
  Truck,
  Edit3,
  ShoppingBag
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

export default function InventoryTableView({
  items,
  selectedDepartment,
  setSelectedDepartment,
  onOpenAddItem,
  onOpenEditItem,
  onDeleteItem,
  onStockInItem,
  onStockOutItem,
  onQuickAdjust,
  onOpenExcelModal,
  onExportExcel,
  onOpenBulkEdit,
  onBulkDelete,
  onOpenOrderItems
}) {
  const { currency, formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Distinct categories available in current items
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach(i => {
      if (selectedDepartment === 'All' || i.department === selectedDepartment) {
        if (i.category) set.add(i.category);
      }
    });
    return Array.from(set).sort();
  }, [items, selectedDepartment]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Department filter
      if (selectedDepartment !== 'All' && item.department !== selectedDepartment) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'in_stock' && item.status !== 'in_stock') return false;
        if (statusFilter === 'low_stock' && item.status !== 'low_stock') return false;
        if (statusFilter === 'out_of_stock' && item.status !== 'out_of_stock') return false;
      }
      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          (item.category && item.category.toLowerCase().includes(query)) ||
          (item.supplier && item.supplier.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query));
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, selectedDepartment, statusFilter, categoryFilter, searchTerm, sortBy, sortOrder]);

  const selectedItems = useMemo(() => {
    return items.filter(i => selectedIds.has(i.id));
  }, [items, selectedIds]);

  const isAllFilteredSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));
  const isSomeFilteredSelected = filteredItems.some(i => selectedIds.has(i.id)) && !isAllFilteredSelected;

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const departments = ['All', 'Kitchen', 'Housekeeping', 'Bar'];

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Department Filter Pills & Quick Actions */}
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

          {/* Action Buttons: Add Item, Bulk Edit, Export, Import, Clear Data */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onOpenAddItem}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              onClick={() => {
                if (selectedIds.size === 0) {
                  if (filteredItems.length > 0) {
                    const allIds = new Set(filteredItems.map(i => i.id));
                    setSelectedIds(allIds);
                    onOpenBulkEdit(filteredItems);
                  }
                } else {
                  onOpenBulkEdit(selectedItems);
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                selectedIds.size > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 shadow-xs font-bold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
              }`}
              title="Bulk Edit selected items or all matching items"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bulk Edit {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
            </button>

            <button
              onClick={() => {
                if (selectedIds.size > 0) {
                  onOpenOrderItems(selectedItems);
                } else {
                  const lowStock = items.filter(i => (selectedDepartment === 'All' || i.department === selectedDepartment) && i.current_stock <= i.min_threshold);
                  onOpenOrderItems(lowStock.length > 0 ? lowStock : filteredItems.slice(0, 10));
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
              title="Create purchase order list grouped by vendor"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Order Stock {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
            </button>

            <button
              onClick={onOpenExcelModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
              title="Bulk import items via Excel (.xlsx, .csv)"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>

            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
              title="Download current table as .xlsx"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row: Search, Status, Category, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, SKU, vendor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            >
              <option value="All">All Stock Statuses</option>
              <option value="in_stock">In Stock (Healthy)</option>
              <option value="low_stock">Low Stock (≤ Threshold)</option>
              <option value="out_of_stock">Out of Stock (Zero)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [f, o] = e.target.value.split('-');
                setSortBy(f);
                setSortOrder(o);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            >
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="current_stock-asc">Sort: Stock Level (Lowest First)</option>
              <option value="current_stock-desc">Sort: Stock Level (Highest First)</option>
              <option value="department-asc">Sort: Department</option>
              <option value="cost_per_unit-desc">Sort: Unit Cost (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all"
                    title={isAllFilteredSelected ? "Deselect all visible" : "Select all visible"}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-900 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item & Details</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sku')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-900 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>SKU Code</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-900 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Department & Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('current_stock')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-900 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Current Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold">
                  Min Threshold
                </th>
                <th className="py-3.5 px-4 font-bold">
                  Status
                </th>
                <th
                  onClick={() => handleSort('cost_per_unit')}
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-slate-900 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cost / Value</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold text-center">
                  Quick Tally
                </th>
                <th className="py-3.5 px-4 font-bold text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isOutOfStock = item.current_stock === 0;
                  const isLowStock = !isOutOfStock && item.current_stock <= item.min_threshold;
                  const isSelected = selectedIds.has(item.id);

                  // Row background tint for alerts and selection
                  const rowBg = isSelected
                    ? 'bg-amber-100/60 hover:bg-amber-100/80 border-l-4 border-amber-500'
                    : isOutOfStock
                    ? 'bg-rose-50/40 hover:bg-rose-50/70'
                    : isLowStock
                    ? 'bg-amber-50/30 hover:bg-amber-50/60'
                    : 'hover:bg-slate-50/80';

                  const totalValue = (item.current_stock * item.cost_per_unit).toFixed(2);

                  return (
                    <tr key={item.id} className={`transition ${rowBg}`}>
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          aria-label={`Select ${item.name}`}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Item Name & Meta */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {item.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{item.location}</span>
                            </span>
                          )}
                          {item.supplier && (
                            <span className="flex items-center gap-0.5">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span>{item.supplier}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                        {item.sku}
                      </td>

                      {/* Department & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.department === 'Kitchen'
                              ? 'bg-amber-100 text-amber-800'
                              : item.department === 'Bar'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {item.department}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {item.category || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-base font-extrabold ${
                            isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'
                          }`}>
                            {item.current_stock}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {item.unit}
                          </span>
                        </div>
                      </td>

                      {/* Min Threshold */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-700">
                          {item.min_threshold} <span className="font-normal text-slate-400">{item.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Par Level</div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>

                      {/* Cost / Valuation */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">
                          {formatAmount(item.cost_per_unit || 0)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Total: {formatAmount(totalValue)}
                        </div>
                      </td>

                      {/* Inline Quick Tally (+ / -) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 max-w-[90px] mx-auto">
                          <button
                            onClick={() => onQuickAdjust(item.id, -1, 'Physical Count Inline Adjust')}
                            disabled={item.current_stock <= 0}
                            title="Decrement 1"
                            className="p-1 hover:bg-white text-slate-600 hover:text-rose-600 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] font-bold px-1 text-slate-700">±1</span>
                          <button
                            onClick={() => onQuickAdjust(item.id, 1, 'Physical Count Inline Adjust')}
                            title="Increment 1"
                            className="p-1 hover:bg-white text-slate-600 hover:text-emerald-600 rounded-lg transition"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Actions: Stock In, Stock Out, Edit, Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Stock In */}
                          <button
                            onClick={() => onStockInItem(item)}
                            title="Receive Stock (In)"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Stock Out */}
                          <button
                            onClick={() => onStockOutItem(item)}
                            title="Issue Stock (Out)"
                            disabled={item.current_stock <= 0}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition disabled:opacity-40"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Order Item */}
                          <button
                            onClick={() => onOpenOrderItems([item])}
                            title="Generate purchase order for this item"
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => onOpenEditItem(item)}
                            title="Edit Item Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => onDeleteItem(item)}
                            title="Delete Item"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <div className="font-semibold text-sm text-slate-600">No inventory items matched your criteria</div>
                      <p className="text-xs text-slate-400">Try adjusting your search terms or department filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredItems.length}</span> of{' '}
            <span className="font-bold text-slate-800">{items.length}</span> items in{' '}
            <span className="font-bold text-amber-700">{selectedDepartment}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> In Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Low Stock
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Out of Stock
            </span>
          </div>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {selectedIds.size === 1 ? '1 item selected' : `${selectedIds.size} items selected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenOrderItems(selectedItems)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </button>

            <button
              onClick={() => onOpenBulkEdit(selectedItems)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bulk Edit</span>
            </button>

            <button
              onClick={() => onBulkDelete(selectedItems)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
