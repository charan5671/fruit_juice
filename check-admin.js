const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rmthosgdsosbxyvqfjpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGhvc2dkc29zYnh5dnFmanBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzA0MjYsImV4cCI6MjA4NjIwNjQyNn0.eF27qW-2SOy84FksVuFcSsAoHmhbc-m3ei_TfONmpTI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function scanEmployees() {
    console.log('🔍 Scanning all Employees...');
    const { data: emps, error } = await supabase
        .from('employees')
        .select('id, name, email, role, status, auth_uid');

    if (error) {
        console.error('❌ Error fetching employees:', error.message);
    } else {
        console.log(`✅ ${emps.length} Total Employees found:`);
        emps.forEach(e => {
            if (e.email.includes('charan')) {
                console.log('>>> MATCH:', JSON.stringify(e, null, 2));
            }
        });
        console.log('Total details logged for matches.');
    }
}

scanEmployees();
