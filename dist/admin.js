const requiredBenefitFields = ['id', 'title', 'category', 'audience', 'summary', 'documents', 'steps', 'serviceUnit', 'availability', 'source'];
const statusLabels = { active: '受理中', 'verify-window': '待確認', closed: '停止受理' };
const categoryLabels = { income: '經濟生活', medical: '醫療', care: '照顧', mobility: '交通外出', emergency: '急難救助', housing: '住宅' };

let catalog = structuredClone(window.WELFARE_CATALOG || { schemaVersion: '1.0', scope: '桃園市原住民長者優先資訊', checkedAt: '', notice: '', benefits: [] });
let reviewQueue = structuredClone(window.WELFARE_REVIEW_QUEUE || { schemaVersion: '1.0', generatedAt: null, pending: [], history: [], lastRun: null });
let selectedId = catalog.benefits[0]?.id || null;
let projectDirectoryHandle = null;
let dirty = false;

const $ = selector => document.querySelector(selector);
const form = $('#benefit-form');
const list = $('#benefit-list');
const errorMessage = $('#error-message');
const successMessage = $('#success-message');

function normalizeReviewQueue(value) {
  const normalized = value && typeof value === 'object' ? value : {};
  return {
    schemaVersion: normalized.schemaVersion || '1.0',
    generatedAt: normalized.generatedAt || null,
    pending: Array.isArray(normalized.pending) ? normalized.pending : [],
    history: Array.isArray(normalized.history) ? normalized.history : [],
    lastRun: normalized.lastRun || null
  };
}

reviewQueue = normalizeReviewQueue(reviewQueue);

function lines(value) {
  return String(value || '').split('\n').map(item => item.trim()).filter(Boolean);
}

function setDirty(value = true) {
  dirty = value;
  const state = $('#save-state');
  state.textContent = value ? '有尚未寫入檔案的修改' : '資料已同步';
  state.classList.toggle('dirty', value);
}

function showMessage(type, text) {
  errorMessage.hidden = true;
  successMessage.hidden = true;
  const target = type === 'error' ? errorMessage : successMessage;
  target.textContent = text;
  target.hidden = false;
  window.setTimeout(() => { target.hidden = true; }, 6500);
}

function validateCatalog(data = catalog) {
  const errors = [];
  if (!Array.isArray(data.benefits) || !data.benefits.length) errors.push('至少需要一筆福利資料。');
  const ids = new Set();
  (data.benefits || []).forEach((benefit, index) => {
    requiredBenefitFields.forEach(field => { if (!(field in benefit)) errors.push(`第${index + 1}筆缺少${field}。`); });
    if (!/^[a-z0-9-]+$/.test(benefit.id || '')) errors.push(`${benefit.title || `第${index + 1}筆`}的ID只能使用英文小寫、數字與連字號。`);
    if (ids.has(benefit.id)) errors.push(`福利ID重複：${benefit.id}`);
    ids.add(benefit.id);
    if (!benefit.title?.trim()) errors.push(`第${index + 1}筆缺少福利名稱。`);
    if (!benefit.summary?.trim()) errors.push(`${benefit.title || `第${index + 1}筆`}缺少摘要。`);
    if (!benefit.serviceUnit?.trim()) errors.push(`${benefit.title || `第${index + 1}筆`}缺少承辦單位。`);
    if (!benefit.availability?.label?.trim()) errors.push(`${benefit.title || `第${index + 1}筆`}缺少受理狀態文字。`);
    if (!benefit.source?.name?.trim()) errors.push(`${benefit.title || `第${index + 1}筆`}缺少來源名稱。`);
    if (!benefit.source?.checkedAt) errors.push(`${benefit.title || `第${index + 1}筆`}缺少查核日。`);
    if (!benefit.source?.url?.startsWith('https://')) errors.push(`${benefit.title || `第${index + 1}筆`}的官方網址必須以https://開頭。`);
  });
  return errors;
}

function getSelected() {
  return catalog.benefits.find(item => item.id === selectedId);
}

function formatDateTime(value) {
  if (!value) return '尚未執行';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function appendSignalList(container, values, emptyText) {
  const listElement = document.createElement('ul');
  const source = values?.length ? values : [emptyText];
  source.forEach(value => {
    const item = document.createElement('li');
    item.textContent = value;
    listElement.append(item);
  });
  container.append(listElement);
}

function renderReviews() {
  const pending = reviewQueue.pending || [];
  const target = $('#review-list');
  $('#pending-review-count').textContent = pending.length;
  const run = reviewQueue.lastRun;
  if (!run) {
    $('#monitor-summary').textContent = '尚未執行來源檢查。自動偵測只會建立提醒，不會直接修改前台福利內容。';
  } else {
    $('#monitor-summary').textContent = `最近檢查：${formatDateTime(run.finishedAt)}；成功${run.checked}項、異動${run.changed}項、失敗${run.failed}項。`;
  }
  target.replaceChildren();
  if (!pending.length) {
    const empty = document.createElement('div');
    empty.className = 'review-empty';
    empty.textContent = run ? '目前沒有待審核的官方來源異動。' : '請先執行「檢查福利更新.command」建立官方來源基準。';
    target.append(empty);
  }
  pending.forEach(review => {
    const card = document.createElement('article');
    card.className = 'review-card';
    card.dataset.reviewId = review.id;
    const title = document.createElement('h3');
    title.textContent = review.title;
    const meta = document.createElement('p');
    meta.className = 'review-meta';
    meta.textContent = `${review.sourceName || '官方來源'}・偵測時間 ${formatDateTime(review.detectedAt)}`;
    const diff = document.createElement('div');
    diff.className = 'review-diff';
    const added = document.createElement('div');
    added.className = 'diff-column added';
    added.append(Object.assign(document.createElement('strong'), { textContent: '最新頁面新增／改變的文字' }));
    appendSignalList(added, review.addedSignals, '系統偵測到整體內容變動，請開啟官方頁面確認。');
    const removed = document.createElement('div');
    removed.className = 'diff-column removed';
    removed.append(Object.assign(document.createElement('strong'), { textContent: '上一版消失／被取代的文字' }));
    appendSignalList(removed, review.removedSignals, '沒有可顯示的舊版文字差異。');
    diff.append(added, removed);
    const actions = document.createElement('div');
    actions.className = 'review-card-actions';
    [['edit', '編輯這筆福利', 'secondary'], ['source', '開啟官方來源', 'secondary'], ['approve', '完成審核', 'approve'], ['ignore', '忽略此次變動', 'ignore']].forEach(([action, label, style]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `button ${style}`;
      button.dataset.action = action;
      button.textContent = label;
      actions.append(button);
    });
    card.append(title, meta, diff, actions);
    target.append(card);
  });
  if (run?.errors?.length) {
    const errors = document.createElement('details');
    errors.className = 'monitor-errors';
    const summary = document.createElement('summary');
    summary.textContent = `${run.errors.length}個來源檢查失敗`;
    errors.append(summary);
    appendSignalList(errors, run.errors.map(item => `${item.title}：${item.message}`), '');
    target.append(errors);
  }
}

function finishReview(id, status) {
  const index = (reviewQueue.pending || []).findIndex(item => item.id === id);
  if (index < 0) return;
  const review = reviewQueue.pending[index];
  if (status === 'approved') {
    if (selectedId === review.benefitId && !applyCurrentForm(false)) return;
    const benefit = catalog.benefits.find(item => item.id === review.benefitId);
    const today = new Date().toISOString().slice(0, 10);
    if (benefit) benefit.source.checkedAt = today;
    catalog.checkedAt = today;
  }
  reviewQueue.pending.splice(index, 1);
  reviewQueue.history ||= [];
  reviewQueue.history.unshift({ ...review, status, reviewedAt: new Date().toISOString() });
  reviewQueue.history = reviewQueue.history.slice(0, 100);
  setDirty(true);
  renderReviews();
  if (status === 'approved') {
    selectBenefit(review.benefitId);
    showMessage('success', '已標記為完成審核並更新查核日；請確認福利內容後按「儲存並更新前台」。');
  } else {
    showMessage('success', '已忽略此次網站變動；請按「儲存並更新前台」保存審核紀錄。');
  }
}

function countAndRenderList() {
  const benefits = catalog.benefits || [];
  $('#count-all').textContent = benefits.length;
  $('#count-active').textContent = benefits.filter(item => item.availability.status === 'active').length;
  $('#count-review').textContent = benefits.filter(item => item.availability.status === 'verify-window').length;
  $('#count-closed').textContent = benefits.filter(item => item.availability.status === 'closed').length;

  const query = $('#search').value.trim().toLowerCase();
  const filter = $('#status-filter').value;
  const visible = benefits.filter(item => {
    const matchesText = !query || [item.title, item.serviceUnit, categoryLabels[item.category]].join(' ').toLowerCase().includes(query);
    return matchesText && (filter === 'all' || item.availability.status === filter);
  });
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = '沒有符合條件的福利項目。';
    list.append(empty);
    return;
  }
  visible.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `benefit-item${item.id === selectedId ? ' active' : ''}`;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', item.id === selectedId ? 'true' : 'false');
    button.innerHTML = '<strong></strong><span class="benefit-meta"><span class="category"></span><span class="status"></span></span>';
    button.querySelector('strong').textContent = item.title;
    button.querySelector('.category').textContent = categoryLabels[item.category] || item.category;
    const status = button.querySelector('.status');
    status.textContent = statusLabels[item.availability.status] || item.availability.status;
    status.classList.add(item.availability.status);
    button.addEventListener('click', () => selectBenefit(item.id));
    list.append(button);
  });
}

function fillForm(item) {
  if (!item) {
    form.hidden = true;
    $('#editor-title').textContent = '尚無福利資料';
    $('#delete-benefit').disabled = true;
    return;
  }
  form.hidden = false;
  $('#delete-benefit').disabled = false;
  $('#editor-title').textContent = item.title;
  const fields = form.elements;
  fields.title.value = item.title || '';
  fields.id.value = item.id || '';
  fields.category.value = item.category || 'income';
  fields.serviceUnit.value = item.serviceUnit || '';
  fields.contact.value = item.contact || '';
  fields.catalogCheckedAt.value = catalog.checkedAt || '';
  fields.summary.value = item.summary || '';
  fields.audience.value = (item.audience || []).join('\n');
  fields.documents.value = (item.documents || []).join('\n');
  fields.steps.value = (item.steps || []).join('\n');
  fields.availabilityStatus.value = item.availability?.status || 'active';
  fields.availabilityLabel.value = item.availability?.label || '';
  fields.effectiveDate.value = item.availability?.effectiveDate || '';
  fields.sourceName.value = item.source?.name || '';
  fields.sourceCheckedAt.value = item.source?.checkedAt || '';
  fields.sourceUrl.value = item.source?.url || '';
  ['amountMustBeRechecked', 'annualListMustBeRechecked', 'annualProgram', 'applicationWindowMustBeRechecked'].forEach(name => {
    fields[name].checked = Boolean(item.source?.[name]);
  });
}

function selectBenefit(id) {
  selectedId = id;
  fillForm(getSelected());
  countAndRenderList();
  errorMessage.hidden = true;
  successMessage.hidden = true;
}

function readForm() {
  if (!form.reportValidity()) return null;
  const fields = form.elements;
  const source = { name: fields.sourceName.value.trim(), url: fields.sourceUrl.value.trim(), checkedAt: fields.sourceCheckedAt.value };
  ['amountMustBeRechecked', 'annualListMustBeRechecked', 'annualProgram', 'applicationWindowMustBeRechecked'].forEach(name => {
    if (fields[name].checked) source[name] = true;
  });
  const availability = { status: fields.availabilityStatus.value, label: fields.availabilityLabel.value.trim() };
  if (fields.effectiveDate.value) availability.effectiveDate = fields.effectiveDate.value;
  return {
    id: fields.id.value.trim(), title: fields.title.value.trim(), category: fields.category.value,
    audience: lines(fields.audience.value), summary: fields.summary.value.trim(), documents: lines(fields.documents.value),
    steps: lines(fields.steps.value), serviceUnit: fields.serviceUnit.value.trim(),
    ...(fields.contact.value.trim() ? { contact: fields.contact.value.trim() } : {}), availability, source
  };
}

function applyCurrentForm(showSuccess = true) {
  const original = getSelected();
  if (!original) return false;
  const updated = readForm();
  if (!updated) return false;
  const duplicate = catalog.benefits.some(item => item !== original && item.id === updated.id);
  if (duplicate) { showMessage('error', `福利ID「${updated.id}」已經存在，請改用其他ID。`); return false; }
  const index = catalog.benefits.indexOf(original);
  catalog.benefits[index] = updated;
  catalog.checkedAt = form.elements.catalogCheckedAt.value || catalog.checkedAt;
  selectedId = updated.id;
  setDirty(true);
  countAndRenderList();
  fillForm(updated);
  if (showSuccess) showMessage('success', '本筆修改已套用到瀏覽器，尚未寫入專案檔案。');
  return true;
}

function serializeJson() {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function serializeJs() {
  return `// 此檔案由福利資料管理後台自動產生，請勿直接編輯。\nwindow.WELFARE_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`;
}

function serializeReviewsJson() {
  return `${JSON.stringify(reviewQueue, null, 2)}\n`;
}

function serializeReviewsJs() {
  return `// 此檔案由福利資料管理後台自動產生，請勿直接編輯。\nwindow.WELFARE_REVIEW_QUEUE = ${JSON.stringify(reviewQueue, null, 2)};\n`;
}

async function writeTextFile(directory, pathParts, content) {
  let handle = directory;
  for (const part of pathParts.slice(0, -1)) handle = await handle.getDirectoryHandle(part, { create: false });
  const file = await handle.getFileHandle(pathParts.at(-1), { create: true });
  const writer = await file.createWritable();
  await writer.write(content);
  await writer.close();
}

async function readJsonFromProject(directory) {
  const dataDirectory = await directory.getDirectoryHandle('data');
  const handle = await dataDirectory.getFileHandle('welfare-benefits.json');
  const file = await handle.getFile();
  return JSON.parse(await file.text());
}

async function readReviewsFromProject(directory) {
  try {
    const dataDirectory = await directory.getDirectoryHandle('data');
    const handle = await dataDirectory.getFileHandle('welfare-change-reviews.json');
    const file = await handle.getFile();
    return JSON.parse(await file.text());
  } catch (error) {
    if (error.name !== 'NotFoundError') throw error;
    return { schemaVersion: '1.0', generatedAt: null, pending: [], history: [], lastRun: null };
  }
}

async function chooseProject() {
  if (!window.showDirectoryPicker) {
    showMessage('error', '此瀏覽器不支援直接選取資料夾。請使用Chrome或Edge，或改用下方匯入／下載功能。');
    return false;
  }
  try {
    const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
    const imported = await readJsonFromProject(directory);
    const importedReviews = await readReviewsFromProject(directory);
    const errors = validateCatalog(imported);
    if (errors.length) throw new Error(errors.slice(0, 4).join(' '));
    projectDirectoryHandle = directory;
    catalog = imported;
    reviewQueue = normalizeReviewQueue(importedReviews);
    selectedId = catalog.benefits[0]?.id || null;
    setDirty(false);
    selectBenefit(selectedId);
    renderReviews();
    showMessage('success', `已載入「${directory.name}」的福利資料，可直接儲存並同步前台。`);
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') showMessage('error', `無法載入專案：${error.message}`);
    return false;
  }
}

async function saveProject() {
  if (getSelected() && !applyCurrentForm(false)) return;
  const errors = validateCatalog();
  if (errors.length) { showMessage('error', errors.slice(0, 5).join(' ')); return; }
  if (!projectDirectoryHandle) {
    if (!window.showDirectoryPicker) {
      showMessage('error', '此瀏覽器無法直接寫入資料夾，請使用「下載JSON」與「下載前台JS」。');
      return;
    }
    try {
      projectDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await projectDirectoryHandle.getDirectoryHandle('data');
      await projectDirectoryHandle.getDirectoryHandle('dist');
    } catch (error) {
      projectDirectoryHandle = null;
      if (error.name !== 'AbortError') showMessage('error', '請選擇包含data與dist的line_bot_ui_work專案資料夾。');
      return;
    }
  }
  try {
    await writeTextFile(projectDirectoryHandle, ['data', 'welfare-benefits.json'], serializeJson());
    await writeTextFile(projectDirectoryHandle, ['dist', 'welfare-data.js'], serializeJs());
    await writeTextFile(projectDirectoryHandle, ['data', 'welfare-change-reviews.json'], serializeReviewsJson());
    await writeTextFile(projectDirectoryHandle, ['dist', 'welfare-reviews.js'], serializeReviewsJs());
    setDirty(false);
    showMessage('success', '福利資料、前台資料與審核紀錄皆已儲存。重新整理前台即可看到結果。');
  } catch (error) {
    showMessage('error', `儲存失敗：${error.message}`);
  }
}

function download(filename, content, type) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function addBenefit() {
  const suffix = Date.now().toString().slice(-6);
  const item = {
    id: `new-benefit-${suffix}`, title: '新福利項目', category: 'income', audience: [], summary: '請填寫福利摘要。',
    documents: [], steps: [], serviceUnit: '請填寫承辦單位', availability: { status: 'verify-window', label: '受理期間待確認' },
    source: { name: '請填寫官方來源', url: 'https://', checkedAt: new Date().toISOString().slice(0, 10) }
  };
  catalog.benefits.unshift(item);
  selectedId = item.id;
  setDirty(true);
  selectBenefit(item.id);
}

form.addEventListener('submit', event => { event.preventDefault(); applyCurrentForm(); });
$('#search').addEventListener('input', countAndRenderList);
$('#status-filter').addEventListener('change', countAndRenderList);
$('#add-benefit').addEventListener('click', addBenefit);
$('#open-project').addEventListener('click', chooseProject);
$('#save-project').addEventListener('click', saveProject);
$('#preview-source').addEventListener('click', () => {
  const url = form.elements.sourceUrl.value.trim();
  if (url.startsWith('https://')) window.open(url, '_blank', 'noopener,noreferrer');
  else showMessage('error', '請先填寫有效的HTTPS官方網址。');
});
$('#delete-benefit').addEventListener('click', () => $('#confirm-dialog').showModal());
$('#confirm-dialog').addEventListener('close', event => {
  if (event.target.returnValue !== 'confirm') return;
  catalog.benefits = catalog.benefits.filter(item => item.id !== selectedId);
  selectedId = catalog.benefits[0]?.id || null;
  setDirty(true);
  selectBenefit(selectedId);
});
$('#download-json').addEventListener('click', () => {
  if (getSelected() && !applyCurrentForm(false)) return;
  const errors = validateCatalog();
  if (errors.length) { showMessage('error', errors.slice(0, 5).join(' ')); return; }
  download('welfare-benefits.json', serializeJson(), 'application/json');
});
$('#download-js').addEventListener('click', () => {
  if (getSelected() && !applyCurrentForm(false)) return;
  const errors = validateCatalog();
  if (errors.length) { showMessage('error', errors.slice(0, 5).join(' ')); return; }
  download('welfare-data.js', serializeJs(), 'text/javascript');
});
$('#download-reviews').addEventListener('click', () => {
  download('welfare-change-reviews.json', serializeReviewsJson(), 'application/json');
});
$('#toggle-reviews').addEventListener('click', event => {
  const hidden = !$('#review-list').hidden;
  $('#review-list').hidden = hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!hidden));
  event.currentTarget.textContent = hidden ? '展開審核區' : '收合審核區';
});
$('#review-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  const card = event.target.closest('[data-review-id]');
  if (!button || !card) return;
  const review = (reviewQueue.pending || []).find(item => item.id === card.dataset.reviewId);
  if (!review) return;
  if (button.dataset.action === 'edit') {
    selectBenefit(review.benefitId);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (button.dataset.action === 'source') window.open(review.sourceUrl, '_blank', 'noopener,noreferrer');
  if (button.dataset.action === 'approve') finishReview(review.id, 'approved');
  if (button.dataset.action === 'ignore') finishReview(review.id, 'ignored');
});
$('#import-json').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const errors = validateCatalog(imported);
    if (errors.length) throw new Error(errors.slice(0, 5).join(' '));
    catalog = imported;
    selectedId = catalog.benefits[0]?.id || null;
    setDirty(true);
    selectBenefit(selectedId);
    showMessage('success', `已匯入${catalog.benefits.length}筆資料，尚未寫入專案。`);
  } catch (error) {
    showMessage('error', `匯入失敗：${error.message}`);
  } finally {
    event.target.value = '';
  }
});

window.addEventListener('beforeunload', event => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

countAndRenderList();
fillForm(getSelected());
renderReviews();
