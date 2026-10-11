import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(toolDirectory, '..');
const catalogPath = path.join(projectDirectory, 'data', 'welfare-benefits.json');
const snapshotsPath = path.join(projectDirectory, 'data', 'welfare-source-snapshots.json');
const reviewsPath = path.join(projectDirectory, 'data', 'welfare-change-reviews.json');
const browserReviewsPath = path.join(projectDirectory, 'dist', 'welfare-reviews.js');
const timeoutMilliseconds = 20000;
const signalKeywords = /申請|補助|給付|津貼|資格|條件|文件|檢附|受理|截止|停止|公告|金額|每月|每戶|元|歲|期限|年度|聯絡|電話|服務|點數|名額|經費/;

function readJson(filePath, fallback) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : structuredClone(fallback);
}

function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? ' ');
}

export function htmlToText(html) {
  return decodeEntities(String(html || ''))
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li|tr|section|article|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\t\r ]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function extractSignals(text) {
  const chunks = String(text || '')
    .split(/(?<=[。！？；;])|\n+/)
    .map(value => value.replace(/\s+/g, ' ').trim())
    .filter(value => value.length >= 8 && value.length <= 500);
  const relevant = chunks.filter(value => signalKeywords.test(value));
  const source = relevant.length ? relevant : chunks;
  return [...new Set(source)].slice(0, 120);
}

function hashSignals(signals) {
  return crypto.createHash('sha256').update(signals.join('\n')).digest('hex');
}

export function compareSignals(previous = [], current = []) {
  const before = new Set(previous);
  const after = new Set(current);
  return {
    added: current.filter(value => !before.has(value)).slice(0, 12),
    removed: previous.filter(value => !after.has(value)).slice(0, 12)
  };
}

function emptyReviews() {
  return { schemaVersion: '1.0', generatedAt: null, pending: [], history: [], lastRun: null };
}

function writeOutputs(snapshots, reviews) {
  fs.writeFileSync(snapshotsPath, `${JSON.stringify(snapshots, null, 2)}\n`);
  fs.writeFileSync(reviewsPath, `${JSON.stringify(reviews, null, 2)}\n`);
  const banner = '// 此檔案由 tools/check-welfare-updates.mjs 自動產生，請勿直接編輯。\n';
  fs.writeFileSync(browserReviewsPath, `${banner}window.WELFARE_REVIEW_QUEUE = ${JSON.stringify(reviews, null, 2)};\n`);
}

async function fetchSource(benefit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetch(benefit.source.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Indigenous-Welfare-Monitor/1.0 (+https://github.com/jiluenjang-web/indigenous-welfare-linebot)',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    const text = contentType.includes('json') ? raw.replace(/[{}\[\]",]/g, ' ') : htmlToText(raw);
    const signals = extractSignals(text);
    if (!signals.length) throw new Error('頁面沒有可供比對的文字');
    return {
      checkedAt: new Date().toISOString(),
      resolvedUrl: response.url,
      httpStatus: response.status,
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentHash: hashSignals(signals),
      signals
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runMonitor() {
  const catalog = readJson(catalogPath, { benefits: [] });
  const snapshots = readJson(snapshotsPath, { schemaVersion: '1.0', updatedAt: null, sources: {} });
  const reviews = readJson(reviewsPath, emptyReviews());
  snapshots.sources ||= {};
  reviews.pending ||= [];
  reviews.history ||= [];
  const run = { startedAt: new Date().toISOString(), finishedAt: null, checked: 0, changed: 0, initialized: 0, failed: 0, errors: [] };

  for (const benefit of catalog.benefits || []) {
    try {
      const current = await fetchSource(benefit);
      const previous = snapshots.sources[benefit.id];
      run.checked += 1;
      if (!previous) {
        run.initialized += 1;
      } else if (previous.contentHash !== current.contentHash) {
        const difference = compareSignals(previous.signals, current.signals);
        const existing = reviews.pending.find(item => item.benefitId === benefit.id);
        const review = {
          id: existing?.id || `${benefit.id}-${Date.now()}`,
          benefitId: benefit.id,
          title: benefit.title,
          sourceName: benefit.source.name,
          sourceUrl: benefit.source.url,
          detectedAt: current.checkedAt,
          previousHash: existing?.previousHash || previous.contentHash,
          currentHash: current.contentHash,
          addedSignals: difference.added,
          removedSignals: difference.removed,
          status: 'pending'
        };
        if (existing) Object.assign(existing, review);
        else reviews.pending.unshift(review);
        run.changed += 1;
      }
      snapshots.sources[benefit.id] = { benefitId: benefit.id, title: benefit.title, sourceUrl: benefit.source.url, ...current };
    } catch (error) {
      run.failed += 1;
      run.errors.push({ benefitId: benefit.id, title: benefit.title, url: benefit.source.url, message: error.name === 'AbortError' ? '連線逾時' : error.message });
    }
  }

  run.finishedAt = new Date().toISOString();
  snapshots.updatedAt = run.finishedAt;
  reviews.generatedAt = run.finishedAt;
  reviews.lastRun = run;
  reviews.history = reviews.history.slice(0, 100);
  writeOutputs(snapshots, reviews);
  console.log(`福利來源檢查完成：成功 ${run.checked}、新基準 ${run.initialized}、偵測異動 ${run.changed}、失敗 ${run.failed}`);
  if (run.errors.length) run.errors.forEach(item => console.error(`- ${item.title}: ${item.message}`));
  if (run.failed && !run.checked) process.exitCode = 1;
}

function selfTest() {
  const text = htmlToText('<html><style>x</style><p>補助金額每月 4,000 元。</p><script>x</script><p>一般導覽</p></html>');
  const signals = extractSignals(text);
  const diff = compareSignals(['補助金額每月 3,000 元。'], signals);
  if (!signals.some(value => value.includes('4,000'))) throw new Error('訊號擷取測試失敗');
  if (!diff.added.length || !diff.removed.length) throw new Error('差異測試失敗');
  console.log('自動偵測核心測試通過');
}

if (process.argv.includes('--self-test')) selfTest();
else await runMonitor();
