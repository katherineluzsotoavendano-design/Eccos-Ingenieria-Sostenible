
import React, { useState } from 'react';
import { FinancialRecord, OperationState, TransactionCategory, PaymentMode } from '../types';

interface Props {
  records: FinancialRecord[];
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
}

const ManagementTable: React.FC<Props> = ({ records, onUpdateRecord }) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filtered = records.filter(r => {
    const matchesText = r.vendor.toLowerCase().includes(filter.toLowerCase()) || 
                       r.invoiceNumber.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' ? true : r.category === categoryFilter;
    return matchesText && matchesCategory;
  });

  const handleTogglePaid = (record: FinancialRecord) => {
    if (record.isPaid) {
      onUpdateRecord(record.id, { isPaid: false, paidDate: undefined, operationState: OperationState.PENDIENTE });
    } else {
      const pDate = prompt("Ingrese la fecha de abono/pago (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
      if (pDate) {
        onUpdateRecord(record.id, { 
          isPaid: true, 
          paidDate: pDate, 
          operationState: OperationState.CONCILIADO 
        });
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase">Registro de Operaciones</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Auditoría de Facturación y Flujo de Efectivo</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-2 font-black text-[10px] uppercase outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="ALL">TODOS</option>
            <option value={TransactionCategory.INGRESO}>INGRESOS</option>
            <option value={TransactionCategory.EGRESO}>EGRESOS</option>
          </select>
          <input 
            type="text" 
            placeholder="Buscar entidad o línea..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-grow md:w-64 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-6 py-3 outline-none transition-all font-bold text-xs shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Emisión / Pago</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Entidad / Línea</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Factura vs Voucher</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Modo</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Caja / Cobro</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className={`hover:bg-slate-50/30 transition-colors group ${!record.isPaid && record.category === TransactionCategory.INGRESO ? 'bg-amber-50/20' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{record.date}</span>
                      {record.paidDate && (
                        <span className="text-[8px] font-black uppercase mt-1 text-green-600 bg-green-50 px-2 py-0.5 rounded w-fit">
                          Abono: {record.paidDate}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-xs truncate max-w-[200px] uppercase">{record.vendor}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {record.serviceLine || 'Gasto Operativo'} | {record.invoiceNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-black text-sm ${record.category === TransactionCategory.INGRESO ? 'text-green-600' : 'text-slate-800'}`}>
                        {record.amount.toLocaleString()} <span className="text-[9px] opacity-40">{record.currency}</span>
                      </span>
                      {record.voucherAmount && (
                        <span className="text-[9px] font-black text-indigo-500 uppercase">Voucher: {record.voucherAmount.toLocaleString()}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit ${record.paymentMode === PaymentMode.CREDITO ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {record.paymentMode || 'CONTADO'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${record.isPaid ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300 animate-pulse'}`}></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${record.isPaid ? 'text-green-600' : 'text-slate-400'}`}>
                        {record.isPaid ? 'PAGADO/ABONADO' : 'PENDIENTE'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => handleTogglePaid(record)}
                      className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${record.isPaid ? 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500' : 'bg-blue-600 text-white hover:bg-slate-900 shadow-lg shadow-blue-500/20'}`}
                    >
                      {record.isPaid ? 'Desmarcar' : 'Confirmar Abono'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagementTable;
