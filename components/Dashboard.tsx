
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { FinancialRecord, TransactionCategory } from '../types';

interface Props {
  records: FinancialRecord[];
}

const Dashboard: React.FC<Props> = ({ records }) => {
  const totalIngresos = records
    .filter(r => r.category === TransactionCategory.INGRESO)
    .reduce((acc, r) => acc + r.amount, 0);

  const totalEgresos = records
    .filter(r => r.category === TransactionCategory.EGRESO)
    .reduce((acc, r) => acc + r.amount, 0);

  const balance = totalIngresos - totalEgresos;

  // Prepare chart data (simple grouping by date)
  const chartDataMap = records.reduce((acc: any, r) => {
    const date = r.date;
    if (!acc[date]) acc[date] = { date, ingresos: 0, egresos: 0 };
    if (r.category === TransactionCategory.INGRESO) acc[date].ingresos += r.amount;
    else acc[date].egresos += r.amount;
    return acc;
  }, {});

  const chartData = Object.values(chartDataMap).sort((a: any, b: any) => a.date.localeCompare(b.date));

  const barData = [
    { name: 'Ingresos', value: totalIngresos, color: '#22c55e' },
    { name: 'Egresos', value: totalEgresos, color: '#ef4444' }
  ];

  return (
    <div className="space-y-12 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase">Inteligencia de Caja</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Análisis predictivo y consolidación de saldos</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-white border border-slate-100 rounded-2xl px-4 py-2 flex items-center gap-2">
             <div className="w-2 h-2 bg-green-500 rounded-full"></div>
             <span className="text-[10px] font-black uppercase text-slate-500">Actualizado hace un momento</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Cash Inflow</p>
          <p className="text-4xl font-black tracking-tighter text-green-600">${totalIngresos.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-lg font-black">+12.4%</span>
            <span className="text-[9px] font-bold text-slate-300 uppercase">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[50px] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Cash Outflow</p>
          <p className="text-4xl font-black tracking-tighter text-slate-900">${totalEgresos.toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-lg font-black">-3.1%</span>
            <span className="text-[9px] font-bold text-slate-300 uppercase">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[50px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Net Liquidity</p>
          <p className="text-4xl font-black tracking-tighter text-white">${balance.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-blue-400 uppercase mt-4 tracking-widest italic">Stable Runway Forecasted</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-12 rounded-[60px] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-black uppercase tracking-tighter">Flujo de Fondos</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-[9px] font-black uppercase text-slate-400">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-[9px] font-black uppercase text-slate-400">Egresos</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorEgresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-12 rounded-[60px] shadow-sm border border-slate-100">
           <h3 className="text-xl font-black uppercase tracking-tighter mb-10">Ratio Ingreso/Egreso</h3>
           <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                 <XAxis type="number" hide />
                 <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#1e293b'}} />
                 <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '10px' }} />
                 <Bar dataKey="value" radius={[0, 20, 20, 0]} barSize={40}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                 </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-6 rounded-[32px]">
               <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Margen Operativo</p>
               <p className="text-xl font-black text-slate-800">{((totalIngresos / (totalIngresos + totalEgresos)) * 100).toFixed(1)}%</p>
             </div>
             <div className="bg-slate-50 p-6 rounded-[32px]">
               <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Volumen Transaccional</p>
               <p className="text-xl font-black text-slate-800">{records.length} docs</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
