# Supabase Auth 2FA Gig

Title: Supabase Auth TOTP 2FA — example components and RLS policy templates

What it does
- Provides example React components for MfaSetup and MfaVerify and an AuthGuard that enforces AAL2 when needed.
- Includes an SQL template for creating a table with user_id and correct RLS policies.

Setup
- Copy the components into your app and wire to Supabase Auth client.
- To enable TOTP in Supabase, follow Supabase docs and enable TOTP in project auth settings (Authentication > Multi-Factor).

Usage
- Wrap protected layouts in <AuthGuard need="aal2"> to require 2FA on entry.

Contributors: Amna Shahzad, Mania Ashar and Bisma Shahid
