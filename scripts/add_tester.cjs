const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function addTester() {
  const tester = {
    full_name: 'Shaik Roshan',
    email: 'roshanbunny2002@gmail.com',
    mobile_number: '7075557578',
    district: 'Hyderabad',
    status: 'pending',
    auth_code: 'TEST-ROSHAN',
    serial_no: 9999,
    fraud_score: 'Low',
    attempts_count: 0,
    created_at: new Date().toISOString()
  };

  console.log('Adding Tester Account:', tester.email);

  const { error } = await supabase.from('volunteers').upsert(tester, { onConflict: 'email' });

  if (error) {
    console.error('❌ Failed:', error.message);
  } else {
    console.log('✅ Tester Account Ready!');
    console.log('   Name: Shaik Roshan');
    console.log('   Mobile: 7075557578');
  }
}

addTester();
