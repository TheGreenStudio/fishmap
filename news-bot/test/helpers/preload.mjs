// Подключается через node --import при прогоне всей сводки: подменяет «сейчас» (FAKE_NOW) и Telegram.
// Отправленные в Telegram тексты дописываются в файл TG_LOG. Любой другой выход в сеть считается ошибкой теста.
import fs from 'node:fs';

const RealDate = Date;
const fake = process.env.FAKE_NOW;
if (fake) {
  globalThis.Date = class extends RealDate {
    constructor(...a) { if (a.length === 0) super(fake); else super(...a); }
    static now() { return new RealDate(fake).getTime(); }
  };
}
globalThis.fetch = async (url, init = {}) => {
  if (String(url).includes('api.telegram.org')) {
    fs.appendFileSync(process.env.TG_LOG, JSON.parse(init.body).text + '\n=====\n');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  throw new Error(`тест: неожиданный запрос в сеть ${String(url).slice(0, 60)}`);
};
