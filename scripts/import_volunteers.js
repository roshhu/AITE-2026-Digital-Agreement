import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

// Load env
const SUPABASE_URL = 'https://vmibnrdpbliwdpfqhlfw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtaWJucmRwYmxpd2RwZnFobGZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2OTIxNSwiZXhwIjoyMDgyMjQ1MjE1fQ.DIb5oVh0FYAnZLbdQx1iBvEZZYMXEixieevyHFsB_Uw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FILE_NAME = '8edf8e7b-bd34-4d7a-a534-01b6ca0fd5f5.xlsx';

async function seedData() {
  console.log('🔄 Generating sample Excel file...');
  
  const users = [
    { "Full Name": "Shaik Roshan", "Mobile Number": "7075557578", "Email": "roshanbunny2002@gmail.com", "District": "Nagarkurnool" },
    { "Full Name": "Rajesh Kumar", "Mobile Number": "9876543210", "Email": "rajesh.k@example.com", "District": "Adilabad" },
    { "Full Name": "Priya Singh", "Mobile Number": "9988776655", "Email": "priya.s@example.com", "District": "Khammam" }
  ];

  const ws = XLSX.utils.json_to_sheet(users);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Volunteers");
  XLSX.writeFile(wb, FILE_NAME);
  
  console.log(`✅ File created: ${FILE_NAME}`);

  console.log('🔄 Importing data into Supabase...');
  
  const workbook = XLSX.readFile(FILE_NAME);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  let successCount = 0;
  let failCount = 0;

  for (const row of data) {
    const fullName = row['Full Name'];
    const mobile = String(row['Mobile Number']);
    const email = row['Email'];
    const district = row['District'];

    if (!mobile) continue;

    const authCode = fullName.substring(0, 4).toUpperCase() + mobile.substring(mobile.length - 4);

    const { error } = await supabase.from('volunteers').upsert({
      full_name: fullName,
      mobile_number: mobile,
      email: email,
      district: district,
      auth_code: authCode,
      status: 'pending',
      fraud_score: 'Low'
    }, { onConflict: 'mobile_number' });

    if (error) {
      console.error(`❌ Failed to import ${fullName}:`, error.message);
      failCount++;
    } else {
      console.log(`✅ Imported: ${fullName}`);
      successCount++;
    }
  }

  console.log(`\n🎉 Import Complete. Success: ${successCount}, Failed: ${failCount}`);
}

seedData();
