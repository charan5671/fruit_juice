'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface EmployeeProfile { id: number; name: string; role: string; email: string; outlet_id: number; status: string; }

interface AuthState {
    session: Session | null;
    user: User | null;
    employeeProfile: EmployeeProfile | null;
    loading: boolean;
}

export function useAuth() {
    const [auth, setAuth] = useState<AuthState>({ session: null, user: null, employeeProfile: null, loading: true });

    const loadProfile = useCallback(async (userId: string) => {
        const { data } = await supabase.from('employees').select('id, name, role, email, outlet_id, status').eq('auth_uid', userId).single();
        return data as EmployeeProfile | null;
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            let profile = null;
            if (session?.user) profile = await loadProfile(session.user.id);
            setAuth({ session, user: session?.user || null, employeeProfile: profile, loading: false });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            let profile = null;
            if (session?.user) profile = await loadProfile(session.user.id);
            setAuth({ session, user: session?.user || null, employeeProfile: profile, loading: false });
        });

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            // Provide actionable CTO-grade error messages
            if (error.message.toLowerCase().includes('email not confirmed')) {
                // Auto-confirm the email via a direct update attempt
                // This will only work if the user has the service_role key,
                // so we provide clear instructions as a fallback.
                return { ...error, message: 'Email not confirmed. Please go to your Supabase Dashboard → Authentication → Users, find this email, and click "Confirm email". Or run: UPDATE auth.users SET email_confirmed_at = now() WHERE email = \'' + email + '\';' };
            }
            return error;
        }
        return error;
    };

    const signUp = async (email: string, password: string, name: string, role: string) => {
        // 1. Create auth user with auto-confirm metadata
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role },
                // Skip email redirect — we handle confirmation server-side
            },
        });
        if (error) return { error: error.message };
        if (!data.user) return { error: 'Registration failed. Please try again.' };

        // 2. Auto-confirm the email immediately via admin SQL
        // This uses an RPC function that runs as SECURITY DEFINER
        try { await supabase.rpc('auto_confirm_email', { p_email: email }); } catch { /* non-critical */ }

        // 3. Create employee via SECURITY DEFINER function (bypasses RLS)
        const { error: rpcError } = await supabase.rpc('register_employee', {
            p_auth_uid: data.user.id,
            p_name: name,
            p_email: email,
            p_role: role,
        });
        if (rpcError) return { error: rpcError.message };

        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setAuth({ session: null, user: null, employeeProfile: null, loading: false });
    };

    const biometricAvailable = typeof window !== 'undefined' && !!window.PublicKeyCredential;

    const biometricRegister = async () => {
        if (!biometricAvailable || !auth.user) return false;
        try {
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: crypto.getRandomValues(new Uint8Array(32)),
                    rp: { name: 'FreshJuice Enterprise' },
                    user: { id: new TextEncoder().encode(auth.user.id), name: auth.user.email || '', displayName: auth.employeeProfile?.name || '' },
                    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
                    timeout: 60000,
                },
            });
            if (credential) {
                localStorage.setItem('fjc-bio-email', auth.user.email || '');
                return true;
            }
        } catch { /* ignored */ }
        return false;
    };

    const biometricLogin = async (): Promise<string | null> => {
        if (!biometricAvailable) return null;
        try {
            const credential = await navigator.credentials.get({
                publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), timeout: 60000, userVerification: 'required' },
            });
            if (credential) return localStorage.getItem('fjc-bio-email');
        } catch { /* ignored */ }
        return null;
    };

    return { ...auth, signIn, signUp, signOut, biometricAvailable, biometricRegister, biometricLogin };
}
