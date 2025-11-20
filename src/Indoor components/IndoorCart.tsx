import React from 'react';
import { useCart } from '../Indoor contexts/CartContext';
import { indoorApi } from '@/Indoor lib/api';

const IndoorCart: React.FC = () => {
  const { items, updateQty, removeItem, clear, subtotal } = useCart();
  const [customerName, setCustomerName] = React.useState('Walk-in');
  const [paymentMethod] = React.useState<'cash'>('cash');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const checkout = async () => {
    setMsg(null); setErr(null);
    if (items.length === 0) return;
    try {
      setSaving(true);
      const payload = {
        items: items.map(i => ({ medicineId: i.id, quantity: i.quantity, price: i.price })),
        totalAmount: subtotal,
        paymentMethod,
        customerName,
      };
      const res = await indoorApi.post('/sales', payload);
      setMsg('Sale completed');
      clear();
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Sale failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="text-sm block mb-1">Customer</label>
          <input className="border rounded px-3 py-2 w-full" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm block mb-1">Payment</label>
          <div className="border rounded px-3 py-2 bg-gray-50">Cash</div>
        </div>
        <div className="text-right md:ml-auto">
          <div className="text-sm">Total</div>
          <div className="text-xl font-semibold">PKR {subtotal.toFixed(2)}</div>
        </div>
        <button className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50" onClick={checkout} disabled={items.length===0 || saving}>{saving ? 'Processing…' : 'Process Payment'}</button>
      </div>

      {msg && <div className="text-sm text-green-700">{msg}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-auto bg-white border rounded-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left">Item</th>
              <th className="px-2 py-1 text-right">Price</th>
              <th className="px-2 py-1 text-right">Qty</th>
              <th className="px-2 py-1 text-right">Line Total</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-2 py-1">{i.name}</td>
                <td className="px-2 py-1 text-right">{i.price.toFixed(2)}</td>
                <td className="px-2 py-1 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button className="px-2 py-1 border rounded" onClick={()=>updateQty(i.id, Math.max(1, i.quantity-1))}>-</button>
                    <div className="px-2">{i.quantity}</div>
                    <button className="px-2 py-1 border rounded" onClick={()=>updateQty(i.id, i.quantity+1)}>+</button>
                  </div>
                </td>
                <td className="px-2 py-1 text-right">{(i.price * i.quantity).toFixed(2)}</td>
                <td className="px-2 py-1"><button className="px-2 py-1 border rounded text-red-600" onClick={()=>removeItem(i.id)}>Remove</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={5}>Cart is empty</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IndoorCart;
