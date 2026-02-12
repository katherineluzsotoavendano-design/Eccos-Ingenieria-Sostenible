
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
  const ingresos = records.filter(r => r.category === TransactionCategory.INGRESO);
  const egresos = records.filter(r => r.category === TransactionCategory.EGRESO);
  
  const ingresosPagados = ingresos.filter(r => r.isPaid).reduce((sum, r) => sum + r.amount, 0);
  const totalEgresos = egresos.reduce((sum, r) => sum + r.amount, 0);
  const flujoCajaNeto = ingresosPagados - totalEgresos;
  const liquidezOperativa = totalEgresos > 0 ? (ingresosPagados / totalEgresos) : 0;

  const totalVentas = ingresos.reduce((sum, r) => sum + r.amount, 0);
  const costosFijos = egresos.filter(r => r.costType === 'FIJO').reduce((sum, r) => sum + r.amount, 0);
  const costosVariables = egresos.filter(r => r.costType === 'VARIABLE').reduce((sum, r) => sum + r.amount, 0);
  
  const margenContribucionRatio = totalVentas > 0 ? ((totalVentas - costosVariables) / totalVentas) : 0;
  const facturasPendientes = ingresos.filter(r => !r.isPaid).reduce((sum, r) => sum + r.amount, 0);

  const statsPorLinea = [
    'Capacitaciones Ágiles/Presenciales', 'Consultoría Ambiental', 
    'Consultoría SIG', 'Auditoría Tradicional', 'Auditorías 360'
  ].map(line => {
    const v = ingresos.filter(r => r.serviceLine === line);
    const rev = v.reduce((s, r) => s + r.amount, 0);
    return { name: line.substring(0, 8), ventas: rev };
  }).filter(l => l.ventas > 0);

  const historyData = [...new Set(records.map(r => r.date.substring(0, 7)))].sort().map(m => {
    const inc = ingresos.filter(r => r.date.startsWith(m) && r.isPaid).reduce((s, r) => s + r.amount, 0);
    const exp = egresos.filter(r => r.date.startsWith(m)).reduce((s, r) => s + r.amount, 0);
    return { month: m, ingresos: inc, egresos: exp };
  });

  return (
    <div className="space-y-6 sm:space-y-10 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase leading-none text-slate-900">Módulo KPIs</h2>
          <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] mt-2">Analítica de Gestión</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl sm:rounded-3xl shadow-sm text-center">
            <p className="text-[7px] font-black text-slate-400 uppercase">Caja Real</p>
            <p className="text-lg sm:text-xl font-black text-blue-600">${ingresosPagados.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 px-6 py-3 rounded-2xl sm:rounded-3xl shadow-xl text-center">
            <p className="text-[7px] font-black text-slate-500 uppercase">Flujo Neto</p>
            <p className={`text-lg sm:text-xl font-black ${flujoCajaNeto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${flujoCajaNeto.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Liquidez</p>
          <p className="text-xl sm:text-3xl font-black text-indigo-600">{liquidezOperativa.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Mg Contribución</p>
          <p className="text-xl sm:text-3xl font-black text-emerald-500">{(margenContribucionRatio * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Por Cobrar</p>
          <p className="text-xl sm:text-3xl font-black text-amber-500">${facturasPendientes.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] shadow-sm border border-slate-100">
          <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Operaciones</p>
          <p className="text-xl sm:text-3xl font-black text-slate-900">{records.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[50px] border border-slate-100 shadow-sm">
           <h3 className="text-sm sm:text-xl font-black uppercase tracking-tighter mb-8 text-slate-900">Ventas por Línea</h3>
           <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsPorLinea}>
                  <XAxis dataKey="name" hide />
                  <Tooltip />
                  <Bar dataKey="ventas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[50px] border border-slate-100 shadow-sm">
           <h3 className="text-sm sm:text-xl font-black uppercase tracking-tighter mb-8 text-slate-900">Caja vs Egresos</h3>
           <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <XAxis dataKey="month" hide />
                  <Tooltip />
                  <Area type="monotone" dataKey="ingresos" stroke="#10b981" fill="#10b98120" />
                  <Area type="monotone" dataKey="egresos" stroke="#ef4444" fill="#ef444420" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
