
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Line, Legend 
} from 'recharts';
import { FinancialRecord, TransactionCategory, ServiceLine } from '../types';

interface Props {
  records: FinancialRecord[];
}

const Dashboard: React.FC<Props> = ({ records }) => {
  // Filtros Base
  const ingresos = records.filter(r => r.category === TransactionCategory.INGRESO);
  const egresos = records.filter(r => r.category === TransactionCategory.EGRESO);
  
  // 1. LIQUIDEZ Y FLUJO (Criterio de Caja / Percibido)
  // Únicamente ingresos PAGADOS (Abonados) se consideran flujo de entrada.
  const ingresosPagados = ingresos.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const totalEgresos = egresos.reduce((sum, r) => sum + r.amount, 0);
  const flujoCajaNeto = ingresosPagados - totalEgresos;
  const liquidezOperativa = totalEgresos > 0 ? (ingresosPagados / totalEgresos) : 0;

  // 2. VENTAS Y RENTABILIDAD (Criterio Devengado)
  const totalVentas = ingresos.reduce((sum, r) => sum + r.amount, 0);
  const costosFijos = egresos.filter(r => r.costType === 'FIJO').reduce((sum, r) => sum + r.amount, 0);
  const costosVariables = egresos.filter(r => r.costType === 'VARIABLE').reduce((sum, r) => sum + r.amount, 0);
  
  const margenContribucionTotal = totalVentas - costosVariables;
  const margenContribucionRatio = totalVentas > 0 ? (margenContribucionTotal / totalVentas) : 0;
  const margenNetoGlobal = totalVentas > 0 ? ((totalVentas - (costosFijos + costosVariables)) / totalVentas) * 100 : 0;

  // 3. COBRANZAS Y DSO
  const facturasPendientes = ingresos.filter(r => !r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const creditosPagados = ingresos.filter(r => r.paymentMode === 'CREDITO' && r.isPaid && r.paidDate && r.date);
  const dsoAnual = creditosPagados.length > 0 ? 
    creditosPagados.reduce((acc, r) => {
      const diff = (new Date(r.paidDate!).getTime() - new Date(r.date).getTime()) / (1000 * 3600 * 24);
      return acc + Math.max(0, diff);
    }, 0) / creditosPagados.length : 0;

  // 4. EFICIENCIA Y RIESGO
  const puntoEquilibrio = margenContribucionRatio > 0 ? (costosFijos / margenContribucionRatio) : 0;
  
  // Tasa de Retención (Clientes recurrentes)
  const clientesUnicos = new Set(ingresos.map(r => r.taxId)).size;
  const totalTransaccionesIngreso = ingresos.length;
  const tasaRetencion = clientesUnicos > 0 ? ((totalTransaccionesIngreso - clientesUnicos) / totalTransaccionesIngreso) * 100 : 0;

  // Ratio de Dependencia (Cliente Top)
  const clientMap = ingresos.reduce((acc: any, r) => {
    acc[r.vendor] = (acc[r.vendor] || 0) + r.amount;
    return acc;
  }, {});
  const maxClientRev = Math.max(...(Object.values(clientMap) as number[]), 0);
  const dependencyRatio = totalVentas > 0 ? (maxClientRev / totalVentas) * 100 : 0;

  // Datos para Gráficos
  const serviceLines: ServiceLine[] = [
    'Capacitaciones Ágiles/Presenciales', 'Consultoría Ambiental', 
    'Consultoría SIG', 'Auditoría Tradicional', 'Auditorías 360'
  ];

  const statsPorLinea = serviceLines.map(line => {
    const v = ingresos.filter(r => r.serviceLine === line);
    const rev = v.reduce((s, r) => s + r.amount, 0);
    const exp = egresos.filter(r => r.serviceLine === line).reduce((s, r) => s + r.amount, 0);
    return {
      name: line.split(' ')[0],
      ventas: rev,
      ticket: v.length > 0 ? rev / v.length : 0,
      margen: rev > 0 ? ((rev - exp) / rev) * 100 : 0
    };
  }).filter(l => l.ventas > 0);

  // Histórico Mensual (Simplificado por fecha de registro)
  const months = [...new Set(records.map(r => r.date.substring(0, 7)))].sort();
  const historyData = months.map(m => {
    const inc = ingresos.filter(r => r.date.startsWith(m) && r.isPaid).reduce((s, r) => s + r.amount, 0);
    const exp = egresos.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.amount, 0);
    return { month: m, ingresos: inc, egresos: exp, balance: inc - exp };
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-10 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-none text-slate-900">Módulo Dashboard (KPIs)</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Analítica de Gestión y Control de Liquidez</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-white border border-slate-100 px-6 py-3 rounded-3xl shadow-sm">
            <p className="text-[8px] font-black text-slate-400 uppercase">Caja Real (Abonos)</p>
            <p className="text-xl font-black text-blue-600">${ingresosPagados.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 px-6 py-3 rounded-3xl shadow-xl">
            <p className="text-[8px] font-black text-slate-500 uppercase">Flujo Neto</p>
            <p className={`text-xl font-black ${flujoCajaNeto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${flujoCajaNeto.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* BLOQUE 1: KPIs DE LIQUIDEZ Y EFICIENCIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Punto de Equilibrio</p>
          <p className="text-3xl font-black tracking-tighter text-slate-900">${puntoEquilibrio.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          <p className="text-[8px] font-bold text-blue-500 mt-2 uppercase">Ventas actuales: ${totalVentas.toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Liquidez Operativa</p>
          <p className="text-3xl font-black tracking-tighter text-indigo-600">{liquidezOperativa.toFixed(2)}</p>
          <p className="text-[8px] font-bold text-slate-300 mt-2 uppercase">Ratio (Caja / Gasto)</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">DSO (Cobranzas)</p>
          <p className="text-3xl font-black tracking-tighter text-amber-500">{dsoAnual.toFixed(0)} <span className="text-sm">días</span></p>
          <p className="text-[8px] font-bold text-slate-300 mt-2 uppercase">Promedio anual de cobro</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Tasa de Retención</p>
          <p className="text-3xl font-black tracking-tighter text-emerald-500">{tasaRetencion.toFixed(1)}%</p>
          <p className="text-[8px] font-bold text-slate-300 mt-2 uppercase">Recurrencia de Clientes</p>
        </div>
      </div>

      {/* BLOQUE 2: GRÁFICOS DE VENTAS Y RENTABILIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
             <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Análisis por Línea de Negocio</h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-[8px] font-black uppercase">Ventas</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-400 rounded-full"></div><span className="text-[8px] font-black uppercase">Ticket Promedio</span></div>
             </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={statsPorLinea}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="ventas" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={50} />
                <Line type="monotone" dataKey="ticket" stroke="#818cf8" strokeWidth={4} dot={{ r: 6, fill: '#818cf8', strokeWidth: 3, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-10 pt-10 border-t border-slate-50">
             {statsPorLinea.map((l, i) => (
               <div key={i} className="bg-slate-50/50 p-4 rounded-3xl text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 truncate">{l.name}</p>
                  <p className="text-xs font-black text-slate-900">${l.ventas.toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-blue-500 mt-1">Ticket: ${l.ticket.toFixed(0)}</p>
                  <p className={`text-[8px] font-black mt-1 ${l.margen > 0 ? 'text-green-500' : 'text-red-500'}`}>Mg: {l.margen.toFixed(0)}%</p>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm flex flex-col">
           <h3 className="text-xl font-black uppercase tracking-tighter mb-8 text-center text-slate-900">Estructura de Gastos</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: 'FIJOS', value: costosFijos },
                      { name: 'VARIABLES', value: costosVariables }
                    ]} 
                    innerRadius={70} 
                    outerRadius={100} 
                    paddingAngle={10} 
                    dataKey="value"
                  >
                    <Cell fill="#0f172a" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="space-y-4 mt-auto">
              <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-[24px]">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gastos Fijos</span>
                 <span className="font-black text-lg">${costosFijos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-50 text-blue-600 p-5 rounded-[24px] border border-blue-100">
                 <span className="text-[9px] font-black uppercase tracking-widest">Gastos Variables</span>
                 <span className="font-black text-lg">${costosVariables.toLocaleString()}</span>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-between px-2">
                 <span className="text-[9px] font-black text-slate-400 uppercase">Eficiencia Operativa</span>
                 <span className="text-[9px] font-black text-indigo-600 uppercase">Target: 85%</span>
              </div>
           </div>
        </div>
      </div>

      {/* BLOQUE 3: FLUJO DE CAJA HISTÓRICO Y RIESGO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
           <h3 className="text-xl font-black uppercase tracking-tighter mb-8 text-slate-900">Flujo de Caja Real (Percibido)</h3>
           <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[50px] shadow-2xl flex flex-col justify-center text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-10">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="white"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
           </div>
           <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-4">Gestión de Riesgo y Cobranzas</h3>
              <div className="grid grid-cols-2 gap-8 mt-10">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dependencia Cliente Top</p>
                    <p className={`text-4xl font-black tracking-tighter ${dependencyRatio > 40 ? 'text-red-400' : 'text-blue-400'}`}>
                       {dependencyRatio.toFixed(1)}%
                    </p>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-4">
                       <div className={`h-full rounded-full ${dependencyRatio > 40 ? 'bg-red-400' : 'bg-blue-400'}`} style={{width: `${dependencyRatio}%`}}></div>
                    </div>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Facturas Pendientes</p>
                    <p className="text-4xl font-black tracking-tighter text-amber-400">
                       ${facturasPendientes.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Monto por recuperar de clientes</p>
                 </div>
              </div>
              <div className="mt-12 bg-white/5 p-6 rounded-3xl border border-white/10">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Eficiencia Operativa (%)</p>
                 <div className="flex justify-between items-end">
                    <p className="text-3xl font-black">{(margenContribucionRatio * 100).toFixed(1)}%</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Utilidad antes de fijos</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
