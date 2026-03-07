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
        let interval: NodeJS.Timeout;

        const checkDeviceBinding = async () => {
            const { data: { user } } = await supabase.auth.getUser(); // Authoritative server hit to bypass stale local cache
            if (!user) return;

            const serverDeviceId = user.user_metadata?.current_device_id;
            const localDeviceId = localStorage.getItem('fjc-device-id');

            // If the server has a device ID mapped, and we locally don't match, force ejection.
            if (serverDeviceId && localDeviceId && serverDeviceId !== localDeviceId) {
                localStorage.setItem('fjc-logout-reason', 'Concurrent session detected. Your account has been securely signed out because it was accessed from another device.');
                await supabase.auth.signOut();
                setAuth({ session: null, user: null, employeeProfile: null, loading: false });
                if (typeof window !== 'undefined') window.location.reload();
            }
        };

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            let profile = null;
            if (session?.user) {
                profile = await loadProfile(session.user.id);
                interval = setInterval(checkDeviceBinding, 15000); // Poll every 15 seconds
            }
            setAuth({ session, user: session?.user || null, employeeProfile: profile, loading: false });
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            let profile = null;
            clearInterval(interval);
            if (session?.user) {
                profile = await loadProfile(session.user.id);
                interval = setInterval(checkDeviceBinding, 15000);
            }
            setAuth({ session, user: session?.user || null, employeeProfile: profile, loading: false });
        });

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
        };
    }, [loadProfile]);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
            // Generate deterministic device session binding
            const deviceId = crypto.randomUUID();
            localStorage.setItem('fjc-device-id', deviceId);
            // Non-blocking upload to sync session dominance
            supabase.auth.updateUser({ data: { current_device_id: deviceId } }).catch(console.error);
        }
        return error;
    };

    const signUp = async (email: string, password: string, name: string, role: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role },
                emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset` : undefined,
            },
        });

        if (error) return { error: error.message };
        if (!data.user) return { error: 'Registration failed. Please try again.' };

        return { error: null };
    };

    const forgotPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset` : undefined,
        });
        return error;
    };

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        return error;
    };

    const emergencyReset = async (email: string, password: string, key: string) => {
        const { data, error } = await supabase.rpc('reset_enterprise_admin', {
            p_email: email,
            p_new_password: password,
            p_recovery_key: key
        });
        if (error) return error.message;
        if (data?.error) return data.error;
        return null;
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

    return { ...auth, signIn, signUp, signOut, forgotPassword, updatePassword, emergencyReset, biometricAvailable, biometricRegister, biometricLogin };
}
