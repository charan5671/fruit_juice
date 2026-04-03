'use client';
import { useStore, type Recipe } from '@/lib/store';
import { useState } from 'react';

export default function Production() {
    const { productionLogs, recipes, ingredients, logProduction, deleteProductionLog, currentRole, employees, currentEmployeeId } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecipeId, setSelectedRecipeId] = useState<number | ''>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState('');

    const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

    // Calculate required fruits
    const requiredFruits = selectedRecipe ? selectedRecipe.ingredients.map(ing => {
        const dbIngredient = ingredients.find(i => i.id === ing.ingredientId);
        const requiredAmount = ing.amount * quantity;
        const currentStock = dbIngredient?.stock || 0;
        const isSufficient = currentStock >= requiredAmount;
        return {
            ...dbIngredient,
            requiredAmount: +requiredAmount.toFixed(2),
            isSufficient
        };
    }) : [];

    const hasInsufficientStock = requiredFruits.some(f => !f.isSufficient);

    const handleLogProduction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecipe || hasInsufficientStock || quantity <= 0) return;

        try {
                const currentEmp = employees.find(e => e.id === currentEmployeeId);
                await logProduction({
                    product_id: selectedRecipe.id,
                    quantity: quantity,
                    fruits_used: requiredFruits.map(f => ({ ingredientId: f.id!, amount: f.requiredAmount })),
                    notes: notes,
                    outlet_id: currentEmp?.outlet_id || 1
                });
            setIsModalOpen(false);
            setSelectedRecipeId('');
            setQuantity(1);
            setNotes('');
        } catch (err) {
            console.error('Failed to log production:', err);
        }
    };

    const handleDelete = async (logId: number, fruitsUsed: { ingredientId: number; amount: number }[]) => {
        if (confirm('Delete this production log? This will RESTORE the consumed fruit inventory.')) {
            await deleteProductionLog(logId, fruitsUsed);
        }
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 className="section-title">Production Logs</h1>
                    <p className="section-subtitle">Log prepared juice batches and auto-deduct raw inventory.</p>
                </div>
                {['admin', 'manager', 'seller'].includes(currentRole) && (
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        + Log Production Batch
                    </button>
                )}
            </div>

            {productionLogs.length === 0 ? (
                <div className="card glass" style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🏭</div>
                    <h3>No production logged</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Log your first batch to deduct ingredients automatically.</p>
                </div>
            ) : (
                <div className="card glass" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Log ID</th>
                                <th>Product</th>
                                <th>Quantity Prepared</th>
                                <th>Ingredients Consumed</th>
                                <th>Notes</th>
                                <th>Date</th>
                                {['admin', 'manager'].includes(currentRole) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {productionLogs.map(log => {
                                const recipe = recipes.find(r => r.id === log.product_id);
                                return (
                                    <tr key={log.id}>
                                        <td style={{ fontWeight: 700 }}>#{log.id}</td>
                                        <td style={{ fontWeight: 600 }}>{recipe?.icon} {recipe?.name || 'Unknown Recipe'}</td>
                                        <td>{log.quantity} units</td>
                                        <td>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {log.fruits_used.map((f, i) => {
                                                    const ing = ingredients.find(ix => ix.id === f.ingredientId);
                                                    return (
                                                        <span key={i}>
                                                            • {f.amount}{ing?.unit || ''} {ing?.name || 'Unknown'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, fontStyle: 'italic', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.notes || '-'}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        {['admin', 'manager'].includes(currentRole) && (
                                            <td>
                                                <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(log.id, log.fruits_used)}>
                                                    Revert & Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content glass" style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Log Production Batch</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleLogProduction}>
                            <div className="form-group">
                                <label className="form-label">Select Recipe</label>
                                <select 
                                    className="input" 
                                    required
                                    value={selectedRecipeId}
                                    onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
                                >
                                    <option value="" disabled>-- Select a Juice --</option>
                                    {recipes.filter(r => r.is_available !== false).map(r => (
                                        <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedRecipe && (
                                <>
                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <label className="form-label">Quantity to Prepare (Batches/Bottles)</label>
                                        <input 
                                            type="number" 
                                            className="input" 
                                            min="1" 
                                            required 
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value))}
                                        />
                                    </div>

                                    <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-inset)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 12 }}>Ingredients Preview</div>
                                        {requiredFruits.length === 0 ? (
                                            <div style={{ fontSize: 13, color: 'var(--danger)' }}>This recipe has no ingredients defined.</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {requiredFruits.map((f, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                                                        <span>{f.name}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <span style={{ fontWeight: 600 }}>-{f.requiredAmount.toFixed(2)}{f.unit}</span>
                                                            <span className={`badge ${f.isSufficient ? 'badge-success' : 'badge-error'}`} style={{ width: 80, justifyContent: 'center' }}>
                                                                {f.isSufficient ? 'In Stock' : 'Low Stock!'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {hasInsufficientStock && (
                                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)', padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>
                                                ⚠ Not enough ingredients in inventory to produce this batch.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Notes (Optional)</label>
                                <textarea 
                                    className="input" 
                                    rows={2}
                                    placeholder="e.g., Morning prep batch"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!selectedRecipe || hasInsufficientStock || quantity <= 0}>
                                    Confirm Batch & Deduct Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
