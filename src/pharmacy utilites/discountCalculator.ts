
export interface DiscountRule {
  daysToExpiry: number;
  discountPercentage: number;
}

export const defaultDiscountRules: DiscountRule[] = [
  { daysToExpiry: 90, discountPercentage: 5 },
  { daysToExpiry: 60, discountPercentage: 10 },
  { daysToExpiry: 30, discountPercentage: 20 }
];

export const calculateExpiryDiscount = (
  expiryDate: string,
  originalPrice: number,
  customRules?: DiscountRule[]
): { discountPercentage: number; discountedPrice: number; daysToExpiry: number } => {
  const rules = customRules || defaultDiscountRules;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Find applicable discount rule
  const applicableRule = rules
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .find(rule => daysToExpiry <= rule.daysToExpiry);

  const discountPercentage = applicableRule ? applicableRule.discountPercentage : 0;
  const discountedPrice = originalPrice * (1 - discountPercentage / 100);

  return {
    discountPercentage,
    discountedPrice,
    daysToExpiry
  };
};

export const isNearExpiry = (expiryDate: string, thresholdDays: number = 90): boolean => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysToExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysToExpiry <= thresholdDays;
};
