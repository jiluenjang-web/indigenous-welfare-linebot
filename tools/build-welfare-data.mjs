import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(toolDirectory, '..');
const inputPath = path.join(projectDirectory, 'data', 'welfare-benefits.json');
const outputPath = path.join(projectDirectory, 'dist', 'welfare-data.js');
const catalog = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const requiredFields = [
  'id', 'title', 'category', 'audience', 'summary', 'documents', 'steps',
  'serviceUnit', 'availability', 'source'
];
const ids = new Set();

if (!Array.isArray(catalog.benefits) || catalog.benefits.length === 0) {
  throw new Error('福利資料必須至少包含一筆 benefits。');
}

for (const [index, benefit] of catalog.benefits.entries()) {
  for (const field of requiredFields) {
    if (!(field in benefit)) throw new Error(`第 ${index + 1} 筆資料缺少 ${field}`);
  }
  if (ids.has(benefit.id)) throw new Error(`福利 ID 重複：${benefit.id}`);
  ids.add(benefit.id);
  if (!benefit.source.url?.startsWith('https://')) {
    throw new Error(`${benefit.id} 的官方來源不是 HTTPS 網址。`);
  }
}

const banner = '// 此檔案由 tools/build-welfare-data.mjs 自動產生，請勿直接編輯。\n';
const content = `${banner}window.WELFARE_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`;
fs.writeFileSync(outputPath, content);

console.log(`已產生 ${path.relative(projectDirectory, outputPath)}（${catalog.benefits.length} 筆福利）`);
