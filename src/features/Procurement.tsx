'use client';
import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';
// Auto-select first item when supplier changes

const STATUS_COLORS: Record<string, string> = { draft: 'badge-info', sent: 'badge-info', confirmed: 'badge-warning', 'in-transit': 'badge-warning', delivered: 'badge-success', cancelled: 'badge-danger' };

export default function Procurement() {
    const { purchaseOrders, suppliers, updatePOStatus, createPO } = useStore();
    const [showForm, setShowForm] = useState(false);
    const [suppId, setSuppId] = useState(suppliers[0]?.id || 1);

    // Dynamically get items for selected supplier
    const selectedSupplier = suppliers.find(s => s.id === suppId);
    const availableItems = (selectedSupplier?.items_supplied as string[]) || [];

    const [itemName, setItemName] = useState(availableItems[0] || '');
    const [qty, setQty] = useState(10);
    const [cost, setCost] = useState(0);

    // Auto-select first item when supplier changes
    useEffect(() => { setItemName(availableItems[0] || '') }, [suppId, availableItems[0]]);

    const handleCreate = async () => {
        if (!itemName || qty <= 0) return;
        await createPO({ supplier_id: suppId, items: [{ ingredientName: itemName, quantity: qty, unit: 'kg' }], total_cost: cost, notes: '' });
        setShowForm(false); setItemName(''); setQty(10); setCost(0);
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div>
                    <h1 className="section-title">Procurement</h1>
                    <p className="section-subtitle">End-to-end purchase order management — synced to Supabase in real-time</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ New PO</button>
            </div>

            {showForm && (
                <div className="card glass" style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Supplier</label>
                        <select className="input" value={suppId} onChange={e => setSuppId(Number(e.target.value))}>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Item</label>
                        <select className="input" value={itemName} onChange={e => setItemName(e.target.value)}>
                            {availableItems.map(item => <option key={item} value={item}>{item}</option>)}
                            {availableItems.length === 0 && <option value="">No items available</option>}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Qty</label>
                        <input className="input" type="number" value={qty} onChange={e => setQty(Number(e.target.value))} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cost (₹)</label>
                        <input className="input" type="number" value={cost} onChange={e => setCost(Number(e.target.value))} />
                    </div>
                    <button className="btn btn-primary" onClick={handleCreate}>Create PO</button>
                </div>
            )}

            <div className="glass" style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table className="data-table">
                    <thead><tr><th>PO #</th><th>Supplier</th><th>Items</th><th>Cost</th><th>Status</th><th>ETA</th><th>Actions</th></tr></thead>
                    <tbody>
                        {purchaseOrders.map(po => {
                            const supp = suppliers.find(s => s.id === po.supplier_id);
                            const items = po.items as { ingredientName: string; quantity: number; unit: string }[];
                            return (
                                <tr key={po.id}>
                                    <td style={{ fontWeight: 700 }}>#{po.id}</td>
                                    <td>{supp?.name || '—'}</td>
                                    <td>{items.map(i => `${i.ingredientName} (${i.quantity}${i.unit})`).join(', ')}</td>
                                    <td style={{ fontWeight: 700 }}>₹{po.total_cost.toLocaleString('en-IN')}</td>
                                    <td><span className={`badge ${STATUS_COLORS[po.status] || ''}`}>{po.status}</span></td>
                                    <td>{po.eta || '—'}</td>
                                    <td>
                                        {po.status !== 'delivered' && po.status !== 'cancelled' && (
                                            <button className="btn btn-sm btn-outline" onClick={() => updatePOStatus(po.id, po.status === 'draft' ? 'sent' : po.status === 'sent' ? 'confirmed' : po.status === 'confirmed' ? 'in-transit' : 'delivered')}>
                                                {po.status === 'in-transit' ? '✓ Deliver' : 'Advance →'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <h3 style={{ marginBottom: 12 }}>Supplier Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
                {suppliers.map(s => (
                    <div key={s.id} className="card glass">
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{s.contact} · {s.email}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(s.items_supplied as string[]).map(item => <span key={item} className="badge badge-info" style={{ fontSize: 10 }}>{item}</span>)}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12 }}>Rating: <strong>{'⭐'.repeat(Math.floor(s.rating))}</strong> {s.rating}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
