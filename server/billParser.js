const XLSX = require('xlsx');

// Known units dictionary for normalization
const UNIT_PATTERNS = [
  { match: /\b(pieces|piece|pcs|pc)\b/i, unit: 'pieces' },
  { match: /\b(kilograms?|kgs?|kilo)\b/i, unit: 'kg' },
  { match: /\b(grams?|gms?|gm|g)\b/i, unit: 'g' },
  { match: /\b(liters?|litres?|ltrs?|ltr|l)\b/i, unit: 'liters' },
  { match: /\b(milliliters?|mls?|ml)\b/i, unit: 'ml' },
  { match: /\b(bottles?|btls?|btl)\b/i, unit: 'bottles' },
  { match: /\b(boxes|box|bx)\b/i, unit: 'boxes' },
  { match: /\b(packs?|pkts?|packets?|pk)\b/i, unit: 'packs' },
  { match: /\b(cans?|tins?)\b/i, unit: 'cans' },
  { match: /\b(rolls?|rl)\b/i, unit: 'rolls' },
  { match: /\b(sacks?|bags?)\b/i, unit: 'sacks' },
  { match: /\b(tubs?|buckets?)\b/i, unit: 'tubs' },
  { match: /\b(kegs?)\b/i, unit: 'kegs' },
  { match: /\b(cartons?|cases?|cs)\b/i, unit: 'cases' },
  { match: /\b(dozens?|doz)\b/i, unit: 'doz' },
  { match: /\b(nos|numbers?)\b/i, unit: 'Nos' }
];

function normalizeUnit(unitStr) {
  if (!unitStr) return 'pieces';
  const clean = unitStr.toString().trim().toLowerCase();
  for (const p of UNIT_PATTERNS) {
    if (p.match.test(clean)) return p.unit;
  }
  return clean || 'pieces';
}

function cleanText(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(str) {
  const stopWords = new Set(['the', 'and', 'with', 'for', 'of', 'in', 'pack', 'pkt', 'box', 'pcs', 'nos', 'kg', 'unit']);
  return new Set(
    cleanText(str)
      .split(' ')
      .filter(w => w.length > 1 && !stopWords.has(w))
  );
}

function tokenSimilarity(s1, s2) {
  const t1 = getTokens(s1);
  const t2 = getTokens(s2);
  if (t1.size === 0 || t2.size === 0) return 0;
  let intersect = 0;
  for (const t of t1) {
    if (t2.has(t)) intersect++;
  }
  const union = new Set([...t1, ...t2]).size;
  return intersect / union;
}

function levenshteinDistance(s1, s2) {
  s1 = s1 || '';
  s2 = s2 || '';
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d = [];
  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

function stringSimilarity(s1, s2) {
  const c1 = cleanText(s1);
  const c2 = cleanText(s2);
  if (!c1 || !c2) return 0;
  if (c1 === c2) return 1;
  const maxLen = Math.max(c1.length, c2.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(c1, c2);
  return Math.max(0, 1 - dist / maxLen);
}

// Header metadata extraction (vendor, invoice #, date)
function extractBillMetadata(lines) {
  let vendor = '';
  let invoiceNumber = '';
  let invoiceDate = '';

  const headerLines = lines.slice(0, 15);

  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i].trim();
    if (!line) continue;

    // Check for invoice / bill number
    if (!invoiceNumber) {
      const invMatch = line.match(/(?:invoice|bill|tax invoice|cash memo|inv|po|voucher)\s*(?:no\.?|num|number|#)?[:\s-]*([A-Z0-9\/-]{3,20})/i);
      if (invMatch && invMatch[1]) {
        invoiceNumber = invMatch[1].trim();
      }
    }

    // Check for date
    if (!invoiceDate) {
      const dateMatch = line.match(/(?:date|dated|dt\.?)[:\s-]*([0-9]{1,4}[\/\.-][0-9]{1,2}[\/\.-][0-9]{1,4})/i) ||
                        line.match(/\b([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{2,4})\b/);
      if (dateMatch && dateMatch[1]) {
        invoiceDate = dateMatch[1].trim();
      }
    }

    // Check for vendor name
    if (!vendor) {
      const vendorPrefixMatch = line.match(/(?:vendor|supplier|from|m\/s|billed by|seller)[:\s-]+(.*)/i);
      if (vendorPrefixMatch && vendorPrefixMatch[1]) {
        vendor = vendorPrefixMatch[1].trim();
      } else if (i === 0 && !line.toLowerCase().includes('invoice') && !line.toLowerCase().includes('bill to') && line.length > 2 && line.length < 50) {
        // Very often first line of invoice is company / vendor name
        vendor = line;
      }
    }
  }

  return { vendor, invoiceNumber, invoiceDate };
}

// Clean and parse numbers (amounts, quantities)
function cleanNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = val.toString().replace(/[$₹€£,]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Line item regex parser from plain/OCR text
function parseTextLineItems(text) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const metadata = extractBillMetadata(lines);
  const items = [];

  // Stop / ignore words for line items
  const ignorePatterns = [
    /^(subtotal|sub-total|total|tax|gst|vat|balance|amount due|thank you|terms|conditions|payment|bank|account|authorized|signature)/i,
    /^(item|description|product|sl\s*no|qty|quantity|rate|unit price|price|amount|disc|tax\s*%)/i,
    /^(page|bill to|ship to|invoice to|order details|delivery address)/i
  ];

  for (const line of lines) {
    // Check if line should be ignored
    if (ignorePatterns.some(rgx => rgx.test(line))) {
      continue;
    }

    // Pattern 1: Typical invoice table row:
    // [Item Name / Description] [Qty] [Unit?] [Rate/Cost] [Total]
    // e.g.: "Choice Ribeye Steak 12oz 10 pcs 14.50 145.00"
    // e.g.: "Extra Virgin Olive Oil 5L 4 bottles 32.00 128.00"
    // e.g.: "Microfiber Cloths 12 11.00 132.00"
    const rowMatch1 = line.match(/^([a-zA-Z0-9\s\(\)\/\-\.\'\&%]{3,50})\s+([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]{1,10})?\s+[$₹€£]?([0-9]+(?:\.[0-9]+)?)\s+[$₹€£]?([0-9]+(?:\.[0-9]+)?)$/);
    if (rowMatch1) {
      const name = rowMatch1[1].replace(/^[0-9]+[\.\)\s-]+/, '').trim();
      const qty = parseFloat(rowMatch1[2]);
      const unit = normalizeUnit(rowMatch1[3]);
      const unitCost = parseFloat(rowMatch1[4]);
      const totalCost = parseFloat(rowMatch1[5]);

      if (name.length > 2 && qty > 0) {
        items.push({
          raw_name: name,
          quantity: qty,
          unit,
          unit_cost: unitCost,
          total_cost: totalCost || (qty * unitCost)
        });
        continue;
      }
    }

    // Pattern 2: [Item Name] [Qty] [Unit?] [Rate] (without total)
    // e.g.: "Atlantic Salmon Fillets 5 kg 18.00"
    const rowMatch2 = line.match(/^([a-zA-Z0-9\s\(\)\/\-\.\'\&%]{3,50})\s+([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]{1,10})?\s+[$₹€£]?([0-9]+(?:\.[0-9]+)?)$/);
    if (rowMatch2) {
      const name = rowMatch2[1].replace(/^[0-9]+[\.\)\s-]+/, '').trim();
      const qty = parseFloat(rowMatch2[2]);
      const unit = normalizeUnit(rowMatch2[3]);
      const unitCost = parseFloat(rowMatch2[4]);

      if (name.length > 2 && qty > 0) {
        items.push({
          raw_name: name,
          quantity: qty,
          unit,
          unit_cost: unitCost,
          total_cost: qty * unitCost
        });
        continue;
      }
    }

    // Pattern 3: Separated by tabs, commas or multiple spaces
    // e.g. "San Marzano Canned Tomatoes \t 24 \t cans \t 2.10"
    const cols = line.split(/\t+|\s{3,}|,\s*/).map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      const candidateName = cols[0].replace(/^[0-9]+[\.\)\s-]+/, '').trim();
      const numCol1 = cleanNumber(cols[1]);
      const candidateUnit = cols.length >= 3 && isNaN(cleanNumber(cols[2])) ? cols[2] : '';
      const numCol2 = cols.length >= 3 && !isNaN(cleanNumber(cols[2])) ? cleanNumber(cols[2]) : (cols.length >= 4 ? cleanNumber(cols[3]) : 0);

      if (candidateName.length > 2 && numCol1 > 0 && !ignorePatterns.some(rgx => rgx.test(candidateName))) {
        items.push({
          raw_name: candidateName,
          quantity: numCol1,
          unit: normalizeUnit(candidateUnit),
          unit_cost: numCol2 > 0 ? numCol2 : 0,
          total_cost: numCol1 * numCol2
        });
        continue;
      }
    }

    // Pattern 4: Description followed by "x Qty" or "Qty: X"
    // e.g. "Jameson Irish Whiskey 750ml x 12 @ 26.00"
    const pattern4 = line.match(/^(.+?)\s*(?:x|qty:?)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:@|at|\$|₹|rate:?)?\s*([0-9]+(?:\.[0-9]+)?)?/i);
    if (pattern4) {
      const name = pattern4[1].replace(/^[0-9]+[\.\)\s-]+/, '').trim();
      const qty = parseFloat(pattern4[2]);
      const rate = pattern4[3] ? parseFloat(pattern4[3]) : 0;
      if (name.length > 2 && qty > 0) {
        items.push({
          raw_name: name,
          quantity: qty,
          unit: 'pieces',
          unit_cost: rate,
          total_cost: qty * rate
        });
        continue;
      }
    }

    // Pattern 5: Resilient Right-to-Left Token Scanning
    // In invoices and receipts, numerical columns (Qty, Rate, Total) appear at the end of the line
    const cleanedLine = line.replace(/[|│]/g, ' ').replace(/\s+/g, ' ').trim();
    const rawTokens = cleanedLine.split(' ');
    if (rawTokens.length >= 2) {
      // Find trailing numbers
      const numericIndices = [];
      for (let t = rawTokens.length - 1; t >= 0; t--) {
        const tok = rawTokens[t].replace(/[$₹€£]/g, '');
        // Check if token is a valid number
        if (/^[0-9]+(?:\.[0-9]+)?$/.test(tok)) {
          numericIndices.unshift(t);
        } else if (numericIndices.length > 0) {
          // Check if token is a unit e.g. kg, pcs, box
          const isUnit = UNIT_PATTERNS.some(p => p.match.test(tok));
          if (!isUnit) {
            // Stop scanning once we hit description words
            break;
          }
        }
      }

      if (numericIndices.length >= 1) {
        const firstNumIdx = numericIndices[0];
        // Ensure there is a description before the numbers
        const descTokens = rawTokens.slice(0, firstNumIdx);
        let candName = descTokens.join(' ').replace(/^[0-9]+[\.\)\s-]+/, '').trim();
        // Remove trailing unit from name if accidentally included
        let candUnit = 'pieces';
        for (let t = firstNumIdx; t < rawTokens.length; t++) {
          const tok = rawTokens[t];
          const matchedUnit = UNIT_PATTERNS.find(p => p.match.test(tok));
          if (matchedUnit) {
            candUnit = matchedUnit.unit;
            break;
          }
        }

        const numValues = numericIndices.map(idx => parseFloat(rawTokens[idx].replace(/[$₹€£]/g, '')));

        let qty = 1;
        let unitCost = 0;
        let totalCost = 0;

        if (numValues.length === 1) {
          qty = numValues[0];
        } else if (numValues.length === 2) {
          qty = numValues[0];
          unitCost = numValues[1];
          totalCost = qty * unitCost;
        } else if (numValues.length >= 3) {
          qty = numValues[0];
          unitCost = numValues[1];
          totalCost = numValues[2];
        }

        if (candName.length > 2 && qty > 0 && !ignorePatterns.some(rgx => rgx.test(candName))) {
          items.push({
            raw_name: candName,
            quantity: qty,
            unit: candUnit,
            unit_cost: unitCost,
            total_cost: totalCost || (qty * unitCost)
          });
        }
      }
    }
  }

  return {
    ...metadata,
    items
  };
}

// Parse Excel / CSV files
function parseExcelBill(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return { vendor: '', invoiceNumber: '', invoiceDate: '', items: [] };
  }

  let vendor = '';
  let invoiceNumber = '';
  let invoiceDate = '';

  // Look through top 10 rows for vendor / invoice / date metadata
  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r] || [];

    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || '').toString().trim();
      const nextCell = (row[c + 1] || '').toString().trim();

      // Check key-value pairs across adjacent columns
      if (!vendor && /^(?:vendor|supplier|from|seller|m\/s|billed by|supplier \/ vendor)[:\s]*$/i.test(cell) && nextCell) {
        vendor = nextCell;
      }
      if (!invoiceNumber && /^(?:invoice|bill|inv|po)\s*(?:no\.?|number|#)?[:\s]*$/i.test(cell) && nextCell) {
        invoiceNumber = nextCell;
      }
      if (!invoiceDate && /^(?:invoice\s*date|date|dated)[:\s]*$/i.test(cell) && nextCell) {
        invoiceDate = nextCell;
      }
    }

    const rowStr = row.join(' ');
    if (!vendor) {
      const vMatch = rowStr.match(/(?:vendor|supplier|from|seller|m\/s)[:\s-]+([^,\t\n]{2,50})/i);
      if (vMatch && vMatch[1]) {
        vendor = vMatch[1].split(/\s{2,}|PAYMENT|TERMS|DATE|PO/i)[0].trim();
      }
    }
    if (!invoiceNumber) {
      const invMatch = rowStr.match(/(?:invoice|bill|inv|po)\s*(?:no\.?|number|#)?[:\s-]*([A-Z0-9\/-]+)/i);
      if (invMatch && invMatch[1]) invoiceNumber = invMatch[1].trim();
    }
    if (!invoiceDate) {
      const dMatch = rowStr.match(/(?:date)[:\s-]*([0-9]{1,4}[\/\.-][0-9]{1,2}[\/\.-][0-9]{1,4})/i);
      if (dMatch && dMatch[1]) invoiceDate = dMatch[1].trim();
    }
  }

  // Find header row
  let headerRowIdx = -1;
  let nameColIdx = -1;
  let qtyColIdx = -1;
  let unitColIdx = -1;
  let rateColIdx = -1;
  let totalColIdx = -1;

  for (let r = 0; r < Math.min(15, rawRows.length); r++) {
    const row = rawRows[r] || [];
    let foundName = -1;
    let foundQty = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || '').toString().toLowerCase().trim();
      if (/item\s*desc|item\s*name|product\s*name|product\s*desc|particulars|material|article/i.test(cell) ||
          /^(item|description|product|particulars|name)$/i.test(cell)) {
        foundName = c;
      } else if (/^(qty|quantity|count|billed\s*qty|invoiced\s*qty|qty\s*received|order\s*qty)$/i.test(cell)) {
        foundQty = c;
      }
    }

    if (foundName !== -1 && foundQty !== -1) {
      headerRowIdx = r;
      nameColIdx = foundName;
      qtyColIdx = foundQty;
      // Find other columns
      for (let c = 0; c < row.length; c++) {
        if (c === nameColIdx || c === qtyColIdx) continue;
        const cell = (row[c] || '').toString().toLowerCase().trim();
        if (/^(unit|uom|measure|units|packaging)$/i.test(cell)) unitColIdx = c;
        if (/unit\s*price|unit\s*cost|price|rate|cost/i.test(cell)) rateColIdx = c;
        if (/line\s*total|net\s*amount|total|amount/i.test(cell)) totalColIdx = c;
      }
      break;
    }
  }

  const items = [];

  if (headerRowIdx !== -1) {
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r] || [];
      const name = (row[nameColIdx] || '').toString().trim();
      const qty = cleanNumber(row[qtyColIdx]);
      if (!name || qty <= 0) continue;

      // Filter out subtotal / total footer rows
      if (/^(subtotal|total|tax|discount|gst|vat)/i.test(name)) continue;

      const unit = unitColIdx !== -1 ? normalizeUnit(row[unitColIdx]) : 'pieces';
      const unitCost = rateColIdx !== -1 ? cleanNumber(row[rateColIdx]) : 0;
      const totalCost = totalColIdx !== -1 ? cleanNumber(row[totalColIdx]) : (qty * unitCost);

      items.push({
        raw_name: name,
        quantity: qty,
        unit,
        unit_cost: unitCost,
        total_cost: totalCost
      });
    }
  } else {
    // Fallback: Use standard sheet_to_json
    const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    for (const row of jsonRows) {
      const nameKey = Object.keys(row).find(k => /name|item|desc|product/i.test(k));
      const qtyKey = Object.keys(row).find(k => /qty|quantity|count/i.test(k));
      const unitKey = Object.keys(row).find(k => /unit|uom/i.test(k));
      const costKey = Object.keys(row).find(k => /cost|rate|price/i.test(k));

      if (nameKey && qtyKey) {
        const name = (row[nameKey] || '').toString().trim();
        const qty = cleanNumber(row[qtyKey]);
        if (name && qty > 0) {
          const unit = unitKey ? normalizeUnit(row[unitKey]) : 'pieces';
          const unitCost = costKey ? cleanNumber(row[costKey]) : 0;
          items.push({
            raw_name: name,
            quantity: qty,
            unit,
            unit_cost: unitCost,
            total_cost: qty * unitCost
          });
        }
      }
    }
  }

  return { vendor, invoiceNumber, invoiceDate, items };
}

// Matching engine: compares parsed bill items against stock database items
function matchExtractedItemsWithInventory(extractedItems, inventoryItems, vendorName = '') {
  return extractedItems.map((extracted, index) => {
    const rawName = (extracted.raw_name || '').trim();
    const cleanRaw = cleanText(rawName);

    let bestMatch = null;
    let highestScore = 0;
    const candidates = [];

    for (const item of inventoryItems) {
      let score = 0;
      const cleanItemName = cleanText(item.name);

      // 1. Exact match
      if (cleanRaw === cleanItemName) {
        score = 100;
      }
      // 2. Substring match
      else if (cleanItemName.includes(cleanRaw) || cleanRaw.includes(cleanItemName)) {
        const lenRatio = Math.min(cleanRaw.length, cleanItemName.length) / Math.max(cleanRaw.length, cleanItemName.length);
        score = 80 + (lenRatio * 15); // 80 - 95
      }
      // 3. Token overlap and Levenshtein similarity
      else {
        const tokenSim = tokenSimilarity(rawName, item.name);
        const strSim = stringSimilarity(rawName, item.name);
        score = (tokenSim * 65) + (strSim * 35);
      }

      // 4. Bonus if supplier matches
      if (vendorName && item.supplier && cleanText(item.supplier).includes(cleanText(vendorName))) {
        score += 5;
      }

      score = Math.min(100, Math.round(score));

      if (score >= 35) {
        candidates.push({
          item,
          score
        });
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // Sort candidates descending by score
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, 4).map(c => ({
      id: c.item.id,
      name: c.item.name,
      sku: c.item.sku,
      department: c.item.department,
      category: c.item.category,
      unit: c.item.unit,
      current_stock: c.item.current_stock,
      cost_per_unit: c.item.cost_per_unit,
      score: c.score
    }));

    // Determine status
    let matchStatus = 'NO_MATCH';
    if (highestScore >= 75) {
      matchStatus = 'HIGH_MATCH';
    } else if (highestScore >= 45) {
      matchStatus = 'PARTIAL_MATCH';
    }

    // Auto-generate a SKU suggestion for new item
    const deptPrefix = bestMatch?.department ? bestMatch.department.substring(0, 3).toUpperCase() : 'KIT';
    const suggestedSku = `${deptPrefix}-NEW-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      id: `bill-item-${index + 1}`,
      raw_name: rawName,
      scanned_quantity: extracted.quantity || 1,
      scanned_unit: extracted.unit || 'pieces',
      scanned_unit_cost: extracted.unit_cost || 0,
      scanned_total_cost: extracted.total_cost || ((extracted.quantity || 1) * (extracted.unit_cost || 0)),

      // Matching info
      confidence: highestScore,
      match_status: matchStatus,
      matched_item: highestScore >= 45 && bestMatch ? {
        id: bestMatch.id,
        name: bestMatch.name,
        sku: bestMatch.sku,
        department: bestMatch.department,
        category: bestMatch.category,
        unit: bestMatch.unit,
        current_stock: bestMatch.current_stock,
        cost_per_unit: bestMatch.cost_per_unit
      } : null,
      alternate_candidates: topCandidates,

      // Editable defaults for user confirmation
      selected_item_id: highestScore >= 45 && bestMatch ? bestMatch.id : null,
      is_new_item: highestScore < 45 || !bestMatch,
      new_item_data: {
        name: rawName,
        sku: suggestedSku,
        department: bestMatch?.department || 'Kitchen',
        category: bestMatch?.category || 'General Supplies',
        unit: extracted.unit || 'pieces',
        min_threshold: 5,
        cost_per_unit: extracted.unit_cost || 0
      },
      confirmed_quantity: extracted.quantity || 1,
      confirmed_unit_cost: extracted.unit_cost || (bestMatch ? bestMatch.cost_per_unit : 0),
      update_stock_cost: extracted.unit_cost > 0,
      include_in_import: true
    };
  });
}

// Master parsing function for Excel / CSV vendor bills
async function parseVendorBill(fileBuffer, originalFilename, mimeType, inventoryItems) {
  const ext = (originalFilename || '').split('.').pop().toLowerCase();

  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext) ||
    mimeType?.includes('spreadsheet') ||
    mimeType?.includes('excel') ||
    mimeType?.includes('csv');

  if (!isExcel) {
    throw new Error('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV vendor bill.');
  }

  const parsedResult = parseExcelBill(fileBuffer);

  const items = matchExtractedItemsWithInventory(
    parsedResult.items || [],
    inventoryItems || [],
    parsedResult.vendor || ''
  );

  return {
    fileType: 'excel',
    fileName: originalFilename,
    vendor: parsedResult.vendor || '',
    invoiceNumber: parsedResult.invoiceNumber || '',
    invoiceDate: parsedResult.invoiceDate || '',
    totalLines: items.length,
    matchedCount: items.filter(i => i.match_status === 'HIGH_MATCH').length,
    partialCount: items.filter(i => i.match_status === 'PARTIAL_MATCH').length,
    newCount: items.filter(i => i.match_status === 'NO_MATCH').length,
    items
  };
}

module.exports = {
  parseVendorBill,
  parseExcelBill,
  matchExtractedItemsWithInventory,
  cleanText,
  stringSimilarity,
  tokenSimilarity
};
