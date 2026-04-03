'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

// ── Types ──
export type Role = 'admin' | 'manager' | 'procurement' | 'seller' | 'staff';
export type ActiveTab = 'Dashboard' | 'POS' | 'Orders' | 'Production' | 'Inventory' | 'Procurement' | 'Workforce' | 'Payroll' | 'Analytics' | 'Notifications' | 'Settings' | 'UserManagement';

export interface Outlet { id: number; name: string; address: string; phone: string; status: string; }
export interface Ingredient { id: number; name: string; stock: number; unit: string; threshold: number; outlet_id: number; last_updated: string; }
export interface Recipe { id: number; name: string; price: number; icon: string; category: string; is_available?: boolean; ingredients: { ingredientId: number; amount: number }[]; }
export interface Order { id: number; items: { recipeId: number; name: string; price: number; quantity: number }[]; total: number; created_at: string; outlet_id: number; seller_id: number; payment_method: string; customer_name?: string; customer_phone?: string; notes?: string; status?: string; }
export interface ProductionLog { id: number; product_id: number; quantity: number; fruits_used: { ingredientId: number; amount: number }[]; notes?: string; outlet_id: number; created_at: string; }
export interface PurchaseOrder { id: number; supplier_id: number; items: { ingredientName: string; quantity: number; unit: string }[]; status: string; total_cost: number; eta: string; notes: string; created_at: string; }
export interface Supplier { id: number; name: string; contact: string; email: string; rating: number; items_supplied: string[]; }
export interface Employee { id: number; auth_uid: string; name: string; role: string; email: string; phone: string; outlet_id: number; salary: number; join_date: string; status: string; }
export interface AttendanceRecord { id: number; employee_id: number; date: string; check_in: string | null; check_out: string | null; gps_lat: number | null; gps_lng: number | null; status: string; hours_worked: number; }
export interface PayrollRecord { id: number; employee_id: number; month: string; total_days: number; days_present: number; hours_worked: number; base_pay: number; overtime: number; deductions: number; net_pay: number; status: string; }
export interface Notification { id: number; type: string; title: string; message: string; read: boolean; module: string; created_at: string; }

interface AppState {
    activeTab: ActiveTab; theme: 'light' | 'dark'; mobileMenuOpen: boolean; initialized: boolean;
    currentEmployeeId: number | null; currentRole: Role; currentName: string;
    outlets: Outlet[]; ingredients: Ingredient[]; recipes: Recipe[]; orders: Order[]; productionLogs: ProductionLog[];
    purchaseOrders: PurchaseOrder[]; suppliers: Supplier[]; employees: Employee[];
    attendance: AttendanceRecord[]; payroll: PayrollRecord[]; notifications: Notification[];
    _hasHydrated: boolean;
    lastSyncedAt: string | null;
    setHasHydrated: (state: boolean) => void;

    setActiveTab: (t: ActiveTab) => void; toggleTheme: () => void; setMobileMenuOpen: (v: boolean) => void;
    initialize: (user: { id: string; email?: string | undefined }, profile?: { id: number; name: string; role: string; outlet_id: number; status: string } | null) => Promise<void>;
    refreshData: (tabs?: ActiveTab[]) => Promise<void>; // Added optional tabs parameter
    completeSale: (items: { recipeId: number; name: string; price: number; quantity: number; ingredients: { ingredientId: number; amount: number }[] }[], paymentMethod: 'cash' | 'card' | 'upi', customerName?: string, customerPhone?: string, notes?: string, status?: string) => Promise<Order>;
    updateOrderStatus: (id: number, status: string) => Promise<void>;
    logProduction: (log: Omit<ProductionLog, 'id' | 'created_at'>) => Promise<void>;
    deleteProductionLog: (id: number, fruitsUsed: { ingredientId: number; amount: number }[]) => Promise<void>;
    addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
    updateRecipe: (id: number, updates: Partial<Recipe>) => Promise<void>;
    deleteRecipe: (id: number) => Promise<void>;
    addIngredient: (ing: Omit<Ingredient, 'id' | 'last_updated'>) => Promise<void>;
    updateIngredient: (id: number, updates: Partial<Ingredient>) => Promise<void>;
    deleteIngredient: (id: number) => Promise<void>;
    addStock: (ingredientId: number, amount: number) => Promise<void>;
    createPO: (po: { supplier_id: number; items: { ingredientName: string; quantity: number; unit: string }[]; total_cost: number; notes: string }) => Promise<void>;
    editPO: (id: number, updates: { items?: { ingredientName: string; quantity: number; unit: string }[]; total_cost?: number; notes?: string }) => Promise<void>;
    updatePOStatus: (id: number, status: string) => Promise<void>;
    addSupplier: (supplier: Partial<Supplier>) => Promise<void>;
    updateSupplier: (id: number, updates: Partial<Supplier>) => Promise<void>;
    deleteSupplier: (id: number) => Promise<void>;
    checkIn: (employeeId: number, lat: number, lng: number) => Promise<void>;
    checkOut: (employeeId: number) => Promise<void>;
    markNotificationRead: (id: number) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    runPayroll: (month: string) => Promise<void>;
    addEmployee: (emp: Partial<Employee>) => Promise<void>;
    updateEmployee: (id: number, updates: Partial<Employee>) => Promise<void>;
    deleteEmployee: (id: number) => Promise<void>;
    resetStore: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            activeTab: 'Dashboard', theme: 'light', mobileMenuOpen: false, initialized: false,
            currentEmployeeId: null, currentRole: 'staff', currentName: '',
            outlets: [], ingredients: [], recipes: [], orders: [], productionLogs: [], purchaseOrders: [],
            suppliers: [], employees: [], attendance: [], payroll: [], notifications: [],
            _hasHydrated: false,
            lastSyncedAt: null,
            setHasHydrated: (state) => set({ _hasHydrated: state }),

            resetStore: () => set({
                outlets: [], ingredients: [], recipes: [], orders: [], productionLogs: [], purchaseOrders: [],
                suppliers: [], employees: [], attendance: [], payroll: [], notifications: [],
                initialized: false, currentEmployeeId: null, currentRole: 'staff', currentName: ''
            }),

    setActiveTab: (t) => {
        set({ activeTab: t, mobileMenuOpen: false });
        // Lazy load data for specific tabs
        const { refreshData } = get();
        if (['POS', 'Orders', 'Production', 'Inventory', 'Procurement', 'Workforce', 'Payroll', 'Analytics'].includes(t)) {
            refreshData([t]);
        }
    },
    toggleTheme: () => { if (typeof document === 'undefined') return; const n = get().theme === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', n); localStorage.setItem('fjc-theme', n); set({ theme: n }); },
    setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),

    initialize: async (user, profile) => {
        if (get().initialized) return;
        const saved = typeof window !== 'undefined' ? (localStorage.getItem('fjc-theme') as 'light' | 'dark') : null;
        if (saved) document.documentElement.setAttribute('data-theme', saved);

        // Systematic Override: Ensure Master Admin is ALWAYS admin
        let role = (profile?.role || 'staff') as Role;
        if (user?.email === 'charanmaddirala111@gmail.com') role = 'admin';

        const defaultTab: ActiveTab = role === 'seller' ? 'POS' : role === 'staff' ? 'Workforce' : 'Dashboard';

        set({ initialized: true, theme: saved || 'light', currentEmployeeId: profile?.id || null, currentRole: role, currentName: profile?.name || '', activeTab: defaultTab });

        // Initial Selective Refresh (Fast Path) - FIRE AND FORGET
        get().refreshData(['Settings', 'Inventory', 'Dashboard', 'Notifications']).catch(console.error);

        // Realtime subscriptions with reconnection strategy (RT1)
        const setupRealtimeChannel = () => {
            const channel = supabase.channel('db-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => get().refreshData(['Inventory', 'POS']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => get().refreshData(['POS', 'Production']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'outlets' }, () => get().refreshData(['Dashboard', 'Settings']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => get().refreshData(['Dashboard', 'POS', 'Orders', 'Analytics']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => get().refreshData(['Production']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => get().refreshData(['Procurement']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => get().refreshData(['Workforce']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, () => get().refreshData(['Payroll']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => get().refreshData(['Notifications']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => get().refreshData(['Settings']))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => get().refreshData(['Procurement']))
                .subscribe((status) => {
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        console.warn('[Realtime] Channel error, scheduling reconnect...');
                        setTimeout(() => {
                            supabase.removeChannel(channel);
                            setupRealtimeChannel();
                        }, 3000);
                    }
                });
        };
        setupRealtimeChannel();
    },

    refreshData: async (tabs) => {
        const fetchers: Record<string, any> = {};

        // Core/Common data
        if (!tabs || tabs.includes('Dashboard') || tabs.includes('Settings')) {
            fetchers.outlets = supabase.from('outlets').select('*');
            fetchers.employees = supabase.from('employees').select('*');
        }

        // Notifications (independent path)
        if (!tabs || tabs.includes('Notifications') || tabs.includes('Dashboard') || tabs.includes('Settings')) {
            fetchers.notifications = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
        }

        // Inventory & Recipes (Essential for POS)
        if (!tabs || tabs.includes('Inventory') || tabs.includes('POS')) {
            fetchers.ingredients = supabase.from('ingredients').select('*');
            fetchers.recipes = supabase.from('recipes').select('*');
        }

        // Historical Data (Lazy)
        if (!tabs || tabs.includes('POS') || tabs.includes('Orders') || tabs.includes('Analytics')) {
            fetchers.orders = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
        }

        if (!tabs || tabs.includes('Production')) {
            fetchers.productionLogs = supabase.from('production_logs').select('*').order('created_at', { ascending: false }).limit(30);
        }

        if (!tabs || tabs.includes('Procurement')) {
            fetchers.purchaseOrders = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(30);
            fetchers.suppliers = supabase.from('suppliers').select('*');
        }

        if (!tabs || tabs.includes('Workforce') || tabs.includes('Payroll')) {
            fetchers.attendance = supabase.from('attendance').select('*').order('id', { ascending: false }).limit(50);
        }

        if (!tabs || tabs.includes('Payroll')) {
            fetchers.payroll = supabase.from('payroll').select('*');
        }

        const keys = Object.keys(fetchers);
        const results = await Promise.allSettled(Object.values(fetchers));

        const newState: Partial<AppState> = {};
        keys.forEach((key, i) => {
            const result = results[i];
            if (result.status === 'fulfilled' && result.value.data) {
                newState[key as keyof AppState] = result.value.data as any;
            }
            // On rejection, keep existing data — don't wipe with empty array
        });

        newState.lastSyncedAt = new Date().toISOString();
        set(newState as any);
    },

    completeSale: async (items, paymentMethod, customerName = '', customerPhone = '', notes = '', status = 'Pending') => {
        const { currentEmployeeId, employees } = get();
        const emp = employees.find(e => e.id === currentEmployeeId);
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

        const { data, error } = await supabase.rpc('create_order', {
            p_items: items.map(i => ({ recipeId: i.recipeId, name: i.name, price: i.price, quantity: i.quantity, ingredients: i.ingredients || [] })),
            p_total: total,
            p_payment_method: paymentMethod,
            p_outlet_id: emp?.outlet_id || 1,
            p_seller_id: currentEmployeeId,
            p_customer_name: customerName,
            p_customer_phone: customerPhone,
            p_notes: notes,
            p_status: status
        });

        if (error) throw error;
        await get().refreshData(['POS', 'Orders', 'Dashboard', 'Inventory', 'Analytics']);
        return data as Order;
    },

    updateOrderStatus: async (id, status) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('orders').update({ status }).eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'ORDER_STATUS_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'orders', details: `Order #${id} marked as ${status}` });
        await get().refreshData(['Orders', 'Dashboard', 'Analytics']);
    },

    logProduction: async (log) => {
        const { currentEmployeeId, currentName } = get();
        
        // 1. Insert log
        const { error } = await supabase.from('production_logs').insert(log);
        if (error) throw new Error(error.message);
        
        // 2. Deduct inventory manually since we bypass create_order RPC
        for (const fruit of log.fruits_used) {
            const { data: currentIngredient } = await supabase.from('ingredients').select('stock').eq('id', fruit.ingredientId).single();
            if (currentIngredient) {
                await supabase.from('ingredients').update({ stock: +(currentIngredient.stock - fruit.amount).toFixed(2), last_updated: new Date().toISOString() }).eq('id', fruit.ingredientId);
            }
        }
        
        await supabase.from('audit_log').insert({ action: 'PRODUCTION_LOGGED', user_id: currentEmployeeId, user_name: currentName, module: 'production', details: `Logged ${log.quantity} units of Recipe #${log.product_id}` });
        await get().refreshData(['Production', 'Inventory', 'POS']);
    },

    deleteProductionLog: async (id, fruitsUsed) => {
        const { currentEmployeeId, currentName } = get();
        
        // 1. Delete log
        const { error } = await supabase.from('production_logs').delete().eq('id', id);
        if (error) throw new Error(error.message);
        
        // 2. Restore inventory
        for (const fruit of fruitsUsed) {
            const { data: currentIngredient } = await supabase.from('ingredients').select('stock').eq('id', fruit.ingredientId).single();
            if (currentIngredient) {
                await supabase.from('ingredients').update({ stock: +(currentIngredient.stock + fruit.amount).toFixed(2), last_updated: new Date().toISOString() }).eq('id', fruit.ingredientId);
            }
        }
        
        await supabase.from('audit_log').insert({ action: 'PRODUCTION_DELETED', user_id: currentEmployeeId, user_name: currentName, module: 'production', details: `Deleted log #${id} and restored inventory.` });
        await get().refreshData(['Production', 'Inventory', 'POS']);
    },

    addRecipe: async (recipe) => {
        const { currentEmployeeId, currentName } = get();
        const { data, error } = await supabase.from('recipes').insert(recipe).select();
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'RECIPE_ADDED', user_id: currentEmployeeId, user_name: currentName, module: 'pos', details: `Added new recipe ${recipe.name}` });
        await get().refreshData(['POS', 'Production']);
    },

    updateRecipe: async (id, updates) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('recipes').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'RECIPE_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'pos', details: `Updated recipe #${id}` });
        await get().refreshData(['POS', 'Production']);
    },

    deleteRecipe: async (id) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'RECIPE_DELETED', user_id: currentEmployeeId, user_name: currentName, module: 'pos', details: `Deleted recipe #${id}` });
        await get().refreshData(['POS', 'Production']);
    },

    addIngredient: async (ing) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('ingredients').insert({ ...ing, last_updated: new Date().toISOString() });
        await supabase.from('audit_log').insert({ action: 'INGREDIENT_ADDED', user_id: currentEmployeeId, user_name: currentName, module: 'inventory', details: `Added ${ing.name}` });
        await get().refreshData(['Inventory']);
    },

    updateIngredient: async (id, updates) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('ingredients').update({ ...updates, last_updated: new Date().toISOString() }).eq('id', id);
        await supabase.from('audit_log').insert({ action: 'INGREDIENT_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'inventory', details: `Updated ingredient #${id}` });
        await get().refreshData(['Inventory']);
    },

    deleteIngredient: async (id) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('ingredients').delete().eq('id', id);
        await supabase.from('audit_log').insert({ action: 'INGREDIENT_DELETED', user_id: currentEmployeeId, user_name: currentName, module: 'inventory', details: `Deleted ingredient #${id}` });
        await get().refreshData(['Inventory']);
    },

    addStock: async (ingredientId, amount) => {
        const { currentEmployeeId, currentName } = get();
        const { data: current } = await supabase.from('ingredients').select('*').eq('id', ingredientId).single();
        if (current) {
            await supabase.from('ingredients').update({ stock: +(current.stock + amount).toFixed(2), last_updated: new Date().toISOString() }).eq('id', ingredientId);
            await supabase.from('audit_log').insert({ action: 'STOCK_ADDED', user_id: currentEmployeeId, user_name: currentName, module: 'inventory', details: `Added ${amount}${current.unit} of ${current.name}` });
            await get().refreshData(['Inventory', 'POS']);
        }
    },

    createPO: async (po) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('purchase_orders').insert({ supplier_id: po.supplier_id, items: po.items, status: 'draft', total_cost: po.total_cost, eta: '', notes: po.notes });
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'PO_CREATED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `PO for supplier #${po.supplier_id}` });
        await get().refreshData(['Procurement']);
    },

    editPO: async (id, updates) => {
        const { currentEmployeeId, currentName } = get();
        const { data: current } = await supabase.from('purchase_orders').select('*').eq('id', id).single();
        if (current && current.status === 'draft') {
            const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id);
            if (error) throw new Error(error.message);
            await supabase.from('audit_log').insert({ action: 'PO_EDITED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `Edited PO #${id}` });
            await get().refreshData(['Procurement']);
        }
    },

    updatePOStatus: async (id, status) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
        if (error) throw new Error(error.message);
        // Data transformation (stock update, audit log, notifications) is now fully automated via Postgres Triggers on 'purchase_orders' update
        await supabase.from('audit_log').insert({ action: 'PO_STATUS_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `PO #${id} → ${status}` });
        await get().refreshData(['Procurement', 'Inventory']);
    },

    addSupplier: async (supplier) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('suppliers').insert(supplier);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'SUPPLIER_ADDED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `Added supplier ${supplier.name}` });
        await get().refreshData(['Procurement']);
    },

    updateSupplier: async (id, updates) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('suppliers').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'SUPPLIER_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `Updated supplier #${id}` });
        await get().refreshData(['Procurement']);
    },

    deleteSupplier: async (id) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'SUPPLIER_DELETED', user_id: currentEmployeeId, user_name: currentName, module: 'procurement', details: `Deleted supplier #${id}` });
        await get().refreshData(['Procurement']);
    },

    checkIn: async (employeeId, lat, lng) => {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const isLate = parseInt(now.split(':')[0]) >= 9 && parseInt(now.split(':')[1]) > 5;
        await supabase.from('attendance').insert({ employee_id: employeeId, date: today, check_in: now, gps_lat: lat, gps_lng: lng, status: isLate ? 'late' : 'present', hours_worked: 0 });
        const emp = get().employees.find(e => e.id === employeeId);
        await supabase.from('audit_log').insert({ action: 'CHECK_IN', user_id: employeeId, user_name: emp?.name || '', module: 'attendance', details: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        await get().refreshData(['Workforce']);
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
            await get().refreshData(['Workforce']);
        }
    },

    markNotificationRead: async (id) => { 
        await supabase.from('notifications').update({ read: true }).eq('id', id); 
        await get().refreshData(['Notifications']);
    },

    markAllNotificationsRead: async () => {
        const unreadIds = get().notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
        await get().refreshData(['Notifications']);
    },

    runPayroll: async (month) => {
        const { currentEmployeeId, currentName } = get();
        try {
            // Priority 1: Try database-level RPC for maximum performance
            const { error } = await supabase.rpc('generate_monthly_payroll', { p_month: month, p_admin_id: currentEmployeeId || 0 });
            if (error) throw error;
        } catch (e) {
            // Priority 2: Fallback to application-layer calculation if RPC is missing
            const { data: emps } = await supabase.from('employees').select('id, salary').in('status', ['active', 'on-leave']);
            if (emps) {
                const draftData = emps.map(emp => ({
                    employee_id: emp.id,
                    month: month,
                    total_days: 30,
                    days_present: 30, // Default assume full presence for this version
                    base_pay: emp.salary || 15000,
                    net_pay: emp.salary || 15000,
                    status: 'draft'
                }));
                // Insert silently, ignoring conflicts if already exists
                for (const row of draftData) {
                    await supabase.from('payroll').upsert(row, { onConflict: 'employee_id, month' }).select();
                }
            }
        }
        await supabase.from('audit_log').insert({ action: 'PAYROLL_GENERATED', user_id: currentEmployeeId, user_name: currentName, module: 'payroll', details: `Generated payroll for ${month}` });
        await get().refreshData(['Payroll']);
    },

    addEmployee: async (emp) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('employees').insert({ ...emp, join_date: new Date().toISOString().split('T')[0], status: 'pending' });
        await supabase.from('audit_log').insert({ action: 'EMPLOYEE_ADDED', user_id: currentEmployeeId, user_name: currentName, module: 'admin', details: `Added new employee ${emp.name}` });
        await get().refreshData(['Settings']);
    },

    updateEmployee: async (id, updates) => {
        const { currentEmployeeId, currentName } = get();
        const { error } = await supabase.from('employees').update(updates).eq('id', id);
        if (error) throw new Error(error.message);
        await supabase.from('audit_log').insert({ action: 'EMPLOYEE_UPDATED', user_id: currentEmployeeId, user_name: currentName, module: 'admin', details: `Updated employee #${id}` });
        await get().refreshData(['Settings']);
    },

    deleteEmployee: async (id) => {
        const { currentEmployeeId, currentName } = get();
        await supabase.from('employees').delete().eq('id', id);
        await supabase.from('audit_log').insert({ action: 'EMPLOYEE_DELETED', user_id: currentEmployeeId, user_name: currentName, module: 'admin', details: `Deleted employee #${id}` });
        await get().refreshData(['Settings']);
    },

    // resetStore defined above at line 71 — no duplicate needed
}), {
    name: 'freshjuice-cache',
    partialize: (state) => ({ outlets: state.outlets, ingredients: state.ingredients, recipes: state.recipes, orders: state.orders, productionLogs: state.productionLogs, purchaseOrders: state.purchaseOrders, suppliers: state.suppliers, employees: state.employees, attendance: state.attendance, payroll: state.payroll, notifications: state.notifications }),
    onRehydrateStorage: () => {
        return (state, error) => {
            if (!error && state) state.setHasHydrated(true);
        };
    }
}));
