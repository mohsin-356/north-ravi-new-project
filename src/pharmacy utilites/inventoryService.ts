import { api } from '@/lib/api';

const INVENTORY_STORAGE_KEY = 'pharmacy_inventory';

// Simple in-memory cache with TTL
type CacheEntry<T> = { ts: number; data: T };
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const cache = new Map<string, CacheEntry<any>>();

export const clearInventoryCache = () => {
  cache.clear();
};

// Sample inventory item data (commented out)
/*
{
  "id": "687f773f0a1a43eccf5b2d26",
  "_id": "687f773f0a1a43eccf5b2d26",
  "medicineId": "686fb47b982c7784540707ba",
  "name": "regix",
  "genericName": "allergy",
  "price": 40,
  "quantity": 5,
  "packQuantity": 10,
  "totalItems": 33,
  "stock": 33,
  "minStock": 10,
  "purchasePrice": 20,
  "salePrice": 40,
  "buyPricePerPack": 200,
  "salePricePerPack": 400,
  "unitBuyPrice": 20,
  "unitSalePrice": 40,
  "profitPerUnit": 20,
  "expiryDate": "2025-09-03T00:00:00.000Z",
  "supplierName": "zian arif ",
  "supplier": {
      "_id": "687f5a3399001639f7bc62e3",
      "name": "zian arif "
  },
  "status": "approved",
  "date": "2025-07-22T11:34:23.882Z"
}
*/

export interface InventoryItem {
  id: string;
  _id?: string;
  name: string;
  genericName: string;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
  manufacturer?: string;
  minStock?: number;
  maxStock?: number;
  purchasePrice?: number;
  salePrice?: number;
  buyPricePerPack?: number;
  salePricePerPack?: number;
  profitPerUnit?: number;
  unitBuyPrice?: number;
  unitSalePrice?: number;
  unit?: string;
  invoiceNumber?: string;
  batchNo?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  supplierName?: string;
  date?: string;
  createdAt?: string;
  medicineId?: string;
  status?: 'pending' | 'approved';
  quantity?: number;
  packs?: number;
  packQuantity?: number;
  totalItems?: number;
  supplier?: { _id?: string; id?: string; name?: string };
  isProtected?: boolean;
  supplierOrders?: any[];
}

// Shared mapper from backend AddStock record to InventoryItem shape
const mapRecordToItem = (rec: any): InventoryItem => {
  const packQty = rec.packQuantity || (rec.totalItems && rec.quantity ? Math.round(Number(rec.totalItems) / Number(rec.quantity)) : 1);
  const unitBuyRaw = rec.unitBuyPrice ?? rec.unitPrice ?? rec.purchasePrice ?? rec.buyPrice;
  const unitBuy = unitBuyRaw !== undefined ? Number(unitBuyRaw) : (
    (rec.unitSalePrice ?? rec.salePrice ?? rec.unitPrice ?? rec.price) !== undefined && rec.profitPerUnit !== undefined
      ? (rec.unitSalePrice ?? rec.salePrice ?? rec.unitPrice ?? rec.price) - rec.profitPerUnit
      : undefined
  );
  const unitSaleRaw = rec.unitSalePrice ?? rec.salePrice ?? rec.unitPrice ?? rec.price;
  const unitSale = unitSaleRaw !== undefined ? Number(unitSaleRaw) : undefined;
  const buyPerPack = rec.buyPricePerPack ?? rec.buyPrice ?? (unitBuy !== undefined ? unitBuy * packQty : undefined);
  const salePerPack = rec.salePricePerPack ?? (unitSale !== undefined ? unitSale * packQty : undefined);
  const unitBuyFinal = unitBuy ?? (buyPerPack !== undefined ? buyPerPack / packQty : undefined);
  const unitSaleFinal = unitSale ?? (salePerPack !== undefined ? salePerPack / packQty : undefined);
  const status = rec.status ?? 'approved';
  const totalUnits = (typeof rec.totalItems === 'number') ? Number(rec.totalItems) : undefined;
  // Stock: trust totalItems for approved records; fall back to packs only for pending
  const stockUnits = (totalUnits !== undefined)
    ? totalUnits
    : (status === 'pending' ? ((Number(rec.quantity || 0)) * (Number(packQty || 1))) : Number(rec.items ?? rec.stock ?? 0));
  return {
    id: rec._id,
    _id: rec._id,
    medicineId: rec.medicine?._id || rec.medicine,
    name: rec.medicine?.name || rec.name || '',
    genericName: rec.medicine?.genericName || rec.genericName || '',
    price: rec.unitSalePrice ?? rec.salePrice ?? rec.unitPrice ?? rec.price ?? 0,
    quantity: rec.quantity ?? 0,
    packQuantity: packQty,
    totalItems: totalUnits,
    stock: Number(stockUnits || 0),
    barcode: rec.medicine?.barcode || rec.barcode,
    category: rec.medicine?.category || rec.category,
    manufacturer: rec.medicine?.manufacturer || rec.manufacturer,
    minStock: rec.minStock,
    purchasePrice: unitBuyFinal,
    salePrice: unitSaleFinal,
    buyPricePerPack: buyPerPack,
    salePricePerPack: salePerPack,
    unitBuyPrice: unitBuyFinal,
    unitSalePrice: unitSaleFinal,
    profitPerUnit: rec.profitPerUnit,
    invoiceNumber: rec.invoiceNumber,
    batchNo: rec.batchNo || rec.batchNumber,
    expiryDate: rec.expiryDate,
    supplierName: rec.supplier?.name,
    supplier: rec.supplier ? { _id: rec.supplier._id, name: rec.supplier.name } : undefined,
    status: rec.status ?? 'approved',
    date: rec.date ?? rec.createdAt ?? (rec._id ? new Date(parseInt(rec._id.toString().substring(0,8),16)*1000).toISOString() : undefined),
    createdAt: rec.createdAt
  };
};

export const getInventory = async (): Promise<InventoryItem[]> => {
  try {
    // Cached full inventory (legacy non-paginated)
    const key = 'full';
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && (now - hit.ts) < CACHE_TTL_MS) {
      return (hit.data as any[]).map(mapRecordToItem);
    }
    const { data: records } = await api.get('/add-stock');
    const items: InventoryItem[] = records.map(mapRecordToItem);
    cache.set(key, { ts: now, data: records });
    return items;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
};

export const getInventoryPaged = async (
  page: number,
  limit: number,
  q?: string,
  opts?: { signal?: AbortSignal }
): Promise<{ items: InventoryItem[]; total: number; page: number; limit: number }> => {
  const params: any = { page, limit };
  if (q && q.trim()) params.q = q.trim();
  const cacheKey = `paged|p=${page}|l=${limit}|q=${params.q || ''}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && (now - hit.ts) < CACHE_TTL_MS) {
    const data = hit.data;
    if (Array.isArray(data)) {
      const items = data.map(mapRecordToItem);
      return { items, total: items.length, page: 1, limit: items.length };
    }
    const rawItems = Array.isArray(data?.items) ? data.items : [];
    const items = rawItems.map(mapRecordToItem);
    const total = typeof data?.total === 'number' ? data.total : items.length;
    return { items, total, page: Number(data?.page) || page, limit: Number(data?.limit) || limit };
  }
  const { data } = await api.get('/add-stock', { params, signal: opts?.signal });
  // Support both paginated and legacy array responses
  if (Array.isArray(data)) {
    const items = data.map(mapRecordToItem);
    cache.set(cacheKey, { ts: now, data });
    return { items, total: items.length, page: 1, limit: items.length };
  }
  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const items = rawItems.map(mapRecordToItem);
  const total = typeof data?.total === 'number' ? data.total : items.length;
  cache.set(cacheKey, { ts: now, data });
  return { items, total, page: Number(data?.page) || page, limit: Number(data?.limit) || limit };
};

export const saveInventory = async (items: InventoryItem[]): Promise<void> => {
  try {
    await api.post('/inventory', items);
  } catch (error) {
    console.error('Error saving inventory:', error);
    throw error;
  }
};

export const searchInventory = async (
  query: string,
  opts?: { signal?: AbortSignal; limit?: number; inStock?: boolean }
): Promise<InventoryItem[]> => {
  try {
    const params: any = { name: query };
    if (typeof opts?.limit === 'number') params.limit = Math.max(1, Math.min(opts.limit, 100));
    if (opts?.inStock) params.inStock = '1';
    const { data } = await api.get(`/inventory/search`, { params, signal: opts?.signal });
    const rawItems = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return rawItems.map(mapRecordToItem);
  } catch (error) {
    console.error('Error searching inventory:', error);
    throw error;
  }
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
  try {
    const { data } = await api.post('/inventory', item);
    return data;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
};

export const updateItemStock = async (itemId: string, quantityChange: number): Promise<InventoryItem> => {
  try {
    const { data } = await api.patch(`/add-stock/${itemId}/quantity`, { change: quantityChange });
    return data;
  } catch (error) {
    console.error('Error updating item stock:', error);
    throw error;
  }
};

// Adjust stock in UNITS (totalItems) for sales/returns
export const updateItemUnits = async (itemId: string, unitChange: number): Promise<InventoryItem> => {
  try {
    const { data } = await api.patch(`/add-stock/${itemId}/items`, { change: unitChange });
    return data;
  } catch (error) {
    console.error('Error updating item units:', error);
    throw error;
  }
};
