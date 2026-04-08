import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Important: Next.js may import this module during build/prerender.
// We must not hard-throw at module-load time, otherwise `next build` fails
// when env vars are not present in the build environment.
const missingSupabaseEnv = !SUPABASE_URL || !SUPABASE_ANON_KEY;
if (missingSupabaseEnv) {
    // eslint-disable-next-line no-console
    console.warn(
        '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Login/auth calls will fail until you set env vars.'
    );
}

const safeUrl = SUPABASE_URL ?? 'http://localhost:54321';
const safeAnonKey =
    SUPABASE_ANON_KEY ??
    // Not a valid key, only to keep build/runtime from crashing at import time.
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJpc3MiOiJ1bmRlZmluZWQiLCJpYXQiOjE3MDAwMDAwMDB9.' +
    'invalid_signature';

export const supabase = createClient(safeUrl, safeAnonKey, {
    realtime: {
        params: { eventsPerSecond: 10 },
    },
});
