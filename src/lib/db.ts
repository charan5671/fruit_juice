import Dexie, { type EntityTable } from 'dexie';

// --- Interfaces ---
export interface Outlet {
    id?: number;
    name: string;
    address: string;
    phone: string;
    status: 'active' | 'inactive';
}

export interface Ingredient {
    id?: number;
    name: string;
    stock: number;
    unit: string;
    threshold: number;
    outletId: number;
    lastUpdated: string;
}

export interface Recipe {
    id?: number;
    name: string;
    price: number;
    icon: string;
    category: string;
    ingredients: { ingredientId: number; amount: number }[];
}

export interface Order {
    id?: number;
    items: { recipeId: number; name: string; price: number; quantity: number }[];
    total: number;
    timestamp: string;
    outletId: number;
    sellerId: number;
    paymentMethod: 'cash' | 'card' | 'upi';
}

export interface PurchaseOrder {
    id?: number;
    supplierId: number;
    items: { ingredientName: string; quantity: number; unit: string }[];
    status: 'draft' | 'sent' | 'confirmed' | 'in-transit' | 'delivered' | 'cancelled';
    totalCost: number;
    createdAt: string;
    eta: string;
    notes: string;
}

export interface Supplier {
    id?: number;
    name: string;
    contact: string;
    email: string;
    rating: number;
    itemsSupplied: string[];
}

export interface Employee {
    id?: number;
    name: string;
    role: 'admin' | 'manager' | 'seller' | 'staff';
    email: string;
    phone: string;
    outletId: number;
    salary: number;
    joinDate: string;
    status: 'active' | 'on-leave' | 'terminated';
}

export interface AttendanceRecord {
    id?: number;
    employeeId: number;
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
    status: 'present' | 'late' | 'absent' | 'half-day';
    hoursWorked: number;
}

export interface PayrollRecord {
    id?: number;
    employeeId: number;
    month: string;
    totalDays: number;
    daysPresent: number;
    hoursWorked: number;
    basePay: number;
    overtime: number;
    deductions: number;
    netPay: number;
    status: 'draft' | 'approved' | 'paid';
}

export interface Notification {
    id?: number;
    type: 'alert' | 'info' | 'success' | 'warning';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    module: string;
}

export interface AuditLog {
    id?: number;
    action: string;
    userId: number;
    userName: string;
    timestamp: string;
    module: string;
    details: string;
}

// --- Database Class ---
class FreshJuiceDB extends Dexie {
    outlets!: EntityTable<Outlet, 'id'>;
    ingredients!: EntityTable<Ingredient, 'id'>;
    recipes!: EntityTable<Recipe, 'id'>;
    orders!: EntityTable<Order, 'id'>;
    purchaseOrders!: EntityTable<PurchaseOrder, 'id'>;
    suppliers!: EntityTable<Supplier, 'id'>;
    employees!: EntityTable<Employee, 'id'>;
    attendance!: EntityTable<AttendanceRecord, 'id'>;
    payroll!: EntityTable<PayrollRecord, 'id'>;
    notifications!: EntityTable<Notification, 'id'>;
    auditLog!: EntityTable<AuditLog, 'id'>;

    constructor() {
        super('FreshJuiceChainDB');
        this.version(1).stores({
            outlets: '++id, name, status',
            ingredients: '++id, name, outletId, stock',
            recipes: '++id, name, category',
            orders: '++id, timestamp, outletId, sellerId',
            purchaseOrders: '++id, status, supplierId, createdAt',
            suppliers: '++id, name',
            employees: '++id, name, role, outletId, status',
            attendance: '++id, employeeId, date, status',
            payroll: '++id, employeeId, month, status',
            notifications: '++id, type, read, timestamp',
            auditLog: '++id, action, userId, timestamp, module'
        });
    }
}

export const db = new FreshJuiceDB();

// --- Seed Data ---
export async function seedDatabase() {
    const outletCount = await db.outlets.count();
    if (outletCount > 0) return; // Already seeded

    // Outlets
    await db.outlets.bulkAdd([
        { name: 'FreshJuice - Koramangala', address: '80 Feet Rd, Koramangala, Bangalore', phone: '+91 9876543210', status: 'active' },
        { name: 'FreshJuice - Indiranagar', address: '100 Feet Rd, Indiranagar, Bangalore', phone: '+91 9876543211', status: 'active' },
        { name: 'FreshJuice - HSR Layout', address: '27th Main Rd, HSR Layout, Bangalore', phone: '+91 9876543212', status: 'active' },
    ]);

    // Ingredients
    await db.ingredients.bulkAdd([
        { name: 'Orange', stock: 150, unit: 'kg', threshold: 20, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Apple', stock: 80, unit: 'kg', threshold: 15, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Watermelon', stock: 45, unit: 'pcs', threshold: 10, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Ginger', stock: 5, unit: 'kg', threshold: 2, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Mango', stock: 60, unit: 'kg', threshold: 15, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Pineapple', stock: 30, unit: 'pcs', threshold: 8, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Lemon', stock: 100, unit: 'pcs', threshold: 20, outletId: 1, lastUpdated: new Date().toISOString() },
        { name: 'Sugar', stock: 25, unit: 'kg', threshold: 5, outletId: 1, lastUpdated: new Date().toISOString() },
    ]);

    // Recipes
    await db.recipes.bulkAdd([
        { name: 'Orange Juice', price: 80, icon: '🍊', category: 'Classic', ingredients: [{ ingredientId: 1, amount: 0.5 }] },
        { name: 'Apple Blast', price: 100, icon: '🍎', category: 'Classic', ingredients: [{ ingredientId: 2, amount: 0.4 }] },
        { name: 'Watermelon Chill', price: 70, icon: '🍉', category: 'Classic', ingredients: [{ ingredientId: 3, amount: 1 }] },
        { name: 'Ginger Zest', price: 90, icon: '🫚', category: 'Special', ingredients: [{ ingredientId: 4, amount: 0.05 }, { ingredientId: 1, amount: 0.3 }] },
        { name: 'Mango Tango', price: 120, icon: '🥭', category: 'Premium', ingredients: [{ ingredientId: 5, amount: 0.4 }] },
        { name: 'Pineapple Punch', price: 110, icon: '🍍', category: 'Premium', ingredients: [{ ingredientId: 6, amount: 0.5 }] },
        { name: 'Citrus Mix', price: 130, icon: '🍋', category: 'Special', ingredients: [{ ingredientId: 1, amount: 0.3 }, { ingredientId: 7, amount: 2 }] },
        { name: 'Power Green', price: 150, icon: '🥬', category: 'Health', ingredients: [{ ingredientId: 4, amount: 0.02 }, { ingredientId: 2, amount: 0.3 }] },
    ]);

    // Suppliers
    await db.suppliers.bulkAdd([
        { name: 'FreshFarms Pvt Ltd', contact: '+91 9988776655', email: 'orders@freshfarms.in', rating: 4.5, itemsSupplied: ['Orange', 'Apple', 'Mango'] },
        { name: 'GreenLeaf Organics', contact: '+91 9988776656', email: 'supply@greenleaf.in', rating: 4.2, itemsSupplied: ['Ginger', 'Lemon', 'Pineapple'] },
        { name: 'TropiFruit Co.', contact: '+91 9988776657', email: 'sales@tropifruit.in', rating: 4.8, itemsSupplied: ['Watermelon', 'Pineapple', 'Mango'] },
    ]);

    // Employees
    await db.employees.bulkAdd([
        { name: 'Arjun Sharma', role: 'admin', email: 'arjun@freshjuice.in', phone: '+91 9112233440', outletId: 1, salary: 75000, joinDate: '2024-01-15', status: 'active' },
        { name: 'Priya Patel', role: 'manager', email: 'priya@freshjuice.in', phone: '+91 9112233441', outletId: 1, salary: 55000, joinDate: '2024-03-10', status: 'active' },
        { name: 'Rahul Verma', role: 'seller', email: 'rahul@freshjuice.in', phone: '+91 9112233442', outletId: 1, salary: 30000, joinDate: '2024-06-01', status: 'active' },
        { name: 'Sneha Reddy', role: 'seller', email: 'sneha@freshjuice.in', phone: '+91 9112233443', outletId: 1, salary: 30000, joinDate: '2024-06-15', status: 'active' },
        { name: 'Vikram Singh', role: 'staff', email: 'vikram@freshjuice.in', phone: '+91 9112233444', outletId: 2, salary: 22000, joinDate: '2024-08-01', status: 'active' },
        { name: 'Meera Iyer', role: 'staff', email: 'meera@freshjuice.in', phone: '+91 9112233445', outletId: 2, salary: 22000, joinDate: '2024-09-01', status: 'active' },
    ]);

    // Sample Purchase Orders
    await db.purchaseOrders.bulkAdd([
        { supplierId: 1, items: [{ ingredientName: 'Orange', quantity: 50, unit: 'kg' }], status: 'in-transit', totalCost: 2500, createdAt: '2026-02-25', eta: '2026-03-04', notes: 'Regular weekly order' },
        { supplierId: 3, items: [{ ingredientName: 'Watermelon', quantity: 20, unit: 'pcs' }], status: 'confirmed', totalCost: 1200, createdAt: '2026-02-28', eta: '2026-03-05', notes: 'Weekend demand surge' },
    ]);

    // Sample Attendance
    const today = new Date().toISOString().split('T')[0];
    await db.attendance.bulkAdd([
        { employeeId: 1, date: today, checkIn: '08:55', checkOut: null, gpsLat: 12.9352, gpsLng: 77.6245, status: 'present', hoursWorked: 0 },
        { employeeId: 2, date: today, checkIn: '09:02', checkOut: null, gpsLat: 12.9353, gpsLng: 77.6246, status: 'late', hoursWorked: 0 },
        { employeeId: 3, date: today, checkIn: '09:00', checkOut: null, gpsLat: 12.9354, gpsLng: 77.6247, status: 'present', hoursWorked: 0 },
    ]);

    // Notifications
    await db.notifications.bulkAdd([
        { type: 'warning', title: 'Low Stock Alert', message: 'Ginger stock is below threshold (5kg remaining)', timestamp: new Date().toISOString(), read: false, module: 'inventory' },
        { type: 'info', title: 'PO #1 In Transit', message: 'Oranges order from FreshFarms is en route. ETA: Mar 4', timestamp: new Date().toISOString(), read: false, module: 'procurement' },
        { type: 'success', title: 'Payroll Processed', message: 'February payroll has been calculated for 6 employees', timestamp: new Date().toISOString(), read: true, module: 'payroll' },
        { type: 'alert', title: 'Late Check-in', message: 'Priya Patel checked in 2 minutes late today', timestamp: new Date().toISOString(), read: false, module: 'attendance' },
    ]);
}
