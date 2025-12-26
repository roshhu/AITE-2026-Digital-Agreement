import { supabase } from '../lib/supabase';
import CryptoJS from 'crypto-js';

// Helper to hash OTP
const hashOTP = (otp: string) => {
  return CryptoJS.SHA256(otp).toString();
};

// Helper to normalize name (trim, lowercase, single spaces)
const normalizeName = (name: string) => {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const authService = {
  async sendOtp(name: string, mobile: string, email: string) {
    // 1. Find volunteer by mobile
    const { data: volunteer, error: volError } = await supabase
      .from('volunteers')
      .select('*')
      .eq('mobile_number', mobile)
      .single();

    if (volError || !volunteer) {
      return { success: false, error: 'Details mismatch. Please check and try again.', type: 'mismatch_silent' };
    }

    // 2. Check if blocked
    if (volunteer.status === 'blocked' || (volunteer.attempts_count || 0) >= 5) {
      return { success: false, error: 'Account is blocked due to suspicious activity. Contact Admin.', type: 'blocked' };
    }

    // 2.1 Check Daily OTP Limit (Throttle)
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyLogs } = await supabase
      .from('otp_logs')
      .select('sent_at')
      .eq('email', email)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .order('sent_at', { ascending: false });

    const sentCount = dailyLogs?.length || 0;
    const lastSent = dailyLogs?.[0]?.sent_at ? new Date(dailyLogs[0].sent_at) : null;
    const now = new Date();

    // Max 100 attempts per day (Increased for Testing)
    if (sentCount >= 100) {
      return { success: false, error: 'You have reached today’s maximum OTP requests. Try again tomorrow.', type: 'limit_exceeded' };
    }

    // Throttling Logic
    if (lastSent) {
      const diffMinutes = (now.getTime() - lastSent.getTime()) / 60000;
      let waitTime = 0;
      
      if (sentCount === 1 && diffMinutes < 1) waitTime = 1;
      else if (sentCount === 2 && diffMinutes < 3) waitTime = 3;
      else if (sentCount === 3 && diffMinutes < 5) waitTime = 5;

      if (waitTime > 0) {
        return { success: false, error: `Please wait ${Math.ceil(waitTime - diffMinutes)} minutes before requesting next OTP.`, type: 'throttled' };
      }
    }

    // 3. Verify Email and Mobile (Name is Optional now)
    // const normalizedInputName = normalizeName(name);
    // const normalizedStoredName = normalizeName(volunteer.full_name);
    // const nameMatch = normalizedInputName === normalizedStoredName;
    
    const emailMatch = volunteer.email.toLowerCase().trim() === email.toLowerCase().trim();
    const mobileMatch = volunteer.mobile_number === mobile; // Ensure mobile matches exactly

    if (!emailMatch || !mobileMatch) {
      // 3.1 Log mismatch specifically
      let reason = 'Unknown mismatch';
      if (!mobileMatch) reason = 'Mobile mismatch'; 
      else if (!emailMatch) reason = 'Email mismatch';
      // else if (!nameMatch) reason = 'Name mismatch'; // Disabled

      await supabase.from('name_mismatch_logs').insert({
        volunteer_id: volunteer.id,
        email,
        entered_name: name,
        stored_name: volunteer.full_name,
        reason
      });

      // 3.2 Increment attempts
      const newCount = (volunteer.attempts_count || 0) + 1;
      const updates: any = { attempts_count: newCount };
      
      // 3.3 Fraud Logic
      let errorMsg = `Details mismatch. Please check your spelling exactly.`;
      
      if (newCount >= 2) {
        updates.status = 'blocked';
        updates.fraud_score = 'High';
        errorMsg = 'Maximum attempts exceeded (2 mismatches). Account Blocked for security.';
      }

      await supabase.from('volunteers').update(updates).eq('id', volunteer.id);

      if (newCount >= 2) {
        return { success: false, error: errorMsg, type: 'blocked' };
      }

      const remaining = 2 - newCount;
      return { 
        success: false, 
        error: 'Details mismatch. Please check and try again.',
        type: 'mismatch_silent',
        remaining 
      };
    }

    // Reset attempts on successful match (optional, but good for UX if they finally get it right)
    if ((volunteer.attempts_count || 0) > 0) {
       await supabase.from('volunteers').update({ attempts_count: 0 }).eq('id', volunteer.id);
    }

    // 4. Generate 8-Digit OTP (Matches Supabase Default / UI)
    const otp = Math.floor(10000000 + Math.random() * 90000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    try {
      // 5. Store OTP in DB (Custom Store)
      const { error: otpError } = await supabase
        .from('email_otp_store')
         .upsert({ 
           email, 
           otp: otp, // Fixed: using 'otp' column instead of 'otp_hash'
           expires_at: expiresAt,
           created_at: new Date().toISOString()
         }, { onConflict: 'email' });

      if (otpError) throw otpError;

      // 6. Send OTP via Edge Function (Guarantees 6 Digits)
      const { error: funcError } = await supabase.functions.invoke('send-ses-otp', {
        body: { email, otp }
      });

      if (funcError) {
          console.error('Edge Function Failed:', funcError);
          // Fallback: If function fails (e.g. no key), try Supabase Auth (8 digits)
          console.log('Falling back to Supabase Auth...');
          const { error: authError } = await supabase.auth.signInWithOtp({
              email,
              options: { shouldCreateUser: false }
          });
          if (authError) throw authError;
          return { success: true, message: 'OTP sent (Fallback)' };
      }

      // 7. Log Success
      await supabase.from('otp_logs').insert({
        volunteer_id: volunteer.id,
        email,
        status: 'sent',
        ip_address: 'edge-function'
      });

      return { success: true, message: 'OTP sent successfully' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Failed to send OTP', type: 'system_error' };
    }
  },

  async verifyOtp(email: string, otp: string) {
    try {
      // 1. Verify against LOCAL STORE first (since we generated the custom OTP)
      const { data: storeData, error: storeError } = await supabase
        .from('email_otp_store')
        .select('*')
        .eq('email', email)
        .single();

      if (storeData && storeData.otp === otp) {
           // Valid Custom OTP!
          // Now we need to issue a Session.
          // Since we can't mint a token easily without backend, 
          // we will use the "Magic Link" or just allow access if we don't strictly need RLS write access.
          // OR, we can try to "Sign In" with Supabase using the OTP we generated? 
          // NO, Supabase doesn't know about our custom OTP.
          
          // Workaround for Session:
          // We can't get a real Supabase Session easily.
          // BUT, we can return success and let the App set a "Local Session".
          // The App uses `user` object.
          // We will fetch the volunteer data and return it.
          
          const { data: volunteer } = await supabase
            .from('volunteers')
            .select('*')
            .eq('email', email)
            .single();
            
          if (volunteer) {
             // Clear OTP
             await supabase.from('email_otp_store').delete().eq('email', email);
             
             return { 
                 success: true, 
                 session: null, // No Supabase Session
                 user: { id: volunteer.id, email: volunteer.email, user_metadata: { full_name: volunteer.full_name } },
                 volunteer
             };
          }
      }

      // Fallback: Try Supabase Auth Verify (if they used the 8-digit code from fallback)
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;
      
      // Get Volunteer Data
      const { data: volunteer, error: volError } = await supabase
        .from('volunteers')
        .select('*')
        .eq('email', email)
        .single();

      if (volError) {
          // If auth user exists but not in volunteers table?
          // Should not happen as we check before sending.
          throw new Error('Volunteer record not found.');
      }

      return { success: true, session: data.session, user: data.user, volunteer };
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return { success: false, error: error.message };
    }
  },

  async createSupportTicket(
    name: string, 
    mobile: string, 
    email: string, 
    category: string, 
    message: string
  ) {
    // 1. Try to find volunteer to link ticket
    const { data: volunteer } = await supabase
      .from('volunteers')
      .select('id')
      .or(`email.eq.${email},mobile_number.eq.${mobile}`)
      .limit(1)
      .single();

    const { error } = await supabase
      .from('support_tickets')
      .insert({
        volunteer_id: volunteer?.id || null, 
        contact_name: name,
        contact_mobile: mobile,
        contact_email: email,
        category,
        message,
        status: 'pending'
      });
      
    if (error) {
        console.error("Support Ticket Error:", error);
        return { success: false, error: 'Could not submit ticket. Please try again.' };
    }

    return { success: true, message: 'Support ticket created.' };
  },

  async resolveSupportTicket(ticketId: string, resolutionMessage: string, adminId: string) {
    const { error } = await supabase
        .from('support_tickets')
        .update({
            status: 'resolved',
            admin_response: resolutionMessage,
            resolved_at: new Date().toISOString(),
            assigned_officer: adminId // Track who resolved it
        })
        .eq('id', ticketId);

    if (error) return { success: false, error: error.message };

    // In a real system, we would trigger an email via Edge Function here.
    // Since this is a demo, we will simulate it in the UI.
    return { success: true };
  },

  async requestEmailChange(currentEmail: string, newEmail: string, reason: string) {
    const { data: volunteer } = await supabase
      .from('volunteers')
      .select('id')
      .eq('email', currentEmail)
      .single();

    if (!volunteer) return { success: false, error: "Registered email not found. Please try again." };

    // Check if new email is already taken
    const { data: existingUser } = await supabase
      .from('volunteers')
      .select('id')
      .eq('email', newEmail)
      .single();

    if (existingUser) {
        // Quietly log duplication attempt for fraud analysis if needed
        console.warn(`Duplicate email attempt: ${newEmail} requested by volunteer ID ${volunteer.id}`);
        return { success: false, error: "This email is already registered by another volunteer. Please use a different email." };
    }

    const { error } = await supabase
      .from('volunteers')
      .update({
        new_email_requested: true,
        new_email_value: newEmail,
        request_reason: reason,
        admin_approval_status: 'pending',
        email_requested_at: new Date().toISOString()
      })
      .eq('id', volunteer.id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Email Change Request submitted successfully. We will notify you once approved.' };
  }
};
