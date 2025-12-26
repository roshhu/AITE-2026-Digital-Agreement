import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  name: string;
  otp: string;
  subject: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, name, otp, subject }: EmailRequest = await req.json();

    if (!to || !otp) {
      throw new Error("Missing required fields: to, otp");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AITE-2026 <noreply@tgaite2026.site>", // Ensure this domain is verified in Resend dashboard
        to: [to],
        subject: subject || "AITE-2026 Secure Access Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1B5E20; padding: 20px; text-align: center;">
               <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Government of Telangana</h2>
               <p style="color: #DAA520; margin: 5px 0 0 0; font-weight: bold;">Forest Department</p>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #1A1A1A;">Hello <strong>${name}</strong>,</p>
              <p style="font-size: 16px; color: #1A1A1A;">Your secure access code for the <strong>AITE-2026 Digital Agreement Portal</strong> is:</p>
              <div style="background-color: #F4F6F5; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1B5E20;">${otp}</span>
              </div>
              <p style="font-size: 14px; color: #4b5563;">This code will expire in <strong>10 minutes</strong>.</p>
              <div style="background-color: #FEF2F2; border-left: 4px solid #B91C1C; padding: 10px; margin-top: 20px;">
                <p style="margin: 0; color: #991B1B; font-size: 13px; font-weight: bold;">⚠️ Warning: Do not share this code with anyone.</p>
              </div>
            </div>
            <div style="background-color: #F4F6F5; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0;">This is a secure automated message from the Forest Department, Government of Telangana.</p>
              <p style="font-size: 12px; color: #64748b; margin: 5px 0 0 0;">If you did not request this code, you may safely ignore this email.</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || 'Failed to send email via Resend');
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
