// =========================================================
// 🤖 TRAE.AI ADMIN AUTOMATION ENGINE
// =========================================================
// This script allows full remote management of the Supabase DB
// provided the Admin Key is available in .env
// =========================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// require('dotenv').config(); // Using Node --env-file instead

// Load Environment Variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Admin Key

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ CRITICAL ERROR: Missing Admin Credentials');
  console.error('To enable Trae.ai Automation, you must add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
  process.exit(1);
}

// Initialize Admin Client
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function wipeDatabase() {
  console.log('⚠️  STARTING DATABASE WIPE...');
  
  // List of tables to truncate
  const tables = [
    'otp_logs', 
    'email_otp_store', 
    'name_mismatch_logs', 
    'submissions', 
    'support_tickets',
    'volunteers'
  ];

  for (const table of tables) {
    console.log(`Deleting ${table}...`);
    // Delete all rows where id is not null (effectively all rows)
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    
    if (error) {
        console.error(`Failed to wipe ${table}:`, error.message);
    }
  }
  
  console.log('✅ Database Wiped Successfully.');
}

async function resetLimit(email) {
    console.log(`Resetting limits for ${email}...`);
    
    await supabase.from('otp_logs').delete().eq('email', email);
    await supabase.from('volunteers').update({ 
        otp_failed_attempts: 0, 
        status: 'active' 
    }).eq('email', email);
    
    console.log('✅ User Reset Complete.');
}

// Command Line Argument Parser
const action = process.argv[2];
const arg = process.argv[3];

(async () => {
    try {
        if (action === 'wipe') await wipeDatabase();
        else if (action === 'reset') await resetLimit(arg);
        else console.log('Available commands: node scripts/admin_manager.js [wipe|reset <email>]');
    } catch (e) {
        console.error('Execution Failed:', e);
    }
})();
