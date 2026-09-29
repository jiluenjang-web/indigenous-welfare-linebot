import fs from 'node:fs';

const root = new URL('../dist/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const js = fs.readFileSync(new URL('app.js', root), 'utf8');
const strings = new Set();
const dynamicFragments = [
  'AI 初譯', '已準備', '資料狀態', '查核日', '官方來源', '最後查核', '來源',
  '可能適用對象', '資格自評', '您要詢問', '建議聯絡方式', '北桃園服務區',
  '南桃園服務區', '戶籍地區公所', '其他福利', '申請方式', '基本申請條件'
];
const hasHan = value => /[\u3400-\u9fff]/u.test(value);
const add = value => {
  const clean = value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\\n/g, '\n')
    .trim();
  if (clean && hasHan(clean) && !clean.includes('${')) strings.add(clean);
};

for (const match of html.matchAll(/>([^<>]+)</g)) add(match[1]);
for (const match of html.matchAll(/(?:content|aria-label|placeholder|title)="([^"]+)"/g)) add(match[1]);
for (const match of js.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) add(match[2]);
dynamicFragments.forEach(add);

const values = [...strings].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
const serialized = `${JSON.stringify(values, null, 2)}\n`;
if (process.argv[2]) {
  fs.writeFileSync(process.argv[2], serialized, 'utf8');
  console.log(`Wrote ${values.length} phrases to ${process.argv[2]}`);
} else {
  console.log(serialized);
}
