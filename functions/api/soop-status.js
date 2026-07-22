// GET /api/soop-status?id={SOOP_BJ_ID}
// SOOP(sooplive) station API를 프록시해서 온에어 여부를 반환.
// 브라우저에서 직접 chapi.sooplive.co.kr를 호출하면 CORS에 막히므로 서버(Functions)에서 대신 호출.
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
    const res = await fetch(`https://chapi.sooplive.co.kr/api/${id}/station`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const station = data.station || data;

    // SOOP station API의 온에어 필드명이 정확히 확인되지 않아 방어적으로 여러 후보를 체크.
    // 실제 응답(raw)을 같이 내려주니, 안 맞으면 devtools 네트워크탭에서 raw를 보고 필드명 확정 필요.
    const isLive = !!(
      station?.broad_no ||
      station?.is_broad ||
      station?.now_broad ||
      (station?.broad && (station.broad.broad_no || station.broad.broad_title))
    );

    return new Response(JSON.stringify({ isLive, raw: station }), {
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
