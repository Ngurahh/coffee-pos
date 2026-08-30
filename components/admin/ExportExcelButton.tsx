"use client";
import * as xlsx from "xlsx";

export default function ExportExcelButton({ data, filename = "Laporan_Transaksi" }: { data: any[]; filename?: string }) {
  const exportToExcel = () => {
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Laporan");
    xlsx.writeFile(workbook, `${filename}.xlsx`);
  };

  return (
    <button 
      onClick={exportToExcel} 
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-colors flex items-center gap-2 active:scale-95"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export Excel
    </button>
  );
}
