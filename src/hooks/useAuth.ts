'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import type { Session, User } from '@supabase/supabase-js';

interface EmployeeProfile { id: number; name: string; role: string; email: string; phone?: string; outlet_id: number; status: string; }

interface AuthState {
    session: Session | null;
    user: User | null;
    employeeProfile: EmployeeProfile | null;
    loading: boolean;
}

export function useAuth() {
    const [auth, setAuth] = useState<AuthState>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('fjc-profile');
            if (cached) {
                try {
                    const profile = JSON.parse(cached);
                    // Return profile data but keep loading=true so we validate session before rendering
                    return { 
                        session: null, 
                        user: null, 
                        employeeProfile: profile, 
                        loading: true 
                    };
                } catch {}
            }
        }
        return { session: null, user: null, employeeProfile: null, loading: true };
    });

    const loadProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('employees')
            .select('id, name, role, email, phone, outlet_id, status')
            .eq('auth_uid', userId)
            .maybeSingle();
        if (error) return null;
        return data as EmployeeProfile | null;
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkDeviceBinding = async () => {
            const { data: { user } } = await supabase.auth.getUser(); // Authoritative server hit to bypass stale local cache
            if (!user) return;

            const serverDeviceId = user.user_metadata?.current_device_id;
            const deviceBound = localStorage.getItem('fjc-device-bound') === '1';
            const localDeviceId = localStorage.getItem('fjc-device-id');

            // If the server has a device ID mapped, and we locally don't match, force ejection.
            if (deviceBound && serverDeviceId && localDeviceId && serverDeviceId !== localDeviceId) {
                localStorage.setItem('fjc-logout-reason', 'Concurrent session detected. Your account has been securely signed out because it was accessed from another device.');
                await supabase.auth.signOut();
                setAuth({ session: null, user: null, employeeProfile: null, loading: false });
            }
        };

        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            let profile = null;

            if (session?.user) {
                // 1. Instant Cache Check
                const cached = localStorage.getItem('fjc-profile');
                if (cached) {
                    try { profile = JSON.parse(cached); } catch { }
                }

                // 2. Unblock UI Immediately (Critical Path)
                setAuth({ session, user: session.user, employeeProfile: profile, loading: false });

                // 3. Background Refresh (Secondary Path)
                loadProfile(session.user.id).then(fresh => {
                    if (fresh) {
                        localStorage.setItem('fjc-profile', JSON.stringify(fresh));
                        setAuth(prev => ({ ...prev, employeeProfile: fresh }));
                    }
                });
                interval = setInterval(checkDeviceBinding, 15000);
            } else {
                localStorage.removeItem('fjc-profile');
                if (typeof window !== 'undefined') localStorage.removeItem('fjc-device-id');
                if (typeof window !== 'undefined') localStorage.removeItem('fjc-device-bound');
                useStore.getState().resetStore();
                setAuth({ session: null, user: null, employeeProfile: null, loading: false });
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            let profile = null;
            clearInterval(interval);
            if (session?.user) {
                const cached = localStorage.getItem('fjc-profile');
                if (cached) {
                    try { profile = JSON.parse(cached); } catch { }
                }
                setAuth({ session, user: session.user, employeeProfile: profile, loading: false });

                const freshProfile = await loadProfile(session.user.id);
                if (freshProfile) {
                    localStorage.setItem('fjc-profile', JSON.stringify(freshProfile));
                    profile = freshProfile;
                }
                interval = setInterval(checkDeviceBinding, 15000);
                setAuth({ session, user: session.user, employeeProfile: profile, loading: false });
            } else {
                // CRITICAL: Properly clean up on sign-out
                localStorage.removeItem('fjc-profile');
                localStorage.removeItem('fjc-device-id');
                localStorage.removeItem('fjc-device-bound');
                try {
                    useStore.getState().resetStore();
                } catch {}
                setAuth({ session: null, user: null, employeeProfile: null, loading: false });
            }
        });

        return () => {
            subscription.unsubscribe();
            clearInterval(interval);
        };
    }, [loadProfile]);

    const signIn = async (email: string, password: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (!error && data.user) {
            // Generate deterministic device session binding
            const deviceId = crypto.randomUUID();
            // Only enforce the device binding if we successfully update metadata.
            const { error: updateErr } = await supabase.auth.updateUser({ data: { current_device_id: deviceId } });
            if (!updateErr) {
                localStorage.setItem('fjc-device-id', deviceId);
                localStorage.setItem('fjc-device-bound', '1');
            } else {
                localStorage.removeItem('fjc-device-id');
                localStorage.removeItem('fjc-device-bound');
            }
        }
        return error;
    };

    const signUp = async (email: string, password: string, name: string, role: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
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
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
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
        // Clear local state FIRST to ensure immediate UI update
        if (typeof window !== 'undefined') {
            localStorage.removeItem('fjc-profile');
            localStorage.removeItem('fjc-device-id');
            localStorage.removeItem('fjc-device-bound');
        }
        // Reset the Zustand store directly (no dynamic import flakiness)
        try {
            useStore.getState().resetStore();
            // Also unsubscribe from realtime channels
            supabase.removeAllChannels();
        } catch(e) {}
        // Clear auth state immediately so Login renders
        setAuth({ session: null, user: null, employeeProfile: null, loading: false });
        // Sign out from Supabase (this triggers onAuthStateChange which is also cleaned up)
        await supabase.auth.signOut();
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
