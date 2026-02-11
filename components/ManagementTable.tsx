
import React, { useState } from 'react';
import { FinancialRecord, OperationState, TransactionCategory } from '../types';

interface Props {
  records: FinancialRecord[];
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
}

const ManagementTable: React.FC<Props> = ({ records, onUpdateRecord }) => {
  const [filter, setFilter] = useState('');

  const filtered = records.filter(r => 
    r.vendor.toLowerCase().includes(filter.toLowerCase()) || 
    r.invoiceNumber.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase">Gestión de Tesorería</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Historial completo de operaciones auditadas</p>
        </div>
        <div className="w-full md:w-80 relative">
          <input 
            type="text" 
            placeholder="Buscar por proveedor o factura..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-[20px] px-6 py-3 outline-none transition-all font-bold text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fecha</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entidad / Vendor</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Categoría</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monto</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estado</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6 font-bold text-slate-500 text-sm">{record.date}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800">{record.vendor}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{record.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${record.category === TransactionCategory.INGRESO ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {record.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`font-black text-lg ${record.category === TransactionCategory.INGRESO ? 'text-green-600' : 'text-slate-800'}`}>
                      {record.category === TransactionCategory.EGRESO ? '-' : '+'}{record.amount.toLocaleString()} <span className="text-[10px] ml-1 opacity-40">{record.currency}</span>
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        record.operationState === OperationState.CONCILIADO ? 'bg-green-500' : 
                        record.operationState === OperationState.OBSERVADO ? 'bg-red-500' : 'bg-amber-400'
                      }`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{record.operationState}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {record.operationState === OperationState.PENDIENTE && (
                        <button 
                          onClick={() => onUpdateRecord(record.id, { operationState: OperationState.OBSERVADO })}
                          className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                          title="Marcar como Observado"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </button>
                      )}
                      <button 
                        className="p-2 hover:bg-blue-50 text-blue-400 rounded-lg transition-colors"
                        title="Ver Documento"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                       <p className="font-black uppercase tracking-[0.2em] text-xs">No se encontraron registros</p>
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
