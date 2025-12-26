
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmibnrdpbliwdpfqhlfw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtaWJucmRwYmxpd2RwZnFobGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjkyMTUsImV4cCI6MjA4MjI0NTIxNX0.s3_gJFE3fd2DoYeYsCAPNHcI8yV2YAJuWox8ZfbMFyE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDemoUser() {
  const mobile = '8555007177';
  const authCode = '7177-HYD'; // Last 4 digits + HYD
  
  console.log(`Checking for user ${mobile}...`);

  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('volunteers')
    .select('*')
    .eq('mobile_number', mobile)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
    console.error('Error fetching user:', fetchError);
    return;
  }

  if (existingUser) {
    console.log('User already exists:', existingUser);
    console.log(`\n✅ Login Details:\nMobile: ${existingUser.mobile_number}\nAuth Code: ${existingUser.auth_code}`);
    return;
  }

  // Create user
  const newUser = {
    mobile_number: mobile,
    full_name: 'Demo User',
    district: 'Hyderabad',
    auth_code: authCode,
    status: 'pending'
  };

  const { data, error: insertError } = await supabase
    .from('volunteers')
    .insert([newUser])
    .select()
    .single();

  if (insertError) {
    console.error('Error creating user:', insertError);
  } else {
    console.log('Successfully created demo user:', data);
    console.log(`\n✅ Login Details:\nMobile: ${data.mobile_number}\nAuth Code: ${data.auth_code}`);
  }
}

addDemoUser();
