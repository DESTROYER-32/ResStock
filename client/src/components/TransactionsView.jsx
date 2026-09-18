import React, { useState, useMemo } from 'react';
import {
  History,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  User,
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function TransactionsView({
  transactions,
  selectedDepartment,
  setSelectedDepartment,
  onRefresh,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'IN', 'OUT', 'ADJUSTMENT', 'INITIAL'

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedDepartment !== 'All' && tx.department !== selectedDepartment) return false;
      if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          tx.item_name.toLowerCase().includes(q) ||
          tx.sku.toLowerCase().includes(q) ||
          tx.user_name.toLowerCase().includes(q) ||
          (tx.destination_or_source && tx.destination_or_source.toLowerCase().includes(q)) ||
          (tx.notes && tx.notes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [transactions, selectedDepartment, typeFilter, searchTerm]);

  const handleExportTransactions = () => {
    const rows = filtered.map(tx => ({
      'Transaction ID': tx.id,
      'Timestamp': tx.created_at,
      'Item Name': tx.item_name,
      'SKU': tx.sku,
      'Department': tx.department,
      'Type': tx.type,
      'Quantity': tx.quantity,
      'Stock Before': tx.previous_stock,
      'Stock After': tx.new_stock,
      'Staff Member': tx.user_name,
      'Destination/Source': tx.destination_or_source || '',
      'Notes': tx.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit_Log');
    XLSX.writeFile(wb, `Stock_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const departments = ['All', 'Kitchen', 'Housekeeping', 'Bar'];

  return (
    <div className="space-y-4">
      {/* Header & Controls Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Inventory Transaction Audit Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete historical record of stock movements, receipts, and station issues
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportTransactions}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Audit Sheet</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              title="Refresh log"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by item, user, reason..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Department filter */}
          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {departments.map(d => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Departments' : `Department: ${d}`}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Movement Types</option>
              <option value="IN">Stock In (Deliveries & Receipts)</option>
              <option value="OUT">Stock Out (Service Issues)</option>
              <option value="ADJUSTMENT">Adjustments (Manual Count Fixes)</option>
              <option value="INITIAL">Initial Baseline Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Item & SKU</th>
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold">Movement Type</th>
                <th className="py-3 px-4 font-semibold">Quantity</th>
                <th className="py-3 px-4 font-semibold">Stock Shift</th>
                <th className="py-3 px-4 font-semibold">Staff Member</th>
                <th className="py-3 px-4 font-semibold">Destination / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((tx) => {
                  const isIn = tx.type === 'IN';
                  const isOut = tx.type === 'OUT';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(tx.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Item Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tx.item_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{tx.sku}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tx.department}
                        </span>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        {isIn ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ArrowDownRight className="w-3 h-3 text-emerald-600" /> Stock In
                          </span>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <ArrowUpRight className="w-3 h-3 text-blue-600" /> Stock Out
                          </span>
                        ) : tx.type === 'INITIAL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Initial Import
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Adjustment
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 font-bold">
                        <span className={isIn ? 'text-emerald-600' : isOut ? 'text-blue-600' : 'text-slate-800'}>
                          {isIn ? '+' : isOut ? '-' : ''}{tx.quantity}
                        </span>
                      </td>

                      {/* Stock Shift (Before -> After) */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <span className="text-slate-400">{tx.previous_stock}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-bold text-slate-800">{tx.new_stock}</span>
                      </td>

                      {/* Staff Member */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {tx.user_name.charAt(0)}
                          </div>
                          <span>{tx.user_name}</span>
                        </div>
                      </td>

                      {/* Destination / Source & Notes */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                        {tx.destination_or_source && (
                          <div className="font-medium text-slate-700">{tx.destination_or_source}</div>
                        )}
                        {tx.notes && (
                          <div className="text-[11px] text-slate-400 italic truncate">{tx.notes}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No transactions matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50/60 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Total Transactions Shown: <b>{filtered.length}</b></span>
        </div>
      </div>
    </div>
  );
}
