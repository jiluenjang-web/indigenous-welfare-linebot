const messages = document.querySelector('#messages');
const quickActions = document.querySelector('#quick-actions');
const composer = document.querySelector('#composer');
const input = document.querySelector('#message-input');
const firstMessage = messages.innerHTML;

const mainActions = [
  { label: '福利資訊', action: 'benefits' },
  { label: '申請準備', action: 'prepare' },
  { label: '真人協助', action: 'human' }
];

function scrollToLatest() { messages.scrollTop = messages.scrollHeight; }

function addBubble(text, speaker = 'bot') {
  const row = document.createElement('div');
  row.className = `message-row ${speaker}`;
  if (speaker === 'bot') {
    const avatar = document.createElement('div');
    avatar.className = 'bubble-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '福';
    row.append(avatar);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.append(bubble);
  messages.append(row);
  scrollToLatest();
}

function addCard({ tag, title, description, bullets = [], actions = [] }) {
  const row = document.createElement('div');
  row.className = 'message-row bot';
  const avatar = document.createElement('div');
  avatar.className = 'bubble-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '福';
  const bubble = document.createElement('div');
  bubble.className = 'bubble card-message';
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
  if (actions.length) {
    const controls = document.createElement('div');
    controls.className = 'card-actions';
    actions.forEach(({ label, action }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action;
      button.textContent = label;
      controls.append(button);
    });
    bubble.append(controls);
  }
  row.append(avatar, bubble);
  messages.append(row);
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
}

function choose(action) {
  const names = {
    benefits: '福利資訊', prepare: '申請準備', human: '真人協助',
    living: '經濟生活', care: '就醫照顧', mobility: '交通外出', menu: '回主選單'
  };
  addBubble(names[action] || '查看資訊', 'user');
  if (action === 'benefits') {
    addCard({ tag: '第一步', title: '想查哪一類福利？', description: '先依需求分類。正式版會顯示核對過的官方資訊與在地辦理方式。', actions: [
      { label: '經濟生活', action: 'living' }, { label: '就醫照顧', action: 'care' }, { label: '交通外出', action: 'mobility' }
    ] });
    setQuickActions([{ label: '經濟生活', action: 'living' }, { label: '就醫照顧', action: 'care' }, { label: '交通外出', action: 'mobility' }]);
    return;
  }
  if (['living', 'care', 'mobility'].includes(action)) {
    addCard({ tag: '內容待查證', title: `${names[action]}｜資訊呈現範例`, description: '參訪與資料核對後，這裡才會顯示實際福利項目。每個項目預計包含：', bullets: [
      '適用對象與申請條件', '應備文件及辦理步驟', '官方來源、更新日期與承辦窗口'
    ], actions: [{ label: '其他福利類別', action: 'benefits' }, { label: '找真人協助', action: 'human' }] });
    setQuickActions([{ label: '其他福利類別', action: 'benefits' }, { label: '找真人協助', action: 'human' }]);
    return;
  }
  if (action === 'prepare') {
    addCard({ tag: '申請前', title: '先把問題整理好', description: '正式申請文件會依福利項目不同，由承辦單位確認。現在可以先做這三件事：', bullets: [
      '記下想詢問的福利或目前遇到的困難', '向承辦窗口確認資格與最新文件清單', '備妥資料後再前往辦理，避免白跑一趟'
    ], actions: [{ label: '查看福利類別', action: 'benefits' }, { label: '找真人協助', action: 'human' }] });
    addBubble('提醒：請勿在這個示範對話中輸入身分證字號、地址或健康資料。');
    setQuickActions([{ label: '查看福利類別', action: 'benefits' }, { label: '找真人協助', action: 'human' }]);
    return;
  }
  if (action === 'human') {
    addCard({ tag: '需要有人幫忙', title: '請向現場或官方窗口詢問', description: '若看不懂條件、文件不齊，或不知道下一步，可先請集會所工作人員協助，再由福利承辦單位確認資格。正式版只會列出已取得同意、核對過的聯絡方式。', actions: [{ label: '回主選單', action: 'menu' }] });
    setQuickActions([{ label: '回主選單', action: 'menu' }]);
    return;
  }
  addBubble('請選擇下方其中一項。正式版會依實地訪談結果調整選項。');
  setQuickActions(mainActions);
}

function replyToText(text) {
  addBubble(text, 'user');
  if (/福利|補助|津貼/.test(text)) {
    addBubble('我可以先協助分類，但目前尚未匯入經查證的福利項目。請選擇一個類別。');
    setQuickActions([{ label: '經濟生活', action: 'living' }, { label: '就醫照顧', action: 'care' }, { label: '交通外出', action: 'mobility' }]);
  } else if (/文件|準備|申請/.test(text)) {
    addBubble('各項福利的文件可能不同。正式版會顯示官方清單；現在可先向承辦窗口確認。');
    setQuickActions([{ label: '申請準備', action: 'prepare' }, { label: '真人協助', action: 'human' }]);
  } else if (/人|電話|窗口|協助/.test(text)) {
    addBubble('目前沒有經確認的聯絡方式。請向集會所工作人員或福利承辦單位詢問。');
    setQuickActions([{ label: '真人協助', action: 'human' }]);
  } else {
    addBubble('這是按鈕式互動原型，還不能自由回答問題。請點下方選單試用。');
    setQuickActions(mainActions);
  }
}

document.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) choose(action);
});
composer.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  replyToText(text);
});
for (const id of ['reset-desktop', 'reset-mobile']) {
  document.querySelector(`#${id}`).addEventListener('click', () => {
    messages.innerHTML = firstMessage;
    input.value = '';
    setQuickActions(mainActions);
    scrollToLatest();
  });
}
setQuickActions(mainActions);

if (document.modelContext?.registerTool) {
  try {
    void Promise.resolve(document.modelContext.registerTool({
      name: 'select_welfare_demo_option',
      title: '選擇福利導航示範選項',
      description: '在手機聊天模擬畫面中選擇一個現有選單項目，並顯示對應回覆。',
      inputSchema: {
        type: 'object',
        properties: { option: { type: 'string', enum: ['benefits', 'prepare', 'human', 'living', 'care', 'mobility', 'menu'] } },
        required: ['option'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute({ option }) {
        if (!['benefits', 'prepare', 'human', 'living', 'care', 'mobility', 'menu'].includes(option)) {
          throw new Error('不支援的選項');
        }
        choose(option);
        return { selected: option, visibleMessages: messages.querySelectorAll('.message-row').length };
      }
    })).catch(() => {});
  } catch { /* Unsupported browser implementations should not affect the demo. */ }
}
