"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };
type Product = { id: string; name: string; sku: string; price: number; categoryId: string; isActive: boolean; imageUrl?: string | null; category: Category };

export default function ProductManager({ initialProducts, categories }: { initialProducts: Product[]; categories: Category[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", sku: "", price: "", categoryId: categories[0]?.id || "", imageUrl: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ name: product.name, sku: product.sku, price: product.price.toString(), categoryId: product.categoryId, imageUrl: product.imageUrl || "" });
      setImagePreview(product.imageUrl || null);
    } else {
      setEditingProduct(null);
      setFormData({ name: "", sku: "", price: "", categoryId: categories[0]?.id || "", imageUrl: "" });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let finalImageUrl = formData.imageUrl;

    // Upload gambar dulu jika ada file yang dipilih
    if (imageFile) {
      const uploadData = new FormData();
      uploadData.append("file", imageFile);

      try {
        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          finalImageUrl = uploadResult.url;
        } else {
          alert("Gagal mengunggah gambar: " + uploadResult.error);
          setIsSubmitting(false);
          return;
        }
      } catch {
        alert("Kesalahan jaringan saat unggah gambar");
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      id: editingProduct?.id,
      name: formData.name,
      sku: formData.sku || undefined,
      price: Number(formData.price),
      categoryId: formData.categoryId,
      imageUrl: finalImageUrl || undefined,
    };

    try {
      const res = await fetch("/api/admin/products", {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        router.refresh(); // Refresh server component data
        
        // Update local state for immediate feedback
        if (editingProduct) {
          setProducts(products.map(p => p.id === data.product.id ? { ...data.product, price: Number(data.product.price), category: categories.find(c => c.id === data.product.categoryId) } : p));
        } else {
          setProducts([...products, { ...data.product, price: Number(data.product.price), category: categories.find(c => c.id === data.product.categoryId) }]);
        }
      } else {
        const errorDetails = data.details ? JSON.stringify(data.details) : data.message || "";
        alert(`${data.error} \n\n${errorDetails}`);
      }
    } catch {
      alert("Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...product, isActive: !product.isActive }),
      });
      if (res.ok) {
        setProducts(products.map(p => p.id === product.id ? { ...p, isActive: !p.isActive } : p));
        router.refresh();
      }
    } catch {
      alert("Gagal mengubah status");
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Hapus permanen produk "${product.name}"?\nCatatan: Produk yang sudah pernah terjual tidak akan bisa dihapus.`)) return;
    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(products.filter(p => p.id !== product.id));
        router.refresh();
      } else {
        alert(data.error);
      }
    } catch {
      alert("Kesalahan jaringan saat menghapus produk");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Produk</h2>
          <p className="text-slate-500 mt-2 font-medium">Tambah, ubah, atau nonaktifkan produk di menu.</p>
        </div>
        <button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-xl shadow-sm transition-colors active:scale-95">
          + Tambah Produk
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm">
              <th className="p-4 font-bold tracking-wide">SKU</th>
              <th className="p-4 font-bold tracking-wide">Nama Produk</th>
              <th className="p-4 font-bold tracking-wide">Kategori</th>
              <th className="p-4 font-bold tracking-wide">Harga</th>
              <th className="p-4 font-bold tracking-wide">Status</th>
              <th className="p-4 font-bold tracking-wide text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {products.map(product => (
              <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-500">{product.sku}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <span className="font-bold text-slate-900">{product.name}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">{product.category.name}</td>
                <td className="p-4 font-bold text-indigo-600">{formatCurrency(product.price)}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${product.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2 whitespace-nowrap">
                  <button onClick={() => openModal(product)} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">Edit</button>
                  <button onClick={() => toggleStatus(product)} className={`px-3 py-1 border rounded-lg font-medium transition-colors ${product.isActive ? 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                    {product.isActive ? "Matikan" : "Aktifkan"}
                  </button>
                  <button onClick={() => deleteProduct(product)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-300">✕</button>
            </header>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Image Upload Area */}
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative overflow-hidden group hover:border-indigo-400 transition-colors cursor-pointer">
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {imagePreview ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">Ubah</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-sm font-bold text-slate-700 block">Klik untuk pilih foto</span>
                    <span className="text-xs text-slate-500 font-medium">PNG, JPG up to 2MB</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Produk</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Harga (Rp)</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Kategori</label>
                <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full py-4 mt-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
