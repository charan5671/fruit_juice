import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rmthosgdsosbxyvqfjpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGhvc2dkc29zYnh5dnFmanBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MzA0MjYsImV4cCI6MjA4NjIwNjQyNn0.eF27qW-2SOy84FksVuFcSsAoHmhbc-m3ei_TfONmpTI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: {
        params: { eventsPerSecond: 10 },
    },
});
