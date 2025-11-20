
export interface AnalyticsData {
  sales: any[];
  medicines: any[];
  customers: any[];
  period: string;
}

export interface ForecastResult {
  medicine: string;
  predictedDemand: number;
  confidence: number;
  recommendedStock: number;
  seasonalFactor: number;
}

export interface KPIMetrics {
  dailySales: number;
  grossMargin: number;
  stockTurnover: number;
  expiryRisk: number;
  customerRetention: number;
  averageBasketSize: number;
  topSellingMedicines: any[];
  slowMovingStock: any[];
}

class AnalyticsEngine {
  calculateKPIs(data: AnalyticsData): KPIMetrics {
    const { sales, medicines, customers } = data;
    
    const dailySales = this.calculateDailySales(sales);
    const grossMargin = this.calculateGrossMargin(sales);
    const stockTurnover = this.calculateStockTurnover(sales, medicines);
    const expiryRisk = this.calculateExpiryRisk(medicines);
    const customerRetention = this.calculateCustomerRetention(customers, sales);
    const averageBasketSize = this.calculateAverageBasketSize(sales);
    const topSellingMedicines = this.getTopSellingMedicines(sales);
    const slowMovingStock = this.getSlowMovingStock(medicines, sales);

    return {
      dailySales,
      grossMargin,
      stockTurnover,
      expiryRisk,
      customerRetention,
      averageBasketSize,
      topSellingMedicines,
      slowMovingStock
    };
  }

  forecastDemand(sales: any[], medicines: any[], days: number = 30): ForecastResult[] {
    const medicinesSalesData = this.aggregateSalesByMedicine(sales);
    const forecasts: ForecastResult[] = [];

    medicines.forEach(medicine => {
      const salesHistory = medicinesSalesData[medicine.id] || [];
      if (salesHistory.length < 3) return; // Need minimum data points

      const forecast = this.calculateSeasonalForecast(salesHistory, days);
      const confidence = this.calculateConfidence(salesHistory);
      const recommendedStock = Math.ceil(forecast * 1.2); // 20% buffer

      forecasts.push({
        medicine: medicine.name,
        predictedDemand: forecast,
        confidence,
        recommendedStock,
        seasonalFactor: this.getSeasonalFactor(medicine.category)
      });
    });

    return forecasts.sort((a, b) => b.predictedDemand - a.predictedDemand);
  }

  private calculateDailySales(sales: any[]): number {
    const today = new Date().toDateString();
    const todaySales = sales.filter(sale => 
      new Date(sale.date).toDateString() === today
    );
    return todaySales.reduce((sum, sale) => sum + sale.total, 0);
  }

  private calculateGrossMargin(sales: any[]): number {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCost = sales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum: number, item: any) => 
        itemSum + (item.purchasePrice * item.quantity), 0), 0);
    
    return totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  }

  private calculateStockTurnover(sales: any[], medicines: any[]): number {
    const totalSalesValue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageInventoryValue = medicines.reduce((sum, med) => 
      sum + (med.quantity * med.purchasePrice), 0);
    
    return averageInventoryValue > 0 ? totalSalesValue / averageInventoryValue : 0;
  }

  private calculateExpiryRisk(medicines: any[]): number {
    const expiringMedicines = medicines.filter(med => {
      const expiryDate = new Date(med.expiryDate);
      const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry <= 30;
    });
    
    const expiringValue = expiringMedicines.reduce((sum, med) => 
      sum + (med.quantity * med.purchasePrice), 0);
    const totalValue = medicines.reduce((sum, med) => 
      sum + (med.quantity * med.purchasePrice), 0);
    
    return totalValue > 0 ? (expiringValue / totalValue) * 100 : 0;
  }

  private calculateCustomerRetention(customers: any[], sales: any[]): number {
    const recentCustomers = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return saleDate >= thirtyDaysAgo && sale.customerId;
    }).map(sale => sale.customerId);

    const uniqueRecentCustomers = new Set(recentCustomers);
    return customers.length > 0 ? (uniqueRecentCustomers.size / customers.length) * 100 : 0;
  }

  private calculateAverageBasketSize(sales: any[]): number {
    if (sales.length === 0) return 0;
    const totalValue = sales.reduce((sum, sale) => sum + sale.total, 0);
    return totalValue / sales.length;
  }

  private getTopSellingMedicines(sales: any[]): any[] {
    const medicinesSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach(sale => {
      sale.items.forEach((item: any) => {
        if (!medicinesSales[item.id]) {
          medicinesSales[item.id] = { name: item.name, quantity: 0, revenue: 0 };
        }
        medicinesSales[item.id].quantity += item.quantity;
        medicinesSales[item.id].revenue += item.price * item.quantity;
      });
    });

    return Object.entries(medicinesSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }

  private getSlowMovingStock(medicines: any[], sales: any[]): any[] {
    const medicinesSales = this.aggregateSalesByMedicine(sales);
    
    return medicines.filter(med => {
      const salesHistory = medicinesSales[med.id] || [];
      const recentSales = salesHistory.filter(sale => {
        const saleDate = new Date(sale.date);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= thirtyDaysAgo;
      });
      return recentSales.length === 0 && med.quantity > 0;
    }).slice(0, 20);
  }

  private aggregateSalesByMedicine(sales: any[]): { [medicineId: string]: any[] } {
    const medicinesSales: { [medicineId: string]: any[] } = {};
    
    sales.forEach(sale => {
      sale.items.forEach((item: any) => {
        if (!medicinesSales[item.id]) {
          medicinesSales[item.id] = [];
        }
        medicinesSales[item.id].push({
          date: sale.date,
          quantity: item.quantity,
          price: item.price
        });
      });
    });

    return medicinesSales;
  }

  private calculateSeasonalForecast(salesHistory: any[], days: number): number {
    // Simple moving average with seasonal adjustment
    const recentSales = salesHistory.slice(-30); // Last 30 data points
    const average = recentSales.reduce((sum, sale) => sum + sale.quantity, 0) / recentSales.length;
    
    // Apply seasonal factor (simplified)
    const seasonalFactor = this.getSeasonalMultiplier();
    return Math.max(0, average * seasonalFactor * (days / 30));
  }

  private calculateConfidence(salesHistory: any[]): number {
    if (salesHistory.length < 7) return 0.3;
    if (salesHistory.length < 30) return 0.6;
    return 0.85;
  }

  private getSeasonalFactor(category: string): number {
    const seasonalFactors: { [key: string]: number } = {
      'Analgesic': 1.2,
      'Antibiotic': 1.1,
      'Respiratory': 1.5,
      'Cardiac': 1.0,
      'Diabetic': 1.0,
      'default': 1.0
    };
    return seasonalFactors[category] || seasonalFactors.default;
  }

  private getSeasonalMultiplier(): number {
    const month = new Date().getMonth();
    // Winter months (flu season) - higher demand
    if (month >= 10 || month <= 2) return 1.3;
    // Summer months - moderate demand
    if (month >= 3 && month <= 5) return 1.1;
    // Monsoon season - higher demand for certain medicines
    if (month >= 6 && month <= 9) return 1.2;
    return 1.0;
  }
}

export const analyticsEngine = new AnalyticsEngine();
