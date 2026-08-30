import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  const sessions = await prisma.cashSession.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true } },
    },
  });

  const formatCurrency = (val: any) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));

  return (
    <div>
      <div className="flex justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Laporan Shift</h2>
          <p className="text-slate-500 mt-2 font-medium">Laporan buka tutup laci kasir dan pencocokan uang fisik.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm">
                <th className="p-4 font-bold tracking-wide">Sesi / Waktu</th>
                <th className="p-4 font-bold tracking-wide">Kasir</th>
                <th className="p-4 font-bold tracking-wide">Total Order</th>
                <th className="p-4 font-bold tracking-wide text-right">Modal Awal</th>
                <th className="p-4 font-bold tracking-wide text-right">Uang Seharusnya (Sistem)</th>
                <th className="p-4 font-bold tracking-wide text-right">Uang Fisik Aktual</th>
                <th className="p-4 font-bold tracking-wide text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sessions.map(session => {
                const isClosed = session.status === "CLOSED";
                const diff = Number(session.difference || 0);
                
                let diffStyle = "text-slate-500 font-medium";
                let diffLabel = "-";
                
                if (isClosed) {
                  if (diff === 0) {
                    diffStyle = "text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded";
                    diffLabel = "Seimbang (Rp 0)";
                  } else if (diff > 0) {
                    diffStyle = "text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded";
                    diffLabel = `Berlebih (+${formatCurrency(diff)})`;
                  } else {
                    diffStyle = "text-red-600 font-bold bg-red-50 px-2 py-1 rounded";
                    diffLabel = `Kurang (${formatCurrency(diff)})`;
                  }
                }

                return (
                  <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{new Date(session.startTime).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-xs text-slate-500 mt-1">{session.endTime ? `Selesai: ${new Date(session.endTime).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "SEDANG AKTIF"}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-900">{session.cashierName}</td>
                    <td className="p-4 text-slate-600 font-medium">{session._count.orders} Transaksi</td>
                    <td className="p-4 text-right font-medium text-slate-600">{formatCurrency(session.openingCash)}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{isClosed ? formatCurrency(session.expectedCash) : "-"}</td>
                    <td className="p-4 text-right font-bold text-slate-900">{isClosed ? formatCurrency(session.actualCash) : "-"}</td>
                    <td className="p-4 text-right">
                      <span className={diffStyle}>{diffLabel}</span>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">Belum ada riwayat shift yang tercatat.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
