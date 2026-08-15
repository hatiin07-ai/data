// GET /api/soop-comments?bj={BJ_ID}&post={POST_NO}
// SOOP 게시글의 댓글을 UP(likeCnt) 순으로 정렬해 반환.
// 원본 API: api-channel.sooplive.com/v1.1/channel/{bj}/post/{post}/comment
// 댓글이 많으면 여러 페이지를 긁어 합친 뒤 순위를 매긴다.

const MAX_PAGES = 10; // 최대 페이지(과도한 크롤 방지)

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const bj = (url.searchParams.get('bj') || '').trim();
  const post = (url.searchParams.get('post') || '').trim();
  const target = (url.searchParams.get('target') || '').trim(); // 대상 닉네임 또는 아이디
  if (!bj || !post) return json({ error: 'bj and post required' }, 400);

  try {
    let all = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const api = `https://api-channel.sooplive.com/v1.1/channel/${encodeURIComponent(bj)}/post/${encodeURIComponent(post)}/comment?page=${page}&orderBy=reg_date&cCommentNo=0`;
      const res = await fetch(api, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': `https://www.sooplive.com/station/${bj}/post/${post}`,
          'Origin': 'https://www.sooplive.com'
        }
      });
      if (!res.ok) break;
      const j = await res.json();
      const data = Array.isArray(j.data) ? j.data : [];
      all = all.concat(data);
      const meta = j.meta || {};
      if (!meta.lastPage || page >= meta.lastPage) break;
    }

    // UP 순 정렬 + 순위 부여
    const ranked = all
      .map(c => ({
        commentNo: c.pCommentNo,
        nick: c.userNick || '',
        id: c.userId || '',
        comment: (c.comment || '').replace(/\s+/g, ' ').slice(0, 120),
        likeCnt: c.likeCnt || 0,
        isBest: !!c.isBestTop,
        bjLike: !!c.bjlike,
        regDate: c.regDate || ''
      }))
      .sort((a, b) => b.likeCnt - a.likeCnt)
      .map((c, i) => Object.assign(c, { rank: i + 1 }));

    // 대상 찾기 (아이디 정확 → 닉네임 정확 → 닉네임 부분일치)
    let matched = null;
    if (target) {
      const t = target.toLowerCase();
      matched = ranked.find(c => c.id.toLowerCase() === t)
        || ranked.find(c => c.nick.toLowerCase() === t)
        || ranked.find(c => c.nick.toLowerCase().includes(t))
        || null;
    }

    return json({
      ok: true,
      bj: bj,
      post: post,
      total: ranked.length,
      comments: ranked,
      matched: matched  // 대상의 순위/UP (없으면 null)
    });
  } catch (e) {
    return json({ error: String(e), ok: false }, 200);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' }
  });
}
