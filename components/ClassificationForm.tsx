
import React, { useState } from 'react';
import { 
  ExtractedData, FinancialRecord, TransactionCategory, OperationState, 
  PaymentMode, FlowType, IncomeType, ServiceLine, CostType, Responsible 
} from '../types';
import { processVoucher } from '../services/geminiService';

interface Props {
  data: ExtractedData;
  initialCategory: TransactionCategory;
  onSave: (record: FinancialRecord) => void;
  onCancel: () => void;
}

const ClassificationForm: React.FC<Props> = ({ data, initialCategory, onSave, onCancel }) => {
  const [formData, setFormData] = useState<ExtractedData>({
    ...data,
    paymentMode: data.paymentMode || PaymentMode.CONTADO,
    flowType: FlowType.CFO,
    incomeType: initialCategory === TransactionCategory.INGRESO ? 'VENTAS' : undefined,
    serviceLine: undefined,
    costType: undefined,
    responsible: undefined
  });
  
  const [isProcessingVoucher, setIsProcessingVoucher] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

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
        alert("No se pudo leer el voucher automáticamente. Intente nuevamente.");
      } finally {
        setIsProcessingVoucher(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: FinancialRecord = {
      ...formData,
      id: crypto.randomUUID(),
      category: initialCategory,
      operationState: isPaid ? OperationState.CONCILIADO : OperationState.PENDIENTE,
      isPaid,
      createdAt: new Date().toISOString()
    };
    onSave(newRecord);
  };

  return (
    <div className="bg-white rounded-[60px] shadow-2xl p-10 md:p-14 animate-fadeIn border border-slate-100 max-w-5xl mx-auto mb-20">
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Clasificación de Documento</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Módulo 2: Clasificación Dinámica Obligatoria</p>
        </div>
        <div className={`px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest border-2 ${initialCategory === TransactionCategory.INGRESO ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {initialCategory}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* I. DATOS FISCALES EXTRAÍDOS */}
        <div className="md:col-span-3 pb-4 border-b border-slate-100">
           <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">I. Información de Cabecera</h4>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">
            {initialCategory === TransactionCategory.INGRESO ? 'Cliente (Destinatario)' : 'Proveedor (Emisor)'}
          </label>
          <input type="text" value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" />
        </div>
        
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">RUC</label>
          <input type="text" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Monto Factura</label>
          <div className="relative">
            <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-lg outline-none transition-all pr-14" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xs">{formData.currency}</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Detracción</label>
          <input type="number" step="0.01" value={formData.detractionAmount || 0} onChange={e => setFormData({...formData, detractionAmount: parseFloat(e.target.value)})} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Pago / Crédito</label>
          <div className="flex gap-2">
            <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value as PaymentMode})} className="flex-grow bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-xs outline-none transition-all">
              <option value={PaymentMode.CONTADO}>CONTADO</option>
              <option value={PaymentMode.CREDITO}>A CRÉDITO</option>
            </select>
            {formData.paymentMode === PaymentMode.CREDITO && (
              <input type="date" value={formData.creditDate || ''} onChange={e => setFormData({...formData, creditDate: e.target.value})} className="w-32 bg-blue-50 border-2 border-blue-200 rounded-2xl px-3 py-3 font-bold text-[10px] outline-none" />
            )}
          </div>
        </div>

        {/* II. CLASIFICADOR DINÁMICO */}
        <div className="md:col-span-3 pt-4 pb-4 border-b border-slate-100">
           <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">II. Clasificador de Flujo</h4>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Tipo de Flujo</label>
          <select value={formData.flowType} onChange={e => setFormData({...formData, flowType: e.target.value as FlowType})} className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-xs outline-none uppercase">
            <option value={FlowType.CFO}>CFO (Operativo)</option>
            <option value={FlowType.CFI}>CFI (Inversión)</option>
            <option value={FlowType.CFF}>CFF (Financiamiento)</option>
          </select>
        </div>

        {initialCategory === TransactionCategory.INGRESO ? (
          <>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Tipo de Ingreso</label>
              <select value={formData.incomeType} onChange={e => setFormData({...formData, incomeType: e.target.value as IncomeType})} className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-xs outline-none">
                <option value="VENTAS">VENTAS</option>
                <option value="PRÉSTAMOS">PRÉSTAMOS</option>
                <option value="CAMBIO DE MONEDA">CAMBIO DE MONEDA</option>
                <option value="INGRESOS FINANCIEROS">INGRESOS FINANCIEROS</option>
              </select>
            </div>
            {formData.incomeType === 'VENTAS' && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Línea de Negocio</label>
                <select value={formData.serviceLine} onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})} className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl px-5 py-3 font-black text-[10px] outline-none uppercase">
                  <option value="">Seleccionar...</option>
                  <option value="Capacitaciones Ágiles/Presenciales">Capacitaciones Ágiles/Presenciales</option>
                  <option value="Consultoría Ambiental">Consultoría Ambiental</option>
                  <option value="Consultoría SIG">Consultoría SIG</option>
                  <option value="Auditoría Tradicional">Auditoría Tradicional</option>
                  <option value="Auditorías 360">Auditorías 360</option>
                </select>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Línea de Gasto</label>
              <select value={formData.serviceLine} onChange={e => setFormData({...formData, serviceLine: e.target.value as ServiceLine})} className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-[10px] outline-none uppercase">
                <option value="">Seleccionar...</option>
                <option value="Capacitaciones">Capacitaciones</option>
                <option value="Consultoría Ambiental">Consultoría Ambiental</option>
                <option value="Consultoría SIG">Consultoría SIG</option>
                <option value="Auditoría Tradicional">Auditoría Tradicional</option>
                <option value="Auditorías 360">Auditorías 360</option>
                <option value="ECCOS GASTO">ECCOS GASTO</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Tipo de Costo</label>
              <select value={formData.costType} onChange={e => setFormData({...formData, costType: e.target.value as CostType})} className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-xs outline-none">
                <option value="FIJO">FIJO</option>
                <option value="VARIABLE">VARIABLE</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Responsable de Depósito</label>
              <select value={formData.responsible} onChange={e => setFormData({...formData, responsible: e.target.value as Responsible})} className="w-full bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-black text-xs outline-none">
                <option value="NATHALIA">NATHALIA</option>
                <option value="JOSÉ">JOSÉ</option>
                <option value="PAGO DIRECTO">PAGO DIRECTO</option>
              </select>
            </div>
          </>
        )}

        {/* III. VOUCHER / COMPROBANTE CON IA */}
        {initialCategory === TransactionCategory.EGRESO && (
          <div className="md:col-span-3 mt-4">
            <div className="bg-indigo-50/50 p-8 rounded-[40px] border-2 border-indigo-100 relative group overflow-hidden shadow-inner">
               <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                  <div className="text-center md:text-left">
                    <h5 className="text-sm font-black uppercase tracking-widest text-indigo-900">Validación de Voucher Bancario</h5>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">Sube el voucher para extraer monto real pagado</p>
                  </div>
                  <div className="flex-grow flex gap-4 w-full">
                    <div className="flex-grow relative h-16 bg-white rounded-3xl border-2 border-dashed border-indigo-200 flex items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVoucherUpload} accept="image/*" />
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                        {isProcessingVoucher ? 'ANALIZANDO CON IA...' : 'CARGAR FOTO DE VOUCHER'}
                      </span>
                    </div>
                    {formData.voucherAmount !== undefined && (
                      <div className="bg-white px-6 py-2 rounded-3xl border-2 border-green-200 flex flex-col justify-center animate-fadeIn">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Monto Voucher</span>
                        <span className="text-sm font-black text-green-600">{formData.voucherAmount.toLocaleString()} {formData.currency}</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}

        <div className="md:col-span-3 flex gap-4 pt-10">
          <button type="submit" className="flex-grow bg-slate-900 text-white rounded-[24px] py-5 font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10">
            Sincronizar y Guardar Registro
          </button>
          <button type="button" onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 rounded-[24px] py-5 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">
            Descartar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassificationForm;
