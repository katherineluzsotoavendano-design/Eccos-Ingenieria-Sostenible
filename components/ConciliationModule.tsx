
import React, { useState } from 'react';
import { FinancialRecord, BankMovement, AuditReport, TransactionCategory } from '../types';
import { extractBankMovements, performAuditIA } from '../services/geminiService';

interface Props {
  records: FinancialRecord[];
  onConciliate: (id: string) => void;
}

const ConciliationModule: React.FC<Props> = ({ records, onConciliate }) => {
  const [bankMovements, setBankMovements] = useState<BankMovement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [activeCurrency, setActiveCurrency] = useState<'PEN' | 'USD'>('PEN');

  const filteredRecords = records.filter(r => r.currency === activeCurrency);
  const movementsByCurrency = bankMovements.filter(m => m.currency === activeCurrency);

  const handleStatementUpload = async (e: React.ChangeEvent<HTMLInputElement>, currency: 'PEN' | 'USD') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const extracted = await extractBankMovements(base64, file.type, currency);
        setBankMovements(prev => [...prev.filter(m => m.currency !== currency), ...extracted]);
        setActiveCurrency(currency);
        setAuditReport(null);
      } catch (err) {
        alert("Error al procesar el estado de cuenta. Asegúrate de que el PDF sea legible.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const runIAAudit = async () => {
    if (movementsByCurrency.length === 0) {
      alert("Primero sube el estado de cuenta de este mes.");
      return;
    }
    setIsProcessing(true);
    try {
      const report = await performAuditIA(movementsByCurrency, filteredRecords);
      setAuditReport(report);
    } catch (err) {
      alert("Error en la auditoría IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12 animate-fadeIn pb-24">
      {/* Encabezado y Selectores de Carga */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#263238] italic">Auditoría Bancaria IA</h2>
          <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.3em] mt-2">Contraste de Extractos Mensuales vs Sistema</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="bg-[#263238] text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00838f] transition-all cursor-pointer flex items-center gap-3 shadow-xl">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
             Subir EE.CC. SOLES
             <input type="file" className="hidden" onChange={(e) => handleStatementUpload(e, 'PEN')} accept="application/pdf,image/*" />
          </label>
          <label className="bg-[#4a4a49] text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00838f] transition-all cursor-pointer flex items-center gap-3 shadow-xl">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
             Subir EE.CC. DÓLARES
             <input type="file" className="hidden" onChange={(e) => handleStatementUpload(e, 'USD')} accept="application/pdf,image/*" />
          </label>
        </div>
      </div>

      {/* Switcher de Moneda para visualización */}
      <div className="flex bg-white p-1 rounded-2xl w-fit shadow-sm border border-slate-100">
        <button onClick={() => setActiveCurrency('PEN')} className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${activeCurrency === 'PEN' ? 'bg-[#00838f] text-white shadow-md' : 'text-slate-400'}`}>Soles (PEN)</button>
        <button onClick={() => setActiveCurrency('USD')} className={`px-8 py-3 rounded-xl text-[11px] font-black transition-all ${activeCurrency === 'USD' ? 'bg-[#00838f] text-white shadow-md' : 'text-slate-400'}`}>Dólares (USD)</button>
      </div>

      {isProcessing ? (
        <div className="bg-white p-20 rounded-[50px] shadow-2xl text-center border-t-8 border-[#00838f]">
          <div className="w-16 h-16 border-8 border-slate-100 border-t-[#a6ce39] rounded-full animate-spin mx-auto mb-10"></div>
          <h2 className="text-xl font-black uppercase text-[#263238]">IA Analizando Estados de Cuenta...</h2>
        </div>
      ) : (
        <>
          {/* Resultados de Auditoría IA */}
          {auditReport && (
            <div className="bg-[#263238] p-10 md:p-14 rounded-[50px] shadow-2xl text-white space-y-10 animate-fadeIn border-t-8 border-[#a6ce39]">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-[#a6ce39]">Reporte de Auditoría AI</h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Conformidad de registros mensuales</p>
                </div>
                {auditReport.isEverythingOk ? (
                  <div className="bg-[#a6ce39] text-[#263238] px-8 py-3 rounded-2xl font-black uppercase text-[12px] shadow-2xl">
                    ✓ TODO OK - MES CUADRADO
                  </div>
                ) : (
                  <div className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[12px] shadow-2xl">
                    ⚠ DISCREPANCIAS DETECTADAS
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#1a252b] p-6 rounded-3xl border border-slate-700">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Coincidencias</p>
                   <p className="text-3xl font-black text-[#a6ce39]">{auditReport.matches.length}</p>
                </div>
                <div className="bg-[#1a252b] p-6 rounded-3xl border border-slate-700">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Discrepancias</p>
                   <p className="text-3xl font-black text-orange-400">{auditReport.discrepancies.length}</p>
                </div>
                <div className="bg-[#1a252b] p-6 rounded-3xl border border-slate-700">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Falta en Sistema</p>
                   <p className="text-3xl font-black text-red-400">{auditReport.missingInSystem.length}</p>
                </div>
                <div className="bg-[#1a252b] p-6 rounded-3xl border border-slate-700">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-4">Falta en Banco</p>
                   <p className="text-3xl font-black text-blue-400">{auditReport.missingInBank.length}</p>
                </div>
              </div>

              {auditReport.discrepancies.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-500/30 p-8 rounded-3xl">
                   <p className="text-[10px] font-black text-orange-400 uppercase mb-4 italic">Observaciones del Auditor:</p>
                   <ul className="space-y-3">
                     {auditReport.discrepancies.map((d, i) => (
                       <li key={i} className="text-[12px] font-bold text-slate-200 flex items-start gap-2">
                         <span className="text-orange-400">●</span> {d}
                       </li>
                     ))}
                   </ul>
                </div>
              )}

              <div className="pt-6 flex flex-col sm:flex-row gap-4">
                 <button className="bg-[#a6ce39] text-[#263238] px-12 py-5 rounded-3xl font-black uppercase text-[12px] hover:bg-white transition-all shadow-xl">
                   Cerrar Mes y Guardar Conformidad
                 </button>
                 <button onClick={() => setAuditReport(null)} className="text-slate-400 px-8 py-5 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">
                   Re-Evaluar
                 </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Banco Card */}
            <div className="space-y-6">
              <div className="flex justify-between items-center ml-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#263238] text-white rounded-2xl flex items-center justify-center font-black italic text-sm">B</div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#263238]">Estado de Cuenta ({activeCurrency})</h3>
                </div>
                <button 
                  onClick={runIAAudit}
                  className="bg-[#00838f] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#a6ce39] hover:text-[#263238] transition-all shadow-lg flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Iniciar Auditoría IA
                </button>
              </div>
              
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {movementsByCurrency.length > 0 ? (
                  movementsByCurrency.map(m => (
                    <div key={m.id} className="bg-white p-8 rounded-[40px] border-2 border-slate-100 hover:border-[#00838f] transition-all shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{m.date}</span>
                        <div className="bg-[#f8fafc] px-3 py-1 rounded-lg text-[9px] font-bold text-slate-400 uppercase">Extracto Bancario</div>
                      </div>
                      <h4 className="text-[13px] font-black text-[#263238] uppercase leading-tight mb-4">{m.description}</h4>
                      <p className="text-3xl font-black text-[#263238]">
                        <span className="text-[12px] opacity-20 mr-2">{m.currency}</span>
                        {m.amount.toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 border-4 border-dashed border-slate-200 p-20 rounded-[40px] text-center">
                    <p className="text-[11px] font-black uppercase text-slate-300">No se ha cargado el extracto de {activeCurrency}</p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">Sube un PDF para ver los movimientos aquí</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sistema Card */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 ml-2">
                <div className="w-10 h-10 bg-[#a6ce39] text-[#263238] rounded-2xl flex items-center justify-center font-black italic text-sm">S</div>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#263238]">Registros en Sistema ({activeCurrency})</h3>
              </div>
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(record => (
                    <div key={record.id} className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${record.category === TransactionCategory.INGRESO ? 'bg-[#00838f] text-white' : 'bg-[#a6ce39] text-[#263238]'}`}>
                          {record.category}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase">{record.date}</span>
                      </div>
                      <h4 className="text-[14px] font-black text-[#263238] uppercase leading-tight">{record.vendor}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">{record.invoiceNumber}</p>
                      <div className="flex justify-between items-center mt-6">
                        <p className="text-2xl font-black text-[#263238]">
                          <span className="text-[12px] opacity-20 mr-2">{record.currency}</span>
                          {record.amount.toLocaleString()}
                        </p>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${record.operationState === 'CONCILIADO' ? 'bg-[#a6ce39] text-white' : 'bg-slate-50 text-slate-200'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 border-4 border-dashed border-slate-200 p-20 rounded-[40px] text-center">
                    <p className="text-[11px] font-black uppercase text-slate-300">Sin registros registrados para {activeCurrency}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConciliationModule;
