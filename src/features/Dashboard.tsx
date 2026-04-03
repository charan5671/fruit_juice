'use client';
import { useStore } from '@/lib/store';

export default function Dashboard() {
    const { orders, ingredients, employees, attendance, outlets } = useStore();
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at?.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const lowStock = ingredients.filter(i => i.stock <= i.threshold).length;
    const today = todayStr;
    const presentToday = attendance.filter(a => a.date === today && a.check_in).length;

    return (
        <div className="animate-in">
            <h1 className="section-title">Enterprise Dashboard</h1>
            <p className="section-subtitle">Real-time operational overview — powered by Supabase</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                <div className="card glass">
                    <div className="stat-label">Today&apos;s Revenue</div>
                    <div className="stat-value" style={{ color: 'var(--primary)' }}>₹{todayRevenue.toLocaleString('en-IN')}</div>
                    <div className="stat-change stat-up">↑ {todayOrders.length} orders today · ₹{totalRevenue.toLocaleString('en-IN')} total</div>
                </div>
                <div className="card glass">
                    <div className="stat-label">Active Outlets</div>
                    <div className="stat-value">{outlets.filter(o => o.status === 'active').length}/{outlets.length}</div>
                    <div className="stat-change stat-up">All operational</div>
                </div>
                <div className="card glass">
                    <div className="stat-label">Inventory Alerts</div>
                    <div className="stat-value" style={{ color: lowStock > 0 ? 'var(--secondary)' : 'var(--primary)' }}>{lowStock}</div>
                    <div className={`stat-change ${lowStock > 0 ? 'stat-down' : 'stat-up'}`}>{lowStock > 0 ? '⚠ Action needed' : '✓ All stable'}</div>
                </div>
                <div className="card glass">
                    <div className="stat-label">Staff Present</div>
                    <div className="stat-value">{presentToday}/{employees.length}</div>
                    <div className="stat-change stat-up">{Math.round((presentToday / Math.max(employees.length, 1)) * 100)}% attendance</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 24 }}>
                <div className="card glass">
                    <h4 style={{ marginBottom: 16 }}>Revenue Trend (Last 7 Days)</h4>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                        {(() => {
                            // Pre-compute revenue per day-of-week to avoid O(n²) recalculation
                            const revenueByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun=0..Sat=6
                            orders.forEach(o => { revenueByDay[new Date(o.created_at).getDay()] += o.total; });
                            const maxRev = Math.max(1, ...revenueByDay);
                            const todayJs = new Date().getDay();

                            return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, i) => {
                                const jsDay = i === 6 ? 0 : i + 1;
                                const h = Math.max(5, Math.round((revenueByDay[jsDay] / maxRev) * 100));
                                const isToday = todayJs === jsDay;
                                return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: '100%', height: `${h}%`, background: isToday ? 'var(--primary)' : 'var(--primary-glow)', borderRadius: '4px 4px 0 0', transition: 'height 0.5s' }} />
                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: isToday ? 800 : 400 }}>{dayName}</span>
                                </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                <div className="card glass">
                    <h4 style={{ marginBottom: 16 }}>Inventory Health</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {ingredients.slice(0, 5).map(ing => (
                            <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, width: 90 }}>{ing.name}</span>
                                <div style={{ flex: 1, height: 8, background: 'var(--glass-border)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, (ing.stock / (ing.threshold * 5)) * 100)}%`, background: ing.stock <= ing.threshold ? 'var(--secondary)' : 'var(--primary)', borderRadius: 4, transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>{ing.stock}{ing.unit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card glass" style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 16 }}>Recent Transactions</h4>
                {orders.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No transactions yet. Complete a sale in POS to see data here.</p> : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Order ID</th><th>Items</th><th>Amount</th><th>Payment</th><th>Date</th><th>Time</th></tr></thead>
                            <tbody>
                                {orders.slice(0, 5).map(o => {
                                    const dateObj = new Date(o.created_at);
                                    return (
                                        <tr key={o.id}>
                                            <td style={{ fontWeight: 700 }}>#{o.id}</td>
                                            <td>{o.items.map((i: { name: string }) => i.name).join(', ')}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{o.total}</td>
                                            <td><span className="badge badge-info">{o.payment_method}</span></td>
                                            <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td style={{ fontSize: 13, fontWeight: 600 }}>{dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
