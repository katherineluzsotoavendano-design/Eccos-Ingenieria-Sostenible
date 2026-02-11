
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Line } from 'recharts';
import { FinancialRecord, TransactionCategory, ServiceLine, CostType } from '../types';

interface Props {
  records: FinancialRecord[];
}

const Dashboard: React.FC<Props> = ({ records }) => {
  // Filtros Base
  const ingresos = records.filter(r => r.category === TransactionCategory.INGRESO);
  const egresos = records.filter(r => r.category === TransactionCategory.EGRESO);
  
  // 1. LIQUIDEZ Y FLUJO (Percibido)
  // IMPORTANTE: Solo ingresos PAGADOS cuentan para el Flujo de Caja Neto
  const ingresosPagados = ingresos.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const totalEgresos = egresos.reduce((sum, r) => sum + r.amount, 0); // Egresos se asumen comprometidos
  const cashFlowNeto = ingresosPagados - totalEgresos;
  const liquidezOperativa = totalEgresos > 0 ? (ingresosPagados / totalEgresos) : 0;

  // 2. VENTAS Y RENTABILIDAD
  const totalVentasDevengado = ingresos.reduce((sum, r) => sum + r.amount, 0);
  const fixedCosts = egresos.filter(r => r.costType === 'FIJO').reduce((sum, r) => sum + r.amount, 0);
  const variableCosts = egresos.filter(r => r.costType === 'VARIABLE').reduce((sum, r) => sum + r.amount, 0);
  
  const margenContribucionTotal = totalVentasDevengado - variableCosts;
  const margenContribucionRatio = totalVentasDevengado > 0 ? (margenContribucionTotal / totalVentasDevengado) * 100 : 0;
  const margenNeto = totalVentasDevengado > 0 ? ((totalVentasDevengado - (fixedCosts + variableCosts)) / totalVentasDevengado) * 100 : 0;

  // 3. DSO (Días de Ventas Pendientes)
  const creditRecords = ingresos.filter(r => r.paymentMode === 'CREDITO' && r.isPaid && r.paidDate && r.date);
  const dsoAnual = creditRecords.length > 0 ? 
    creditRecords.reduce((acc, r) => {
      const diff = (new Date(r.paidDate!).getTime() - new Date(r.date).getTime()) / (1000 * 3600 * 24);
      return acc + Math.max(0, diff);
    }, 0) / creditRecords.length : 0;

  // 4. PUNTO DE EQUILIBRIO
  const puntoEquilibrio = margenContribucionRatio > 0 ? (fixedCosts / (margenContribucionRatio / 100)) : 0;

  // 5. RIESGO: DEPENDENCIA CLIENTE
  const clientRevenueMap = ingresos.reduce((acc: any, r) => {
    acc[r.vendor] = (acc[r.vendor] || 0) + r.amount;
    return acc;
  }, {});
  const maxClientRevenue = Math.max(...(Object.values(clientRevenueMap) as number[]), 0);
  const dependencyRatio = totalVentasDevengado > 0 ? (maxClientRevenue / totalVentasDevengado) * 100 : 0;

  // Data por Línea
  const serviceLines: ServiceLine[] = [
    'Capacitaciones Ágiles/Presenciales',
    'Consultoría Ambiental',
    'Consultoría SIG',
    'Auditoría Tradicional',
    'Auditorías 360',
    'ECCOS GASTO'
  ];

  const lineStats = serviceLines.map(line => {
    const rev = ingresos.filter(r => r.serviceLine === line).reduce((sum, r) => sum + r.amount, 0);
    const exp = egresos.filter(r => r.serviceLine === line).reduce((sum, r) => sum + r.amount, 0);
    const count = ingresos.filter(r => r.serviceLine === line).length;
    return {
      name: line.split(' ')[0],
      ventas: rev,
      margen: rev > 0 ? ((rev - exp) / rev) * 100 : 0,
      ticket: count > 0 ? rev / count : 0
    };
  }).filter(l => l.ventas > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-12 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Dashboard Corporativo</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Analítica de Rentabilidad y Gestión de Riesgos</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-green-50 px-6 py-2 rounded-2xl border border-green-100">
              <p className="text-[8px] font-black text-green-600 uppercase">Liquidez Real (Caja)</p>
              <p className="text-xl font-black text-green-700">${ingresosPagados.toLocaleString()}</p>
           </div>
           <div className="bg-amber-50 px-6 py-2 rounded-2xl border border-amber-100">
              <p className="text-[8px] font-black text-amber-600 uppercase">Cuentas por Cobrar</p>
              <p className="text-xl font-black text-amber-700">${(totalVentasDevengado - ingresosPagados).toLocaleString()}</p>
           </div>
        </div>
      </div>

      {/* BLOQUE 1: KPIs ESTRATÉGICOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Punto de Equilibrio</p>
          <p className="text-3xl font-black tracking-tighter text-slate-900">${puntoEquilibrio.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          <div className="h-1 w-full bg-slate-100 mt-4 rounded-full overflow-hidden">
             <div className="h-full bg-blue-500" style={{width: `${Math.min(100, (totalVentasDevengado/puntoEquilibrio)*100)}%`}}></div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Margen de Contribución</p>
          <p className="text-3xl font-black tracking-tighter text-indigo-600">{margenContribucionRatio.toFixed(1)}%</p>
          <span className="text-[9px] font-bold text-slate-300 uppercase">Total Operativo</span>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">DSO (Días de Cobro)</p>
          <p className="text-3xl font-black tracking-tighter text-amber-500">{dsoAnual.toFixed(0)} Días</p>
          <span className="text-[9px] font-bold text-slate-300 uppercase">Ciclo de Conversión</span>
        </div>
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-xl text-white">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Ratio Dependencia Cliente</p>
          <p className={`text-3xl font-black tracking-tighter ${dependencyRatio > 40 ? 'text-red-400' : 'text-blue-400'}`}>
            {dependencyRatio.toFixed(1)}%
          </p>
          <span className="text-[9px] font-bold text-slate-600 uppercase">Concentración de Riesgo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* VENTAS POR LÍNEA Y TICKET PROMEDIO */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-8">
             <h3 className="text-lg font-black uppercase tracking-tighter">Performance por Línea de Negocio</h3>
             <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span className="text-[8px] font-black uppercase">Ventas</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-200 rounded-sm"></div><span className="text-[8px] font-black uppercase">Ticket Promedio</span></div>
             </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={lineStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="ventas" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                <Line type="monotone" dataKey="ticket" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-50">
             {lineStats.map((l, i) => (
               <div key={i} className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase truncate">{l.name}</p>
                  <p className="text-sm font-black text-slate-900">${l.ventas.toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-indigo-500">Margen: {l.margen.toFixed(0)}%</p>
               </div>
             ))}
          </div>
        </div>

        {/* ESTRUCTURA DE COSTOS */}
        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
           <h3 className="text-lg font-black uppercase tracking-tighter mb-8 text-center">Estructura de Egresos</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={[
                      { name: 'FIJOS', value: fixedCosts },
                      { name: 'VARIABLES', value: variableCosts }
                    ]} 
                    innerRadius={60} 
                    outerRadius={90} 
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
           <div className="space-y-4 mt-4">
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl">
                 <span className="text-[9px] font-black uppercase tracking-widest">Gastos Fijos</span>
                 <span className="font-black">${fixedCosts.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-blue-500 text-white p-4 rounded-2xl">
                 <span className="text-[9px] font-black uppercase tracking-widest">Gastos Variables</span>
                 <span className="font-black">${variableCosts.toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between px-2">
                 <span className="text-[9px] font-black text-slate-400 uppercase">Eficiencia Operativa</span>
                 <span className="text-[9px] font-black text-blue-600 uppercase">Ratio: {((fixedCosts / (fixedCosts + variableCosts)) * 100).toFixed(1)}%</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
