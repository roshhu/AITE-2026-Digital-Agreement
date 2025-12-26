import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Lock, ShieldCheck, ArrowRight, Mail } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Hardcoded simple admin check for Demo/MVP
    // In production, this would be a Supabase Auth call
    if (email.toLowerCase() === 'admin@forest.telangana.gov.in' && password === 'admin@2026') {
      localStorage.setItem('admin_auth', 'true');
      toast.success('Access Granted');
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } else {
      toast.error('Invalid Credentials');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rich-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-tiger-pattern opacity-5 pointer-events-none"></div>

      <Toaster position="top-center" />
      
      <div className="mb-8 text-center z-10">
         <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-tiger-gold mx-auto mb-6 shadow-glow overflow-hidden">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Government_of_Telangana_Logo.png/600px-Government_of_Telangana_Logo.png" 
              alt="Gov Logo" 
              className="w-16 h-16 object-contain"
            />
         </div>
         <h1 className="text-3xl font-bold text-tiger-gold uppercase tracking-wider mb-2">Government of Telangana</h1>
         <h2 className="text-xl font-semibold text-slate-300">Forest Department</h2>
         <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest">AITE-2026 Admin Portal</p>
      </div>

      <Card className="w-full max-w-sm bg-slate-900 border-t-4 border-t-deep-govt border-b border-b-slate-800 shadow-2xl z-10">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-white flex items-center justify-center gap-2 text-lg">
            <Lock className="w-5 h-5 text-tiger-gold" /> Authorized Access Only
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@forest.telangana.gov.in"
                  className="pl-9 bg-rich-black border-slate-700 text-white focus:border-tiger-gold focus:ring-tiger-gold h-11"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-rich-black border-slate-700 text-white focus:border-tiger-gold focus:ring-tiger-gold h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-deep-govt hover:bg-forest-800 text-white font-bold py-5 border border-forest-600 shadow-lg mt-4"
              isLoading={loading}
            >
              SECURE LOGIN <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-slate-600 text-xs z-10">
        <p>System access is monitored and logged.</p>
        <p className="mt-1">IP Address: {window.location.hostname}</p>
      </div>
    </div>
  );
}
