const messages = document.querySelector('#messages');
const quickActions = document.querySelector('#quick-actions');
const composer = document.querySelector('#composer');
const input = document.querySelector('#message-input');
const firstMessage = messages.innerHTML;
const languageSelect = document.querySelector('#language-select');
const languageHint = document.querySelector('#language-hint');
const languageHintText = document.querySelector('#language-hint-text');
const languageSource = document.querySelector('#language-source');
const headerLanguage = document.querySelector('#header-language');
const backButton = document.querySelector('#back-button');
const fontSizeSelect = document.querySelector('#font-size-select');
const readButton = document.querySelector('#read-button');
let welcomeChineseReference = document.querySelector('#welcome-chinese-reference');
const toast = document.querySelector('#toast');

const translationCatalog = window.FORMOSAN_TRANSLATIONS || {};
const textSources = new WeakMap();
const attributeSources = new WeakMap();
const dynamicTranslationFragments = [
  '可能適用對象', '資料狀態', '查核日', '官方來源', '最後查核', '來源',
  '已準備', '資格自評', '您要詢問', '建議聯絡方式', '北桃園服務區',
  '南桃園服務區', '戶籍地區公所', '申請方式', '基本申請條件'
];

function translatedText(source, language = currentLanguage) {
  if (language === 'zh' || !source || !translationCatalog[language]) return source;
  const trimmed = source.trim();
  const exact = translationCatalog[language][trimmed];
  if (exact) return source.replace(trimmed, exact);
  let result = source;
  const candidates = Object.keys(translationCatalog[language])
    .filter(key => dynamicTranslationFragments.some(fragment => key.includes(fragment)))
    .sort((a, b) => b.length - a.length);
  candidates.forEach(key => {
    if (result.includes(key)) result = result.split(key).join(translationCatalog[language][key]);
  });
  return result;
}

function localizeTree(root = document.body) {
  const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [];
  elements.forEach(element => {
    if (element.closest('[data-no-translate], .message-row.user')) return;
    const saved = attributeSources.get(element) || {};
    ['aria-label', 'placeholder', 'title'].forEach(name => {
      if (element.hasAttribute(name) && !(name in saved)) saved[name] = element.getAttribute(name);
      if (name in saved) element.setAttribute(name, translatedText(saved[name]));
    });
    attributeSources.set(element, saved);
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.parentElement?.closest('[data-no-translate], .message-row.user, script, style')) return;
    if (!textSources.has(node)) textSources.set(node, node.nodeValue);
    node.nodeValue = translatedText(textSources.get(node));
  });
}

function avatarElement() {
  const avatar = document.createElement('div');
  avatar.className = 'bubble-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.src = './assets/資訊平權ICON.jpg';
  image.alt = '';
  avatar.append(image);
  return avatar;
}

// 完整介面使用 Formosan-AI 預先產生初譯；正式發布前仍需族語教師逐句校對。
const languageModes = {
  zh: { header: '互動原型 · 非官方審核' },
  ami: {
    header: '海岸阿美語 · AI 初譯', greeting: 'Nga’ay ho!',
    helpQuestion: 'Padangen ako kiso?', helpChinese: '需要我幫忙嗎？', lang: 'ami',
    hint: '海岸阿美語完整介面由 Formosan-AI 產生初譯，尚未經族語教師校對；福利資格、金額與期限請以中文及官方來源為準。',
    source: 'https://github.com/i3thuan5/Formosan-AI'
  },
  tay: {
    header: '賽考利克泰雅語 · AI 初譯', greeting: 'lokah su!',
    helpQuestion: 'pragun misu ga?', helpChinese: '請問需要幫忙嗎？', lang: 'tay',
    hint: '賽考利克泰雅語完整介面由 Formosan-AI 產生初譯，尚未經族語教師校對；福利資格、金額與期限請以中文及官方來源為準。',
    source: 'https://github.com/i3thuan5/Formosan-AI'
  }
};

const welfareData = {
  elderCard: {
    title: '桃園市原民敬老卡', category: '交通外出',
    summary: '協助符合條件的原住民長者申請市民卡與交通點數補助。',
    eligibility: '設籍桃園市，且年滿 55 歲的原住民。最終資格由受理機關審核。',
    documents: ['國民身分證正本', '最新戶口名簿或戶籍謄本影本（註記原住民身分）', '6 個月內 2 吋照片，或依現場規定拍照', '委託代辦時：委託書及代理人身分證明'],
    steps: ['先完成基本資格快篩', '將文件清單逐項備齊', '到可受理的桃園市區公所辦理', '由承辦人員審核與說明後續進度'],
    sourceName: '桃園市市民卡官方說明',
    sourceUrl: 'https://typass.tycg.gov.tw/citizen-card-intro/view?id=06',
    verified: '2026-09-28', status: '已對照官方頁面'
  },
  living: {
    title: '生活津貼與經濟協助', category: '經濟生活',
    summary: '用生活情境找到可能相關的老年給付、生活津貼與急難救助。',
    eligibility: '各項福利的年齡、居住、所得與資產條件不同，需依戶籍地及福利項目逐一確認。',
    documents: ['身分證明與戶籍資料', '金融帳戶或郵局存簿', '主管機關要求的所得、財產或其他證明'],
    steps: ['選擇目前生活困難', '比對可能的福利項目', '向區公所或主管機關確認最新資格', '備齊文件後送件'],
    sourceName: '桃園市福利補助開放資料',
    sourceUrl: 'https://data.gov.tw/dataset/26032',
    verified: '2026-09-28', status: '流程示範，項目資格需即時查核'
  },
  medical: {
    title: '就醫、健保與假牙協助', category: '就醫照顧',
    summary: '整理健保費、醫療費與假牙補助的查詢及申請方向。',
    eligibility: '補助對象、醫療需求、診斷與所得條件依各方案而異，應由承辦單位確認。',
    documents: ['身分證明與健保卡', '原住民身分或戶籍證明', '診斷書、醫療費用單據或治療計畫（視項目而定）'],
    steps: ['選擇需要的醫療協助', '查看對應方案與官方來源', '由醫療機構或承辦單位確認文件', '按指定窗口申請'],
    sourceName: '桃園市福利補助開放資料',
    sourceUrl: 'https://data.gov.tw/dataset/26032',
    verified: '2026-09-28', status: '流程示範，項目資格需即時查核'
  }
};

let currentLanguage = 'zh';
let selectedBenefit = null;
let helpReason = '';
let preparedDocumentIndexes = [];
let navigationHistory = [];
let toastTimer = null;
let longPressTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2800);
}

function updateNavigationControls() {
  backButton.disabled = navigationHistory.length === 0;
}

function captureSnapshot() {
  return {
    messages: messages.innerHTML,
    quickActions: quickActions.innerHTML,
    selectedBenefit,
    helpReason,
    preparedDocumentIndexes: [...preparedDocumentIndexes]
  };
}

function pushHistory() {
  navigationHistory.push(captureSnapshot());
  if (navigationHistory.length > 30) navigationHistory.shift();
  updateNavigationControls();
}

function restorePreviousStep() {
  const snapshot = navigationHistory.pop();
  if (!snapshot) {
    showToast('已經在第一步');
    return;
  }
  window.speechSynthesis?.cancel();
  messages.innerHTML = snapshot.messages;
  quickActions.innerHTML = snapshot.quickActions;
  selectedBenefit = snapshot.selectedBenefit;
  helpReason = snapshot.helpReason;
  preparedDocumentIndexes = snapshot.preparedDocumentIndexes;
  updateNavigationControls();
  localizeTree(messages);
  localizeTree(quickActions);
  scrollToLatest();
}

function setFlowProgress(bubble, current, total, label) {
  if (!current || !total) return;
  const progress = document.createElement('div');
  progress.className = 'flow-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '1');
  progress.setAttribute('aria-valuemax', String(total));
  progress.setAttribute('aria-valuenow', String(current));
  progress.setAttribute('aria-label', `${label || '流程'}：第 ${current} 步，共 ${total} 步`);
  const copy = document.createElement('span');
  copy.textContent = `${label ? `${label}｜` : ''}第 ${current} 步／共 ${total} 步`;
  const track = document.createElement('span');
  track.className = 'flow-progress-track';
  const fill = document.createElement('span');
  fill.style.width = `${Math.min(100, Math.max(0, current / total * 100))}%`;
  track.append(fill);
  progress.append(copy, track);
  bubble.prepend(progress);
}

function addChineseReference(bubble, chineseText) {
  if (currentLanguage === 'zh' || !chineseText?.trim()) return;
  const details = document.createElement('details');
  details.className = 'chinese-reference';
  details.dataset.noTranslate = '';
  const summary = document.createElement('summary');
  summary.textContent = '查看中文對照';
  const paragraph = document.createElement('p');
  paragraph.textContent = chineseText.replace(/\s+/g, ' ').trim();
  details.append(summary, paragraph);
  bubble.append(details);
}

function latestReadableText() {
  const bubbles = [...messages.querySelectorAll('.message-row.bot .bubble')];
  const latest = bubbles.at(-1);
  if (!latest) return '';
  const clone = latest.cloneNode(true);
  clone.querySelectorAll('.chinese-reference, .card-actions').forEach(node => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function speakText(text = latestReadableText()) {
  if (!('speechSynthesis' in window) || !text) {
    showToast('這個瀏覽器無法朗讀內容');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = currentLanguage === 'zh' ? 'zh-TW' : 'und';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
  showToast(currentLanguage === 'zh' ? '正在朗讀最新內容' : '使用系統語音試讀，族語發音仍需真人校對');
}

const mainActions = [
  { label: '找福利', action: 'benefits' },
  { label: '申請準備', action: 'prepare' },
  { label: '真人協助', action: 'human' }
];

function scrollToLatest() { messages.scrollTop = messages.scrollHeight; }

function addBubble(text, speaker = 'bot') {
  const row = document.createElement('div');
  row.className = `message-row ${speaker}`;
  if (speaker === 'bot') {
    row.append(avatarElement());
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  if (speaker === 'bot') addChineseReference(bubble, text);
  row.append(bubble);
  messages.append(row);
  localizeTree(row);
  scrollToLatest();
}

function addCard({ tag, title, description, bullets = [], meta = [], actions = [], progress = null, tone = '' }) {
  const row = document.createElement('div');
  row.className = 'message-row bot';
  const avatar = avatarElement();
  const bubble = document.createElement('div');
  bubble.className = `bubble card-message${tone ? ` ${tone}` : ''}`;
  if (tag) {
    const label = document.createElement('span');
    label.className = 'card-label';
    label.textContent = tag;
    bubble.append(label);
  }
  const heading = document.createElement('strong');
  heading.className = 'card-title';
  heading.textContent = title;
  bubble.append(heading);
  if (description) {
    const p = document.createElement('p');
    p.textContent = description;
    bubble.append(p);
  }
  if (bullets.length) {
    const list = document.createElement('ul');
    list.className = 'card-list';
    bullets.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    });
    bubble.append(list);
  }
  if (meta.length) {
    const info = document.createElement('div');
    info.className = 'card-meta';
    meta.forEach(item => {
      const span = document.createElement('span');
      span.textContent = item;
      info.append(span);
    });
    bubble.append(info);
  }
  if (actions.length) {
    const controls = document.createElement('div');
    controls.className = 'card-actions';
    actions.forEach(({ label, action, href, primary = false }) => {
      const control = href ? document.createElement('a') : document.createElement('button');
      if (href) {
        control.href = href;
        control.target = '_blank';
        control.rel = 'noopener noreferrer';
      } else {
        control.type = 'button';
        control.dataset.action = action;
      }
      if (primary) control.classList.add('primary');
      control.textContent = label;
      controls.append(control);
    });
    bubble.append(controls);
  }
  const chineseText = [tag, title, description, ...bullets, ...meta].filter(Boolean).join('。');
  addChineseReference(bubble, chineseText);
  if (progress) setFlowProgress(bubble, progress.current, progress.total, progress.label);
  row.append(avatar, bubble);
  messages.append(row);
  localizeTree(row);
  scrollToLatest();
}

function addChecklist(record) {
  const row = document.createElement('div');
  row.className = 'message-row bot';
  const avatar = avatarElement();
  const bubble = document.createElement('div');
  bubble.className = 'bubble card-message';
  const title = document.createElement('strong');
  title.className = 'card-title';
  title.textContent = '應備文件清單';
  const note = document.createElement('p');
  note.textContent = '有帶的文件可直接打勾，不需上傳或輸入個人資料。';
  const progress = document.createElement('div');
  progress.className = 'check-progress';
  progress.textContent = `已準備 0 / ${record.documents.length}`;
  const list = document.createElement('div');
  list.className = 'check-list';
  record.documents.forEach((item, index) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(index);
    checkbox.checked = preparedDocumentIndexes.includes(index);
    label.append(checkbox, document.createTextNode(item));
    list.append(label);
  });
  list.addEventListener('change', () => {
    preparedDocumentIndexes = [...list.querySelectorAll('input:checked')].map(item => Number(item.value));
    progress.textContent = `已準備 ${preparedDocumentIndexes.length} / ${record.documents.length}`;
  });
  const controls = document.createElement('div');
  controls.className = 'card-actions';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'primary';
  next.dataset.action = 'apply-location';
  next.textContent = '查看辦理方式';
  controls.append(next);
  preparedDocumentIndexes = preparedDocumentIndexes.filter(index => index < record.documents.length);
  progress.textContent = `已準備 ${preparedDocumentIndexes.length} / ${record.documents.length}`;
  bubble.append(title, note, progress, list, controls);
  addChineseReference(bubble, `${title.textContent}。${note.textContent}。${record.documents.join('、')}`);
  setFlowProgress(bubble, 3, 4, '申請準備');
  row.append(avatar, bubble);
  messages.append(row);
  localizeTree(row);
  scrollToLatest();
}

function setQuickActions(actions) {
  quickActions.replaceChildren();
  actions.forEach(({ label, action }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.textContent = label;
    quickActions.append(button);
  });
  localizeTree(quickActions);
}

function applyLanguage(mode, { resetHistory = true } = {}) {
  const config = languageModes[mode] || languageModes.zh;
  currentLanguage = languageModes[mode] ? mode : 'zh';
  const translationReady = currentLanguage === 'zh' || Object.keys(translationCatalog[currentLanguage] || {}).length >= 100;
  languageSelect.value = currentLanguage;
  headerLanguage.textContent = translationReady ? config.header : `${currentLanguage === 'ami' ? '海岸阿美語' : '賽考利克泰雅語'} · 部分示範`;
  languageHint.hidden = currentLanguage === 'zh';
  welcomeChineseReference.hidden = currentLanguage === 'zh';
  if (currentLanguage !== 'zh') {
    languageHintText.textContent = translationReady
      ? config.hint
      : 'Formosan-AI 公開翻譯服務目前無法完成請求，因此先保留中文福利內容，只顯示已核對的問候與求助句；服務恢復後可產生完整 AI 初譯。';
    languageSource.href = config.source;
  }
  messages.innerHTML = firstMessage;
  welcomeChineseReference = document.querySelector('#welcome-chinese-reference');
  welcomeChineseReference.hidden = currentLanguage === 'zh';
  const greeting = document.querySelector('#welcome-greeting');
  greeting.hidden = !config.greeting;
  if (config.greeting) { greeting.textContent = config.greeting; greeting.lang = config.lang; }
  const helpQuestion = document.querySelector('#welcome-help-question');
  helpQuestion.hidden = !config.helpQuestion;
  if (config.helpQuestion) { helpQuestion.textContent = config.helpQuestion; helpQuestion.lang = config.lang; }
  document.querySelector('#welcome-body').textContent = config.helpChinese
    ? translatedText('可以幫您查福利、整理申請文件，也能找到真人協助。')
    : '您好，我是福利行動導航。\n\n可以幫您查福利、整理申請文件，也能找到真人協助。';
  selectedBenefit = null;
  helpReason = '';
  preparedDocumentIndexes = [];
  if (resetHistory) navigationHistory = [];
  input.value = '';
  setQuickActions(mainActions);
  localizeTree(document.body);
  updateNavigationControls();
  scrollToLatest();
}

function showBenefitChoices(category) {
  const ids = category === 'living' ? ['living'] : category === 'care' ? ['medical'] : ['elderCard'];
  ids.forEach(id => {
    const item = welfareData[id];
    addCard({
      tag: item.category, title: item.title, description: item.summary,
      meta: [`資料狀態：${item.status}`, `查核日：${item.verified}`],
      actions: [{ label: '查看資格與步驟', action: `detail:${id}`, primary: true }],
      progress: { current: 2, total: 3, label: '找福利' }
    });
  });
  setQuickActions([{ label: '其他類別', action: 'benefits' }, { label: '申請準備', action: 'prepare' }]);
}

function showBenefitDetail(id) {
  const item = welfareData[id];
  selectedBenefit = id;
  const verifiedAt = new Date(`${item.verified}T00:00:00`);
  const ageInDays = Math.floor((Date.now() - verifiedAt.getTime()) / 86400000);
  const isExpired = Number.isFinite(ageInDays) && ageInDays > 90;
  addCard({
    tag: item.category, title: item.title, description: `可能適用對象：${item.eligibility}`,
    bullets: item.steps,
    meta: [`官方來源：${item.sourceName}`, `最後查核：${item.verified}`],
    actions: [
      { label: '開始申請準備', action: `prepare:${id}`, primary: true },
      { label: '查看官方來源 ↗', href: item.sourceUrl },
      { label: '連結無法開啟？', action: `source-help:${id}` }
    ],
    progress: { current: 3, total: 3, label: '找福利' }
  });
  if (isExpired || item.status.includes('需即時查核')) {
    addCard({
      tag: isExpired ? '資料已超過 90 天未查核' : '資料待確認',
      title: isExpired ? '這筆資料可能已過期' : '這筆資料不適合單獨作為申請依據',
      description: '系統已保留官方來源與查核日；請先開啟官方頁面，或請真人窗口確認最新資格、金額與期限。',
      actions: [{ label: '開啟官方來源', href: item.sourceUrl, primary: true }, { label: '找真人確認', action: 'human' }],
      tone: 'warning-card'
    });
  }
  addBubble('重要提醒：系統只能協助整理資訊，不代表已通過申請；實際資格以承辦機關最新審核為準。');
  setQuickActions([{ label: '申請準備', action: `prepare:${id}` }, { label: '找真人', action: 'human' }]);
}

function startPreparation(id) {
  selectedBenefit = id || selectedBenefit || 'elderCard';
  const item = welfareData[selectedBenefit];
  addCard({
    tag: selectedBenefit === 'elderCard' ? '資格自評｜第 1 題／共 3 題' : '資格與文件確認', title: `${item.title}｜先確認基本條件`,
    description: selectedBenefit === 'elderCard' ? '請先回答：申請人是否設籍桃園市？' : '由於每項津貼條件不同，建議先整理文件，再由承辦窗口確認資格。',
    actions: selectedBenefit === 'elderCard'
      ? [{ label: '是', action: 'qualify:resident', primary: true }, { label: '否／不確定', action: 'qualify:resident-no' }]
      : [{ label: '整理文件', action: 'show-checklist', primary: true }, { label: '請真人協助', action: 'human' }],
    progress: { current: 2, total: 4, label: '申請準備' }
  });
  setQuickActions([{ label: '重新選擇福利', action: 'prepare' }, { label: '找真人', action: 'human' }]);
}

function showHumanResult(region) {
  const reasonText = helpReason || '確認福利與申請方式';
  addCard({
    tag: '真人協助', title: `${region}｜建議聯絡方式`,
    description: `您要詢問：${reasonText}。可先聯絡戶籍地區公所社會課，或透過桃園 1999 市民諮詢服務轉接主管單位。`,
    bullets: ['先說明「想申請的福利」或「目前遇到的困難」', '詢問最新資格、文件與受理地點', '先電話確認再前往，減少白跑一趟'],
    actions: [
      { label: '撥打桃園 1999', href: 'tel:1999', primary: true },
      { label: '查官方福利資料 ↗', href: 'https://data.gov.tw/dataset/26032' },
      { label: '回主選單', action: 'menu' }
    ],
    progress: { current: 3, total: 3, label: '真人協助' }
  });
  addBubble('聯絡前可先把問題與手邊文件寫下來。不需在本系統輸入身分證號、病歷或存簿資料。');
  setQuickActions(mainActions);
}

function showNoResults(query = '') {
  addCard({
    tag: '找不到結果',
    title: '目前沒有找到對應的福利資訊',
    description: query ? `我們無法判斷「${query}」屬於哪一類。請改用生活情境選單，或直接請真人協助。` : '請改用生活情境選單，或直接請真人協助。',
    actions: [{ label: '重新選擇需求', action: 'benefits', primary: true }, { label: '找真人協助', action: 'human' }],
    tone: 'empty-card'
  });
  setQuickActions([{ label: '重新找福利', action: 'benefits' }, { label: '真人協助', action: 'human' }]);
}

function showSourceError(id) {
  const item = welfareData[id] || welfareData[selectedBenefit || 'elderCard'];
  addCard({
    tag: '連結無法開啟',
    title: '先不要依賴這個連結申請',
    description: '可能是官方網站維護、網址異動或網路不穩。系統保留了來源名稱與查核日，請改由官方窗口確認。',
    bullets: [`資料名稱：${item.sourceName}`, `最後查核：${item.verified}`, '可撥打桃園 1999，請求轉接主管單位'],
    actions: [{ label: '重試官方連結', href: item.sourceUrl, primary: true }, { label: '改找真人', action: 'human' }],
    tone: 'error-card'
  });
}

function buildSummaryText(item) {
  const prepared = preparedDocumentIndexes.length
    ? preparedDocumentIndexes.map(index => item.documents[index]).filter(Boolean).join('、')
    : '尚未勾選';
  const missing = item.documents.filter((_, index) => !preparedDocumentIndexes.includes(index)).join('、') || '無';
  return [
    `申請摘要：${item.title}`,
    `可能適用對象：${item.eligibility}`,
    `已準備文件：${prepared}`,
    `待確認或待準備：${missing}`,
    `下一步：先聯絡桃園市區公所或主管機關，確認最新文件、受理時間與資格。`,
    `資料來源：${item.sourceName}`,
    `查核日：${item.verified}`,
    '提醒：本摘要不代表已通過政府審核。'
  ].join('\n');
}

function showApplicationSummary() {
  const item = welfareData[selectedBenefit || 'elderCard'];
  const summaryText = buildSummaryText(item);
  addCard({
    tag: '申請摘要',
    title: `${item.title}｜已整理好下一步`,
    description: `已準備 ${preparedDocumentIndexes.length} 份，待確認 ${Math.max(0, item.documents.length - preparedDocumentIndexes.length)} 份。可複製這份摘要給家人或服務人員。`,
    bullets: [
      `可能適用對象：${item.eligibility}`,
      `待準備：${item.documents.filter((_, index) => !preparedDocumentIndexes.includes(index)).join('、') || '無'}`,
      '下一步：先聯絡區公所或主管機關，確認最新資格與受理時間'
    ],
    meta: [`來源：${item.sourceName}`, `查核日：${item.verified}`, '本摘要不代表正式核定'],
    actions: [
      { label: '複製摘要', action: 'copy-summary', primary: true },
      { label: '開啟官方來源 ↗', href: item.sourceUrl },
      { label: '需要真人協助', action: 'human' }
    ],
    progress: { current: 4, total: 4, label: '申請準備' }
  });
  const latest = messages.querySelector('.message-row.bot:last-child .bubble');
  if (latest) latest.dataset.summaryText = summaryText;
  setQuickActions([{ label: '複製申請摘要', action: 'copy-summary' }, { label: '回首頁', action: 'menu' }]);
}

async function copyApplicationSummary() {
  const item = welfareData[selectedBenefit || 'elderCard'];
  const text = buildSummaryText(item);
  try {
    await navigator.clipboard.writeText(text);
    showToast('申請摘要已複製，可傳給家人或服務人員');
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
    showToast('申請摘要已複製');
  }
}

function choose(action) {
  const names = {
    benefits: '找福利', prepare: '申請準備', human: '真人協助', living: '經濟生活',
    care: '就醫照顧', mobility: '交通外出', menu: '回主選單', 'show-checklist': '整理文件',
    'apply-location': '查看辦理方式', summary: '完成並查看申請摘要', 'qualify:resident': '是，設籍桃園', 'qualify:resident-no': '否／不確定',
    'qualify:age': '已年滿 55 歲', 'qualify:age-no': '未滿 55 歲／不確定',
    'qualify:indigenous': '戶籍記載為原住民', 'qualify:indigenous-no': '否／不確定'
  };
  if (action === 'copy-summary') {
    copyApplicationSummary();
    return;
  }
  if (action === 'menu') {
    applyLanguage(currentLanguage);
    showToast('已回到首頁');
    return;
  }
  pushHistory();
  const dataId = action.includes(':') ? action.split(':')[1] : '';
  const label = action.startsWith('source-help:')
    ? '連結無法開啟'
    : names[action] || ((action.startsWith('detail:') || action.startsWith('prepare:')) ? welfareData[dataId]?.title : dataId || '查看資訊');
  addBubble(label || '查看資訊', 'user');

  if (action === 'benefits') {
    addCard({
      tag: '選擇生活需求', title: '您現在最想解決哪類問題？',
      description: '不用記住政策名稱，直接依生活需要選擇。',
      actions: [{ label: '生活費不夠', action: 'living' }, { label: '需要就醫照顧', action: 'care' }, { label: '外出交通不便', action: 'mobility' }],
      progress: { current: 1, total: 3, label: '找福利' }
    });
    setQuickActions([{ label: '經濟生活', action: 'living' }, { label: '就醫照顧', action: 'care' }, { label: '交通外出', action: 'mobility' }]);
    return;
  }
  if (['living', 'care', 'mobility'].includes(action)) { showBenefitChoices(action); return; }
  if (action.startsWith('detail:')) { showBenefitDetail(dataId); return; }
  if (action.startsWith('source-help:')) { showSourceError(dataId); return; }

  if (action === 'prepare') {
    addCard({
      tag: '做得到', title: '要準備哪一項申請？',
      description: '選擇項目後，系統會帶您完成資格自評、文件清單與辦理方式。',
      actions: Object.entries(welfareData).map(([id, item]) => ({ label: item.title, action: `prepare:${id}` })),
      progress: { current: 1, total: 4, label: '申請準備' }
    });
    setQuickActions([{ label: '原民敬老卡', action: 'prepare:elderCard' }, { label: '找真人', action: 'human' }]);
    return;
  }
  if (action.startsWith('prepare:')) { startPreparation(dataId); return; }
  if (action === 'qualify:resident') {
    addCard({ tag: '資格自評｜第 2 題／共 3 題', title: '申請人是否已年滿 55 歲？', description: '這是原民敬老卡的基本條件之一。', actions: [{ label: '已年滿 55 歲', action: 'qualify:age', primary: true }, { label: '未滿／不確定', action: 'qualify:age-no' }], progress: { current: 2, total: 4, label: '申請準備' } });
    return;
  }
  if (action === 'qualify:age') {
    addCard({ tag: '資格自評｜第 3 題／共 3 題', title: '戶籍資料是否記載原住民身分？', description: '申請時需用戶口名簿或戶籍謄本證明。', actions: [{ label: '是', action: 'qualify:indigenous', primary: true }, { label: '否／不確定', action: 'qualify:indigenous-no' }], progress: { current: 2, total: 4, label: '申請準備' } });
    return;
  }
  if (['qualify:resident-no', 'qualify:age-no', 'qualify:indigenous-no'].includes(action)) {
    addCard({ tag: '自評結果', title: '目前無法完成基本條件比對', description: '您可以請區公所或集會所工作人員確認，也可先查看其他福利。', actions: [{ label: '找真人協助', action: 'human', primary: true }, { label: '查其他福利', action: 'benefits' }], progress: { current: 2, total: 4, label: '申請準備' }, tone: 'empty-card' });
    return;
  }
  if (action === 'qualify:indigenous') {
    addCard({ tag: '自評結果', title: '可能符合基本申請條件', description: '這不是正式核定。下一步請整理文件，再由受理機關審核。', actions: [{ label: '開啟文件清單', action: 'show-checklist', primary: true }], progress: { current: 2, total: 4, label: '申請準備' } });
    return;
  }
  if (action === 'show-checklist') {
    addChecklist(welfareData[selectedBenefit || 'elderCard']);
    setQuickActions([{ label: '找真人', action: 'human' }, { label: '回主選單', action: 'menu' }]);
    return;
  }
  if (action === 'apply-location') {
    const item = welfareData[selectedBenefit || 'elderCard'];
    addCard({
      tag: '辦理方式', title: '確認後前往辦理',
      description: selectedBenefit === 'elderCard' ? '建議先聯絡桃園市區公所，確認最新文件、受理時間與是否可跨區辦理。' : '請先向官方承辦單位確認最新資格與送件方式。',
      bullets: item.steps,
      meta: [`來源：${item.sourceName}`, `查核日：${item.verified}`],
      actions: [{ label: '開啟官方說明 ↗', href: item.sourceUrl }, { label: '完成並查看申請摘要', action: 'summary', primary: true }, { label: '連結無法開啟？', action: `source-help:${selectedBenefit || 'elderCard'}` }],
      progress: { current: 4, total: 4, label: '申請準備' }
    });
    setQuickActions([{ label: '查看申請摘要', action: 'summary' }, { label: '真人協助', action: 'human' }]);
    return;
  }
  if (action === 'summary') { showApplicationSummary(); return; }

  if (action === 'human') {
    addCard({
      tag: '問題分類', title: '您遇到哪一種困難？',
      description: '系統先整理問題，再將您導向適合的真人服務窗口。',
      actions: [{ label: '看不懂資格', action: 'help:看不懂資格' }, { label: '不知道文件帶對沒', action: 'help:文件確認' }, { label: '不知道去哪裡辦', action: 'help:找承辦窗口' }],
      progress: { current: 1, total: 3, label: '真人協助' }
    });
    setQuickActions([{ label: '看不懂資格', action: 'help:看不懂資格' }, { label: '文件確認', action: 'help:文件確認' }]);
    return;
  }
  if (action.startsWith('help:')) {
    helpReason = dataId;
    addCard({ tag: '服務區域', title: '您住在桃園哪個區域？', description: '這個選擇只用來導向服務區域，不會儲存詳細地址。', actions: [{ label: '桃園／八德／龜山', action: 'region:北桃園服務區' }, { label: '中壢／平鎮／楊梅', action: 'region:南桃園服務區' }, { label: '復興區', action: 'region:復興區' }, { label: '其他／不確定', action: 'region:戶籍地區公所' }], progress: { current: 2, total: 3, label: '真人協助' } });
    return;
  }
  if (action.startsWith('region:')) { showHumanResult(dataId); return; }

  addBubble('請選擇下方其中一項。');
  setQuickActions(mainActions);
}

function replyToText(text) {
  addBubble(text, 'user');
  if (/福利|補助|津貼|交通|就醫/.test(text)) {
    addBubble('我先用生活需求幫您分類，不用記政策名稱。');
    setQuickActions([{ label: '經濟生活', action: 'living' }, { label: '就醫照顧', action: 'care' }, { label: '交通外出', action: 'mobility' }]);
  } else if (/文件|準備|申請/.test(text)) {
    addBubble('可以。我會帶您完成資格自評、文件清單與辦理方式。');
    setQuickActions([{ label: '開始申請準備', action: 'prepare' }, { label: '真人協助', action: 'human' }]);
  } else if (/人|電話|窗口|協助|不懂/.test(text)) {
    addBubble('我會先整理您的問題，再帶您找適合的服務窗口。');
    setQuickActions([{ label: '開始真人協助', action: 'human' }]);
  } else {
    showNoResults(text);
  }
}

document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) choose(action);
});
document.addEventListener('change', event => {
  if (!event.target.matches('.check-list input[type="checkbox"]')) return;
  const list = event.target.closest('.check-list');
  preparedDocumentIndexes = [...list.querySelectorAll('input:checked')].map(item => Number(item.value));
  const progress = list.previousElementSibling;
  const record = welfareData[selectedBenefit || 'elderCard'];
  if (progress?.classList.contains('check-progress')) progress.textContent = `已準備 ${preparedDocumentIndexes.length} / ${record.documents.length}`;
});
composer.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  pushHistory();
  input.value = '';
  replyToText(text);
});
for (const id of ['reset-desktop', 'reset-mobile']) {
  document.querySelector(`#${id}`).addEventListener('click', () => applyLanguage(currentLanguage));
}
languageSelect.addEventListener('change', () => applyLanguage(languageSelect.value));
backButton.addEventListener('click', restorePreviousStep);
readButton.addEventListener('click', () => speakText());

fontSizeSelect.addEventListener('change', () => {
  document.body.dataset.fontSize = fontSizeSelect.value;
  try { localStorage.setItem('welfare-font-size', fontSizeSelect.value); } catch {}
  showToast(`字級已調整為${fontSizeSelect.options[fontSizeSelect.selectedIndex].text}`);
});

document.addEventListener('pointerdown', event => {
  const bubble = event.target.closest('.message-row.bot .bubble');
  if (!bubble || event.target.closest('button, a, input, select, summary')) return;
  longPressTimer = window.setTimeout(() => {
    const clone = bubble.cloneNode(true);
    clone.querySelectorAll('.chinese-reference, .card-actions').forEach(node => node.remove());
    speakText(clone.textContent.replace(/\s+/g, ' ').trim());
  }, 650);
});
['pointerup', 'pointercancel', 'pointermove'].forEach(type => {
  document.addEventListener(type, () => window.clearTimeout(longPressTimer));
});

try {
  const savedFontSize = localStorage.getItem('welfare-font-size');
  if (['medium', 'large', 'xlarge'].includes(savedFontSize)) fontSizeSelect.value = savedFontSize;
} catch {}
document.body.dataset.fontSize = fontSizeSelect.value;
applyLanguage('zh');
