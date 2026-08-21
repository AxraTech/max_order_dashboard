const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Ensure target directories exist
const publicTemplatesDir = path.join(__dirname, 'public', 'templates');
if (!fs.existsSync(publicTemplatesDir)) {
  fs.mkdirSync(publicTemplatesDir, { recursive: true });
}

// 100 Realistic Pharmaceutical Products
const rawProducts = [
  // Antibiotics (15)
  { name: 'Amoxicillin 500mg', generic: 'Amoxicillin', brand: 'Amoxil', form: 'Capsule', cat: 'Antibiotics', uom: 'Box', cost: 4500, price: 6500, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Amoxicillin & Clavulanate 625mg', generic: 'Amoxicillin + Clavulanic Acid', brand: 'Augmentin', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 12000, price: 16500, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Azithromycin 500mg', generic: 'Azithromycin', brand: 'Zithromax', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 8500, price: 11500, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Cefixime 200mg', generic: 'Cefixime', brand: 'Cefspan', form: 'Capsule', cat: 'Antibiotics', uom: 'Box', cost: 11000, price: 15000, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Ciprofloxacin 500mg', generic: 'Ciprofloxacin', brand: 'Ciprobay', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 5000, price: 7200, bu: 'Medical', sup: 'Grand Pharma' },
  { name: 'Levofloxacin 500mg', generic: 'Levofloxacin', brand: 'Cravit', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 9500, price: 13500, bu: 'Medical', sup: 'Grand Pharma' },
  { name: 'Cephalexin 500mg', generic: 'Cephalexin', brand: 'Keflex', form: 'Capsule', cat: 'Antibiotics', uom: 'Box', cost: 6000, price: 8500, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Clarithromycin 500mg', generic: 'Clarithromycin', brand: 'Klacid', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 14000, price: 19000, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Doxycycline 100mg', generic: 'Doxycycline', brand: 'Vibramycin', form: 'Capsule', cat: 'Antibiotics', uom: 'Box', cost: 3500, price: 5000, bu: 'Medical', sup: 'BioMed Myanmar' },
  { name: 'Metronidazole 400mg', generic: 'Metronidazole', brand: 'Flagyl', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 2500, price: 3800, bu: 'Medical', sup: 'BioMed Myanmar' },
  { name: 'Ceftriaxone 1g Injection', generic: 'Ceftriaxone', brand: 'Rocephin', form: 'Vial', cat: 'Antibiotics', uom: 'Vial', cost: 4000, price: 6000, bu: 'Hospital Care', sup: 'Grand Pharma' },
  { name: 'Meropenem 1g Injection', generic: 'Meropenem', brand: 'Meronem', form: 'Vial', cat: 'Antibiotics', uom: 'Vial', cost: 22000, price: 30000, bu: 'Hospital Care', sup: 'Grand Pharma' },
  { name: 'Ampicillin 500mg', generic: 'Ampicillin', brand: 'Omnipen', form: 'Capsule', cat: 'Antibiotics', uom: 'Box', cost: 4000, price: 5800, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Cefuroxime Axetil 500mg', generic: 'Cefuroxime', brand: 'Zinnat', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 16000, price: 22000, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Erythromycin 250mg', generic: 'Erythromycin', brand: 'Erythrocin', form: 'Tablet', cat: 'Antibiotics', uom: 'Box', cost: 4800, price: 7000, bu: 'Medical', sup: 'BioMed Myanmar' },

  // Analgesics & Antipyretics (12)
  { name: 'Paracetamol 500mg', generic: 'Paracetamol', brand: 'Biogesic', form: 'Tablet', cat: 'Analgesics', uom: 'Box', cost: 1200, price: 1800, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Paracetamol Extra (with Caffeine)', generic: 'Paracetamol + Caffeine', brand: 'Panadol Extra', form: 'Tablet', cat: 'Analgesics', uom: 'Box', cost: 2200, price: 3200, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Ibuprofen 400mg', generic: 'Ibuprofen', brand: 'Brufen', form: 'Tablet', cat: 'Analgesics', uom: 'Box', cost: 2800, price: 4200, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Mefenamic Acid 500mg', generic: 'Mefenamic Acid', brand: 'Ponstan', form: 'Capsule', cat: 'Analgesics', uom: 'Box', cost: 3500, price: 5200, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Diclofenac Sodium 50mg', generic: 'Diclofenac', brand: 'Voltaren', form: 'Tablet', cat: 'Analgesics', uom: 'Box', cost: 2600, price: 4000, bu: 'Medical', sup: 'Novartis Alliance' },
  { name: 'Diclofenac Emulgel 20g', generic: 'Diclofenac Diethylamine', brand: 'Voltaren Emulgel', form: 'Tube', cat: 'Analgesics', uom: 'Tube', cost: 4200, price: 6200, bu: 'Consumer Health', sup: 'Novartis Alliance' },
  { name: 'Tramadol 50mg', generic: 'Tramadol', brand: 'Ultram', form: 'Capsule', cat: 'Analgesics', uom: 'Box', cost: 5500, price: 8000, bu: 'Medical', sup: 'Grand Pharma' },
  { name: 'Aceclofenac 100mg', generic: 'Aceclofenac', brand: 'Hifenac', form: 'Tablet', cat: 'Analgesics', uom: 'Box', cost: 3800, price: 5600, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Celecoxib 200mg', generic: 'Celecoxib', brand: 'Celebrex', form: 'Capsule', cat: 'Analgesics', uom: 'Box', cost: 11000, price: 15500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Etoricoxib 90mg', generic: 'Etoricoxib', brand: 'Arcoxia', form: 'Tablet', cat: 'Analgesics', uom: 'Box', cost: 13500, price: 18500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Paracetamol Syrup 120mg/5ml', generic: 'Paracetamol', brand: 'Calpol', form: 'Bottle', cat: 'Analgesics', uom: 'Bottle', cost: 1800, price: 2700, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Ketorolac 30mg Injection', generic: 'Ketorolac', brand: 'Toradol', form: 'Ampoule', cat: 'Analgesics', uom: 'Ampoule', cost: 3000, price: 4500, bu: 'Hospital Care', sup: 'Grand Pharma' },

  // Gastrointestinal (12)
  { name: 'Omeprazole 20mg', generic: 'Omeprazole', brand: 'Losec', form: 'Capsule', cat: 'Gastrointestinal', uom: 'Box', cost: 3200, price: 4800, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Esomeprazole 40mg', generic: 'Esomeprazole', brand: 'Nexium', form: 'Tablet', cat: 'Gastrointestinal', uom: 'Box', cost: 9500, price: 13500, bu: 'Specialty Pharma', sup: 'Apex Healthcare' },
  { name: 'Pantoprazole 40mg', generic: 'Pantoprazole', brand: 'Pantocid', form: 'Tablet', cat: 'Gastrointestinal', uom: 'Box', cost: 6200, price: 8800, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Rabeprazole 20mg', generic: 'Rabeprazole', brand: 'Pariet', form: 'Tablet', cat: 'Gastrointestinal', uom: 'Box', cost: 8000, price: 11500, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Domperidone 10mg', generic: 'Domperidone', brand: 'Motilium', form: 'Tablet', cat: 'Gastrointestinal', uom: 'Box', cost: 2500, price: 3800, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Ondansetron 8mg', generic: 'Ondansetron', brand: 'Zofran', form: 'Tablet', cat: 'Gastrointestinal', uom: 'Box', cost: 5500, price: 8000, bu: 'Medical', sup: 'Grand Pharma' },
  { name: 'Loperamide 2mg', generic: 'Loperamide', brand: 'Imodium', form: 'Capsule', cat: 'Gastrointestinal', uom: 'Box', cost: 2000, price: 3000, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Oral Rehydration Salts (ORS)', generic: 'Oral Electrolytes', brand: 'Hydralyte', form: 'Box', cat: 'Gastrointestinal', uom: 'Box', cost: 1500, price: 2300, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Antacid Gel Suspension 240ml', generic: 'Aluminum & Magnesium Hydroxide', brand: 'Gaviscon', form: 'Bottle', cat: 'Gastrointestinal', uom: 'Bottle', cost: 3500, price: 5200, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Hyoscine Butylbromide 10mg', generic: 'Hyoscine Butylbromide', brand: 'Buscopan', form: 'Tablet', cat: 'Gastrointestinal', uom: 'Box', cost: 3800, price: 5600, bu: 'Consumer Health', sup: 'Apex Healthcare' },
  { name: 'Lactulose Syrup 100ml', generic: 'Lactulose', brand: 'Duphalac', form: 'Bottle', cat: 'Gastrointestinal', uom: 'Bottle', cost: 4500, price: 6500, bu: 'Consumer Health', sup: 'Apex Healthcare' },
  { name: 'Probiotics Complex Capsule', generic: 'Lactobacillus Complex', brand: 'Bio-Flora', form: 'Capsule', cat: 'Gastrointestinal', uom: 'Box', cost: 9000, price: 13000, bu: 'Consumer Health', sup: 'Pacific Health' },

  // Cardiovascular & Hypertension (12)
  { name: 'Amlodipine 5mg', generic: 'Amlodipine', brand: 'Norvasc', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 3000, price: 4500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Amlodipine 10mg', generic: 'Amlodipine', brand: 'Norvasc', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 4500, price: 6500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Losartan Potassium 50mg', generic: 'Losartan', brand: 'Cozaar', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 4200, price: 6200, bu: 'Specialty Pharma', sup: 'Sun Pharma Group' },
  { name: 'Telmisartan 40mg', generic: 'Telmisartan', brand: 'Micardis', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 6800, price: 9800, bu: 'Specialty Pharma', sup: 'Sun Pharma Group' },
  { name: 'Telmisartan + Amlodipine (40/5mg)', generic: 'Telmisartan + Amlodipine', brand: 'Twynsta', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 11500, price: 16000, bu: 'Specialty Pharma', sup: 'Sun Pharma Group' },
  { name: 'Atorvastatin 20mg', generic: 'Atorvastatin', brand: 'Lipitor', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 6500, price: 9500, bu: 'Specialty Pharma', sup: 'Apex Healthcare' },
  { name: 'Rosuvastatin 10mg', generic: 'Rosuvastatin', brand: 'Crestor', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 9000, price: 13000, bu: 'Specialty Pharma', sup: 'Apex Healthcare' },
  { name: 'Bisoprolol 5mg', generic: 'Bisoprolol', brand: 'Concor', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 5800, price: 8400, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Clopidogrel 75mg', generic: 'Clopidogrel', brand: 'Plavix', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 7200, price: 10500, bu: 'Specialty Pharma', sup: 'Grand Pharma' },
  { name: 'Aspirin Cardio 100mg', generic: 'Aspirin', brand: 'Aspirin Protect', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 2800, price: 4200, bu: 'Consumer Health', sup: 'Novartis Alliance' },
  { name: 'Furosemide 40mg', generic: 'Furosemide', brand: 'Lasix', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 2000, price: 3000, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Spironolactone 25mg', generic: 'Spironolactone', brand: 'Aldactone', form: 'Tablet', cat: 'Cardiovascular', uom: 'Box', cost: 4200, price: 6200, bu: 'Medical', sup: 'Alpha Pharma' },

  // Respiratory & Anti-allergy (10)
  { name: 'Cetirizine 10mg', generic: 'Cetirizine', brand: 'Zyrtec', form: 'Tablet', cat: 'Respiratory', uom: 'Box', cost: 2200, price: 3400, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Loratadine 10mg', generic: 'Loratadine', brand: 'Claritin', form: 'Tablet', cat: 'Respiratory', uom: 'Box', cost: 2600, price: 3900, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Fexofenadine 180mg', generic: 'Fexofenadine', brand: 'Telfast', form: 'Tablet', cat: 'Respiratory', uom: 'Box', cost: 8500, price: 12500, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Montelukast 10mg', generic: 'Montelukast', brand: 'Singulair', form: 'Tablet', cat: 'Respiratory', uom: 'Box', cost: 9500, price: 14000, bu: 'Specialty Pharma', sup: 'Apex Healthcare' },
  { name: 'Salbutamol Inhaler 100mcg', generic: 'Salbutamol', brand: 'Ventolin Inhaler', form: 'Inhaler', cat: 'Respiratory', uom: 'Box', cost: 7500, price: 11000, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Seretide Inhaler 25/125mcg', generic: 'Salmeterol + Fluticasone', brand: 'Seretide Evohaler', form: 'Inhaler', cat: 'Respiratory', uom: 'Box', cost: 26000, price: 35000, bu: 'Specialty Pharma', sup: 'Apex Healthcare' },
  { name: 'Dextromethorphan Syrup 60ml', generic: 'Dextromethorphan', brand: 'Bisolvon Dry', form: 'Bottle', cat: 'Respiratory', uom: 'Bottle', cost: 2400, price: 3600, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Bromhexine 8mg', generic: 'Bromhexine', brand: 'Bisolvon', form: 'Tablet', cat: 'Respiratory', uom: 'Box', cost: 1800, price: 2700, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Acetylcysteine 600mg Effervescent', generic: 'N-Acetylcysteine', brand: 'Fluimucil', form: 'Tablet', cat: 'Respiratory', uom: 'Box', cost: 8800, price: 12800, bu: 'Consumer Health', sup: 'Pacific Health' },
  { name: 'Fluticasone Nasal Spray', generic: 'Fluticasone Propionate', brand: 'Flixonase', form: 'Bottle', cat: 'Respiratory', uom: 'Bottle', cost: 14000, price: 19500, bu: 'Specialty Pharma', sup: 'Apex Healthcare' },

  // Vitamins & Supplements (10)
  { name: 'Vitamin C 500mg Chewable', generic: 'Ascorbic Acid', brand: 'C-Viton', form: 'Tablet', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 3000, price: 4500, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Vitamin B-Complex High Potency', generic: 'Vitamin B1+B6+B12', brand: 'Neurobion', form: 'Tablet', cat: 'Vitamins & Minerals', uom: 'Box', cost: 5200, price: 7800, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Calcium + Vitamin D3 600mg', generic: 'Calcium Carbonate + D3', brand: 'Caltrate Plus', form: 'Tablet', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 6500, price: 9500, bu: 'Consumer Health', sup: 'Pacific Health' },
  { name: 'Multivitamins & Minerals with Ginseng', generic: 'Multivitamin Formula', brand: 'Pharmaton G115', form: 'Capsule', cat: 'Vitamins & Minerals', uom: 'Box', cost: 12500, price: 17500, bu: 'Consumer Health', sup: 'Pacific Health' },
  { name: 'Omega-3 Fish Oil 1000mg', generic: 'Fish Oil EPA/DHA', brand: 'Blackmores Omega-3', form: 'Capsule', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 11000, price: 15800, bu: 'Consumer Health', sup: 'Pacific Health' },
  { name: 'Iron + Folic Acid Complex', generic: 'Ferrous Fumarate + Folic Acid', brand: 'Iberet Folic', form: 'Tablet', cat: 'Vitamins & Minerals', uom: 'Box', cost: 4800, price: 7200, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Zinc 50mg Tablets', generic: 'Zinc Gluconate', brand: 'Zinc-Life', form: 'Tablet', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 3500, price: 5200, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Vitamin D3 2000 IU', generic: 'Cholecalciferol', brand: 'D3-Max', form: 'Capsule', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 7200, price: 10500, bu: 'Consumer Health', sup: 'Pacific Health' },
  { name: 'Glucosamine & Chondroitin 1500mg', generic: 'Glucosamine Sulfate', brand: 'Joint-Flex', form: 'Tablet', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 16000, price: 23000, bu: 'Consumer Health', sup: 'Pacific Health' },
  { name: 'Coenzyme Q10 100mg', generic: 'Coenzyme Q10', brand: 'CoQ-Vital', form: 'Capsule', cat: 'Vitamins & Minerals', uom: 'Bottle', cost: 18000, price: 25500, bu: 'Consumer Health', sup: 'Pacific Health' },

  // Antidiabetic (8)
  { name: 'Metformin 500mg', generic: 'Metformin HCl', brand: 'Glucophage', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 2500, price: 3800, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Metformin 850mg XR', generic: 'Metformin Extended Release', brand: 'Glucophage XR', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 4200, price: 6200, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Gliclazide 80mg', generic: 'Gliclazide', brand: 'Diamicron', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 4800, price: 7000, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Glimepiride 2mg', generic: 'Glimepiride', brand: 'Amaryl', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 3600, price: 5400, bu: 'Medical', sup: 'Sun Pharma Group' },
  { name: 'Sitagliptin 100mg', generic: 'Sitagliptin', brand: 'Januvia', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 21000, price: 28500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Empagliflozin 10mg', generic: 'Empagliflozin', brand: 'Jardiance', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 24000, price: 32000, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Dapagliflozin 10mg', generic: 'Dapagliflozin', brand: 'Forxiga', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 25000, price: 33500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Vildagliptin + Metformin (50/500mg)', generic: 'Vildagliptin + Metformin', brand: 'Galvus Met', form: 'Tablet', cat: 'Antidiabetic', uom: 'Box', cost: 19500, price: 26500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },

  // Dermatology (7)
  { name: 'Hydrocortisone 1% Cream 15g', generic: 'Hydrocortisone', brand: 'Cortaid', form: 'Cream', cat: 'Dermatology', uom: 'Tube', cost: 2000, price: 3000, bu: 'Consumer Health', sup: 'Alpha Pharma' },
  { name: 'Betamethasone Dipropionate 15g', generic: 'Betamethasone', brand: 'Diprosone', form: 'Cream', cat: 'Dermatology', uom: 'Tube', cost: 2800, price: 4200, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Clotrimazole 1% Cream 20g', generic: 'Clotrimazole', brand: 'Canesten', form: 'Cream', cat: 'Dermatology', uom: 'Tube', cost: 2500, price: 3800, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Mupirocin 2% Ointment 5g', generic: 'Mupirocin', brand: 'Bactroban', form: 'Ointment', cat: 'Dermatology', uom: 'Tube', cost: 3800, price: 5600, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Fusidic Acid Cream 15g', generic: 'Fusidic Acid', brand: 'Fucidin', form: 'Cream', cat: 'Dermatology', uom: 'Tube', cost: 4500, price: 6800, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Ketoconazole 2% Shampoo 100ml', generic: 'Ketoconazole', brand: 'Nizoral', form: 'Bottle', cat: 'Dermatology', uom: 'Bottle', cost: 5500, price: 8000, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Silver Sulfadiazine 1% Cream 50g', generic: 'Silver Sulfadiazine', brand: 'Silvadene', form: 'Tube', cat: 'Dermatology', uom: 'Tube', cost: 3600, price: 5400, bu: 'Hospital Care', sup: 'Grand Pharma' },

  // CNS & Neurology (7)
  { name: 'Gabapentin 300mg', generic: 'Gabapentin', brand: 'Neurontin', form: 'Capsule', cat: 'CNS & Neurology', uom: 'Box', cost: 8500, price: 12000, bu: 'Specialty Pharma', sup: 'Grand Pharma' },
  { name: 'Pregabalin 75mg', generic: 'Pregabalin', brand: 'Lyrica', form: 'Capsule', cat: 'CNS & Neurology', uom: 'Box', cost: 11000, price: 15500, bu: 'Specialty Pharma', sup: 'Grand Pharma' },
  { name: 'Sertraline 50mg', generic: 'Sertraline', brand: 'Zoloft', form: 'Tablet', cat: 'CNS & Neurology', uom: 'Box', cost: 9200, price: 13200, bu: 'Specialty Pharma', sup: 'Sun Pharma Group' },
  { name: 'Escitalopram 10mg', generic: 'Escitalopram', brand: 'Cipralex', form: 'Tablet', cat: 'CNS & Neurology', uom: 'Box', cost: 9800, price: 14000, bu: 'Specialty Pharma', sup: 'Sun Pharma Group' },
  { name: 'Betahistine 24mg', generic: 'Betahistine Mesilate', brand: 'Serc', form: 'Tablet', cat: 'CNS & Neurology', uom: 'Box', cost: 6800, price: 9800, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Flunarizine 5mg', generic: 'Flunarizine', brand: 'Sibelium', form: 'Capsule', cat: 'CNS & Neurology', uom: 'Box', cost: 4500, price: 6800, bu: 'Medical', sup: 'Apex Healthcare' },
  { name: 'Piracetam 800mg', generic: 'Piracetam', brand: 'Nootropil', form: 'Tablet', cat: 'CNS & Neurology', uom: 'Box', cost: 7200, price: 10500, bu: 'Medical', sup: 'Grand Pharma' },

  // Ophthalmic & ENT (7)
  { name: 'Ciprofloxacin Eye/Ear Drops 5ml', generic: 'Ciprofloxacin', brand: 'Ciprobay Otic', form: 'Drops', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 2800, price: 4200, bu: 'Medical', sup: 'Grand Pharma' },
  { name: 'Tobramycin + Dexamethasone Eye Drops', generic: 'Tobramycin + Dexamethasone', brand: 'Tobradex', form: 'Drops', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 5800, price: 8500, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Sodium Hyaluronate Eye Drops 10ml', generic: 'Sodium Hyaluronate 0.1%', brand: 'Hialid', form: 'Drops', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 6500, price: 9500, bu: 'Consumer Health', sup: 'Novartis Alliance' },
  { name: 'Moxifloxacin Eye Drops 5ml', generic: 'Moxifloxacin', brand: 'Vigamox', form: 'Drops', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 7800, price: 11000, bu: 'Specialty Pharma', sup: 'Novartis Alliance' },
  { name: 'Oxymetazoline 0.05% Nasal Spray 15ml', generic: 'Oxymetazoline', brand: 'Afrin', form: 'Bottle', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 3200, price: 4800, bu: 'Consumer Health', sup: 'Mega Life Sciences' },
  { name: 'Chloramphenicol 0.5% Eye Drops 10ml', generic: 'Chloramphenicol', brand: 'Chloromycetin', form: 'Drops', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 1800, price: 2700, bu: 'Medical', sup: 'Alpha Pharma' },
  { name: 'Boric Acid Ear Drops 15ml', generic: 'Boric Acid Solution', brand: 'Oto-Clean', form: 'Drops', cat: 'Ophthalmic & ENT', uom: 'Bottle', cost: 1500, price: 2300, bu: 'Consumer Health', sup: 'Alpha Pharma' }
];

console.log(`Loaded ${rawProducts.length} unique pharmaceutical products.`);

// Warehouses to distribute inventory
const warehouses = [
  'Yangon Branch Main Warehouse',
  'Bago Main Warehouse'
];

// Category groups
const categoryGroups = ['CPD', 'G1', 'G2', 'G3', 'PC', 'HOVID'];

// 7 Batch definitions per product
const batchConfigs = [
  { batchSuffix: 'A', exp: '2026-06-30', mfg: '2024-06-01', qtyMultiplier: 1.2, catGroup: 'CPD', notes: 'FIFO early batch - Priority Sale' },
  { batchSuffix: 'B', exp: '2026-09-30', mfg: '2024-09-15', qtyMultiplier: 1.5, catGroup: 'G1', notes: 'Q3 standard supply batch' },
  { batchSuffix: 'C', exp: '2026-12-31', mfg: '2024-12-01', qtyMultiplier: 2.0, catGroup: 'G1', notes: 'Year-end regular stock batch' },
  { batchSuffix: 'D', exp: '2027-04-30', mfg: '2025-04-01', qtyMultiplier: 1.8, catGroup: 'G2', notes: 'Fresh manufacturing stock' },
  { batchSuffix: 'E', exp: '2027-08-31', mfg: '2025-08-15', qtyMultiplier: 2.2, catGroup: 'G2', notes: 'Standard central distribution batch' },
  { batchSuffix: 'F', exp: '2028-02-28', mfg: '2026-01-10', qtyMultiplier: 1.4, catGroup: 'G3', notes: 'Long-shelf reserve batch' },
  { batchSuffix: 'G', exp: '2028-11-30', mfg: '2026-05-01', qtyMultiplier: 1.0, catGroup: 'PC', notes: 'Extended validity reserve stock' }
];

// --- 1. BUILD INVENTORY TEMPLATE (100 products x 7 batches = 700 rows) ---
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

const inventoryRows = [inventoryHeaders];

// --- 2. BUILD PRODUCT MASTER TEMPLATE (100 products) ---
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

const productRows = [productHeaders];

rawProducts.forEach((p, idx) => {
  const prodNum = String(idx + 1).padStart(3, '0');
  const code = `PRD-${prodNum}`;
  const sku = `SKU-${1000 + idx + 1}`;
  const isMustSale = idx % 8 === 0 ? 'Yes' : 'No';

  // Add to Product Master Template
  productRows.push([
    code,
    sku,
    p.name,
    p.cat,
    p.uom,
    p.cost,
    p.price,
    p.sup,
    p.bu,
    isMustSale,
    `${p.name} (${p.generic}) pharmaceutical grade`,
    p.generic,
    p.brand,
    p.form
  ]);

  // Generate 7 Batches for this Product
  batchConfigs.forEach((b, bIdx) => {
    const warehouse = warehouses[(idx + bIdx) % warehouses.length];
    const batchNo = `B${prodNum}-${b.batchSuffix}`;
    const baseQty = 150 + ((idx * 17) % 350);
    const physicalQty = Math.round(baseQty * b.qtyMultiplier);
    const sampleQty = bIdx % 2 === 0 ? Math.round(physicalQty * 0.02) : 0;
    const focQty = bIdx % 3 === 0 ? Math.round(physicalQty * 0.05) : 0;
    const damageQty = bIdx === 0 && idx % 10 === 0 ? 5 : 0;

    inventoryRows.push([
      warehouse,
      p.name,
      sku,
      code,
      p.cat,
      p.bu,
      p.sup,
      p.uom,
      isMustSale,
      batchNo,
      b.exp,
      physicalQty,
      p.cost,
      p.price,
      b.catGroup,
      b.mfg,
      p.generic,
      p.brand,
      p.form,
      damageQty,
      sampleQty,
      focQty,
      b.notes
    ]);
  });
});

console.log(`Generated ${inventoryRows.length - 1} inventory rows (100 products x 7 batches).`);
console.log(`Generated ${productRows.length - 1} product master rows.`);

// Write Inventory Workbook
const inventoryWs = XLSX.utils.aoa_to_sheet(inventoryRows);
const inventoryWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(inventoryWb, inventoryWs, 'Inventory');

const invOutPublic = path.join(publicTemplatesDir, 'Inventory_Import_Template.xlsx');
const invOutRoot = path.join(__dirname, '..', 'Inventory_Import_Template.xlsx');
XLSX.writeFile(inventoryWb, invOutPublic);
XLSX.writeFile(inventoryWb, invOutRoot);
console.log(`✓ Saved Inventory Template to: ${invOutPublic}`);
console.log(`✓ Saved Inventory Template to: ${invOutRoot}`);

// Write Product Workbook
const productWs = XLSX.utils.aoa_to_sheet(productRows);
const productWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(productWb, productWs, 'Products');

const prodOutPublic = path.join(publicTemplatesDir, 'Product_Import_Template.xlsx');
XLSX.writeFile(productWb, prodOutPublic);
console.log(`✓ Saved Product Template to: ${prodOutPublic}`);

console.log('\n🎉 ALL 100x PRODUCTS & 7x BATCHES TEMPLATES GENERATED SUCCESSFULLY!');
