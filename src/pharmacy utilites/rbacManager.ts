
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch?: string;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface UserRole {
  id: string;
  name: 'Admin' | 'Pharmacist' | 'Cashier' | 'Manager';
  permissions: Permission[];
  description: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  description: string;
}

export interface Session {
  id: string;
  userId: string;
  branchId?: string;
  startTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

class RBACManager {
  private sessions: Session[] = [];
  private users: User[] = [];
  private roles: UserRole[] = [];

  constructor() {
    this.initializeDefaultRoles();
    this.loadFromStorage();
  }

  private initializeDefaultRoles() {
    this.roles = [
      {
        id: 'admin',
        name: 'Admin',
        description: 'Full system access',
        permissions: this.getAllPermissions()
      },
      {
        id: 'pharmacist',
        name: 'Pharmacist',
        description: 'Medicine management and sales',
        permissions: this.getPharmacistPermissions()
      },
      {
        id: 'cashier',
        name: 'Cashier',
        description: 'Sales and customer management',
        permissions: this.getCashierPermissions()
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Branch management and reports',
        permissions: this.getManagerPermissions()
      }
    ];
  }

  private getAllPermissions(): Permission[] {
    return [
      { id: 'medicines_create', name: 'Add Medicines', resource: 'medicines', action: 'create', description: 'Add new medicines to inventory' },
      { id: 'medicines_read', name: 'View Medicines', resource: 'medicines', action: 'read', description: 'View medicine information' },
      { id: 'medicines_update', name: 'Update Medicines', resource: 'medicines', action: 'update', description: 'Modify medicine details' },
      { id: 'medicines_delete', name: 'Delete Medicines', resource: 'medicines', action: 'delete', description: 'Remove medicines from system' },
      { id: 'sales_create', name: 'Process Sales', resource: 'sales', action: 'create', description: 'Process customer transactions' },
      { id: 'sales_read', name: 'View Sales', resource: 'sales', action: 'read', description: 'View sales history' },
      { id: 'customers_manage', name: 'Manage Customers', resource: 'customers', action: 'manage', description: 'Full customer management' },
      { id: 'reports_read', name: 'View Reports', resource: 'reports', action: 'read', description: 'Access to reports' },
      { id: 'settings_manage', name: 'Manage Settings', resource: 'settings', action: 'manage', description: 'System configuration' },
      { id: 'users_manage', name: 'Manage Users', resource: 'users', action: 'manage', description: 'User and role management' },
      { id: 'branches_manage', name: 'Manage Branches', resource: 'branches', action: 'manage', description: 'Branch management' },
      { id: 'inventory_manage', name: 'Manage Inventory', resource: 'inventory', action: 'manage', description: 'Inventory control' }
    ];
  }

  private getPharmacistPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      ['medicines', 'sales', 'customers', 'inventory'].includes(p.resource) &&
      p.action !== 'delete'
    );
  }

  private getCashierPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      ['sales', 'customers'].includes(p.resource) ||
      (p.resource === 'medicines' && p.action === 'read')
    );
  }

  private getManagerPermissions(): Permission[] {
    return this.getAllPermissions().filter(p => 
      p.action !== 'delete' || p.resource === 'reports'
    );
  }

  hasPermission(userId: string, resource: string, action: string): boolean {
    const user = this.users.find(u => u.id === userId);
    if (!user || !user.isActive) return false;

    return user.permissions.some(p => 
      p.resource === resource && 
      (p.action === action || p.action === 'manage')
    );
  }

  createSession(user: User, ipAddress: string, userAgent: string): Session {
    const session: Session = {
      id: this.generateId(),
      userId: user.id,
      branchId: user.branch,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress,
      userAgent,
      isActive: true
    };

    this.sessions.push(session);
    this.saveToStorage();
    return session;
  }

  validateSession(sessionId: string): boolean {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session || !session.isActive) return false;

    // Check if session expired (24 hours)
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (hoursSinceActivity > 24) {
      session.isActive = false;
      this.saveToStorage();
      return false;
    }

    // Update last activity
    session.lastActivity = now.toISOString();
    this.saveToStorage();
    return true;
  }

  getActiveSessionsCount(): number {
    return this.sessions.filter(s => s.isActive).length;
  }

  terminateSession(sessionId: string): boolean {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.isActive = false;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    this.users.push(user);
    this.saveToStorage();
    return user;
  }

  getUsers(): User[] {
    return this.users;
  }

  getRoles(): UserRole[] {
    return this.roles;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadFromStorage() {
    const storedUsers = localStorage.getItem('pharmacy_users');
    const storedSessions = localStorage.getItem('pharmacy_sessions');
    
    if (storedUsers) {
      this.users = JSON.parse(storedUsers);
    }
    
    if (storedSessions) {
      this.sessions = JSON.parse(storedSessions);
    }
  }

  private saveToStorage() {
    localStorage.setItem('pharmacy_users', JSON.stringify(this.users));
    localStorage.setItem('pharmacy_sessions', JSON.stringify(this.sessions));
  }
}

export const rbacManager = new RBACManager();
