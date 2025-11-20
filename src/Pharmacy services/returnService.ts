import { v4 as uuid } from 'uuid';

export type ReturnReason = 
  | 'expired'
  | 'damaged'
  | 'wrong-item'
  | 'customer-request'
  | 'overstock'
  | 'recall'
  | 'other';

type ReturnRecord = {
  id: string;
  date: Date;
  type: 'customer' | 'supplier';
  medicineId: string;
  medicineName: string;
  quantity: number;
  reason: string;
  reasonCategory: ReturnReason;
  processedBy: string;
};

const STORAGE_KEY = 'pharmacy-return-records';

class ReturnService {
  private records: ReturnRecord[] = [];

  constructor() {
    this.loadRecords();
  }

  private loadRecords() {
    const saved = localStorage.getItem(STORAGE_KEY);
    this.records = saved ? JSON.parse(saved) : [];
  }

  private saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
  }

  async addReturn(record: Omit<ReturnRecord, 'id' | 'date'>) {
    const newRecord = {
      ...record,
      id: uuid(),
      date: new Date(),
    };
    
    this.records.unshift(newRecord);
    this.saveRecords();
    return newRecord;
  }

  async getRecentReturns(limit = 50) {
    return this.records.slice(0, limit);
  }
}

export const returnService = new ReturnService();
