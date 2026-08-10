// GET /api/soop-vod?url={VOD_URL} 또는 ?id={title_no}
// SOOP VOD/클립 정보(제목, 썸네일, BJ, 길이 등)를 가져온다.
// view API를 POST(nTitleNo)로 호출 — title_no만으로 조회 가능.

function extractTitleNo(raw) {
  if (!raw) return null;
  // 순수 숫자면 그대로
  if (/^\d+$/.test(raw.trim())) return raw.trim();
  // URL에서 끝 숫자 추출 (/player/183858893, /183858893 등)
  const m = raw.match(/(\d{6,})/);
  return m ? m[1] : null;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('url') || url.searchParams.get('id') || '';
  const titleNo = extractTitleNo(raw);
  if (!titleNo) return json({ error: 'invalid url or id' }, 400);

  try {
    const res = await fetch('https://api.m.sooplive.co.kr/station/video/a/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://vod.sooplive.com/',
        'Origin': 'https://vod.sooplive.com'
      },
      body: 'nTitleNo=' + encodeURIComponent(titleNo)
    });
    const j = await res.json();
    if (j.result !== 1 || !j.data) {
      return json({ error: 'vod not found', ok: false }, 200);
    }
    const d = j.data;
    return json({
      ok: true,
      titleNo: titleNo,
      title: d.title || d.full_title || '',
      bjId: d.bj_id || d.writer_id || '',
      bjNick: d.writer_nick || '',
      thumb: d.thumb || '',
      duration: d.total_file_duration || null,   // ms
      viewCount: d.view_cnt || null,
      regDate: d.write_tm || d.reg_date || '',
      vodUrl: 'https://vod.sooplive.com/player/' + titleNo
    });
  } catch (e) {
    return json({ error: String(e), ok: false }, 200);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' }
  });
}
