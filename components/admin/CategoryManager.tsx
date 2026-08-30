"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; isActive: boolean; _count?: { products: number } };

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({ name: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name });
    } else {
      setEditingCategory(null);
      setFormData({ name: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      id: editingCategory?.id,
      name: formData.name,
    };

    try {
      const res = await fetch("/api/admin/categories", {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        router.refresh();
        
        if (editingCategory) {
          setCategories(categories.map(c => c.id === data.category.id ? { ...c, ...data.category } : c));
        } else {
          setCategories([{ ...data.category, _count: { products: 0 } }, ...categories]);
        }
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (category: Category) => {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...category, isActive: !category.isActive }),
      });
      if (res.ok) {
        setCategories(categories.map(c => c.id === category.id ? { ...c, isActive: !c.isActive } : c));
        router.refresh();
      }
    } catch (error) {
      alert("Gagal mengubah status");
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!confirm(`Hapus permanen kategori "${category.name}"?\nCatatan: Kategori yang masih memiliki produk di dalamnya tidak akan bisa dihapus.`)) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${category.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setCategories(categories.filter(c => c.id !== category.id));
        router.refresh();
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Kesalahan jaringan saat menghapus kategori");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Kategori</h2>
          <p className="text-slate-500 mt-2 font-medium">Kelola kelompok menu di aplikasi kasir.</p>
        </div>
        <button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-xl shadow-sm transition-colors active:scale-95">
          + Tambah Kategori
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-bold tracking-wide">Nama Kategori</th>
              <th className="p-4 font-bold tracking-wide">Jumlah Produk</th>
              <th className="p-4 font-bold tracking-wide">Status</th>
              <th className="p-4 font-bold tracking-wide text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {categories.map(cat => (
              <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-900">{cat.name}</td>
                <td className="p-4 text-slate-600 font-medium">{cat._count?.products || 0} Produk</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${cat.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {cat.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openModal(cat)} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">Edit</button>
                  <button onClick={() => toggleStatus(cat)} className={`px-3 py-1 border rounded-lg font-medium transition-colors ${cat.isActive ? 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                    {cat.isActive ? "Matikan" : "Aktifkan"}
                  </button>
                  <button onClick={() => deleteCategory(cat)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">{editingCategory ? "Edit Kategori" : "Tambah Kategori"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-300">✕</button>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Kategori</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="Contoh: Non-Coffee" />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full py-4 mt-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
