// POST /api/r2/upload
// multipart/form-data: file(원본), thumb(정지 썸네일, 선택)
// R2에 저장하고 저장된 키를 반환. Supabase 메타데이터 기록은 클라이언트가 담당.
// ⚠️ R2 바인딩(env.ARCHIVE_BUCKET)은 나중에 연결. 없으면 503 반환.

const ALLOWED = ['image/webp', 'image/gif', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function extOf(type) {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/png') return 'png';
  return 'bin';
}
function randKey(prefix, ext) {
  const rand = crypto.randomUUID().replace(/-/g, '');
  return `${prefix}/${Date.now()}_${rand}.${ext}`;
}

export async function onRequestPost({ request, env }) {
  const bucket = env.ARCHIVE_BUCKET;
  if (!bucket) {
    return json({ error: 'R2 bucket not connected yet' }, 503);
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    const thumb = form.get('thumb'); // 선택

    if (!file || typeof file === 'string') {
      return json({ error: 'file required' }, 400);
    }
    if (!ALLOWED.includes(file.type)) {
      return json({ error: 'unsupported type: ' + file.type }, 400);
    }
    if (file.size > MAX_SIZE) {
      return json({ error: 'file too large' }, 400);
    }

    // 원본 저장
    const fileKey = randKey('archive', extOf(file.type));
    await bucket.put(fileKey, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // 썸네일 저장 (있으면)
    let thumbKey = null;
    if (thumb && typeof thumb !== 'string') {
      thumbKey = randKey('archive/thumb', 'png');
      await bucket.put(thumbKey, thumb.stream(), {
        httpMetadata: { contentType: 'image/png' }
      });
    }

    return json({ ok: true, fileKey, thumbKey, fileType: file.type });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
