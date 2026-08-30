"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  categoryId: string;
  imageUrl?: string | null;
};

type SuccessOrder = {
  transactionNumber: string;
  paymentMethod: string;
  change?: number;
  createdAt: string | Date;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashReceived?: number;
  cashierName: string;
  items?: Array<{ quantity: number; productName: string; unitPrice: number }>;
};

type ClosedShift = {
  cashierName: string;
  openingCash: number;
  actualCash: number;
  expectedCash: number;
  difference: number;
  startTime: string | Date;
  endTime: string | Date;
};

export default function POSClient({
  categories,
  products,
  activeSession,
  user,
}: {
  categories: Category[];
  products: Product[];
  activeSession: { id: string; cashierName: string; openingCash: number } | null;
  user: { name?: string; email?: string; role?: string } | null;
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrder, setSuccessOrder] = useState<SuccessOrder | null>(null);

  // Shift States
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftAction, setShiftAction] = useState<"OPEN" | "CLOSE" | "RESUME">("OPEN");
  const [shiftCashInput, setShiftCashInput] = useState("");
  const [closedShift, setClosedShift] = useState<ClosedShift | null>(null);

  // Resume Shift Logic
  useEffect(() => {
    // Jangan munculkan modal Buka Shift jika pop-up Success Tutup Shift sedang tampil
    if (closedShift) return;

    if (!activeSession) {
      if (user?.role !== "ADMIN") {
        Promise.resolve().then(() => {
          setIsShiftModalOpen(true);
          setShiftAction("OPEN");
        });
      }
    } else {
      const hasResumed = sessionStorage.getItem("shift_resumed_" + activeSession.id);
      if (!hasResumed) {
        Promise.resolve().then(() => {
          setIsShiftModalOpen(true);
          setShiftAction("RESUME");
        });
      }
    }
  }, [activeSession, user?.role, closedShift]);

  const handleResumeShift = () => {
    if (activeSession) {
      sessionStorage.setItem("shift_resumed_" + activeSession.id, "true");
    }
    setIsShiftModalOpen(false);
  };

  const { items: cartItems, addItem, updateQuantity, getTotal, clearCart } = useCartStore();

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  const playSound = (type: "beep" | "success") => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === "beep") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Ignore if audio is not supported
    }
  };

  const handleProductClick = (product: Product) => {
    playSound("beep");
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const total = getTotal();
  const cashAmount = parseInt(cashReceived.replace(/\D/g, "") || "0", 10);
  const shiftCashAmount = parseInt(shiftCashInput.replace(/\D/g, "") || "0", 10);
  const change = cashAmount - total;
  const isCashSufficient = paymentMethod === "CASH" ? cashAmount >= total : true;

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      if (shiftAction === "OPEN") {
        const res = await fetch("/api/cash-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cashierName: user?.name || "Kasir", openingCash: shiftCashAmount }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.session?.id) {
            sessionStorage.setItem("shift_resumed_" + data.session.id, "true");
          }
          setIsShiftModalOpen(false);
          setShiftCashInput("");
          router.refresh();
        } else {
          const data = await res.json();
          alert(data.error);
        }
      } else {
        const res = await fetch("/api/cash-session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSession?.id, actualCash: shiftCashAmount }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsShiftModalOpen(false);
          setShiftCashInput("");
          setClosedShift(data.session);
          router.refresh();
        } else {
          const data = await res.json();
          alert(data.error);
        }
      }
    } catch {
      alert("Kesalahan jaringan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!isCashSufficient && paymentMethod === "CASH") return;

    setIsProcessing(true);
    try {
      const payload = {
        paymentMethod,
        cashReceived: paymentMethod === "CASH" ? cashAmount : undefined,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        playSound("success");
        setSuccessOrder(data.order);
        clearCart();
        setIsCheckoutOpen(false);
        setCashReceived("");
        setPaymentMethod("CASH");
      } else {
        alert("Gagal memproses transaksi: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900 relative print:hidden">
      {/* ... Kiri: Kategori ... */}
      <aside className="w-24 md:w-32 bg-white border-r border-slate-200 shrink-0 z-10 shadow-sm flex flex-col h-full">
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full py-4 px-2 rounded-xl text-sm font-bold transition-colors ${
              selectedCategory === null
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full py-4 px-2 rounded-xl text-sm font-bold transition-colors ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        
        {/* Module Switcher */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => router.push("/barista")}
            className="w-full py-4 flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm active:scale-95"
          >
            <span className="text-xl">☕</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-center">Dapur<br/>Barista</span>
          </button>
        </div>
      </aside>

      {/* ... Tengah: Produk ... */}
      <main className="flex-1 h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Menu Utama</h1>
            <p className="text-slate-500 mt-1 font-medium">Pilih produk untuk pesanan.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{activeSession ? "Shift Aktif" : "Shift Tutup"}</p>
              <p className="text-xs text-slate-500">Kasir: {activeSession?.cashierName || user?.name || "-"}</p>
            </div>
            
            <div className="group relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold cursor-pointer">
                {(activeSession?.cashierName || user?.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                {user?.role === "ADMIN" && (
                  <button onClick={() => router.push("/admin")} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100">
                    Dashboard Admin
                  </button>
                )}
                <button onClick={async () => {
                  const { authClient } = await import("@/lib/auth-client");
                  await authClient.signOut();
                  sessionStorage.clear();
                  router.push("/login");
                }} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">
                  Logout
                </button>
              </div>
            </div>

            {activeSession ? (
              <button 
                onClick={() => { setShiftAction("CLOSE"); setShiftCashInput(""); setIsShiftModalOpen(true); }}
                className="ml-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors"
              >
                Tutup Shift
              </button>
            ) : (
              <button 
                onClick={() => { setShiftAction("OPEN"); setShiftCashInput(""); setIsShiftModalOpen(true); }}
                className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Buka Shift
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex flex-col hover:border-indigo-300 hover:shadow-md active:scale-[0.98] transition-all text-left h-full"
            >
              {product.imageUrl ? (
                <div className="w-full aspect-square rounded-xl mb-3 overflow-hidden border border-slate-100 bg-slate-50 relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:bg-slate-100 transition-colors border border-slate-100 shrink-0">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col flex-1 justify-between">
                <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 mb-1">{product.name}</h3>
                <p className="text-indigo-600 font-black">{formatCurrency(product.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* ... Kanan: Cart ... */}
      <aside className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <header className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Pesanan Saat Ini</h2>
          <p className="text-sm text-slate-500 mt-1">#ORD-DRAFT</p>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3">
           {cartItems.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
               </svg>
               <p className="font-medium">Keranjang kosong</p>
             </div>
           ) : (
             cartItems.map((item) => (
               <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900 leading-tight pr-2">{item.name}</p>
                    <p className="text-sm font-bold text-indigo-600 whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-100">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 font-bold active:scale-95 transition-transform">
                        -
                      </button>
                      <span className="w-4 text-center font-bold text-slate-900 text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 font-bold active:scale-95 transition-transform">
                        +
                      </button>
                    </div>
                  </div>
               </div>
             ))
           )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 space-y-4">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="font-medium text-slate-900">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xl font-black">
            <span className="text-slate-900">Total</span>
            <span className="text-indigo-600">{formatCurrency(total)}</span>
          </div>
          <button 
            disabled={cartItems.length === 0 || !activeSession}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!activeSession ? "Buka Shift Dulu" : "Proses Pembayaran"}
          </button>
        </div>
      </aside>

      {/* Modal Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <header className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-2xl font-bold text-slate-900">Pembayaran</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-300">
                ✕
              </button>
            </header>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 font-medium text-lg">Total Tagihan</span>
                <span className="text-3xl font-black text-indigo-600">{formatCurrency(total)}</span>
              </div>

              {/* Toggle Payment Method */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setPaymentMethod("CASH")}
                  className={`flex-1 py-3 text-center rounded-lg font-bold transition-all ${
                    paymentMethod === "CASH" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tunai (CASH)
                </button>
                <button
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`flex-1 py-3 text-center rounded-lg font-bold transition-all ${
                    paymentMethod === "QRIS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  QRIS
                </button>
              </div>

              {paymentMethod === "CASH" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Uang Diterima</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                      <input
                        type="text"
                        value={cashReceived}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setCashReceived(val ? new Intl.NumberFormat("id-ID").format(parseInt(val, 10)) : "");
                        }}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  {cashAmount > 0 && (
                    <div className={`p-4 rounded-xl flex justify-between font-bold text-lg ${change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      <span>Kembalian</span>
                      <span>{change >= 0 ? formatCurrency(change) : "Uang Kurang"}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="w-48 h-48 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                     <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                     </svg>
                  </div>
                  <p className="text-slate-500 font-medium text-center">Minta pelanggan scan QRIS ini.<br/>(Simulasi: Tekan Bayar jika pelanggan sudah scan)</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={handleCheckout}
                disabled={isProcessing || !isCashSufficient}
                className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Memproses..." : `Konfirmasi Pembayaran ${paymentMethod}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-emerald-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
             <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Transaksi Sukses!</h3>
             <p className="text-slate-500 font-medium mb-6">Order ID:<br/><span className="text-slate-900 font-bold">{successOrder.transactionNumber}</span></p>
             
             {successOrder.paymentMethod === "CASH" && (
                <div className="bg-slate-50 p-4 rounded-xl mb-6">
                  <p className="text-sm text-slate-500 font-medium mb-1">Kembalian Pelanggan:</p>
                  <p className="text-2xl font-black text-indigo-600">{formatCurrency(successOrder.change || 0)}</p>
                </div>
             )}
             
             <button onClick={() => setSuccessOrder(null)} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
               Selesai & Transaksi Baru
             </button>
             <button onClick={() => window.print()} className="w-full mt-3 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Struk
              </button>
           </div>
        </div>
      )}

      {/* Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative">
            <header className="p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {shiftAction === "OPEN" ? "Buka Shift" : shiftAction === "RESUME" ? "Lanjutkan Shift" : "Tutup Shift"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {shiftAction === "OPEN" 
                      ? "Masukkan data kasir dan modal laci." 
                      : shiftAction === "RESUME" 
                      ? "Ada shift yang sedang berjalan." 
                      : "Hitung uang fisik di laci saat ini."}
                  </p>
                </div>
                {user?.role === "ADMIN" && (shiftAction === "OPEN" || shiftAction === "RESUME") && (
                  <button onClick={() => setIsShiftModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-300">
                    ✕
                  </button>
                )}
              </div>
            </header>
            {shiftAction === "RESUME" ? (
              <div className="p-6 space-y-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-emerald-900">Shift Aktif Ditemukan</p>
                  <p className="text-sm text-emerald-700 mt-1">Kasir: <span className="font-black">{activeSession?.cashierName}</span></p>
                  <p className="text-sm text-emerald-700">Modal Awal: <span className="font-black">{formatCurrency(activeSession?.openingCash || 0)}</span></p>
                </div>
                <button 
                  onClick={handleResumeShift}
                  className="w-full py-4 mt-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg"
                >
                  Ya, Lanjutkan Shift
                </button>
                <button 
                  onClick={() => {
                    setShiftAction("CLOSE");
                    setShiftCashInput("");
                  }}
                  className="w-full py-3 mt-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  Tutup Shift Ini
                </button>
              </div>
            ) : (
            <form onSubmit={handleShiftSubmit} className="p-6 space-y-4">
              {shiftAction === "OPEN" && (
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-200 text-indigo-700 font-bold flex items-center justify-center">
                    {(user?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Kasir Shift Ini</p>
                    <p className="text-sm font-bold text-indigo-900">{user?.name || "Kasir"}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{shiftAction === "OPEN" ? "Modal Awal (Rp)" : "Uang Fisik di Laci (Rp)"}</label>
                <input 
                  required 
                  type="text" 
                  value={shiftCashInput} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "");
                    setShiftCashInput(val ? new Intl.NumberFormat("id-ID").format(parseInt(val, 10)) : "");
                  }} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none" 
                  placeholder="0" 
                />
              </div>
              <button disabled={isProcessing} type="submit" className="w-full py-4 mt-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50">
                {isProcessing ? "Memproses..." : shiftAction === "OPEN" ? "Buka Shift Sekarang" : "Konfirmasi Tutup Shift"}
              </button>
              {user?.role === "ADMIN" && shiftAction === "OPEN" && (
                <button 
                  type="button"
                  onClick={() => router.push('/admin')}
                  className="w-full py-3 mt-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  Lewati & Ke Dasbor Admin
                </button>
              )}
            </form>
            )}
          </div>
        </div>
      )}

      {/* Closed Shift Success Modal */}
      {closedShift && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:hidden">
           <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
             <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
             </div>
             <h3 className="text-2xl font-black text-slate-900 mb-2">Shift Ditutup!</h3>
             <p className="text-slate-500 font-medium mb-6">Kasir: <span className="text-slate-900 font-bold">{closedShift.cashierName}</span></p>
             
             <div className="bg-slate-50 p-4 rounded-xl mb-6 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Uang Laci (Fisik)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(closedShift.actualCash)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Uang Sistem</span>
                  <span className="font-bold text-slate-900">{formatCurrency(closedShift.expectedCash)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold">
                  <span className="text-slate-700">Selisih</span>
                  <span className={Number(closedShift.difference) === 0 ? "text-emerald-600" : Number(closedShift.difference) > 0 ? "text-blue-600" : "text-red-600"}>
                    {Number(closedShift.difference) > 0 ? "+" : ""}{formatCurrency(closedShift.difference)}
                  </span>
                </div>
             </div>
             
             <button onClick={() => setClosedShift(null)} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
               Selesai
             </button>
             <button onClick={() => window.print()} className="w-full mt-3 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Bukti Shift
              </button>
           </div>
        </div>
      )}
    </div>

    {/* Receipt Template (Hanya muncul saat diprint) */}
    {(successOrder || closedShift) && (
      <div className="hidden print:block w-[80mm] mx-auto text-black bg-white font-mono text-[12px] leading-[1.4] p-4">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 0; size: auto; }
            body { margin: 0cm; padding: 0cm; }
          }
        `}} />
        
        <div className="text-center mb-6 mt-4">
          <h1 className="text-[20px] font-black uppercase tracking-widest mb-1">COFFEE POS</h1>
          <p className="text-[10px] uppercase tracking-wide">Jl. Kopi Harum No. 88, Senopati</p>
          <p className="text-[10px] uppercase tracking-wide">Instagram: @coffeepos</p>
        </div>

        {successOrder ? (
          <>
            <div className="flex justify-between border-b-2 border-black border-dashed pb-3 mb-3 text-[11px]">
              <div>
                <p>KASIR: {successOrder.cashierName}</p>
                <p>WAKTU: {new Date(successOrder.createdAt).toLocaleString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right">
                <p>ORDER ID</p>
                <p className="font-bold">{successOrder.transactionNumber}</p>
              </div>
            </div>

            <div className="border-b-2 border-black border-dashed pb-3 mb-3">
              <table className="w-full">
                <tbody>
                  {successOrder.items?.map((item, i) => (
                    <tr key={i} className="align-top">
                      <td className="w-6 py-1">{item.quantity}x</td>
                      <td className="py-1 font-bold uppercase">{item.productName}</td>
                      <td className="text-right py-1">{formatCurrency(item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 mb-4 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>{formatCurrency(successOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[14px] font-black mt-2 pt-2 border-t border-black">
                <span>TOTAL</span>
                <span>{formatCurrency(successOrder.total)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span>{successOrder.paymentMethod === 'CASH' ? 'TUNAI' : 'QRIS'}</span>
                <span>{formatCurrency(successOrder.paymentMethod === 'CASH' ? (successOrder.total + (successOrder.change || 0)) : successOrder.total)}</span>
              </div>
              {successOrder.paymentMethod === 'CASH' && (
                <div className="flex justify-between">
                  <span>KEMBALI</span>
                  <span>{formatCurrency(successOrder.change || 0)}</span>
                </div>
              )}
            </div>
          </>
        ) : closedShift ? (
          <>
            <div className="flex justify-between border-b-2 border-black border-dashed pb-3 mb-3 text-[11px]">
              <div>
                <p className="font-black text-[14px] mb-1">LAPORAN SHIFT</p>
                <p>KASIR: {closedShift.cashierName}</p>
              </div>
              <div className="text-right">
                <p>{new Date().toLocaleString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                <p className="font-bold">{new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-[11px]">
              <div className="flex justify-between">
                <span>WAKTU BUKA</span>
                <span>{new Date(closedShift.startTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>WAKTU TUTUP</span>
                <span>{new Date(closedShift.endTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className="flex justify-between mt-4 border-t border-black border-dashed pt-2">
                <span>MODAL AWAL</span>
                <span>{formatCurrency(closedShift.openingCash)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>UANG SISTEM</span>
                <span>{formatCurrency(closedShift.expectedCash)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>UANG FISIK (LACI)</span>
                <span>{formatCurrency(closedShift.actualCash)}</span>
              </div>
              
              <div className="flex justify-between text-[14px] font-black mt-2 pt-2 border-t border-black">
                <span>SELISIH</span>
                <span>{Number(closedShift.difference) > 0 ? "+" : ""}{formatCurrency(closedShift.difference)}</span>
              </div>
            </div>
          </>
        ) : null}

        <div className="text-center mt-8">
          <svg className="w-full h-8 mb-2" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path d="M0 0h2v20H0zM4 0h1v20H4zM7 0h3v20H7zM12 0h1v20h-1zM15 0h4v20h-4zM21 0h2v20h-2zM25 0h1v20h-1zM28 0h3v20h-3zM33 0h1v20h-1zM36 0h4v20h-4zM42 0h2v20h-2zM46 0h1v20h-1zM49 0h3v20h-3zM54 0h1v20h-1zM57 0h4v20h-4zM63 0h2v20h-2zM67 0h1v20h-1zM70 0h3v20h-3zM75 0h1v20h-1zM78 0h4v20h-4zM84 0h2v20h-2zM88 0h1v20h-1zM91 0h3v20h-3zM96 0h1v20h-1zM99 0h1v20h-1z" fill="currentColor" />
          </svg>
          <p className="text-[10px] font-bold tracking-widest">{successOrder ? "TERIMA KASIH" : "TUTUP SHIFT SELESAI"}</p>
        </div>
      </div>
    )}
    </>
  );
}
