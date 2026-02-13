
import React, { useState, useMemo } from 'react';
import { 
  ExtractedData, FinancialRecord, TransactionCategory, OperationState, 
  PaymentMode, FlowType, ServiceLine, CostType, IncomeType, DepositedTo, DriveFolder 
} from '../types';
import { processVoucherIA } from '../services/geminiService';

interface Props {
  data: ExtractedData;
  initialCategory: TransactionCategory;
  onSave: (record: FinancialRecord) => void;
  onCancel: () => void;
  previewUrl?: string; 
  fileMime?: string;
}

const ClassificationForm: React.FC<Props> = ({ data, initialCategory, onSave, onCancel, previewUrl, fileMime }) => {
  const isIncome = initialCategory === TransactionCategory.INGRESO;
  const [isProcessingVoucher, setIsProcessingVoucher] = useState(false);
  
  const [formData, setFormData] = useState<ExtractedData>({
    ...data,
    paymentMode: data.paymentMode || PaymentMode.CONTADO,
    flowType: data.flowType || FlowType.CFO,
    incomeType: isIncome ? (data.incomeType || 'VENTAS') : undefined,
    serviceLine: data.serviceLine || (isIncome ? 'Auditoría Tradicional' : 'ECCOS GASTO'),
    costType: isIncome ? undefined : (data.costType || 'VARIABLE'),
    depositedTo: isIncome ? undefined : (data.depositedTo || 'PAGO DIRECTO'),
    detractionAmount: data.detractionAmount || 0,
    voucherAmount: 0,
    targetFolder: data.targetFolder || (isIncome ? 'VENTAS' : 'COMPRAS') 
  });

  const [voucherFileName, setVoucherFileName] = useState<string | null>(null);

  const drivePath = useMemo(() => {
    let year = new Date().getFullYear().toString();
    let monthName = "ENERO";
    if (formData?.date && typeof formData.date === 'string' && formData.date.includes('-')) {
      try {
        const parts = formData.date.split('-');
        if (parts.length >= 2) {
          year = parts[0];
          const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          const monthIdx = parseInt(parts[1], 10) - 1;
          monthName = months[monthIdx] || "ENERO";
        }
      } catch (err) {}
    }
    return [year, monthName, formData.targetFolder || (isIncome ? 'VENTAS' : 'COMPRAS')];
  }, [formData.targetFolder, formData.date, isIncome]);

  const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVoucherFileName(file.name);
    setIsProcessingVoucher(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setFormData(prev => ({ ...prev, voucherFileBase64: base64 }));
      try {
        const result = await processVoucherIA(base64, file.type);
        setFormData(prev => ({ 
          ...prev, 
          voucherAmount: result?.amount || 0,
          description: (prev.description || "") + ` (Voucher detectado: ${result?.date || 'N/A'})`
        }));
      } finally {
        setIsProcessingVoucher(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: crypto.randomUUID(),
      category: initialCategory,
      operationState: !isIncome && (formData.voucherAmount || 0) > 0 ? OperationState.PAGADO : OperationState.PENDIENTE,
      isPaid: isIncome ? false : (formData.voucherAmount || 0) >= formData.amount,
      createdAt: new Date().toISOString(),
      folderPath: drivePath
    } as FinancialRecord);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen lg:h-[94vh] bg-white rounded-[24px] lg:rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn mb-10 lg:mb-0">
      {/* Visor Izquierdo / Superior */}
      <div className="w-full lg:w-5/12 bg-slate-100 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-200 h-[300px] lg:h-full">
        <div className="bg-slate-900 px-6 py-3 md:py-4 flex justify-between items-center text-white">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest italic">Visor Auditoría</span>
          <div className={`px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase shadow-lg ${isIncome ? 'bg-green-600' : 'bg-red-600'}`}>
            {isIncome ? 'CLIENTE' : 'EMISOR'}
          </div>
        </div>
        <div className="flex-grow bg-slate-200 overflow-hidden relative">
          {previewUrl ? (
            fileMime?.includes('pdf') ? (
              <embed src={previewUrl} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 md:p-6">
                <img src={previewUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Doc" />
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold uppercase text-[9px]">Cargando vista previa...</div>
          )}
        </div>
      </div>

      {/* Formulario Derecho / Inferior */}
      <div className="w-full lg:w-7/12 flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-10 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-100 pb-6 mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Clasificación</h2>
            <p className="text-slate-400 font-bold text-[8px] md:text-[9px] uppercase tracking-widest mt-1">Módulo de Procesamiento AI</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase tracking-widest">Tipo:</span>
             <div className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black text-white ${isIncome ? 'bg-green-600' : 'bg-red-600'}`}>
               {isIncome ? 'INGRESO' : 'EGRESO'}
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 pb-10">
          {/* SECCIÓN 1: EXTRACCIÓN INMEDIATA */}
          <div className="bg-slate-50 p-5 md:p-7 rounded-[24px] md:rounded-[32px] border-2 border-slate-100 space-y-4 md:space-y-5 shadow-sm">
            <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[7px] md:text-[8px]">1</span> 
              Lectura IA
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">{isIncome ? 'Razón Social Cliente' : 'Razón Social Emisor'}</label>
                <input type="text" required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-blue-500 shadow-sm transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">RUC / ID</label>
                <input type="text" required value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-blue-500 shadow-sm transition-all" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">Descripción</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs shadow-sm" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">Emisión</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 font-bold text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">Monto ({formData.currency})</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-xs" />
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">Comprobante</label>
                <input type="text" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">Modalidad</label>
                <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value as PaymentMode})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs">
                  <option value={PaymentMode.CONTADO}>CONTADO</option>
                  <option value={PaymentMode.CREDITO}>CRÉDITO</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 ml-1">Detracción</label>
                <input type="number" step="0.01" value={formData.detractionAmount} onChange={e => setFormData({...formData, detractionAmount: parseFloat(e.target.value)})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs" />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CLASIFICACIÓN DINÁMICA */}
          <div className="bg-slate-900 p-6 md:p-8 rounded-[24px] md:rounded-[40px] shadow-2xl space-y-6">
            <h3 className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-900 rounded-full flex items-center justify-center text-blue-400">2</span>
              Clasificación Dinámica
            </h3>
            
            <div className="space-y-3">
              <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Carpeta de Destino (Drive)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {['VENTAS', 'COMPRAS', 'SERVICIOS'].map(folder => (
                  <button 
                    key={folder}
                    type="button"
                    onClick={() => setFormData({...formData, targetFolder: folder as DriveFolder})}
                    className={`py-3 md:py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.targetFolder === folder ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300'}`}
                  >
                    📂 {folder}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Flujo de Caja</label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {[FlowType.CFO, FlowType.CFF, FlowType.CFI].map(type => (
                  <button 
                    key={type}
                    type="button"
                    onClick={() => setFormData({...formData, flowType: type})}
                    className={`py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${formData.flowType === type ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {isIncome ? (
              <div className="space-y-6 animate-fadeIn border-t border-slate-800 pt-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Tipo de Ingreso</label>
                  <select 
                    value={formData.incomeType} 
                    onChange={e => setFormData({...formData, incomeType: e.target.value as IncomeType})}
                    className="w-full bg-slate-800 text-white border-2 border-slate-700 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 font-black text-xs outline-none focus:border-blue-500"
                  >
                    <option value="VENTAS">VENTAS</option>
                    <option value="PRÉSTAMOS">PRÉSTAMOS</option>
                    <option value="CAMBIO DE MONEDA">CAMBIO DE MONEDA</option>
                    <option value="INGRESOS FINANCIEROS">INGRESOS FINANCIEROS</option>
                  </select>
                </div>

                {formData.incomeType === 'VENTAS' && (
                  <div className="space-y-2 animate-fadeIn">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Línea de Servicio</label>
                    <select 
                      value={formData.serviceLine} 
                      onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})}
                      className="w-full bg-blue-900/40 text-blue-100 border-2 border-blue-500/50 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 font-black text-xs outline-none"
                    >
                      <option value="Capacitaciones Ágiles/Presenciales">Capacitaciones Ágiles</option>
                      <option value="Consultoría Ambiental">Consultoría Ambiental</option>
                      <option value="Consultoría SIG">Consultoría SIG</option>
                      <option value="Auditoría Tradicional">Auditoría Tradicional</option>
                      <option value="Auditorías 360">Auditorías 360</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn border-t border-slate-800 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Línea de Gasto</label>
                    <select 
                      value={formData.serviceLine} 
                      onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})}
                      className="w-full bg-slate-800 text-white border-2 border-slate-700 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 font-black text-xs"
                    >
                      <option value="ECCOS GASTO">ECCOS GASTO</option>
                      <option value="Capacitaciones Ágiles/Presenciales">Capacitaciones</option>
                      <option value="Consultoría Ambiental">Consultoría Ambiental</option>
                      <option value="Consultoría SIG">Consultoría SIG</option>
                      <option value="Auditoría Tradicional">Auditoría Tradicional</option>
                      <option value="Auditorías 360">Auditorías 360</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Tipo de Costo</label>
                    <select 
                      value={formData.costType} 
                      onChange={e => setFormData({...formData, costType: e.target.value as CostType})}
                      className="w-full bg-slate-800 text-white border-2 border-slate-700 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 font-black text-xs"
                    >
                      <option value="FIJO">FIJO</option>
                      <option value="VARIABLE">VARIABLE</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400">Caja / Responsable</label>
                  <select 
                    value={formData.depositedTo} 
                    onChange={e => setFormData({...formData, depositedTo: e.target.value as DepositedTo})}
                    className="w-full bg-slate-800 text-white border-2 border-slate-700 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 font-black text-xs"
                  >
                    <option value="NATHALIA">NATHALIA</option>
                    <option value="JOSÉ">JOSÉ</option>
                    <option value="PAGO DIRECTO">PAGO DIRECTO</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {!isIncome && (
            <div className="bg-blue-600 p-6 md:p-8 rounded-[24px] md:rounded-[40px] shadow-2xl space-y-6 relative overflow-hidden">
              {isProcessingVoucher && (
                <div className="absolute inset-0 bg-blue-600/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                  <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest">Validando...</p>
                </div>
              )}
              <h3 className="text-[9px] md:text-xs font-black text-white uppercase tracking-[0.2em]">3. Pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[8px] md:text-[9px] font-black uppercase text-blue-100">Monto Pagado</label>
                  <input type="number" step="0.01" value={formData.voucherAmount} onChange={e => setFormData({...formData, voucherAmount: parseFloat(e.target.value)})} className="w-full bg-white text-blue-600 border-2 border-white rounded-xl md:rounded-2xl px-5 py-3 md:py-4 font-black text-xs" />
                </div>
                <div className="relative group cursor-pointer flex items-end">
                  <input type="file" onChange={handleVoucherUpload} accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`w-full border-2 border-dashed ${voucherFileName ? 'border-white bg-white/20' : 'border-blue-400 hover:border-white'} rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 flex items-center justify-between transition-all overflow-hidden`}>
                    <span className="text-[9px] md:text-[10px] font-black text-white uppercase italic truncate max-w-[80%]">
                      {voucherFileName || "Adjuntar Voucher"}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white flex-shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 md:pt-8 space-y-3">
            <button type="submit" className="w-full bg-slate-900 text-white py-5 md:py-6 rounded-2xl md:rounded-[30px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-[11px] hover:bg-blue-600 shadow-2xl transition-all active:scale-95">
              FINALIZAR AUDITORÍA AI
            </button>
            <button type="button" onClick={onCancel} className="w-full text-slate-400 py-3 md:py-4 font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:text-red-500 transition-colors">
              CANCELAR OPERACIÓN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassificationForm;
