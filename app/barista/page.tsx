"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
};

type Order = {
  id: string;
  transactionNumber: string;
  cashierName: string;
  createdAt: string;
  items: OrderItem[];
};

export default function BaristaQueuePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Touch KDS States
  const [viewMode, setViewMode] = useState<"GRID" | "BATCH">("GRID");
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Auto-polling fetch pesanan setiap 4 detik
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/queue");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Gagal menarik antrean:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wrap to prevent linter from assuming synchronous state update
    Promise.resolve().then(() => fetchOrders());
    
    const fetchInterval = setInterval(fetchOrders, 4000);
    const timerInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(fetchInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const markAsServed = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await fetch("/api/queue", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: "COMPLETED" }),
      });
      if (res.ok) {
        setOrders(orders.filter(o => o.id !== orderId));
      } else {
        alert("Gagal memperbarui status");
      }
    } catch {
      alert("Kesalahan jaringan");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleItemCheck = (itemId: string) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Ringkasan Batch Item untuk Barista (Bantu racik borongan)
  const batchItems = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      if (!acc[item.productName]) {
        acc[item.productName] = 0;
      }
      acc[item.productName] += item.quantity;
    });
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 font-sans">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h1 className="text-sm font-bold tracking-wider text-slate-600 uppercase">Memuat Antrean Pesanan...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 sm:p-6 select-none overflow-x-hidden">
      
      {/* Header Kitchen Barista Clean Minimalist */}
      <header className="bg-white rounded-2xl p-4 sm:p-5 mb-6 border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/")}
            className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-700 font-black rounded-xl border border-slate-300 transition-all active:scale-95 shadow-sm flex items-center justify-center shrink-0"
            title="Kembali ke Layar Kasir"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3.5 pl-2 border-l border-slate-200">
            <div className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-sm shrink-0">
              ☕
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">Layar Antrean Barista</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  ● Live ({orders.length})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Kitchen Display System</p>
            </div>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
            <button
              onClick={() => setViewMode("GRID")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "GRID" 
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Daftar Struk ({orders.length})
            </button>
            <button
              onClick={() => setViewMode("BATCH")}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "BATCH" 
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Total Racikan ({Object.keys(batchItems).length})
            </button>
          </div>
        </div>
      </header>

      {/* View Mode 1: BATCH SUMMARY */}
      {viewMode === "BATCH" ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="mb-6 flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ringkasan Total Item Minuman</h2>
              <p className="text-xs text-slate-500 mt-0.5">Gabungan seluruh pesanan aktif untuk mempermudah racikan borongan.</p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs border border-slate-200">
              {Object.values(batchItems).reduce((a, b) => a + b, 0)} Porsi Total
            </span>
          </div>

          {Object.keys(batchItems).length === 0 ? (
            <p className="text-slate-400 py-12 text-center text-sm font-medium">Tidak ada antrean pesanan aktif.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(batchItems).map(([name, qty]) => (
                <div key={name} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <span className="font-bold text-slate-800 text-sm">{name}</span>
                  <span className="text-lg font-black text-slate-900 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
                    {qty}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (

      /* View Mode 2: PHYSICAL TICKET STUBS (KDS Cards) */
      orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[65vh] bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3 text-emerald-500 text-2xl border border-emerald-100">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-800">Semua Pesanan Selesai</h2>
          <p className="mt-1 text-xs text-slate-500">Belum ada transaksi baru dari kasir.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {orders.map((order) => {
            const date = new Date(order.createdAt);
            const timeString = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            const isProcessing = processingId === order.id;
            
            const elapsedMs = Math.max(0, currentTime.getTime() - date.getTime());
            const elapsedSec = Math.floor(elapsedMs / 1000);
            const m = Math.floor(elapsedSec / 60);
            const s = elapsedSec % 60;
            const elapsedStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            
            const isWarning = m >= 3 && m < 5;
            const isLate = m >= 5;

            return (
              <div 
                key={order.id} 
                className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-all shadow-sm ${
                  isLate 
                    ? "border-red-300 ring-2 ring-red-500/10" 
                    : isWarning 
                    ? "border-amber-300 ring-2 ring-amber-500/10" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Ticket Paper style */}
                <div className={`p-4 flex justify-between items-start border-b ${
                  isLate 
                    ? "bg-red-50 border-red-100 text-red-950" 
                    : isWarning 
                    ? "bg-amber-50 border-amber-100 text-amber-950" 
                    : "bg-slate-50 border-slate-100 text-slate-900"
                }`}>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Struk #</span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">{order.transactionNumber}</h3>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">Kasir: {order.cashierName}</span>
                  </div>

                  {/* Timer & Time */}
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">{timeString}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      isLate 
                        ? "bg-red-600 text-white" 
                        : isWarning 
                        ? "bg-amber-500 text-white" 
                        : "bg-white text-slate-800 border border-slate-200 shadow-sm"
                    }`}>
                      <span>⏱</span>
                      <span>{elapsedStr}</span>
                    </span>
                  </div>
                </div>

                {/* Items List with Clean Touch Checkbox */}
                <div className="p-4 flex-1 space-y-2 bg-white">
                  {order.items.map((item) => {
                    const isChecked = completedItems[item.id] || false;

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemCheck(item.id)}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all active:scale-[0.99] ${
                          isChecked 
                            ? "bg-slate-50 border-slate-200 opacity-50" 
                            : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/80"
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? "bg-slate-800 border-slate-800 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isChecked && (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Qty Badge */}
                        <span className={`px-2 py-0.5 rounded-md text-sm font-black shrink-0 ${
                          isChecked ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white"
                        }`}>
                          {item.quantity}x
                        </span>

                        {/* Product Title */}
                        <span className={`font-bold text-sm leading-tight ${isChecked ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {item.productName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Clean Large Touch Button */}
                <div className="p-3 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => markAsServed(order.id)}
                    disabled={isProcessing}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isProcessing 
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                        : "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white shadow-sm"
                    }`}
                  >
                    {isProcessing ? (
                      <span className="animate-pulse">Menyelesaikan...</span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Selesai & Sajikan
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )
      )}

    </div>
  );
}
