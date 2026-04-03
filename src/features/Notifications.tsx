'use client';
import { useStore } from '@/lib/store';

export default function Notifications() {
    const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();
    const ICONS: Record<string, string> = { alert: '🔴', warning: '🟡', info: '🔵', success: '🟢' };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h1 className="section-title">Notification Center</h1>
                    <p className="section-subtitle">Real-time system alerts synced from Supabase</p>
                </div>
                {notifications.some(n => !n.read) && (
                    <button className="btn btn-sm btn-outline" onClick={() => markAllNotificationsRead()}>Mark All Read</button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>No notifications yet.</p>}
                {notifications.map(n => (
                    <div key={n.id} className="card glass" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, opacity: n.read ? 0.6 : 1, cursor: 'pointer' }} onClick={() => !n.read && markNotificationRead(n.id)}>
                        <span style={{ fontSize: 20, marginTop: 2 }}>{ICONS[n.type] || '🔵'}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                                <span className="badge badge-info" style={{ fontSize: 9 }}>{n.module}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{n.message}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{new Date(n.created_at).toLocaleString('en-IN')}</div>
                        </div>
                        {!n.read && <span className="badge badge-warning" style={{ fontSize: 9 }}>New</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
