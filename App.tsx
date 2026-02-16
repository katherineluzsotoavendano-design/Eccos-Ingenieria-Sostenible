
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
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [preCategory, setPreCategory] = useState<TransactionCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<FinancialRecord | null>(null);
  
  const [currentFileBase64, setCurrentFileBase64] = useState<string | null>(null);
  const [currentFileMime, setCurrentFileMime] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');

  useEffect(() => {
    const savedSession = localStorage.getItem('fincore_session');
    if (savedSession) {
      setUser(JSON.parse(savedSession));
    }
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const remoteRecords = await fetchRecordsFromExternalDatabase();
    setRecords(remoteRecords);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fincore_session');
    resetFlow();
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
      setLastSavedRecord(recordWithUrl);
      setRecords([recordWithUrl, ...records]);
    } catch (err) {
      setErrorMessage("Error de comunicación con el servidor.");
    } finally {
      setIsSyncing(false);
      setExtractedData(null);
      setPreCategory(null);
      setCurrentFileBase64(null);
    }
  };

  const handleDeleteRecord = async (record: FinancialRecord) => {
    if (confirm(`¿Eliminar definitivamente ${record.invoiceNumber}? Esta acción borrará el archivo de Drive y la fila de Sheets.`)) {
      try {
        await deleteRecordFromExternalDatabase(record.id);
        await deleteFromGoogleSheets(record.invoiceNumber, record.category);
        setRecords(records.filter(r => r.id !== record.id));
        if (lastSavedRecord?.id === record.id) resetFlow();
      } catch (err) {
        alert("Problema al eliminar.");
      }
    }
  };

  const handleDeleteLastSaved = async () => {
    if (lastSavedRecord) {
      setIsSyncing(true);
      await handleDeleteRecord(lastSavedRecord);
      setIsSyncing(false);
      resetFlow();
      setSuccessMessage("🗑️ REGISTRO ELIMINADO CORRECTAMENTE.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("⚠️ ¿ESTÁS SEGURO? Se borrará TODO de la base de datos.")) {
      const res = await deleteAllRecordsFromExternalDatabase();
      if (res.success) {
        setRecords([]);
        alert("Base de datos limpia.");
      }
    }
  };

  const resetFlow = () => {
    setExtractedData(null);
    setPreCategory(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setLastSavedRecord(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#263238] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-8 md:p-12 text-slate-800 animate-fadeIn border-t-8 border-[#00838f]">
           <div className="flex justify-center mb-8">
             <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-[6px] border-[#00838f] border-r-transparent border-b-transparent rotate-45"></div>
                <div className="absolute inset-0 rounded-full border-[6px] border-[#a6ce39] border-l-transparent border-t-transparent -rotate-45"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#4a4a49]" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                  </svg>
                </div>
              </div>
          </div>
          <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-1 text-[#263238]">ECCOS AI</h2>
          <p className="text-slate-400 text-center font-bold text-[10px] uppercase tracking-widest mb-10 italic">Treasury Intelligence</p>
          
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase text-center">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Usuario Eccos</label>
               <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-bold text-sm outline-none transition-all" placeholder="usuario@eccos.pe" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Contraseña</label>
               <input type="password" required value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#00838f] rounded-2xl px-5 py-4 font-bold text-sm outline-none transition-all" placeholder="••••••••" />
             </div>
             
             <button disabled={isAuthLoading} type="submit" className="w-full bg-[#263238] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-[#00838f] shadow-xl transition-all active:scale-95 mt-4">
               {isAuthLoading ? 'Autenticando...' : 'Iniciar Auditoría AI'}
             </button>
          </form>
          <p className="mt-10 text-[8px] text-center text-slate-300 font-bold uppercase tracking-widest">Plataforma de Control Financiero ECCOS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f9] text-[#263238]">
      <header className="bg-[#263238] text-white p-4 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <EccosLogo className="cursor-pointer" />
          
          <nav className="flex gap-1 bg-[#1a252b] p-1 rounded-2xl overflow-x-auto w-full md:w-auto custom-scrollbar no-scrollbar">
            <button onClick={() => { setView(AppView.UPLOAD); resetFlow(); }} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.UPLOAD ? 'bg-[#00838f] text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>AUDITORÍA</button>
            <button onClick={() => setView(AppView.TABLE)} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.TABLE ? 'bg-[#4a4a49] text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}>TESORERÍA</button>
            <button onClick={() => setView(AppView.BANCOS)} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.BANCOS ? 'bg-[#1a252b] text-slate-400 border border-slate-700' : 'text-slate-500'}`}>BANCOS</button>
            <button onClick={() => setView(AppView.DASHBOARD)} className={`whitespace-nowrap flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.DASHBOARD ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}>MÉTRICAS</button>
            <button onClick={handleLogout} className="whitespace-nowrap flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 ml-2">SALIR</button>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-10">
        {view === AppView.UPLOAD && (
          <div className="w-full">
            {isProcessing || isSyncing ? (
              <div className="max-w-4xl mx-auto bg-white p-16 md:p-32 rounded-[50px] shadow-2xl text-center animate-fadeIn border-t-8 border-[#00838f]">
                <div className="w-20 h-20 border-[8px] border-slate-100 border-t-[#a6ce39] rounded-full animate-spin mx-auto mb-10"></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#263238]">
                  {isSyncing ? 'Sincronizando con ECCOS Cloud...' : 'IA Analizando Factura...'}
                </h2>
              </div>
            ) : successMessage ? (
              <div className="max-w-4xl mx-auto bg-white p-12 md:p-24 rounded-[50px] text-center shadow-2xl border-t-8 border-[#a6ce39] animate-fadeIn">
                <div className="w-24 h-24 bg-[#a6ce39]/10 text-[#a6ce39] rounded-[40px] flex items-center justify-center mx-auto mb-12 text-5xl font-black shadow-inner">✓</div>
                <p className="text-2xl font-black mb-12 uppercase tracking-tighter text-[#263238]">{successMessage}</p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={resetFlow} className="bg-[#263238] text-white px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-[#00838f] shadow-2xl transition-all active:scale-95">Siguiente Auditoría</button>
                  {lastSavedRecord && (
                    <button 
                      onClick={handleDeleteLastSaved}
                      className="bg-red-50 text-red-600 border-2 border-red-100 px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      Eliminar por Error
                    </button>
                  )}
                </div>
              </div>
            ) : extractedData && preCategory ? (
              <ClassificationForm data={extractedData} initialCategory={preCategory} onSave={onRecordSaved} onCancel={resetFlow} previewUrl={previewUrl || undefined} fileMime={currentFileMime || undefined} />
            ) : preCategory ? (
              <div className="max-w-4xl mx-auto bg-white border-4 border-dashed border-slate-200 rounded-[50px] p-16 md:p-32 text-center relative animate-fadeIn transition-all shadow-sm">
                <div className="relative group cursor-pointer border-4 border-slate-50 rounded-[40px] p-16 hover:border-[#00838f] transition-all bg-slate-50/30">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} accept="image/*,application/pdf" />
                  <div className="w-20 h-20 bg-[#00838f]/10 text-[#00838f] rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <p className="text-2xl font-black uppercase tracking-tighter text-[#263238]">Adjuntar {preCategory === TransactionCategory.INGRESO ? 'Venta' : 'Egreso'}</p>
                  <p className="text-slate-400 font-bold text-[11px] mt-4 uppercase tracking-widest">Soporta PDF, JPG, PNG y Captura de Cámara</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); resetFlow(); }} 
                  className="mt-16 relative z-50 inline-block text-[11px] font-black text-white uppercase tracking-[0.2em] bg-[#4a4a49] px-14 py-6 rounded-full hover:bg-red-600 transition-all shadow-2xl active:scale-95"
                >
                  ← REGRESAR
                </button>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-14 animate-fadeIn pt-10">
                <button onClick={() => setPreCategory(TransactionCategory.INGRESO)} className="group bg-white p-14 md:p-20 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-b-8 border-transparent hover:border-[#00838f]">
                  <div className="w-16 h-16 bg-[#00838f]/10 text-[#00838f] rounded-3xl flex items-center justify-center mb-10 text-4xl font-black shadow-inner">+</div >
                  <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase text-[#263238]">Ingresos</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">Facturación de Proyectos Eccos</p>
                </button>
                <button onClick={() => setPreCategory(TransactionCategory.EGRESO)} className="group bg-white p-14 md:p-20 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-b-8 border-transparent hover:border-[#a6ce39]">
                  <div className="w-16 h-16 bg-[#a6ce39]/10 text-[#a6ce39] rounded-3xl flex items-center justify-center mb-10 text-4xl font-black shadow-inner">−</div >
                  <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase text-[#263238]">Egresos</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic">Compras, Servicios y Gastos Operativos</p>
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
            onDeleteRecord={handleDeleteRecord}
            onDeleteAll={handleDeleteAll}
          />
        )}
        {view === AppView.BANCOS && <ConciliationModule records={records} onConciliate={(id) => {}} />}
        {view === AppView.DASHBOARD && <Dashboard records={records} />}
      </main>
    </div>
  );
};

export default App;
