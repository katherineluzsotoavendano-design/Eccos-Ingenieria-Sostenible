
import React, { useState, useMemo } from 'react';
import { 
  ExtractedData, FinancialRecord, TransactionCategory, OperationState, 
  PaymentMode, FlowType, IncomeType, ServiceLine, CostType, DepositedTo 
} from '../types';

interface Props {
  data: ExtractedData;
  initialCategory: TransactionCategory;
  onSave: (record: FinancialRecord) => void;
  onCancel: () => void;
  fileBase64?: string;
  fileMime?: string;
}

const ClassificationForm: React.FC<Props> = ({ data, initialCategory, onSave, onCancel, fileBase64, fileMime }) => {
  const isIncome = initialCategory === TransactionCategory.INGRESO;
  const [isPaid, setIsPaid] = useState(false);
  const [formData, setFormData] = useState<ExtractedData>({
    ...data,
    paymentMode: data.paymentMode || PaymentMode.CONTADO,
    flowType: FlowType.CFO,
    incomeType: isIncome ? 'VENTAS' : undefined,
    serviceLine: data.serviceLine || undefined,
    costType: isIncome ? undefined : 'FIJO',
    depositedTo: undefined
  });

  // Ruta: [Año, Mes, "VENTAS" o "COMPRAS", "SERVICIOS"]
  const drivePath = useMemo(() => {
    const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    
    const dateParts = formData.date ? formData.date.split('-') : [];
    let year = new Date().getFullYear().toString();
    let month = months[new Date().getMonth()];

    if (dateParts.length >= 2) {
      year = dateParts[0];
      const monthIdx = parseInt(dateParts[1]) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        month = months[monthIdx];
      }
    }

    const categoryDir = isIncome ? "VENTAS" : "COMPRAS";
    const subDir = "SERVICIOS"; 
    
    return [year, month, categoryDir, subDir];
  }, [formData.date, isIncome]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: FinancialRecord = {
      ...formData,
      id: crypto.randomUUID(),
      category: initialCategory,
      operationState: isPaid ? OperationState.CONCILIADO : OperationState.PENDIENTE,
      isPaid,
      createdAt: new Date().toISOString(),
      folderPath: drivePath
    };
    onSave(newRecord);
  };

  return (
    <div className="animate-fadeIn w-full flex flex-col lg:flex-row gap-8 mb-10 min-h-[calc(100vh-200px)]">
      {/* SECCIÓN IZQUIERDA: Visor de Documento */}
      <div className="w-full lg:w-1/2 bg-slate-900 rounded-[40px] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-800">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Auditoría Visual</span>
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center p-4 bg-slate-900/50">
          {fileBase64 ? (
            fileMime?.includes('pdf') ? (
              <iframe 
                src={`data:${fileMime};base64,${fileBase64}#toolbar=0&navpanes=0`} 
                className="w-full h-full rounded-2xl border-none bg-white" 
                title="Preview"
              />
            ) : (
              <img 
                src={`data:${fileMime};base64,${fileBase64}`} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" 
                alt="Original"
              />
            )
          ) : (
            <div className="text-slate-500 text-[10px] font-black uppercase">Vista previa no disponible</div>
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Formulario */}
      <div className="w-full lg:w-1/2 bg-white rounded-[40px] shadow-2xl p-6 sm:p-10 border border-slate-100 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase mb-1">Cotejo Final</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Valida la extracción de la IA</p>
          </div>
          <div className={`px-5 py-2 rounded-2xl font-black text-[10px] uppercase border-2 ${isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {initialCategory}
          </div>
        </div>

        {/* Destino Drive */}
        <div className="mb-8 p-6 bg-blue-50/40 border-2 border-blue-50 rounded-[32px]">
          <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4 ml-2 text-center sm:text-left">Ruta de Archivado en Drive</h4>
          <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
            {drivePath.map((folder, idx) => (
              <React.Fragment key={idx}>
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                  <span className="text-[9px] font-black text-slate-700 uppercase">{folder}</span>
                </div>
                {idx < drivePath.length - 1 && <span className="text-blue-200 font-black text-lg">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2 pb-2 border-b border-slate-100">
             <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Datos Extraídos</h4>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Entidad</label>
            <input type="text" required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-2xl px-5 py-3 font-bold text-xs outline-none" />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">RUC / ID</label>
            <input type="text" required value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-2xl px-5 py-3 font-bold text-xs outline-none" />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Fecha</label>
            <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-blue-50 border-2 border-transparent focus:border-blue-600 rounded-2xl px-5 py-3 font-bold text-xs outline-none" />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Monto Total</label>
            <div className="relative">
              <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-600 rounded-2xl px-5 py-4 font-black text-xl outline-none pr-14" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">{formData.currency}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Línea de Servicio</label>
            <select required value={formData.serviceLine} onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 rounded-2xl px-5 py-3 font-black text-[10px] outline-none uppercase">
              <option value="">-- Seleccionar --</option>
              <option value="Capacitaciones Ágiles/Presenciales">Capacitaciones</option>
              <option value="Consultoría Ambiental">C. Ambiental</option>
              <option value="Consultoría SIG">C. SIG</option>
              <option value="Auditoría Tradicional">Auditoría</option>
              <option value="Auditorías 360">Auditoría 360</option>
              <option value="ECCOS GASTO">ECCOS Gasto</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Estado Pago/Cobro</label>
            <select 
              value={isPaid ? "PAGADO" : "PENDIENTE"} 
              onChange={e => setIsPaid(e.target.value === "PAGADO")} 
              className={`w-full text-white border-2 border-transparent focus:border-blue-600 rounded-2xl px-5 py-3 font-black text-[10px] outline-none transition-all ${isPaid ? 'bg-green-600 shadow-lg shadow-green-500/20' : 'bg-slate-900 shadow-lg shadow-slate-900/20'}`}
            >
              <option value="PENDIENTE">🔴 PENDIENTE</option>
              <option value="PAGADO">🟢 CONCILIADO</option>
            </select>
          </div>

          <div className="sm:col-span-2 pt-10 flex flex-col sm:flex-row gap-4 mt-auto">
            <button type="submit" className="flex-grow bg-blue-600 text-white rounded-[24px] py-5 font-black uppercase tracking-widest text-[11px] hover:bg-slate-900 transition-all shadow-2xl shadow-blue-500/30 order-1 sm:order-none active:scale-95">
              Confirmar y Guardar en Drive
            </button>
            <button type="button" onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-[24px] py-5 font-black uppercase tracking-widest text-[11px] hover:bg-red-50 hover:text-red-500 transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassificationForm;
