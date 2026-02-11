
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
      if (confirm("¿Seguro que desea revertir el estado de pago? Esto afectará el Flujo de Caja neto.")) {
        onUpdateRecord(record.id, { isPaid: false, paidDate: undefined, operationState: OperationState.PENDIENTE });
      }
    } else {
      const pDate = prompt("Confirmación de Abono: Ingrese la fecha de ingreso a cuenta (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
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
          <h2 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none">Módulo de Gestión</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Auditoría de Documentos y Control de Abonos</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 font-black text-[10px] uppercase outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="ALL">TODOS</option>
            <option value={TransactionCategory.INGRESO}>INGRESOS (VENTAS)</option>
            <option value={TransactionCategory.EGRESO}>EGRESOS (GASTOS)</option>
          </select>
          <input 
            type="text" 
            placeholder="Buscar por cliente o factura..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-grow md:w-80 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-6 py-3 outline-none transition-all font-bold text-xs shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Emisión / Abono</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Entidad / Línea</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Montos (Fact vs Vou)</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Modo Pago</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Estado Caja</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className={`hover:bg-slate-50/30 transition-colors group ${!record.isPaid && record.category === TransactionCategory.INGRESO ? 'bg-amber-50/10' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{record.date}</span>
                      {record.isPaid ? (
                        <span className="text-[8px] font-black uppercase mt-1 text-green-600 bg-green-50 px-2 py-0.5 rounded w-fit border border-green-100">
                          Cobrado: {record.paidDate}
                        </span>
                      ) : (
                        <span className="text-[8px] font-black uppercase mt-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-xs truncate max-w-[200px] uppercase leading-tight">{record.vendor}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                        {record.serviceLine || 'Gasto General'} | {record.invoiceNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-black text-sm ${record.category === TransactionCategory.INGRESO ? 'text-blue-600' : 'text-slate-800'}`}>
                        {record.amount.toLocaleString()} <span className="text-[9px] opacity-40">{record.currency}</span>
                      </span>
                      {record.voucherAmount && (
                        <span className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                          Vouc: {record.voucherAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest w-fit border ${record.paymentMode === PaymentMode.CREDITO ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {record.paymentMode || 'CONTADO'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${record.isPaid ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${record.isPaid ? 'text-green-600' : 'text-slate-400'}`}>
                        {record.isPaid ? 'CONCILIADO' : 'POR COBRAR'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => handleTogglePaid(record)}
                      className={`px-6 py-2.5 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${record.isPaid ? 'bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500' : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-blue-500/20'}`}
                    >
                      {record.isPaid ? 'Revertir' : 'Confirmar Abono'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <p className="mt-4 font-black uppercase tracking-widest text-xs">Sin registros que coincidan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagementTable;
