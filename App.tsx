
import React, { useState, useEffect } from 'react';
import { 
  processDocument, 
  saveToExternalDatabase, 
  fetchRecordsFromExternalDatabase, 
  isApiKeyConfigured,
  updateRecordInDatabase
} from './services/geminiService';
import { FinancialRecord, ExtractedData, TransactionCategory, OperationState, BankMovement } from './types';
import ClassificationForm from './components/ClassificationForm';
import ManagementTable from './components/ManagementTable';
import Dashboard from './components/Dashboard';
import ConciliationModule from './components/ConciliationModule';

enum AppView {
  UPLOAD = 'UPLOAD',
  TABLE = 'TABLE',
  DASHBOARD = 'DASHBOARD',
  BANCOS = 'BANCOS'
}

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [preCategory, setPreCategory] = useState<TransactionCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  useEffect(() => {
    const keyOk = isApiKeyConfigured();
    setHasApiKey(keyOk);

    const loadInitialData = async () => {
      // First load from local storage for instant UI
      const saved = localStorage.getItem('fincore_records');
      if (saved) setRecords(JSON.parse(saved));

      // Then fetch from Supabase to sync
      setIsSyncing(true);
      try {
        const remoteRecords = await fetchRecordsFromExternalDatabase();
        if (remoteRecords.length > 0) {
          setRecords(remoteRecords);
          localStorage.setItem('fincore_records', JSON.stringify(remoteRecords));
        }
      } catch (error) {
        console.warn("Could not sync with Supabase, using local data.");
      } finally {
        setIsSyncing(false);
      }
    };
    
    loadInitialData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isApiKeyConfigured()) {
      alert("⚠️ SISTEMA BLOQUEADO: No se detectó API_KEY en el entorno.");
      return;
    }

    setIsProcessing(true);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const result = await processDocument(base64, file.type);
        setExtractedData(result);
      } catch (error: any) {
        alert(`Error IA: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onRecordSaved = async (record: FinancialRecord) => {
    setIsSyncing(true);
    try {
      const result = await saveToExternalDatabase(record);
      if (result.success) {
        const updated = [record, ...records];
        setRecords(updated);
        localStorage.setItem('fincore_records', JSON.stringify(updated));
        setSuccessMessage("✅ Registro guardado en Supabase exitosamente.");
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (e) {
      alert("Error de red al intentar sincronizar con Supabase.");
    } finally {
      setIsSyncing(false);
      setExtractedData(null);
      setPreCategory(null);
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    // Optimistic UI update
    const updated = records.map(r => r.id === id ? { ...r, ...updates } : r);
    setRecords(updated);
    localStorage.setItem('fincore_records', JSON.stringify(updated));

    // Remote update
    try {
      await updateRecordInDatabase(id, updates);
    } catch (e) {
      console.error("Failed to sync update to Supabase");
    }
  };

  const reset = () => {
    setExtractedData(null);
    setPreCategory(null);
    setSuccessMessage(null);
    setIsProcessing(false);
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView(AppView.DASHBOARD)}>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic shadow-lg shadow-blue-500/30 transform hover:scale-110 transition-transform">F</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter leading-none">FINCORE<span className="text-blue-400 text-xs ml-1 font-bold">AI</span></h1>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">Treasury Intelligence</span>
            </div>
          </div>
          <nav className="hidden md:flex gap-1 bg-slate-800/50 p-1 rounded-2xl">
            <button onClick={() => setView(AppView.DASHBOARD)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.DASHBOARD ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>DASHBOARD</button>
            <button onClick={() => setView(AppView.UPLOAD)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.UPLOAD ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>REGISTRO</button>
            <button onClick={() => setView(AppView.BANCOS)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.BANCOS ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>BANCOS</button>
            <button onClick={() => setView(AppView.TABLE)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.TABLE ? 'bg-slate-700 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>GESTIÓN</button>
          </nav>
        </div>
      </header>

      {/* Sync Status Bar */}
      {isSyncing && (
        <div className="bg-blue-600 text-white text-[8px] font-black uppercase tracking-[0.3em] py-1 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
          Sincronizando con Supabase...
        </div>
      )}

      {/* Mobile Nav */}
      <nav className="md:hidden flex overflow-x-auto bg-slate-900 p-2 gap-2 border-t border-white/5 sticky top-16 z-40 no-scrollbar">
        <button onClick={() => setView(AppView.DASHBOARD)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase ${view === AppView.DASHBOARD ? 'bg-white text-slate-900' : 'text-slate-400'}`}>DASHBOARD</button>
        <button onClick={() => setView(AppView.UPLOAD)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase ${view === AppView.UPLOAD ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>REGISTRO</button>
        <button onClick={() => setView(AppView.BANCOS)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase ${view === AppView.BANCOS ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>BANCOS</button>
        <button onClick={() => setView(AppView.TABLE)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase ${view === AppView.TABLE ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>GESTIÓN</button>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 md:p-12">
        {!hasApiKey && (
          <div className="mb-8 bg-red-50 border border-red-100 p-6 rounded-[32px] text-red-600 text-center animate-pulse">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">⚠️ LLAVE DE IA NO DETECTADA</p>
            <p className="text-xs font-bold">Configura process.env.API_KEY para habilitar la extracción automática de datos con Gemini.</p>
          </div>
        )}

        {view === AppView.UPLOAD && (
          <div className="max-w-4xl mx-auto">
            {isProcessing ? (
              <div className="bg-white p-24 rounded-[60px] shadow-2xl text-center border border-slate-100 animate-fadeIn">
                <div className="w-24 h-24 border-[12px] border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-10"></div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Procesando Inteligencia...</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-4">Analizando documento con Gemini Flash AI</p>
              </div>
            ) : successMessage ? (
              <div className="bg-white p-20 rounded-[60px] text-center shadow-2xl border border-slate-100 animate-fadeIn">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-5xl font-black transform rotate-3 shadow-inner">✓</div>
                <p className="text-2xl font-black mb-10 uppercase tracking-tighter">{successMessage}</p>
                <button onClick={reset} className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-colors shadow-xl">Nuevo Registro</button>
              </div>
            ) : extractedData && preCategory ? (
              <ClassificationForm 
                data={extractedData} 
                initialCategory={preCategory} 
                onSave={onRecordSaved} 
                onCancel={reset} 
              />
            ) : preCategory ? (
              <div className="bg-white border-4 border-dashed border-slate-200 rounded-[60px] p-24 text-center relative group hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer animate-fadeIn">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,application/pdf" />
                <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-all text-4xl shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="text-3xl font-black uppercase tracking-tighter">Cargar {preCategory}</p>
                <p className="text-slate-400 font-bold mt-3 text-sm">Arrastra o selecciona PDF o Imagen de Factura</p>
                <button onClick={(e) => {e.stopPropagation(); setPreCategory(null);}} className="mt-12 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 flex items-center justify-center gap-2 mx-auto">
                  <span>←</span> Volver a Categorías
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fadeIn pt-10">
                <button onClick={() => setPreCategory(TransactionCategory.INGRESO)} className="group bg-white p-16 rounded-[60px] shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all text-left border-4 border-transparent hover:border-green-500 overflow-hidden relative">
                  <div className="absolute -right-8 -top-8 w-40 h-40 bg-green-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[28px] flex items-center justify-center mb-10 text-4xl font-black group-hover:scale-110 transition-transform shadow-sm">+</div>
                  <h3 className="text-4xl font-black tracking-tighter mb-4">INGRESOS</h3>
                  <p className="text-slate-400 font-medium leading-relaxed">Facturas de clientes, cobranzas, ventas directas y abonos bancarios.</p>
                </button>
                <button onClick={() => setPreCategory(TransactionCategory.EGRESO)} className="group bg-white p-16 rounded-[60px] shadow-sm hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all text-left border-4 border-transparent hover:border-red-500 overflow-hidden relative">
                   <div className="absolute -right-8 -top-8 w-40 h-40 bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mb-10 text-4xl font-black group-hover:scale-110 transition-transform shadow-sm">−</div>
                  <h3 className="text-4xl font-black tracking-tighter mb-4">EGRESOS</h3>
                  <p className="text-slate-400 font-medium leading-relaxed">Pagos a proveedores, servicios, nómina y gastos operativos.</p>
                </button>
              </div>
            )}
          </div>
        )}

        {view === AppView.BANCOS && (
          <ConciliationModule 
            records={records} 
            onConciliate={(id) => updateRecord(id, { operationState: OperationState.CONCILIADO, isPaid: true })} 
          />
        )}
        {view === AppView.TABLE && (
          <ManagementTable records={records} onUpdateRecord={updateRecord} />
        )}
        {view === AppView.DASHBOARD && (
          <Dashboard records={records} />
        )}
      </main>

      <footer className="bg-slate-900 text-white py-12 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 grayscale opacity-50">
            <div className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center font-black italic text-xs">F</div>
            <h1 className="text-sm font-black tracking-tighter uppercase">FINCORE<span className="text-blue-400 text-[10px] ml-1">AI</span></h1>
          </div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            Treasury & Audit Hub &copy; 2024 | Connected to Supabase Cloud
          </div>
          <div className="flex gap-4 items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[8px] font-black uppercase text-slate-500">Database Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
