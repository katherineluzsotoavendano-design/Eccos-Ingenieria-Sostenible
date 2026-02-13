
import React, { useState } from 'react';
import { FinancialRecord, OperationState, TransactionCategory, UserRole } from '../types';

interface Props {
  records: FinancialRecord[];
  userRole: UserRole;
  onUpdateRecord: (id: string, updates: Partial<FinancialRecord>) => void;
}

const ManagementTable: React.FC<Props> = ({ records, userRole, onUpdateRecord }) => {
  const [filter, setFilter] = useState('');
  const isManager = userRole === 'Gerente General';
  
  const filtered = records.filter(r => {
    return r.vendor.toLowerCase().includes(filter.toLowerCase()) || 
           r.invoiceNumber.toLowerCase().includes(filter.toLowerCase());
  });

  const handleApprove = (record: FinancialRecord) => {
    if (confirm(`¿Aprobar documento ${record.invoiceNumber} para pago?`)) {
      onUpdateRecord(record.id, { 
        operationState: OperationState.APROBADO,
        approvedBy: 'Gerencia' 
      });
    }
  };

  const handleReject = (record: FinancialRecord) => {
    const reason = prompt("Indique el motivo del rechazo:");
    if (reason) {
      onUpdateRecord(record.id, { 
        operationState: OperationState.RECHAZADO,
        rejectionReason: reason
      });
    }
  };

  const getStateStyle = (state: OperationState) => {
    switch (state) {
      case OperationState.APROBADO: return 'bg-green-100 text-green-700 border-green-200';
      case OperationState.RECHAZADO: return 'bg-red-100 text-red-700 border-red-200';
      case OperationState.EN_REVISION: return 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse';
      case OperationState.CONCILIADO: return 'bg-slate-900 text-white border-slate-900';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Módulo de Aprobaciones</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Control de Calidad Fiscal</p>
        </div>
        <input 
          type="text" 
          placeholder="Buscar factura o entidad..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full md:w-80 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-6 py-3 outline-none font-bold text-xs"
        />
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Entidad</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Carpeta Drive</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Monto</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(record => (
                <tr key={record.id} className="hover:bg-slate-50/30 transition-all">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 text-xs uppercase">{record.vendor}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">{record.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-lg uppercase">
                      📂 {record.folderPath ? record.folderPath[0] : 'SIN RUTA'}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-black text-sm">
                    {record.amount.toLocaleString()} <span className="text-[9px] opacity-40">{record.currency}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase border inline-block ${getStateStyle(record.operationState)}`}>
                      {record.operationState}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    {record.driveUrl && (
                      <a href={record.driveUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 p-2 inline-block">
                        📄
                      </a>
                    )}
                    {isManager && record.operationState === OperationState.EN_REVISION && (
                      <>
                        <button onClick={() => handleApprove(record)} className="bg-green-600 text-white p-2 rounded-lg text-[9px] font-black hover:bg-green-700">APROBAR</button>
                        <button onClick={() => handleReject(record)} className="bg-red-600 text-white p-2 rounded-lg text-[9px] font-black hover:bg-red-700">RECHAZAR</button>
                      </>
                    )}
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
