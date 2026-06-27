import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { 
 Users, 
 Flame, 
 TrendingUp, 
 CheckSquare, 
 MessageSquare, 
 MessageCircle, 
 Sparkles, 
 BarChart2,
 PieChart,
 Filter,
 Activity,
 CheckCircle2,
 AlertCircle,
 RefreshCw
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import Button from '../components/ui/Button';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

export default function CRMAnalytics() {
 const { token } = useAuth();
 const [data, setData] = useState(null);
 const [wordCloudData, setWordCloudData] = useState([]);
 const [loading, setLoading] = useState(true);
 
 const [periodType, setPeriodType] = useState('preset');
 const [period, setPeriod] = useState('24h');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [isSyncing, setIsSyncing] = useState(false);

 const handleSync = async () => {
  setIsSyncing(true);
  try {
  const res = await fetch(`${API_URL}/api/analytics/sync`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Sync failed to start');
  // Wait 2 seconds just for visual feedback of button click before returning to normal
  await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
  console.error(err);
  } finally {
  setIsSyncing(false);
  }
  };

 useEffect(() => {
 const fetchMetrics = async () => {
 if (periodType === 'custom' && (!startDate || !endDate)) return;
 
 setLoading(true);
 try {
 let url = `${API_URL}/api/analytics/dashboard?`;
 if (periodType === 'preset') {
 url += `period=${period}`;
 } else {
 url += `startDate=${startDate}&endDate=${endDate}`;
 }

 const [res, wordRes] = await Promise.all([
 fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }),
 fetch(`${API_URL}/api/analytics/wordcloud`, { headers: { 'Authorization': `Bearer ${token}` } })
 ]);

 if (res.ok) {
 const metrics = await res.json();
 setData(metrics);
 }
 if (wordRes.ok) {
 const words = await wordRes.json();
 setWordCloudData(words);
 }
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };
 if (token) {
 fetchMetrics();
 }
 }, [token, periodType, period, startDate, endDate]);

 if (loading) {
 return (
 <div className="py-20 flex justify-center">
 <Spinner className="text-[var(--color-primary)]" />
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-20 text-[var(--color-text-muted)]">
 Failed to load analytics dashboard data.
 </div>
 );
 }

 const { leads, tasks, social, chartData, recentLogs } = data;

 // Max value for bar chart scaling (Engagement)
 const maxVolume = Math.max(...chartData.map(d => d.messages + d.comments), 10);
 
 // Max value for leads chart scaling
 const maxLeadsVolume = Math.max(...chartData.map(d => d.leads), 5);
 
 const chartWidth = Math.max(600, chartData.length * 75 + 100);

 return (
 <div className="fade-in space-y-4 max-w-6xl mx-auto py-4">
 {/* Header & Filters */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <h2 className="text-lg font-bold text-[var(--color-text-main)]">Dashboard</h2>
 
 <div className="flex items-center gap-4">
 {periodType === 'custom' && (
 <div className="flex items-center gap-2">
 <input 
 type="date" 
 className="bg-white border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-sm font-medium rounded-xl focus:ring-[var(--color-border-focus)] focus:border-transparent px-3 py-2.5 "
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 />
 <span className="text-[var(--color-text-light)] text-sm">to</span>
 <input 
 type="date" 
 className="bg-white border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-sm font-medium rounded-xl focus:ring-[var(--color-border-focus)] focus:border-transparent px-3 py-2.5 "
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 />
 </div>
 )}

  <CustomSelect 
  value={periodType === 'custom' ? 'custom' : period}
  onChange={(e) => {
  const val = e.target.value;
  if (val === 'custom') {
  setPeriodType('custom');
  } else {
  setPeriodType('preset');
  setPeriod(val === '24h' ? val : Number(val));
  }
  }}
  options={[
  { value: '24h', label: "Last 24 Hours" },
  { value: 7, label: "Last 7 Days" },
  { value: 14, label: "Last 14 Days" },
  { value: 30, label: "Last 30 Days" },
  { value: 60, label: "Last 2 Months" },
  { value: 180, label: "Last 6 Months" },
  { value: 365, label: "Last 1 Year" },
  { value: "custom", label: "Custom Range..." }
  ]}
  />

 {/* <Button 
  onClick={handleSync}
  loading={isSyncing}
  icon={RefreshCw}
  className="shadow-sm shadow-[var(--color-primary)]/20"
  >
  {isSyncing ? 'Syncing...' : 'Sync Instagram Data'}
  </Button> */}
 </div>
 </div>

 {/* Metric Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 
 {/* Total Leads */}
 <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden group">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-[var(--color-text-muted)]">Total Leads</span>
 <span title="Total number of leads in the CRM" className="flex items-center cursor-help">
   <AlertCircle size={14} className="text-[var(--color-text-light)]" />
 </span>
 </div>
 <div className="flex items-end gap-3">
 <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">{leads.total}</h3>
 </div>
 </div>

 {/* Hot Leads */}
 <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden group">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-[var(--color-text-muted)]">Hot Leads</span>
 <span title="Top-priority leads requiring immediate attention" className="flex items-center cursor-help">
   <AlertCircle size={14} className="text-[var(--color-text-light)]" />
 </span>
 </div>
 <div className="flex items-end gap-3">
 <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">{leads.hot}</h3>
 </div>

 </div>

 {/* Conversion Rate */}
 <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden group">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-[var(--color-text-muted)]">Conversion Rate</span>
 <span title="Percentage of leads marked as Converted" className="flex items-center cursor-help">
   <AlertCircle size={14} className="text-[var(--color-text-light)]" />
 </span>
 </div>
 <div className="flex items-end gap-3">
 <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">{leads.conversionRate}%</h3>
 </div>

 </div>

 {/* Tasks */}
 <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden group">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium text-[var(--color-text-muted)]">Tasks</span>
 <span title="Tasks requiring attention" className="flex items-center cursor-help">
   <AlertCircle size={14} className="text-[var(--color-text-light)]" />
 </span>
 </div>
 <div className="flex items-end gap-3">
 <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">{tasks.pending}</h3>
 </div>

 </div>
 </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Pipeline Distribution Card */}
  <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 flex flex-col justify-between">
  <div>
  <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 mb-4">
  Lead Stage Distribution
  </h3>
  <div className="space-y-4">
  {Object.keys(leads.distribution).map(stage => {
  const count = leads.distribution[stage];
  const pct = leads.total > 0 ? (count / leads.total) * 100 : 0;
  
  let barColor = 'bg-blue-400';
  if (stage === 'contacted') barColor = 'bg-blue-500';
  if (stage === 'qualified') barColor = 'bg-blue-600';
  if (stage === 'converted') barColor = 'bg-[var(--color-primary)]';
  if (stage === 'lost') barColor = 'bg-slate-300';

  return (
  <div key={stage} className="space-y-1">
  <div className="flex items-center justify-between text-xs font-semibold">
  <span className="capitalize text-[var(--color-text-main)]">{stage}</span>
  <span className="text-[var(--color-text-muted)]">{count} ({Math.round(pct)}%)</span>
  </div>
  <div className="w-full h-2.5 bg-[var(--color-bg-active)] rounded-full overflow-hidden">
  <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
  </div>
  </div>
  );
  })}
  </div>
  </div>
  </div>

  {/* Lead Source Distribution */}
  <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 flex flex-col justify-between">
  <div>
  <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 mb-4">
  Lead Origins
  </h3>
  <div className="space-y-4">
  {['dm', 'comment', 'manual'].map(src => {
  const count = leads.sources[src] || 0;
  const pct = leads.total > 0 ? (count / leads.total) * 100 : 0;
  
  let barColor = 'bg-blue-500';
  if (src === 'comment') barColor = 'bg-slate-600';
  if (src === 'manual') barColor = 'bg-slate-300';

  return (
  <div key={src} className="space-y-1">
  <div className="flex items-center justify-between text-xs font-semibold">
  <span className="capitalize text-[var(--color-text-main)]">
  {src === 'dm' ? 'Direct Messages' : src === 'comment' ? 'Post Comments' : 'Manually Added'}
  </span>
  <span className="text-[var(--color-text-muted)]">{count} ({Math.round(pct)}%)</span>
  </div>
  <div className="w-full h-2.5 bg-[var(--color-bg-active)] rounded-full overflow-hidden">
  <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
  </div>
  </div>
  );
  })}
  </div>
  </div>
  </div>
  </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* interaction volume chart */}
 <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 lg:col-span-2">
 <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 mb-6 flex items-center gap-1.5">
 <BarChart2 size={14} /> Social Activity Volume
 </h3>

  {/* Recharts Composed Chart (Bars + Trend Line) */}
  <div className="w-full h-[300px] mt-4 font-sans">
  <ResponsiveContainer width="100%" height="100%">
  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" strokeOpacity={0.5} />
  <XAxis 
  dataKey="day" 
  axisLine={false} 
  tickLine={false} 
  tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}
  dy={10}
  />
  <YAxis 
  axisLine={false} 
  tickLine={false} 
  tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}
  />
  <RechartsTooltip 
  cursor={{ fill: 'var(--color-bg-active)', opacity: 0.4 }}
  contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-main)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
  itemStyle={{ fontWeight: 600 }}
  labelStyle={{ fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}
  />
  <Legend 
  wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}
  iconType="circle"
  />
  <Bar dataKey="messages" name="Direct Messages (DMs)" fill="#6b7280" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
  <Bar dataKey="comments" name="Comments Feed" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
  </ComposedChart>
  </ResponsiveContainer>
  </div></div>

 {/* Social interactions Card */}
 <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 flex flex-col justify-between">
 <div>
 <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 mb-4">
 Social Media Engagement
 </h3>
 
 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-xl text-center">
 <MessageCircle className="mx-auto text-blue-500 mb-1.5" size={20} />
 <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">Incoming DMs</span>
 <span className="text-lg font-bold text-[var(--color-text-main)]">{social.incomingDMs}</span>
 </div>

 <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-xl text-center">
 <MessageCircle className="mx-auto text-green-500 mb-1.5" size={20} />
 <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">Outgoing DMs</span>
 <span className="text-lg font-bold text-[var(--color-text-main)]">{social.outgoingDMs}</span>
 </div>

 <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-xl text-center">
 <MessageSquare className="mx-auto text-purple-500 mb-1.5" size={20} />
 <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">Total Comments</span>
 <span className="text-lg font-bold text-[var(--color-text-main)]">{social.totalComments}</span>
 </div>

 <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-xl text-center">
 <Sparkles className="mx-auto text-yellow-500 mb-1.5" size={20} />
 <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">Successful Replies</span>
 <span className="text-lg font-bold text-[var(--color-text-main)]">{social.totalAutomations}</span>
 </div>
 </div>
 </div>
  </div>
  </div>


 {/* Leads Generation Volume (Separated Chart) */}
 <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300">
 <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 mb-6 flex items-center gap-1.5">
 <TrendingUp size={14} /> Lead Generation
 </h3>

  <div className="w-full h-[240px] mt-4 font-sans">
  <ResponsiveContainer width="100%" height="100%">
  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" strokeOpacity={0.5} />
  <XAxis 
  dataKey="day" 
  axisLine={false} 
  tickLine={false} 
  tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}
  dy={10}
  />
  <YAxis 
  axisLine={false} 
  tickLine={false} 
  tick={{ fill: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600 }}
  />
  <RechartsTooltip 
  cursor={{ fill: 'var(--color-bg-active)', opacity: 0.4 }}
  contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-main)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
  itemStyle={{ fontWeight: 600 }}
  labelStyle={{ fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}
  />
  <Legend 
  wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}
  iconType="circle"
  />
  <Bar dataKey="leads" name="Leads Generated" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
  </BarChart>
  </ResponsiveContainer>
  </div></div>

 {/* Word Cloud Analysis */}
 <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 mb-8">
 <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 mb-6 flex items-center gap-1.5">
 <MessageCircle size={14} /> Comment Word Cloud
 </h3>

 <div className="w-full min-h-80 flex items-center justify-center bg-[var(--color-bg-subtle)] rounded-xl overflow-hidden border border-[var(--color-border-subtle)] p-6">
 {wordCloudData.length > 0 ? (
 <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-center align-middle">
 {(() => {
 const maxVal = Math.max(...wordCloudData.map(w => w.value), 1);
 const minVal = Math.min(...wordCloudData.map(w => w.value), 0);
 const colors = [
  'var(--color-primary)', 
  'var(--color-text-main)', 
  'var(--color-text-muted)', 
  '#6b7280', 
  '#3b82f6'
  ];
 
 // Shuffle array deterministically for visual randomness
 const shuffledWords = [...wordCloudData].sort((a, b) => (a.text.length % 3) - (b.text.length % 3));

 return shuffledWords.map((w, i) => {
 // Scale from 12px to 36px based on frequency for a cleaner look
 const size = 12 + ((w.value - minVal) / (maxVal - minVal || 1)) * 24;
 
 return (
 <span 
 key={w.text} 
 title={`${w.text} (${w.value} uses)`}
 className="cursor-default transition-all duration-300 hover:scale-110"
 style={{ 
 fontSize: `${size}px`, 
 color: colors[i % colors.length], 
 fontWeight: size > 24 ? '800' : size > 16 ? '600' : '500',
 lineHeight: 1.2,
 opacity: size > 18 ? 1 : 0.75
 }}
 >
 {w.text}
 </span>
 );
 });
 })()}
 </div>
 ) : (
 <div className="text-[var(--color-text-muted)] flex flex-col items-center gap-2">
 <MessageSquare size={32} className="opacity-20" />
 <p className="text-sm">Not enough comment data for analysis</p>
 </div>
 )}
 </div>
 </div>

 </div>
 );
}
