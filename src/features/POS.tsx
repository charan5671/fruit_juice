'use client';
import { useStore, type Order } from '@/lib/store';
import { useState, useRef } from 'react';
import styles from './POS.module.css';

export default function POS() {
    const { recipes, completeSale, orders, currentName } = useStore();
    const [cart, setCart] = useState<{ recipeId: number; name: string; price: number; quantity: number; icon: string; ingredients: { ingredientId: number; amount: number }[] }[]>([]);
    const [payment, setPayment] = useState<'cash' | 'card' | 'upi'>('cash');
    const [filter, setFilter] = useState('All');
    const [view, setView] = useState<'pos' | 'history'>('pos');
    const [receipt, setReceipt] = useState<Order | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

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
        await completeSale(cart, payment);
        setCart([]);
        // Show latest order as receipt
        setTimeout(() => {
            const latest = useStore.getState().orders[0];
            if (latest) setReceipt(latest);
        }, 500);
    };

    const printReceipt = () => {
        if (!receiptRef.current) return;
        const win = window.open('', '_blank', 'width=380,height=600');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Courier New', monospace; width:300px; margin:0 auto; padding:20px 10px; font-size:12px; color:#000; }
      .center { text-align:center; } .bold { font-weight:bold; } .mt { margin-top:8px; } .mb { margin-bottom:8px; }
      .line { border-top:1px dashed #333; margin:8px 0; }
      .row { display:flex; justify-content:space-between; padding:2px 0; }
      h2 { font-size:18px; } h3 { font-size:14px; }
    </style></head><body>${receiptRef.current.innerHTML}<script>window.print();window.close();</script></body></html>`);
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
                <div className="card glass" style={{ maxWidth: 380, margin: '0 auto', padding: 32 }}>
                    <div ref={receiptRef}>
                        <div className="center mb">
                            <h2 className="bold">🍹 FreshJuice</h2>
                            <div style={{ fontSize: 11 }}>Enterprise Management Platform</div>
                            <div style={{ fontSize: 10, color: '#666' }}>80 Feet Rd, Koramangala, Bangalore</div>
                            <div style={{ fontSize: 10, color: '#666' }}>GSTIN: 29AABCF1234D1ZF</div>
                        </div>
                        <div className="line" />
                        <div className="row"><span>Receipt #</span><span className="bold">{receipt.id}</span></div>
                        <div className="row"><span>Date</span><span>{new Date(receipt.created_at).toLocaleDateString('en-IN')}</span></div>
                        <div className="row"><span>Time</span><span>{new Date(receipt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
                        <div className="row"><span>Cashier</span><span>{currentName}</span></div>
                        <div className="row"><span>Payment</span><span style={{ textTransform: 'uppercase' }}>{receipt.payment_method}</span></div>
                        <div className="line" />
                        <div className="bold mb" style={{ fontSize: 11 }}>ITEMS</div>
                        {items.map((item, i) => (
                            <div key={i}>
                                <div className="row"><span>{item.name} x{item.quantity}</span><span>₹{item.price * item.quantity}</span></div>
                            </div>
                        ))}
                        <div className="line" />
                        <div className="row"><span>Subtotal</span><span>₹{receipt.total}</span></div>
                        <div className="row"><span>GST (5%)</span><span>₹{gst}</span></div>
                        <div className="line" />
                        <div className="row bold" style={{ fontSize: 16 }}><span>TOTAL</span><span>₹{receipt.total + gst}</span></div>
                        <div className="line" />
                        <div className="center mt" style={{ fontSize: 11, lineHeight: 1.6 }}>
                            <div className="bold">Thank You for Choosing FreshJuice! 🍹</div>
                            <div>We hope you enjoyed your drink.</div>
                            <div style={{ color: '#666' }}>Please visit again!</div>
                            <div style={{ marginTop: 8, fontSize: 9, color: '#999' }}>www.freshjuice.in | +91 9876543210</div>
                            <div style={{ fontSize: 9, color: '#999' }}>This is a computer-generated receipt</div>
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
                </div>
            </div>

            {view === 'history' ? (
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
                                    <div key={recipe.id} className={`${styles.productCard} glass`} onClick={() => addToCart(recipe)}>
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

                    <div className={`${styles.cart} glass`}>
                        <h3 style={{ marginBottom: 16 }}>Order Summary</h3>
                        <div className={styles.cartItems}>
                            {cart.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>Tap a product to add</p>}
                            {cart.map(item => (
                                <div key={item.recipeId} className={styles.cartRow}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.icon} {item.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>₹{item.price} × {item.quantity}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 700 }}>₹{item.price * item.quantity}</span>
                                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); removeFromCart(item.recipeId); }}>−</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={styles.cartFooter}>
                            <div className={styles.paymentRow}>
                                {(['cash', 'card', 'upi'] as const).map(m => (
                                    <button key={m} className={`btn btn-sm ${payment === m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPayment(m)} style={{ textTransform: 'uppercase' }}>{m}</button>
                                ))}
                            </div>
                            <div className={styles.totalRow}>
                                <span>Total</span>
                                <span className={styles.totalAmount}>₹{total.toLocaleString('en-IN')}</span>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} disabled={cart.length === 0} onClick={handleSale}>
                                Complete Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
