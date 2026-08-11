// GET /api/soop-latest-post?bj={BJ_ID}
// SOOP 스트리머 방송국의 진짜 최신 글 1개 반환.
// posts 배열은 공지가 앞에 고정되므로 titleNo 최대값으로 최신을 직접 판별.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const bj = (url.searchParams.get('bj') || '').trim();
  if (!bj) return json({ error: 'bj required' }, 400);

  try {
    const res = await fetch(`https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bj)}/home/section/post`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': `https://www.sooplive.com/station/${bj}`,
        'Origin': 'https://www.sooplive.com'
      }
    });
    if (!res.ok) return json({ ok: false, error: 'not found' }, 200);
    const data = await res.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    if (!posts.length) return json({ ok: true, post: null });

    const latest = posts.reduce((a, b) => (b.titleNo > a.titleNo ? b : a));
    return json({
      ok: true,
      post: {
        bjId: bj,
        titleNo: latest.titleNo,
        title: latest.titleName || '',
        content: (latest.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200),
        thumb: latest.fileUrl || '',
        regDate: latest.regDate || '',
        isNotice: !!latest.isNotice,
        readCnt: latest.readCnt || 0,
        commentCnt: latest.commentCnt || 0,
        postUrl: `https://www.sooplive.com/station/${bj}/post/${latest.titleNo}`
      }
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=120' }
  });
}
