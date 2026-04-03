'use client';
import { useStore } from '@/lib/store';
import { useState, useEffect } from 'react';
// Auto-select first item when supplier changes

const STATUS_COLORS: Record<string, string> = { draft: 'badge-info', sent: 'badge-info', confirmed: 'badge-warning', 'in-transit': 'badge-warning', delivered: 'badge-success', cancelled: 'badge-danger' };

export default function Procurement() {
    const { purchaseOrders, suppliers, updatePOStatus, createPO, editPO, addSupplier, updateSupplier, deleteSupplier, currentRole, ingredients } = useStore();
    const [showForm, setShowForm] = useState(false);
    const [suppId, setSuppId] = useState(suppliers[0]?.id || 1);
    
    // Supplier Management States
    const [manageSuppliers, setManageSuppliers] = useState(false);
    const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', email: '', rating: 5, items_supplied: [] as string[] });

    // Edit states
    const [editPoId, setEditPoId] = useState<number | null>(null);
    const [editData, setEditData] = useState({ qty: 0, cost: 0 });

    // Dynamically get items for selected supplier
    const selectedSupplier = suppliers.find(s => s.id === suppId);
    const availableItems: string[] = (selectedSupplier?.items_supplied as string[] | null) || [];

    const [itemName, setItemName] = useState(availableItems[0] || '');
    const [qty, setQty] = useState(10);
    const [cost, setCost] = useState(0);

    // Auto-select first item when supplier changes — use suppId as stable dependency
    useEffect(() => { setItemName(availableItems[0] || '') }, [suppId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreate = async () => {
        if (!itemName || qty <= 0) return;
        try {
            await createPO({ supplier_id: suppId, items: [{ ingredientName: itemName, quantity: qty, unit: 'kg' }], total_cost: cost, notes: '' });
            setShowForm(false); setItemName(''); setQty(10); setCost(0);
        } catch (err: any) {
            alert(`Failed to create PO: ${err.message}`);
        }
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div>
                    <h1 className="section-title">Procurement</h1>
                    <p className="section-subtitle">End-to-end purchase order management — synced to Supabase in real-time</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['admin', 'manager', 'procurement'].includes(currentRole) && (
                        <button className={`btn btn-sm ${manageSuppliers ? 'btn-primary' : 'btn-outline'}`} onClick={() => setManageSuppliers(!manageSuppliers)}>⚙️ Manage Suppliers</button>
                    )}
                    {['admin', 'manager', 'procurement'].includes(currentRole) && (
                        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ New PO</button>
                    )}
                </div>
            </div>

            {manageSuppliers ? (
                <div className="card glass" style={{ marginBottom: 24, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0 }}>{editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                        {editingSupplierId && <button className="btn btn-sm btn-outline" onClick={() => { setEditingSupplierId(null); setNewSupplier({ name: '', contact: '', email: '', rating: 5, items_supplied: [] }); }}>Cancel Edit</button>}
                    </div>
                    
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newSupplier.name) return;
                        try {
                            if (editingSupplierId) {
                                await updateSupplier(editingSupplierId, { ...newSupplier });
                                setEditingSupplierId(null);
                            } else {
                                await addSupplier({ ...newSupplier });
                            }
                            setNewSupplier({ name: '', contact: '', email: '', rating: 5, items_supplied: [] });
                        } catch (err: any) {
                            alert(`Failed to save supplier: ${err.message}`);
                        }
                    }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end', marginBottom: 24 }}>
                        <div>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Supplier Name</label>
                            <input className="input" required value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="e.g. Fresh Farms" />
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Contact Person / Phone</label>
                            <input className="input" required value={newSupplier.contact} onChange={e => setNewSupplier({ ...newSupplier, contact: e.target.value })} placeholder="e.g. Raj (9876543210)" />
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Email</label>
                            <input type="email" className="input" value={newSupplier.email} onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })} placeholder="contact@freshfarms.in" />
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Rating (1-5)</label>
                            <input type="number" step="0.1" min="1" max="5" className="input" value={newSupplier.rating} onChange={e => setNewSupplier({ ...newSupplier, rating: Number(e.target.value) })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Items Supplied (Select Fruits/Ingredients)</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 12, border: '1px solid var(--glass-border)', borderRadius: 8 }}>
                                {ingredients.map(ing => (
                                    <label key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', background: 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: 4 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={newSupplier.items_supplied.includes(ing.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) setNewSupplier({ ...newSupplier, items_supplied: [...newSupplier.items_supplied, ing.name] });
                                                else setNewSupplier({ ...newSupplier, items_supplied: newSupplier.items_supplied.filter(i => i !== ing.name) });
                                            }}
                                        />
                                        {ing.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>{editingSupplierId ? 'Save Changes' : 'Add Supplier'}</button>
                    </form>

                    <h4 style={{ marginBottom: 16 }}>Manage Existing Suppliers</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Items Supplied</th><th>Rating</th><th>Actions</th></tr></thead>
                            <tbody>
                                {suppliers.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                                        <td>{s.contact}</td>
                                        <td>{s.email}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{((s.items_supplied as string[] | null) || []).join(', ')}</td>
                                        <td>{s.rating} ⭐</td>
                                        <td style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-sm btn-outline" onClick={() => {
                                                setEditingSupplierId(s.id);
                                                setNewSupplier({ name: s.name, contact: s.contact, email: s.email, rating: s.rating, items_supplied: s.items_supplied as string[] });
                                            }}>Edit</button>
                                            <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={async () => {
                                                if (confirm(`Delete ${s.name}?`)) {
                                                    try { await deleteSupplier(s.id); } 
                                                    catch(err: any) { alert(`Failed to delete supplier: ${err.message}`); }
                                                }
                                            }}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
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
                            const firstItem = items[0] || { ingredientName: '', quantity: 0, unit: 'kg' };

                            return (
                                <tr key={po.id}>
                                    <td style={{ fontWeight: 700 }}>#{po.id}</td>
                                    <td>{supp?.name || '—'}</td>
                                    {editPoId === po.id ? (
                                        <>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                    <span style={{ fontSize: 12 }}>{firstItem.ingredientName}</span>
                                                    <input className="input" type="number" style={{ width: 60, padding: '2px 4px', fontSize: 12 }} value={editData.qty} onChange={e => setEditData({ ...editData, qty: Number(e.target.value) })} />
                                                    <span style={{ fontSize: 12 }}>{firstItem.unit}</span>
                                                </div>
                                            </td>
                                            <td><input className="input" type="number" style={{ width: 80, padding: '2px 4px', fontSize: 12 }} value={editData.cost} onChange={e => setEditData({ ...editData, cost: Number(e.target.value) })} /></td>
                                            <td><span className={`badge ${STATUS_COLORS[po.status] || ''}`}>{po.status}</span></td>
                                            <td>{po.eta || '—'}</td>
                                            <td style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-sm btn-primary" onClick={async () => {
                                                    try {
                                                        await editPO(po.id, { items: [{ ...firstItem, quantity: editData.qty }], total_cost: editData.cost });
                                                        setEditPoId(null);
                                                    } catch (err: any) {
                                                        alert(`Failed to edit PO: ${err.message}`);
                                                    }
                                                }}>Save</button>
                                                <button className="btn btn-sm btn-outline" onClick={() => setEditPoId(null)}>Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{items.map(i => `${i.ingredientName} (${i.quantity}${i.unit})`).join(', ')}</td>
                                            <td style={{ fontWeight: 700 }}>₹{po.total_cost.toLocaleString('en-IN')}</td>
                                            <td><span className={`badge ${STATUS_COLORS[po.status] || ''}`}>{po.status}</span></td>
                                            <td>{po.eta || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {po.status === 'draft' && (
                                                        <button className="btn btn-sm btn-outline" onClick={() => { setEditPoId(po.id); setEditData({ qty: firstItem.quantity, cost: po.total_cost }); }}>Edit</button>
                                                    )}
                                                    {po.status !== 'delivered' && po.status !== 'cancelled' && (
                                                        <button className="btn btn-sm btn-outline" onClick={async () => {
                                                            try {
                                                                await updatePOStatus(po.id, po.status === 'draft' ? 'sent' : po.status === 'sent' ? 'confirmed' : po.status === 'confirmed' ? 'in-transit' : 'delivered');
                                                            } catch (err: any) {
                                                                alert(`Failed to update PO status: ${err.message}`);
                                                            }
                                                        }}>
                                                            {po.status === 'in-transit' ? '✓ Deliver' : 'Advance →'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </>
                                    )}
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
            </>
            )}
        </div>
    );
}
