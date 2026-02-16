
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line 
} from 'recharts';
import { FinancialRecord, TransactionCategory, ServiceLine, IncomeType, CostType } from '../types';

interface Props {
  records: FinancialRecord[];
}

const Dashboard: React.FC<Props> = ({ records }) => {
  const [currencyFilter, setCurrencyFilter] = useState<'PEN' | 'USD'>('PEN');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // YYYY-MM
  
  // 1. Lista de meses disponibles para el filtro
  const availableMonths = useMemo(() => {
    const months = [...new Set(records.map(r => r.date.substring(0, 7)))].sort().reverse();
    return months;
  }, [records]);

  // 2. Filtrado base por moneda y mes
  const filteredRecords = useMemo(() => {
    let base = records.filter(r => r.currency === currencyFilter);
    if (selectedMonth !== 'ALL') {
      base = base.filter(r => r.date.startsWith(selectedMonth));
    }
    return base;
  }, [records, currencyFilter, selectedMonth]);

  // 3. Datos del mes anterior para cálculo de crecimiento
  const previousMonthRecords = useMemo(() => {
    if (selectedMonth === 'ALL' || availableMonths.length < 2) return [];
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const prevMonth = availableMonths[currentIndex + 1];
    if (!prevMonth) return [];
    return records.filter(r => r.currency === currencyFilter && r.date.startsWith(prevMonth));
  }, [records, currencyFilter, selectedMonth, availableMonths]);

  // 4. Cálculos Estratégicos (Estratega Financiero)
  const stats = useMemo(() => {
    const calc = (recs: FinancialRecord[]) => {
      const ingresos = recs.filter(r => r.category === TransactionCategory.INGRESO);
      const egresos = recs.filter(r => r.category === TransactionCategory.EGRESO);
      
      const ventasFacturadas = ingresos.reduce((sum, r) => sum + r.amount, 0);
      const cobranzaReal = ingresos.filter(r => r.isPaid || r.isCreditPaid).reduce((sum, r) => sum + r.amount, 0);
      const egresosPagados = egresos.reduce((sum, r) => sum + r.amount, 0);
      const flujoNeto = cobranzaReal - egresosPagados;
      
      const ctasPorCobrar = ingresos.filter(r => !r.isPaid && !r.isCreditPaid).reduce((sum, r) => sum + r.amount, 0);
      const costosVariables = egresos.filter(r => r.costType === 'VARIABLE').reduce((sum, r) => sum + r.amount, 0);
      const costosFijos = egresos.filter(r => r.costType === 'FIJO').reduce((sum, r) => sum + r.amount, 0);
      
      const margenContribucion = ventasFacturadas > 0 ? ((ventasFacturadas - costosVariables) / ventasFacturadas) * 100 : 0;
      const dso = ventasFacturadas > 0 ? (ctasPorCobrar / ventasFacturadas) * 30 : 0;

      return {
        ventasFacturadas,
        cobranzaReal,
        egresosPagados,
        flujoNeto,
        ctasPorCobrar,
        margenContribucion,
        dso,
        costosFijos,
        costosVariables
      };
    };

    const current = calc(filteredRecords);
    const prev = calc(previousMonthRecords);

    const getGrowth = (curr: number, p: number) => {
      if (p === 0) return 0;
      return ((curr - p) / p) * 100;
    };

    return {
      ...current,
      growthVentas: getGrowth(current.ventasFacturadas, prev.ventasFacturadas),
      growthFlujo: getGrowth(current.flujoNeto, prev.flujoNeto),
      growthCobranza: getGrowth(current.cobranzaReal, prev.cobranzaReal),
      growthEgresos: getGrowth(current.egresosPagados, prev.egresosPagados)
    };
  }, [filteredRecords, previousMonthRecords]);

  // Evolución mensual de crecimiento porcentual (Últimos 6 meses)
  const growthTrendData = useMemo(() => {
    const trendMonths = availableMonths.slice(0, 7).reverse();
    return trendMonths.map((m, idx) => {
      if (idx === 0) return { month: m, growth: 0 };
      const currentRecs = records.filter(r => r.currency === currencyFilter && r.date.startsWith(m));
      const prevMonth = trendMonths[idx - 1];
      const prevRecs = records.filter(r => r.currency === currencyFilter && r.date.startsWith(prevMonth));
      
      const currV = currentRecs.filter(r => r.category === TransactionCategory.INGRESO).reduce((s, r) => s + r.amount, 0);
      const prevV = prevRecs.filter(r => r.category === TransactionCategory.INGRESO).reduce((s, r) => s + r.amount, 0);
      
      const growth = prevV > 0 ? ((currV - prevV) / prevV) * 100 : 0;
      return { month: m, growth };
    });
  }, [records, currencyFilter, availableMonths]);

  const renderGrowthBadge = (val: number) => {
    if (selectedMonth === 'ALL' || val === 0) return null;
    const isPos = val > 0;
    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${isPos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <span>{isPos ? '▲' : '▼'}</span>
        <span>{Math.abs(val).toFixed(1)}%</span>
        <span className="opacity-50 text-[8px] ml-1">vs mes ant.</span>
      </div>
    );
  };

  const mesesSupervivencia = useMemo(() => {
    const fijosMensuales = stats.costosFijos || 1;
    return stats.cobranzaReal / fijosMensuales;
  }, [stats]);

  const lineasNegocio = useMemo(() => {
    const lines: ServiceLine[] = [
      'Capacitaciones Ágiles/Presenciales', 'Consultoría Ambiental', 
      'Consultoría SIG', 'Auditoría Tradicional', 'Auditorías 360'
    ];

    return lines.map(line => {
      const lIng = filteredRecords.filter(r => r.category === TransactionCategory.INGRESO && r.serviceLine === line);
      const lEgr = filteredRecords.filter(r => r.category === TransactionCategory.EGRESO && r.serviceLine === line);
      const rev = lIng.reduce((s, r) => s + r.amount, 0);
      const exp = lEgr.reduce((s, r) => s + r.amount, 0);
      const varExp = lEgr.filter(r => r.costType === 'VARIABLE').reduce((s, r) => s + r.amount, 0);
      const mNeto = rev > 0 ? ((rev - exp) / rev) * 100 : 0;
      const mContrib = rev > 0 ? ((rev - varExp) / rev) * 100 : 0;
      const ticket = lIng.length > 0 ? rev / lIng.length : 0;
      const pend = lIng.filter(r => !r.isPaid && !r.isCreditPaid).reduce((s, r) => s + r.amount, 0);
      const dso = rev > 0 ? (pend / rev) * 30 : 0;
      return { name: line, ventas: rev, egresos: exp, mNeto, mContrib, ticket, dso };
    }).filter(l => l.ventas > 0 || l.egresos > 0);
  }, [filteredRecords]);

  return (
    <div className="space-y-12 animate-fadeIn pb-24">
      {/* HEADER ESTRATÉGICO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-10 rounded-[50px] shadow-xl border border-slate-50">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase text-[#263238] italic leading-none">Estrategia ECCOS Intelligence</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-4">Análisis de Crecimiento MoM y Salud de Caja</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-5 w-full lg:w-auto">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border-2 border-slate-100 px-8 py-4 rounded-[24px] font-black text-[12px] text-[#263238] outline-none focus:border-[#00838f] transition-all cursor-pointer uppercase shadow-sm"
          >
            <option value="ALL">Todo el Año</option>
            {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <div className="flex bg-slate-100 p-1.5 rounded-[24px] shadow-inner">
            <button onClick={() => setCurrencyFilter('PEN')} className={`px-8 py-3 rounded-[18px] text-[11px] font-black transition-all ${currencyFilter === 'PEN' ? 'bg-[#00838f] text-white shadow-lg' : 'text-slate-400'}`}>PEN</button>
            <button onClick={() => setCurrencyFilter('USD')} className={`px-8 py-3 rounded-[18px] text-[11px] font-black transition-all ${currencyFilter === 'USD' ? 'bg-[#00838f] text-white shadow-lg' : 'text-slate-400'}`}>USD</button>
          </div>
        </div>
      </div>

      {/* BIG NUMBERS - REAL CASH FOCUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-[#263238] p-10 rounded-[60px] shadow-2xl border-t-8 border-[#00838f] relative overflow-hidden">
          <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-6">Ventas (Facturación)</p>
          <h3 className="text-5xl font-black text-white leading-none tracking-tighter mb-6">
            {stats.ventasFacturadas.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </h3>
          {renderGrowthBadge(stats.growthVentas)}
        </div>

        <div className="bg-white p-10 rounded-[60px] shadow-xl border-t-8 border-[#a6ce39]">
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-6">Cobranza Real (Cash-In)</p>
          <h3 className="text-5xl font-black text-[#263238] leading-none tracking-tighter mb-6">
            {stats.cobranzaReal.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </h3>
          {renderGrowthBadge(stats.growthCobranza)}
        </div>

        <div className="bg-white p-10 rounded-[60px] shadow-xl border-t-8 border-red-400">
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-6">Gastos Ejecutados (Cash-Out)</p>
          <h3 className="text-5xl font-black text-red-500 leading-none tracking-tighter mb-6">
            {stats.egresosPagados.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </h3>
          {renderGrowthBadge(stats.growthEgresos)}
        </div>

        <div className="bg-[#00838f] p-10 rounded-[60px] shadow-2xl border-t-8 border-white/20">
          <p className="text-[11px] font-black uppercase text-white/50 tracking-widest mb-6">Flujo Neto de Operación</p>
          <h3 className="text-5xl font-black text-white leading-none tracking-tighter mb-6">
            {stats.flujoNeto.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </h3>
          {renderGrowthBadge(stats.growthFlujo)}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 italic">Liquidez Operativa</p>
          <p className="text-4xl font-black text-[#263238] tracking-tighter">{mesesSupervivencia.toFixed(1)} <span className="text-xs opacity-40">m.</span></p>
          <p className="text-[9px] font-bold text-[#00838f] mt-2 uppercase">Meses de supervivencia</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 italic">M. de Contribución</p>
          <p className="text-4xl font-black text-[#a6ce39] tracking-tighter">{stats.margenContribucion.toFixed(1)}%</p>
          <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase">Eficiencia Total</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 italic">Gestión Cobro (DSO)</p>
          <p className="text-4xl font-black text-[#00838f] tracking-tighter">{stats.dso.toFixed(0)} <span className="text-xs opacity-40">d.</span></p>
          <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase">Días promedio de cobro</p>
        </div>
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 italic">Ctas. por Cobrar</p>
          <p className="text-4xl font-black text-[#4a4a49] tracking-tighter">
            {stats.ctasPorCobrar.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[9px] font-bold text-red-400 mt-2 uppercase">Capital Pendiente</p>
        </div>
      </div>

      {/* GRÁFICOS ESTRATÉGICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-12 rounded-[60px] shadow-xl border border-slate-50">
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-12 text-[#263238] italic flex items-center gap-3">
             <div className="w-2 h-6 bg-[#a6ce39] rounded-full"></div>
             Crecimiento Mensual (%) - MoM Trend
          </h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} unit="%" />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '25px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'}} />
                <Bar dataKey="growth" radius={[15, 15, 0, 0]} barSize={50}>
                  {growthTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#a6ce39' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-12 rounded-[60px] shadow-xl border border-slate-50">
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-12 text-[#263238] italic flex items-center gap-3">
             <div className="w-2 h-6 bg-[#00838f] rounded-full"></div>
             Mix de Gastos
          </h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Fijos', value: stats.costosFijos },
                    { name: 'Variables', value: stats.costosVariables }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  <Cell fill="#00838f" />
                  <Cell fill="#a6ce39" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLA DE RENTABILIDAD POR LÍNEA */}
      <div className="bg-white p-14 rounded-[70px] shadow-2xl border border-slate-100 overflow-hidden">
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-12 text-[#263238] italic text-center">Desempeño por Unidades de Negocio</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-slate-50">
                <th className="pb-10 text-[12px] font-black uppercase tracking-widest text-slate-400">Línea Estratégica</th>
                <th className="pb-10 text-[12px] font-black uppercase tracking-widest text-slate-400 text-center">Ticket</th>
                <th className="pb-10 text-[12px] font-black uppercase tracking-widest text-slate-400 text-center">M. Neto</th>
                <th className="pb-10 text-[12px] font-black uppercase tracking-widest text-slate-400 text-center">M. Contrib.</th>
                <th className="pb-10 text-[12px] font-black uppercase tracking-widest text-slate-400 text-center">DSO</th>
                <th className="pb-10 text-[12px] font-black uppercase tracking-widest text-slate-400 text-right">Facturado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineasNegocio.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-all">
                  <td className="py-10 pr-6">
                    <span className="font-black text-[#263238] text-[16px] uppercase tracking-tighter">{line.name}</span>
                  </td>
                  <td className="py-10 text-center">
                    <span className="font-bold text-slate-500 text-[14px]">{line.ticket.toLocaleString()}</span>
                  </td>
                  <td className="py-10 text-center">
                    <span className={`px-6 py-2 rounded-2xl text-[12px] font-black ${line.mNeto > 35 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {line.mNeto.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-10 text-center">
                    <span className="font-black text-[#00838f] text-[14px]">{line.mContrib.toFixed(1)}%</span>
                  </td>
                  <td className="py-10 text-center">
                    <span className={`font-bold text-[14px] ${line.dso > 45 ? 'text-red-500' : 'text-slate-400'}`}>{line.dso.toFixed(0)} d.</span>
                  </td>
                  <td className="py-10 text-right">
                    <span className="font-black text-[#263238] text-[18px]">{line.ventas.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
