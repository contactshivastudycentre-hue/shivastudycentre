import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, password, fullName, mobile, studentClass, redirectTo } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "signIn") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return new Response(
          JSON.stringify({ error: { message: error.message, status: (error as any).status } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          session: {
            access_token: data.session?.access_token,
            refresh_token: data.session?.refresh_token,
            expires_in: data.session?.expires_in,
            expires_at: data.session?.expires_at,
            token_type: data.session?.token_type,
          },
          user: data.user,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "signUp") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: { message: error.message } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Auto-onboarding: create profile with status='approved' but profile_completed=false
      // so the user can immediately access the platform but is forced to /complete-profile
      // until they fill the remaining fields (school_name).
      if (data.user && fullName && mobile) {
        await supabaseAdmin.from("profiles").upsert(
          {
            user_id: data.user.id,
            full_name: fullName,
            mobile: mobile,
            class: studentClass || null,
            status: "approved",
            profile_completed: false,
          },
          { onConflict: "user_id" }
        );
      }

      return new Response(
        JSON.stringify({
          user: data.user,
          session: data.session
            ? {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
                expires_at: data.session.expires_at,
                token_type: data.session.token_type,
              }
            : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "health") {
      const t0 = Date.now();
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseKey },
      });
      const elapsed = Date.now() - t0;
      const body = await res.text();
      return new Response(
        JSON.stringify({ status: res.status, elapsed, body }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: { message: "Unknown action" } }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auth-proxy error:", err);
    return new Response(
      JSON.stringify({ error: { message: (err as Error)?.message || "Internal error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
