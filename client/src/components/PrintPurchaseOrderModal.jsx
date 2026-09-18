import React, { useState } from 'react';
import {
  Printer,
  Share2,
  Copy,
  Check,
  X,
  FileText,
  MessageSquare,
  Building2,
  Calendar,
  User,
  ShoppingBag,
  Clock,
  CheckCircle2
} from 'lucide-react';

export default function PrintPurchaseOrderModal({
  isOpen,
  onClose,
  order,
  showToast
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const totalUnits = items.reduce((sum, item) => sum + (parseFloat(item.ordered_quantity ?? item.quantity_ordered ?? item.quantity ?? 0)), 0);

  // Compose formatted WhatsApp & text message (Clean quantity requisition without rates)
  const composeOrderText = () => {
    let text = `📦 *PURCHASE ORDER: ${order.order_number}*\n`;
    text += `🏢 *Store:* ResStock Pro Store\n`;
    text += `🏬 *Department:* ${order.department}\n`;
    text += `🏪 *Vendor:* ${order.supplier}\n`;
    text += `📅 *Date:* ${new Date(order.created_at).toLocaleDateString()}\n`;
    text += `👤 *Ordered By:* ${order.created_by || 'Store Manager'}\n`;
    text += `----------------------------------------\n`;
    text += `*ITEMS TO DELIVER:*\n`;

    items.forEach((item, index) => {
      const qty = parseFloat(item.ordered_quantity ?? item.quantity_ordered ?? item.quantity ?? 0);
      text += `${index + 1}. *${item.item_name}* [${item.sku || 'N/A'}]\n   Qty: ${qty} ${item.unit || 'units'}\n`;
    });

    text += `----------------------------------------\n`;
    text += `📦 *Total Line Items:* ${items.length}\n`;
    text += `🔢 *Total Units to Deliver:* ${totalUnits}\n`;
    if (order.notes) {
      text += `📝 *Instructions:* ${order.notes}\n`;
    }
    text += `\nPlease confirm receipt of this order and let us know the delivery dispatch time. Thank you!`;
    return text;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = async () => {
    try {
      const text = composeOrderText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (showToast) {
        showToast({ type: 'success', message: 'PO details copied to clipboard!' });
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      if (showToast) {
        showToast({ type: 'error', message: 'Failed to copy to clipboard' });
      }
    }
  };

  const handleShareWhatsApp = () => {
    const text = composeOrderText();
    const encoded = encodeURIComponent(text);
    // Opens WhatsApp Web or WhatsApp Mobile App
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Floating Control Bar (Hidden when printing) */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Purchase Order Docket</h3>
                <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold">
                  {order.order_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Preview, print to PDF, or dispatch directly to vendor</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
              title="Share formatted purchase order via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Copy Text Button */}
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Copy formatted order text to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition"
              title="Print document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable PO Docket Sheet */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100">
          <div
            id="printable-po-area"
            className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-xl shadow-xs border border-slate-200 text-slate-900 font-sans"
          >
            {/* Docket Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                    RS
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      ResStock Pro Store
                    </h1>
                    <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                      Inventory & Procurement Management
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-600 mt-3 space-y-0.5">
                  <p>Central Operations Facility</p>
                  <p>Department: <span className="font-semibold text-slate-900">{order.department}</span></p>
                  <p>Authorized Agent: <span className="font-semibold text-slate-900">{order.created_by || 'Admin'}</span></p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight block">
                  PURCHASE ORDER
                </span>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between sm:justify-end gap-3">
                    <span className="text-slate-500 font-medium">PO Number:</span>
                    <span className="font-mono font-extrabold text-slate-900">{order.order_number}</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-3">
                    <span className="text-slate-500 font-medium">Date Issued:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-3">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className={`font-bold uppercase text-[11px] ${
                      order.status === 'RECEIVED' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor & Delivery Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Vendor / Supplier
                </div>
                <div className="text-sm font-bold text-slate-900">{order.supplier}</div>
                <p className="text-slate-500 text-[11px] mt-0.5">Commercial Delivery Partner</p>
                <div className="mt-2 text-[11px] text-slate-600">
                  <span className="font-medium text-slate-700">Account:</span> Active Vendor
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                  Deliver To & Receive At
                </div>
                <div className="text-sm font-bold text-slate-900">ResStock Pro Receiving Bay</div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Attn: {order.department} Department Inventory Manager
                </p>
                <div className="mt-2 text-[11px] text-slate-600">
                  <span className="font-medium text-slate-700">Storage Location:</span> Central Stockroom
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-6">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-[11px] font-extrabold text-slate-700 uppercase">
                    <th className="py-2.5 px-2 w-8">#</th>
                    <th className="py-2.5 px-2">Item Description</th>
                    <th className="py-2.5 px-2 font-mono">SKU</th>
                    <th className="py-2.5 px-2 text-right">Qty to Deliver</th>
                    <th className="py-2.5 px-2">Unit</th>
                    <th className="py-2.5 px-2 text-center w-32">Receiving Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => {
                    const qty = parseFloat(item.ordered_quantity ?? item.quantity_ordered ?? item.quantity ?? 0);

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-semibold text-slate-900">
                          {item.item_name}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-500 text-[11px]">
                          {item.sku || '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-slate-900 text-sm">
                          {qty}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 font-medium">
                          {item.unit || 'pcs'}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="inline-block w-4 h-4 rounded border border-slate-400 bg-slate-50 align-middle mr-1.5" />
                          <span className="text-[10px] text-slate-400">Verified</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Summary Calculation */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t-2 border-slate-300">
              <div className="text-xs text-slate-500 max-w-sm">
                <span className="font-bold text-slate-700 block mb-1">Order Notes / Delivery Terms:</span>
                <p className="text-[11px] leading-relaxed italic">
                  {order.notes
                    ? order.notes
                    : 'Standard procurement terms apply. Please supply certified delivery challan / invoice with incoming shipment.'}
                </p>
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                  <span>Line Items:</span>
                  <span className="font-bold text-slate-900">{items.length} items</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                  <span>Total Quantity:</span>
                  <span className="font-bold text-slate-900">{totalUnits} units</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-black text-slate-900 border-b-2 border-slate-900">
                  <span>Delivery Status:</span>
                  <span className={`uppercase text-xs font-extrabold ${order.status === 'RECEIVED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {order.status === 'RECEIVED' ? 'Fully Delivered' : 'Pending Delivery'}
                  </span>
                </div>
              </div>
            </div>

            {/* Formal Verification Signatures */}
            <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-600">
              <div>
                <div className="h-10 border-b border-slate-300 flex items-end pb-1 font-mono text-xs font-semibold text-slate-800">
                  {order.created_by || 'Store Manager'}
                </div>
                <div className="mt-1 font-bold text-slate-800">Authorized Purchasing Manager</div>
                <div className="text-[10px] text-slate-400">Date: {new Date(order.created_at).toLocaleDateString()}</div>
              </div>

              <div>
                <div className="h-10 border-b border-slate-300 flex items-end pb-1 font-mono text-xs font-semibold text-slate-800">
                  {order.received_at ? `Verified (${new Date(order.received_at).toLocaleDateString()})` : ''}
                </div>
                <div className="mt-1 font-bold text-slate-800">Vendor / Receiving Verification</div>
                <div className="text-[10px] text-slate-400">Signature & Date Received</div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400">
              Generated via ResStock Pro Store Management System • Official Purchase Order Document
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
