import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../api';

export default function ExcelView({
  selectedDepartment,
  onImportComplete,
  onExportExcel,
  showToast
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleReset = () => {
    setFile(null);
    setPreviewRows([]);
    setImportStats(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setError('');
    setImportStats(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        setPreviewRows(rows.slice(0, 8));
      } catch (err) {
        setError('Could not parse Excel file. Please ensure it is a valid .xlsx or .csv.');
      }
    };
    reader.readAsBinaryString(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a file to upload first.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const res = await api.uploadExcel(file);
      setImportStats(res);
      showToast({ type: 'success', message: res.message });
      if (onImportComplete) onImportComplete(res);
    } catch (err) {
      setError(err.message || 'Import failed');
      showToast({ type: 'error', message: err.message || 'Excel import failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = api.getTemplateUrl();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-700/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Spreadsheet Automation
          </span>
          <h2 className="text-xl font-bold mt-2 text-white">
            Excel & CSV Bulk Inventory Sync
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Quickly bulk-import your supplier invoices, warehouse inventories, and department orders via standard Excel (.xlsx) or CSV files. Automatically updates existing stock or inserts new item SKUs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download Template (.xlsx)</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Current Inventory</span>
          </button>
        </div>
      </div>

      {/* Main Upload Box & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop Box */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Upload Spreadsheet
            </h3>
            {file && (
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear file
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Target */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20 rounded-2xl p-8 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFile(e.target.files[0])}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-slate-800">
              {file ? file.name : 'Choose an Excel or CSV file to import'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Drag and drop file here or click to browse (supports .xlsx, .csv)
            </p>
            {file && (
              <div className="mt-3 inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                Size: {(file.size / 1024).toFixed(1)} KB • Ready to process
              </div>
            )}
          </div>

          {/* Action Button */}
          {file && !importStats && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Parsing & Upserting Database...' : 'Run Bulk Import Now'}</span>
            </button>
          )}

          {/* Success Summary Result */}
          {importStats && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">Bulk Import Complete</h4>
                  <p className="text-xs text-emerald-800">{importStats.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">New Items Created</div>
                  <div className="text-2xl font-extrabold text-emerald-600">+{importStats.inserted}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Existing Items Updated</div>
                  <div className="text-2xl font-extrabold text-blue-600">+{importStats.updated}</div>
                </div>
              </div>

              {importStats.errors && importStats.errors.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  <div className="font-bold mb-1">Warnings:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {importStats.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Import Another File Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import Another File</span>
                </button>
              </div>
            </div>
          )}

          {/* Preview rows table */}
          {previewRows.length > 0 && !importStats && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                File Data Preview (Top {previewRows.length} Rows):
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      {Object.keys(previewRows[0]).slice(0, 6).map((key) => (
                        <th key={key} className="py-2.5 px-3 font-semibold">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {Object.keys(previewRows[0]).slice(0, 6).map((key) => (
                          <td key={key} className="py-2 px-3 truncate max-w-[140px]">
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
        </div>

        {/* Right 1 Col: Guidelines & Column Reference */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>Format Guidelines</span>
          </h3>

          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <p>
              Your spreadsheet header row must include columns matching our recognized names. The system will automatically map them:
            </p>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div>
                <span className="font-bold text-slate-800">Item Name</span>
                <span className="text-rose-500 font-bold ml-1">*Required</span>
                <p className="text-[11px] text-slate-400">e.g. Ribeye Steaks, Bleach Gallon, Grey Goose</p>
              </div>

              <div>
                <span className="font-bold text-slate-800">Department</span>
                <span className="text-slate-400 ml-1">(Default: Kitchen)</span>
                <p className="text-[11px] text-slate-400">Accepts: Kitchen, Housekeeping, Bar</p>
              </div>

              <div>
                <span className="font-bold text-slate-800">Initial Count / Stock</span>
                <p className="text-[11px] text-slate-400">Numerical quantity on hand</p>
              </div>

              <div>
                <span className="font-bold text-slate-800">Minimum Threshold</span>
                <p className="text-[11px] text-slate-400">Par level threshold for low stock alerts</p>
              </div>

              <div>
                <span className="font-bold text-slate-800">Unit</span>
                <p className="text-[11px] text-slate-400">e.g. kg, bottles, packs, pieces, cans</p>
              </div>

              <div>
                <span className="font-bold text-slate-800">SKU / Code</span>
                <p className="text-[11px] text-slate-400">Unique identifier. If blank, one is generated</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <b>Upsert Logic:</b> If an item with the same SKU or Name + Department already exists, its count and par levels will be updated. Otherwise, a new record is created.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
