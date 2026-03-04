'use client';
import { create } from 'zustand';
import { supabase } from './supabase';

// ── Types ──
export type Role = 'admin' | 'manager' | 'procurement' | 'seller' | 'staff';
export type ActiveTab = 'Dashboard' | 'POS' | 'Inventory' | 'Procurement' | 'Workforce' | 'Payroll' | 'Analytics' | 'Notifications' | 'Settings' | 'UserManagement';

export interface Outlet { id: number; name: string; address: string; phone: string; status: string; }
export interface Ingredient { id: number; name: string; stock: number; unit: string; threshold: number; outlet_id: number; last_updated: string; }
export interface Recipe { id: number; name: string; price: number; icon: string; category: string; ingredients: { ingredientId: number; amount: number }[]; }
export interface Order { id: number; items: { recipeId: number; name: string; price: number; quantity: number }[]; total: number; created_at: string; outlet_id: number; seller_id: number; payment_method: string; }
export interface PurchaseOrder { id: number; supplier_id: number; items: { ingredientName: string; quantity: number; unit: string }[]; status: string; total_cost: number; eta: string; notes: string; created_at: string; }
export interface Supplier { id: number; name: string; contact: string; email: string; rating: number; items_supplied: string[]; }
export interface Employee { id: number; auth_uid: string; name: string; role: string; email: string; phone: string; outlet_id: number; salary: number; join_date: string; status: string; }
export interface AttendanceRecord { id: number; employee_id: number; date: string; check_in: string | null; check_out: string | null; gps_lat: number | null; gps_lng: number | null; status: string; hours_worked: number; }
export interface PayrollRecord { id: number; employee_id: number; month: string; total_days: number; days_present: number; hours_worked: number; base_pay: number; overtime: number; deductions: number; net_pay: number; status: string; }
export interface Notification { id: number; type: string; title: string; message: string; read: boolean; module: string; created_at: string; }

interface AppState {
    activeTab: ActiveTab; theme: 'light' | 'dark'; mobileMenuOpen: boolean; initialized: boolean;
    currentEmployeeId: number | null; currentRole: Role; currentName: string;
    outlets: Outlet[]; ingredients: Ingredient[]; recipes: Recipe[]; orders: Order[];
    purchaseOrders: PurchaseOrder[]; suppliers: Supplier[]; employees: Employee[];
    attendance: AttendanceRecord[]; payroll: PayrollRecord[]; notifications: Notification[];

    setActiveTab: (t: ActiveTab) => void; toggleTheme: () => void; setMobileMenuOpen: (v: boolean) => void;
    initialize: (authUid: string) => Promise<void>; refreshData: () => Promise<void>;
    completeSale: (items: { recipeId: number; name: string; price: number; quantity: number; ingredients: { ingredientId: number; amount: number }[] }[], paymentMethod: 'cash' | 'card' | 'upi') => Promise<Order>;
    addStock: (ingredientId: number, amount: number) => Promise<void>;
    createPO: (po: { supplier_id: number; items: { ingredientName: string; quantity: number; unit: string }[]; total_cost: number; notes: string }) => Promise<void>;
    updatePOStatus: (id: number, status: string) => Promise<void>;
    checkIn: (employeeId: number, lat: number, lng: number) => Promise<void>;
    checkOut: (employeeId: number) => Promise<void>;
    markNotificationRead: (id: number) => Promise<void>;
    runPayroll: (month: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    activeTab: 'Dashboard', theme: 'light', mobileMenuOpen: false, initialized: false,
    currentEmployeeId: null, currentRole: 'staff', currentName: '',
    outlets: [], ingredients: [], recipes: [], orders: [], purchaseOrders: [],
    suppliers: [], employees: [], attendance: [], payroll: [], notifications: [],

    setActiveTab: (t) => set({ activeTab: t, mobileMenuOpen: false }),
    toggleTheme: () => { const n = get().theme === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', n); localStorage.setItem('fjc-theme', n); set({ theme: n }); },
    setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),

    initialize: async (authUid: string) => {
        if (get().initialized) return;
        const saved = typeof window !== 'undefined' ? (localStorage.getItem('fjc-theme') as 'light' | 'dark') : null;
        if (saved) document.documentElement.setAttribute('data-theme', saved);

        // Get current employee from auth UID
        const { data: emp } = await supabase.from('employees').select('*').eq('auth_uid', authUid).single();

        // Systematic Override: Ensure Master Admin is ALWAYS admin
        let role = (emp?.role || 'staff') as Role;
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email === 'charanmaddirala111@gmail.com') role = 'admin';

        const defaultTab: ActiveTab = role === 'seller' ? 'POS' : role === 'staff' ? 'Workforce' : 'Dashboard';

        set({ initialized: true, theme: saved || 'light', currentEmployeeId: emp?.id || null, currentRole: role, currentName: emp?.name || '', activeTab: defaultTab });
        await get().refreshData();

        // Realtime subscriptions
        supabase.channel('db-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => get().refreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => get().refreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => get().refreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => get().refreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, () => get().refreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => get().refreshData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => get().refreshData())
            .subscribe();
    },

    refreshData: async () => {
        const [
            { data: outlets }, { data: ingredients }, { data: recipes },
            { data: orders }, { data: purchaseOrders }, { data: suppliers },
            { data: employees }, { data: attendance }, { data: payroll },
            { data: notifications }
        ] = await Promise.all([
            supabase.from('outlets').select('*'),
            supabase.from('ingredients').select('*'),
            supabase.from('recipes').select('*'),
            supabase.from('orders').select('*').order('created_at', { ascending: false }),
            supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
            supabase.from('suppliers').select('*'),
            supabase.from('employees').select('*'),
            supabase.from('attendance').select('*').order('id', { ascending: false }),
            supabase.from('payroll').select('*'),
            supabase.from('notifications').select('*').order('created_at', { ascending: false }),
        ]);
        set({
            outlets: outlets || [], ingredients: ingredients || [], recipes: recipes || [],
            orders: orders || [], purchaseOrders: purchaseOrders || [], suppliers: suppliers || [],
            employees: employees || [], attendance: attendance || [], payroll: payroll || [],
            notifications: notifications || [],
        });
    },

    completeSale: async (items, paymentMethod) => {
        const { currentEmployeeId, employees } = get();
        const emp = employees.find(e => e.id === currentEmployeeId);
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

        const { data, error } = await supabase.rpc('create_order', {
            p_items: items.map(i => ({ recipeId: i.recipeId, name: i.name, price: i.price, quantity: i.quantity, ingredients: i.ingredients })),
            p_total: total,
            p_payment_method: paymentMethod,
            p_outlet_id: emp?.outlet_id || 1,
            p_seller_id: currentEmployeeId,
        });

        if (error) throw error;
        return data as Order;
    },

    addStock: async (ingredientId, amount) => {
        const { currentEmployeeId, currentName } = get();
        const { data: current } = await supabase.from('ingredients').select('*').eq('id', ingredientId).single();
        if (current) {
            await supabase.from('ingredients').update({ stock: +(current.stock + amount).toFixed(2), last_updated: new Date().toISOString() }).eq('id', ingredientId);
            await supabase.from('audit_log').insert({ action: 'STOCK_ADDED', user_id: currentEmployeeId, user_name: currentName, module: 'inventory', details: `Added ${amount}${current.unit} of ${current.name}` });
        }
    },

    createPO: async (po) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('purchase_orders').insert({ supplier_id: po.supplier_id, items: po.items, status: 'draft', total_cost: po.total_cost, eta: '', notes: po.notes });
        await supabase.from('audit_log').insert({ action: 'PO_CREATED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `PO for supplier #${po.supplier_id}` });
    },

    updatePOStatus: async (id, status) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('purchase_orders').update({ status }).eq('id', id);
        if (status === 'delivered') {
            const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).single();
            if (po) {
                for (const item of (po.items as { ingredientName: string; quantity: number }[])) {
                    const { data: ing } = await supabase.from('ingredients').select('*').eq('name', item.ingredientName).single();
                    if (ing) await supabase.from('ingredients').update({ stock: +(ing.stock + item.quantity).toFixed(2), last_updated: new Date().toISOString() }).eq('id', ing.id);
                }
                await supabase.from('notifications').insert({ type: 'success', title: 'PO Delivered', message: `PO #${id} delivered. Stock updated.`, module: 'procurement' });
            }
        }
        await supabase.from('audit_log').insert({ action: 'PO_STATUS_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `PO #${id} → ${status}` });
    },

    checkIn: async (employeeId, lat, lng) => {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const isLate = parseInt(now.split(':')[0]) >= 9 && parseInt(now.split(':')[1]) > 5;
        await supabase.from('attendance').insert({ employee_id: employeeId, date: today, check_in: now, gps_lat: lat, gps_lng: lng, status: isLate ? 'late' : 'present', hours_worked: 0 });
        const emp = get().employees.find(e => e.id === employeeId);
        await supabase.from('audit_log').insert({ action: 'CHECK_IN', user_id: employeeId, user_name: emp?.name || '', module: 'attendance', details: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    },

    checkOut: async (employeeId) => {
        const today = new Date().toISOString().split('T')[0];
        const { data: record } = await supabase.from('attendance').select('*').eq('employee_id', employeeId).eq('date', today).is('check_out', null).single();
        if (record) {
            const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
            const [ch, cm] = record.check_in.split(':').map(Number);
            const [oh, om] = now.split(':').map(Number);
            const hoursWorked = Math.max(0, +((oh * 60 + om - ch * 60 - cm) / 60).toFixed(2));
            await supabase.from('attendance').update({ check_out: now, hours_worked: hoursWorked }).eq('id', record.id);
        }
    },

    markNotificationRead: async (id) => { await supabase.from('notifications').update({ read: true }).eq('id', id); },

    runPayroll: async (month) => {
        const { currentEmployeeId, currentName } = get();
        const { data: emps } = await supabase.from('employees').select('*').eq('status', 'active');
        if (!emps) return;
        for (const emp of emps) {
            const { data: records } = await supabase.from('attendance').select('*').eq('employee_id', emp.id);
            const mr = (records || []).filter((r: AttendanceRecord) => r.date.startsWith(month));
            const totalHours = mr.reduce((s: number, r: AttendanceRecord) => s + r.hours_worked, 0);
            const daysPresent = mr.filter((r: AttendanceRecord) => r.status === 'present' || r.status === 'late').length;
            const dailyRate = emp.salary / 30;
            const basePay = Math.round(dailyRate * daysPresent);
            const overtime = Math.max(0, totalHours - daysPresent * 8) * (dailyRate / 8) * 1.5;
            const deductions = mr.filter((r: AttendanceRecord) => r.status === 'late').length * 200;
            await supabase.from('payroll').upsert({ employee_id: emp.id, month, total_days: 30, days_present: daysPresent, hours_worked: totalHours, base_pay: basePay, overtime: Math.round(overtime), deductions, net_pay: Math.round(basePay + Math.round(overtime) - deductions), status: 'draft' }, { onConflict: 'employee_id,month' });
        }
        await supabase.from('notifications').insert({ type: 'success', title: 'Payroll Generated', message: `Payroll for ${month} calculated`, module: 'payroll' });
        await supabase.from('audit_log').insert({ action: 'PAYROLL_RUN', user_id: currentEmployeeId, user_name: currentName, module: 'payroll', details: `Payroll for ${month}` });
    },
}));
