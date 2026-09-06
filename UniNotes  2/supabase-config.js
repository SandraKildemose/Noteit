// ─── Supabase konfiguration ───────────────────────────────────────────────
// Opret et gratis projekt på https://supabase.com og indsæt dine værdier her.
// Find dem under: Project Settings → API
//
// VIGTIGT: Denne fil må ALDRIG indeholde en service_role nøgle - kun anon key.
// anon key er sikker at eksponere i frontend kode.
// ──────────────────────────────────────────────────────────────────────────

// UDFYLD HERUNDER — find værdierne i Supabase Dashboard → Project Settings → API
window.SUPABASE_URL      = 'https://DIN-PROJEKT-ID.supabase.co';  // <-- Project URL
window.SUPABASE_ANON_KEY = 'din-anon-nøgle-her';                  // <-- anon public key

// ─── Trin 1: Opret tabeller i Supabase SQL Editor ────────────────────────────
//
// CREATE TABLE IF NOT EXISTS public.user_data (
//   user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
//   data        JSONB    NOT NULL DEFAULT '{}',
//   updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "own_data" ON public.user_data
//   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
//
// CREATE TABLE IF NOT EXISTS public.shared_notes (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
//   from_name   TEXT NOT NULL,
//   to_email    TEXT NOT NULL,
//   note_title  TEXT NOT NULL,
//   note_content TEXT NOT NULL DEFAULT '',
//   message     TEXT NOT NULL DEFAULT '',
//   status      TEXT NOT NULL DEFAULT 'pending',
//   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "insert_own" ON public.shared_notes FOR INSERT WITH CHECK (auth.uid() = sender_id);
// CREATE POLICY "read_own"   ON public.shared_notes FOR SELECT USING (to_email = auth.email());
// CREATE POLICY "update_own" ON public.shared_notes FOR UPDATE USING (to_email = auth.email());
//
// ─── Trin 2: Bekræftelsesmail fra noreply@noteit.app ─────────────────────────
//
// Supabase sender automatisk en bekræftelsesmail ved signup.
// For at sende fra noreply@noteit.app (i stedet for Supabase's egen mail):
//
//  1. Gå til: Supabase Dashboard → Project Settings → Authentication
//  2. Under "SMTP Settings" → slå "Enable Custom SMTP" til
//  3. Udfyld:
//       Host:        smtp.resend.com          (eller smtp.sendgrid.net)
//       Port:        465
//       Username:    resend                   (eller apikey for SendGrid)
//       Password:    [din API-nøgle fra resend.com eller sendgrid.com]
//       Sender name: Note it
//       Sender email: noreply@noteit.app
//  4. Gå til Authentication → Email Templates
//     Tilpas emnelinjen, f.eks.: "Bekræft din Note it-konto"
//
// Anbefalet: Resend.com (gratis op til 3.000 mails/md) — opret konto,
//   tilføj domænet noteit.app, og kopiér API-nøglen ind i SMTP Password.
//
// ─── Trin 3: Site URL ────────────────────────────────────────────────────────
//
// Gå til Authentication → Settings → Site URL
//   Sæt til: https://noteit.app  (eller din faktiske URL)
// Dette er den URL Supabase bruger i bekræftelseslinket.
