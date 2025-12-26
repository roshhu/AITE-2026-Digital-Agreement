// =========================================================
// 📥 TRAE.AI BULK IMPORT TOOL
// =========================================================
// Reads 'volunteers.csv' and uploads to Supabase.
// Handles Header Mapping automatically.
// =========================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env from .env file manually (dependency-free)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Admin Credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// CSV Parser (Simple implementation to avoid dependencies)
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values containing commas
    const row = [];
    let inQuote = false;
    let current = '';
    
    for (const char of lines[i]) {
        if (char === '"') { inQuote = !inQuote; continue; }
        if (char === ',' && !inQuote) {
            row.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    row.push(current.trim()); // Push last column
    
    if (row.length === headers.length) {
        const obj = {};
        headers.forEach((h, index) => obj[h] = row[index]);
        data.push(obj);
    }
  }
  return data;
}

async function importVolunteers() {
  const csvPath = path.resolve(__dirname, '../volunteers.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ volunteers.csv not found in project root.');
    console.log('👉 Please put your CSV file in the main folder and name it "volunteers.csv".');
    return;
  }

  console.log('📖 Reading CSV...');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const rawData = parseCSV(fileContent);
  
  console.log(`🔍 Found ${rawData.length} rows.`);
  console.log('🔄 Mapping columns...');

  const mappedData = rawData.map(row => {
    // FLEXIBLE MAPPING LOGIC
    // Tries to find the column even if case differs slightly
    const getVal = (keys) => {
        for (const k of keys) {
            const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
            if (foundKey) return row[foundKey];
        }
        return null;
    };

    const mobile = getVal(['Mobile Number', 'Mobile', 'Phone'])?.replace(/\D/g, '').slice(-10) || '';
    
    return {
      serial_no: parseInt(getVal(['Sl. No', 'Sl No', 'S.No', 'Serial No']) || '0'),
      full_name: getVal(['Name', 'Full Name', 'Volunteer Name']) || '',
      email: getVal(['Email', 'Email ID'])?.toLowerCase() || '',
      mobile_number: mobile,
      district: getVal(['Allotment District', 'District', 'Allocated District']) || 'Unknown',
      gender: getVal(['Gender']) || null, 
      // Defaults
      auth_code: 'V-' + Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate random Auth Code
      status: 'pending',
      fraud_score: 'Low',
      attempts_count: 0,
      created_at: new Date().toISOString()
    };
  }).filter(r => r.email && r.mobile_number); // Filter invalid rows

  // DEDUPLICATION STEP
  // Remove duplicate emails from the list to prevent Batch Errors
  const uniqueData = [];
  const seenEmails = new Set();
  let duplicateCount = 0;

  for (const row of mappedData) {
      if (!seenEmails.has(row.email)) {
          seenEmails.add(row.email);
          uniqueData.push(row);
      } else {
          duplicateCount++;
      }
  }

  console.log(`✅ Prepared ${uniqueData.length} valid unique records for upload.`);
  if (duplicateCount > 0) {
      console.log(`⚠️  Removed ${duplicateCount} duplicate emails automatically.`);
  }

  // Batch Upload (Supabase limit is usually huge, but let's do 100 at a time for safety)
  const BATCH_SIZE = 100;
  for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
    const batch = uniqueData.slice(i, i + BATCH_SIZE);
    console.log(`🚀 Uploading batch ${i + 1} to ${i + batch.length}...`);
    
    const { error } = await supabase.from('volunteers').upsert(batch, { 
        onConflict: 'email',
        ignoreDuplicates: false 
    });

    if (error) {
        console.error('❌ Batch Upload Failed:', error.message);
    } else {
        console.log('✨ Batch Success');
    }
  }

  console.log('🎉 IMPORT COMPLETE!');
}

importVolunteers();
