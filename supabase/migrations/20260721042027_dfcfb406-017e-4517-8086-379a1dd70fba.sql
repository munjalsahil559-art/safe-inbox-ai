
CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sms','email')),
  input TEXT NOT NULL,
  prediction TEXT NOT NULL CHECK (prediction IN ('Safe','Spam')),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low','Medium','High','Critical')),
  risk_score INTEGER NOT NULL,
  confidence NUMERIC NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL DEFAULT '',
  reasoning TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scans" ON public.scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scans" ON public.scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own scans" ON public.scans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX scans_user_analyzed_idx ON public.scans (user_id, analyzed_at DESC);
