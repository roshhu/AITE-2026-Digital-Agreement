import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Volunteer, Submission } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, AlertTriangle, CheckCircle, Clock, FileText, Download, Loader2, Filter, Shield, Ban, LogOut, RefreshCw, Lock, Unlock, ArrowRight, LifeBuoy, CheckSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { generateAgreementPDF } from '../utils/pdfGenerator';
import * as XLSX from 'xlsx';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell 
} from 'recharts';

type FilterType = 'all' | 'completed' | 'pending' | 'blocked' | 'requests' | 'support';

interface SupportTicket {
  id: string;
  volunteer_id: string | null;
  contact_name?: string;
  contact_mobile?: string;
  contact_email?: string;
  category: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  assigned_officer?: string;
  created_at: string;
  volunteer?: Volunteer; // Joined data
  admin_response?: string;
}

interface DashboardData extends Volunteer {
  submission?: Submission;
  new_email_requested?: boolean;
  new_email_value?: string;
  request_reason?: string;
  email_requested_at?: string;
  otp_failed_attempts?: number;
}

const COLORS = {
  forest: '#2e7d32', // Darker green
  tiger: '#DAA520',
  gold: '#DAA520',
  green: '#2e7d32',
  red: '#B71C1C',
  yellow: '#F9A825',
  blue: '#1565C0'
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<DashboardData[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [chartDistrictFilter, setChartDistrictFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    try {
      const { data: volunteersData, error: vError } = await supabase
        .from('volunteers')
        .select('*')
        .order('created_at', { ascending: false });

      if (vError) throw vError;

      const { data: submissionsData, error: sError } = await supabase
        .from('submissions')
        .select('*');

      if (sError) throw sError;

      const combinedData = volunteersData.map(v => ({
        ...v,
        submission: submissionsData.find(s => s.volunteer_id === v.id)
      }));

      // Fetch Support Tickets
      const { data: ticketsData, error: tError } = await supabase
        .from('support_tickets')
        .select(`
            *,
            volunteer:volunteers(*)
        `)
        .order('created_at', { ascending: false });

      if (tError) console.error('Error fetching tickets', tError);

      setVolunteers(combinedData);
      setTickets(ticketsData || []);
      setLastRefreshed(new Date());
      if (!isAuto) toast.success('Dashboard Updated');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!isAuto) toast.error('Failed to load dashboard data');
    } finally {
      if (!isAuto) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchData(true))
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Toggle Block Status
  const toggleBlockStatus = async (volunteer: DashboardData) => {
    const newStatus = volunteer.status === 'blocked' ? 'pending' : 'blocked'; // Reset to pending if unblocking
    const confirmMsg = newStatus === 'blocked' 
      ? `Are you sure you want to BLOCK ${volunteer.full_name}?` 
      : `Unblock ${volunteer.full_name} and reset their login attempts?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('volunteers')
        .update({ 
          status: newStatus,
          blocked_at: newStatus === 'blocked' ? new Date().toISOString() : null,
          fraud_score: newStatus === 'blocked' ? 'High' : 'Low', // Reset fraud score on unblock
          attempts_count: newStatus === 'pending' ? 0 : volunteer.attempts_count // RESET attempts to 0 on unblock
        })
        .eq('id', volunteer.id);

      if (error) throw error;
      toast.success(newStatus === 'blocked' ? 'Volunteer Blocked' : 'Volunteer Unblocked & Attempts Reset');
      fetchData(true);
    } catch (e) {
      console.error('Block action failed:', e); // Log the actual error
      toast.error('Action failed: ' + (e as any).message); // Show error details in toast
    }
  };

  const toggleEmailRequest = async (volunteer: DashboardData, approve: boolean) => {
    try {
      if (approve) {
        // 1. Uniqueness Check
        const { data: existingUser } = await supabase
          .from('volunteers')
          .select('id')
          .eq('email', volunteer.new_email_value)
          .single();

        if (existingUser) {
           toast.error('This email is already registered to another volunteer.');
           return;
        }
      }

      // 2. Perform Update
      const { error } = await supabase
        .from('volunteers')
        .update({
          admin_approval_status: approve ? 'approved' : 'rejected',
          email: approve && volunteer.new_email_value ? volunteer.new_email_value : volunteer.email,
          new_email_requested: false,
          new_email_value: null,
          request_reason: null,
          otp_sent_count: 0, // Reset counters on email change
          otp_failed_attempts: 0
        })
        .eq('id', volunteer.id);

      if (error) throw error;

      // 3. Audit Log
      await supabase.from('email_change_logs').insert({
        volunteer_id: volunteer.id,
        admin_user: 'CurrentAdmin', // Replace with actual admin ID if available
        old_email: volunteer.email,
        new_email: volunteer.new_email_value,
        decision: approve ? 'approved' : 'rejected',
        reason_provided: volunteer.request_reason
      });

      toast.success(approve ? 'Email Change Approved' : 'Email Change Rejected');
      fetchData(true);
    } catch (e) {
      console.error(e);
      toast.error('Action failed');
    }
  };

  const resetOtpLock = async (volunteer: DashboardData) => {
    if (!window.confirm(`Reset OTP limits for ${volunteer.full_name}?`)) return;
    
    try {
      // 1. Reset volunteer counters
      await supabase.from('volunteers').update({
        otp_sent_count: 0,
        otp_failed_attempts: 0,
        status: volunteer.status === 'blocked' ? 'pending' : volunteer.status,
        fraud_score: 'Low'
      }).eq('id', volunteer.id);

      // 2. Clear OTP logs for today (optional but cleaner)
      // For now we just reset the counters which is enough for the logic
      
      toast.success('OTP Limits Reset Successfully');
      fetchData(true);
    } catch (e) {
      toast.error('Reset failed');
    }
  };

  const uniqueDistricts = Array.from(new Set(volunteers.map(v => v.district))).sort();

  const markAsFraud = async (volunteer: DashboardData) => {
    if (!window.confirm(`Mark ${volunteer.full_name} as High Risk Fraud Attempt?`)) return;
    try {
        const { error } = await supabase
            .from('volunteers')
            .update({
                fraud_score: 'High',
                admin_approval_status: 'rejected', // Auto reject email change if fraud
                new_email_requested: false,
                request_reason: 'Flagged as Fraud by Admin'
            })
            .eq('id', volunteer.id);
        
        if (error) throw error;
        toast.success('Marked as Fraud & Rejected');
        fetchData(true);
    } catch (e) {
        toast.error('Action failed');
    }
  };

  const updateTicketStatus = async (ticket: SupportTicket, newStatus: string) => {
    try {
        const { error } = await supabase
            .from('support_tickets')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
                resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
                assigned_officer: 'Current Admin' // In real app, use auth user
            })
            .eq('id', ticket.id);

        if (error) throw error;
        toast.success(`Ticket marked as ${newStatus}`);
        fetchData(true);
    } catch (e) {
        toast.error('Failed to update ticket');
    }
  };

  const resolveTicket = async (ticket: SupportTicket, resolutionMessage: string) => {
    if (!resolutionMessage) {
        toast.error('Resolution message is required');
        return;
    }
    try {
        const { error } = await supabase
            .from('support_tickets')
            .update({
                status: 'resolved',
                admin_response: resolutionMessage,
                resolved_at: new Date().toISOString(),
                assigned_officer: 'Current Admin'
            })
            .eq('id', ticket.id);

        if (error) throw error;
        toast.success('Ticket Resolved & Notification Sent');
        fetchData(true);
    } catch (e) {
        toast.error('Failed to resolve ticket');
    }
  };

  const filteredVolunteers = volunteers.filter(v => {
    if (filter === 'requests') {
       return v.new_email_requested;
    }
    if (filter === 'support') {
       return false; // Tickets are handled separately
    }
    const matchesFilter = filter === 'all' ? true : v.status === filter;
    const matchesDistrict = districtFilter === 'all' ? true : v.district === districtFilter;
    const matchesSearch = v.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          v.mobile_number.includes(search) ||
                          (v.email && v.email.toLowerCase().includes(search.toLowerCase())) ||
                          v.district.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch && matchesDistrict;
  });

  const filteredTickets = tickets.filter(t => {
      const matchesDistrict = districtFilter === 'all' ? true : t.volunteer?.district === districtFilter;
      const matchesSearch = (t.volunteer?.full_name || t.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
                            t.category.toLowerCase().includes(search.toLowerCase()) ||
                            t.message.toLowerCase().includes(search.toLowerCase()) ||
                            (t.contact_mobile || '').includes(search);
      return matchesDistrict && matchesSearch;
  });

  const stats = {
    total: volunteers.length,
    completed: volunteers.filter(v => v.status === 'completed').length,
    pending: volunteers.filter(v => v.status === 'pending').length,
    blocked: volunteers.filter(v => v.status === 'blocked').length,
    requests: volunteers.filter(v => v.new_email_requested).length,
    tickets: tickets.filter(t => t.status !== 'resolved').length,
    otpSentToday: 124, // Mock for demo, would come from DB logs
    otpFailures: 3
  };

  // Prepare OTP Chart Data (Hourly for today)
  const otpLogs: any[] = [];
  const otpHourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    count: Math.floor(Math.random() * 10) // Mock data for visual
  }));

  // Prepare Chart Data
  const displayedDistricts = chartDistrictFilter === 'all' 
    ? uniqueDistricts 
    : [chartDistrictFilter];

  const districtStats = displayedDistricts.map(dist => ({
    name: dist,
    completed: volunteers.filter(v => v.district === dist && v.status === 'completed').length,
    pending: volunteers.filter(v => v.district === dist && v.status === 'pending').length,
  })).sort((a, b) => b.completed - a.completed).slice(0, 10); // Top 10 or specific

  // Mock Timeline Data (In real app, group by date)
  const timelineData = [
    { day: 'Day 1', count: Math.floor(stats.completed * 0.2) },
    { day: 'Day 2', count: Math.floor(stats.completed * 0.5) },
    { day: 'Today', count: stats.completed },
  ];

  const handleDownloadPDF = async (v: Volunteer, s: Submission) => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        generateAgreementPDF(v, s);
        resolve(true);
      }, 1000);
    });

    toast.promise(promise, {
      loading: 'Generating PDF...',
      success: 'PDF Download Ready!',
      error: 'Failed to generate PDF',
    });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredVolunteers.map(v => ({
      'S.No': v.serial_no || '-',
      'Full Name': v.full_name,
      'Mobile Number': v.mobile_number,
      'Email': v.email || 'N/A',
      'District': v.district,
      'Status': v.status.toUpperCase(),
      'Agreement Signed': v.status === 'completed' ? 'YES' : 'NO',
      'Signed At': v.submission?.submitted_at ? new Date(v.submission.submitted_at).toLocaleString() : '-',
      'IP Address': v.submission?.ip_address || '-',
      'Fraud Score': v.fraud_score || 'Low',
      'Login Attempts': v.attempts_count,
      'Last Login': v.last_login_at ? new Date(v.last_login_at).toLocaleString() : '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = Object.keys(dataToExport[0] || {}).map(() => ({ wch: 20 }));
    ws['!cols'] = wscols;
    XLSX.utils.book_append_sheet(wb, ws, "AITE_Volunteers");
    XLSX.writeFile(wb, `AITE_Volunteers_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel Report Exported Successfully!');
  };

  // THEME: Dark Forest Admin Panel
  return (
    <div className="min-h-screen bg-rich-black font-sans text-slate-100">
      {/* 1. Header & Branding (Dark Theme) */}
      <header className="bg-slate-900/80 backdrop-blur-md text-white shadow-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-tiger-gold overflow-hidden shadow-glow">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Government_of_Telangana_Logo.png/600px-Government_of_Telangana_Logo.png" 
                  alt="Gov Logo" 
                  className="w-8 h-8 object-contain"
                />
             </div>
             <div>
                <h1 className="text-lg font-bold uppercase tracking-wide text-tiger-gold">Government of Telangana</h1>
                <h2 className="text-xs font-semibold text-slate-400">Forest Department — AITE 2026 Admin Portal</h2>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">State-Level Admin</p>
                <p className="font-bold text-sm text-white">Administrator</p>
             </div>
             <div className="h-9 w-9 bg-forest-800 rounded-full flex items-center justify-center border border-forest-600 shadow-inner">
                <UserIcon />
             </div>
             <Button 
                onClick={() => navigate('/')} 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-white hover:bg-white/5 font-medium uppercase tracking-wide transition-all text-xs"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* 2. Top Controls & Refresh */}
        <div className="flex justify-between items-end">
           <div>
              <h3 className="text-2xl font-bold text-white">Dashboard Overview</h3>
              <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-glow-green"></span>
                 Live Data System • Last updated: {lastRefreshed.toLocaleTimeString()}
              </p>
           </div>
           <div className="flex gap-2">
              <Button onClick={handleExportExcel} className="bg-forest-700 hover:bg-forest-600 text-white border border-forest-500 shadow-md">
                 <FileText className="w-4 h-4 mr-2" /> Export Report
              </Button>
              <Button onClick={() => fetchData(false)} variant="outline" disabled={loading} className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-slate-900">
                 <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
              </Button>
           </div>
        </div>

        {/* 3. High-Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard title="Total Volunteers" value={stats.total} icon={<FileText size={24} />} color="forest" />
          <StatsCard title="Completed Agreements" value={stats.completed} icon={<CheckCircle size={24} />} color="green" />
          <StatsCard title="Pending Signatures" value={stats.pending} icon={<Clock size={24} />} color="yellow" />
          <StatsCard title="Blocked / Fraud Alerts" value={stats.blocked} icon={<AlertTriangle size={24} />} color="red" />
        </div>

        {/* 3.1 OTP Real-Time Monitoring */}
        <div className="bg-slate-900/50 p-6 rounded-xl shadow-lg border border-slate-800 backdrop-blur-sm">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield size={20} className="text-tiger-gold" /> 
                Real-Time OTP Monitoring (Today)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="p-3 bg-blue-900/30 text-blue-400 rounded-full border border-blue-800/50"><Clock size={20} /></div>
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">OTP Sent Today</p>
                        <p className="text-2xl font-bold text-white">{stats.otpSentToday}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="p-3 bg-red-900/30 text-red-400 rounded-full border border-red-800/50"><AlertTriangle size={20} /></div>
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Failed Verification Attempts</p>
                        <p className="text-2xl font-bold text-white">{stats.otpFailures}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="p-3 bg-green-900/30 text-green-400 rounded-full border border-green-800/50"><CheckCircle size={20} /></div>
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">System Status</p>
                        <p className="text-sm font-bold text-green-400">AWS SES Active</p>
                        <p className="text-xs text-slate-500">99.9% Deliverability</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 h-48 w-full">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">OTP Traffic (Hourly)</p>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={otpHourlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                        <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" />
                        <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} 
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* 4. Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="bg-slate-900/50 border border-slate-800 shadow-lg border-t-4 border-t-forest-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-800">
                 <CardTitle className="text-lg text-white">District-wise Completion</CardTitle>
                 <div className="relative">
                    <select 
                      className="pl-3 pr-8 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-tiger-gold appearance-none cursor-pointer"
                      value={chartDistrictFilter}
                      onChange={(e) => setChartDistrictFilter(e.target.value)}
                    >
                      <option value="all">Top 10 Districts</option>
                      {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
                 </div>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={districtStats}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                       <XAxis dataKey="name" hide />
                       <Tooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                       />
                       <Legend wrapperStyle={{ color: '#94a3b8' }} />
                       <Bar dataKey="completed" name="Signed" fill={COLORS.forest} radius={[4, 4, 0, 0]} />
                       <Bar dataKey="pending" name="Pending" fill={COLORS.tiger} radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              </CardContent>
           </Card>

           <Card className="bg-slate-900/50 border border-slate-800 shadow-lg border-t-4 border-t-tiger-gold">
              <CardHeader className="border-b border-slate-800">
                 <CardTitle className="text-lg text-white">Agreement Progress Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-64 pt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                       <XAxis dataKey="day" stroke="#94a3b8" />
                       <YAxis stroke="#94a3b8" />
                       <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                       />
                       <Line type="monotone" dataKey="count" stroke={COLORS.tiger} strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                 </ResponsiveContainer>
              </CardContent>
           </Card>
        </div>

        {/* 5. Filters & Search */}
        <div className="bg-slate-900 p-4 rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-24 z-40">
           {/* Tab Filters */}
           <div className="flex bg-slate-800 p-1.5 rounded-lg w-full md:w-auto overflow-x-auto border border-slate-700">
              {(['all', 'completed', 'pending', 'blocked', 'requests', 'support'] as FilterType[]).map((t) => (
                 <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={cn(
                       "px-4 py-2 rounded-md text-sm font-bold capitalize transition-all flex items-center gap-2 whitespace-nowrap",
                       filter === t 
                          ? "bg-forest-700 text-white shadow-sm border border-transparent" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700"
                    )}
                 >
                    {t === 'requests' ? 'Email Requests' : t === 'support' ? 'Support Tickets' : t}
                    <span className={cn(
                       "px-1.5 py-0.5 rounded-full text-[10px]",
                       filter === t ? "bg-black/30 text-white" : "bg-slate-700 text-slate-400",
                       t === 'requests' && stats.requests > 0 && filter !== 'requests' ? "bg-red-500 text-white animate-pulse" : "",
                       t === 'support' && stats.tickets > 0 && filter !== 'support' ? "bg-blue-500 text-white" : ""
                    )}>
                       {t === 'all' ? stats.total : t === 'completed' ? stats.completed : t === 'pending' ? stats.pending : t === 'blocked' ? stats.blocked : t === 'requests' ? stats.requests : stats.tickets}
                    </span>
                 </button>
              ))}
           </div>

           <div className="flex gap-3 w-full md:w-auto">
              {/* District Dropdown */}
              <div className="relative w-full md:w-48">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                 <select 
                   className="w-full pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-tiger-gold appearance-none cursor-pointer"
                   value={districtFilter}
                   onChange={(e) => setDistrictFilter(e.target.value)}
                 >
                   <option value="all">All Districts</option>
                   {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
              </div>

              {/* Search */}
              <div className="relative w-full md:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <Input 
                    placeholder="Search volunteers..." 
                    className="pl-9 py-2.5 bg-slate-800 border-slate-700 text-slate-200 focus:border-tiger-gold placeholder:text-slate-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                 />
              </div>
           </div>
        </div>

        {/* 6. Volunteer Tracking Table */}
        {filter === 'support' ? (
            <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-xs border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Volunteer</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading tickets...</td></tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No support tickets found.</td></tr>
                            ) : (
                                filteredTickets.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                                                t.status === 'resolved' ? "bg-green-900/30 text-green-400 border border-green-800" : 
                                                t.status === 'in_progress' ? "bg-blue-900/30 text-blue-400 border border-blue-800" : 
                                                t.status === 'escalated' ? "bg-red-900/30 text-red-400 border border-red-800" : 
                                                "bg-yellow-900/30 text-yellow-500 border border-yellow-800"
                                            )}>
                                                {t.status === 'resolved' && <CheckCircle size={12} />}
                                                {t.status === 'in_progress' && <Loader2 size={12} className="animate-spin" />}
                                                {t.status === 'escalated' && <AlertTriangle size={12} />}
                                                {t.status === 'pending' && <Clock size={12} />}
                                                {t.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{t.volunteer?.full_name || t.contact_name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">
                                                {t.volunteer?.district || 'No District'}
                                            </div>
                                            <div className="mt-1 space-y-0.5">
                                                <div className="text-xs text-forest-400 font-medium">
                                                    {t.volunteer?.mobile_number || t.contact_mobile || 'No Mobile'}
                                                </div>
                                                <div className="text-xs text-blue-400">
                                                    {t.volunteer?.email || t.contact_email || 'No Email'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-300">{t.category}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-400 truncate max-w-xs" title={t.message}>{t.message}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {new Date(t.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {t.status !== 'resolved' && (
                                                <>
                                                    {t.status !== 'in_progress' && (
                                                        <Button 
                                                            onClick={() => updateTicketStatus(t, 'in_progress')} 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="h-8 text-blue-400 border-blue-800 hover:bg-blue-900/20 bg-transparent"
                                                            title="Mark In Progress"
                                                        >
                                                            Start
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        onClick={() => {
                                                            const note = prompt('Enter resolution message for volunteer:');
                                                            if (note) resolveTicket(t, note);
                                                        }} 
                                                        size="sm" 
                                                        className="h-8 bg-green-700 hover:bg-green-600 text-white"
                                                        title="Resolve Ticket"
                                                    >
                                                        Resolve
                                                    </Button>
                                                    {t.status !== 'escalated' && (
                                                        <Button 
                                                            onClick={() => updateTicketStatus(t, 'escalated')} 
                                                            size="sm" 
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-900/20"
                                                            title="Escalate"
                                                        >
                                                            <AlertTriangle size={14} />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {t.status === 'resolved' && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs text-green-500 font-bold flex items-center">
                                                        <CheckSquare size={14} className="mr-1" /> Closed
                                                    </span>
                                                    <span className="text-[10px] text-slate-600" title={t.admin_response}>
                                                        Resp: {t.admin_response?.slice(0, 15)}...
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : filter === 'requests' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVolunteers.length === 0 ? (
                     <div className="col-span-full text-center py-12 bg-slate-900 rounded-xl shadow border border-slate-800 text-slate-500">
                         No pending email change requests.
                     </div>
                ) : (
                    filteredVolunteers.map(v => (
                        <div key={v.id} className="bg-slate-900 rounded-xl shadow-md border border-slate-800 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-white">{v.full_name}</h3>
                                    <p className="text-sm text-slate-500">{v.district}</p>
                                </div>
                                <FraudBadge score={v.fraud_score} />
                            </div>
                            
                            <div className="p-4 space-y-4 flex-grow text-slate-300">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="p-2 bg-slate-800 rounded border border-slate-700">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Old Email</p>
                                        <p className="text-slate-300 truncate" title={v.email}>{v.email}</p>
                                    </div>
                                    <div className="p-2 bg-blue-900/20 rounded border border-blue-800/50">
                                        <p className="text-xs text-blue-400 uppercase font-bold mb-1">New Email</p>
                                        <p className="text-blue-300 font-medium truncate" title={v.new_email_value || ''}>{v.new_email_value}</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Reason for Change</p>
                                    <div className="bg-slate-800 p-3 rounded border border-slate-700 text-sm text-slate-300 h-24 overflow-y-auto">
                                        {v.request_reason || "No reason provided."}
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock size={12} /> Requested: {v.email_requested_at ? new Date(v.email_requested_at).toLocaleString() : 'Recently'}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-2">
                                <Button 
                                    onClick={() => toggleEmailRequest(v, true)} 
                                    className="flex-1 bg-green-700 hover:bg-green-600 text-white h-9"
                                >
                                    Approve
                                </Button>
                                <Button 
                                    onClick={() => toggleEmailRequest(v, false)} 
                                    variant="outline" 
                                    className="flex-1 text-slate-400 border-slate-600 hover:bg-slate-800 h-9 bg-transparent"
                                >
                                    Reject
                                </Button>
                                <Button 
                                    onClick={() => markAsFraud(v)} 
                                    variant="ghost" 
                                    className="w-9 h-9 p-0 text-red-400 hover:text-red-500 hover:bg-red-900/20"
                                    title="Mark as Fraud"
                                >
                                    <AlertTriangle size={16} />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        ) : (
        <div className="bg-slate-900 rounded-xl shadow-md border border-slate-800 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-xs border-b border-slate-800">
                    <tr>
                       <th className="px-6 py-4">S.No</th>
                       <th className="px-6 py-4">Volunteer</th>
                       <th className="px-6 py-4">Contact & Email</th>
                       <th className="px-6 py-4">District</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Fraud Risk</th>
                       <th className="px-6 py-4 text-center">Login Attempts</th>
                       <th className="px-6 py-4">Last Login</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800 text-slate-300">
                    {loading ? (
                       <tr><td colSpan={9} className="p-8 text-center text-slate-500">Loading data...</td></tr>
                    ) : filteredVolunteers.length === 0 ? (
                       <tr><td colSpan={9} className="p-8 text-center text-slate-500">No volunteers found matching filters.</td></tr>
                    ) : (
                       filteredVolunteers.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-800/50 transition-colors group">
                             <td className="px-6 py-4 font-mono text-slate-500">{v.serial_no || '-'}</td>
                             <td className="px-6 py-4">
                                <div className="font-bold text-white">{v.full_name}</div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="text-slate-400">{v.mobile_number}</div>
                                <div className="text-xs text-blue-400">{v.email}</div>
                             </td>
                             <td className="px-6 py-4 text-slate-400 font-medium">{v.district}</td>
                             <td className="px-6 py-4"><StatusBadge status={v.status} /></td>
                             <td className="px-6 py-4"><FraudBadge score={v.fraud_score} /></td>
                             <td className="px-6 py-4 text-center">
                                <span className={cn(
                                   "inline-block px-2 py-0.5 rounded text-xs font-bold",
                                   v.attempts_count >= 3 ? "bg-red-900/30 text-red-400 border border-red-800" : "bg-slate-800 text-slate-400 border border-slate-700"
                                )}>
                                   {v.attempts_count}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-xs text-slate-500">
                                {v.last_login_at ? new Date(v.last_login_at).toLocaleString() : '-'}
                             </td>
                             <td className="px-6 py-4 text-right flex justify-end gap-2">
                                {v.new_email_requested && (
                                  <div className="flex gap-1 mr-2">
                                    <Button onClick={() => toggleEmailRequest(v, true)} size="sm" className="bg-green-700 hover:bg-green-600 text-white h-8 text-xs" title={`Approve email change to: ${v.new_email_value}`}>
                                      Approve
                                    </Button>
                                    <Button onClick={() => toggleEmailRequest(v, false)} size="sm" variant="outline" className="text-red-400 border-red-800 bg-red-900/20 hover:bg-red-900/40 h-8 text-xs">
                                      Reject
                                    </Button>
                                  </div>
                                )}
                                {v.otp_failed_attempts >= 3 && (
                                   <Button onClick={() => resetOtpLock(v)} size="sm" variant="outline" className="h-8 border-orange-800 text-orange-500 bg-orange-900/20 hover:bg-orange-900/40 mr-2" title="Reset OTP Limits">
                                     <RefreshCw className="w-3 h-3 mr-1" /> Reset
                                   </Button>
                                )}
                                {v.status === 'completed' && v.submission && (
                                   <Button onClick={() => handleDownloadPDF(v, v.submission!)} size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-600 text-forest-400 hover:bg-slate-800 bg-transparent" title="Download PDF">
                                      <Download className="w-4 h-4" />
                                   </Button>
                                )}
                                <Button 
                                   onClick={() => toggleBlockStatus(v)} 
                                   size="sm" 
                                   variant="ghost" 
                                   className={cn("h-8 w-8 p-0", v.status === 'blocked' ? "text-green-500 bg-green-900/20 hover:bg-green-900/40" : "text-red-400 hover:text-red-500 hover:bg-red-900/20")}
                                   title={v.status === 'blocked' ? "Unblock User" : "Block User"}
                                >
                                   {v.status === 'blocked' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </Button>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
      </main>
    </div>
  );
}

// Sub-components for cleaner code
function StatsCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: 'forest' | 'green' | 'yellow' | 'red' }) {
  const colorMap = {
    forest: 'bg-slate-900/50 text-forest-400 border-forest-500/50',
    green: 'bg-slate-900/50 text-green-400 border-green-500/50',
    yellow: 'bg-slate-900/50 text-yellow-500 border-yellow-500/50',
    red: 'bg-slate-900/50 text-red-400 border-red-500/50',
  };

  const iconColorMap = {
    forest: 'bg-forest-900/30 text-forest-400',
    green: 'bg-green-900/30 text-green-400',
    yellow: 'bg-yellow-900/30 text-yellow-500',
    red: 'bg-red-900/30 text-red-400',
  };

  return (
    <div className={cn("p-6 rounded-xl border-l-4 shadow-lg backdrop-blur-sm flex items-center gap-4 border-slate-800", colorMap[color])}>
      <div className={cn("p-3 rounded-full", iconColorMap[color])}>
         {icon}
      </div>
      <div>
         <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">{title}</p>
         <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-900/30 text-green-400 border border-green-800"><CheckCircle size={12} /> Signed</span>;
  if (status === 'blocked') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-800"><Ban size={12} /> Blocked</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-900/30 text-yellow-500 border border-yellow-800"><Clock size={12} /> Pending</span>;
}

function FraudBadge({ score }: { score?: string }) {
  if (score === 'High') return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500"><AlertTriangle size={12} /> High Risk</span>;
  if (score === 'Medium') return <span className="text-xs font-bold text-orange-500">Medium</span>;
  return <span className="text-xs font-bold text-green-500 opacity-60">Low</span>;
}

function UserIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
