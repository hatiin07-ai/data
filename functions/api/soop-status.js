// GET /api/soop-status?id={SOOP_BJ_ID}
// 송민트(s5ngm2nt-svg/mint) 프로젝트에서 검증된 방식 그대로 이식.
// openapi.sooplive.com/broad/list (공식 오픈API, client_id 필요)를 페이지네이션 돌며
// 현재 방송 중인 리스트에서 해당 BJ user_id를 찾는다. 찾으면 방송중.
const CLIENT_ID = 'fd019c2cbcd7cabdf1a7c7a7a94b2848';

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
    let found = null;
    const totalPages = 29; // 약 1700개 / 60개 per page (송민트 프로젝트에서 확인된 값)

    for (let page = 1; page <= totalPages; page++) {
      const apiUrl = `https://openapi.sooplive.com/broad/list?client_id=${CLIENT_ID}&page_no=${page}`;
      const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      const broads = Array.isArray(json.broad) ? json.broad : [];

      found = broads.find(b => b.user_id === id) || null;
      if (found) break;
      if (broads.length < 60) break; // 마지막 페이지
    }

    return new Response(JSON.stringify({
      isLive: !!found,
      title: found?.broad_title || null,
      viewers: found?.total_view_cnt || null,
      startedAt: found?.broad_start || null,
      broadNo: found?.broad_no || null
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

