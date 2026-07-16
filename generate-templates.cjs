const XLSX = require('xlsx');

// 1. Product Template
const productHeaders = [
  'Code (Optional)', 
  'SKU', 
  'Name', 
  'Category', 
  'UOM (Optional)', 
  'Base Price (Optional)', 
  'Selling Price (Optional)', 
  'Dealer Price (Optional)', 
  'Supplier (Optional)', 
  'Business Unit (Optional)', 
  'Description (Optional)', 
  'Generic Name (Optional)', 
  'Brand Name (Optional)', 
  'Dosage Form (Optional)'
];
const productData = [
  productHeaders,
  ['PRD-001', 'SKU-1001', 'Amoxicillin 500mg', 'Antibiotics', 'Box', '5000', '6500', '5800', 'Alpha Pharma', 'Medical', 'Standard antibiotic', 'Amoxicillin', 'Amoxil', 'Capsule']
];
const productWs = XLSX.utils.aoa_to_sheet(productData);
const productWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(productWb, productWs, 'Products');
XLSX.writeFile(productWb, './public/templates/Product_Import_Template.xlsx');

// 2. Inventory Template (Matching Export Format)
const inventoryHeaders = [
  'No',
  'Product Code (Optional)',
  'SKU',
  'Product Name (Optional)',
  'UOM (Optional)',
  'Batch Number (Optional)',
  'Expiry Date',
  'Team (Optional)',
  'Physical Qty',
  'Block Qty',
  'Returned Qty',
  'Sample Qty',
  'FOC Qty',
  'Available Qty (Optional)',
  'Warehouse',
  'Branch (Optional)',
  'Batch Status (Optional)'
];

const inventoryData = [
  inventoryHeaders,
  [1, 'PRD-001', 'SKU-1001', 'Amoxicillin', 'Box', 'B-2026-07-A', '2027-12-31', 'Team A', 500, 50, 0, 0, 0, 450, 'Yangon Warehouse', 'Yangon', 'ACTIVE']
];

const inventoryWs = XLSX.utils.aoa_to_sheet(inventoryData);
const inventoryWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(inventoryWb, inventoryWs, 'Inventory');
XLSX.writeFile(inventoryWb, './public/templates/Inventory_Import_Template.xlsx');

console.log('Templates generated successfully with optional fields!');
