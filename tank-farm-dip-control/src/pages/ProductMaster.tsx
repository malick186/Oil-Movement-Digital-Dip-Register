import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../validation/schemas';
import type { Product } from '../types';
import * as api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import EntryLine from '../components/EntryLine';

export default function ProductMaster() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const loadProducts = async () => {
    try {
      setProducts(await api.listProducts());
    } catch {
      useToastStore.getState().addToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const onSubmit = async (data: ProductFormData) => {
    setSubmitting(true);
    setMsg(null);
    try {
      if (editingId) {
        await api.updateProduct(editingId, data);
        setMsg('Product updated');
      } else {
        await api.createProduct(data);
        setMsg('Product created');
      }
      setShowForm(false);
      setEditingId(null);
      reset();
      loadProducts();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Operation failed');
      useToastStore.getState().addToast('Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    reset({ name: p.name, category: p.category, active: !!p.active, remarks: p.remarks });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    reset({ name: '', category: '', active: true, remarks: '' });
    setShowForm(true);
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">Product Master</h2>
        <button onClick={handleCreate} className="btn btn-primary flex items-center gap-1">
          <Plus size={14} /> Add Product
        </button>
      </div>

      {msg && <div className="notice-banner info">{msg}</div>}

      {showForm && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">{editingId ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <EntryLine
              columns={[
                {
                  label: 'Name', required: true, error: errors.name?.message, width: 'm',
                  children: <input {...register('name')} className="input-field entry-m" />,
                },
                {
                  label: 'Product Name', error: errors.category?.message, width: 'm',
                  children: <input {...register('category')} className="input-field entry-m" placeholder="e.g. Crude, HSFO, HSD" />,
                },
                {
                  label: 'Remarks', error: errors.remarks?.message, width: 'm',
                  children: <input {...register('remarks')} className="input-field entry-m" />,
                },
                {
                  label: 'Active', width: 's',
                  children: <input type="checkbox" {...register('active')} className="entry-ck" />,
                },
              ]}
            />
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update Product' : 'Create Product')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Name</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Product Name</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No products found</span></div></td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-medium text-dragon-text">{p.name}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{p.category || '--'}</td>
                  <td className="px-2 py-1 text-center">{p.active ? <span className="badge badge-success">Yes</span> : <span className="badge badge-danger">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(p)} className="p-0.5 text-dragon-text-muted hover:text-dragon-primary"><Pencil size={13} /></button>
                      <button onClick={async () => { if (!window.confirm('Are you sure you want to delete this product?')) return; try { await api.deleteProduct(p.id); loadProducts(); } catch { useToastStore.getState().addToast('Failed to delete product', 'error'); } }} className="p-0.5 text-dragon-text-muted hover:text-dragon-danger"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
