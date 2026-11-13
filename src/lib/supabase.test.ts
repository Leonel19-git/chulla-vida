import { describe, expect, it } from 'vitest';
import { supabaseConfiguration } from './supabase';

describe('Supabase browser configuration', () => {
  it('discloses unavailable integration without credentials', () => {
    expect(supabaseConfiguration({}).available).toBe(false);
  });
  it('rejects server credentials and insecure remote origins', () => {
    expect(supabaseConfiguration({ VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' }).available).toBe(false);
    expect(supabaseConfiguration({ VITE_SUPABASE_URL: 'http://demo.example', VITE_SUPABASE_ANON_KEY: 'public' }).available).toBe(false);
    const jwt = `x.${btoa(JSON.stringify({ role: 'service_role' }))}.x`;
    expect(supabaseConfiguration({ VITE_SUPABASE_URL: 'https://demo.supabase.co', VITE_SUPABASE_ANON_KEY: jwt }).available).toBe(false);
  });
  it('accepts public keys and local Supabase development', () => {
    expect(supabaseConfiguration({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'public-development' }).available).toBe(true);
  });
});
