import { Medicine } from '@/types/medicine';

type TaxConfig = {
  enabled: boolean;
  rate: number;
  inclusive: boolean;
};

const TAX_CONFIG_KEY = 'taxConfig';

export class TaxService {
  private taxConfig: TaxConfig;

  constructor() {
    const savedConfig = localStorage.getItem(TAX_CONFIG_KEY);
    this.taxConfig = savedConfig 
      ? JSON.parse(savedConfig) 
      : {
          enabled: true,
          rate: 0.17, // 17% tax rate
          inclusive: false
        };
  }

  public getTaxConfig(): TaxConfig {
    return this.taxConfig;
  }

  public updateTaxConfig(config: Partial<TaxConfig>): void {
    const newConfig = { 
      ...this.taxConfig, 
      ...config,
      rate: Math.max(0, Math.min(1, config.rate ?? this.taxConfig.rate)) // Clamp between 0-100%
    };
    
    this.taxConfig = newConfig;
    localStorage.setItem(TAX_CONFIG_KEY, JSON.stringify(newConfig));
  }

  public calculateTax(amount: number): number {
    if (!this.taxConfig.enabled || amount <= 0) return 0;
    return parseFloat((amount * this.taxConfig.rate).toFixed(2));
  }

  public calculateTotalWithTax(amount: number): number {
    if (!this.taxConfig.enabled || amount <= 0) return amount;
    
    return this.taxConfig.inclusive 
      ? amount 
      : parseFloat((amount + this.calculateTax(amount)).toFixed(2));
  }

  public applyTaxToMedicines(medicines: Medicine[]): Medicine[] {
    return medicines.map(med => ({
      ...med,
      price: this.calculateTotalWithTax(med.price)
    }));
  }
}

export const taxService = new TaxService();
