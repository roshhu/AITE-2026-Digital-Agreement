export interface Volunteer {
  id: string;
  mobile_number: string;
  email: string;
  full_name: string;
  district: string;
  auth_code: string;
  status: 'pending' | 'completed' | 'blocked';
  fraud_score: 'Low' | 'Medium' | 'High';
  attempts_count: number;
  blocked_at?: string;
  last_login_at?: string;
  serial_no?: number;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  volunteer_id: string;
  signature_url: string;
  agreement_text: string;
  ip_address: string;
  device_fingerprint: string;
  fraud_flag: boolean;
  submitted_at: string;
  photo_data?: string;
}

export interface OtpRecord {
  id: string;
  email: string;
  otp: string;
  expires_at: string;
  attempts_count: number;
  blocked: boolean;
}

export interface DistrictCode {
  name: string;
  code: string;
}

export const DISTRICT_CODES: DistrictCode[] = [
  { name: 'Amrabad Tiger Reserve', code: 'ATR' },
  { name: 'Kawal Tiger Reserve', code: 'KTR' },
  { name: 'Hyderabad', code: 'HYD' },
  { name: 'Adilabad', code: 'ADI' },
  { name: 'Nirmal', code: 'NIR' },
  { name: 'Nalgonda', code: 'NAL' },
  { name: 'Jogulamba Gadwal', code: 'JGD' },
  { name: 'Rajanna Sirisilla', code: 'RSR' },
];
