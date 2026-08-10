// POST /api/r2/delete  { fileKey, thumbKey }
// R2에서 원본+썸네일 삭제. 어드민 삭제용.
// 인증: 클라이언트가 Supabase 세션 토큰을 Authorization 헤더로 전달 → 검증.
export async function onRequestPost({ request, env }) {
  const bucket = env.ARCHIVE_BUCKET;
  if (!bucket) return json({ error: 'bucket not connected' }, 503);

  // Supabase JWT 검증 (인증된 사용자만 삭제)
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const ok = await verifySupabaseToken(token, env);
  if (!ok) return json({ error: 'unauthorized' }, 401);

  try {
    const body = await request.json();
    const keys = [];
    if (body.fileKey) keys.push(body.fileKey);
    if (body.thumbKey) keys.push(body.thumbKey);
    // 화이트리스트 검증
    for (const k of keys) {
      if (!/^archive\/[A-Za-z0-9_\/.-]+$/.test(k)) {
        return json({ error: 'invalid key: ' + k }, 400);
      }
    }
    if (keys.length) await bucket.delete(keys);
    return json({ ok: true, deleted: keys });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

// Supabase auth의 /auth/v1/user 로 토큰 유효성 확인
async function verifySupabaseToken(token, env) {
  try {
    const base = env.SUPABASE_URL || 'https://fwlkyyvrkunqqtyttilp.supabase.co';
    const anon = env.SUPABASE_ANON_KEY || '';
    const res = await fetch(base + '/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': anon
      }
    });
    if (!res.ok) return false;
    const user = await res.json();
    return !!(user && user.id);
  } catch (e) {
    return false;
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
