const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const sampleRows = [
  {
    'Item Name': 'Truffle Oil 250ml',
    'SKU': 'KIT-OIL-11',
    'Department': 'Kitchen',
    'Category': 'Gourmet Ingredients',
    'Current Stock': 10,
    'Unit': 'bottles',
    'Minimum Threshold': 4,
    'Unit Cost': 22.50,
    'Supplier': 'Urbani Truffles',
    'Location': 'Dry Storage Shelf C'
  },
  {
    'Item Name': 'Arborio Risotto Rice 5kg',
    'SKU': 'KIT-RICE-12',
    'Department': 'Kitchen',
    'Category': 'Dry Goods',
    'Current Stock': 15,
    'Unit': 'bags',
    'Minimum Threshold': 5,
    'Unit Cost': 14.20,
    'Supplier': 'MedFoods Direct',
    'Location': 'Pantry Bin 4'
  },
  {
    'Item Name': 'Cotton Bar Aprons (Black)',
    'SKU': 'HK-LINEN-09',
    'Department': 'Housekeeping',
    'Category': 'Linens',
    'Current Stock': 30,
    'Unit': 'pieces',
    'Minimum Threshold': 15,
    'Unit Cost': 7.50,
    'Supplier': 'Standard Textile',
    'Location': 'Linen Closet Floor 1'
  },
  {
    'Item Name': 'Stainless Steel Polish 32oz',
    'SKU': 'HK-CHEM-09',
    'Department': 'Housekeeping',
    'Category': 'Chemicals',
    'Current Stock': 6,
    'Unit': 'bottles',
    'Minimum Threshold': 3,
    'Unit Cost': 9.80,
    'Supplier': 'Ecolab',
    'Location': 'Supply Bay B'
  },
  {
    'Item Name': 'Casamigos Reposado Tequila 750ml',
    'SKU': 'BAR-SPIR-11',
    'Department': 'Bar',
    'Category': 'Spirits',
    'Current Stock': 8,
    'Unit': 'bottles',
    'Minimum Threshold': 4,
    'Unit Cost': 54.00,
    'Supplier': 'Southern Glazer\'s',
    'Location': 'Top Shelf Lockup'
  },
  {
    'Item Name': 'Fresh Mint Bunches (1lb)',
    'SKU': 'BAR-GARN-12',
    'Department': 'Bar',
    'Category': 'Garnishes & Fresh',
    'Current Stock': 4,
    'Unit': 'bunches',
    'Minimum Threshold': 3,
    'Unit Cost': 4.50,
    'Supplier': 'Green Valley Produce',
    'Location': 'Bar Fridge 1'
  }
];

function generateSampleFile() {
  const publicDir = path.join(__dirname, '../client/public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sample Inventory');

  const filePath = path.join(publicDir, 'sample_inventory_template.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log('Sample Excel file generated at:', filePath);
}

generateSampleFile();

module.exports = { sampleRows, generateSampleFile };
