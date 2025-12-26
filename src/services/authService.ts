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

    // 3. Verify Name and Email with Strict Logic
    const normalizedInputName = normalizeName(name);
    const normalizedStoredName = normalizeName(volunteer.full_name);
    const nameMatch = normalizedInputName === normalizedStoredName;
    const emailMatch = volunteer.email.toLowerCase().trim() === email.toLowerCase().trim();
    const mobileMatch = volunteer.mobile_number === mobile; // Ensure mobile matches exactly

    if (!nameMatch || !emailMatch || !mobileMatch) {
      // 3.1 Log mismatch specifically
      let reason = 'Unknown mismatch';
      if (!mobileMatch) reason = 'Mobile mismatch'; // Should not happen if query succeeded, but safety check
      else if (!nameMatch) reason = 'Name mismatch';
      else if (!emailMatch) reason = 'Email mismatch';

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

    // 4. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins expiry

    // 5. Store OTP (Hashed)
    const { error: otpError } = await supabase
      .from('email_otp_store')
      .upsert({ 
        email: email, 
        otp: hashedOtp, // Storing HASHED OTP
        expires_at: expiresAt,
        attempts_count: 0,
        blocked: false
      }, { onConflict: 'email' });

    if (otpError) {
      console.error('OTP Store Error:', otpError);
      return { success: false, error: 'Failed to generate OTP.', type: 'system_error' };
    }

    // 5.1 Log OTP Request
    await supabase.from('otp_logs').insert({
      volunteer_id: volunteer.id,
      email: email,
      status: 'sent',
      ip_address: 'Logged' // In real app, get IP from edge function
    });

    // ---------------------------------------------------------
    // LIVE MODE: Send OTP via Supabase Auth (Uses your AWS SES)
    // ---------------------------------------------------------
    try {
        const { error: authError } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: false, // Only allow existing users (or true if you want to allow auto-signup, but we check volunteer table first)
            }
        });

        if (authError) {
             console.error("Supabase Auth OTP Error:", authError);
             // If user doesn't exist in auth but exists in volunteers, we might need to create them
             if (authError.message.includes("Signups not allowed")) {
                 const { error: signupError } = await supabase.auth.signInWithOtp({
                    email: email,
                    options: { shouldCreateUser: true }
                 });
                 if (signupError) throw signupError;
             } else {
                 throw authError;
             }
        }
        
        console.log("✅ OTP sent via Supabase Auth (AWS SES).");
       
    } catch (err: any) {
        console.error('Failed to send OTP:', err);
        return { success: false, error: 'Failed to send email. ' + err.message, type: 'system_error' };
    }

    // 6. Return Masked Email
    const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => { 
        return gp2 + "*".repeat(gp3.length); 
    });

    return { success: true, maskedEmail, message: `OTP sent to ${maskedEmail}` };
  },

  async verifyOtp(email: string, otp: string) {
    // 1. Verify with Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
    });

    if (error) {
      // Fallback: Check local DB if Supabase Auth fails (for demo/testing)
      // ... existing local verification logic could stay here if needed, but let's rely on Auth
      console.error("Auth Verify Error:", error);
      return { success: false, error: 'Invalid OTP.', type: 'invalid' };
    }

    // 2. Success - Get volunteer details
    const { data: volunteer } = await supabase
      .from('volunteers')
      .select('*')
      .eq('email', email)
      .single();

    if (!volunteer) {
        return { success: false, error: 'Login successful but Volunteer record not found.', type: 'invalid' };
    }
    
    // 3. Update Last Login Time & Reset Failures
    await supabase
      .from('volunteers')
      .update({ 
        last_login_at: new Date().toISOString(),
        otp_failed_attempts: 0 
      })
      .eq('email', email);

    return { success: true, volunteer };
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
