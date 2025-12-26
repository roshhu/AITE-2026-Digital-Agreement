import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import toast, { Toaster } from 'react-hot-toast';
import { FileSignature, AlertCircle, Check, Loader2, Camera, RefreshCcw, Upload, Image as ImageIcon, Globe } from 'lucide-react';
import { translations, Language } from '../translations';

export default function AgreementPage() {
  const navigate = useNavigate();
  const volunteer = useAuthStore((state) => state.volunteer);
  const logout = useAuthStore((state) => state.logout);
  const language = useAuthStore((state) => state.language);
  const setLanguage = useAuthStore((state) => state.setLanguage);
  
  const t = translations[language];

  const sigCanvas = useRef<SignatureCanvas>(null);
  
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [useUpload, setUseUpload] = useState(false); // Toggle between canvas and upload
  const [deviceInfo, setDeviceInfo] = useState({
    ip: 'Unknown',
    fingerprint: 'Unknown',
  });

  const [submitted, setSubmitted] = useState(false); // New state for success view

  // Redirect if no volunteer data
  useEffect(() => {
    if (!volunteer) {
      navigate('/');
    }
  }, [volunteer, navigate]);

  // Fetch IP and basic device info on mount
  useEffect(() => {
    const fetchIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setDeviceInfo(prev => ({ ...prev, ip: data.ip }));
      } catch (e) {
        console.error('Failed to fetch IP', e);
      }
    };
    
    fetchIP();
    
    // Simple fingerprinting
    const fingerprint = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}`;
    setDeviceInfo(prev => ({ ...prev, fingerprint }));
  }, []);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoData(reader.result as string);
        setUseUpload(true); // Automatically switch to upload mode if file selected
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!agreed) {
      toast.error(language === 'en' ? 'You must agree to all conditions.' : 'మీరు అన్ని షరతులను అంగీకరించాలి.');
      return;
    }

    let finalSignatureUrl = '';

    // Check if using upload or canvas
    if (useUpload && photoData) {
        finalSignatureUrl = photoData;
    } else {
        if (sigCanvas.current?.isEmpty()) {
          toast.error(language === 'en' ? 'Please provide your signature (either sign or upload).' : 'దయచేసి మీ సంతకాన్ని అందించండి (సంతకం చేయండి లేదా అప్‌లోడ్ చేయండి).');
          return;
        }
        // Use getCanvas() instead of getTrimmedCanvas() to avoid Vite bundling issues with the trim-canvas dependency
        const canvasData = sigCanvas.current?.getCanvas().toDataURL('image/png');
        if (canvasData) finalSignatureUrl = canvasData;
    }

    if (!finalSignatureUrl) {
        toast.error(language === 'en' ? 'Failed to capture signature.' : 'సంతకం సేకరించడంలో విఫలమైంది.');
        return;
    }

    setIsSubmitting(true);
    try {
      // Agreement Text (snapshot) - Always save English version for official records, or maybe both?
      // For legal purposes, usually the signed text matters. We will save the English one for consistency,
      // or we can save the one the user saw. Let's save the English one + a note about language.
      const agreementText = `GOVERNMENT OF TELANGANA FOREST DEPARTMENT
Ref No: WL17/2025/WL-3
Date: ${new Date().toLocaleDateString('en-GB')}
Language: ${language.toUpperCase()}
... (Full declaration text as agreed)`;

      const { error } = await supabase.from('submissions').insert({
        volunteer_id: volunteer?.id,
        signature_url: finalSignatureUrl, 
        agreement_text: agreementText,
        ip_address: deviceInfo.ip,
        device_fingerprint: deviceInfo.fingerprint,
        fraud_flag: false, // Initial status
        photo_data: useUpload ? finalSignatureUrl : null, // Store separately if it was an upload, for reference
      });

      if (error) throw error;

      // Update volunteer status
      await supabase
        .from('volunteers')
        .update({ status: 'completed' })
        .eq('id', volunteer?.id);

      toast.success(language === 'en' ? 'Agreement Signed Successfully!' : 'ఒప్పందం విజయవంతంగా సంతకం చేయబడింది!');
      setSubmitted(true); // Switch to success view
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(language === 'en' ? 'Failed to submit agreement. Please try again.' : 'ఒప్పందాన్ని సమర్పించడంలో విఫలమైంది. దయచేసి మళ్ళీ ప్రయత్నించండి.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'te' : 'en');
  };

  if (!volunteer) return null;

  if (submitted) {
    return (
        <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center relative">
            <Toaster position="top-center" />
             {/* Language Switcher Floating Button */}
             <button
                onClick={toggleLanguage}
                className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 text-forest-700 hover:bg-slate-50 transition-all"
            >
                <Globe className="w-4 h-4" />
                <span className="font-bold text-sm">{language === 'en' ? 'తెలుగు' : 'English'}</span>
            </button>

            <Card className="max-w-md w-full shadow-lg border-t-4 border-t-green-600">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gov-900">{t.success_title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-slate-600">
                        {t.thank_you}, <span className="font-bold text-slate-900">{volunteer.full_name}</span>.
                    </p>
                    <p className="text-slate-600">
                        {t.success_msg.replace('{district}', volunteer.district)}
                    </p>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                        <p className="text-slate-500 mb-1">{t.ref_no}</p>
                        <p className="text-slate-500">{t.date}: {new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                    <Button 
                        onClick={() => {
                           logout();
                           navigate('/');
                        }} 
                        className="w-full" 
                        variant="outline"
                    >
                        {t.back_home}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 relative">
      <Toaster position="top-center" />
      
      {/* Language Switcher Floating Button */}
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-slate-200 text-forest-700 hover:bg-slate-50 transition-all"
      >
        <Globe className="w-4 h-4" />
        <span className="font-bold text-sm">{language === 'en' ? 'తెలుగు' : 'English'}</span>
      </button>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2 pt-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Government_of_Telangana_Logo.png/600px-Government_of_Telangana_Logo.png" 
            alt="Telangana Govt Logo" 
            className="h-20 mx-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-xl font-bold text-red-600">{t.gov_title}</h1>
          <h2 className="text-lg font-semibold text-red-600">{t.dept_title}</h2>
        </div>

        <Card className="shadow-md border-t-4 border-t-forest-700 bg-light-grey">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-black">{t.ref_no}</p>
                <p className="text-sm font-medium text-black">{t.dated} : 25-12-2025</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-black">{t.office_1}</p>
                <p className="text-xs text-black">{t.office_2}</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-700">{t.to}</p>
              <p className="text-lg font-bold text-forest-900">{t.sri}: {volunteer.full_name}</p>
              <p className="text-sm font-medium text-slate-600">{t.label_email}: {volunteer.email}</p>
              <p className="text-md font-medium text-forest-700 mt-1">{t.allocated_district}: {volunteer.district}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-center text-black">
                {t.sub_text}
              </h3>
            </div>

            <div className="space-y-4 text-slate-800 text-sm md:text-base leading-relaxed text-justify">
              <p>
                {t.para_1.replace('{district}', volunteer.district)}
              </p>
              <p>
                {t.para_2}
              </p>
            </div>

            <div className="space-y-4 text-slate-800 text-sm md:text-base leading-relaxed">
              <h4 className="font-bold text-red-600 text-center uppercase text-lg">{t.decl_title}</h4>
              
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>{t.cond_1}</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>{t.cond_2}</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>{t.cond_3}</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>{t.cond_4}</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <input 
                  type="checkbox" 
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-forest-600 focus:ring-forest-600"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700">
                  {t.agree_checkbox}
                </span>
              </label>
            </div>

            {/* Signature Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <FileSignature className="w-4 h-4 mr-2" />
                  {t.digital_sig}
                </label>
                <div className="text-right">
                    <p className="text-xs text-slate-400">{t.date}: {new Date().toLocaleDateString()}</p>
                    <p className="text-xs text-slate-400">{t.time}: {new Date().toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Digital Pad */}
              <div className={`relative transition-opacity ${useUpload ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white touch-none relative">
                   <Button variant="ghost" size="sm" onClick={clearSignature} className="absolute top-2 right-2 z-10 text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs">
                    {t.clear}
                  </Button>
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{
                      className: 'w-full h-40 bg-white cursor-crosshair'
                    }}
                    backgroundColor="rgba(255, 255, 255, 1)"
                    onBegin={() => setUseUpload(false)} // Switch back to canvas if they start drawing
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {t.sign_instruction}
                </p>
              </div>

              {/* OR Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-slate-400 uppercase">{t.or_camera}</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Compact Camera Option */}
              <div className={`flex items-center gap-4 p-3 bg-slate-50 rounded-lg border transition-all ${useUpload ? 'border-forest-500 bg-forest-50' : 'border-slate-200'}`}>
                 <div className="flex-shrink-0">
                    {photoData ? (
                        <div className="relative w-16 h-16 rounded overflow-hidden border border-slate-300 bg-white">
                            <img src={photoData} alt="Sig" className="w-full h-full object-contain" />
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setPhotoData(null);
                                    setUseUpload(false);
                                }}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            >
                                <RefreshCcw className="text-white w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                            <Camera className="text-slate-300 w-8 h-8" />
                        </div>
                    )}
                 </div>
                 
                 <div className="flex-grow">
                    <input 
                       type="file" 
                       accept="image/*"
                       capture="environment"
                       id="sig-camera"
                       className="hidden"
                       onChange={handlePhotoCapture}
                     />
                     <label 
                       htmlFor="sig-camera" 
                       className="cursor-pointer inline-flex items-center text-sm font-medium text-forest-700 hover:text-forest-800"
                     >
                       <Camera className="w-4 h-4 mr-2" />
                       {photoData ? t.retake_photo : t.take_photo}
                     </label>
                     <p className="text-xs text-slate-500 mt-1">
                        {t.camera_hint}
                     </p>
                 </div>
                 {useUpload && (
                     <Check className="text-forest-600 w-5 h-5" />
                 )}
              </div>

            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-4">
            <Button 
              onClick={handleSubmit} 
              className="w-full h-12 text-lg shadow-lg shadow-forest-200" 
              variant="forest"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t.btn_submitting}
                </>
              ) : (
                <>
                  {t.btn_submit} <Check className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-slate-400">
              Signed on: {new Date().toLocaleString()}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
