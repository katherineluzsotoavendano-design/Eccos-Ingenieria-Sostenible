
import React, { useState, useEffect } from 'react';
import { 
  processDocument, 
  saveToExternalDatabase, 
  fetchRecordsFromExternalDatabase, 
  updateRecordInDatabase
} from './services/geminiService';
import { saveToGoogleSheets, loginUser } from './services/googleSheetsService';
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [preCategory, setPreCategory] = useState<TransactionCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [currentFileBase64, setCurrentFileBase64] = useState<string | null>(null);
  const [currentFileMime, setCurrentFileMime] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('fincore_session');
    if (savedUser) setUser(JSON.parse(savedUser));
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const remoteRecords = await fetchRecordsFromExternalDatabase();
    if (remoteRecords.length > 0) setRecords(remoteRecords);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fincore_session');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginUser(authEmail, authPass);
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('fincore_session', JSON.stringify(res.data));
      } else {
        setErrorMessage(res.error || "No autorizado. Verifica tus datos en la hoja USERS.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !preCategory) return;
    
    setIsProcessing(true);
    const pUrl = URL.createObjectURL(file);
    setPreviewUrl(pUrl);
    setCurrentFileMime(file.type);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultStr = reader.result as string;
        if (resultStr && resultStr.includes(',')) {
          const base64Content = resultStr.split(',')[1];
          setCurrentFileBase64(base64Content);
          const result = await processDocument(base64Content, file.type, preCategory);
          setExtractedData(result);
        } else {
          throw new Error("No se pudo leer el archivo.");
        }
      } catch (err) {
        setErrorMessage("⚠️ No se pudo procesar el documento. Intenta con otro formato.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onRecordSaved = async (record: FinancialRecord) => {
    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const cloudRes = await saveToGoogleSheets(record, currentFileBase64 || undefined, currentFileMime || undefined);
      const recordWithUrl = { ...record, driveUrl: cloudRes.success ? cloudRes.data?.driveUrl : undefined };
      
      await saveToExternalDatabase(recordWithUrl);
      
      if (cloudRes.success) {
        setSuccessMessage("✅ REGISTRO ÉXITOSO: Guardado en Sheets y Drive.");
      } else {
        setErrorMessage(cloudRes.error || "Error al sincronizar con Sheets.");
      }
      setRecords([recordWithUrl, ...records]);
    } catch (err) {
      setErrorMessage("Error de comunicación con el servidor.");
    } finally {
      setIsSyncing(false);
      setExtractedData(null);
      setPreCategory(null);
      setCurrentFileBase64(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const resetFlow = () => {
    setExtractedData(null);
    setPreCategory(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 text-slate-800 animate-fadeIn">
           <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl shadow-blue-500/20">F</div>
          </div>
          <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-1">FINCORE AI</h2>
          <p className="text-slate-400 text-center font-bold text-[9px] uppercase tracking-widest mb-8 italic">Control de Tesorería</p>
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase text-center">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Correo Autorizado</label>
               <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 font-bold text-sm outline-none transition-all" placeholder="usuario@empresa.com" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Contraseña</label>
               <input type="password" required value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-4 font-bold text-sm outline-none transition-all" placeholder="••••••••" />
             </div>
             
             <button disabled={isAuthLoading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 shadow-xl transition-all active:scale-95">
               {isAuthLoading ? 'Sincronizando con USERS...' : 'Iniciar Auditoría'}
             </button>
          </form>
          <p className="mt-8 text-[8px] text-center text-slate-300 font-bold uppercase tracking-widest">
            Acceso restringido: Solo personal validado en la hoja USERS de Google Sheets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={resetFlow}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic">F</div>
            <h1 className="text-lg font-black tracking-tighter">FINCORE<span className="text-blue-400">AI</span></h1>
          </div>
          <nav className="hidden md:flex gap-1 bg-slate-800/50 p-1 rounded-2xl">
            <button onClick={() => setView(AppView.UPLOAD)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.UPLOAD ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>AUDITORÍA</button>
            <button onClick={() => setView(AppView.TABLE)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.TABLE ? 'bg-slate-700 text-white shadow-xl' : 'text-slate-400'}`}>REVISIÓN</button>
            <button onClick={() => setView(AppView.BANCOS)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.BANCOS ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400'}`}>BANCOS</button>
            <button onClick={() => setView(AppView.DASHBOARD)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.DASHBOARD ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>MÉTRICAS</button>
            <button onClick={handleLogout} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 ml-4">SALIR</button>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8">
        {view === AppView.UPLOAD && (
          <div className="w-full">
            {isProcessing || isSyncing ? (
              <div className="max-w-4xl mx-auto bg-white p-24 rounded-[60px] shadow-2xl text-center animate-fadeIn">
                <div className="w-20 h-20 border-[8px] border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-10"></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  {isSyncing ? 'Sincronizando con Sheets...' : 'IA Analizando Documento...'}
                </h2>
              </div>
            ) : successMessage ? (
              <div className="max-w-4xl mx-auto bg-white p-20 rounded-[60px] text-center shadow-2xl border border-slate-100 animate-fadeIn">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-4xl font-black shadow-inner">✓</div>
                <p className="text-xl font-black mb-10 uppercase tracking-tighter text-slate-900">{successMessage}</p>
                <button onClick={resetFlow} className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 shadow-xl transition-all">Siguiente Operación</button>
              </div>
            ) : extractedData && preCategory ? (
              <ClassificationForm data={extractedData} initialCategory={preCategory} onSave={onRecordSaved} onCancel={resetFlow} previewUrl={previewUrl || undefined} fileMime={currentFileMime || undefined} />
            ) : preCategory ? (
              <div className="max-w-4xl mx-auto bg-white border-4 border-dashed border-slate-200 rounded-[60px] p-24 text-center relative group hover:border-blue-500 cursor-pointer animate-fadeIn transition-all">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,application/pdf" />
                <p className="text-2xl font-black uppercase tracking-tighter text-slate-900">Subir {preCategory === TransactionCategory.INGRESO ? 'Venta' : 'Gasto'}</p>
                <p className="text-slate-400 font-bold text-[10px] mt-4 uppercase tracking-widest">Formatos PDF o Imágenes</p>
                <button onClick={resetFlow} className="mt-12 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-8 py-3 rounded-full hover:bg-slate-200 transition-colors">← REGRESAR</button>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-10 animate-fadeIn pt-10">
                <button onClick={() => setPreCategory(TransactionCategory.INGRESO)} className="group bg-white p-16 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-4 border-transparent hover:border-green-500">
                  <div className="w-16 h-16 bg-green-50 text-green-600 rounded-[24px] flex items-center justify-center mb-10 text-3xl font-black shadow-inner">+</div >
                  <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase text-slate-900">Ingresos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Ventas y Facturación</p>
                </button>
                <button onClick={() => setPreCategory(TransactionCategory.EGRESO)} className="group bg-white p-16 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-4 border-transparent hover:border-red-500">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-[24px] flex items-center justify-center mb-10 text-3xl font-black shadow-inner">−</div >
                  <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase text-slate-900">Egresos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Gastos y Proveedores</p>
                </button>
              </div>
            )}
          </div>
        )}
        {view === AppView.TABLE && <ManagementTable records={records} userRole={user.role} onUpdateRecord={(id, up) => { setRecords(records.map(r => r.id === id ? {...r, ...up} : r)); updateRecordInDatabase(id, up); }} />}
        {view === AppView.BANCOS && <ConciliationModule records={records} onConciliate={(id) => {}} />}
        {view === AppView.DASHBOARD && <Dashboard records={records} />}
      </main>
    </div>
  );
};

export default App;
