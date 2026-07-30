// GET /api/soop-pc?id={BJ_ID}
// 모바일 브라우저에서도 PC 플레이어(음소거 버튼 있는)를 쓰기 위해,
// 서버에서 PC UserAgent로 SOOP direct 페이지를 대신 받아와 그대로 전달한다.
// ⚠️ 실험적: SOOP 페이지 내부 리소스가 절대경로면 동작, 상대경로/쿠키 의존이 크면 깨질 수 있음.
const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id || !/^[A-Za-z0-9_]+$/.test(id)) {
    return new Response('invalid id', { status: 400 });
  }

  const target = `https://play.sooplive.com/${id}/direct?fromApi=1`;
  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': PC_UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://play.sooplive.com/'
      },
      redirect: 'follow'
    });

    let html = await res.text();

    // <head>에 <base>를 넣어 상대경로가 SOOP 원본을 향하도록 보정
    const baseTag = '<base href="https://play.sooplive.com/">';
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    } else {
      html = baseTag + html;
    }

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  } catch (e) {
    return new Response('proxy error: ' + e.message, { status: 502 });
  }
}
