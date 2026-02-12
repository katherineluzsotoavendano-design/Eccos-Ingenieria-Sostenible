
import React, { useState } from 'react';
import { 
  ExtractedData, FinancialRecord, TransactionCategory, OperationState, 
  PaymentMode, FlowType, IncomeType, ServiceLine, CostType, DepositedTo 
} from '../types';
import { processVoucher } from '../services/geminiService';

interface Props {
  data: ExtractedData;
  initialCategory: TransactionCategory;
  onSave: (record: FinancialRecord) => void;
  onCancel: () => void;
}

const ClassificationForm: React.FC<Props> = ({ data, initialCategory, onSave, onCancel }) => {
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
  
  const [isProcessingVoucher, setIsProcessingVoucher] = useState(false);

  const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingVoucher(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const result = await processVoucher(base64, file.type);
        setFormData(prev => ({ 
          ...prev, 
          voucherAmount: result.amount, 
          voucherDate: result.date 
        }));
        setIsPaid(true);
      } catch (err) {
        alert("Error al leer el voucher automáticamente.");
      } finally {
        setIsProcessingVoucher(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFormData = { ...formData };
    if (!isIncome) {
      delete cleanFormData.paymentMode;
      delete cleanFormData.creditDate;
      delete cleanFormData.incomeType;
    }

    const newRecord: FinancialRecord = {
      ...cleanFormData,
      id: crypto.randomUUID(),
      category: initialCategory,
      operationState: isPaid ? OperationState.CONCILIADO : OperationState.PENDIENTE,
      isPaid,
      createdAt: new Date().toISOString()
    };
    onSave(newRecord);
  };

  return (
    <div className="bg-white rounded-[32px] sm:rounded-[60px] shadow-2xl p-6 sm:p-14 animate-fadeIn border border-slate-100 max-w-5xl mx-auto mb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 sm:mb-10 gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tighter uppercase mb-1 sm:mb-2">Clasificación IA</h2>
          <p className="text-slate-400 font-bold text-[9px] sm:text-xs uppercase tracking-widest">Katherine Luz Soto | Auditoría</p>
        </div>
        <div className={`px-5 py-2 sm:px-8 sm:py-4 rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest border-2 ${isIncome ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {initialCategory}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
        <div className="sm:col-span-2 md:col-span-3 pb-2 border-b border-slate-100">
           <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">I. Datos del Comprobante</h4>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">
            {isIncome ? 'Cliente' : 'Proveedor'}
          </label>
          <input type="text" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" />
        </div>
        
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">ID Fiscal / RUC</label>
          <input type="text" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Monto Extraído</label>
          <div className="relative">
            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-lg outline-none transition-all pr-14" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs">{formData.currency}</span>
          </div>
        </div>

        <div className="sm:col-span-2 md:col-span-3 pt-4 pb-2 border-b border-slate-100">
           <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">II. Clasificación Financiera</h4>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Tipo de Flujo</label>
          <select value={formData.flowType} onChange={e => setFormData({...formData, flowType: e.target.value as FlowType})} className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-xs outline-none uppercase">
            <option value={FlowType.CFO}>CFO (Operativo)</option>
            <option value={FlowType.CFI}>CFI (Inversión)</option>
            <option value={FlowType.CFF}>CFF (Financiamiento)</option>
          </select>
        </div>

        {isIncome ? (
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Condición de Pago</label>
            <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value as PaymentMode})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-xs outline-none transition-all">
              <option value={PaymentMode.CONTADO}>CONTADO</option>
              <option value={PaymentMode.CREDITO}>A CRÉDITO</option>
            </select>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Estado Pago</label>
            <select 
              value={isPaid ? "PAGADO" : "PENDIENTE"} 
              onChange={e => setIsPaid(e.target.value === "PAGADO")} 
              className="w-full bg-slate-900 text-white border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-xs outline-none transition-all"
            >
              <option value="PENDIENTE">🔴 PENDIENTE</option>
              <option value="PAGADO">🟢 PAGADO</option>
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Línea de Servicio</label>
          <select value={formData.serviceLine} onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})} className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-5 py-3 font-black text-[10px] outline-none uppercase">
            <option value="">Seleccionar...</option>
            <option value="Capacitaciones Ágiles/Presenciales">Capacitaciones</option>
            <option value="Consultoría Ambiental">C. Ambiental</option>
            <option value="Consultoría SIG">C. SIG</option>
            <option value="Auditoría Tradicional">Auditoría</option>
            <option value="Auditorías 360">Auditoría 360</option>
          </select>
        </div>

        {!isIncome && (
          <div className="sm:col-span-2 md:col-span-3 mt-4">
            <div className="bg-indigo-50/50 p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border-2 border-indigo-100 relative group overflow-hidden shadow-inner">
               <div className="flex flex-col gap-4 items-center relative z-10">
                  <div className="text-center sm:text-left w-full">
                    <h5 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-900">Validación de Voucher</h5>
                    <p className="text-[8px] sm:text-[10px] font-bold text-indigo-400 uppercase mt-1">Extraer monto real pagado</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div className="flex-grow relative h-12 sm:h-16 bg-white rounded-2xl border-2 border-dashed border-indigo-200 flex items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVoucherUpload} accept="image/*" />
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                        {isProcessingVoucher ? 'ANALIZANDO...' : 'CARGAR VOUCHER'}
                      </span>
                    </div>
                    {formData.voucherAmount !== undefined && (
                      <div className="bg-white px-5 py-2 rounded-2xl border-2 border-green-200 flex flex-col justify-center items-center sm:items-start animate-fadeIn">
                        <span className="text-[7px] font-black text-slate-400 uppercase">Abonado</span>
                        <span className="text-xs sm:text-sm font-black text-green-600">{formData.voucherAmount.toLocaleString()} {formData.currency}</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="sm:col-span-2 md:col-span-3 flex flex-col sm:flex-row gap-4 pt-6 sm:pt-10">
          <button type="submit" className="flex-grow bg-slate-900 text-white rounded-2xl sm:rounded-[24px] py-4 sm:py-5 font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 order-1 sm:order-none">
            Sincronizar Datos
          </button>
          <button type="button" onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-2xl sm:rounded-[24px] py-4 sm:py-5 font-black uppercase tracking-widest text-[10px] sm:text-xs hover:bg-slate-200 transition-all">
            Descartar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassificationForm;
