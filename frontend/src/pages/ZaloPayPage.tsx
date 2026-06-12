import { useState } from 'react';
import { MaterialSymbol } from '../components/MaterialSymbol';

export function ZaloPayPage() {
  const [amount, setAmount] = useState('50000');

  return (
    <div className="space-y-gutter">
      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 flex flex-col justify-center lg:col-span-4">
          <h2 className="font-h2 text-primary">Quản lý Thu phí &amp; ZaloPay</h2>
          <p className="mt-1 text-on-surface-variant">POST /api/payments/zalopay/create — sandbox</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-white transition-colors hover:bg-tertiary"
            >
              <MaterialSymbol name="add" />
              Tạo phiếu thu
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 py-2 font-semibold text-on-surface transition-colors hover:bg-slate-50"
            >
              <MaterialSymbol name="file_download" />
              Xuất báo cáo
            </button>
          </div>
        </div>
        <div className="col-span-12 flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-lg text-center shadow-sm md:col-span-4 lg:col-span-2">
          <span className="mb-2 font-label-sm text-slate-500">Tổng học sinh</span>
          <span className="text-4xl font-black leading-none text-secondary">—</span>
        </div>
        <div className="col-span-12 flex flex-col justify-center rounded-xl border border-slate-100 bg-white p-lg shadow-sm md:col-span-4 lg:col-span-3">
          <div className="mb-2 flex items-start justify-between">
            <span className="font-label-sm text-slate-500">Đã thu trong tháng</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
              <MaterialSymbol name="check_circle" className="text-lg text-emerald-600" />
            </div>
          </div>
          <span className="text-2xl font-black text-on-background">—</span>
        </div>
        <div className="col-span-12 flex flex-col justify-center rounded-xl border border-slate-100 bg-white p-lg shadow-sm md:col-span-4 lg:col-span-3">
          <div className="mb-2 flex items-start justify-between">
            <span className="font-label-sm text-slate-500">Công nợ</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-error-container/30">
              <MaterialSymbol name="warning" className="text-lg text-error" />
            </div>
          </div>
          <span className="text-2xl font-black text-error">—</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 rounded-xl border border-slate-100 bg-white p-lg shadow-sm xl:col-span-8">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-lg py-md">
            <h3 className="font-h3 text-primary">Danh sách học phí (minh họa Stitch)</h3>
          </div>
          <p className="p-6 text-center text-slate-500">Bảng đầy đủ: nối GET /api/student-fee-assignments + billing-view.</p>
        </div>

        <div className="col-span-12 space-y-gutter xl:col-span-4">
          <div className="rounded-xl border border-slate-100 bg-white p-lg shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-secondary">Sandbox</p>
                <h3 className="font-h3 leading-tight text-primary">Thanh toán ZaloPay</h3>
              </div>
            </div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Học sinh</label>
            <input
              readOnly
              className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 text-sm"
              value="Chọn UUID học sinh (tích hợp sau)"
            />
            <label className="mb-1 block text-xs font-bold text-slate-500">Số tiền (VND)</label>
            <input
              className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="mb-2 h-32 w-32 rounded-lg bg-white p-2 shadow-inner">
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">QR</div>
              </div>
              <p className="text-center text-xs text-slate-500">Sau khi tạo đơn, hiển thị qrCode / mở orderUrl</p>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-primary-container py-3 font-bold text-white transition-colors hover:bg-tertiary-container"
            >
              Tạo đơn hàng ZaloPay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
