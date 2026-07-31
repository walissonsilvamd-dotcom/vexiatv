import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

const codeSchema = z.object({ code: z.string().min(6).max(16) });

/** A TV cria uma sessão de pareamento e mostra o código no QR Code. */
export const createPairSession = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = randomCode();
  const { error } = await supabaseAdmin.from("pair_sessions").insert({ code });
  if (error) throw new Error(error.message);
  // Limpeza oportunista das sessões vencidas.
  await supabaseAdmin.from("pair_sessions").delete().lt("expires_at", new Date().toISOString());
  return { code };
});

/** A TV consulta a sessão até o celular enviar a lista. */
export const getPairSession = createServerFn({ method: "POST" })
  .inputValidator((d) => codeSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("pair_sessions")
      .select("status, playlist_name, playlist_url, expires_at")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();

    if (!row) return { status: "missing" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" as const };
    if (row.status !== "claimed" || !row.playlist_url) return { status: "pending" as const };
    return {
      status: "claimed" as const,
      name: row.playlist_name ?? undefined,
      url: row.playlist_url,
    };
  });

/** O celular confere se o código existe antes de mostrar o formulário. */
export const checkPairSession = createServerFn({ method: "POST" })
  .inputValidator((d) => codeSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("pair_sessions")
      .select("status, expires_at")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (!row) return { status: "missing" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" as const };
    return { status: row.status === "claimed" ? ("claimed" as const) : ("pending" as const) };
  });

const submitSchema = z.object({
  code: z.string().min(6).max(16),
  name: z.string().trim().max(80).optional(),
  url: z
    .string()
    .trim()
    .min(8)
    .max(2000)
    .refine((v) => /^https?:\/\//i.test(v), "O link precisa começar com http:// ou https://"),
});

/** O celular envia o link da lista para a TV. */
export const submitPairPlaylist = createServerFn({ method: "POST" })
  .inputValidator((d) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pair_sessions")
      .update({
        status: "claimed",
        playlist_name: data.name || null,
        playlist_url: data.url,
        claimed_at: new Date().toISOString(),
      })
      .eq("code", data.code.toUpperCase())
      .gt("expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "expired" as const };
    return { ok: true as const };
  });
