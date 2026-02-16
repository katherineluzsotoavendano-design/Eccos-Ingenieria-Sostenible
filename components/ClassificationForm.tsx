
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
    igvAmount: data.igvAmount || 0,
    paymentMode: data.paymentMode || PaymentMode.CONTADO,
    flowType: data.flowType || FlowType.CFO,
    incomeType: isIncome ? (data.incomeType || 'VENTAS') : undefined,
    serviceLine: data.serviceLine || (isIncome ? 'Auditoría Tradicional' : 'ECCOS GASTO'),
    costType: isIncome ? undefined : (data.costType || 'VARIABLE'),
    depositedTo: isIncome ? undefined : (data.depositedTo || 'PAGO DIRECTO'),
    detractionAmount: data.detractionAmount || 0,
    voucherAmount: data.voucherAmount || 0,
    voucherFileBase64: data.voucherFileBase64 || "",
    targetFolder: data.targetFolder || (isIncome ? 'VENTAS' : 'COMPRAS') 
  });

  const [voucherFileName, setVoucherFileName] = useState<string | null>(null);

  const drivePathInfo = useMemo(() => {
    let year = "2026"; 
    let monthName = "ENERO";
    const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

    if (formData?.date && typeof formData.date === 'string' && formData.date.includes('-')) {
      try {
        const parts = formData.date.split('-');
        if (parts.length >= 2) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          monthName = months[monthIdx] || "ENERO";
        }
      } catch (err) {}
    }
    return { year, month: monthName, sub: formData.targetFolder || (isIncome ? 'VENTAS' : 'COMPRAS') };
  }, [formData.targetFolder, formData.date, isIncome]);

  const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVoucherFileName(file.name);
    setIsProcessingVoucher(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await processVoucherIA(base64, file.type);
        setFormData(prev => ({ 
          ...prev, 
          voucherFileBase64: base64,
          voucherAmount: result?.amount || 0,
          description: (prev.description || "") + ` (Voucher detectado: ${result?.date || 'N/A'})`
        }));
      } catch (err) {
        setFormData(prev => ({ ...prev, voucherFileBase64: base64 }));
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
      folderPath: [drivePathInfo.year, drivePathInfo.month, drivePathInfo.sub],
      isCreditPaid: false,
      isDetractionPaid: false
    } as FinancialRecord);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen lg:h-[94vh] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-fadeIn mb-10 lg:mb-0">
      <div className="w-full lg:w-5/12 bg-slate-100 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-200 h-[300px] md:h-full">
        <div className="bg-[#263238] px-8 py-5 flex justify-between items-center text-white">
          <span className="text-[10px] font-black uppercase tracking-widest italic">Lectura Auditoría AI</span>
          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg ${isIncome ? 'bg-[#00838f]' : 'bg-[#a6ce39]'}`}>
            {isIncome ? 'DOCUMENTO INGRESO' : 'DOCUMENTO EGRESO'}
          </div>
        </div>
        <div className="flex-grow bg-slate-200 overflow-hidden relative">
          {previewUrl ? (
            fileMime?.includes('pdf') ? (
              <embed src={previewUrl} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 bg-[#263238]/5">
                <img src={previewUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" alt="Doc" />
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 font-black uppercase text-[10px]">Esperando Archivo...</div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-7/12 flex flex-col overflow-y-auto custom-scrollbar p-8 md:p-14 bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-100 pb-8 mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-black text-[#263238] tracking-tighter uppercase italic">Clasificación Eccos</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Auditoría y Gestión de Tesorería</p>
          </div>
          <button type="button" onClick={onCancel} className="px-8 py-3 bg-[#4a4a49] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl active:scale-95">← REGRESAR</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 pb-12">
          <div className="bg-slate-50 p-8 rounded-[40px] border-2 border-slate-50 space-y-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#00838f]">1. Datos Fiscales Detectados</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">{isIncome ? 'Nombre del Cliente' : 'Razón Social Proveedor'}</label>
                <input type="text" required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-bold text-xs outline-none transition-all shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">RUC / ID FISCAL</label>
                <input type="text" required value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-bold text-xs outline-none transition-all shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Emisión</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-4 py-4 font-bold text-xs shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Total ({formData.currency})</label>
                <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-black text-xs shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">IGV 18%</label>
                <input type="number" step="0.01" required value={formData.igvAmount} onChange={e => setFormData({...formData, igvAmount: parseFloat(e.target.value)})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-black text-xs shadow-sm text-[#00838f]" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Serie-Número</label>
                <input type="text" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-bold text-xs shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Condición de Pago</label>
                <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value as PaymentMode})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-black text-xs outline-none shadow-sm cursor-pointer">
                  <option value={PaymentMode.CONTADO}>{isIncome ? 'CONTADO' : 'PAGADO'}</option>
                  <option value={PaymentMode.CREDITO}>{isIncome ? 'CRÉDITO' : 'FALTA PAGAR'}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Detracción S/.</label>
                <input type="number" step="0.01" value={formData.detractionAmount} onChange={e => setFormData({...formData, detractionAmount: parseFloat(e.target.value)})} className="w-full bg-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-bold text-xs shadow-sm" />
              </div>
            </div>
          </div>

          <div className="bg-[#263238] p-8 md:p-12 rounded-[50px] shadow-2xl space-y-8 border-t-8 border-[#00838f]">
            <h3 className="text-[10px] font-black text-[#a6ce39] uppercase tracking-[0.3em]">2. Sincronización Cloud ({drivePathInfo.year} / {drivePathInfo.month})</h3>
            
            <div className="space-y-5">
               <div className="flex items-center gap-3 bg-[#1a252b] p-5 rounded-3xl border border-slate-700 overflow-hidden">
                 <span className="text-white text-[11px] font-black">DRIVE:</span>
                 <span className="text-[#00838f] text-[11px] font-bold truncate">
                   Root / {drivePathInfo.year} / {drivePathInfo.month} / {drivePathInfo.sub}
                 </span>
               </div>

              <div className="grid grid-cols-3 gap-3">
                {['VENTAS', 'COMPRAS', 'SERVICIOS'].map(folder => (
                  <button key={folder} type="button" onClick={() => setFormData({...formData, targetFolder: folder as DriveFolder})}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.targetFolder === folder ? 'bg-[#00838f] text-white shadow-xl' : 'bg-[#1a252b] text-slate-500 hover:text-slate-300 border border-slate-700'}`}>
                    {folder}
                  </button>
                ))}
              </div>
            </div>

            {!isIncome && (
              <div className="space-y-6 bg-[#1a252b] p-8 rounded-[40px] border border-slate-700">
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Validación de Pago / Voucher</h4>
                   {isProcessingVoucher && <div className="w-4 h-4 border-2 border-[#a6ce39] border-t-transparent rounded-full animate-spin"></div>}
                </div>
                <div className="space-y-5">
                   <div className="relative group">
                     <input type="file" onChange={handleVoucherUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                     <div className="bg-[#263238] border-2 border-dashed border-slate-700 p-6 rounded-3xl text-center group-hover:border-[#a6ce39] transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {voucherFileName || "Adjuntar Voucher Bancario"}
                        </p>
                     </div>
                   </div>
                   {formData.voucherAmount > 0 && (
                     <div className="flex justify-between items-center px-6 py-4 bg-[#a6ce39]/10 rounded-2xl border border-[#a6ce39]/20">
                       <span className="text-[10px] font-black text-[#a6ce39] uppercase">Monto Pagado Detectado</span>
                       <span className="text-white font-black text-sm">{formData.voucherAmount.toLocaleString()} {formData.currency}</span>
                     </div>
                   )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Movimiento Financiero</label>
              <div className="grid grid-cols-3 gap-3">
                {[FlowType.CFO, FlowType.CFF, FlowType.CFI].map(type => (
                  <button key={type} type="button" onClick={() => setFormData({...formData, flowType: type})}
                    className={`py-5 rounded-2xl text-[10px] font-black uppercase transition-all ${formData.flowType === type ? 'bg-[#a6ce39] text-[#263238] shadow-2xl scale-105' : 'bg-[#1a252b] text-slate-500 border border-slate-700'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6 border-t border-slate-700 pt-8 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Línea de Servicio / Gasto</label>
                    <select value={formData.serviceLine} onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})}
                      className="w-full bg-[#1a252b] text-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-5 font-black text-xs outline-none">
                      <option value="ECCOS GASTO">ECCOS GASTO</option>
                      <option value="Consultoría Ambiental">AMBIENTAL</option>
                      <option value="Consultoría SIG">S.I.G.</option>
                      <option value="Auditoría Tradicional">AUDITORÍA TRADICIONAL</option>
                      <option value="Auditorías 360">AUDITORÍA 360</option>
                      <option value="Capacitaciones Ágiles/Presenciales">CAPACITACIONES</option>
                    </select>
                  </div>
                  {!isIncome && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Naturaleza del Costo</label>
                      <select value={formData.costType} onChange={e => setFormData({...formData, costType: e.target.value as CostType})}
                        className="w-full bg-[#1a252b] text-white border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-5 font-black text-xs outline-none">
                        <option value="VARIABLE">VARIABLE</option>
                        <option value="FIJO">FIJO</option>
                      </select>
                    </div>
                  )}
                </div>
            </div>
          </div>

          <div className="pt-10 space-y-5">
            <button type="submit" className="w-full bg-[#263238] text-white py-7 rounded-[32px] font-black uppercase tracking-[0.3em] text-[12px] hover:bg-[#00838f] shadow-2xl transition-all active:scale-95 border-b-8 border-[#00838f]/30">
              CONFIRMAR Y SINCRONIZAR CLOUD
            </button>
            <button type="button" onClick={onCancel} className="w-full text-slate-400 py-4 font-black uppercase text-[11px] tracking-widest hover:text-red-600 transition-colors active:scale-95">
              CANCELAR OPERACIÓN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassificationForm;
