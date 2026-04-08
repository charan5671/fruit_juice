'use client';
import { useMemo, useState } from 'react';
import { useStore, type Order } from '@/lib/store';

const PIPELINE = ['Pending', 'Processing', 'Ready', 'Delivered'] as const;

export default function Shipping() {
  const { orders, updateOrderStatus, currentRole } = useStore();
  const [search, setSearch] = useState('');

  const activeShipments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => (o.status ?? 'Pending') !== 'Delivered' && (o.status ?? 'Pending') !== 'Cancelled')
      .filter((o) => {
        if (!q) return true;
        return (
          o.id.toString().includes(q) ||
          (o.customer_name ?? '').toLowerCase().includes(q) ||
          (o.customer_phone ?? '').toLowerCase().includes(q)
        );
      });
  }, [orders, search]);

  const advance = (order: Order) => {
    const current = (order.status ?? 'Pending') as (typeof PIPELINE)[number];
    const idx = PIPELINE.indexOf(current);
    if (idx === -1 || idx >= PIPELINE.length - 1) return;
    updateOrderStatus(order.id, PIPELINE[idx + 1]);
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="section-title">Shipping & Logistics</h1>
          <p className="section-subtitle">Track and update delivery status in real-time</p>
        </div>
        <div className="badge badge-info" style={{ alignSelf: 'flex-start' }}>
          Role: {currentRole}
        </div>
      </div>

      <div className="card glass" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search by order id, name, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 260 }}
        />
        <div className="badge badge-primary" style={{ alignSelf: 'center' }}>
          Active: {activeShipments.length}
        </div>
      </div>

      {activeShipments.length === 0 ? (
        <div className="card glass" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚛</div>
          <h3>No active shipments</h3>
          <p style={{ color: 'var(--text-secondary)' }}>New orders will appear here until delivered.</p>
        </div>
      ) : (
        <div className="glass" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeShipments.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 800 }}>#{o.id}</td>
                  <td>{o.customer_name || 'Walk-in'}</td>
                  <td>{o.customer_phone || '—'}</td>
                  <td>
                    <span className="badge badge-warning">{o.status || 'Pending'}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => advance(o)}>
                      Advance →
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginLeft: 8 }}
                      onClick={() => updateOrderStatus(o.id, 'Cancelled')}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

