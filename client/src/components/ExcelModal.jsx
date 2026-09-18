import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Truck,
  Layers,
  Filter,
  RefreshCw,
  PlusCircle,
  Coins
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';

export default function ExcelModal({
  isOpen,
  onClose,
  onImportComplete,
  selectedDepartment = 'All',
  departmentsList = [],
  items = [],
  initialTab = 'import',
  showToast
}) {
  const { currency, formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState(initialTab || 'import');

  // Import states
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Export states
  const [exportGroupBy, setExportGroupBy] = useState('supplier'); // 'supplier', 'department', 'none'
  const [exportDept, setExportDept] = useState(selectedDepartment || 'All');
  const [exportSupplier, setExportSupplier] = useState('All');
  const [exportStatus, setExportStatus] = useState('All'); // 'All', 'low', 'out', 'in'

  // Reset import state
  const handleResetImport = () => {
    setFile(null);
    setPreviewRows([]);
    setUploading(false);
    setImportResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset state on open/close and sync initialTab
  useEffect(() => {
    if (isOpen) {
      handleResetImport();
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (selectedDepartment) {
        setExportDept(selectedDepartment);
      }
    } else {
      handleResetImport();
    }
  }, [isOpen, initialTab, selectedDepartment]);

  const handleClose = () => {
    handleResetImport();
    onClose();
  };

  // Extract distinct active suppliers/sellers from items
  const suppliers = useMemo(() => {
    const set = new Set();
    items.forEach(it => {
      if (it.supplier && it.supplier.trim()) {
        set.add(it.supplier.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Preview count for export based on filters
  const filteredExportItems = useMemo(() => {
    return items.filter(item => {
      if (exportDept !== 'All' && item.department !== exportDept) return false;
      if (exportSupplier !== 'All' && item.supplier !== exportSupplier) return false;
      if (exportStatus === 'out' && item.current_stock > 0) return false;
      if (exportStatus === 'low' && (item.current_stock === 0 || item.current_stock > item.min_threshold)) return false;
      if (exportStatus === 'in' && item.current_stock <= item.min_threshold) return false;
      return true;
    });
  }, [items, exportDept, exportSupplier, exportStatus]);

  const totalExportUnits = filteredExportItems.reduce((s, i) => s + (parseFloat(i.current_stock) || 0), 0);
  const totalExportValuation = filteredExportItems.reduce((s, i) => s + ((parseFloat(i.current_stock) || 0) * (parseFloat(i.cost_per_unit) || 0)), 0);

  if (!isOpen) return null;

  // Import file processing
  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (!selected) return;
    processSelectedFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = (selected) => {
    setFile(selected);
    setError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        setPreviewRows(json.slice(0, 5));
      } catch (err) {
        console.error(err);
        setError('Could not preview file. Ensure it is a valid .xlsx, .xls or .csv file.');
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an Excel or CSV file first.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const result = await api.uploadExcel(file);
      setImportResult(result);
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      setError(err.message || 'Import failed. Check column headers and format.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    window.location.href = api.getTemplateUrl();
  };

  // Trigger export download
  const handleExecuteExport = () => {
    const url = api.getExportUrl({
      department: exportDept,
      supplier: exportSupplier,
      status: exportStatus,
      groupBy: exportGroupBy,
      currency: currency
    });
    window.location.href = url;
    if (showToast) {
      const groupLabel = exportGroupBy === 'supplier'
        ? 'Seller-wise'
        : exportGroupBy === 'department'
        ? 'Department-wise'
        : 'Consolidated';
      showToast({
        type: 'success',
        message: `Generating ${groupLabel} stock spreadsheet download...`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Excel & CSV Inventory Center</h3>
              <p className="text-xs text-slate-400">
                Bulk import supplier sheets or export stock by seller, department, and status
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import Inventory (.xlsx / .csv)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'border-amber-500 text-amber-900 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Export Current Stock</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: IMPORT INVENTORY */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Download Sample Template Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-900">Need a starting template?</div>
                    <div className="text-emerald-700 text-[11px] mt-0.5">
                      Download our pre-formatted Excel template with sample items for Kitchen, Housekeeping, and Bar.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shrink-0 transition flex items-center gap-1.5 shadow-xs text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* File Upload Drop Area (Visible when no importResult) */}
              {!importResult && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-7 text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2.5">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-sm text-slate-800">
                    {file ? file.name : 'Click to select or drag and drop spreadsheet'}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports Excel (.xlsx, .xls) and CSV (.csv) files
                  </p>
                  {file && (
                    <div className="mt-2 text-xs font-semibold text-emerald-600">
                      File ready: {(file.size / 1024).toFixed(1)} KB • Click "Import to Inventory" below
                    </div>
                  )}
                </div>
              )}

              {/* Recognized Columns Guide */}
              {!importResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Recognized Columns in Header Row:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-600">
                    <div>• <b>Item Name</b> (required)</div>
                    <div>• <b>Department</b></div>
                    <div>• <b>Initial Count</b></div>
                    <div>• <b>Minimum Threshold</b></div>
                    <div>• <b>SKU</b> (auto if blank)</div>
                    <div>• <b>Unit</b> (kg, bottles)</div>
                    <div>• <b>Unit Cost</b></div>
                    <div>• <b>Supplier</b> & Location</div>
                  </div>
                </div>
              )}

              {/* File Rows Preview */}
              {previewRows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>File Preview (First {previewRows.length} Rows):</span>
                    <button
                      type="button"
                      onClick={handleResetImport}
                      className="text-slate-400 hover:text-rose-600 text-[11px] font-normal"
                    >
                      Clear selected file
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-36">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] sticky top-0">
                        <tr>
                          {Object.keys(previewRows[0]).slice(0, 6).map((key) => (
                            <th key={key} className="py-2 px-2.5 font-semibold">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {Object.keys(previewRows[0]).slice(0, 6).map((key) => (
                              <td key={key} className="py-2 px-2.5 truncate max-w-[120px]">
                                {String(row[key] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Result Success Screen with "Import Another File" */}
              {importResult && (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-emerald-950">Import Completed Successfully!</h4>
                    <p className="text-xs text-emerald-800 mt-1">{importResult.message}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">New Items Added</div>
                      <div className="text-xl font-extrabold text-emerald-600">+{importResult.inserted}</div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Existing Updated</div>
                      <div className="text-xl font-extrabold text-blue-600">+{importResult.updated}</div>
                    </div>
                  </div>

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-800">
                      <div className="font-bold mb-1">Warnings / Skipped Rows:</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Immediate Action Buttons: Import Another OR Done */}
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleResetImport}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Import Another File</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT CURRENT STOCK (SELLER-WISE / DEPARTMENT-WISE) */}
          {activeTab === 'export' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                  <Download className="w-4 h-4 text-amber-600" />
                  <span>Custom Stock Export (.xlsx)</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Export your live inventory counts formatted with {currency} valuations. Choose seller-wise or department-wise to automatically generate multi-sheet Excel workbooks with summaries.
                </p>
              </div>

              {/* Grouping Mode Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-2 uppercase tracking-wider text-[11px]">
                  1. Excel Workbook Structure / Grouping:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Seller-wise */}
                  <div
                    onClick={() => setExportGroupBy('supplier')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      exportGroupBy === 'supplier'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Seller-Wise</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                      Summary sheet + separate tabs for each vendor/supplier
                    </p>
                  </div>

                  {/* Department-wise */}
                  <div
                    onClick={() => setExportGroupBy('department')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      exportGroupBy === 'department'
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Department-Wise</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                      Summary sheet + separate tabs for Kitchen, Bar, Housekeeping
                    </p>
                  </div>

                  {/* Single Consolidated */}
                  <div
                    onClick={() => setExportGroupBy('none')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      exportGroupBy === 'none'
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 text-xs">Single Sheet</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                      Consolidated master list in one clean spreadsheet
                    </p>
                  </div>
                </div>
              </div>

              {/* Filters Grid */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  2. Filter Scope (Optional):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Department Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Department:
                    </label>
                    <select
                      value={exportDept}
                      onChange={(e) => setExportDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="All">All Departments</option>
                      {(departmentsList.length > 0 ? departmentsList : [{ name: 'Kitchen' }, { name: 'Housekeeping' }, { name: 'Bar' }]).map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Seller / Supplier Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Seller / Supplier:
                    </label>
                    <select
                      value={exportSupplier}
                      onChange={(e) => setExportSupplier(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="All">All Suppliers ({suppliers.length})</option>
                      {suppliers.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stock Status Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Stock Level:
                    </label>
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="All">All Stock Levels</option>
                      <option value="out">Out of Stock Only (0 qty)</option>
                      <option value="low">Low Stock Alerts Only</option>
                      <option value="in">Healthy / In Stock Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Export Preview Metrics Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Export Output Summary
                  </span>
                  <div className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-3">
                    <span><b>{filteredExportItems.length}</b> SKUs</span>
                    <span>•</span>
                    <span><b>{totalExportUnits}</b> units</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">{formatAmount(totalExportValuation)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Currency</span>
                  <span className="font-bold text-xs text-emerald-400">{currency}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
          >
            Cancel
          </button>

          {activeTab === 'import' ? (
            !importResult ? (
              <button
                type="button"
                disabled={!file || uploading}
                onClick={handleUpload}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Processing File...' : 'Import to Inventory'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
              >
                Done
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={handleExecuteExport}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Workbook (.xlsx)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
