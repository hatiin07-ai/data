// GET /api/r2/file?key={R2_KEY}
// R2에 저장된 이미지를 서빙 (갤러리에서 <img src>로 사용)
export async function onRequestGet({ request, env }) {
  const bucket = env.ARCHIVE_BUCKET;
  if (!bucket) return new Response('bucket not connected', { status: 503 });

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return new Response('key required', { status: 400 });

  // 키 화이트리스트: archive/ 하위만 허용 (경로 조작 방지)
  if (!/^archive\/[A-Za-z0-9_\/.-]+$/.test(key)) {
    return new Response('invalid key', { status: 400 });
  }

  const obj = await bucket.get(key);
  if (!obj) return new Response('not found', { status: 404 });

  const headers = new Headers();
  headers.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (obj.httpEtag) headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
}
