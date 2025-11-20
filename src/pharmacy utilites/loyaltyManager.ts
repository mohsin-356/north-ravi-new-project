
export interface LoyaltyPoints {
  customerId: string;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalSpent: number;
  lastPurchase: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsRequired: number;
  type: 'discount' | 'freeItem' | 'cashback';
  value: number;
  description: string;
}

class LoyaltyManager {
  private pointsPerRupee = 1; // 1 point per PKR spent
  private tierThresholds = {
    Bronze: 0,
    Silver: 5000,
    Gold: 15000,
    Platinum: 50000
  };

  private rewards: LoyaltyReward[] = [
    {
      id: '1',
      name: '5% Discount',
      pointsRequired: 500,
      type: 'discount',
      value: 5,
      description: '5% off on next purchase'
    },
    {
      id: '2',
      name: '10% Discount',
      pointsRequired: 1000,
      type: 'discount',
      value: 10,
      description: '10% off on next purchase'
    },
    {
      id: '3',
      name: 'Free Medicine',
      pointsRequired: 2000,
      type: 'freeItem',
      value: 100,
      description: 'Free medicine worth PKR 100'
    },
    {
      id: '4',
      name: 'PKR 50 Cashback',
      pointsRequired: 1500,
      type: 'cashback',
      value: 50,
      description: 'PKR 50 cashback on next purchase'
    }
  ];

  calculatePoints(amount: number): number {
    return Math.floor(amount * this.pointsPerRupee);
  }

  addPoints(customerId: string, amount: number): LoyaltyPoints {
    const currentPoints = this.getCustomerPoints(customerId);
    const newPoints = this.calculatePoints(amount);
    
    const updatedPoints: LoyaltyPoints = {
      customerId,
      points: currentPoints.points + newPoints,
      totalSpent: currentPoints.totalSpent + amount,
      lastPurchase: new Date().toISOString(),
      tier: this.calculateTier(currentPoints.totalSpent + amount)
    };

    this.saveCustomerPoints(updatedPoints);
    return updatedPoints;
  }

  getCustomerPoints(customerId: string): LoyaltyPoints {
    const stored = localStorage.getItem(`loyalty_${customerId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      customerId,
      points: 0,
      tier: 'Bronze',
      totalSpent: 0,
      lastPurchase: new Date().toISOString()
    };
  }

  private saveCustomerPoints(loyaltyPoints: LoyaltyPoints) {
    localStorage.setItem(`loyalty_${loyaltyPoints.customerId}`, JSON.stringify(loyaltyPoints));
  }

  private calculateTier(totalSpent: number): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
    if (totalSpent >= this.tierThresholds.Platinum) return 'Platinum';
    if (totalSpent >= this.tierThresholds.Gold) return 'Gold';
    if (totalSpent >= this.tierThresholds.Silver) return 'Silver';
    return 'Bronze';
  }

  getAvailableRewards(customerId: string): LoyaltyReward[] {
    const customerPoints = this.getCustomerPoints(customerId);
    return this.rewards.filter(reward => reward.pointsRequired <= customerPoints.points);
  }

  redeemReward(customerId: string, rewardId: string): { success: boolean; message: string; discount?: number } {
    const customerPoints = this.getCustomerPoints(customerId);
    const reward = this.rewards.find(r => r.id === rewardId);
    
    if (!reward) {
      return { success: false, message: 'Reward not found' };
    }
    
    if (customerPoints.points < reward.pointsRequired) {
      return { success: false, message: 'Insufficient points' };
    }
    
    // Deduct points
    const updatedPoints: LoyaltyPoints = {
      ...customerPoints,
      points: customerPoints.points - reward.pointsRequired
    };
    
    this.saveCustomerPoints(updatedPoints);
    
    return {
      success: true,
      message: `${reward.name} redeemed successfully!`,
      discount: reward.type === 'discount' ? reward.value : 0
    };
  }

  getTierBenefits(tier: string) {
    const benefits = {
      Bronze: ['1 point per PKR', 'Basic support'],
      Silver: ['1.2 points per PKR', 'Priority support', '2% extra discount'],
      Gold: ['1.5 points per PKR', 'Priority support', '5% extra discount', 'Free delivery'],
      Platinum: ['2 points per PKR', 'VIP support', '10% extra discount', 'Free delivery', 'Monthly bonus points']
    };
    
    return benefits[tier as keyof typeof benefits] || benefits.Bronze;
  }

  getAllCustomersLoyalty(): LoyaltyPoints[] {
    const customers: LoyaltyPoints[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('loyalty_')) {
        const data = localStorage.getItem(key);
        if (data) {
          customers.push(JSON.parse(data));
        }
      }
    }
    return customers.sort((a, b) => b.points - a.points);
  }
}

export const loyaltyManager = new LoyaltyManager();
