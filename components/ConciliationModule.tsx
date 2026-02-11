
import React, { useState, useEffect } from 'react';
import { FinancialRecord, BankMovement, OperationState, TransactionCategory } from '../types';

interface Props {
  records: FinancialRecord[];
  onConciliate: (id: string) => void;
}

const ConciliationModule: React.FC<Props> = ({ records, onConciliate }) => {
  const [bankMovements, setBankMovements] = useState<BankMovement[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Generate some "bank movements" for the demo
  useEffect(() => {
    const mockMovements: BankMovement[] = [
      { id: 'm1', date: '2024-03-01', amount: 150.50, description: 'TRANSFER GOOGLE CLOUD', reference: 'REF-123', isConciliated: false },
      { id: 'm2', date: '2024-03-05', amount: 5000, description: 'PAYMENT ACME CORP INV-001', reference: 'REF-456', isConciliated: false },
      { id: 'm3', date: '2024-03-10', amount: 85.00, description: 'UBER RIDE BUSINESS', reference: 'REF-789', isConciliated: false },
      { id: 'm4', date: '2024-03-12', amount: 1200.00, description: 'RECURRING SERVICE AB', reference: 'REF-000', isConciliated: false },
    ];
    setBankMovements(mockMovements);
  }, []);

  const pendingRecords = records.filter(r => r.operationState !== OperationState.CONCILIADO);

  const handleMatch = (movementId: string, recordId: string) => {
    onConciliate(recordId);
    setBankMovements(prev => prev.map(m => m.id === movementId ? { ...m, isConciliated: true } : m));
    setSelectedRecordId(null);
    alert("✅ Conciliación existosa.");
  };

  return (
    <div className="space-y-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase">Módulo Conciliador</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Match inteligente entre extractos bancarios y registros</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
           Importar Extracto PDF/CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black italic text-xs">A</div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Registros en Sistema</h3>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {pendingRecords.map(record => (
              <div 
                key={record.id}
                onClick={() => setSelectedRecordId(record.id)}
                className={`bg-white p-8 rounded-[32px] border-2 cursor-pointer transition-all ${selectedRecordId === record.id ? 'border-blue-500 shadow-xl' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${record.category === TransactionCategory.INGRESO ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {record.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">{record.date}</span>
                </div>
                <h4 className="text-lg font-black tracking-tight">{record.vendor}</h4>
                <div className="flex justify-between items-center mt-6">
                  <p className="text-2xl font-black">${record.amount.toLocaleString()} <span className="text-xs font-bold text-slate-300">{record.currency}</span></p>
                  <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </div>
                </div>
              </div>
            ))}
            {pendingRecords.length === 0 && (
              <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 p-12 rounded-[32px] text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">Todos los registros han sido conciliados</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black italic text-xs">B</div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Movimientos Bancarios</h3>
          </div>
          <div className="space-y-4">
            {bankMovements.map(m => (
              <div 
                key={m.id}
                className={`bg-white p-8 rounded-[32px] border-2 transition-all relative overflow-hidden ${m.isConciliated ? 'opacity-40 grayscale pointer-events-none' : 'border-slate-100'}`}
              >
                {m.isConciliated && (
                  <div className="absolute inset-0 bg-green-500/5 flex items-center justify-center z-10">
                    <span className="bg-green-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase rotate-12">CONCILIADO ✓</span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{m.date}</span>
                  <span className="text-[10px] font-bold text-slate-300 uppercase">{m.reference}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-600">{m.description}</h4>
                <div className="flex justify-between items-center mt-6">
                  <p className="text-xl font-black">${m.amount.toLocaleString()}</p>
                  <button 
                    disabled={!selectedRecordId || m.isConciliated}
                    onClick={() => selectedRecordId && handleMatch(m.id, selectedRecordId)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedRecordId ? 'bg-indigo-600 text-white hover:bg-blue-600' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                  >
                    Vincular a Selección
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConciliationModule;
