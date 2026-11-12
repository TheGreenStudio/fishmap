// Заготовки для тестов новостей: RSS Google News, ссылки старого и нового формата, страницы статей.
export const rssItem = ({ title, source, link, ageDays }) =>
  `<item><title>${title.replace(/&/g, '&amp;')} - ${source}</title><link>${link}</link>`
  + `<pubDate>${new Date(Date.now() - ageDays * 864e5).toUTCString()}</pubDate><source url="https://x.example">${source}</source></item>`;
export const rss = (items) => `<?xml version="1.0"?><rss><channel>${items.map(rssItem).join('')}</channel></rss>`;

// Старый формат: адрес статьи лежит прямо в идентификаторе (protobuf в base64url).
export function oldLink(url) {
  const b = Buffer.from([0x08, 0x13, 0x22, url.length, ...Buffer.from(url), 0xd2, 0x01, 0x00]);
  return 'https://news.google.com/rss/articles/' + b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '?oc=5';
}
// Новый формат: адрес знает только Google.
export const newLink = (id) => `https://news.google.com/rss/articles/CBMi${id}?oc=5`;

export const page = (title, description) =>
  `<html><head><title>x</title><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"></head></html>`;

// Подмена fetch: rssByQuery(q) -> массив заголовков; articles: адрес -> html или число (код ошибки);
// google: id нового формата -> адрес статьи (null: Google не отдал параметры).
export function mockFetch({ rssByQuery = () => [], articles = {}, google = {}, failQueries = [] }) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('/rss/search')) {
      const q = new URL(u).searchParams.get('q').replace(/ when:\d+d$/, '');
      if (failQueries.includes(q) || failQueries.includes('*')) return new Response('', { status: 500 });
      return new Response(rss(rssByQuery(q)), { status: 200 });
    }
    if (u.includes('/rss/articles/CBMi')) {
      const id = u.match(/CBMi([^?]+)/)[1];
      if (!google[id]) return new Response('<html>nothing</html>', { status: 200 });
      return new Response(`<c-wiz data-n-a-sg="SG${id}" data-n-a-ts="1700000000"></c-wiz>`, { status: 200 });
    }
    if (u.includes('batchexecute')) {
      const id = decodeURIComponent(init.body).match(/CBMi([^\\"]+)/)[1];
      const inner = JSON.stringify(['garturlresponse', google[id], 1]);
      return new Response(`)]}'\n\n${JSON.stringify([['wrb.fr', 'Fbv4je', inner, null, null, null, 'generic']])}`, { status: 200 });
    }
    const a = articles[u];
    if (typeof a === 'number') return new Response('', { status: a });
    if (typeof a === 'string') return new Response(a, { status: 200 });
    return new Response('', { status: 404 });
  };
  return calls;
}
