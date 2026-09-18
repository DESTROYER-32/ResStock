import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, AlertTriangle, Layers, Tag, Box } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

export default function ItemModal({
  isOpen,
  onClose,
  itemToEdit,
  defaultDepartment,
  departmentsList = [],
  onSubmit,
  loading
}) {
  const { currency } = useCurrency();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [department, setDepartment] = useState('Kitchen');
  const [category, setCategory] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [unit, setUnit] = useState('pieces');
  const [minThreshold, setMinThreshold] = useState('5');
  const [costPerUnit, setCostPerUnit] = useState('0.00');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const isEdit = !!itemToEdit;
  const fallbackDept = departmentsList.length > 0 ? departmentsList[0].name : 'Kitchen';

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setSku(itemToEdit.sku || '');
      setDepartment(itemToEdit.department || fallbackDept);
      setCategory(itemToEdit.category || '');
      setCurrentStock(itemToEdit.current_stock?.toString() || '0');
      setUnit(itemToEdit.unit || 'pieces');
      setMinThreshold(itemToEdit.min_threshold?.toString() || '5');
      setCostPerUnit(itemToEdit.cost_per_unit?.toString() || '0.00');
      setSupplier(itemToEdit.supplier || '');
      setLocation(itemToEdit.location || '');
      setNotes(itemToEdit.notes || '');
    } else {
      setName('');
      setSku('');
      setDepartment(defaultDepartment && defaultDepartment !== 'All' ? defaultDepartment : fallbackDept);
      setCategory('');
      setCurrentStock('0');
      setUnit('pieces');
      setMinThreshold('5');
      setCostPerUnit('0.00');
      setSupplier('');
      setLocation('');
      setNotes('');
    }
    setError('');
  }, [itemToEdit, defaultDepartment, isOpen, departmentsList]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }
    if (!unit.trim()) {
      setError('Unit of measure is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      sku: sku.trim() || undefined,
      department,
      category: category.trim() || 'General',
      current_stock: parseFloat(currentStock) || 0,
      unit: unit.trim().toLowerCase(),
      min_threshold: parseFloat(minThreshold) >= 0 ? parseFloat(minThreshold) : 5,
      cost_per_unit: parseFloat(costPerUnit) >= 0 ? parseFloat(costPerUnit) : 0,
      supplier: supplier.trim() || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined
    };

    onSubmit(payload);
  };

  const commonUnits = ['pieces', 'kg', 'bottles', 'cans', 'packs', 'boxes', 'liters', 'gallons', 'rolls', 'bags'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              {isEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isEdit ? `Edit: ${itemToEdit.name}` : 'Add New Inventory Item'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update item properties and par levels' : 'Register a new SKU in the restaurant catalog'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Name & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Item Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Choice Ribeye Steak (12oz)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                {(departmentsList.length > 0 ? departmentsList : [{ name: 'Kitchen' }, { name: 'Housekeeping' }, { name: 'Bar' }]).map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SKU Code & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                SKU / Barcode (Leave blank to auto-generate)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. KIT-BEEF-01"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Meat, Spirits, Chemicals, Dairy"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Stock, Unit, Threshold, Cost */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Unit of Measure *
              </label>
              <input
                type="text"
                list="unit-suggestions"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="bottles, kg..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
              <datalist id="unit-suggestions">
                {commonUnits.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Min Threshold *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Unit Cost ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Supplier & Storage Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Distributor / Supplier
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Sysco, Southern Glazer's, Ecolab"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Storage Location / Shelf
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Walk-in Cooler 1, Speed Rail 2"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Item Notes & Storage Guidance (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Check temperature upon arrival, keep below 38F"
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
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isEdit ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
