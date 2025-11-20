
export interface License {
  id: string;
  branchId: string;
  branchName: string;
  licenseKey: string;
  hardwareFingerprint: string;
  plan: 'monthly' | 'yearly' | 'lifetime';
  status: 'active' | 'expired' | 'suspended' | 'grace_period';
  issuedDate: string;
  expiryDate: string;
  gracePeriodDays: number;
  remainingGraceDays: number;
  features: string[];
  pricing: {
    amount: number;
    currency: string;
    billingCycle: string;
  };
  encryptedData: string;
  lastValidation: string;
  validationCount: number;
  maxUsers: number;
  maxBranches: number;
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: License;
  error?: string;
  daysRemaining?: number;
  gracePeriodActive?: boolean;
  requiresRenewal?: boolean;
  enforcementActions?: string[];
}

class LicenseManager {
  private licenses: License[] = [];
  private currentLicense: License | null = null;
  private validationInterval: number | null = null;
  private enforcementEnabled = true;

  constructor() {
    this.loadFromStorage();
    this.initializeDefaultLicense();
    this.startPeriodicValidation();
  }

  private initializeDefaultLicense() {
    if (this.licenses.length === 0) {
      const defaultLicense = this.generateLicense('main', 'Main Branch', 'lifetime');
      this.licenses.push(defaultLicense);
      this.currentLicense = defaultLicense;
      this.saveToStorage();
    } else {
      this.currentLicense = this.licenses[0];
    }
  }

  generateLicense(branchId: string, branchName: string, plan: License['plan']): License {
    const hardwareFingerprint = this.generateHardwareFingerprint();
    const licenseKey = this.generateLicenseKey(branchId, hardwareFingerprint);
    
    let expiryDate: string;
    let pricing: License['pricing'];
    let maxUsers: number;
    let maxBranches: number;
    
    switch (plan) {
      case 'monthly':
        expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        pricing = { amount: 5000, currency: 'PKR', billingCycle: 'monthly' };
        maxUsers = 5;
        maxBranches = 1;
        break;
      case 'yearly':
        expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        pricing = { amount: 50000, currency: 'PKR', billingCycle: 'yearly' }; // 2 months free
        maxUsers = 10;
        maxBranches = 3;
        break;
      case 'lifetime':
        expiryDate = new Date(2099, 11, 31).toISOString();
        pricing = { amount: 200000, currency: 'PKR', billingCycle: 'one-time' };
        maxUsers = 999;
        maxBranches = 999;
        break;
    }

    const license: License = {
      id: this.generateId(),
      branchId,
      branchName,
      licenseKey,
      hardwareFingerprint,
      plan,
      status: 'active',
      issuedDate: new Date().toISOString(),
      expiryDate,
      gracePeriodDays: 7,
      remainingGraceDays: 7,
      features: this.getFeaturesForPlan(plan),
      pricing,
      encryptedData: this.encryptLicenseData(licenseKey, hardwareFingerprint),
      lastValidation: new Date().toISOString(),
      validationCount: 0,
      maxUsers,
      maxBranches
    };

    return license;
  }

  private getFeaturesForPlan(plan: License['plan']): string[] {
    const basicFeatures = [
      'pos', 'inventory', 'basic_reports', 'customer_management', 
      'prescription_tracking', 'barcode_scanning', 'offline_mode'
    ];
    
    const premiumFeatures = [
      'advanced_reports', 'analytics', 'loyalty_program', 'multi_user',
      'backup_restore', 'email_notifications', 'mobile_app', 'api_access'
    ];
    
    const enterpriseFeatures = [
      'multi_branch', 'custom_branding', 'integrations', 'priority_support',
      'advanced_security', 'audit_logs', 'role_management', 'webhooks',
      'white_label', 'custom_domains', 'sso_integration', 'compliance_reports'
    ];

    switch (plan) {
      case 'monthly':
        return [...basicFeatures, ...premiumFeatures.slice(0, 4)];
      case 'yearly':
        return [...basicFeatures, ...premiumFeatures];
      case 'lifetime':
        return [...basicFeatures, ...premiumFeatures, ...enterpriseFeatures];
      default:
        return basicFeatures;
    }
  }

  validateLicense(): LicenseValidationResult {
    if (!this.currentLicense) {
      return { 
        valid: false, 
        error: 'No license found',
        enforcementActions: ['disable_app']
      };
    }

    const license = this.currentLicense;
    const now = new Date();
    const expiryDate = new Date(license.expiryDate);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Hardware fingerprint validation
    if (license.hardwareFingerprint !== this.generateHardwareFingerprint()) {
      license.status = 'suspended';
      this.saveToStorage();
      return { 
        valid: false, 
        error: 'License tied to different hardware. Please contact support.',
        enforcementActions: ['disable_app', 'show_violation_notice']
      };
    }

    // License tampering detection
    if (!this.verifyLicenseIntegrity(license)) {
      license.status = 'suspended';
      this.saveToStorage();
      return {
        valid: false,
        error: 'License file has been tampered with',
        enforcementActions: ['disable_app', 'report_violation']
      };
    }

    // Expiry check
    if (now > expiryDate) {
      if (license.remainingGraceDays > 0) {
        license.status = 'grace_period';
        license.remainingGraceDays--;
        this.saveToStorage();
        return {
          valid: true,
          license,
          gracePeriodActive: true,
          daysRemaining: license.remainingGraceDays,
          requiresRenewal: true,
          enforcementActions: ['show_renewal_notice', 'limit_features']
        };
      } else {
        license.status = 'expired';
        this.saveToStorage();
        return { 
          valid: false, 
          error: 'License expired. Please renew to continue using the software.',
          requiresRenewal: true,
          enforcementActions: ['disable_app', 'show_renewal_page']
        };
      }
    }

    // Renewal reminder (30 days before expiry for paid plans)
    const requiresRenewal = daysRemaining <= 30 && license.plan !== 'lifetime';

    // Update validation info
    license.lastValidation = now.toISOString();
    license.validationCount++;
    this.saveToStorage();

    const enforcementActions: string[] = [];
    if (requiresRenewal) {
      enforcementActions.push('show_renewal_reminder');
    }

    return {
      valid: true,
      license,
      daysRemaining,
      requiresRenewal,
      enforcementActions
    };
  }

  private verifyLicenseIntegrity(license: License): boolean {
    // Verify the encrypted data matches the license key and hardware fingerprint
    try {
      const expectedEncrypted = this.encryptLicenseData(license.licenseKey, license.hardwareFingerprint);
      return license.encryptedData === expectedEncrypted;
    } catch {
      return false;
    }
  }

  enforceCompliance(): boolean {
    const validation = this.validateLicense();
    
    if (!validation.valid && this.enforcementEnabled) {
      this.handleLicenseViolation(validation);
      return false;
    }

    if (validation.enforcementActions) {
      validation.enforcementActions.forEach(action => {
        this.executeEnforcementAction(action, validation);
      });
    }

    return validation.valid;
  }

  private executeEnforcementAction(action: string, validation: LicenseValidationResult) {
    switch (action) {
      case 'disable_app':
        this.disableApplication();
        break;
      case 'show_violation_notice':
        this.showViolationNotice(validation.error || 'License violation detected');
        break;
      case 'show_renewal_notice':
        this.showRenewalNotice(validation.daysRemaining || 0);
        break;
      case 'show_renewal_reminder':
        this.showRenewalReminder(validation.daysRemaining || 0);
        break;
      case 'limit_features':
        this.limitFeatures();
        break;
      case 'report_violation':
        this.reportViolation();
        break;
    }
  }

  private disableApplication() {
    // Create overlay to disable the application
    const overlay = document.createElement('div');
    overlay.id = 'license-enforcement-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: Poppins, sans-serif;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center; max-width: 500px; padding: 40px;">
        <h2 style="font-size: 24px; margin-bottom: 20px;">License Required</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">
          Your license has expired or is invalid. Please contact support or renew your license to continue using PharmaCare POS.
        </p>
        <button onclick="location.reload()" style="
          background: #0057A5;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        ">Retry</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  private showViolationNotice(message: string) {
    console.error('License Violation:', message);
    // In a real implementation, this would show a modal or notification
  }

  private showRenewalNotice(daysRemaining: number) {
    console.warn(`License expires in ${daysRemaining} days. Please renew.`);
  }

  private showRenewalReminder(daysRemaining: number) {
    console.info(`License renewal reminder: ${daysRemaining} days remaining.`);
  }

  private limitFeatures() {
    // Disable premium features during grace period
    document.body.classList.add('license-grace-period');
  }

  private reportViolation() {
    // Log violation for monitoring (in production, this would send to server)
    console.error('License violation reported at:', new Date().toISOString());
  }

  renewLicense(licenseId: string, plan: License['plan'], paymentConfirmation?: string): boolean {
    const license = this.licenses.find(l => l.id === licenseId);
    if (!license) return false;

    const now = new Date();
    let newExpiryDate: Date;
    let pricing: License['pricing'];

    switch (plan) {
      case 'monthly':
        newExpiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        pricing = { amount: 5000, currency: 'PKR', billingCycle: 'monthly' };
        break;
      case 'yearly':
        newExpiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        pricing = { amount: 50000, currency: 'PKR', billingCycle: 'yearly' };
        break;
      case 'lifetime':
        newExpiryDate = new Date(2099, 11, 31);
        pricing = { amount: 200000, currency: 'PKR', billingCycle: 'one-time' };
        break;
    }

    // Update license
    license.plan = plan;
    license.expiryDate = newExpiryDate.toISOString();
    license.status = 'active';
    license.remainingGraceDays = license.gracePeriodDays;
    license.features = this.getFeaturesForPlan(plan);
    license.pricing = pricing;

    // Remove enforcement overlay if present
    const overlay = document.getElementById('license-enforcement-overlay');
    if (overlay) {
      overlay.remove();
    }

    this.saveToStorage();
    return true;
  }

  
  private generateHardwareFingerprint(): string {
    const navigator_info = navigator.userAgent + navigator.platform;
    const screen_info = screen.width + 'x' + screen.height + 'x' + screen.colorDepth;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    return this.hashString(navigator_info + screen_info + timezone + language);
  }

  private generateLicenseKey(branchId: string, hardwareFingerprint: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const combined = branchId + hardwareFingerprint + timestamp + random;
    return this.hashString(combined).substring(0, 24).toUpperCase();
  }

  private encryptLicenseData(licenseKey: string, hardwareFingerprint: string): string {
    const data = JSON.stringify({ 
      licenseKey, 
      hardwareFingerprint, 
      timestamp: Date.now(),
      checksum: this.hashString(licenseKey + hardwareFingerprint)
    });
    return btoa(data);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private handleLicenseViolation(validation: LicenseValidationResult) {
    console.error('License violation:', validation.error);
    
    if (validation.enforcementActions?.includes('disable_app')) {
      this.disableApplication();
    }
  }

  private startPeriodicValidation() {
    // Validate license every hour
    this.validationInterval = window.setInterval(() => {
      this.enforceCompliance();
    }, 60 * 60 * 1000);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage() {
    const stored = localStorage.getItem('pharmacy_licenses');
    if (stored) {
      this.licenses = JSON.parse(stored);
      if (this.licenses.length > 0) {
        this.currentLicense = this.licenses[0];
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem('pharmacy_licenses', JSON.stringify(this.licenses));
  }

  // Public API methods
  hasFeature(feature: string): boolean {
    const validation = this.validateLicense();
    if (!validation.valid || !validation.license) return false;
    return validation.license.features.includes(feature);
  }

  getLicenseInfo(): License | null {
    return this.currentLicense;
  }

  getAllLicenses(): License[] {
    // Only one definition should exist. Returns all licenses.
    return this.licenses;
  }

  createLicenseForBranch(branchId: string, branchName: string, plan: License['plan']): License {
    const license = this.generateLicense(branchId, branchName, plan);
    this.licenses.push(license);
    this.saveToStorage();
    return license;
  }

  revokeLicense(licenseId: string): boolean {
    const license = this.licenses.find(l => l.id === licenseId);
    if (license) {
      license.status = 'suspended';
      this.saveToStorage();
      return true;
    }
    return false;
  }

  exportLicenseReport(): string {
    return JSON.stringify(this.licenses, null, 2);
  }

  getComplianceStatus(): {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const validation = this.validateLicense();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!validation.valid) {
      issues.push(validation.error || 'Unknown license issue');
    }

    if (validation.requiresRenewal) {
      recommendations.push('License renewal recommended');
    }

    if (validation.gracePeriodActive) {
      issues.push('Operating in grace period');
      recommendations.push('Immediate renewal required');
    }

    return {
      isCompliant: validation.valid && !validation.gracePeriodActive,
      issues,
      recommendations
    };
  }
}

export const licenseManager = new LicenseManager();
