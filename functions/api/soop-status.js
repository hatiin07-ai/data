// GET /api/soop-status?id={SOOP_BJ_ID}
// 특정 BJ의 라이브 상태를 player_live_api.php(POST)로 직접 조회한다.
// 기존 broad/list 페이지네이션 방식은 시청자 적은 방송이 목록 뒤에 있어 누락되는 문제가 있었음.
// player_live_api는 아이디로 콕 찍어 조회하므로 정확하고 빠름.
//   RESULT=1 -> 방송중, RESULT=0 -> 오프라인. BJNICK/TITLE/BNO 포함.
// 시청자 수는 이 API에 없어서, 방송 중일 때만 broad/list에서 보조로 찾는다(없으면 생략).
const CLIENT_ID = 'fd019c2cbcd7cabdf1a7c7a7a94b2848';

async function getViewerCount(id) {
  try {
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`https://openapi.sooplive.com/broad/list?client_id=${CLIENT_ID}&page_no=${page}`, {
        headers: { Accept: 'application/json' }
      });
      const json = await res.json();
      const broads = Array.isArray(json.broad) ? json.broad : [];
      const hit = broads.find(b => b.user_id === id);
      if (hit) return hit.total_view_cnt || null;
      if (broads.length < 60) break;
    }
  } catch (e) {}
  return null;
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'id required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  try {
    const res = await fetch('https://live.sooplive.co.kr/afreeca/player_live_api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://play.sooplive.com/',
        'Origin': 'https://play.sooplive.com'
      },
      body: 'bid=' + encodeURIComponent(id)
    });
    const json = await res.json();
    const ch = (json && json.CHANNEL) || {};
    const isLive = String(ch.RESULT) === '1';

    let viewers = null;
    if (isLive) viewers = await getViewerCount(id);

    return new Response(JSON.stringify({
      isLive: isLive,
      nick: ch.BJNICK || null,
      title: ch.TITLE || null,
      viewers: viewers,
      broadNo: ch.BNO || null
    }), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=30'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ isLive: false, error: String(e) }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
}
