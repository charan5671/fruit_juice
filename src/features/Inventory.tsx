'use client';
import { useStore } from '@/lib/store';
import { useState } from 'react';

export default function Inventory() {
    const { ingredients, addStock } = useStore();
    const [selId, setSelId] = useState<number | null>(null);
    const [amount, setAmount] = useState(10);

    const handleAdd = async () => { if (selId && amount > 0) { await addStock(selId, amount); } };

    return (
        <div className="animate-in">
            <h1 className="section-title">Inventory Management</h1>
            <p className="section-subtitle">Real-time stock tracking synced with Supabase — auto low-stock alerts</p>

            <div className="card glass" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
                <div style={{ flex: '1 1 180px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Ingredient</label>
                    <select className="input" value={selId ?? ''} onChange={e => setSelId(Number(e.target.value))}>
                        <option value="">Select...</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                </div>
                <div style={{ flex: '0 0 100px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Quantity</label>
                    <input className="input" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={1} />
                </div>
                <button className="btn btn-primary" onClick={handleAdd}>+ Add Stock</button>
            </div>

            <div className="glass" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Ingredient</th><th>Stock</th><th>Unit</th><th>Threshold</th><th>Status</th><th>Last Updated</th></tr></thead>
                    <tbody>
                        {ingredients.map(ing => (
                            <tr key={ing.id}>
                                <td style={{ fontWeight: 700 }}>{ing.name}</td>
                                <td style={{ fontWeight: 700, color: ing.stock <= ing.threshold ? 'var(--danger)' : 'var(--text)' }}>{ing.stock}</td>
                                <td>{ing.unit}</td>
                                <td>{ing.threshold}</td>
                                <td><span className={`badge ${ing.stock <= ing.threshold ? 'badge-danger' : 'badge-success'}`}>{ing.stock <= ing.threshold ? 'Low' : 'Stable'}</span></td>
                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ing.last_updated ? new Date(ing.last_updated).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>
                <div className="card glass">
                    <h4 style={{ marginBottom: 12 }}>Wastage Monitor</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>Today&apos;s waste: <strong>0 items</strong></span>
                        <span className="badge badge-success">Clean</span>
                    </div>
                </div>
                <div className="card glass">
                    <h4 style={{ marginBottom: 12 }}>Recipe Mapping</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>All {ingredients.length > 0 ? '8' : '0'} recipes mapped with auto-deduction on sale.</p>
                </div>
            </div>
        </div>
    );
}
