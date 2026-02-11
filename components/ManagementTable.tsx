
import React, { useState } from 'react';
import { FinancialRecord, OperationState, TransactionCategory, PaymentMode } from '../types';

interface Props {
  records: FinancialRecord[];
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
}

const ManagementTable: React.FC<Props> = ({ records, onUpdateRecord }) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const getMonthName = (dateStr: string) => {
    const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const monthIndex = parseInt(dateStr.split('-')[1]) - 1;
    return months[monthIndex] || "OTROS";
  };

  const filtered = records.filter(r => {
    const matchesText = r.vendor.toLowerCase().includes(filter.toLowerCase()) || 
                       r.invoiceNumber.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' ? true : r.category === categoryFilter;
    return matchesText && matchesCategory;
  });

  const handleTogglePaid = (record: FinancialRecord) => {
    if (record.isPaid) {
      if (confirm("¿Seguro que desea revertir el estado de pago?")) {
        onUpdateRecord(record.id, { isPaid: false, paidDate: undefined, operationState: OperationState.PENDIENTE });
      }
    } else {
      const pDate = prompt("Confirmación de Abono: Ingrese la fecha (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
      if (pDate) {
        onUpdateRecord(record.id, { isPaid: true, paidDate: pDate, operationState: OperationState.CONCILIADO });
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none">Auditoría Digital</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Documentos organizados por periodo mensual</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Buscar..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-grow md:w-64 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-6 py-3 outline-none font-bold text-xs shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Emisión</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Documento</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Entidad / Factura</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Monto</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-800 text-sm">{record.date}</td>
                  <td className="px-8 py-6">
                    {record.driveUrl ? (
                      <a 
                        href={record.driveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-600 hover:bg-blue-700 transition-all shadow-sm block text-center"
                      >
                        Ver Documento 📄
                      </a>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 block text-center">
                        📂 {getMonthName(record.date)}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-xs uppercase">{record.vendor}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{record.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-sm">
                    {record.amount.toLocaleString()} <span className="text-[9px] opacity-40">{record.currency}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => handleTogglePaid(record)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${record.isPaid ? 'bg-green-100 text-green-600' : 'bg-slate-900 text-white'}`}
                    >
                      {record.isPaid ? 'Conciliado' : 'Pendiente'}
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
