import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Receipt,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  X,
  ChevronDown,
  Building,
  Calendar,
  Hash,
  MapPin,
  TrendingUp,
  Package,
  Boxes,
  Layers,
  ShoppingBag,
  Download,
  ExternalLink
} from 'lucide-react';
import { api } from '../api';
import * as XLSX from 'xlsx';
import { useCurrency } from '../context/CurrencyContext';

export default function VendorBillScannerView({
  items = [],
  departmentsList = [],
  selectedDepartment = 'All',
  onImportComplete,
  showToast,
  onNavigateToView
}) {
  const { currency, formatAmount } = useCurrency();

  // Step state: 'upload' | 'scanning' | 'review' | 'success'
  const [step, setStep] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [scanningFile, setScanningFile] = useState(null);
  const [scanningProgress, setScanningProgress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Bill metadata state
  const [billData, setBillData] = useState({
    fileName: '',
    fileType: 'excel',
    vendor: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    department: selectedDepartment !== 'All' ? selectedDepartment : 'Kitchen',
    destination: 'Central Receiving Dock',
    notes: '',
    createOrderRecord: true
  });

  // Extracted and mapped line items
  const [lineItems, setLineItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'high', 'partial', 'new', 'selected'
  const [searchQuery, setSearchQuery] = useState('');

  // Success summary state
  const [successSummary, setSuccessSummary] = useState(null);

  const fileInputRef = useRef(null);

  // Update department if parent changes
  useEffect(() => {
    if (selectedDepartment && selectedDepartment !== 'All') {
      setBillData(prev => ({ ...prev, department: selectedDepartment }));
    }
  }, [selectedDepartment]);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Process chosen file
  const handleFileSelected = async (file) => {
    if (!file) return;

    const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name) ||
      file.type?.includes('spreadsheet') ||
      file.type?.includes('excel') ||
      file.type?.includes('csv');

    if (!isExcel) {
      showToast({ type: 'error', message: 'Please upload an Excel spreadsheet (.xlsx, .xls) or CSV vendor bill.' });
      return;
    }

    setError('');
    setScanningFile(file);
    setStep('scanning');
    setScanningProgress('Reading spreadsheet columns, quantities, and line items...');

    try {
      const res = await api.scanVendorBill(file);

      if (!res.items || res.items.length === 0) {
        throw new Error('No line items could be detected in this spreadsheet. Please check column headers or format.');
      }

      setBillData(prev => ({
        ...prev,
        fileName: res.fileName || file.name,
        fileType: 'excel',
        vendor: res.vendor || prev.vendor,
        invoiceNumber: res.invoiceNumber || prev.invoiceNumber,
        invoiceDate: res.invoiceDate || prev.invoiceDate,
        department: res.items[0]?.matched_item?.department || prev.department
      }));

      setLineItems(res.items);
      setStep('review');
      showToast({
        type: 'success',
        message: `Extracted ${res.items.length} item(s) from "${file.name}". Please verify mappings.`
      });
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to scan bill.');
      setStep('upload');
      showToast({ type: 'error', message: err.message || 'Failed to scan document' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };



  // Load built-in sample bills for rapid testing
  const handleLoadSample = async (sampleType) => {
    setError('');
    setStep('scanning');
    setScanningProgress(`Loading sample bill: ${sampleType}...`);

    try {
      const res = await api.getBillSamples(sampleType);
      setBillData({
        fileName: res.fileName,
        fileType: res.fileType,
        vendor: res.vendor,
        invoiceNumber: res.invoiceNumber,
        invoiceDate: res.invoiceDate,
        department: res.department || 'Kitchen',
        destination: 'Receiving Dock A',
        notes: `Sample inbound bill verification (${sampleType})`,
        createOrderRecord: true
      });
      setLineItems(res.items);
      setStep('review');
      showToast({
        type: 'info',
        message: `Loaded ${res.items.length} sample items for ${res.vendor}.`
      });
    } catch (err) {
      setError(err.message || 'Failed to load sample bill.');
      setStep('upload');
    }
  };

  // Generate and download sample Excel bill directly in browser
  const handleDownloadExampleBill = () => {
    try {
      const wb = XLSX.utils.book_new();
      const data = [
        ['SYSCO FOOD SERVICES & WHOLESALE DISTRIBUTION', '', '', '', ''],
        ['104 Industrial Way, Logistics Park, NY 10001', '', '', '', ''],
        ['Tax ID / GSTIN: 27AABCS1429B1Z8', '', '', '', ''],
        ['', '', '', '', ''],
        ['INVOICE NUMBER:', 'SYS-INV-2026-9842', '', 'INVOICE DATE:', '2026-10-02'],
        ['SUPPLIER / VENDOR:', 'Sysco Wholesale Distribution', '', 'PAYMENT TERMS:', 'Net 30 Days'],
        ['DELIVER TO / DESTINATION:', 'Grand Vista Bistro - Kitchen Dock', '', 'PURCHASE ORDER REF:', 'PO-8841'],
        ['', '', '', '', ''],
        ['Item Description', 'Quantity', 'Unit', 'Unit Price', 'Line Total'],
        ['Olive oil (5L)', 10, 'bottles', 32.00, 320.00],
        ['Saffron (10g)', 8, 'packet', 16.50, 132.00],
        ['Coconut oil (1L)', 12, 'bottles', 7.50, 90.00],
        ['Butter paper roll', 15, 'rolls', 4.25, 63.75],
        ['Aluminium foil roll', 20, 'rolls', 8.50, 170.00],
        ['Organic Truffle Glaze 250ml', 5, 'bottles', 22.00, 110.00],
        ['Wild Atlantic Smoked Salmon', 6, 'kg', 24.50, 147.00],
        ['', '', '', '', ''],
        ['', '', '', 'Subtotal:', 1032.75],
        ['', '', '', 'Sales Tax (5%):', 51.64],
        ['', '', '', 'Total Invoice Due:', 1084.39]
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 36 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Vendor Invoice');
      XLSX.writeFile(wb, 'sample_vendor_bill.xlsx');

      if (showToast) {
        showToast({ type: 'success', message: 'Downloaded "sample_vendor_bill.xlsx" successfully!' });
      }
    } catch (err) {
      console.warn('Direct XLSX download fallback:', err);
      window.location.href = '/sample_vendor_bill.xlsx';
    }
  };

  // Reset to upload state
  const handleReset = () => {
    setStep('upload');
    setScanningFile(null);
    setLineItems([]);
    setError('');
    setSuccessSummary(null);
  };

  // Line item modifications
  const handleToggleInclude = (id) => {
    setLineItems(prev => prev.map(item =>
      item.id === id ? { ...item, include_in_import: !item.include_in_import } : item
    ));
  };

  const handleToggleSelectAll = (select) => {
    setLineItems(prev => prev.map(item => ({ ...item, include_in_import: select })));
  };

  const handleModeChange = (id, isNew) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          is_new_item: isNew,
          // if switching to existing and has no selected_item_id, fallback to first candidate or first item
          selected_item_id: isNew ? null : (item.selected_item_id || item.matched_item?.id || items[0]?.id)
        };
      }
      return item;
    }));
  };

  const handleSelectStockItem = (id, stockItemId) => {
    const stockItem = items.find(i => i.id === parseInt(stockItemId));
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          is_new_item: false,
          selected_item_id: stockItem ? stockItem.id : null,
          matched_item: stockItem ? {
            id: stockItem.id,
            name: stockItem.name,
            sku: stockItem.sku,
            department: stockItem.department,
            category: stockItem.category,
            unit: stockItem.unit,
            current_stock: stockItem.current_stock,
            cost_per_unit: stockItem.cost_per_unit
          } : null,
          match_status: 'HIGH_MATCH',
          confidence: 100
        };
      }
      return item;
    }));
  };

  const handleUpdateItemField = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleUpdateNewItemData = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          new_item_data: {
            ...item.new_item_data,
            [field]: value
          }
        };
      }
      return item;
    }));
  };

  // Confirm and Commit to Stock
  const handleConfirmAndAddStock = async () => {
    const included = lineItems.filter(i => i.include_in_import);
    if (included.length === 0) {
      showToast({ type: 'warning', message: 'Please select at least one item to add to stock.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vendor_name: billData.vendor.trim(),
        invoice_number: billData.invoiceNumber.trim(),
        invoice_date: billData.invoiceDate,
        department: billData.department,
        destination_or_source: billData.destination,
        notes: billData.notes,
        create_order_record: billData.createOrderRecord,
        items: included.map(item => ({
          include_in_import: true,
          is_new_item: item.is_new_item,
          raw_name: item.raw_name,
          scanned_unit: item.scanned_unit,
          selected_item_id: item.is_new_item ? null : item.selected_item_id,
          quantity_to_add: parseFloat(item.confirmed_quantity) || 1,
          unit_cost: parseFloat(item.confirmed_unit_cost) || 0,
          update_stock_cost: Boolean(item.update_stock_cost),
          new_item_data: item.is_new_item ? {
            name: item.new_item_data?.name?.trim() || item.raw_name,
            sku: item.new_item_data?.sku?.trim(),
            department: item.new_item_data?.department || billData.department,
            category: item.new_item_data?.category || 'General',
            unit: item.new_item_data?.unit || item.scanned_unit || 'pieces',
            min_threshold: parseFloat(item.new_item_data?.min_threshold) || 5,
            cost_per_unit: parseFloat(item.confirmed_unit_cost || item.new_item_data?.cost_per_unit) || 0,
            supplier: billData.vendor || ''
          } : null
        }))
      };

      const res = await api.confirmBillStock(payload);
      setSuccessSummary(res);
      setStep('success');

      if (onImportComplete) {
        onImportComplete();
      }
      showToast({
        type: 'success',
        message: res.message || 'Vendor bill items added to inventory successfully!'
      });
    } catch (err) {
      console.error('Confirm error:', err);
      showToast({ type: 'error', message: err.message || 'Failed to add stock from bill' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered line items
  const filteredLineItems = useMemo(() => {
    return lineItems.filter(item => {
      if (activeFilter === 'high' && item.match_status !== 'HIGH_MATCH') return false;
      if (activeFilter === 'partial' && item.match_status !== 'PARTIAL_MATCH') return false;
      if (activeFilter === 'new' && (!item.is_new_item && item.match_status !== 'NO_MATCH')) return false;
      if (activeFilter === 'selected' && !item.include_in_import) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rawMatch = item.raw_name?.toLowerCase().includes(q);
        const mappedMatch = item.matched_item?.name?.toLowerCase().includes(q);
        const skuMatch = item.matched_item?.sku?.toLowerCase().includes(q);
        if (!rawMatch && !mappedMatch && !skuMatch) return false;
      }
      return true;
    });
  }, [lineItems, activeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalLines = lineItems.length;
    const selectedLines = lineItems.filter(i => i.include_in_import).length;
    const highMatches = lineItems.filter(i => i.match_status === 'HIGH_MATCH').length;
    const partialMatches = lineItems.filter(i => i.match_status === 'PARTIAL_MATCH').length;
    const newItems = lineItems.filter(i => i.is_new_item).length;

    const totalQuantity = lineItems
      .filter(i => i.include_in_import)
      .reduce((sum, i) => sum + (parseFloat(i.confirmed_quantity) || 0), 0);

    const totalCost = lineItems
      .filter(i => i.include_in_import)
      .reduce((sum, i) => sum + ((parseFloat(i.confirmed_quantity) || 0) * (parseFloat(i.confirmed_unit_cost) || 0)), 0);

    return { totalLines, selectedLines, highMatches, partialMatches, newItems, totalQuantity, totalCost };
  }, [lineItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Vendor Bill Ingestion (Excel)</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Smart Match & Restock
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Upload vendor delivery spreadsheets (.xlsx, .xls) or CSV files to restock and map items automatically.
              </p>
            </div>
          </div>

          {step === 'review' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Upload New Spreadsheet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STEP 1: UPLOAD / INGESTION ZONE */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Main Dropzone Card */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all ${
              dragActive
                ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                : 'border-slate-700/80 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
            }`}
          >
            <div className="max-w-xl mx-auto flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 shadow-inner">
                <FileSpreadsheet className="w-10 h-10 animate-pulse" />
              </div>

              <h2 className="text-xl font-bold text-white mb-2">
                Drop your vendor Excel or CSV bill here
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Accepts <span className="text-emerald-300 font-medium">Excel spreadsheets</span> (.xlsx, .xls) and <span className="text-emerald-300 font-medium">CSV delivery sheets</span> sent by vendors.
              </p>

              {/* Upload Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="hidden"
                  onChange={(e) => handleFileSelected(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Select Excel / CSV File
                </button>

                <button
                  type="button"
                  onClick={handleDownloadExampleBill}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-98"
                  title="Download a formatted sample vendor invoice spreadsheet"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download Example Bill (.xlsx)
                </button>
              </div>

              {/* Supported Badges */}
              <div className="flex items-center gap-2 mt-8 text-xs text-slate-500">
                <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                  Excel (.XLSX)
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                  Excel 97-2003 (.XLS)
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                  CSV (.CSV)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Demo Samples Section */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-semibold text-white">Instant Demo Bills (One-Click Test)</h3>
              <span className="text-xs text-slate-400">— Don't have a bill handy? Test with realistic sample data:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sample 1: Kitchen */}
              <button
                type="button"
                onClick={() => handleLoadSample('food')}
                className="group p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-left transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Kitchen Food & Seafood
                    </span>
                    <span className="text-xs font-mono text-slate-500 group-hover:text-amber-300 transition">
                      Excel Bill →
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Sysco Wholesale Foods
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Ribeye steaks, salmon fillets, EV olive oil, fresh mozzarella, and new artisan seasonings.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>6 Line Items</span>
                  <span className="text-emerald-400 font-medium">4 Stock Matches</span>
                </div>
              </button>

              {/* Sample 2: Bar */}
              <button
                type="button"
                onClick={() => handleLoadSample('bar')}
                className="group p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/50 text-left transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      Bar & Spirits
                    </span>
                    <span className="text-xs font-mono text-slate-500 group-hover:text-purple-300 transition">
                      Excel Bill →
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Southern Glazer's Beverages
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Jameson whiskey, Grey Goose vodka, Prosecco wine, and specialty cocktail bitters.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>4 Line Items</span>
                  <span className="text-emerald-400 font-medium">3 Stock Matches</span>
                </div>
              </button>

              {/* Sample 3: Housekeeping */}
              <button
                type="button"
                onClick={() => handleLoadSample('housekeeping')}
                className="group p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/50 text-left transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                      Housekeeping Supplies
                    </span>
                    <span className="text-xs font-mono text-slate-500 group-hover:text-teal-300 transition">
                      Excel Bill →
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white">
                    Ecolab Sanitation Solutions
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Commercial disinfectant, heavy duty bleach, microfiber towels, lavender cleaner.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>4 Line Items</span>
                  <span className="text-emerald-400 font-medium">3 Stock Matches</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SCANNING / OCR IN PROGRESS */}
      {step === 'scanning' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-2">Analyzing Vendor Spreadsheet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">{scanningProgress}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs text-slate-400 border border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Matching item names against inventory database with fuzzy similarity
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & MAPPING WORKBENCH */}
      {step === 'review' && (
        <div className="space-y-6">
          {/* Bill Metadata Configuration Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Bill Metadata & Receiving Details
                </h3>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-mono">
                  {billData.fileName}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Department: <span className="text-slate-200 font-medium">{billData.department}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vendor */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Vendor / Supplier
                </label>
                <input
                  type="text"
                  value={billData.vendor}
                  onChange={(e) => setBillData({ ...billData, vendor: e.target.value })}
                  placeholder="e.g. Sysco Distribution"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Invoice / Bill #
                </label>
                <input
                  type="text"
                  value={billData.invoiceNumber}
                  onChange={(e) => setBillData({ ...billData, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-89241"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={billData.invoiceDate}
                  onChange={(e) => setBillData({ ...billData, invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Department
                </label>
                <select
                  value={billData.department}
                  onChange={(e) => setBillData({ ...billData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {departmentsList.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                  {departmentsList.length === 0 && (
                    <>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Housekeeping">Housekeeping</option>
                      <option value="Bar">Bar</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Metrics & Filter Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Lines ({stats.totalLines})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  activeFilter === 'high'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                High Match ({stats.highMatches})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('partial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  activeFilter === 'partial'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Partial Match ({stats.partialMatches})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('new')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  activeFilter === 'new'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-purple-400 hover:bg-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                New in DB ({stats.newItems})
              </button>
            </div>

            {/* Selection Toggles */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">
                Selected: <b className="text-white">{stats.selectedLines}</b> of {stats.totalLines}
              </span>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(true)}
                className="text-indigo-400 hover:text-indigo-300 font-medium ml-2"
              >
                Select All
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(false)}
                className="text-slate-400 hover:text-slate-300 font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Line Items Table / List */}
          <div className="space-y-4">
            {filteredLineItems.map((item, index) => {
              const isSelected = item.include_in_import;

              return (
                <div
                  key={item.id}
                  className={`border rounded-2xl p-5 transition-all ${
                    isSelected
                      ? 'bg-slate-900/90 border-slate-700 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Left: Checkbox + Scanned Item Details */}
                    <div className="flex items-start gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleInclude(item.id)}
                        className="mt-1 w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 cursor-pointer"
                      />

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-slate-500 font-semibold">
                            #{index + 1}
                          </span>
                          <h4 className="text-base font-bold text-white">
                            {item.raw_name}
                          </h4>

                          {/* Match Status Badge */}
                          {item.match_status === 'HIGH_MATCH' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              {item.confidence}% Match
                            </span>
                          )}

                          {item.match_status === 'PARTIAL_MATCH' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              {item.confidence}% Possible Match
                            </span>
                          )}

                          {item.match_status === 'NO_MATCH' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <PlusCircle className="w-3 h-3" />
                              New Item
                            </span>
                          )}
                        </div>

                        {/* Scanned metadata chips */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>
                            Bill Qty: <b className="text-slate-200">{item.scanned_quantity} {item.scanned_unit}</b>
                          </span>
                          <span>•</span>
                          <span>
                            Bill Rate: <b className="text-slate-200">{formatAmount(item.scanned_unit_cost)}</b>
                          </span>
                          <span>•</span>
                          <span>
                            Line Total: <b className="text-slate-200">{formatAmount(item.scanned_total_cost)}</b>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Mapping Selector Mode (Existing Stock vs New Item) */}
                    <div className="flex-1 max-w-xl space-y-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          Inventory Stock Mapping:
                        </span>

                        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleModeChange(item.id, false)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                              !item.is_new_item
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Map to Existing
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModeChange(item.id, true)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                              item.is_new_item
                                ? 'bg-purple-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Create New Entry
                          </button>
                        </div>
                      </div>

                      {/* If Mode is Map to Existing Item */}
                      {!item.is_new_item ? (
                        <div className="space-y-2">
                          <select
                            value={item.selected_item_id || item.matched_item?.id || ''}
                            onChange={(e) => handleSelectStockItem(item.id, e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Choose Stock Item to Map --</option>
                            {items.map(it => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.sku}) — Stock: {it.current_stock} {it.unit} [{it.department}]
                              </option>
                            ))}
                          </select>

                          {/* Quick suggestions pills */}
                          {item.alternate_candidates && item.alternate_candidates.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[11px] text-slate-400">Suggestions:</span>
                              {item.alternate_candidates.map(cand => (
                                <button
                                  key={cand.id}
                                  type="button"
                                  onClick={() => handleSelectStockItem(item.id, cand.id)}
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                                    item.selected_item_id === cand.id
                                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                  }`}
                                >
                                  {cand.name} ({cand.score}%)
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Preview stock impact */}
                          {item.matched_item && (
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1 pt-0.5">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span>Current: <b>{item.matched_item.current_stock} {item.matched_item.unit}</b></span>
                              <ArrowRight className="w-3 h-3 text-slate-500 inline" />
                              <span>New Total: <b>{item.matched_item.current_stock + (parseFloat(item.confirmed_quantity) || 0)} {item.matched_item.unit}</b></span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* If Mode is Create New Entry in Database */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-slate-400">Item Name:</label>
                            <input
                              type="text"
                              value={item.new_item_data?.name || ''}
                              onChange={(e) => handleUpdateNewItemData(item.id, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400">SKU:</label>
                            <input
                              type="text"
                              value={item.new_item_data?.sku || ''}
                              onChange={(e) => handleUpdateNewItemData(item.id, 'sku', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-400">Department:</label>
                            <select
                              value={item.new_item_data?.department || billData.department}
                              onChange={(e) => handleUpdateNewItemData(item.id, 'department', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-purple-500"
                            >
                              {departmentsList.map(d => (
                                <option key={d.name} value={d.name}>{d.name}</option>
                              ))}
                              {departmentsList.length === 0 && (
                                <>
                                  <option value="Kitchen">Kitchen</option>
                                  <option value="Housekeeping">Housekeeping</option>
                                  <option value="Bar">Bar</option>
                                </>
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="text-slate-400">Unit of Measure:</label>
                            <input
                              type="text"
                              value={item.new_item_data?.unit || ''}
                              onChange={(e) => handleUpdateNewItemData(item.id, 'unit', e.target.value)}
                              placeholder="e.g. pieces, kg, bottles"
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Quantity to Add & Unit Cost */}
                    <div className="w-full lg:w-48 space-y-2 bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/60">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Quantity to Add:
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.confirmed_quantity}
                            onChange={(e) => handleUpdateItemField(item.id, 'confirmed_quantity', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm font-bold focus:outline-none focus:border-indigo-500 text-right"
                          />
                          <span className="text-xs text-slate-400 font-medium">
                            {item.is_new_item ? (item.new_item_data?.unit || 'pcs') : (item.matched_item?.unit || item.scanned_unit)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Unit Cost:
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.confirmed_unit_cost}
                            onChange={(e) => handleUpdateItemField(item.id, 'confirmed_unit_cost', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-indigo-500 text-right"
                          />
                        </div>
                      </div>

                      {!item.is_new_item && (
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(item.update_stock_cost)}
                            onChange={(e) => handleUpdateItemField(item.id, 'update_stock_cost', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 bg-slate-800"
                          />
                          <span className="text-[11px] text-slate-400 leading-tight">
                            Update base cost in DB
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div>
                Selected: <b className="text-white">{stats.selectedLines} items</b>
              </div>
              <span className="text-slate-600">•</span>
              <div>
                Total Units to Add: <b className="text-emerald-400 font-bold">{stats.totalQuantity}</b>
              </div>
              <span className="text-slate-600">•</span>
              <div>
                Total Bill Value: <b className="text-white font-mono">{formatAmount(stats.totalCost)}</b>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Discard
              </button>

              <button
                type="button"
                disabled={loading || stats.selectedLines === 0}
                onClick={handleConfirmAndAddStock}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Updating Inventory...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Add to Stock ({stats.selectedLines})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS SUMMARY BANNER / MODAL */}
      {step === 'success' && successSummary && (
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-8 text-center max-w-2xl mx-auto shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Stock Restocked Successfully!</h2>
            <p className="text-sm text-slate-300">
              {successSummary.message}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Total Units Added</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{successSummary.totalUnitsAdded}</div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Restocked Items</div>
              <div className="text-xl font-bold text-white mt-1">{successSummary.updatedCount}</div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">New Items Created</div>
              <div className="text-xl font-bold text-purple-400 mt-1">{successSummary.createdCount}</div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-xs text-slate-400">Total Bill Value</div>
              <div className="text-base font-bold text-white font-mono mt-1">{formatAmount(successSummary.totalCostSum)}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload Another Spreadsheet
            </button>

            {onNavigateToView && (
              <button
                type="button"
                onClick={() => onNavigateToView('inventory')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition flex items-center gap-2"
              >
                <Boxes className="w-4 h-4 text-emerald-400" />
                View Inventory
              </button>
            )}

            {onNavigateToView && successSummary.orderNumber && (
              <button
                type="button"
                onClick={() => onNavigateToView('orders')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                View Purchase Orders ({successSummary.orderNumber})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
