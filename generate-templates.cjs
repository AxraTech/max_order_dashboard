const XLSX = require('xlsx');

// 1. Product Template (Product Master Data)
const productHeaders = [
  'Code (Optional)', 
  'SKU', 
  'Name', 
  'Category', 
  'UOM (Optional)', 
  'Base Price (Optional)', 
  'Selling Price (Optional)', 
  'Supplier (Optional)', 
  'Business Unit (Optional)', 
  'Must Sale (Optional)', 
  'Description (Optional)', 
  'Generic Name (Optional)', 
  'Brand Name (Optional)', 
  'Dosage Form (Optional)'
];
const productData = [
  productHeaders,
  ['PRD-001', 'SKU-1001', 'Amoxicillin 500mg', 'Antibiotics', 'Box', '5000', '6500', 'Alpha Pharma', 'Medical', 'Yes', 'Standard antibiotic', 'Amoxicillin', 'Amoxil', 'Capsule'],
  ['PRD-002', 'SKU-1002', 'Paracetamol 500mg', 'Analgesics', 'Box', '1200', '1800', 'Mega Life', 'Consumer Health', 'No', 'Pain and fever relief', 'Paracetamol', 'Panadol', 'Tablet']
];
const productWs = XLSX.utils.aoa_to_sheet(productData);
const productWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(productWb, productWs, 'Products');
XLSX.writeFile(productWb, './public/templates/Product_Import_Template.xlsx');

// 2. Unified Inventory Template (Auto-provisions Product Master + Stock Batch in 1 Step)
const inventoryHeaders = [
  'Warehouse',
  'Product Name',
  'SKU (Optional)',
  'Product Code (Optional)',
  'Category (Optional)',
  'Business Unit (Optional)',
  'Supplier (Optional)',
  'UOM (Optional)',
  'Must Sale (Optional)',
  'Batch Number',
  'Expiry Date (YYYY-MM-DD)',
  'Physical Qty',
  'COGS / Cost Price (MMK)',
  'Selling Price (MMK)',
  'Category Group (Optional)',
  'Manufacturing Date (Optional)',
  'Generic Name (Optional)',
  'Brand Name (Optional)',
  'Dosage Form (Optional)',
  'Damage Qty (Optional)',
  'Sample Qty (Optional)',
  'FOC Qty (Optional)',
  'Notes (Optional)'
];

const inventoryData = [
  inventoryHeaders,
  [
    'Yangon Main Warehouse',
    'Amoxicillin 500mg',
    'AMOX-500',
    'PRD-001',
    'Antibiotics',
    'Medical',
    'Alpha Pharma',
    'Box',
    'Yes',
    'B-2026-10-A',
    '2026-10-31',
    500,
    4000,
    6000,
    'CPD',
    '2024-10-01',
    'Amoxicillin',
    'Amoxil',
    'Capsule',
    0,
    10,
    20,
    'Initial batch stock received'
  ],
  [
    'Yangon Main Warehouse',
    'Paracetamol 500mg',
    'PARA-500',
    'PRD-002',
    'Analgesics',
    'Consumer Health',
    'Mega Life',
    'Box',
    'No',
    'B-2027-02-B',
    '2027-02-28',
    1000,
    1200,
    1800,
    'G1',
    '2025-02-01',
    'Paracetamol',
    'Panadol',
    'Tablet',
    0,
    0,
    50,
    'Regular monthly supply'
  ]
];

const inventoryWs = XLSX.utils.aoa_to_sheet(inventoryData);
const inventoryWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(inventoryWb, inventoryWs, 'Inventory');
XLSX.writeFile(inventoryWb, './public/templates/Inventory_Import_Template.xlsx');

console.log('Unified templates generated successfully!');
