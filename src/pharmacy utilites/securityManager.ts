
export interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
  };
  sessionConfig: {
    timeout: number; // minutes
    maxConcurrentSessions: number;
    requireIpValidation: boolean;
  };
  auditConfig: {
    logLevel: 'basic' | 'detailed' | 'verbose';
    retentionDays: number;
    alertOnSuspiciousActivity: boolean;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SecurityAlert {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'data_breach' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userId?: string;
  ipAddress: string;
  timestamp: string;
  acknowledged: boolean;
}

class SecurityManager {
  private auditLogs: AuditLog[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private failedLoginAttempts: Map<string, number> = new Map();
  private blockedIps: Set<string> = new Set();

  private config: SecurityConfig = {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90
    },
    sessionConfig: {
      timeout: 30,
      maxConcurrentSessions: 3,
      requireIpValidation: true
    },
    auditConfig: {
      logLevel: 'detailed',
      retentionDays: 365,
      alertOnSuspiciousActivity: true
    }
  };

  constructor() {
    this.loadFromStorage();
    this.setupPeriodicCleanup();
  }

  // Password Security
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  hashPassword(password: string): string {
    // Simple hash for demo - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Authentication Security
  recordLoginAttempt(identifier: string, success: boolean, ipAddress: string): boolean {
    if (success) {
      this.failedLoginAttempts.delete(identifier);
      this.logAuditEvent('user_login', 'authentication', {
        identifier,
        success: true
      }, ipAddress, 'low');
      return true;
    }

    const attempts = (this.failedLoginAttempts.get(identifier) || 0) + 1;
    this.failedLoginAttempts.set(identifier, attempts);

    this.logAuditEvent('failed_login', 'authentication', {
      identifier,
      attempts,
      success: false
    }, ipAddress, attempts > 3 ? 'high' : 'medium');

    if (attempts >= 5) {
      this.blockedIps.add(ipAddress);
      this.createSecurityAlert('failed_login', 'high', 
        `Multiple failed login attempts from ${ipAddress}`, undefined, ipAddress);
      return false;
    }

    return true;
  }

  isIpBlocked(ipAddress: string): boolean {
    return this.blockedIps.has(ipAddress);
  }

  unblockIp(ipAddress: string): void {
    this.blockedIps.delete(ipAddress);
  }

  // Audit Logging
  logAuditEvent(
    action: string,
    resource: string,
    details: any,
    ipAddress: string = 'unknown',
    riskLevel: AuditLog['riskLevel'] = 'low',
    userId: string = 'system',
    userName: string = 'System'
  ): void {
    const auditLog: AuditLog = {
      id: this.generateId(),
      userId,
      userName,
      action,
      resource,
      details,
      ipAddress,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      success: true,
      riskLevel
    };

    this.auditLogs.push(auditLog);

    // Check for suspicious patterns
    if (this.config.auditConfig.alertOnSuspiciousActivity) {
      this.detectSuspiciousActivity(auditLog);
    }

    this.saveToStorage();
  }

  private detectSuspiciousActivity(log: AuditLog): void {
    const recentLogs = this.getRecentLogs(5); // Last 5 minutes
    
    // Detect rapid successive actions
    const sameActionCount = recentLogs.filter(l => 
      l.action === log.action && l.userId === log.userId
    ).length;

    if (sameActionCount > 10) {
      this.createSecurityAlert('suspicious_activity', 'medium',
        `Rapid successive ${log.action} actions detected`, log.userId, log.ipAddress);
    }

    // Detect access from multiple IPs
    const userIps = new Set(recentLogs
      .filter(l => l.userId === log.userId)
      .map(l => l.ipAddress)
    );

    if (userIps.size > 3) {
      this.createSecurityAlert('suspicious_activity', 'high',
        `User accessing from multiple IP addresses`, log.userId, log.ipAddress);
    }
  }

  private getRecentLogs(minutes: number): AuditLog[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.auditLogs.filter(log => new Date(log.timestamp) > cutoff);
  }

  // Security Alerts
  private createSecurityAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    message: string,
    userId?: string,
    ipAddress: string = 'unknown'
  ): void {
    const alert: SecurityAlert = {
      id: this.generateId(),
      type,
      severity,
      message,
      userId,
      ipAddress,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.securityAlerts.push(alert);
    this.saveToStorage();
  }

  getSecurityAlerts(unacknowledgedOnly: boolean = false): SecurityAlert[] {
    return unacknowledgedOnly 
      ? this.securityAlerts.filter(a => !a.acknowledged)
      : this.securityAlerts;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.securityAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Data Encryption (simplified for demo)
  encryptData(data: string, key: string = 'default'): string {
    // Simple XOR encryption for demo - use proper encryption in production
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(encrypted);
  }

  decryptData(encryptedData: string, key: string = 'default'): string {
    try {
      const encrypted = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return decrypted;
    } catch {
      return '';
    }
  }

  // Backup & Recovery
  createSecureBackup(): string {
    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        medicines: localStorage.getItem('medicines') || '[]',
        customers: localStorage.getItem('customers') || '[]',
        sales: localStorage.getItem('sales') || '[]',
        settings: localStorage.getItem('pharmacy_settings') || '{}'
      },
      checksum: this.calculateChecksum()
    };

    return this.encryptData(JSON.stringify(backupData));
  }

  restoreFromBackup(encryptedBackup: string): boolean {
    try {
      const backupData = JSON.parse(this.decryptData(encryptedBackup));
      
      // Verify integrity
      if (!this.verifyChecksum(backupData.checksum)) {
        throw new Error('Backup integrity check failed');
      }

      // Restore data
      Object.entries(backupData.data).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });

      this.logAuditEvent('backup_restore', 'system', 
        { timestamp: backupData.timestamp }, 'system', 'medium');

      return true;
    } catch (error) {
      this.logAuditEvent('backup_restore_failed', 'system', 
        { error: error instanceof Error ? error.message : 'Unknown error' }, 'system', 'high');
      return false;
    }
  }

  private calculateChecksum(): string {
    const data = localStorage.getItem('medicines') + localStorage.getItem('customers');
    return this.hashPassword(data);
  }

  private verifyChecksum(checksum: string): boolean {
    return this.calculateChecksum() === checksum;
  }

  // Cleanup and Maintenance
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldLogs();
      this.resetFailedAttempts();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private cleanupOldLogs(): void {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.auditConfig.retentionDays);

    this.auditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) > retentionDate
    );

    this.saveToStorage();
  }

  private resetFailedAttempts(): void {
    // Reset failed attempts after 24 hours
    this.failedLoginAttempts.clear();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage(): void {
    const auditLogs = localStorage.getItem('pharmacy_audit_logs');
    const securityAlerts = localStorage.getItem('pharmacy_security_alerts');

    if (auditLogs) this.auditLogs = JSON.parse(auditLogs);
    if (securityAlerts) this.securityAlerts = JSON.parse(securityAlerts);
  }

  private saveToStorage(): void {
    localStorage.setItem('pharmacy_audit_logs', JSON.stringify(this.auditLogs));
    localStorage.setItem('pharmacy_security_alerts', JSON.stringify(this.securityAlerts));
  }

  // Public API
  getAuditLogs(limit?: number): AuditLog[] {
    const logs = [...this.auditLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return limit ? logs.slice(0, limit) : logs;
  }

  exportAuditLogs(): string {
    return JSON.stringify(this.auditLogs, null, 2);
  }
}

export const securityManager = new SecurityManager();
