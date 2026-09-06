-- ═══════════════════════════════════════════════════════════════════════════
-- Note it — Supabase database schema
-- Kør dette i Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Brugerdata-tabel (noter, indstillinger, alt)
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Row Level Security — brugere kan kun se og redigere EGNE data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_data_select" ON public.user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_data_insert" ON public.user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data_update" ON public.user_data
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_data_delete" ON public.user_data
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Automatisk opdater updated_at ved ændringer
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. RPC-funktion: Brugere kan slette deres egen konto (GDPR "ret til sletning")
-- Kræver: Authentication → Settings → Enable "Allow users to delete own account"
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Slet brugerdata (CASCADE sletter user_data automatisk)
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- 5. Fejllog-tabel (app-overvågning)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context     TEXT,
  message     TEXT,
  stack       TEXT
);
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
-- Brugere kan kun indsætte egne fejl, aldrig se andres
CREATE POLICY "error_insert" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Ryd logs ældre end 90 dage automatisk (kræver pg_cron-extension)
-- SELECT cron.schedule('delete-old-logs', '0 3 * * *',
--   $$DELETE FROM public.error_logs WHERE ts < NOW() - INTERVAL '90 days'$$);

-- 6. Indeks for hurtigere opslag
CREATE INDEX IF NOT EXISTS user_data_updated_idx ON public.user_data(updated_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_ts_idx      ON public.error_logs(ts DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- Supabase Dashboard indstillinger (gøres manuelt):
--
-- Authentication → Settings:
--   ✓ Enable email confirmations (er slået til som standard)
--   ✓ Site URL: https://noteit.dk  (eller din domæne)
--   ✓ Redirect URLs: https://noteit.dk/*
--
-- Authentication → Email Templates:
--   - Tilpas evt. bekræftelsesmailen med dit logo og dansk tekst
--   - Subject: "Bekræft din Note it konto"
--
-- Authentication → Rate Limits:
--   - Sign ups: 5 per time (standard)
--   - Sign ins: 30 per time (standard)  ← disse + vores klient-side rate limit = dobbelt sikring
-- ═══════════════════════════════════════════════════════════════════════════
