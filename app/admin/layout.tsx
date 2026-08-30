import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white p-6 shadow-xl z-10 shrink-0 flex flex-col">
        <h1 className="text-2xl font-black mb-10 leading-tight">
          Coffee POS<br/>
          <span className="text-sm font-medium text-slate-400 tracking-wide">Admin Dashboard</span>
        </h1>
        <nav className="space-y-3">
          <Link href="/admin" className="block py-3 px-4 rounded-xl hover:bg-slate-800 text-white font-bold transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/reports" className="block py-3 px-4 rounded-xl hover:bg-slate-800 text-white font-bold transition-colors">
            Laporan Penjualan
          </Link>
          <Link href="/admin/shifts" className="block py-3 px-4 rounded-xl hover:bg-slate-800 text-white font-bold transition-colors">
            Laporan Shift
          </Link>
          <Link href="/admin/products" className="block py-3 px-4 rounded-xl hover:bg-slate-800 text-white font-bold transition-colors">
            Produk
          </Link>
          <Link href="/admin/categories" className="block py-3 px-4 rounded-xl hover:bg-slate-800 text-white font-bold transition-colors">
            Kategori
          </Link>
        </nav>
        
        <div className="mt-auto pt-8">
           <Link href="/" className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 hover:text-white transition-colors text-sm">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
             </svg>
             Kembali ke Kasir
           </Link>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
