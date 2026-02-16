
import React, { useState, useEffect } from 'react';
import { 
  processDocument, 
  saveToExternalDatabase, 
  fetchRecordsFromExternalDatabase, 
  updateRecordInDatabase,
  deleteAllRecordsFromExternalDatabase,
  deleteRecordFromExternalDatabase
} from './services/geminiService';
import { saveToGoogleSheets, loginUser, deleteFromGoogleSheets } from './services/googleSheetsService';
import { FinancialRecord, ExtractedData, TransactionCategory, User } from './types';
import ClassificationForm from './components/ClassificationForm';
import ManagementTable from './components/ManagementTable';
import Dashboard from './components/Dashboard';
import ConciliationModule from './components/ConciliationModule';

enum AppView {
  UPLOAD = 'UPLOAD',
  TABLE = 'TABLE',
  BANCOS = 'BANCOS',
  DASHBOARD = 'DASHBOARD'
}

const EccosLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-4 border-[#00838f] border-r-transparent border-b-transparent rotate-45"></div>
      <div className="absolute inset-0 rounded-full border-4 border-[#a6ce39] border-l-transparent border-t-transparent -rotate-45"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#4a4a49]" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      </div>
    </div>
    <div className="flex flex-col leading-none">
      <span className="font-black text-white text-lg tracking-tighter">ECCOS</span>
      <span className="text-[7px] font-bold text-[#a6ce39] tracking-[0.3em] uppercase">Intelligence</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [preCategory, setPreCategory] = useState<TransactionCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  
  const [currentFileBase64, setCurrentFileBase64] = useState<string | null>(null);
  const [currentFileMime, setCurrentFileMime] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');

  useEffect(() => {
    // Verificación interna silenciosa
    const key = process.env.API_KEY;
    if (!key || key === "" || key === "undefined" || key === "null") {
      setHasApiKey(false);
    }

    const checkSession = async () => {
      const savedSession = localStorage.getItem('fincore_session');
      if (savedSession) {
        try {
          const parsedUser = JSON.parse(savedSession);
          setUser(parsedUser);
          loadInitialData();
        } catch (e) {
          localStorage.removeItem('fincore_session');
        }
      }
      setIsInitializing(false);
    };
    checkSession();
  }, []);

  const loadInitialData = async () => {
    setIsDataLoading(true);
    try {
      const remoteRecords = await fetchRecordsFromExternalDatabase();
      setRecords(remoteRecords);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fincore_session');
    resetFlow();
    setView(AppView.UPLOAD);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErrorMessage(null);
    setAuthStatus('Verificando acceso...');
    
    try {
      const res = await loginUser(authEmail, authPass);
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('fincore_session', JSON.stringify(res.data));
        loadInitialData();
      } else {
        setErrorMessage(res.error || "Acceso denegado.");
      }
    } catch (err) {
      setErrorMessage("Error de conexión con el servidor.");
    } finally {
      setIsAuthLoading(false);
      setAuthStatus('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !preCategory) return;
    
    setErrorMessage(null);
    setIsProcessing(true);
    const pUrl = URL.createObjectURL(file);
    setPreviewUrl(pUrl);
    setCurrentFileMime(file.type);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultStr = reader.result as string;
        if (resultStr?.includes(',')) {
          const base64Content = resultStr.split(',')[1];
          setCurrentFileBase64(base64Content);
          const result = await processDocument(base64Content, file.type, preCategory);
          setExtractedData(result);
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Error al procesar el documento con IA.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onRecordSaved = async (record: FinancialRecord) => {
    setIsSyncing(true);
    try {
      const cloudRes = await saveToGoogleSheets(record, currentFileBase64 || undefined, currentFileMime || undefined);
      const recordWithUrl = { ...record, driveUrl: cloudRes.success ? cloudRes.data?.driveUrl : undefined };
      await saveToExternalDatabase(recordWithUrl);
      setSuccessMessage("✅ REGISTRO ÉXITOSO");
      setRecords([recordWithUrl, ...records]);
    } catch (err) {
      setErrorMessage("Error al sincronizar datos.");
    } finally {
      setIsSyncing(false);
      setExtractedData(null);
      setPreCategory(null);
    }
  };

  const resetFlow = () => {
    setExtractedData(null);
    setPreCategory(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#263238] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-[#a6ce39] rounded-full animate-spin mb-4"></div>
        <p className="text-[#a6ce39] font-black text-[9px] uppercase tracking-[0.4em]">Iniciando plataforma...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#263238] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 md:p-14 animate-fadeIn border-t-8 border-[#00838f]">
          <div className="flex flex-col items-center mb-10">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[#00838f] border-r-transparent border-b-transparent rotate-45"></div>
              <div className="absolute inset-0 rounded-full border-4 border-[#a6ce39] border-l-transparent border-t-transparent -rotate-45"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#4a4a49]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-[#263238]">ECCOS Intelligence</h2>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1 italic">Treasury Control Platform</p>
          </div>
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase text-center">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Email Corporativo</label>
               <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#00838f] rounded-2xl px-6 py-4 font-bold text-sm outline-none transition-all" placeholder="usuario@eccos.pe" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Clave de Acceso</label>
               <input type="password" required value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#00838f] rounded-2xl px-6 py-4 font-bold text-sm outline-none transition-all" placeholder="••••••••" />
             </div>
             
             <button disabled={isAuthLoading} type="submit" className="w-full bg-[#263238] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-[#00838f] shadow-xl transition-all active:scale-95 mt-4 flex items-center justify-center gap-3">
               {isAuthLoading ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                   <span>{authStatus || 'Autenticando...'}</span>
                 </>
               ) : 'INGRESAR A TESORERÍA'}
             </button>
          </form>
          <p className="mt-12 text-[8px] text-center text-slate-300 font-bold uppercase tracking-widest italic tracking-[0.3em]">Auditoría Financiera ECCOS Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f9] text-[#263238]">
      <header className="bg-[#263238] text-white p-4 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <EccosLogo className="cursor-pointer" onClick={() => setView(AppView.UPLOAD)} />
          <nav className="flex gap-1 bg-[#1a252b] p-1 rounded-2xl overflow-x-auto w-full md:w-auto">
            <button onClick={() => { setView(AppView.UPLOAD); resetFlow(); }} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.UPLOAD ? 'bg-[#00838f] text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>AUDITORÍA</button>
            <button onClick={() => setView(AppView.TABLE)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.TABLE ? 'bg-[#4a4a49] text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>TESORERÍA</button>
            <button onClick={() => setView(AppView.BANCOS)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.BANCOS ? 'bg-[#1a252b] text-slate-400 border border-slate-700' : 'text-slate-500 hover:text-white'}`}>BANCOS</button>
            <button onClick={() => setView(AppView.DASHBOARD)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.DASHBOARD ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}>MÉTRICAS</button>
            <button onClick={handleLogout} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase text-red-400 ml-2">SALIR</button>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-10">
        {!hasApiKey && (
          <div className="mb-8 bg-amber-50 border border-amber-200 p-6 rounded-[30px] flex flex-col md:flex-row items-center gap-6 shadow-sm">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg">⚠️</div>
            <div className="flex-grow">
              <h3 className="font-black text-[11px] uppercase text-amber-700 leading-none">Configuración de IA Incompleta</h3>
              <p className="text-[9px] font-bold text-amber-600 uppercase mt-2">
                Detectamos que la API_KEY no ha sido cargada por Vercel. Asegúrate de hacer un Redeploy con la opción "Clear Cache" activada.
              </p>
            </div>
            <button onClick={() => window.location.reload()} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[9px] shadow-lg">Re-Validar</button>
          </div>
        )}

        {view === AppView.UPLOAD && (
          <div className="w-full">
            {isProcessing || isSyncing ? (
              <div className="max-w-4xl mx-auto bg-white p-16 md:p-32 rounded-[50px] shadow-2xl text-center animate-fadeIn border-t-8 border-[#00838f]">
                <div className="w-16 h-16 border-4 border-slate-100 border-t-[#a6ce39] rounded-full animate-spin mx-auto mb-10"></div>
                <h2 className="text-xl font-black uppercase text-[#263238] tracking-tighter">
                  {isSyncing ? 'Sincronizando con la Nube...' : 'IA Analizando Factura...'}
                </h2>
                <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Mantén esta ventana activa por favor</p>
              </div>
            ) : successMessage ? (
              <div className="max-w-4xl mx-auto bg-white p-12 md:p-24 rounded-[50px] text-center shadow-2xl border-t-8 border-[#a6ce39] animate-fadeIn">
                <div className="w-20 h-20 bg-[#a6ce39]/10 text-[#a6ce39] rounded-[30px] flex items-center justify-center mx-auto mb-10 text-4xl font-black">✓</div>
                <p className="text-xl font-black mb-10 uppercase text-[#263238] tracking-tighter">{successMessage}</p>
                <button onClick={resetFlow} className="bg-[#263238] text-white px-12 py-5 rounded-3xl font-black uppercase text-[11px] hover:bg-[#00838f] shadow-2xl transition-all">Nueva Operación</button>
              </div>
            ) : extractedData && preCategory ? (
              <ClassificationForm data={extractedData} initialCategory={preCategory} onSave={onRecordSaved} onCancel={resetFlow} previewUrl={previewUrl || undefined} fileMime={currentFileMime || undefined} />
            ) : preCategory ? (
              <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
                {errorMessage && <div className="p-8 bg-red-50 border-4 border-red-100 rounded-[30px] text-red-600 text-center font-black uppercase text-[10px]">{errorMessage}</div>}
                <div className="bg-white border-4 border-dashed border-slate-200 rounded-[50px] p-16 md:p-32 text-center shadow-sm relative transition-all">
                  <div className="relative group cursor-pointer border-4 border-slate-50 rounded-[40px] p-16 hover:border-[#00838f] transition-all bg-slate-50/30">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} accept="image/*,application/pdf" />
                    <div className="w-16 h-16 bg-[#00838f]/10 text-[#00838f] rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="text-xl font-black uppercase tracking-tighter text-[#263238]">Adjuntar {preCategory === TransactionCategory.INGRESO ? 'Factura Venta' : 'Documento Egreso'}</p>
                    <p className="text-slate-400 font-bold text-[10px] mt-4 uppercase tracking-[0.2em] italic">PDF, JPG o PNG</p>
                  </div>
                  <button onClick={resetFlow} className="mt-12 text-[10px] font-black text-slate-400 uppercase hover:text-[#263238] transition-colors tracking-widest flex items-center gap-2 mx-auto">← REGRESAR</button>
                </div>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-14 animate-fadeIn pt-10 pb-20">
                <button onClick={() => setPreCategory(TransactionCategory.INGRESO)} className="group bg-white p-14 md:p-20 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-b-8 border-transparent hover:border-[#00838f]">
                  <div className="w-14 h-14 bg-[#00838f]/10 text-[#00838f] rounded-2xl flex items-center justify-center mb-10 text-3xl font-black shadow-inner">+</div >
                  <h3 className="text-2xl font-black tracking-tighter mb-4 uppercase text-[#263238]">Ingresos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Ventas y Facturación</p>
                </button>
                <button onClick={() => setPreCategory(TransactionCategory.EGRESO)} className="group bg-white p-14 md:p-20 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-b-8 border-transparent hover:border-[#a6ce39]">
                  <div className="w-14 h-14 bg-[#a6ce39]/10 text-[#a6ce39] rounded-2xl flex items-center justify-center mb-10 text-3xl font-black shadow-inner">−</div >
                  <h3 className="text-2xl font-black tracking-tighter mb-4 uppercase text-[#263238]">Egresos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Gastos y Compras Operativas</p>
                </button>
              </div>
            )}
          </div>
        )}
        {view === AppView.TABLE && (
          <ManagementTable 
            records={records} 
            userRole={user.role} 
            onUpdateRecord={(id, up) => { 
              setRecords(records.map(r => r.id === id ? {...r, ...up} : r)); 
              updateRecordInDatabase(id, up); 
            }}
            onDeleteRecord={(record) => {
              if (confirm("¿Eliminar registro?")) {
                deleteRecordFromExternalDatabase(record.id);
                deleteFromGoogleSheets(record.invoiceNumber, record.category);
                setRecords(records.filter(r => r.id !== record.id));
              }
            }}
          />
        )}
        {view === AppView.BANCOS && <ConciliationModule records={records} onConciliate={() => {}} />}
        {view === AppView.DASHBOARD && <Dashboard records={records} />}
      </main>
    </div>
  );
};

export default App;
