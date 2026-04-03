'use client';
import { useStore, type Order } from '@/lib/store';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
    'Pending': 'badge-warning',
    'Processing': 'badge-info',
    'Ready': 'badge-primary',
    'Delivered': 'badge-success',
    'Cancelled': 'badge-error'
};

const PIPELINE = ['Pending', 'Processing', 'Ready', 'Delivered'];

export default function Orders() {
    const { orders, updateOrderStatus, currentRole } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    
    const filteredOrders = orders.filter(o => 
        (filterStatus === 'All' || o.status === filterStatus) &&
        ((o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
         o.id.toString().includes(searchTerm))
    );

    const handleAdvanceStatus = (order: Order) => {
        const currentStatus = order.status || 'Pending';
        const currentIndex = PIPELINE.indexOf(currentStatus);
        if (currentIndex !== -1 && currentIndex < PIPELINE.length - 1) {
            updateOrderStatus(order.id, PIPELINE[currentIndex + 1]);
        }
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 className="section-title">Order Tracking Pipeline</h1>
                    <p className="section-subtitle">Manage fulfilling orders and customer tracking</p>
                </div>
            </div>

            <div className="card glass" style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <input 
                    type="text" 
                    className="input" 
                    placeholder="Search by ID or Customer Name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, minWidth: 250 }}
                />
                <select 
                    className="input" 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ width: 200 }}
                >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Ready">Ready</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="card glass" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                    <h3>No orders found</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search filters.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
                    {filteredOrders.map(order => (
                        <div key={order.id} className="card glass" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 18, fontWeight: 700 }}>#{order.id}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {new Date(order.created_at).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <span className={`badge ${STATUS_COLORS[order.status || 'Delivered']}`}>
                                    {order.status || 'Delivered'}
                                </span>
                            </div>

                            <div style={{ flex: 1, marginBottom: 16 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Customer</div>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    {order.customer_name || 'Walk-in Customer'}
                                    {order.customer_phone && <span style={{ display: 'block' }}>📞 {order.customer_phone}</span>}
                                </div>
                            </div>

                            <div style={{ marginBottom: 16, background: 'var(--bg-inset)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>Items</div>
                                {order.items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                    <span>Total</span>
                                    <span style={{ color: 'var(--primary)' }}>₹{order.total}</span>
                                </div>
                            </div>

                            {order.notes && (
                                <div style={{ marginBottom: 16, fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                    📝 "{order.notes}"
                                </div>
                            )}

                            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ flex: 1 }}
                                        onClick={() => handleAdvanceStatus(order)}
                                    >
                                        Advance Status →
                                    </button>
                                    <button 
                                        className="btn btn-outline"
                                        onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
