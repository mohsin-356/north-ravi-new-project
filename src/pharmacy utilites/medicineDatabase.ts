import { Medicine } from '@/types/medicine';
import { v4 as uuidv4 } from 'uuid';
import pakistaniManufacturers from '@/data/pakistaniManufacturers';
import commonPakistaniMedicines from '@/data/commonPakistaniMedicines';

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: Date;
  stock: number;
  price: number;
  category: string;
  barcode: string;
  alternativeMedicines: string[];
  isPakistani: boolean;
}

const categories = [
  'Antibiotic',
  'Analgesic',
  'Antihistamine',
  'Antacid',
  'Antidepressant',
  'Antidiabetic',
  'Antihypertensive',
  'Antimalarial',
  'Antiviral',
  'Cardiovascular',
  'Dermatological',
  'Gastrointestinal',
  'Hormonal',
  'Immunosuppressant',
  'Muscle Relaxant',
  'Ophthalmic',
  'Respiratory',
  'Vitamins'
];

const generateBatchNumber = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let result = '';
  
  // 2 letters + 6 numbers
  for (let i = 0; i < 2; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  for (let i = 0; i < 6; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return result;
};

const generateExpiryDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + Math.floor(Math.random() * 3) + 1); // 1-3 years from now
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date;
};

export const generateMedicineDatabase = async (count = 10000): Promise<Medicine[]> => {
  const medicines: Medicine[] = [];
  
  // First add common Pakistani medicines
  for (const med of commonPakistaniMedicines) {
    medicines.push({
      id: uuidv4(),
      name: med.name,
      genericName: med.genericName,
      manufacturer: med.manufacturer || pakistaniManufacturers[Math.floor(Math.random() * pakistaniManufacturers.length)],
      batchNumber: generateBatchNumber(),
      expiryDate: generateExpiryDate(),
      stock: Math.floor(Math.random() * 100) + 10,
      price: parseFloat((Math.random() * 500 + 10).toFixed(2)),
      category: med.category || categories[Math.floor(Math.random() * categories.length)],
      barcode: 'P' + Math.floor(10000000 + Math.random() * 90000000).toString(),
      alternativeMedicines: [],
      isPakistani: true
    });
  }
  
  // Generate remaining medicines to reach count
  while (medicines.length < count) {
    const manufacturer = pakistaniManufacturers[Math.floor(Math.random() * pakistaniManufacturers.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    medicines.push({
      id: uuidv4(),
      name: `Medicine ${medicines.length + 1}`,
      genericName: `Generic ${Math.floor(Math.random() * 500) + 1}`,
      manufacturer,
      batchNumber: generateBatchNumber(),
      expiryDate: generateExpiryDate(),
      stock: Math.floor(Math.random() * 100) + 10,
      price: parseFloat((Math.random() * 500 + 10).toFixed(2)),
      category,
      barcode: 'P' + Math.floor(10000000 + Math.random() * 90000000).toString(),
      alternativeMedicines: [],
      isPakistani: true
    });
  }
  
  // Add alternative medicines references
  medicines.forEach(med => {
    if (Math.random() > 0.7) { // 30% chance to have alternatives
      const alternatives = medicines
        .filter(m => 
          m.category === med.category && 
          m.id !== med.id &&
          m.price <= med.price * 1.5 &&
          m.price >= med.price * 0.5
        )
        .slice(0, 3)
        .map(m => m.id);
      
      med.alternativeMedicines = alternatives;
    }
  });
  
  return medicines;
};

export const searchMedicines = (medicines: Medicine[], term: string): Medicine[] => {
  if (!term) return medicines;
  
  const lowerTerm = term.toLowerCase();
  return medicines.filter(med => 
    med.name.toLowerCase().includes(lowerTerm) ||
    med.genericName.toLowerCase().includes(lowerTerm) ||
    med.manufacturer.toLowerCase().includes(lowerTerm) ||
    med.barcode.includes(term)
  );
};

export const getLowStockMedicines = (medicines: Medicine[], threshold = 10): Medicine[] => {
  return medicines.filter(med => med.stock <= threshold);
};

export const getExpiringMedicines = (medicines: Medicine[], months = 3): Medicine[] => {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setMonth(now.getMonth() + months);
  
  return medicines.filter(med => {
    const expiry = new Date(med.expiryDate);
    return expiry <= thresholdDate && expiry >= now;
  });
};
