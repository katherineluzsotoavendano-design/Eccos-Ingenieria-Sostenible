
import React, { useState } from 'react';
import { FinancialRecord, OperationState, TransactionCategory, UserRole, PaymentMode } from '../types';

interface Props {
  records: FinancialRecord[];
  userRole: UserRole;
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
  onDeleteRecord?: (record: FinancialRecord) => void;
  onDeleteAll?: () => void;
}

const ManagementTable: React.FC<Props> = ({ records, userRole, onUpdateRecord, onDeleteRecord, onDeleteAll }) => {
  const [filter, setFilter] = useState('');
  const isManager = userRole === 'Gerente General';
  
  const filtered = records.filter(r => {
    return r.vendor.toLowerCase().includes(filter.toLowerCase()) || 
           r.invoiceNumber.toLowerCase().includes(filter.toLowerCase());
  });

  const handleUpdateTreasury = (id: string, field: string, value: any) => {
    onUpdateRecord(id, { [field]: value });
  };

  const getStateStyle = (state: OperationState) => {
    switch (state) {
      case OperationState.APROBADO: return 'bg-[#a6ce39]/10 text-[#a6ce39] border-[#a6ce39]/20';
      case OperationState.RECHAZADO: return 'bg-red-50 text-red-600 border-red-100';
      case OperationState.EN_REVISION: return 'bg-[#00838f]/10 text-[#00838f] border-[#00838f]/20 animate-pulse';
      case OperationState.CONCILIADO: return 'bg-[#263238] text-white border-[#263238]';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#263238] italic">Módulo de Tesorería</h2>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em] mt-2">Gestión de Créditos y Detracciones ECCOS</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
             <input 
              type="text" 
              placeholder="Buscar Factura o Entidad..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full md:w-72 bg-white border-2 border-slate-100 focus:border-[#00838f] rounded-2xl px-6 py-3 outline-none font-bold text-[12px] shadow-sm transition-all"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-3.5 w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          {isManager && onDeleteAll && (
            <button 
              onClick={onDeleteAll}
              className="bg-red-50 text-red-600 border-2 border-red-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              LIMPIAR AUDITORÍA
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-slate-400">Entidad / Clasificación</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-slate-400">Importe Total</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado Auditoría</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-slate-400">Tesorería (Seguimiento Pagos)</th>
                <th className="px-8 py-7 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Documentación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/40 transition-all">
                  <td className="px-8 py-7">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded text-[8px] font-black text-white ${record.category === TransactionCategory.INGRESO ? 'bg-[#00838f]' : 'bg-[#a6ce39]'}`}>
                          {record.category}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">📂 {record.folderPath?.join(' / ')}</span>
                      </div>
                      <span className="font-black text-[#263238] text-[13px] uppercase leading-tight">{record.vendor}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{record.invoiceNumber} • {record.paymentMode === PaymentMode.CREDITO ? 'PAGO DIFERIDO' : 'PAGO DIRECTO'}</span>
                    </div>
                  </td>
                  
                  <td className="px-8 py-7 font-black text-[14px] whitespace-nowrap text-[#263238]">
                    {record.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })} <span className="text-[10px] font-bold opacity-30">{record.currency}</span>
                  </td>

                  <td className="px-8 py-7">
                    <div className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border inline-block shadow-sm ${getStateStyle(record.operationState)}`}>
                      {record.operationState}
                    </div>
                  </td>

                  <td className="px-8 py-7">
                    <div className="flex flex-col gap-3 min-w-[240px]">
                      {record.paymentMode === PaymentMode.CREDITO && (
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${record.isCreditPaid ? 'bg-[#a6ce39]/10 border-[#a6ce39]/20' : 'bg-slate-50 border-slate-100'}`}>
                          <input 
                            type="checkbox" 
                            checked={record.isCreditPaid} 
                            onChange={(e) => handleUpdateTreasury(record.id, 'isCreditPaid', e.target.checked)}
                            className="w-5 h-5 accent-[#00838f] cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase">{record.category === TransactionCategory.INGRESO ? 'FACTURA COBRADA' : 'FACTURA PAGADA'}</span>
                            <input 
                              type="date" 
                              value={record.creditPaymentDate || ''} 
                              onChange={(e) => handleUpdateTreasury(record.id, 'creditPaymentDate', e.target.value)}
                              className="bg-transparent text-[11px] font-black outline-none border-none p-0 text-[#00838f] cursor-pointer mt-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {record.detractionAmount > 0 && (
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${record.isDetractionPaid ? 'bg-[#00838f]/10 border-[#00838f]/20' : 'bg-slate-50 border-slate-100'}`}>
                          <input 
                            type="checkbox" 
                            checked={record.isDetractionPaid} 
                            onChange={(e) => handleUpdateTreasury(record.id, 'isDetractionPaid', e.target.checked)}
                            className="w-5 h-5 accent-[#a6ce39] cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase">Detracción S/. {record.detractionAmount}</span>
                            <input 
                              type="date" 
                              value={record.detractionPaymentDate || ''} 
                              onChange={(e) => handleUpdateTreasury(record.id, 'detractionPaymentDate', e.target.value)}
                              className="bg-transparent text-[11px] font-black outline-none border-none p-0 text-[#a6ce39] cursor-pointer mt-0.5"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-8 py-7 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {record.driveUrl && (
                        <a href={record.driveUrl} target="_blank" rel="noreferrer" className="bg-[#00838f]/5 text-[#00838f] p-4 rounded-2xl hover:bg-[#00838f] hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </a>
                      )}
                      
                      {isManager && (
                        <button 
                          onClick={() => onDeleteRecord?.(record)} 
                          className="bg-red-50 text-red-600 p-4 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      )}
                    </div>
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
