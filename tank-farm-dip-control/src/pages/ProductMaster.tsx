import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormData } from '../validation/schemas';
import type { Product } from '../types';
import * as api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function ProductMaster() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const loadProducts = async () => {
    try {
      setProducts(await api.listProducts());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const onSubmit = async (data: ProductFormData) => {
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
    }
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    reset({ name: p.name, code: p.code, category: p.category, active: p.active, remarks: p.remarks });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    reset({ name: '', code: '', category: '', active: true, remarks: '' });
    setShowForm(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">Product Master</h2>
        <button onClick={handleCreate} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors">
          <Plus size={14} /> Add Product
        </button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">{msg}</div>}

      {showForm && (
        <div className="bg-white rounded border border-slate-200 p-4 mb-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">{editingId ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
                <input {...register('name')} className="input-field" />
                {errors.name && <p className="text-red-500 text-[10px] mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Code <span className="text-red-500">*</span></label>
                <input {...register('code')} className="input-field" />
                {errors.code && <p className="text-red-500 text-[10px] mt-0.5">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Category</label>
                <input {...register('category')} className="input-field" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Remarks</label>
                <input {...register('remarks')} className="input-field" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...register('active')} /> Active
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-slate-100 hover:bg-slate-200 text-xs px-3 py-1.5 rounded">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Code</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Name</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Category</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No products found</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono font-medium text-slate-700">{p.code}</td>
                  <td className="px-2 py-1 text-slate-600">{p.name}</td>
                  <td className="px-2 py-1 text-slate-500">{p.category || '--'}</td>
                  <td className="px-2 py-1 text-center">{p.active ? <span className="text-green-600">Yes</span> : <span className="text-red-500">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(p)} className="p-0.5 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                      <button onClick={async () => { try { await api.deleteProduct(p.id); loadProducts(); } catch {} }} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
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
