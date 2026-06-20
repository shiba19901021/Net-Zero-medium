/* ===== State ===== */
let state = {
  subject: 1,
  mode: 'past',
  count: 50,
  questions: [],
  userAnswers: [],
  flagged: new Set(),
  currentIdx: 0,
  answered: false,
  submitted: false,
  feedbackMode: 'instant',
  confirmed: new Set(),
};

/* ===== Helpers ===== */
const $ = id => document.getElementById(id);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ls = (k, v) => v !== undefined ? localStorage.setItem('ipass_' + k, JSON.stringify(v)) : JSON.parse(localStorage.getItem('ipass_' + k) || 'null');
const LS = {
  get(k, def) { const v = ls(k); return v !== null ? v : def; },
  set(k, v) { ls(k, v); },
};

/* ===== Data ===== */
function allQuestions(subject) {
  return subject === 1 ? [...window.QUESTIONS_S1 || []] : [...window.QUESTIONS_S2 || []];
}

const S1_CHAPTER_NAMES = {
  '1.1': '組織節能減碳策略 — 減碳/節能目標設定與路徑規劃',
  '1.2': '組織節能減碳策略 — 碳排熱區辨識與能源盤查資料解析',
  '1.3': '組織節能減碳策略 — 財務決策模型與風險評估',
  '1.4': null,
  '1.5': null,
  '2.1': '節能技術應用與能源管理 — 公用設施節能技術選用分析',
  '2.2': '節能技術應用與能源管理 — 節能技術投資效益與回收期評估',
  '2.3': '節能技術應用與能源管理 — ESCO 應用實務',
  '2.4': '節能技術應用與能源管理 — ISO 50001 能源管理系統導入與運用',
  '2.5': '節能技術應用與能源管理 — 節能相關前瞻技術',
  '3.1': '再生能源與綠電導入 — 再生能源種類及優缺點比較',
  '3.2': '再生能源與綠電導入 — 國內再生能源導入及效益評估',
  '3.3': '再生能源與綠電導入 — 綠電採購模式與制度',
};

const S2_CHAPTER_NAMES = {
  '1.1': '碳規範實務與揭露準則應用 — 國內氣候相關政策與減碳法規之應用',
  '1.2': '碳規範實務與揭露準則應用 — 國際揭露制度架構理解與實務應用',
  '1.3': '碳規範實務與揭露準則應用 — 減碳相關倡議與準則實務接軌',
  '2.1': '組織自願減量實務 — 國內外自願減量專案與抵換制度',
  '2.2': '組織自願減量實務 — 碳移除與負碳技術',
  '2.3': '組織自願減量實務 — 碳抵換與碳資源交易',
  '2.4': '組織自願減量實務 — 內部碳定價與碳資產管理',
  '3.1': '永續供應鏈管理 — 範疇三碳排數據盤查與估算實務',
  '3.2': '永續供應鏈管理 — 供應鏈減碳風險評估與管理機制',
};

function getChapterName(subject, chapter) {
  const map = subject === 1 ? S1_CHAPTER_NAMES : S2_CHAPTER_NAMES;
  return map[chapter] || null;
}

function getQuestionById(id) {
  return [...(window.QUESTIONS_S1 || []), ...(window.QUESTIONS_S2 || [])].find(q => q.id === id);
}

/* ===== Views ===== */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  $(id).style.display = 'block';
  window.scrollTo(0, 0);
}

/* ===== Dashboard ===== */
function initDashboard() {
  // Subject tabs
  document.querySelectorAll('.sub-tab').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      state.subject = parseInt(el.dataset.sub);
      updateProgress();
    });
  });

  // Mode buttons
  document.querySelectorAll('.mode-btn:not(.feedback-btn)').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.style.borderColor = '');
      el.style.borderColor = 'var(--primary)';
      state.mode = el.dataset.mode;
    });
  });
  // Restore mode
  const modeBtn = document.querySelector(`.mode-btn[data-mode="${state.mode}"]`);
  if (modeBtn) modeBtn.style.borderColor = 'var(--primary)';
  else document.querySelector('.mode-btn[data-mode="past"]').style.borderColor = 'var(--primary)';

  // Feedback mode buttons
  document.querySelectorAll('.feedback-btn').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
    });
  });
  // Restore feedback mode
  const fbBtn = document.querySelector(`.feedback-btn[data-fb="${state.feedbackMode}"]`);
  if (fbBtn) {
    document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active'));
    fbBtn.classList.add('active');
  }

  // Count slider
  const slider = $('count-slider');
  const display = $('count-display');
  slider.addEventListener('input', () => {
    display.textContent = slider.value;
    state.count = parseInt(slider.value);
  });

  // Start button
  $('start-btn').addEventListener('click', startExam);

  // History
  $('history-btn').addEventListener('click', () => { renderHistory(); showView('history-view'); });

  // Sync
  $('sync-btn').addEventListener('click', () => { showView('sync-modal'); });
  $('close-sync-btn').addEventListener('click', () => { $('sync-modal').style.display = 'none'; });
  $('export-sync-btn').addEventListener('click', exportSync);
  $('import-sync-btn').addEventListener('click', () => { $('sync-area').style.display = 'block'; $('confirm-import-btn').style.display = 'block'; });
  $('confirm-import-btn').addEventListener('click', importSync);

  // Result back
  $('result-dash-btn').addEventListener('click', () => { showView('dashboard'); initDashboard(); });
  $('history-dash-btn').addEventListener('click', () => showView('dashboard'));

  // Clear history
  $('clear-history-btn').addEventListener('click', () => {
    if (confirm('確定清除所有紀錄？')) { LS.set('history', []); renderHistory(); }
  });

  updateProgress();
}

function updateProgress() {
  const s = state.subject;
  const qs = allQuestions(s);
  const stats = LS.get('stats', {});
  const wrong = LS.get('wrong', {});

  for (const src of ['past', 'ai']) {
    const pool = qs.filter(q => q.source === src);
    const done = pool.filter(q => stats[q.id]).length;
    const wrongCount = pool.filter(q => wrong[q.id]).length;
    const total = pool.length;
    const pct = total ? Math.round(done / total * 100) : 0;

    const valEl = $(`prog-${src}-s${s}`);
    const barEl = $(`prog-${src}-bar-s${s}`);
    if (valEl) valEl.textContent = `${done}/${total}`;
    if (barEl) barEl.style.width = pct + '%';
  }

  // Show/hide relevant progress cards
  document.querySelectorAll('.prog-card').forEach(card => {
    card.style.display = parseInt(card.dataset.sub) === s ? '' : 'none';
  });
}

/* ===== Start Exam ===== */
function startExam() {
  const s = state.subject;
  const mode = state.mode;
  const all = allQuestions(s);
  let pool = [];

  if (mode === 'past') pool = all.filter(q => q.source === 'past');
  else if (mode === 'ai') pool = all.filter(q => q.source === 'ai');
  else if (mode === 'mix') pool = [...all];
  else if (mode === 'wrong') {
    const wrong = LS.get('wrong', {});
    const wrongIds = Object.keys(wrong);
    pool = all.filter(q => wrongIds.includes(q.id));
    if (pool.length === 0) { alert('🎉 你目前沒有錯題！'); return; }
  }

  if (pool.length === 0) { alert('該題庫目前沒有題目'); return; }

  // Weighted selection (ANKI-like)
  const stats = LS.get('stats', {});
  const wrong = LS.get('wrong', {});
  const flagged = LS.get('flagged', []);

  let weighted = [];
  pool.forEach(q => {
    let w = 1;
    if (wrong[q.id]) w += 10;
    if (flagged.includes(q.id)) w += 5;
    if (!stats[q.id]) w += 3;
    for (let i = 0; i < w; i++) weighted.push(q);
  });

  shuffle(weighted);
  const selected = [];
  const seen = new Set();
  for (const q of weighted) {
    if (selected.length >= state.count) break;
    if (!seen.has(q.id)) { seen.add(q.id); selected.push(q); }
  }
  // If not enough unique questions, add remaining
  if (selected.length < state.count && pool.length > selected.length) {
    const rest = pool.filter(q => !seen.has(q.id));
    shuffle(rest);
    while (selected.length < state.count && rest.length) {
      selected.push(rest.pop());
    }
  }

  state.questions = selected;
  state.userAnswers = new Array(selected.length).fill(null);
  state.flagged = new Set();
  state.currentIdx = 0;
  state.submitted = false;
  const activeFb = document.querySelector('.feedback-btn.active');
  state.feedbackMode = activeFb ? activeFb.dataset.fb : 'instant';
  state.confirmed = new Set();

  initExam();
}

/* ===== Exam ===== */
function initExam() {
  showView('exam-view');
  renderDots();
  renderQuestion(0);
}

function renderDots() {
  const container = $('q-dots');
  container.innerHTML = '';
  state.questions.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.addEventListener('click', () => renderQuestion(i));
    container.appendChild(dot);
  });
}

function renderQuestion(index) {
  state.currentIdx = index;
  const q = state.questions[index];
  if (!q) return;

  // Progress
  $('exam-progress').textContent = `第 ${index + 1} 題 / 共 ${state.questions.length} 題`;
  $('exam-bar-inner').style.width = `${(index + 1) / state.questions.length * 100}%`;

  // Badge
  const badge = $('q-badge');
  const srcLabel = q.source === 'past' ? '📚 考古題' : '🤖 AI 模擬題';
  let ch = '';
  if (q.chapter && q.chapter !== 'past') {
    const chapName = getChapterName(state.subject, q.chapter);
    if (chapName) {
      ch = ` (${q.chapter} ${chapName})`;
    } else {
      ch = ` (章節 ${q.chapter} ⚠️)`;
    }
  }
  badge.textContent = srcLabel + ch;
  badge.className = 'q-badge' + (q.source === 'ai' ? ' ai' : '');

  // Scenario
  const scenarioEl = $('q-scenario');
  if (q.scenario) {
    scenarioEl.style.display = 'block';
    scenarioEl.textContent = q.scenario;
  } else {
    scenarioEl.style.display = 'none';
  }

  // Question text
  $('q-text').textContent = q.question;

  // Options
  const container = $('q-options');
  container.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const userAns = state.userAnswers[index];
  const isMulti = q.type === 'multiple';
  const fb = state.feedbackMode;
  const hasAnswer = userAns !== null;
  const showResult = hasAnswer && (state.submitted || (fb === 'instant' && !isMulti) || state.confirmed.has(index));
  const showSelection = hasAnswer && !showResult;

  // Multi-select hint
  if (isMulti && !showResult) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:.78rem;color:var(--text-dimmer);margin-bottom:8px;';
    hint.textContent = fb === 'instant'
      ? '📌 此為複選題，請點選所有正確選項後再點「確認答案」'
      : '📌 此為複選題，請點選所有正確選項後再交卷';
    container.appendChild(hint);
  }

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span><span>${opt}</span>`;

    if (showResult) {
      const chosen = Array.isArray(userAns) ? userAns.includes(i) : userAns === i;
      const isCorrectOpt = isMulti ? q.answers.includes(i) : i === q.answer;
      if (chosen) btn.classList.add(isCorrectOpt ? 'correct' : 'wrong');
      else if (isCorrectOpt) btn.classList.add('correct');
      btn.classList.add('disabled');
    } else if (showSelection) {
      const selected = Array.isArray(userAns) ? userAns.includes(i) : userAns === i;
      if (selected) btn.classList.add('selected');
      btn.addEventListener('click', () => selectOption(index, i));
    } else {
      btn.addEventListener('click', () => selectOption(index, i));
    }

    container.appendChild(btn);
  });

  // Confirm button for multi-choice instant mode
  if (fb === 'instant' && isMulti && hasAnswer && !state.confirmed.has(index) && !state.submitted) {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn';
    confirmBtn.textContent = '✓ 確認答案';
    confirmBtn.addEventListener('click', () => {
      state.confirmed.add(index);
      renderQuestion(index);
    });
    container.appendChild(confirmBtn);
  }

  // Explanation
  const expEl = $('q-explanation');
  if (showResult) {
    const isCorrect = isMulti
      ? Array.isArray(userAns) && q.answers && q.answers.length === userAns.length && q.answers.every(a => userAns.includes(a))
      : userAns === q.answer;

    const correctStr = isMulti
      ? q.answers.map(ai => letters[ai]).join('、')
      : letters[q.answer];

    const wrong = LS.get('wrong', {});
    const wrongCnt = wrong[q.id];
    let streakHtml = '';
    if (isCorrect && wrongCnt !== undefined) {
      const remain = 5 - wrongCnt;
      streakHtml = remain > 0
        ? `<div style="font-size:.8rem;margin-top:4px;color:var(--primary);">📊 連續答對 ${wrongCnt}/5 次，再對 ${remain} 次即可移出錯題庫</div>`
        : `<div style="font-size:.8rem;margin-top:4px;color:var(--success);">📊 連續答對 5/5 次，已移出錯題庫 🎉</div>`;
    } else if (!isCorrect && wrong[q.id] !== undefined) {
      streakHtml = `<div style="font-size:.8rem;margin-top:4px;color:var(--error);">📊 答錯，連續答對次數已歸零</div>`;
    }

    let resultHtml = isCorrect
      ? '<span class="result-tag correct">✅ 答對了！</span>'
      : `<span class="result-tag wrong">❌ 答錯了，正確答案：${correctStr}</span>`;

    expEl.innerHTML = resultHtml + streakHtml + '<div>' + q.explanation + '</div>';
    expEl.style.display = 'block';
    state.answered = true;
  } else {
    expEl.style.display = 'none';
    state.answered = false;
  }

  // Nav buttons
  $('prev-btn').disabled = index === 0;
  $('next-btn').disabled = index === state.questions.length - 1;

  // Flag button
  const flagBtn = $('flag-btn');
  if (state.flagged.has(index)) {
    flagBtn.classList.add('flagged');
    flagBtn.textContent = '🔖 已標記';
  } else {
    flagBtn.classList.remove('flagged');
    flagBtn.textContent = '🔖 標記';
  }

  // Dots
  const dots = $('q-dots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = 'dot';
    if (i === index) dots[i].classList.add('current');
    if (state.userAnswers[i] !== null) dots[i].classList.add('answered');
    if (state.flagged.has(i)) dots[i].classList.add('flagged');
  }

  window.scrollTo(0, 0);
}

function selectOption(qIdx, optIdx) {
  const q = state.questions[qIdx];
  const isMulti = q.type === 'multiple';

  if (isMulti) {
    let current = state.userAnswers[qIdx] || [];
    if (current.includes(optIdx)) {
      current = current.filter(i => i !== optIdx);
    } else {
      current = [...current, optIdx];
    }
    state.userAnswers[qIdx] = current.length ? current : null;
    renderQuestion(qIdx);
  } else {
    state.userAnswers[qIdx] = optIdx;
    renderQuestion(qIdx);
  }
}

// Nav
$('prev-btn').addEventListener('click', () => {
  if (state.currentIdx > 0) renderQuestion(state.currentIdx - 1);
});
$('next-btn').addEventListener('click', () => {
  if (state.currentIdx < state.questions.length - 1) renderQuestion(state.currentIdx + 1);
});
$('flag-btn').addEventListener('click', () => {
  const idx = state.currentIdx;
  if (state.flagged.has(idx)) state.flagged.delete(idx);
  else state.flagged.add(idx);
  renderQuestion(idx);
});
$('exam-submit').addEventListener('click', submitExam);
$('exam-back').addEventListener('click', () => {
  if (confirm('返回首頁將遺失本次作答進度，確定嗎？')) showView('dashboard');
});

/* ===== Submit ===== */
function submitExam() {
  const unanswered = state.userAnswers.filter(a => a === null).length;
  if (unanswered > 0 && !confirm(`還有 ${unanswered} 題未作答，確定交卷？`)) return;
  if (unanswered === 0 && !confirm('確定交卷？')) return;

  state.submitted = true;
  showResult();
}

function showResult() {
  showView('result-view');

  let correct = 0;
  state.questions.forEach((q, i) => {
    const ans = state.userAnswers[i];
    if (ans === null) return;
    if (q.type === 'multiple') {
      if (Array.isArray(ans) && q.answers && ans.length === q.answers.length && q.answers.every(a => ans.includes(a))) correct++;
    } else {
      if (ans === q.answer) correct++;
    }
  });

  const score = Math.round(correct / state.questions.length * 100);
  $('score-num').textContent = score;
  $('score-detail').textContent = `${correct} / ${state.questions.length} 答對`;

  const circle = $('score-circle');
  circle.style.borderColor = score >= 70 ? 'var(--success)' : 'var(--error)';
  circle.style.background = score >= 70 ? 'var(--success-bg)' : 'var(--error-bg)';
  $('score-num').style.color = score >= 70 ? 'var(--success)' : 'var(--error)';

  // Save stats
  saveResults(correct, score);

  renderReview('all');
}

function saveResults(correct, score) {
  const stats = LS.get('stats', {});
  const wrong = LS.get('wrong', {});
  const wrongStats = LS.get('wrongStats', {});

  state.questions.forEach((q, i) => {
    const ans = state.userAnswers[i];
    if (ans === null) return;

    const isCorrect = q.type === 'multiple'
      ? Array.isArray(ans) && q.answers && ans.length === q.answers.length && q.answers.every(a => ans.includes(a))
      : ans === q.answer;

    const isFlagged = state.flagged.has(i);

    if (!isCorrect) {
      wrongStats[q.id] = (wrongStats[q.id] || 0) + 1;
    }

    if (!isCorrect || isFlagged) {
      wrong[q.id] = 0;
    } else {
      stats[q.id] = (stats[q.id] || 0) + 1;
      if (wrong[q.id] !== undefined) {
        wrong[q.id] += 1;
        if (wrong[q.id] >= 5) delete wrong[q.id];
      }
    }
  });

  LS.set('stats', stats);
  LS.set('wrong', wrong);
  LS.set('wrongStats', wrongStats);

  // Save history
  const history = LS.get('history', []);
  const subjName = state.subject === 1 ? '考科一' : '考科二';
  modeNames = { past: '考古題', ai: 'AI模擬題', mix: '混合題', wrong: '錯題複習' };
  history.unshift({
    id: Date.now().toString(),
    date: new Date().toLocaleString('zh-TW'),
    subject: subjName,
    mode: modeNames[state.mode] || state.mode,
    score,
    correct,
    total: state.questions.length,
    questions: state.questions.map(q => q.id),
    answers: [...state.userAnswers],
    flagged: Array.from(state.flagged),
  });
  if (history.length > 50) history.pop();
  LS.set('history', history);
}

/* ===== Review ===== */
function renderReview(filter) {
  const container = $('review-list');
  container.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  let items = state.questions.map((q, i) => ({ q, i }));
  items = items.filter(({ q, i }) => {
    const ans = state.userAnswers[i];
    if (ans === null) return filter === 'all';
    const isCorrect = q.type === 'multiple'
      ? Array.isArray(ans) && q.answers && ans.length === q.answers.length && q.answers.every(a => ans.includes(a))
      : ans === q.answer;
    if (filter === 'correct' && !isCorrect) return false;
    if (filter === 'wrong' && isCorrect) return false;
    if (filter === 'flagged' && !state.flagged.has(i)) return false;
    return true;
  });

  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-dimmer);padding:20px;">沒有符合的題目 🎉</p>';
    return;
  }

  items.forEach(({ q, i }) => {
    const ans = state.userAnswers[i];
    const isCorrect = ans !== null && (q.type === 'multiple'
      ? Array.isArray(ans) && q.answers && ans.length === q.answers.length && q.answers.every(a => ans.includes(a))
      : ans === q.answer);
    const isFlagged = state.flagged.has(i);

    const correctStr = q.type === 'multiple'
      ? q.answers.map(a => letters[a]).join('、')
      : letters[q.answer];
    const userStr = ans === null ? '未作答'
      : Array.isArray(ans) ? ans.map(a => letters[a]).join('、') : letters[ans];

    const item = document.createElement('div');
    item.className = `review-item ${ans === null ? '' : isCorrect ? 'correct' : 'wrong'}`;

    let optsHtml = q.options.map((opt, oi) => {
      let cls = 'review-opt';
      const isCorrectOpt = q.type === 'multiple' ? q.answers.includes(oi) : oi === q.answer;
      const isUserOpt = Array.isArray(ans) ? ans.includes(oi) : ans === oi;
      if (isCorrectOpt) cls += ' is-correct';
      else if (isUserOpt && !isCorrectOpt) cls += ' is-wrong';
      return `<div class="${cls}">${letters[oi]}. ${opt}</div>`;
    }).join('');

    item.innerHTML = `
      <h4>第 ${i + 1} 題${isFlagged ? ' 🔖' : ''}</h4>
      <div class="review-q">${q.question}</div>
      ${optsHtml}
      <div style="font-size:.82rem;margin:6px 0;color:var(--text-dim);">
        ${ans === null ? '⚠️ 未作答' : (isCorrect ? '✅ 答對' : `❌ 你選 ${userStr}，正確 ${correctStr}`)}
      </div>
      <div class="review-exp"><strong>💡 解析：</strong><br>${q.explanation}</div>
    `;
    container.appendChild(item);
  });
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderReview(btn.dataset.f);
  });
});

/* ===== History ===== */
function renderHistory() {
  const container = $('history-list');
  container.innerHTML = '';
  const history = LS.get('history', []);

  if (history.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-dimmer);padding:20px;">尚無測驗紀錄</p>';
    return;
  }

  history.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-left">
        <div class="history-score">${rec.score} 分</div>
        <div class="history-info">${rec.date} · ${rec.subject} · ${rec.mode}</div>
        <div class="history-info">答對 ${rec.correct}/${rec.total} 題</div>
      </div>
      <div class="history-arrow">›</div>
    `;
    item.addEventListener('click', () => loadHistoryRecord(rec));
    container.appendChild(item);
  });
}

function loadHistoryRecord(rec) {
  if (!rec.questions) { alert('紀錄不完整'); return; }
  state.questions = rec.questions.map(getQuestionById).filter(Boolean);
  state.userAnswers = rec.answers || [];
  state.flagged = new Set(rec.flagged || []);
  if (state.questions.length === 0) { alert('無法載入該筆紀錄'); return; }
  showResult();
}

/* ===== Sync ===== */
function exportSync() {
  const area = $('sync-area');
  area.style.display = 'block';
  $('confirm-import-btn').style.display = 'none';

  const data = {
    w: LS.get('wrong', {}),
    s: LS.get('stats', {}),
    ws: LS.get('wrongStats', {}),
    h: (LS.get('history', []) || []).slice(0, 5).map(r => { const { ...rest } = r; return rest; }),
    t: Date.now(),
  };
  const code = btoa(encodeURIComponent(JSON.stringify(data)));
  area.value = code;
  area.select();
  try { document.execCommand('copy'); $('sync-status').textContent = '✅ 已複製到剪貼簿！'; }
  catch (e) { $('sync-status').textContent = '請手動複製上方代碼'; }
}

function importSync() {
  const code = $('sync-area').value.replace(/\s+/g, '');
  if (!code) { $('sync-status').textContent = '❌ 請先貼上代碼'; return; }
  try {
    const data = JSON.parse(decodeURIComponent(atob(code)));
    if (!data.w) throw new Error('格式錯誤');

    const localTime = parseInt(LS.get('lastSync', '0'));
    if (data.t < localTime && !confirm('這組代碼較舊，確定覆蓋？')) return;

    LS.set('wrong', data.w);
    if (data.s) LS.set('stats', data.s);
    if (data.ws) LS.set('wrongStats', data.ws);
    LS.set('lastSync', data.t.toString());

    if (data.h && Array.isArray(data.h)) {
      const local = LS.get('history', []);
      const existing = new Set(local.map(r => r.id));
      data.h.forEach(r => { if (!existing.has(r.id)) local.push(r); });
      local.sort((a, b) => b.id - a.id);
      LS.set('history', local.slice(0, 50));
    }

    $('sync-status').textContent = '🎉 同步成功！';
    $('sync-area').style.display = 'none';
    $('confirm-import-btn').style.display = 'none';
    updateProgress();
  } catch (e) {
    $('sync-status').textContent = '❌ 代碼無效，請確認是否完整複製';
  }
}

/* ===== Keyboard Navigation ===== */
document.addEventListener('keydown', e => {
  if ($('exam-view').style.display === 'none') return;
  if (e.key === 'ArrowLeft') { $('prev-btn').click(); }
  if (e.key === 'ArrowRight') { $('next-btn').click(); }
  if (e.key >= '1' && e.key <= '4') {
    const btns = $('q-options').querySelectorAll('.opt-btn:not(.disabled)');
    const idx = parseInt(e.key) - 1;
    if (btns[idx]) btns[idx].click();
  }
});

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  updateProgress();
});
