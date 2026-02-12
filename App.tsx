
import React, { useState, useEffect } from 'react';
import { 
  processDocument, 
  saveToExternalDatabase, 
  fetchRecordsFromExternalDatabase, 
  updateRecordInDatabase
} from './services/geminiService';
import { saveToGoogleSheets, loginUser, registerUser } from './services/googleSheetsService';
import { FinancialRecord, ExtractedData, TransactionCategory, OperationState, User, UserRole } from './types';
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
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Asistente de Proyectos');

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [preCategory, setPreCategory] = useState<TransactionCategory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [currentFileBase64, setCurrentFileBase64] = useState<string | null>(null);
  const [currentFileMime, setCurrentFileMime] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('fincore_session');
    if (savedUser) setUser(JSON.parse(savedUser));

    const loadInitialData = async () => {
      const remoteRecords = await fetchRecordsFromExternalDatabase();
      if (remoteRecords.length > 0) {
        setRecords(remoteRecords);
      }
    };
    loadInitialData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const res = await loginUser(loginEmail, loginPass);
    if (res.success && res.data) {
      setUser(res.data);
      localStorage.setItem('fincore_session', JSON.stringify(res.data));
    } else {
      alert(res.error || "Credenciales incorrectas o acceso no autorizado.");
    }
    setIsLoggingIn(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const res = await registerUser(regName, regEmail, regPass, regRole);
    if (res.success) {
      setIsPendingApproval(true);
      setIsRegisterMode(false);
    } else {
      alert(res.error || "Error al solicitar registro.");
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fincore_session');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !preCategory) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        setCurrentFileBase64(base64);
        setCurrentFileMime(file.type);
        const result = await processDocument(base64, file.type, preCategory);
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
      const cloudRes = await saveToGoogleSheets(record, currentFileBase64 || undefined, currentFileMime || undefined);
      
      const recordWithUrl = {
        ...record,
        driveUrl: cloudRes.success ? cloudRes.data?.driveUrl : undefined
      };

      await saveToExternalDatabase(recordWithUrl);
      
      if (cloudRes.success) {
        setSuccessMessage("✅ Registro completado y archivo guardado en Google Drive.");
      } else {
        setSuccessMessage("✅ Registro local guardado. (Sincronización Cloud pendiente)");
      }
      
      setRecords([recordWithUrl, ...records]);
    } catch (err) {
      console.error(err);
      alert("Hubo un problema al guardar el registro.");
    } finally {
      setIsSyncing(false);
      setExtractedData(null);
      setPreCategory(null);
      setCurrentFileBase64(null);
      setCurrentFileMime(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-10 animate-fadeIn">
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl shadow-blue-500/30">F</div>
          </div>
          
          {isPendingApproval ? (
            <div className="text-center py-4 animate-fadeIn">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter mb-2">Solicitud Enviada</h2>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed mb-8 uppercase tracking-widest">
                Tu solicitud ha sido enviada a Katherine. Recibirás un correo cuando tu acceso sea autorizado.
              </p>
              <button 
                onClick={() => setIsPendingApproval(false)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl"
              >
                Volver al Inicio
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-center tracking-tighter uppercase mb-1">
                {isRegisterMode ? 'Crear Cuenta' : 'Acceso Central'}
              </h2>
              <p className="text-slate-400 text-center font-bold text-[9px] uppercase tracking-widest mb-8">
                Fincore AI - Treasury Intelligence
              </p>
              <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                {isRegisterMode && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Nombre Completo</label>
                    <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" placeholder="Juan Pérez" />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Email Corporativo</label>
                  <input type="email" required value={isRegisterMode ? regEmail : loginEmail} onChange={e => isRegisterMode ? setRegEmail(e.target.value) : setLoginEmail(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" placeholder="usuario@fincore.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Contraseña</label>
                  <input type="password" required value={isRegisterMode ? regPass : loginPass} onChange={e => isRegisterMode ? setRegPass(e.target.value) : setLoginPass(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-sm outline-none transition-all" placeholder="••••••••" />
                </div>
                {isRegisterMode && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Cargo / Rol</label>
                    <select value={regRole} onChange={e => setRegRole(e.target.value as UserRole)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-5 py-3 font-bold text-xs outline-none transition-all">
                      <option value="Gerente General">Gerente General</option>
                      <option value="Asistente de Gerencia">Asistente de Gerencia</option>
                      <option value="Gerente de Proyectos">Gerente de Proyectos</option>
                      <option value="Asistente de Proyectos">Asistente de Proyectos</option>
                    </select>
                  </div>
                )}
                <button disabled={isLoggingIn} type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50 mt-4">
                  {isLoggingIn ? 'Procesando...' : (isRegisterMode ? 'Solicitar Acceso' : 'Iniciar Sesión')}
                </button>
              </form>
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button onClick={() => { setIsRegisterMode(!isRegisterMode); setIsPendingApproval(false); }} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700">
                  {isRegisterMode ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Regístrate'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView(AppView.UPLOAD)}>
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic shadow-lg shadow-blue-500/30">F</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter leading-none">FINCORE<span className="text-blue-400 text-xs ml-1 font-bold">AI</span></h1>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mt-1">Hola, {user.name} ({user.role})</span>
            </div>
          </div>
          <nav className="hidden md:flex gap-1 bg-slate-800/50 p-1 rounded-2xl">
            <button onClick={() => setView(AppView.UPLOAD)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.UPLOAD ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>EXTRAER</button>
            <button onClick={() => setView(AppView.TABLE)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.TABLE ? 'bg-slate-700 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>AUDITORÍA</button>
            <button onClick={() => setView(AppView.BANCOS)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.BANCOS ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}>BANCOS</button>
            <button onClick={() => setView(AppView.DASHBOARD)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === AppView.DASHBOARD ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}>DASHBOARD</button>
            <button onClick={handleLogout} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all ml-4">SALIR</button>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 md:p-12">
        {view === AppView.UPLOAD && (
          <div className="max-w-4xl mx-auto">
            {isProcessing || isSyncing ? (
              <div className="bg-white p-24 rounded-[60px] shadow-2xl text-center border border-slate-100 animate-fadeIn">
                <div className="w-24 h-24 border-[12px] border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-10"></div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">
                  {isSyncing ? 'Guardando en la Nube...' : 'Analizando con IA...'}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4">
                  {isSyncing ? 'Sincronizando con Google Drive y Sheets' : 'Extrayendo datos fiscales'}
                </p>
              </div>
            ) : successMessage ? (
              <div className="bg-white p-20 rounded-[60px] text-center shadow-2xl border border-slate-100 animate-fadeIn">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[32px] flex items-center justify-center mx-auto mb-10 text-5xl font-black shadow-inner">✓</div>
                <p className="text-2xl font-black mb-10 uppercase tracking-tighter">{successMessage}</p>
                <button onClick={() => setSuccessMessage(null)} className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 shadow-xl transition-all">Nueva Extracción</button>
              </div>
            ) : extractedData && preCategory ? (
              <ClassificationForm data={extractedData} initialCategory={preCategory} onSave={onRecordSaved} onCancel={() => setExtractedData(null)} />
            ) : preCategory ? (
              <div className="bg-white border-4 border-dashed border-slate-200 rounded-[60px] p-24 text-center relative group hover:border-blue-500 transition-all cursor-pointer animate-fadeIn">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,application/pdf" />
                <p className="text-3xl font-black uppercase tracking-tighter">Cargar Factura de {preCategory}</p>
                <button onClick={() => setPreCategory(null)} className="mt-12 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">← Cambiar Tipo</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fadeIn pt-10">
                <button onClick={() => setPreCategory(TransactionCategory.INGRESO)} className="group bg-white p-16 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-4 border-transparent hover:border-green-500">
                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[28px] flex items-center justify-center mb-10 text-4xl font-black group-hover:scale-110 transition-transform">+</div>
                  <h3 className="text-4xl font-black tracking-tighter mb-4 uppercase">Ingresos</h3>
                </button>
                <button onClick={() => setPreCategory(TransactionCategory.EGRESO)} className="group bg-white p-16 rounded-[60px] shadow-sm hover:shadow-2xl transition-all text-left border-4 border-transparent hover:border-red-500">
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[28px] flex items-center justify-center mb-10 text-4xl font-black group-hover:scale-110 transition-transform">−</div>
                  <h3 className="text-4xl font-black tracking-tighter mb-4 uppercase">Egresos</h3>
                </button>
              </div>
            )}
          </div>
        )}

        {view === AppView.TABLE && <ManagementTable records={records} onUpdateRecord={(id, up) => setRecords(records.map(r => r.id === id ? {...r, ...up} : r))} />}
        {view === AppView.BANCOS && <ConciliationModule records={records} onConciliate={(id) => {}} />}
        {view === AppView.DASHBOARD && <Dashboard records={records} />}
      </main>
    </div>
  );
};

export default App;
