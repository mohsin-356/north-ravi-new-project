
import { generateMedicineDatabase, Medicine } from './medicineDatabase';

export interface DatabaseConfig {
  medicineCount: number;
  generateCustomers: boolean;
  generateSuppliers: boolean;
  generateSales: boolean;
  generateExpenses: boolean;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  cnic: string;
  dateOfBirth: string;
  totalPurchases: number;
  lastVisit: string;
  loyaltyPoints: number;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  paymentTerms: string;
  status: string;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  date: string;
  time: string;
  customerId?: number;
  items: {
    medicineId: number;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashierId: number;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  notes?: string;
  approvedBy: string;
}

export class DatabaseSeeder {
  private config: DatabaseConfig;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      medicineCount: 20000,
      generateCustomers: true,
      generateSuppliers: true,
      generateSales: true,
      generateExpenses: true,
      ...config
    };
  }

  // Main seeding function
  async seedDatabase(): Promise<{
    medicines: Medicine[];
    customers: Customer[];
    suppliers: Supplier[];
    sales: Sale[];
    expenses: Expense[];
  }> {
    console.log('Starting database seeding...');
    
    const medicines = generateMedicineDatabase(this.config.medicineCount);
    console.log(`Generated ${medicines.length} medicines`);

    const customers = this.config.generateCustomers ? this.generateCustomers(500) : [];
    console.log(`Generated ${customers.length} customers`);

    const suppliers = this.config.generateSuppliers ? this.generateSuppliers(50) : [];
    console.log(`Generated ${suppliers.length} suppliers`);

    const sales = this.config.generateSales ? this.generateSales(1000, medicines, customers) : [];
    console.log(`Generated ${sales.length} sales`);

    const expenses = this.config.generateExpenses ? this.generateExpenses(200) : [];
    console.log(`Generated ${expenses.length} expenses`);

    console.log('Database seeding completed!');

    return {
      medicines,
      customers,
      suppliers,
      sales,
      expenses
    };
  }

  // Generate customer data
  private generateCustomers(count: number): Customer[] {
    const customers: Customer[] = [];
    const firstNames = ['Ahmed', 'Ali', 'Hassan', 'Muhammad', 'Fatima', 'Aisha', 'Zainab', 'Khadija', 'Omar', 'Usman'];
    const lastNames = ['Khan', 'Ali', 'Hassan', 'Ahmad', 'Sheikh', 'Malik', 'Butt', 'Chaudhry', 'Qureshi', 'Shah'];
    const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar', 'Quetta'];

    for (let i = 1; i <= count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];

      customers.push({
        id: i,
        name: `${firstName} ${lastName}`,
        phone: `+92-${300 + Math.floor(Math.random() * 50)}-${Math.floor(Math.random() * 9000000) + 1000000}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        address: `House ${Math.floor(Math.random() * 999) + 1}, Street ${Math.floor(Math.random() * 50) + 1}, ${city}`,
        cnic: `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000000) + 1000000}-${Math.floor(Math.random() * 9) + 1}`,
        dateOfBirth: this.randomDate(1970, 2005),
        totalPurchases: Math.floor(Math.random() * 50000) + 1000,
        lastVisit: this.randomDate(2024, 2024),
        loyaltyPoints: Math.floor(Math.random() * 500)
      });
    }

    return customers;
  }

  // Generate supplier data
  private generateSuppliers(count: number): Supplier[] {
    const suppliers: Supplier[] = [];
    const companyNames = [
      'GSK Pakistan', 'Abbott Laboratories', 'Searle Pakistan', 'Getz Pharma',
      'Pfizer Pakistan', 'Hilton Pharma', 'Sami Pharmaceuticals', 'Bayer Pakistan',
      'CCL Pharmaceuticals', 'Martin Dow', 'Novartis Pakistan', 'Roche Pakistan'
    ];
    const contactNames = ['Muhammad Ali', 'Ahmed Khan', 'Fatima Sheikh', 'Ali Hassan', 'Sarah Ahmad'];
    const cities = ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad'];
    const paymentTerms = ['Net 30', 'Net 15', '2/10 Net 30', 'COD', 'Net 45'];

    for (let i = 1; i <= count; i++) {
      const companyName = companyNames[Math.floor(Math.random() * companyNames.length)] + ` ${i > companyNames.length ? 'Distributors' : ''}`;
      
      suppliers.push({
        id: i,
        name: companyName,
        contactPerson: contactNames[Math.floor(Math.random() * contactNames.length)],
        phone: `+92-${42 + Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 9000000) + 1000000}`,
        email: `contact@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        address: `${Math.floor(Math.random() * 99) + 1} Industrial Area`,
        city: cities[Math.floor(Math.random() * cities.length)],
        paymentTerms: paymentTerms[Math.floor(Math.random() * paymentTerms.length)],
        status: Math.random() > 0.1 ? 'Active' : 'Inactive'
      });
    }

    return suppliers;
  }

  // Generate sales data
  private generateSales(count: number, medicines: Medicine[], customers: Customer[]): Sale[] {
    const sales: Sale[] = [];
    const paymentMethods = ['Cash', 'Card', 'Bank Transfer', 'Credit'];

    for (let i = 1; i <= count; i++) {
      const saleDate = this.randomDate(2024, 2024);
      const itemCount = Math.floor(Math.random() * 5) + 1;
      const items: Sale['items'] = [];
      let subtotal = 0;

      // Generate random items for this sale
      for (let j = 0; j < itemCount; j++) {
        const medicine = medicines[Math.floor(Math.random() * medicines.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const price = medicine.salePrice;
        const total = quantity * price;

        items.push({
          medicineId: medicine.id,
          quantity,
          price,
          total
        });

        subtotal += total;
      }

      const discount = Math.floor(Math.random() * (subtotal * 0.1));
      const tax = (subtotal - discount) * 0.17; // 17% tax
      const total = subtotal - discount + tax;

      sales.push({
        id: i,
        invoiceNumber: `INV-${String(i).padStart(6, '0')}`,
        date: saleDate,
        time: `${Math.floor(Math.random() * 12) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
        customerId: Math.random() > 0.3 ? customers[Math.floor(Math.random() * customers.length)].id : undefined,
        items,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        cashierId: Math.floor(Math.random() * 5) + 1
      });
    }

    return sales;
  }

  // Generate expense data
  private generateExpenses(count: number): Expense[] {
    const expenses: Expense[] = [];
    const categories = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Equipment', 'Insurance', 'Supplies', 'Maintenance'];
    const descriptions = {
      'Rent': ['Monthly shop rent', 'Storage rent'],
      'Utilities': ['Electricity bill', 'Gas bill', 'Internet bill', 'Phone bill'],
      'Salaries': ['Staff salaries', 'Overtime payment', 'Bonus payment'],
      'Marketing': ['Advertisement', 'Promotional materials', 'Social media marketing'],
      'Equipment': ['Computer purchase', 'Printer purchase', 'Furniture'],
      'Insurance': ['Shop insurance', 'Equipment insurance'],
      'Supplies': ['Office supplies', 'Cleaning supplies'],
      'Maintenance': ['Equipment maintenance', 'Shop repairs']
    };
    const approvers = ['Manager', 'Owner', 'Accountant'];

    for (let i = 1; i <= count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const categoryDescriptions = descriptions[category as keyof typeof descriptions];
      
      expenses.push({
        id: i,
        date: this.randomDate(2024, 2024),
        category,
        description: categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)],
        amount: Math.floor(Math.random() * 50000) + 1000,
        notes: Math.random() > 0.7 ? 'Additional notes for this expense' : undefined,
        approvedBy: approvers[Math.floor(Math.random() * approvers.length)]
      });
    }

    return expenses;
  }

  // Utility function to generate random dates
  private randomDate(startYear: number, endYear: number): string {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    return new Date(randomTime).toISOString().split('T')[0];
  }

  // Export data to JSON files
  async exportToJSON(data: any): Promise<void> {
    try {
      // In a real Electron app, you would use fs to write files
      // For now, we'll use localStorage or provide download links
      
      Object.keys(data).forEach(key => {
        const jsonData = JSON.stringify(data[key], null, 2);
        localStorage.setItem(`pharmacy_${key}`, jsonData);
        console.log(`Exported ${key} to localStorage`);
      });

      // Create downloadable files
      this.createDownloadableFiles(data);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  private createDownloadableFiles(data: any): void {
    Object.keys(data).forEach(key => {
      const jsonData = JSON.stringify(data[key], null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `pharmacy_${key}.json`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log(`Created download link for ${key}`);
      // Uncomment the next line to auto-download
      // link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
}

// Initialize and run seeding
export const initializeDatabase = async (): Promise<void> => {
  const seeder = new DatabaseSeeder({
    medicineCount: 20000,
    generateCustomers: true,
    generateSuppliers: true,
    generateSales: true,
    generateExpenses: true
  });

  try {
    const data = await seeder.seedDatabase();
    await seeder.exportToJSON(data);
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
};
