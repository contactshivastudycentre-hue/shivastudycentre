/**
 * Raw connectivity diagnostic — bypasses Supabase SDK entirely.
 * Call from any login page to isolate where the connection drops.
 */
export async function runConnectionDiagnostic(): Promise<string> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const lines: string[] = [];
  const log = (msg: string) => {
    console.log('[ConnTest]', msg);
    lines.push(msg);
  };

  // 1. Environment variable check
  log(`VITE_SUPABASE_URL = ${url ? `"${url}"` : '❌ UNDEFINED'}`);
  log(`VITE_SUPABASE_PUBLISHABLE_KEY = ${key ? `"${key.slice(0, 20)}..."` : '❌ UNDEFINED'}`);

  if (!url || !key) {
    log('🛑 Missing environment variables — build is broken.');
    return lines.join('\n');
  }

  // 2. Raw fetch to auth health endpoint (GET, no auth required)
  const healthUrl = `${url}/auth/v1/health`;
  log(`\nTest 1: GET ${healthUrl}`);
  try {
    const t0 = Date.now();
    const res = await fetch(healthUrl, {
      method: 'GET',
      headers: { apikey: key },
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = Date.now() - t0;
    const body = await res.text();
    log(`✅ Status ${res.status} in ${elapsed}ms`);
    log(`Response: ${body.slice(0, 200)}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch')) {
      log('❌ NETWORK FAILURE — browser could not reach the server at all.');
      log('   Likely causes: CORS block, DNS failure, firewall, or ISP restriction.');
    } else if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      log('❌ TIMEOUT — server did not respond within 10 seconds.');
    } else {
      log(`❌ ERROR: ${msg}`);
    }
  }

  // 3. Raw POST to auth token endpoint (mimics login)
  const tokenUrl = `${url}/auth/v1/token?grant_type=password`;
  log(`\nTest 2: POST ${tokenUrl}`);
  try {
    const t0 = Date.now();
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
      },
      body: JSON.stringify({
        email: 'connection-test@test.invalid',
        password: 'test-only-do-not-use',
      }),
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = Date.now() - t0;
    const body = await res.text();
    // 400 = "invalid credentials" which proves the server IS reachable
    log(`✅ Status ${res.status} in ${elapsed}ms (400 = server reachable, auth working)`);
    log(`Response: ${body.slice(0, 200)}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch')) {
      log('❌ NETWORK FAILURE on POST — same as above, server unreachable.');
    } else if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      log('❌ TIMEOUT on POST.');
    } else {
      log(`❌ ERROR: ${msg}`);
    }
  }

  // 4. CORS preflight test (OPTIONS)
  log(`\nTest 3: OPTIONS ${tokenUrl} (CORS preflight)`);
  try {
    const t0 = Date.now();
    const res = await fetch(tokenUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,apikey,authorization',
      },
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = Date.now() - t0;
    const corsAllow = res.headers.get('access-control-allow-origin');
    log(`✅ Status ${res.status} in ${elapsed}ms`);
    log(`CORS Allow-Origin: ${corsAllow || '(not set — possible CORS issue)'}`);
  } catch (err: any) {
    log(`❌ CORS preflight failed: ${err?.message}`);
  }

  log(`\n--- Origin: ${window.location.origin} ---`);
  log(`--- User Agent: ${navigator.userAgent.slice(0, 100)} ---`);

  return lines.join('\n');
}
