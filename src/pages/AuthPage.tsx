import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import toast, { Toaster } from 'react-hot-toast';
import { Lock, User, Mail, Smartphone, ArrowRight, ShieldAlert, BadgeCheck } from 'lucide-react';
import { authService } from '../services/authService';
import { translations } from '../translations';

export default function AuthPage() {
  // Toaster handled in App.tsx globally
  const navigate = useNavigate();
  const setVolunteer = useAuthStore((state) => state.setVolunteer);
  const language = useAuthStore((state) => state.language);
  const setLanguage = useAuthStore((state) => state.setLanguage);
  
  const t = translations[language];

  const [step, setStep] = useState<'details' | 'otp' | 'email_change' | 'support'>('details');
  const [supportData, setSupportData] = useState({
    name: '',
    mobile: '',
    email: ''
  });
  const [supportCategory, setSupportCategory] = useState('Not receiving Email OTP');
  const [supportMessage, setSupportMessage] = useState('');
  const [emailChangeReason, setEmailChangeReason] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [oldEmailManual, setOldEmailManual] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: ''
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  React.useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.email) {
      toast.error('Please fill in all fields');
      return;
    }
    if (formData.mobile.length !== 10) {
      toast.error('Mobile number must be 10 digits');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.sendOtp(formData.name, formData.mobile, formData.email);
      
      if (result.success) {
        // Clear previous toasts to prevent stacking
        toast.dismiss();
        toast.success(`${t.otp_sent} ${result.maskedEmail}`, {
          duration: 4000,
          style: {
            background: '#F0FDF4', // Light Green
            color: '#166534', // Forest Green
            border: '1px solid #BBF7D0',
            fontWeight: '600',
            padding: '12px 16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          iconTheme: {
            primary: '#166534',
            secondary: '#F0FDF4',
          },
        });
        setStep('otp');
        // Start Timer (60s for first attempt)
        if (resendTimer === 0) setResendTimer(60);
      } else {
        if (result.type === 'blocked') {
          toast.error(result.error, { icon: '🚫' });
        } else if (result.type === 'mismatch_silent') {
          toast.error(result.error, {
             style: {
               background: '#dc2626',
               color: '#fff',
               fontWeight: 'bold',
               fontSize: '14px'
             },
             icon: '⚠️',
             duration: 4000
          });
        } else if (result.type === 'mismatch') {
          toast.error(result.error, { icon: '⚠️' });
        } else {
          toast.error(result.error);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const result = await authService.sendOtp(formData.name, formData.mobile, formData.email);
      
      if (result.success) {
        toast.dismiss();
        toast.success(`${t.resend} ${t.otp_sent} ${result.maskedEmail}`);
        
        // Increase timer based on attempts
        const nextAttempts = resendAttempts + 1;
        setResendAttempts(nextAttempts);
        
        let nextTime = 60;
        if (nextAttempts === 1) nextTime = 120; // 2 mins
        if (nextAttempts >= 2) nextTime = 300; // 5 mins
        
        setResendTimer(nextTime);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error('Enter valid OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.verifyOtp(formData.email, otp);
      
      if (result.success && result.volunteer) {
        setVolunteer(result.volunteer);
        toast.success('Verified Successfully!');
        navigate('/agreement');
      } else {
        toast.error(result.error || 'Verification Failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentEmail = formData.email || oldEmailManual;

    if (!currentEmail) {
      setErrorMessage('Please provide your current registered email.');
      return;
    }
    if (!newEmail || !emailChangeReason) {
      setErrorMessage('Please provide a new email and reason.');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      const result = await authService.requestEmailChange(currentEmail, newEmail, emailChangeReason);
      if (result.success) {
        toast.dismiss();
        toast.success('Email change request submitted! Wait for Admin approval.', {
          duration: 4000,
          style: {
            background: '#EFF6FF', // Light Blue
            color: '#1E40AF', // Dark Blue
            border: '1px solid #BFDBFE',
            fontWeight: '600',
            padding: '12px 16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          iconTheme: {
            primary: '#1E40AF',
            secondary: '#EFF6FF',
          },
        });
        setStep('details');
        setNewEmail('');
        setEmailChangeReason('');
        setOldEmailManual('');
        setErrorMessage('');
      } else {
        const msg = result.error || 'Request failed.';
        setErrorMessage(msg);
        toast.error(msg, {
          style: {
            background: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FCA5A5',
            fontWeight: '600',
            padding: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          icon: '⚠️',
          duration: 5000
        });
      }
    } catch (err: any) {
      console.error('Email Change Error:', err);
      const msg = err?.message || 'An unexpected error occurred.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportData.name || !supportData.mobile || !supportData.email || !supportMessage) {
      toast.error('Please fill in all fields including description.');
      return;
    }
    
    if (supportData.mobile.length !== 10) {
        toast.error('Mobile Number must be exactly 10 digits.');
        return;
    }

    setLoading(true);
    try {
      const result = await authService.createSupportTicket(
        supportData.name,
        supportData.mobile,
        supportData.email,
        supportCategory,
        supportMessage
      );

      if (result.success) {
        toast.success('Your support request has been submitted. We will notify you once resolved.', {
          duration: 5000,
          style: {
            background: '#FFFBEB', // Light Yellow/Amber
            color: '#92400E', // Dark Amber
            border: '1px solid #FDE68A',
            fontWeight: '600',
            padding: '12px 16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
          iconTheme: {
            primary: '#F59E0B',
            secondary: '#FFFBEB',
          },
          icon: '🎫'
        });
        setStep('details');
        setSupportMessage('');
        setSupportCategory('Not receiving Email OTP');
      } else {
        toast.error(result.error || 'Failed to submit ticket.', {
             style: {
               background: '#FEF2F2',
               color: '#991B1B',
               border: '1px solid #FCA5A5',
               fontWeight: '600',
             }
        });
      }
    } catch (err) {
      toast.error('Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bamboo-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-tiger-pattern opacity-10 pointer-events-none"></div>
      
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex bg-white rounded-lg shadow-md border border-forest-200 p-1">
            <button 
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${language === 'en' ? 'bg-forest-600 text-white' : 'text-forest-700 hover:bg-forest-50'}`}
            >
                English
            </button>
            <button 
                onClick={() => setLanguage('te')}
                className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${language === 'te' ? 'bg-forest-600 text-white' : 'text-forest-700 hover:bg-forest-50'}`}
            >
                తెలుగు
            </button>
        </div>
      </div>
      
      {/* Header Logos */}
      <div className="mb-8 flex flex-col items-center gap-4 z-10">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-gold-500 overflow-hidden">
           <img 
             src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Government_of_Telangana_Logo.png/600px-Government_of_Telangana_Logo.png" 
             alt="Telangana Forest Dept Logo" 
             className="w-full h-full object-contain p-1"
           />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-forest-900 uppercase tracking-wider border-b-4 border-tiger-500 pb-1 inline-block">
            {t.title}
          </h1>
          <p className="text-forest-700 font-medium mt-2">{t.subtitle}</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-t-8 border-t-tiger-500 bg-light-grey backdrop-blur-sm z-10">
        <CardHeader className="text-center space-y-2 border-b border-bamboo-200 pb-6">
          <CardTitle className="text-2xl font-bold text-forest-900">{t.portal_title}</CardTitle>
          <CardDescription className="text-forest-600">
            {t.portal_desc}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          {step === 'details' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800 flex items-center gap-2">
                  <User size={16} /> {t.label_name}
                </label>
                <Input
                  name="name"
                  placeholder="Demo Volunteer"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="border-forest-200 focus:border-tiger-500 focus:ring-tiger-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800 flex items-center gap-2">
                  <Smartphone size={16} /> {t.label_mobile}
                </label>
                <Input
                  name="mobile"
                  type="tel"
                  placeholder="8555007177"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  disabled={loading}
                  className="border-forest-200 focus:border-tiger-500 focus:ring-tiger-500"
                />
                <div className="text-xs text-forest-600 mt-1 italic">
                  (Please use the mobile number that you provided during your volunteer registration)
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800 flex items-center gap-2">
                  <Mail size={16} /> {t.label_email}
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="demo@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="border-forest-200 focus:border-tiger-500 focus:ring-tiger-500"
                />
                <div className="bg-tiger-50 border border-tiger-200 rounded p-2 text-xs text-tiger-800 mt-1">
                  {t.email_hint}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3 mt-4" 
                isLoading={loading}
              >
                {t.btn_send_otp} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSupportData(formData);
                  setStep('support');
                }}
                className="w-full text-xs text-forest-500 hover:text-forest-700 mt-2 underline"
              >
                {t.help_link}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center justify-center gap-2">
                  <BadgeCheck size={20} />
                  <span className="font-medium">{t.otp_sent} {formData.email}</span>
                </div>
                <p className="text-xs text-slate-500">{t.otp_valid}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800">{t.otp_label}</label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="X X X X X X X X"
                  className="text-center text-2xl tracking-[0.2em] font-mono border-forest-200 py-3"
                  autoFocus
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-tiger-500 hover:bg-tiger-600 text-white font-bold py-3" 
                isLoading={loading}
              >
                {t.btn_verify}
              </Button>

              <div className="text-center">
                 <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className={`text-sm font-bold ${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-forest-600 hover:text-forest-700 underline'}`}
                 >
                    {resendTimer > 0 ? `${t.resend} (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})` : t.resend}
                 </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-full text-xs text-forest-500 hover:text-forest-700 mt-2 underline"
              >
                {t.back_home}
              </button>

              <button
                type="button"
                onClick={() => setStep('email_change')}
                className="w-full text-xs text-forest-500 hover:text-forest-700 mt-4 underline"
              >
                {t.wrong_email_link}
              </button>
            </form>
          )}

          {step === 'email_change' && (
            <form onSubmit={handleEmailChangeRequest} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-forest-900">Request Email Change</h3>
                {formData.email ? (
                   <p className="text-xs text-slate-500">Current: {formData.email}</p>
                ) : (
                   <p className="text-xs text-amber-600 font-medium">Please verify your old email below</p>
                )}
              </div>

              {!formData.email && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-forest-800">Current Registered Email</label>
                  <Input
                    type="email"
                    value={oldEmailManual}
                    onChange={(e) => {
                        setOldEmailManual(e.target.value);
                        setErrorMessage('');
                    }}
                    placeholder="old@example.com"
                    className="border-forest-200"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800">New Email Address</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className="border-forest-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800">Reason for Change</label>
                <Input
                  value={emailChangeReason}
                  onChange={(e) => setEmailChangeReason(e.target.value)}
                  placeholder="e.g. Typo in original email, Lost access"
                  className="border-forest-200"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2" 
                isLoading={loading}
              >
                SUBMIT REQUEST
              </Button>

              <button
                type="button"
                onClick={() => setStep('otp')}
                className="w-full text-sm text-slate-500 hover:text-slate-700 mt-2"
              >
                Cancel & Back to OTP
              </button>
            </form>
          )}
          {step === 'support' && (
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-forest-900">Support Request</h3>
                <p className="text-xs text-slate-500">Submit a ticket to the Forest Department</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-forest-800">Your Name</label>
                    <Input 
                        value={supportData.name} 
                        onChange={(e) => setSupportData({...supportData, name: e.target.value})}
                        placeholder="Full Name"
                        className="h-9 text-sm"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-forest-800">Mobile Number</label>
                    <Input 
                        value={supportData.mobile} 
                        onChange={(e) => setSupportData({...supportData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                        placeholder="Mobile Number"
                        className="h-9 text-sm"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-forest-800">Email</label>
                    <Input 
                        value={supportData.email} 
                        onChange={(e) => setSupportData({...supportData, email: e.target.value})}
                        placeholder="Email Address"
                        className="h-9 text-sm"
                        required
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-forest-800">Issue Category</label>
                <select 
                  className="w-full p-2 border border-forest-200 rounded text-sm focus:ring-forest-500"
                  value={supportCategory}
                  onChange={(e) => setSupportCategory(e.target.value)}
                >
                    <option>Not receiving Email OTP</option>
                    <option>Email is incorrect / needs update</option>
                    <option>Auth Code not working</option>
                    <option>Name mismatch in records</option>
                    <option>District allocation incorrect</option>
                    <option>Technical Issue (Agreement/Signature page)</option>
                    <option>Other</option>
                </select>
              </div>

              {supportCategory === 'Email is incorrect / needs update' ? (
                  <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center">
                          <p className="text-sm text-blue-800 font-bold mb-2">Needs Email Update?</p>
                          <p className="text-xs text-blue-600 mb-4">
                              If your registered email is incorrect, please use the Email Change Request form instead of raising a support ticket.
                          </p>
                          <Button 
                              type="button"
                              onClick={() => {
                                  setStep('email_change');
                                  // Pre-fill email change form if we have data
                                  if (supportData.email) setNewEmail(''); // Reset new email
                                  // We don't have old email in supportData context easily if they typed it manually, 
                                  // but we can assume they might want to use the main form email if available.
                                  // Let's just switch to the step.
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2"
                          >
                              Go to Email Change Request
                          </Button>
                      </div>
                  </div>
              ) : (
                  <>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-forest-800">Describe Your Issue</label>
                        <textarea
                        className="w-full p-2 border border-forest-200 rounded text-sm focus:ring-forest-500 h-24"
                        placeholder="Please describe the problem you are facing..."
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        required
                        />
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2" 
                        isLoading={loading}
                    >
                        SUBMIT TICKET
                    </Button>
                  </>
              )}

              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-full text-sm text-slate-500 hover:text-slate-700 mt-2"
              >
                Cancel & Back
              </button>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="justify-center border-t border-bamboo-200 bg-bamboo-100/50 p-4">
          <div className="flex items-center gap-2 text-xs text-forest-700 opacity-80">
            <ShieldAlert size={14} />
            <span>{t.footer_official}</span>
          </div>
        </CardFooter>
      </Card>
      
      <div className="mt-8 text-center text-forest-800/60 text-xs">
        <p>{t.footer_rights}</p>
      </div>
    </div>
  );
}
