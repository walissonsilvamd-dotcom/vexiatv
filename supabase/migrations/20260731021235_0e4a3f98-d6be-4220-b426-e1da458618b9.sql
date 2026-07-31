CREATE TABLE public.pair_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  playlist_name TEXT,
  playlist_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes'
);

GRANT ALL ON public.pair_sessions TO service_role;
ALTER TABLE public.pair_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX pair_sessions_expires_at_idx ON public.pair_sessions (expires_at);