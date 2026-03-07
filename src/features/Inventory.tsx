'use client';
import { useStore } from '@/lib/store';
import { useState } from 'react';

export default function Inventory() {
    const { ingredients, recipes, addStock, addIngredient, updateIngredient, deleteIngredient } = useStore();
    const [selId, setSelId] = useState<number | null>(null);
    const [amount, setAmount] = useState(10);
    const [view, setView] = useState<'stock' | 'manage'>('stock');

    // Manage State
    const [newIng, setNewIng] = useState({ name: '', unit: 'kg', threshold: 5 });
    const [editIng, setEditIng] = useState<number | null>(null);
    const [editData, setEditData] = useState({ name: '', unit: '', threshold: 0 });

    const handleAdd = async () => { if (selId && amount > 0) { await addStock(selId, amount); } };
    const handleAddNew = async () => {
        if (!newIng.name) return;
        await addIngredient({ name: newIng.name, stock: 0, unit: newIng.unit, threshold: newIng.threshold, outlet_id: 1 });
        setNewIng({ name: '', unit: 'kg', threshold: 5 });
        alert('New ingredient added!');
    };

    // Dynamic metrics
    const lowStockCount = ingredients.filter(i => i.stock <= i.threshold).length;
    const mappedRecipesCount = recipes.filter(r => r.ingredients.length > 0).length;

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h1 className="section-title">Inventory Management</h1>
                    <p className="section-subtitle">Real-time stock tracking synced with Supabase — auto low-stock alerts</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={`btn btn-sm ${view === 'stock' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('stock')}>📦 Update Stock</button>
                    {['admin', 'manager', 'procurement'].includes(useStore.getState().currentRole) && (
                        <button className={`btn btn-sm ${view === 'manage' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('manage')}>⚙️ Manage Items</button>
                    )}
                </div>
            </div>

            {view === 'manage' && (
                <div className="card glass" style={{ marginBottom: 20, padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Register New Inventory Item</h3>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ingredient Name</label>
                            <input className="input" placeholder="e.g. Fresh Strawberries" value={newIng.name} onChange={e => setNewIng({ ...newIng, name: e.target.value })} />
                        </div>
                        <div style={{ flex: '0 0 100px' }}>
                            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Unit</label>
                            <select className="input" value={newIng.unit} onChange={e => setNewIng({ ...newIng, unit: e.target.value })}>
                                <option value="kg">kg</option>
                                <option value="L">L</option>
                                <option value="units">units</option>
                                <option value="boxes">boxes</option>
                            </select>
                        </div>
                        <div style={{ flex: '0 0 100px' }}>
                            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Threshold</label>
                            <input className="input" type="number" value={newIng.threshold} onChange={e => setNewIng({ ...newIng, threshold: Number(e.target.value) })} min={0} />
                        </div>
                        <button className="btn btn-primary" onClick={handleAddNew}>+ Create Item</button>
                    </div>
                </div>
            )}

            {view === 'stock' && (

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

            )}

            <div className="glass" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Ingredient</th><th>Stock</th><th>Unit</th><th>Threshold</th><th>Status</th><th>Last Updated</th>{view === 'manage' && <th>Actions</th>}</tr></thead>
                    <tbody>
                        {ingredients.map(ing => (
                            <tr key={ing.id}>
                                {editIng === ing.id ? (
                                    <>
                                        <td><input className="input" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={{ padding: '4px 8px', fontSize: 12 }} /></td>
                                        <td>{ing.stock}</td>
                                        <td><input className="input" value={editData.unit} onChange={e => setEditData({ ...editData, unit: e.target.value })} style={{ padding: '4px 8px', fontSize: 12, width: 60 }} /></td>
                                        <td><input className="input" type="number" value={editData.threshold} onChange={e => setEditData({ ...editData, threshold: Number(e.target.value) })} style={{ padding: '4px 8px', fontSize: 12, width: 60 }} /></td>
                                        <td>—</td>
                                        <td>—</td>
                                        <td style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-sm btn-primary" onClick={async () => { await updateIngredient(ing.id, editData); setEditIng(null); }}>Save</button>
                                            <button className="btn btn-sm btn-outline" onClick={() => setEditIng(null)}>Cancel</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={{ fontWeight: 700 }}>{ing.name}</td>
                                        <td style={{ fontWeight: 700, color: ing.stock <= ing.threshold ? 'var(--danger)' : 'var(--text)' }}>{ing.stock}</td>
                                        <td>{ing.unit}</td>
                                        <td>{ing.threshold}</td>
                                        <td><span className={`badge ${ing.stock <= ing.threshold ? 'badge-danger' : 'badge-success'}`}>{ing.stock <= ing.threshold ? 'Low' : 'Stable'}</span></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ing.last_updated ? new Date(ing.last_updated).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                                        {view === 'manage' && (
                                            <td style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-sm btn-outline" onClick={() => { setEditIng(ing.id); setEditData({ name: ing.name, unit: ing.unit, threshold: ing.threshold }); }}>Edit</button>
                                                <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={async () => { if (confirm(`Delete ${ing.name}? This might break recipes.`)) await deleteIngredient(ing.id); }}>Del</button>
                                            </td>
                                        )}
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 20 }}>
                <div className="card glass">
                    <h4 style={{ marginBottom: 12 }}>System Alerts</h4>
                    {lowStockCount > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: 'rgba(211,47,47,0.1)', padding: '12px', borderRadius: 8 }}>
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Action Required</span>
                            <span className="badge badge-danger">{lowStockCount} Items Low</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: 'rgba(56,142,60,0.1)', padding: '12px', borderRadius: 8 }}>
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>All Clear</span>
                            <span className="badge badge-success">Stock Optimal</span>
                        </div>
                    )}
                </div>
                <div className="card glass">
                    <h4 style={{ marginBottom: 12 }}>Recipe Mapping Engine</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <strong>{mappedRecipesCount} / {recipes.length}</strong> active recipes are fully mapped and will automate inventory deduction upon POS checkout.
                    </p>
                </div>
            </div>
        </div>
    );
}
