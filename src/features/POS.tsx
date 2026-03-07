'use client';
import { useStore, type Order } from '@/lib/store';
import { useState, useRef } from 'react';
import styles from './POS.module.css';

export default function POS() {
    const { recipes, completeSale, orders, currentName } = useStore();
    const [cart, setCart] = useState<{ recipeId: number; name: string; price: number; quantity: number; icon: string; ingredients: { ingredientId: number; amount: number }[] }[]>([]);
    const [payment, setPayment] = useState<'cash' | 'card' | 'upi'>('cash');
    const [filter, setFilter] = useState('All');
    const [view, setView] = useState<'pos' | 'history' | 'manage'>('pos');
    const [receipt, setReceipt] = useState<Order | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    // Manage Menu States
    const { addRecipe, ingredients } = useStore();
    const [newRecipe, setNewRecipe] = useState({ name: '', price: 100, category: 'Fresh Juices', icon: '🍹', ingId: null as number | null, ingAmount: 1 });

    const addToCart = (recipe: typeof recipes[0]) => {
        setCart(prev => {
            const existing = prev.find(i => i.recipeId === recipe.id);
            if (existing) return prev.map(i => i.recipeId === recipe.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { recipeId: recipe.id, name: recipe.name, price: recipe.price, quantity: 1, icon: recipe.icon, ingredients: recipe.ingredients }];
        });
    };

    const removeFromCart = (recipeId: number) => {
        setCart(prev => prev.map(i => i.recipeId === recipeId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
    };

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const categories = ['All', ...Array.from(new Set(recipes.map(r => r.category)))];
    const filtered = filter === 'All' ? recipes : recipes.filter(r => r.category === filter);

    const handleSale = async () => {
        if (cart.length === 0) return;
        try {
            const newOrder = await completeSale(cart, payment);
            setCart([]);
            setReceipt(newOrder);

            // Automatic printing: Give a tiny delay for the UI to transition then open print
            setTimeout(() => {
                printReceipt();
            }, 800);
        } catch (err) {
            console.error('Sale failed:', err);
            alert('Transaction failed. Please try again.');
        }
    };

    const printReceipt = () => {
        if (!receiptRef.current) return;
        const win = window.open('', '_blank', 'width=400,height=800');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Receipt #${receipt?.id}</title><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Inter', system-ui, -apple-system, sans-serif; width:300px; margin:0 auto; padding:30px 15px; font-size:12px; color:#111; line-height: 1.4; }
      .center { text-align:center; } .bold { font-weight:800; } .mt { margin-top:12px; } .mb { margin-bottom:12px; }
      .line { border-top:1px dashed #ddd; margin:12px 0; }
      .row { display:flex; justify-content:space-between; padding:3px 0; }
      .brand { font-size:24px; letter-spacing:-1px; margin-bottom:4px; }
      .qr-placeholder { width:100px; height:100px; border:1px solid #ddd; margin:15px auto; display:flex; align-items:center; justifyContent:center; background:#f9f9f9; font-size:8px; color:#999; }
      h2 { font-size:20px; } h3 { font-size:14px; }
      @media print { body { width: 100%; padding: 0; } .no-print { display: none; } }
    </style></head><body>${receiptRef.current.innerHTML}<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script></body></html>`);
        win.document.close();
    };

    // Receipt Modal
    if (receipt) {
        const items = receipt.items as { name: string; price: number; quantity: number }[];
        const gst = Math.round(receipt.total * 0.05);
        return (
            <div className="animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <button className="btn btn-outline" onClick={() => setReceipt(null)}>← Back to POS</button>
                    <button className="btn btn-primary" onClick={printReceipt}>🖨️ Print Receipt</button>
                </div>
                <div className="card glass" style={{ maxWidth: 420, margin: '0 auto', padding: '40px 32px', border: '1px solid var(--glass-border)' }}>
                    <div ref={receiptRef}>
                        <div className="center mb">
                            <div className="brand bold">🍹 FreshJuice</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Enterprise POS Terminal</div>
                            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>80 Feet Rd, Koramangala, Bangalore</div>
                            <div style={{ fontSize: 10, color: '#888' }}>GSTIN: 29AABCF1234D1ZF</div>
                        </div>
                        <div className="line" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11 }}>
                            <div className="row"><span>Order ID</span><span className="bold">#{receipt.id}</span></div>
                            <div className="row"><span>Method</span><span className="bold" style={{ textTransform: 'uppercase' }}>{receipt.payment_method}</span></div>
                            <div className="row"><span>Date</span><span>{new Date(receipt.created_at).toLocaleDateString('en-IN')}</span></div>
                            <div className="row"><span>Time</span><span>{new Date(receipt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
                        </div>
                        <div className="line" />
                        <div className="bold mb" style={{ fontSize: 12, letterSpacing: 1 }}>ITEMS ORDERED</div>
                        {items.map((item, i) => (
                            <div key={i} className="row" style={{ padding: '4px 0' }}>
                                <div>
                                    <div className="bold">{item.name}</div>
                                    <div style={{ fontSize: 10, color: '#666' }}>₹{item.price} x {item.quantity}</div>
                                </div>
                                <span className="bold">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                        <div className="line" />
                        <div className="row"><span>Subtotal</span><span>₹{receipt.total}</span></div>
                        <div className="row"><span>GST (5%)</span><span>₹{gst}</span></div>
                        <div className="row bold" style={{ fontSize: 18, marginTop: 8, borderTop: '2px solid #000', paddingTop: 8 }}>
                            <span>TOTAL</span>
                            <span>₹{receipt.total + gst}</span>
                        </div>
                        <div className="line" />
                        <div className="center mt" style={{ fontSize: 11, lineHeight: 1.6 }}>
                            <div className="bold" style={{ fontSize: 13, marginBottom: 4 }}>Thank you for visiting! ✨</div>
                            <div style={{ color: '#666' }}>Scan to provide feedback & win coupons</div>
                            <div className="qr-placeholder">
                                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 10H30V30H10V10ZM14 14V26H26V14H14Z" fill="#333" />
                                    <path d="M50 10H70V30H50V10ZM54 14V26H66V14H54Z" fill="#333" />
                                    <path d="M10 50H30V70H10V50ZM14 54V66H26V54H14Z" fill="#333" />
                                    <rect x="50" y="50" width="8" height="8" fill="#333" />
                                    <rect x="62" y="50" width="8" height="8" fill="#333" />
                                    <rect x="50" y="62" width="8" height="8" fill="#333" />
                                    <rect x="62" y="62" width="8" height="8" fill="#333" />
                                </svg>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 9, color: '#888' }}>Powered by FreshJuice Enterprise</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h1 className="section-title">Point of Sale</h1>
                    <p className="section-subtitle">Touch-optimized terminal with real-time inventory sync</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={`btn btn-sm ${view === 'pos' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('pos')}>🧾 POS</button>
                    <button className={`btn btn-sm ${view === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('history')}>📋 History</button>
                    {['admin', 'manager', 'staff'].includes(useStore.getState().currentRole) && (
                        <button className={`btn btn-sm ${view === 'manage' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('manage')}>⚙️ Manage Menu</button>
                    )}
                </div>
            </div>

            {view === 'manage' ? (
                <div className="card glass" style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Add New Menu Item</h3>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newRecipe.name || newRecipe.price <= 0 || !newRecipe.ingId) return alert('Please fill all required fields');

                        await addRecipe({
                            name: newRecipe.name, price: newRecipe.price, icon: newRecipe.icon, category: newRecipe.category,
                            ingredients: [{ ingredientId: newRecipe.ingId, amount: newRecipe.ingAmount }]
                        });
                        alert('Recipe Added Successfully! It is now live across all POS terminals.');
                        setNewRecipe({ name: '', price: 100, category: 'Fresh Juices', icon: '🍹', ingId: null, ingAmount: 1 });
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Item Name</label>
                                <input className="input" required value={newRecipe.name} onChange={e => setNewRecipe({ ...newRecipe, name: e.target.value })} placeholder="e.g. Mango Magic" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Price (₹)</label>
                                <input className="input" type="number" required value={newRecipe.price} onChange={e => setNewRecipe({ ...newRecipe, price: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Category</label>
                                <input className="input" required value={newRecipe.category} onChange={e => setNewRecipe({ ...newRecipe, category: e.target.value })} list="categories-list" />
                                <datalist id="categories-list">
                                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Display Icon (Emoji)</label>
                                <input className="input" required value={newRecipe.icon} onChange={e => setNewRecipe({ ...newRecipe, icon: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ padding: 16, border: '1px solid var(--glass-border)', borderRadius: 8, marginBottom: 20 }}>
                            <h4 style={{ fontSize: 13, marginBottom: 12 }}>Link Main Ingredient (Required for auto-deduction)</h4>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <select className="input" style={{ flex: 1 }} required value={newRecipe.ingId || ''} onChange={e => setNewRecipe({ ...newRecipe, ingId: Number(e.target.value) })}>
                                    <option value="">Select ingredient...</option>
                                    {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                                </select>
                                <input className="input" type="number" required style={{ width: 100 }} placeholder="Qty" value={newRecipe.ingAmount} onChange={e => setNewRecipe({ ...newRecipe, ingAmount: Number(e.target.value) })} step="0.1" />
                            </div>
                        </div>

                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Create & Publish Recipe</button>
                    </form>
                </div>
            ) : view === 'history' ? (
                <div className="glass" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead><tr><th>ID</th><th>Items</th><th>Total</th><th>Payment</th><th>Time</th><th>Receipt</th></tr></thead>
                        <tbody>
                            {orders.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>No transactions yet</td></tr>}
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td style={{ fontWeight: 700 }}>#{o.id}</td>
                                    <td>{(o.items as { name: string }[]).map(i => i.name).join(', ')}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{o.total}</td>
                                    <td><span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{o.payment_method}</span></td>
                                    <td style={{ fontSize: 12 }}>{new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td><button className="btn btn-sm btn-outline" onClick={() => setReceipt(o)}>🧾 View</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.posLayout}>
                    <div className={styles.products}>
                        <div className={styles.filters}>
                            {categories.map(c => (
                                <button key={c} className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(c)}>{c}</button>
                            ))}
                        </div>
                        <div className={styles.grid}>
                            {filtered.map(recipe => {
                                const inCart = cart.find(c => c.recipeId === recipe.id);
                                return (
                                    <div key={recipe.id} className={`${styles.productCard}`} onClick={() => addToCart(recipe)}>
                                        {inCart && <span className={styles.cartBadge}>{inCart.quantity}</span>}
                                        <span className={styles.productIcon}>{recipe.icon}</span>
                                        <div className={styles.productName}>{recipe.name}</div>
                                        <div className={styles.productPrice}>₹{recipe.price}</div>
                                        <div className={styles.productCategory}>{recipe.category}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`${styles.cart}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                            <span style={{ fontSize: 24 }}>🛒</span>
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Order Summary</h3>
                        </div>
                        <div className={styles.cartItems}>
                            {cart.length === 0 && (
                                <div style={{ textAlign: 'center', opacity: 0.5, padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                    <span style={{ fontSize: 48 }}>🍹</span>
                                    <p style={{ fontSize: 14 }}>Select items to start an order</p>
                                </div>
                            )}
                            {cart.map(item => (
                                <div key={item.recipeId} className={styles.cartRow}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span>{item.icon}</span>
                                            <span>{item.name}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>₹{item.price} × {item.quantity}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>₹{(item.price * item.quantity).toLocaleString()}</span>
                                        <button className="btn btn-sm btn-outline" style={{ minWidth: 28, height: 28, padding: 0 }} onClick={(e) => { e.stopPropagation(); removeFromCart(item.recipeId); }}>−</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.cartFooter}>
                            <div className={styles.paymentRow}>
                                {(['cash', 'card', 'upi'] as const).map(m => (
                                    <button key={m} className={`btn btn-sm ${payment === m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPayment(m)} style={{ textTransform: 'uppercase', fontWeight: 700 }}>{m}</button>
                                ))}
                            </div>
                            <div className={styles.totalRow}>
                                <span className={styles.totalLabel}>Total Payable</span>
                                <span className={styles.totalAmount}>₹{total.toLocaleString('en-IN')}</span>
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '18px', fontSize: 16, fontWeight: 800, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                                disabled={cart.length === 0}
                                onClick={handleSale}
                            >
                                <span>Complete Sale</span>
                                <span style={{ opacity: 0.8 }}>→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
