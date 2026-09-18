import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Truck,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export default function GenerateOrderModal({
  isOpen,
  onClose,
  itemsToOrder = [],
  availableItems = [],
  defaultDepartment = 'Kitchen',
  onOrdersCreated,
  showToast
}) {
  // Local state of items to be ordered: [{ item_id, name, sku, department, current_stock, min_threshold, quantity, unit, unit_cost, supplier }]
  const [orderLines, setOrderLines] = useState([]);

  useEffect(() => {
    if (itemsToOrder && itemsToOrder.length > 0) {
      setOrderLines(itemsToOrder.map(item => {
        const rec = Math.max(1, Math.ceil((item.min_threshold || 5) - (item.current_stock || 0)));
        return {
          item_id: item.id,
          name: item.name,
          sku: item.sku,
          department: item.department || defaultDepartment,
          current_stock: item.current_stock,
          min_threshold: item.min_threshold,
          quantity: rec > 0 ? rec : 5,
          unit: item.unit || 'units',
          unit_cost: parseFloat(item.cost_per_unit || 0),
          supplier: (item.supplier && item.supplier.trim()) ? item.supplier.trim() : 'General Supplier'
        };
      }));
    } else {
      setOrderLines([]);
    }
  }, [itemsToOrder, defaultDepartment]);

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  // Group current orderLines by vendor
  const vendorGroups = useMemo(() => {
    const groups = {};
    orderLines.forEach((line, idx) => {
      const vendor = (line.supplier && line.supplier.trim()) ? line.supplier.trim() : 'General Supplier';
      if (!groups[vendor]) {
        groups[vendor] = [];
      }
      groups[vendor].push({ ...line, lineIndex: idx });
    });
    return groups;
  }, [orderLines]);

  if (!isOpen) return null;

  const handleUpdateLine = (index, field, value) => {
    setOrderLines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveLine = (index) => {
    setOrderLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddInventoryItem = (item) => {
    // Check if already in orderLines
    if (orderLines.some(l => l.item_id === item.id)) {
      showToast({ type: 'info', message: `"${item.name}" is already in your order list.` });
      return;
    }

    const rec = Math.max(1, Math.ceil((item.min_threshold || 5) - (item.current_stock || 0)));
    const newLine = {
      item_id: item.id,
      name: item.name,
      sku: item.sku,
      department: item.department,
      current_stock: item.current_stock,
      min_threshold: item.min_threshold,
      quantity: rec > 0 ? rec : 5,
      unit: item.unit || 'units',
      unit_cost: parseFloat(item.cost_per_unit || 0),
      supplier: (item.supplier && item.supplier.trim()) ? item.supplier.trim() : 'General Supplier'
    };

    setOrderLines(prev => [...prev, newLine]);
    setItemPickerOpen(false);
    setPickerSearch('');
  };

  const totalOrderUnits = orderLines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0), 0);
  const totalVendorsCount = Object.keys(vendorGroups).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (orderLines.length === 0) {
      showToast({ type: 'error', message: 'Please add at least one item to order.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: orderLines.map(l => ({
          item_id: l.item_id,
          quantity: parseFloat(l.quantity) || 1,
          supplier: l.supplier,
          unit_cost: l.unit_cost || 0,
          unit: l.unit
        })),
        notes: notes.trim(),
        department: defaultDepartment !== 'All' ? defaultDepartment : 'Kitchen'
      };

      await onOrdersCreated(payload);
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Failed to create orders' });
    } finally {
      setLoading(false);
    }
  };

  // Filter available items for picker
  const filteredPickerItems = availableItems.filter(item => {
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.supplier && item.supplier.toLowerCase().includes(q))
    );
  }).slice(0, 15);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Generate Vendor Purchase Orders</h3>
              <p className="text-xs text-slate-400">
                Orders are automatically grouped by vendor into separate purchase orders
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

        {/* Action ribbon */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              Total Line Items: <strong className="text-slate-900">{orderLines.length}</strong>
            </span>
            <span>
              Target Vendors: <strong className="text-slate-900">{totalVendorsCount}</strong>
            </span>
            <span>
              Total Units to Order: <strong className="text-amber-700 font-bold">{totalOrderUnits}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setItemPickerOpen(!itemPickerOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Add More Items</span>
            </button>
          </div>
        </div>

        {/* Item Picker Flyout if clicked */}
        {itemPickerOpen && (
          <div className="bg-amber-50/70 p-4 border-b border-amber-200 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-950">Select inventory item to add to this order:</span>
              <button onClick={() => setItemPickerOpen(false)} className="text-amber-700 hover:text-amber-950">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Search items by name, SKU, or supplier..."
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl mb-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="max-h-40 overflow-y-auto divide-y divide-amber-200 bg-white rounded-xl border border-amber-200">
              {filteredPickerItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleAddInventoryItem(item)}
                  className="p-2.5 flex items-center justify-between hover:bg-amber-50/60 cursor-pointer transition"
                >
                  <div>
                    <span className="font-bold text-slate-800">{item.name}</span>{' '}
                    <span className="text-[11px] text-slate-400 font-mono">({item.sku})</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{item.department}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600 text-[11px]">
                    <span>Stock: <b>{item.current_stock}</b> / Min: {item.min_threshold} {item.unit}</span>
                    <span>Vendor: <strong className="text-amber-700">{item.supplier || 'General'}</strong></span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold">+ Add</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main List grouped by Vendor */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {orderLines.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">No items selected for order</p>
              <p className="text-xs">Click "Add More Items" above or select items from your inventory table.</p>
            </div>
          ) : (
            Object.keys(vendorGroups).map((vendor) => {
              const items = vendorGroups[vendor];
              const vendorTotal = items.reduce((s, it) => s + (parseFloat(it.quantity || 0) * parseFloat(it.unit_cost || 0)), 0);

              return (
                <div key={vendor} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
                  {/* Vendor Group Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{vendor}</span>
                        <span className="ml-2 text-[11px] text-slate-500 font-medium">({items.length} items)</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600">
                      Total: <strong className="text-slate-900 font-bold">{items.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0)} units</strong>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="pb-2">Item Name & SKU</th>
                          <th className="pb-2">Current Stock</th>
                          <th className="pb-2 w-40">Order Qty</th>
                          <th className="pb-2">Assigned Vendor</th>
                          <th className="pb-2 text-right w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {items.map((line) => {
                          const idx = line.lineIndex;

                          return (
                            <tr key={idx} className="hover:bg-white/80 transition">
                              <td className="py-2.5 pr-2">
                                <div className="font-bold text-slate-800">{line.name}</div>
                                <div className="text-[11px] font-mono text-slate-400">{line.sku} • {line.department}</div>
                              </td>

                              <td className="py-2.5 text-slate-600">
                                <span className={line.current_stock === 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                  {line.current_stock}
                                </span> / {line.min_threshold} <span className="text-[10px] text-slate-400">{line.unit}</span>
                              </td>

                              <td className="py-2.5 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="0.1"
                                    step="any"
                                    value={line.quantity}
                                    onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                                    className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    required
                                  />
                                  <span className="text-[11px] text-slate-500 font-medium">{line.unit}</span>
                                </div>
                              </td>

                              <td className="py-2.5 pr-2">
                                <input
                                  type="text"
                                  value={line.supplier}
                                  onChange={(e) => handleUpdateLine(idx, 'supplier', e.target.value)}
                                  placeholder="Vendor name"
                                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </td>

                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Remove item from order list"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}

          {/* Notes input */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              General Purchase Order Notes / Delivery Instructions (Optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent weekend replenishment, deliver before 10 AM to back kitchen dock..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer Submit */}
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
              disabled={orderLines.length === 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Generate {totalVendorsCount} Purchase Order{totalVendorsCount !== 1 ? 's' : ''}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
