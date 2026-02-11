
import React, { useState } from 'react';
import { ExtractedData, FinancialRecord, TransactionCategory, OperationState } from '../types';

interface Props {
  data: ExtractedData;
  initialCategory: TransactionCategory;
  onSave: (record: FinancialRecord) => void;
  onCancel: () => void;
}

const ClassificationForm: React.FC<Props> = ({ data, initialCategory, onSave, onCancel }) => {
  const [formData, setFormData] = useState<ExtractedData>(data);
  const [isPaid, setIsPaid] = useState(false);

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
    <div className="bg-white rounded-[60px] shadow-2xl p-12 md:p-16 animate-fadeIn border border-slate-100 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Verificar Extracción</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Confirma los datos leídos por FINCORE AI</p>
        </div>
        <div className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest ${initialCategory === TransactionCategory.INGRESO ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {initialCategory}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Proveedor / Cliente</label>
          <input 
            type="text" 
            value={formData.vendor} 
            onChange={e => setFormData({...formData, vendor: e.target.value})}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[24px] px-6 py-4 font-bold outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Identificación Fiscal</label>
          <input 
            type="text" 
            value={formData.taxId} 
            onChange={e => setFormData({...formData, taxId: e.target.value})}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[24px] px-6 py-4 font-bold outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Fecha Documento</label>
          <input 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[24px] px-6 py-4 font-bold outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Número Factura</label>
          <input 
            type="text" 
            value={formData.invoiceNumber} 
            onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[24px] px-6 py-4 font-bold outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Monto Total</label>
          <div className="relative">
            <input 
              type="number" 
              step="0.01"
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[24px] px-6 py-4 font-black text-xl outline-none transition-all pr-20"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 uppercase">{formData.currency}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Sugerencia Categoría</label>
          <input 
            type="text" 
            value={formData.categorySuggest} 
            onChange={e => setFormData({...formData, categorySuggest: e.target.value})}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[24px] px-6 py-4 font-bold outline-none transition-all"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-4 bg-blue-50/50 p-6 rounded-[32px] mt-4">
          <button 
            type="button"
            onClick={() => setIsPaid(!isPaid)}
            className={`w-14 h-8 rounded-full transition-all relative ${isPaid ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isPaid ? 'left-7' : 'left-1'}`}></div>
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase">¿Ya fue pagado / cobrado?</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Marca si existe evidencia de transferencia bancaria</span>
          </div>
        </div>

        <div className="md:col-span-2 flex gap-4 pt-8">
          <button 
            type="submit" 
            className="flex-grow bg-slate-900 text-white rounded-[24px] py-5 font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10"
          >
            Guardar en Registro
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            className="px-10 bg-slate-100 text-slate-500 rounded-[24px] py-5 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
          >
            Descartar
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassificationForm;
