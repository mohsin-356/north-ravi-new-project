
export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    companyName: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
  };
  subscription: {
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'expired' | 'suspended';
    expiryDate: string;
    features: string[];
  };
  settings: {
    currency: string;
    language: string;
    timezone: string;
    dateFormat: string;
    fiscalYearStart: string;
  };
  branches: string[];
  users: string[];
  createdAt: string;
  isActive: boolean;
}

export interface TenantContext {
  tenant: Tenant;
  currentBranch?: string;
  user: any;
}

class TenantManager {
  private tenants: Tenant[] = [];
  private currentTenant: Tenant | null = null;

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultTenant();
  }

  private initializeDefaultTenant() {
    if (this.tenants.length === 0) {
      const defaultTenant: Tenant = {
        id: 'default',
        name: '',
        branding: {
          primaryColor: '#0057A5',
          secondaryColor: '#ffffff',
          companyName: 'PharmaCare Pharmacy',
          address: 'Karachi, Pakistan',
          phone: '+92-21-1234567',
          email: 'info@pharmacare.pk',
          taxId: 'NTN-1234567-8'
        },
        subscription: {
          plan: 'premium',
          status: 'active',
          expiryDate: '2025-12-31',
          features: ['multi_branch', 'analytics', 'loyalty', 'prescriptions']
        },
        settings: {
          currency: 'PKR',
          language: 'en',
          timezone: 'Asia/Karachi',
          dateFormat: 'DD/MM/YYYY',
          fiscalYearStart: '01/07'
        },
        branches: ['main'],
        users: [],
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      this.tenants.push(defaultTenant);
      this.currentTenant = defaultTenant;
      this.saveToStorage();
    }
  }

  createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt'>): Tenant {
    const tenant: Tenant = {
      ...tenantData,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    this.tenants.push(tenant);
    this.saveToStorage();
    return tenant;
  }

  getTenant(tenantId: string): Tenant | null {
    return this.tenants.find(t => t.id === tenantId) || null;
  }

  getCurrentTenant(): Tenant | null {
    return this.currentTenant;
  }

  setCurrentTenant(tenantId: string): boolean {
    const tenant = this.getTenant(tenantId);
    if (tenant && tenant.isActive) {
      this.currentTenant = tenant;
      return true;
    }
    return false;
  }

  updateTenantBranding(tenantId: string, branding: Partial<Tenant['branding']>): boolean {
    const tenant = this.getTenant(tenantId);
    if (tenant) {
      tenant.branding = { ...tenant.branding, ...branding };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  validateTenantAccess(tenantId: string, userId: string): boolean {
    const tenant = this.getTenant(tenantId);
    return tenant ? tenant.users.includes(userId) : false;
  }

  getTenantByDomain(domain: string): Tenant | null {
    return this.tenants.find(t => t.domain === domain) || null;
  }

  addBranchToTenant(tenantId: string, branchId: string): boolean {
    const tenant = this.getTenant(tenantId);
    if (tenant && !tenant.branches.includes(branchId)) {
      tenant.branches.push(branchId);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  removeBranchFromTenant(tenantId: string, branchId: string): boolean {
    const tenant = this.getTenant(tenantId);
    if (tenant) {
      tenant.branches = tenant.branches.filter(b => b !== branchId);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  hasFeature(feature: string): boolean {
    return this.currentTenant?.subscription.features.includes(feature) || false;
  }

  isSubscriptionActive(): boolean {
    if (!this.currentTenant) return false;
    
    const expiryDate = new Date(this.currentTenant.subscription.expiryDate);
    const now = new Date();
    
    return this.currentTenant.subscription.status === 'active' && expiryDate > now;
  }

  getSubscriptionDaysRemaining(): number {
    if (!this.currentTenant) return 0;
    
    const expiryDate = new Date(this.currentTenant.subscription.expiryDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('pharmacy_tenants');
    if (stored) {
      this.tenants = JSON.parse(stored);
      if (this.tenants.length > 0) {
        this.currentTenant = this.tenants[0];
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem('pharmacy_tenants', JSON.stringify(this.tenants));
  }
}

export const tenantManager = new TenantManager();
