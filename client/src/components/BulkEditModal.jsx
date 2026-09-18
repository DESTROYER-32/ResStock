import React, { useState } from 'react';
import {
  X,
  Edit3,
  Layers,
  MapPin,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { useCurrency, CurrencyIcon } from '../context/CurrencyContext';

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedItems,
  departmentsList = [],
  onSubmit,
  loading
}) {
  const { currency } = useCurrency();
  const deptOptions = departmentsList.length > 0 ? departmentsList.map(d => d.name) : ['Kitchen', 'Housekeeping', 'Bar'];

  // Enabled flags for each field
  const [fields, setFields] = useState({
    department: false,
    category: false,
    unit: false,
    min_threshold: false,
    cost_per_unit: false,
    location: false,
    supplier: false,
    stock: false
  });

  // Values
  const [department, setDepartment] = useState(deptOptions[0] || 'Kitchen');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('kg');
  const [minThreshold, setMinThreshold] = useState('10');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  
  // Stock adjustment
  const [stockType, setStockType] = useState('add'); // 'set', 'add', 'deduct'
  const [stockValue, setStockValue] = useState('10');
  const [stockReason, setStockReason] = useState('Bulk Stock Adjustment');

  if (!isOpen || !selectedItems || selectedItems.length === 0) return null;

  const toggleField = (field) => {
    setFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const hasAnyFieldSelected = Object.values(fields).some(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hasAnyFieldSelected) return;

    const updates = {};
    if (fields.department) updates.department = department;
    if (fields.category) updates.category = category;
    if (fields.unit) updates.unit = unit;
    if (fields.min_threshold) updates.min_threshold = parseFloat(minThreshold) || 0;
    if (fields.cost_per_unit) updates.cost_per_unit = parseFloat(costPerUnit) || 0;
    if (fields.location) updates.location = location;
    if (fields.supplier) updates.supplier = supplier;

    let stock_adjustment = null;
    if (fields.stock) {
      stock_adjustment = {
        type: stockType,
        value: parseFloat(stockValue) || 0,
        reason: stockReason.trim() || 'Bulk Stock Adjustment'
      };
    }

    const item_ids = selectedItems.map(item => item.id);
    onSubmit({ item_ids, updates, stock_adjustment });
  };

  const itemNames = selectedItems.map(i => i.name).slice(0, 5).join(', ');
  const remainingCount = selectedItems.length - 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Bulk Edit Inventory</h3>
              <p className="text-xs text-slate-400">
                Updating <span className="text-amber-400 font-bold">{selectedItems.length}</span> selected items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Items summary preview */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Items: </span>
          <span>{itemNames}</span>
          {remainingCount > 0 && <span className="font-semibold text-amber-700"> +{remainingCount} more</span>}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Check the box next to any field you want to apply across all <span className="font-bold">{selectedItems.length}</span> selected items. Unchecked fields will retain their existing individual values.
            </p>
          </div>

          <div className="space-y-4">
            {/* 1. Department */}
            <div className={`p-3.5 rounded-xl border transition ${fields.department ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fields.department}
                    onChange={() => toggleField('department')}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Department
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Assign new department</span>
              </div>
              {fields.department && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-200">
                  {deptOptions.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDepartment(dept)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        department === dept
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Category */}
            <div className={`p-3.5 rounded-xl border transition ${fields.category ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fields.category}
                    onChange={() => toggleField('category')}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-slate-500" />
                    Category
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Re-categorize items</span>
              </div>
              {fields.category && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Dairy, Spirits, Cleaning Chemicals, Produce"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required={fields.category}
                  />
                </div>
              )}
            </div>

            {/* 3. Unit & Min Threshold Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Unit */}
              <div className={`p-3.5 rounded-xl border transition ${fields.unit ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fields.unit}
                      onChange={() => toggleField('unit')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Unit of Measure</span>
                  </label>
                </div>
                {fields.unit && (
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 mt-2"
                  >
                    {['kg', 'g', 'liter', 'ml', 'bottle', 'can', 'pack', 'box', 'pcs', 'case', 'roll', 'bag'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Min Threshold */}
              <div className={`p-3.5 rounded-xl border transition ${fields.min_threshold ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fields.min_threshold}
                      onChange={() => toggleField('min_threshold')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Low Stock Threshold</span>
                  </label>
                </div>
                {fields.min_threshold && (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    placeholder="Alert threshold (par)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 mt-2"
                    required={fields.min_threshold}
                  />
                )}
              </div>
            </div>

            {/* 4. Unit Cost & Storage Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Unit Cost */}
              <div className={`p-3.5 rounded-xl border transition ${fields.cost_per_unit ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fields.cost_per_unit}
                      onChange={() => toggleField('cost_per_unit')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CurrencyIcon className="w-3.5 h-3.5 text-slate-500" currency={currency} />
                      Cost Per Unit ({currency})
                    </span>
                  </label>
                </div>
                {fields.cost_per_unit && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    placeholder="e.g. 14.50"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 mt-2"
                    required={fields.cost_per_unit}
                  />
                )}
              </div>

              {/* Location */}
              <div className={`p-3.5 rounded-xl border transition ${fields.location ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fields.location}
                      onChange={() => toggleField('location')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      Storage Location
                    </span>
                  </label>
                </div>
                {fields.location && (
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Walk-in Cooler A, Shelf 2"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 mt-2"
                  />
                )}
              </div>
            </div>

            {/* 5. Supplier */}
            <div className={`p-3.5 rounded-xl border transition ${fields.supplier ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fields.supplier}
                    onChange={() => toggleField('supplier')}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    Supplier / Vendor
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Update primary vendor</span>
              </div>
              {fields.supplier && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Sysco Foods, US Foods, Local Wine Dist"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* 6. Stock Level Adjustment */}
            <div className={`p-4 rounded-xl border transition ${fields.stock ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fields.stock}
                    onChange={() => toggleField('stock')}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                    Stock Level Adjustment
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Batch update on-hand quantities</span>
              </div>

              {fields.stock && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStockType('add')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        stockType === 'add'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      + Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockType('deduct')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        stockType === 'deduct'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      - Deduct Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockType('set')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                        stockType === 'set'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      = Set Exact Qty
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Quantity ({stockType === 'add' ? 'Amount to add' : stockType === 'deduct' ? 'Amount to remove' : 'Target level'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={stockValue}
                        onChange={(e) => setStockValue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required={fields.stock}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Transaction Audit Reason
                      </label>
                      <input
                        type="text"
                        value={stockReason}
                        onChange={(e) => setStockReason(e.target.value)}
                        placeholder="e.g. Monthly Inventory Audit"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
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
              disabled={!hasAnyFieldSelected || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Apply to {selectedItems.length} Items</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
