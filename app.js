/**
 * GastroHepato Calc Engine & Analytics
 */

// --- 1. LOCAL ANALYTICS & YANDEX METRIKA INTEGRATION ---
const STATS_KEY = 'gastro_stats_v1';
const YM_KEY = 'gastro_ym_id';

function getStats() {
  const defaultStats = {
    total: 0,
    copies: 0,
    abstractClicks: 0,
    byType: {
      litoliz: 0,
      steatoz: 0,
      udca: 0,
      homa: 0,
      cirsg: 0,
      fib4: 0,
      apri: 0,
      fli: 0,
      childpugh: 0,
      meld: 0
    }
  };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? Object.assign(defaultStats, JSON.parse(raw)) : defaultStats;
  } catch (e) {
    return defaultStats;
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}

function trackCalculation(type) {
  const stats = getStats();
  stats.total += 1;
  if (stats.byType[type] !== undefined) {
    stats.byType[type] += 1;
  }
  saveStats(stats);

  // Отправка цели в Яндекс.Метрику (если подключена)
  const ymId = localStorage.getItem(YM_KEY);
  if (ymId && typeof window[`yaCounter${ymId}`] !== 'undefined') {
    window[`yaCounter${ymId}`].reachGoal(`calc_${type}`);
  } else if (typeof ym === 'function' && ymId) {
    ym(parseInt(ymId, 10), 'reachGoal', `calc_${type}`);
  }
}

function trackCopy() {
  const stats = getStats();
  stats.copies += 1;
  saveStats(stats);
  const ymId = localStorage.getItem(YM_KEY);
  if (ymId && typeof ym === 'function') ym(parseInt(ymId, 10), 'reachGoal', 'copy_record');
}

function trackAbstractClick() {
  const stats = getStats();
  stats.abstractClicks += 1;
  saveStats(stats);
  const ymId = localStorage.getItem(YM_KEY);
  if (ymId && typeof ym === 'function') ym(parseInt(ymId, 10), 'reachGoal', 'click_dissertation');
}

// Инициализация скрипта Яндекс.Метрики
function initYandexMetrika() {
  const ymId = localStorage.getItem(YM_KEY);
  if (!ymId || !/^\d+$/.test(ymId)) return;

  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

  ym(parseInt(ymId, 10), "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
  console.log(`[Yandex.Metrika] Инициализирован счетчик: ${ymId}`);
}

// --- 2. HASH ROUTER ---
const routes = ['home', 'articles', 'article', 'calcs', 'litoliz', 'steatoz', 'udca', 'homa', 'cirsg', 'fib4', 'apri', 'fli', 'childpugh', 'meld', 'admin'];

function navigateTo(route) {
  if (!routes.includes(route)) route = 'home';
  window.location.hash = `#${route}`;
  renderRoute(route);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderRoute(route) {
  document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`page-${route}`) || document.getElementById('page-home');
  if (target) target.classList.add('active');

  if (route === 'admin') {
    checkAdminAuth();
  }
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'home';
  if (hash.startsWith('home-') || hash === 'doctor-hero') {
    renderRoute('home');
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
    return;
  }
  if (hash.startsWith('article-')) {
    const articleId = hash.replace('article-', '');
    loadArticleDetail(articleId);
    renderRoute('article');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const route = routes.includes(hash) ? hash : 'home';
  renderRoute(route);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', handleHashChange);

async function checkAdminAuth() {
  const token = sessionStorage.getItem('gastro_admin_token');
  const loginBox = document.getElementById('admin-login-box');
  const contentBox = document.getElementById('admin-content-box');

  if (!token) {
    if (loginBox) loginBox.style.display = 'block';
    if (contentBox) contentBox.style.display = 'none';
    return;
  }

  try {
    const res = await fetch('/api/admin/check-session', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data.valid) {
      if (loginBox) loginBox.style.display = 'none';
      if (contentBox) contentBox.style.display = 'block';
      renderAdminStats();
    } else {
      sessionStorage.removeItem('gastro_admin_token');
      if (loginBox) loginBox.style.display = 'block';
      if (contentBox) contentBox.style.display = 'none';
    }
  } catch (e) {
    // Автономный режим
    if (token) {
      if (loginBox) loginBox.style.display = 'none';
      if (contentBox) contentBox.style.display = 'block';
      renderAdminStats();
    }
  }
}

// Toast notification
function showToast(text = 'Скопировано в буфер обмена') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// Safe clipboard copy
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast();
      trackCopy();
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast();
    trackCopy();
  } catch (e) {
    alert('Не удалось скопировать текст.');
  }
  document.body.removeChild(ta);
}

// --- 3. CALCULATORS LOGIC ---

// А) АВТОРСКИЙ КАЛЬКУЛЯТОР ЛИТОЛИЗА
let lastLitolizData = null;

function initLitolizCalc() {
  const form = document.getElementById('form-litoliz');
  if (!form) return;

  const bsdRadios = form.querySelectorAll('input[name="bsd"]');
  bsdRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      form.querySelectorAll('.radio-label').forEach(lbl => lbl.classList.remove('checked'));
      const parent = e.target.closest('.radio-label');
      if (parent) parent.classList.add('checked');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rk = parseFloat(document.getElementById('lit-rk').value);
    const homa = parseFloat(document.getElementById('lit-homa').value);
    const bsd = parseInt(form.querySelector('input[name="bsd"]:checked').value, 10);
    const cirs = parseFloat(document.getElementById('lit-cirs').value);

    if (isNaN(rk) || isNaN(homa) || isNaN(bsd) || isNaN(cirs)) {
      alert('Заполните корректно все поля.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '🔒 Защищенный расчет...';
    submitBtn.disabled = true;

    let resData = null;

    // Расчет выполняется строго на защищенном бэкенде (формула изолирована)
    try {
      const response = await fetch('/api/calc/litoliz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rk, homa, bsd, cirs })
      });

      if (response.ok) {
        resData = await response.json();
      } else if (response.status === 429) {
        alert('Защита от флуда (Anti-DDoS): слишком много расчетов. Подождите 1 минуту.');
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Ошибка при вычислении на сервере.');
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }
    } catch (err) {
      alert('🔒 Формула защищена от копирования и рассчитывается на бэкенде.\nДля расчета запустите сервер: node server.js и откройте http://localhost:3000');
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;

    const { p, percent, status, statusClass, desc } = resData;

    lastLitolizData = { rk, homa, bsd, cirs, p, percent, status };
    trackCalculation('litoliz');

    const resSec = document.getElementById('res-litoliz');
    const valEl = document.getElementById('lit-val');
    const statusEl = document.getElementById('lit-status');
    const descEl = document.getElementById('lit-desc');

    valEl.textContent = `${percent}%`;
    statusEl.className = `result-status ${statusClass}`;
    statusEl.textContent = status;

    if (p >= 0.70) {
      valEl.style.color = 'var(--success)';
    } else if (p >= 0.40) {
      valEl.style.color = 'var(--warning)';
    } else {
      valEl.style.color = 'var(--danger)';
    }

    descEl.innerHTML = desc;
    resSec.style.display = 'block';
    resSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('lit-copy')?.addEventListener('click', () => {
    if (!lastLitolizData) return;
    const d = lastLitolizData;
    const bsdTxt = d.bsd === 1 ? '≥ 100 HU (плотные/кальцинированные)' : '< 100 HU (холестериновые)';
    const text = `Оценка вероятности литолиза при ЖКБ (диссертационная модель):
- Размер конкрементов: ${d.rk} мм
- Индекс HOMA-IR: ${d.homa}
- Плотность по КТ: ${bsdTxt}
- Коморбидность CIRS-G: ${d.cirs} балла(ов)
Результат: расчётная вероятность успеха литолиза: ${d.percent}%.
Заключение: ${d.status}.`;
    copyText(text);
  });
}

// А-2) АВТОРСКИЙ КАЛЬКУЛЯТОР 2: РЕГРЕСС СТЕАТОЗА ПЕЧЕНИ
let lastSteatozData = null;

function initSteatozCalc() {
  const form = document.getElementById('form-steatoz');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const glucose = parseFloat(document.getElementById('steat-glucose').value);
    const bmi = parseFloat(document.getElementById('steat-bmi').value);
    const wc = parseFloat(document.getElementById('steat-wc').value);
    const fli = parseFloat(document.getElementById('steat-fli').value);

    if (isNaN(glucose) || isNaN(bmi) || isNaN(wc) || isNaN(fli)) {
      alert('Заполните корректно все поля.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = '🔒 Защищенный расчет...';
    submitBtn.disabled = true;

    let resData = null;

    try {
      const response = await fetch('/api/calc/steatoz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glucose, bmi, wc, fli })
      });

      if (response.ok) {
        resData = await response.json();
      } else if (response.status === 429) {
        alert('Защита от флуда (Anti-DDoS): слишком много расчетов. Подождите 1 минуту.');
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Ошибка при вычислении на сервере.');
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }
    } catch (err) {
      alert('🔒 Формула защищена от копирования и рассчитывается на бэкенде.\nДля расчета запустите сервер: node server.js и откройте http://localhost:3000');
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      return;
    }

    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;

    const { p, percent, status, statusClass, desc } = resData;

    lastSteatozData = { glucose, bmi, wc, fli, p, percent, status };
    trackCalculation('steatoz');

    const resSec = document.getElementById('res-steatoz');
    const valEl = document.getElementById('steat-val');
    const statusEl = document.getElementById('steat-status');
    const descEl = document.getElementById('steat-desc');

    valEl.textContent = `${percent}%`;
    statusEl.className = `result-status ${statusClass}`;
    statusEl.textContent = status;

    if (p > 0.50) {
      valEl.style.color = 'var(--success)';
    } else {
      valEl.style.color = 'var(--danger)';
    }

    descEl.innerHTML = desc;
    resSec.style.display = 'block';
    resSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('steat-copy')?.addEventListener('click', () => {
    if (!lastSteatozData) return;
    const d = lastSteatozData;
    const text = `Прогноз регресса стеатоза печени (диссертационная модель):
- Глюкоза натощак: ${d.glucose} ммоль/л
- ИМТ: ${d.bmi} кг/м²
- Окружность талии: ${d.wc} см
- Индекс FLI: ${d.fli} балла(ов)
Результат: расчётная вероятность регресса стеатоза: ${d.percent}%.
Заключение: ${d.status}.`;
    copyText(text);
  });
}

// Б) КАЛЬКУЛЯТОР ДОЗИРОВАНИЯ УДХК
function initUdcaCalc() {
  const form = document.getElementById('form-udca');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('udca-weight').value);
    const indication = document.getElementById('udca-indication').value;

    if (isNaN(weight) || weight < 20 || weight > 250) {
      alert('Укажите корректный вес пациента (от 20 до 250 кг).');
      return;
    }

    let minDose = 0, maxDose = 0, regime = '', desc = '';

    if (indication === 'litoliz') {
      minDose = Math.round(weight * 10);
      maxDose = Math.round(weight * 15);
      regime = 'Вся суточная доза принимается однократно вечером перед сном.';
      desc = `Для литолиза конкрементов желчного пузыря терапевтическая дозировка УДХК составляет 10–15 мг/кг/сут.`;
    } else if (indication === 'reflux') {
      minDose = 250;
      maxDose = 250;
      regime = '1 капсула (250 мг) один раз в сутки вечером перед сном.';
      desc = `При билиарном рефлюкс-гастрите стандартная доза составляет 250 мг/сут на ночь длительностью от 10-14 дней до 6 месяцев.`;
    } else { // pbc or nash
      minDose = Math.round(weight * 13);
      maxDose = Math.round(weight * 15);
      regime = 'Суточную дозу разделяют на 2–3 приема в течение дня во время еды (или однократно на ночь при хорошей переносимости).';
      desc = `При ПБХ / НАЖБП стандартная дозировка УДХК составляет 13–15 мг/кг массы тела в сутки.`;
    }

    // Расчет капсул 250 мг и 500 мг
    const caps250Min = Math.ceil(minDose / 250);
    const caps250Max = Math.ceil(maxDose / 250);
    const tabs500Min = Math.ceil(minDose / 500);
    const tabs500Max = Math.ceil(maxDose / 500);

    const capsStr = caps250Min === caps250Max ? `${caps250Min} капс.` : `${caps250Min}–${caps250Max} капс.`;
    const tabsStr = tabs500Min === tabs500Max ? `${tabs500Min} таб.` : `${tabs500Min}–${tabs500Max} таб.`;
    const doseStr = minDose === maxDose ? `${minDose} мг/сут` : `${minDose} – ${maxDose} мг/сут`;

    trackCalculation('udca');

    document.getElementById('res-udca').style.display = 'block';
    document.getElementById('udca-val').textContent = doseStr;
    document.getElementById('udca-caps').textContent = `Форма 250 мг: ${capsStr} по 250 мг | Форма 500 мг: ${tabsStr} по 500 мг`;
    document.getElementById('udca-desc').innerHTML = `<strong>Схема назначения:</strong> ${regime}<br><br>${desc}`;
  });

  document.getElementById('udca-copy')?.addEventListener('click', () => {
    const text = `Режим дозирования УДХК (урсодезоксихолевая кислота):
- Вес пациента: ${document.getElementById('udca-weight').value} кг
- Расчётная доза: ${document.getElementById('udca-val').textContent}
- Режим приема: ${document.getElementById('udca-caps').textContent}
${document.getElementById('udca-desc').innerText}`;
    copyText(text);
  });
}

// В) КАЛЬКУЛЯТОР HOMA-IR
function initHomaCalc() {
  const form = document.getElementById('form-homa');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const glucose = parseFloat(document.getElementById('homa-glucose').value);
    const insulin = parseFloat(document.getElementById('homa-insulin').value);

    if (isNaN(glucose) || isNaN(insulin) || glucose <= 0 || insulin <= 0) {
      alert('Введите положительные значения уровня глюкозы и инсулина.');
      return;
    }

    const homa = (glucose * insulin) / 22.5;
    const homaFixed = homa.toFixed(2);
    trackCalculation('homa');

    document.getElementById('res-homa').style.display = 'block';
    document.getElementById('homa-val').textContent = homaFixed;

    const statusEl = document.getElementById('homa-status');
    const descEl = document.getElementById('homa-desc');
    statusEl.className = 'result-status';

    if (homa < 2.7) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Норма (< 2.7): инсулинорезистентности нет';
      descEl.innerHTML = `<strong>Заключение:</strong> Индекс HOMA-IR находится в пределах референсных значений. Чувствительность тканей к инсулину сохранена. Благоприятный метаболический фон для проведения консервативной терапии.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Повышен (≥ 2.7): наличие инсулинорезистентности';
      descEl.innerHTML = `<strong>Заключение:</strong> Выявлена инсулинорезистентность. Нарушение углеводного и липидного обмена повышает литогенность желчи и снижает вероятность спонтанного или медикаментозного растворения конкрементов.`;
    }
  });

  // Кнопка переноса HOMA в авторский калькулятор
  document.getElementById('homa-use-in-lit')?.addEventListener('click', () => {
    const val = document.getElementById('homa-val').textContent;
    if (val && val !== '--') {
      navigateTo('litoliz');
      const litField = document.getElementById('lit-homa');
      if (litField) litField.value = val;
      showToast(`Значение HOMA-IR (${val}) перенесено в авторский калькулятор`);
    }
  });

  document.getElementById('homa-copy')?.addEventListener('click', () => {
    const text = `Индекс инсулинорезистентности HOMA-IR:
- Глюкоза натощак: ${document.getElementById('homa-glucose').value} ммоль/л
- Инсулин натощак: ${document.getElementById('homa-insulin').value} мкЕд/мл
- Значение HOMA-IR: ${document.getElementById('homa-val').textContent}
Заключение: ${document.getElementById('homa-status').textContent}.`;
    copyText(text);
  });
}

// Г) ИНТЕРАКТИВНЫЙ ОПРОСНИК CIRS-G
function initCirsgCalc() {
  const form = document.getElementById('form-cirsg');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selects = form.querySelectorAll('select.cirsg-select');
    let totalScore = 0;
    let severeCount = 0; // count of level 3 and 4

    selects.forEach(s => {
      const v = parseInt(s.value, 10);
      totalScore += v;
      if (v >= 3) severeCount += 1;
    });

    trackCalculation('cirsg');

    document.getElementById('res-cirsg').style.display = 'block';
    document.getElementById('cirsg-val').textContent = `${totalScore} б.`;

    const statusEl = document.getElementById('cirsg-status');
    const descEl = document.getElementById('cirsg-desc');
    statusEl.className = 'result-status';

    if (totalScore <= 3) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Минимальная коморбидность (0–3 балла)';
      descEl.innerHTML = `Соматический статус стабилен, тяжелая сопутствующая органная патология отсутствует. Идеальный фон для консервативных методов лечения.`;
    } else if (totalScore <= 8) {
      statusEl.classList.add('status-medium');
      statusEl.textContent = 'Умеренная коморбидность (4–8 баллов)';
      descEl.innerHTML = `Присутствуют компенсированные сопутствующие заболевания. Требуется учет лекарственных взаимодействий.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Высокая коморбидность (> 8 баллов)';
      descEl.innerHTML = `Высокая соматическая отягощенность (выявлено тяжелых поражений органов 3-4 степени: ${severeCount}). Ограничивает прогноз и требует тщательной оценки риска оперативного vs консервативного лечения.`;
    }
  });

  // Перенос CIRS-G в авторский калькулятор
  document.getElementById('cirsg-use-in-lit')?.addEventListener('click', () => {
    const rawVal = document.getElementById('cirsg-val').textContent;
    const num = parseInt(rawVal, 10);
    if (!isNaN(num)) {
      navigateTo('litoliz');
      const litField = document.getElementById('lit-cirs');
      if (litField) litField.value = num;
      showToast(`Балл CIRS-G (${num}) перенесен в калькулятор литолиза`);
    }
  });

  document.getElementById('cirsg-copy')?.addEventListener('click', () => {
    const text = `Шкала коморбидности CIRS-G:
- Суммарный балл коморбидности: ${document.getElementById('cirsg-val').textContent}
- Категория риска: ${document.getElementById('cirsg-status').textContent}`;
    copyText(text);
  });
}

// Д) ИНДЕКС FIB-4
function initFib4Calc() {
  const form = document.getElementById('form-fib4');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const age = parseFloat(document.getElementById('fib-age').value);
    const ast = parseFloat(document.getElementById('fib-ast').value);
    const alt = parseFloat(document.getElementById('fib-alt').value);
    const plt = parseFloat(document.getElementById('fib-plt').value);

    if (isNaN(age) || isNaN(ast) || isNaN(alt) || isNaN(plt) || plt <= 0 || alt <= 0) {
      alert('Заполните корректно все поля.');
      return;
    }

    // FIB-4 = (Age * AST) / (PLT * sqrt(ALT))
    const fib4 = (age * ast) / (plt * Math.sqrt(alt));
    const fib4Fixed = fib4.toFixed(2);
    trackCalculation('fib4');

    document.getElementById('res-fib4').style.display = 'block';
    document.getElementById('fib4-val').textContent = fib4Fixed;

    const statusEl = document.getElementById('fib4-status');
    const descEl = document.getElementById('fib4-desc');
    statusEl.className = 'result-status';

    if (fib4 < 1.30) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Низкий риск выраженного фиброза (< 1.30)';
      descEl.innerHTML = `Высокая прогностическая ценность исключения выраженного фиброза (вероятность F0-F1 > 90%). Рутинная биопсия или эластометрия не показаны.`;
    } else if (fib4 <= 2.67) {
      statusEl.classList.add('status-medium');
      statusEl.textContent = 'Серая зона (1.30 – 2.67)';
      descEl.innerHTML = `Промежуточный результат. Требуется проведение инструментальной верификации: транзиентная эластометрия (FibroScan) печени или дополнительные сывороточные маркеры.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Высокий риск выраженного фиброза (> 2.67)';
      descEl.innerHTML = `Высокая вероятность тяжелого фиброза печени или цирроза (F3-F4). Показана консультация гепатолога, углубленное обследование и скрининг портальной гипертензии.`;
    }
  });

  document.getElementById('fib4-copy')?.addEventListener('click', () => {
    const text = `Индекс фиброза печени FIB-4:
- Возраст: ${document.getElementById('fib-age').value} лет
- АСТ: ${document.getElementById('fib-ast').value} Ед/л, АЛТ: ${document.getElementById('fib-alt').value} Ед/л
- Тромбоциты: ${document.getElementById('fib-plt').value} × 10^9/л
Результат: FIB-4 = ${document.getElementById('fib4-val').textContent}.
Заключение: ${document.getElementById('fib4-status').textContent}.`;
    copyText(text);
  });
}

// Е) ИНДЕКС APRI
function initApriCalc() {
  const form = document.getElementById('form-apri');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ast = parseFloat(document.getElementById('apri-ast').value);
    const astUln = parseFloat(document.getElementById('apri-uln').value) || 40;
    const plt = parseFloat(document.getElementById('apri-plt').value);

    if (isNaN(ast) || isNaN(plt) || plt <= 0) {
      alert('Укажите корректные значения АСТ и тромбоцитов.');
      return;
    }

    // APRI = ((AST / AST_ULN) * 100) / PLT
    const apri = ((ast / astUln) * 100) / plt;
    const apriFixed = apri.toFixed(2);
    trackCalculation('apri');

    document.getElementById('res-apri').style.display = 'block';
    document.getElementById('apri-val').textContent = apriFixed;

    const statusEl = document.getElementById('apri-status');
    const descEl = document.getElementById('apri-desc');
    statusEl.className = 'result-status';

    if (apri < 0.5) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Низкая вероятность фиброза (< 0.5)';
      descEl.innerHTML = `Значимый фиброз маловероятен (с отрицательной прогностической ценностью > 85%).`;
    } else if (apri <= 1.5) {
      statusEl.classList.add('status-medium');
      statusEl.textContent = 'Умеренная вероятность (0.5 – 1.5)';
      descEl.innerHTML = `Промежуточные значения. Рекомендовано сопоставление с эластографией печени или индексом FIB-4.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Высокая вероятность тяжелого фиброза / цирроза (> 1.5)';
      descEl.innerHTML = `Высокая вероятность тяжелого фиброза или цирроза печени. Требуется наблюдение профильного специалиста-гепатолога.`;
    }
  });

  document.getElementById('apri-copy')?.addEventListener('click', () => {
    const text = `Индекс APRI (AST to Platelet Ratio Index):
- АСТ: ${document.getElementById('apri-ast').value} Ед/л (ВГН: ${document.getElementById('apri-uln').value} Ед/л)
- Тромбоциты: ${document.getElementById('apri-plt').value} × 10^9/л
Результат: APRI = ${document.getElementById('apri-val').textContent}.
Заключение: ${document.getElementById('apri-status').textContent}.`;
    copyText(text);
  });
}

// Ж) ИНДЕКС ЖИРОВОГО ГЕПАТОЗА FLI (FATTY LIVER INDEX)
function initFliCalc() {
  const form = document.getElementById('form-fli');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const tgMmol = parseFloat(document.getElementById('fli-tg').value);
    const ggt = parseFloat(document.getElementById('fli-ggt').value);
    const bmi = parseFloat(document.getElementById('fli-bmi').value);
    const wc = parseFloat(document.getElementById('fli-wc').value);

    if (isNaN(tgMmol) || isNaN(ggt) || isNaN(bmi) || isNaN(wc)) {
      alert('Заполните все поля индекса FLI.');
      return;
    }

    // Перевод ТГ из ммоль/л в мг/дл: 1 ммоль/л = 88.57 мг/дл
    const tgMgDl = tgMmol * 88.57;

    // y = 0.953*ln(tg) + 0.139*bmi + 0.718*ln(ggt) + 0.053*wc - 15.745
    const y = 0.953 * Math.log(tgMgDl) + 0.139 * bmi + 0.718 * Math.log(ggt) + 0.053 * wc - 15.745;
    const fli = (Math.exp(y) / (1 + Math.exp(y))) * 100;
    const fliFixed = fli.toFixed(1);
    trackCalculation('fli');

    document.getElementById('res-fli').style.display = 'block';
    document.getElementById('fli-val').textContent = fliFixed;

    const statusEl = document.getElementById('fli-status');
    const descEl = document.getElementById('fli-desc');
    statusEl.className = 'result-status';

    if (fli < 30) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Низкий риск (< 30): стеатоз исключен';
      descEl.innerHTML = `Стеатоз печени маловероятен (чувствительность правила исключения 91%).`;
    } else if (fli < 60) {
      statusEl.classList.add('status-medium');
      statusEl.textContent = 'Промежуточная зона (30–59)';
      descEl.innerHTML = `Неопределенный результат. Показано выполнение УЗИ печени для оценки эхогенности паренхимы.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Высокий риск (≥ 60): высокая вероятность стеатоза';
      descEl.innerHTML = `Высокая вероятность жирового гепатоза (стеатоза печени). Рекомендована модификация диеты, снижение массы тела и гепатопротективная терапия (в т.ч. УДХК).`;
    }
  });

  document.getElementById('fli-copy')?.addEventListener('click', () => {
    const text = `Индекс стеатоза печени FLI (Fatty Liver Index):
- Триглицериды: ${document.getElementById('fli-tg').value} ммоль/л, ГГТП: ${document.getElementById('fli-ggt').value} Ед/л
- ИМТ: ${document.getElementById('fli-bmi').value} кг/м², Окружность талии: ${document.getElementById('fli-wc').value} см
Результат: FLI = ${document.getElementById('fli-val').textContent}.
Заключение: ${document.getElementById('fli-status').textContent}.`;
    copyText(text);
  });

  // Перенос значения FLI в калькулятор регресса стеатоза
  document.getElementById('fli-use-in-steat')?.addEventListener('click', () => {
    const val = document.getElementById('fli-val').textContent;
    if (val && val !== '--') {
      navigateTo('steatoz');
      const steatField = document.getElementById('steat-fli');
      if (steatField) steatField.value = val;
      const bmiVal = document.getElementById('fli-bmi').value;
      const wcVal = document.getElementById('fli-wc').value;
      if (bmiVal) document.getElementById('steat-bmi').value = bmiVal;
      if (wcVal) document.getElementById('steat-wc').value = wcVal;
      showToast(`Параметры FLI (${val}), ИМТ и талия перенесены в модель стеатоза`);
    }
  });
}

// З) ШКАЛА CHILD-PUGH
function initChildPughCalc() {
  const form = document.getElementById('form-childpugh');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bili = parseInt(document.getElementById('cp-bili').value, 10);
    const alb = parseInt(document.getElementById('cp-alb').value, 10);
    const inr = parseInt(document.getElementById('cp-inr').value, 10);
    const ascites = parseInt(document.getElementById('cp-ascites').value, 10);
    const enceph = parseInt(document.getElementById('cp-enceph').value, 10);

    const total = bili + alb + inr + ascites + enceph;
    trackCalculation('childpugh');

    document.getElementById('res-childpugh').style.display = 'block';
    document.getElementById('cp-val').textContent = `${total} баллов`;

    const statusEl = document.getElementById('cp-status');
    const descEl = document.getElementById('cp-desc');
    statusEl.className = 'result-status';

    if (total <= 6) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Класс A (5–6 баллов): Компенсированный цирроз';
      descEl.innerHTML = `Годичная выживаемость: 100%. Двухлетняя выживаемость: ~85%. Операционный риск низкий.`;
    } else if (total <= 9) {
      statusEl.classList.add('status-medium');
      statusEl.textContent = 'Класс B (7–9 баллов): Субкомпенсированный цирроз';
      descEl.innerHTML = `Годичная выживаемость: 80%. Двухлетняя выживаемость: ~60%. Рекомендована постановка в лист ожидания трансплантации печени.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Класс C (10–15 баллов): Декомпенсированный цирроз';
      descEl.innerHTML = `Годичная выживаемость: 45%. Двухлетняя выживаемость: ~35%. Высокий периоперационный риск. Показана срочная трансплантация печени.`;
    }
  });

  document.getElementById('cp-copy')?.addEventListener('click', () => {
    const text = `Классификация тяжести цирроза Child-Pugh:
Суммарный балл: ${document.getElementById('cp-val').textContent}.
Категория: ${document.getElementById('cp-status').textContent}.`;
    copyText(text);
  });
}

// И) ШКАЛА MELD
function initMeldCalc() {
  const form = document.getElementById('form-meld');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const crUm = parseFloat(document.getElementById('meld-cr').value);
    const biliUm = parseFloat(document.getElementById('meld-bili').value);
    const inr = parseFloat(document.getElementById('meld-inr').value);

    if (isNaN(crUm) || isNaN(biliUm) || isNaN(inr)) {
      alert('Заполните все поля шкалы MELD.');
      return;
    }

    // Перевод в мг/дл: Cr (мкмоль/л / 88.4), Bili (мкмоль/л / 17.1)
    let crMg = crUm / 88.4;
    let biliMg = biliUm / 17.1;
    let inrVal = inr;

    // Границы UNOS: если значение < 1, округляется до 1.0
    if (crMg < 1.0) crMg = 1.0;
    if (crMg > 4.0) crMg = 4.0;
    if (biliMg < 1.0) biliMg = 1.0;
    if (inrVal < 1.0) inrVal = 1.0;

    // Формула: 9.57 * ln(Cr) + 3.78 * ln(Bili) + 11.20 * ln(INR) + 6.43
    const meldRaw = 9.57 * Math.log(crMg) + 3.78 * Math.log(biliMg) + 11.20 * Math.log(inrVal) + 6.43;
    const meld = Math.round(meldRaw);
    trackCalculation('meld');

    document.getElementById('res-meld').style.display = 'block';
    document.getElementById('meld-val').textContent = `${meld} баллов`;

    const statusEl = document.getElementById('meld-status');
    const descEl = document.getElementById('meld-desc');
    statusEl.className = 'result-status';

    if (meld <= 9) {
      statusEl.classList.add('status-high');
      statusEl.textContent = 'Низкий риск (MELD ≤ 9): летальность 1.9%';
      descEl.innerHTML = `Прогнозируемая 90-дневная госпитальная летальность составляет 1.9%. Пациент стабилен.`;
    } else if (meld <= 19) {
      statusEl.classList.add('status-medium');
      statusEl.textContent = 'Умеренный риск (MELD 10–19): летальность 6–19%';
      descEl.innerHTML = `Прогнозируемая 90-дневная летальность от 6% до 19%. Требуется мониторинг функции почек и гемостаза.`;
    } else {
      statusEl.classList.add('status-low');
      statusEl.textContent = 'Высокий риск (MELD ≥ 20): летальность > 50%';
      descEl.innerHTML = `Критическое состояние, 90-дневная летальность превышает 50–70%. Приоритет в листе ожидания трансплантации.`;
    }
  });

  document.getElementById('meld-copy')?.addEventListener('click', () => {
    const text = `Шкала MELD (Model for End-Stage Liver Disease):
Результат: ${document.getElementById('meld-val').textContent}.
${document.getElementById('meld-status').textContent}.`;
    copyText(text);
  });
}

// --- 4. ADMIN PANEL MANAGEMENT ---
function renderAdminStats() {
  const stats = getStats();
  const ymId = localStorage.getItem(YM_KEY) || '';

  const ymInput = document.getElementById('admin-ym-id');
  if (ymInput) ymInput.value = ymId;

  const ymStatus = document.getElementById('admin-ym-status');
  if (ymStatus) {
    if (ymId) {
      ymStatus.innerHTML = `<span style="color:var(--success); font-weight:700;">● Активен</span> (Счетчик № ${ymId})`;
    } else {
      ymStatus.innerHTML = `<span style="color:var(--text-muted);">○ Не подключен</span>`;
    }
  }

  document.getElementById('stat-total-calcs').textContent = stats.total;
  document.getElementById('stat-litoliz-calcs').textContent = stats.byType.litoliz;
  document.getElementById('stat-copies').textContent = stats.copies;
  document.getElementById('stat-abstract-clicks').textContent = stats.abstractClicks;

  // Заполнение таблицы
  const names = {
    litoliz: '⭐ Оценка вероятности литолиза (Авторский 1)',
    steatoz: '⭐ Прогноз регресса стеатоза (Авторский 2)',
    udca: 'Дозирование УДХК (мг/кг)',
    homa: 'Индекс HOMA-IR',
    cirsg: 'Опросник CIRS-G',
    fib4: 'Индекс фиброза FIB-4',
    apri: 'Индекс APRI',
    fli: 'Индекс стеатоза FLI',
    childpugh: 'Шкала Child-Pugh',
    meld: 'Шкала MELD'
  };

  const tbody = document.getElementById('admin-stats-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    for (const [key, count] of Object.entries(stats.byType)) {
      const tr = document.createElement('tr');
      const share = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
      tr.innerHTML = `
        <td><strong>${names[key] || key}</strong></td>
        <td>${count}</td>
        <td>${share}%</td>
      `;
      tbody.appendChild(tr);
    }
  }
}

function initAdminPanel() {
  const loginForm = document.getElementById('admin-login-form');
  const pwdInput = document.getElementById('admin-pwd-input');
  const loginErr = document.getElementById('admin-login-err');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = pwdInput.value;
      loginErr.textContent = '';

      try {
        const res = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (res.ok && data.success && data.token) {
          sessionStorage.setItem('gastro_admin_token', data.token);
          pwdInput.value = '';
          checkAdminAuth();
          showToast('Авторизация успешна');
        } else {
          loginErr.textContent = data.error || 'Неверный пароль';
        }
      } catch (err) {
        // Офлайн-режим
        if (password === 'gastro2026') {
          sessionStorage.setItem('gastro_admin_token', 'local_offline_token');
          pwdInput.value = '';
          checkAdminAuth();
          showToast('Авторизация успешна');
        } else {
          loginErr.textContent = 'Неверный пароль администратора.';
        }
      }
    });
  }

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('gastro_admin_token');
      checkAdminAuth();
      showToast('Вы вышли из админ-панели');
    });
  }

  const saveBtn = document.getElementById('admin-save-ym');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const val = document.getElementById('admin-ym-id').value.trim();
      if (val && !/^\d+$/.test(val)) {
        alert('Номер счетчика Яндекс.Метрики должен состоять только из цифр (например, 98765432).');
        return;
      }
      localStorage.setItem(YM_KEY, val);
      alert('Настройки Яндекс.Метрики сохранены! Обновите страницу для применения.');
      renderAdminStats();
    });
  }

  const resetBtn = document.getElementById('admin-reset-stats');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите сбросить локальную статистику расчетов?')) {
        localStorage.removeItem(STATS_KEY);
        renderAdminStats();
        showToast('Статистика сброшена');
      }
    });
  }
}

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileGlassMenu');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  if (!btn || !menu || !backdrop) return;

  function toggleMenu(forceClose = false) {
    const isOpen = forceClose ? false : !menu.classList.contains('open');
    btn.classList.toggle('open', isOpen);
    menu.classList.toggle('open', isOpen);
    backdrop.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  btn.addEventListener('click', () => toggleMenu());
  backdrop.addEventListener('click', () => toggleMenu(true));

  menu.querySelectorAll('.mobile-menu-link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(true));
  });
}

// --- 3. СЛАЙДЕР СТАТЕЙ ---
function initArticlesSlider() {
  const track = document.getElementById('articlesSliderTrack');
  const prevBtn = document.getElementById('artSliderPrev');
  const nextBtn = document.getElementById('artSliderNext');
  if (!track || !prevBtn || !nextBtn) return;

  const getCardWidth = () => {
    const card = track.querySelector('.article-card');
    return card ? card.offsetWidth + 20 : 340;
  };

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
  });

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
  });
}

// --- 4. АККОРДЕОН НАПРАВЛЕНИЙ ДЕЯТЕЛЬНОСТИ ---
function initServicesToggle() {
  const toggleBtn = document.getElementById('toggleServicesBtn');
  const textEl = document.getElementById('toggleServicesText');
  const iconEl = document.getElementById('toggleServicesIcon');
  const extraItems = document.querySelectorAll('.extra-service');
  if (!toggleBtn || !textEl || !iconEl || !extraItems.length) return;

  let isExpanded = true;

  toggleBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    extraItems.forEach(item => {
      item.style.display = isExpanded ? 'list-item' : 'none';
    });
    textEl.textContent = isExpanded ? 'Скрыть' : 'Показать всё (еще 2 направления)';
    iconEl.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}

// --- 5. АНИМАЦИИ ПОЯВЛЕНИЯ ПРИ СКРОЛЛЕ (INTERSECTION OBSERVER С КАСКАДНЫМ ЭФФЕКТОМ) ---
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal-on-scroll');
  if (!targets.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          const staggerItems = entry.target.querySelectorAll('.symptom-card, .achievement-card, .review-card, .article-card, .catalog-article-card');
          staggerItems.forEach((item, idx) => {
            item.style.setProperty('--i', idx);
          });
        } else {
          // Сбрасываем класс при выходе за пределы экрана для повторного проигрывания анимации при каждом скролле
          entry.target.classList.remove('is-revealed');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    targets.forEach(el => observer.observe(el));
  } else {
    targets.forEach(el => el.classList.add('is-revealed'));
  }
}

// --- 6. СТРАНИЦА СТАТЕЙ И ФИЛЬТРАЦИЯ ---


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initYandexMetrika();
  initMobileMenu();
  initArticlesSlider();
  initServicesToggle();
  initScrollReveal();
  initArticlesCatalog();

  // Навешиваем клик на ссылки автореферата для аналитики
  document.querySelectorAll('.track-abstract-btn').forEach(btn => {
    btn.addEventListener('click', trackAbstractClick);
  });

  // Инициализация калькуляторов
  initLitolizCalc();
  initSteatozCalc();
  initUdcaCalc();
  initHomaCalc();
  initCirsgCalc();
  initFib4Calc();
  initApriCalc();
  initFliCalc();
  initChildPughCalc();
  initMeldCalc();
  initAdminPanel();

  // Стартовый роутинг
  handleHashChange();
});


// ==================== БАЗА СТАТЕЙ И ПУБЛИКАЦИЙ (ARTICLES_DATA) ====================
const ARTICLES_DATA = [
  {
    id: 'litoliz',
    title: 'Консервативный литолиз камней желчного пузыря: когда операция не нужна?',
    category: 'ЖКБ и Литолиз',
    categoryKey: 'litoliz',
    date: '14 октября 2026',
    readTime: '5 мин чтения',
    coverGrad: 'linear-gradient(135deg, #0284c7, #075985)',
    coverIcon: '💊',
    badge: '⭐ Авторская модель №1',
    excerpt: 'Критерии отбора пациентов для медикаментозного растворения камней препаратами УДХК. Роль плотности по КТ, размера конкрементов, моторики желчного пузыря и HOMA-IR.',
    calcRoute: '#litoliz',
    calcBtnText: '🧮 Открыть калькулятор литолиза при ЖКБ',
    photos: [
      {
        title: 'УЗИ: Одиночный холестериновый конкремент 8 мм с акустической тенью',
        badge: 'УЗИ Желчного Пузыря',
        caption: 'Эхографическая картина мягкого холестеринового конкремента в просвете желчного пузыря без утолщения стенки (идеальный кандидат для консервативного литолиза).'
      },
      {
        title: 'КТ-денситометрия желчных камней (< 100 HU)',
        badge: 'Компьютерная Томография',
        caption: 'Денситометрический срез: плотность конкремента составляет 42 HU (рентген-негативный камень, отсутствие кальцификации).'
      },
      {
        title: 'Динамическое УЗИ с пробным завтраком (оценка моторики)',
        badge: 'Функциональная Проба',
        caption: 'Фракция выброса желчи составила 62% (норма > 50%), что подтверждает сохранную эвакуаторную функцию и готовность к терапии УДХК.'
      },
      {
        title: 'ROC-кривая прогностической модели литолиза (AUC = 0.918)',
        badge: 'Диссертационная Модель',
        caption: 'Многофакторная регрессионная модель Уфимцевой И.В., превосходящая традиционные эмпирические методы отбора пациентов.'
      }
    ],
    content: `
      <div class="article-lead-box">
        <p><strong>Клинический парадокс:</strong> Холецистэктомия (хирургическое удаление органа) — одна из наиболее частых операций в абдоминальной хирургии. Однако удаление пузыря не устраняет метаболическую причину литогенеза (камнеобразования) в печени и нередко приводит к развитию постхолецистэктомического синдрома. В рамках нашего диссертационного исследования доказана высокая клиническая эффективность медикаментозного растворения конкрементов при соблюдении строгих критериев доказательного протокола.</p>
      </div>

      <h2>1. Ключевые критерии отбора пациентов на консервативный литолиз</h2>
      <p>Медикаментозный литолиз препаратами урсодезоксихолевой кислоты (УДХК) показан строго при соблюдении следующих условий:</p>
      <ul class="article-styled-list">
        <li><strong>Плотность по данным КТ &lt; 100 HU:</strong> Это подтверждает преобладание мягкой холестериновой матрицы и отсутствие кальциевой «скорлупы», непроницаемой для желчных кислот.</li>
        <li><strong>Размер конкрементов до 10–12 мм:</strong> Чем меньше диаметр, тем выше отношение площади поверхности к объему и тем быстрее протекает процесс растворения.</li>
        <li><strong>Сохранная сократительная функция желчного пузыря:</strong> Фракция выброса при динамическом УЗИ с пробным завтраком должна быть не менее 50%. Пузырь обязан активно опорожняться.</li>
        <li><strong>Проходимость пузырного и общего желчного протоков:</strong> Отсутствие холедохолитиаза, стриктур и механического блока билиарного тракта.</li>
      </ul>

      <h2>2. Роль метаболического статуса и инсулинорезистентности</h2>
      <p>В ходе исследования установлена сильная статистическая корреляция между базальной гиперинсулинемией (индекс HOMA-IR) и литогенным индексом желчи. При высоком HOMA-IR печень гиперсекретирует неэстерифицированный холестерин, что замедляет растворение камней даже на фоне высоких доз УДХК. Именно поэтому наша математическая модель включает индекс HOMA-IR и оценку коморбидности по CIRS-G.</p>

      <h2>3. Протокол фармакотерапии и мониторинга</h2>
      <p>Стандартная дозировка УДХК составляет 10–15 мг/кг массы тела строго однократно на ночь (в период физиологического покоя билиарного тракта и максимального насыщения желчи холестерином). Контрольное УЗИ проводится каждые 3 месяца для оценки динамики уменьшения объема конкрементов.</p>
    `
  },
  {
    id: 'steatoz',
    title: 'Жировой гепатоз печени: от скрытого стеатоза к полному регрессу',
    category: 'Стеатоз печени',
    categoryKey: 'steatoz',
    date: '28 сентября 2026',
    readTime: '6 мин чтения',
    coverGrad: 'linear-gradient(135deg, #0d9488, #115e59)',
    coverIcon: '🔬',
    badge: '⭐ Авторская модель №2',
    excerpt: 'Как прогнозировать обратное развитие стеатоза печени по авторской диссертационной модели, учитывающей гликемию натощак, ИМТ, окружность талии и индекс FLI.',
    calcRoute: '#steatoz',
    calcBtnText: '🧮 Открыть калькулятор прогноза регресса стеатоза',
    photos: [
      {
        title: 'Ультразвуковая эластометрия с функцией CAP (Стеатометрия)',
        badge: 'Стеатометрия CAP',
        caption: 'Измерение коэффициента контролируемого затухания ультразвука: параметр CAP 310 дБ/м (выраженный стеатоз S3).'
      },
      {
        title: 'Морфологическая схема: Накопление липидных капель в гепатоците',
        badge: 'Гистологический Разбор',
        caption: 'Сравнение нормального гепатоцита и клетки при жировой дистрофии с оттеснением ядра к периферии.'
      },
      {
        title: 'Динамика снижения трансаминаз (АЛТ/АСТ) на фоне курса УДХК',
        badge: 'Лабораторный Мониторинг',
        caption: 'Снижение уровня ферментов цитолиза на 48% через 12 недель комплексной доказательной терапии.'
      },
      {
        title: 'ROC-кривая модели прогноза регресса (AUC = 0.827)',
        badge: 'Диссертационная Модель №2',
        caption: 'Валидированная прогностическая модель Уфимцевой И.В. (чувствительность 92.6%, специфичность 73.3%).'
      }
    ],
    content: `
      <div class="article-lead-box">
        <p><strong>Бессимптомный убийца:</strong> Неалкогольная жировая болезнь печени (НАЖБП / МАСЖБ) выявляется более чем у 30% взрослого населения. Опасность жирового гепатоза кроется в его полном бессимптомном течении вплоть до стадии выраженного стеатогепатита и фиброза печени. Однако на ранних этапах стеатоз полностью обратим при грамотной тактике.</p>
      </div>

      <h2>1. Что определяет вероятность регресса жирового гепатоза?</h2>
      <p>В рамках нашего диссертационного исследования были исследованы десятки биохимических и антропометрических параметров. Методом многофакторного логистического анализа доказано, что ключевыми независимыми предикторами регресса являются:</p>
      <ul class="article-styled-list">
        <li><strong>Уровень глюкозы плазмы натощак:</strong> Нормализация гликемии устраняет липотоксическое воздействие свободных жирных кислот на эндоплазматический ретикулум печеночных клеток.</li>
        <li><strong>Окружность талии и ИМТ:</strong> Висцеральное абдоминальное ожирение — главный драйвер постоянного притока триглицеридов в портальный кровоток.</li>
        <li><strong>Индекс FLI (Fatty Liver Index):</strong> Комплексный интегральный маркер, объединяющий триглицериды, ГГТП, талию и ИМТ.</li>
      </ul>

      <h2>2. Пошаговая стратегия терапии</h2>
      <p>Доказанный протокол регресса включает модификацию образа жизни (снижение калоража с ограничением фруктозы и простых углеводов), регулярную аэробную физическую активность (не менее 150 мин в неделю) и фармакотерапию препаратами урсодезоксихолевой кислоты (УДХК) в дозе 13–15 мг/кг в сутки для мембраностабилизирующего и антиапоптотического эффекта на гепатоциты.</p>
    `
  },
  {
    id: 'homa',
    title: 'Инсулинорезистентность и индекс HOMA-IR: невидимый фактор камнеобразования',
    category: 'Инсулинорезистентность',
    categoryKey: 'homa',
    date: '05 сентября 2026',
    readTime: '4 мин чтения',
    coverGrad: 'linear-gradient(135deg, #6366f1, #4338ca)',
    coverIcon: '🧬',
    badge: 'Клинический маркер',
    excerpt: 'Почему повышенный базальный инсулин меняет биохимический состав желчи и ускоряет образование холестериновых кристаллов в желчном пузыре.',
    calcRoute: '#homa',
    calcBtnText: '🧮 Рассчитать индекс HOMA-IR онлайн',
    photos: [
      {
        title: 'Биохимическая схема регуляции печеночного синтеза холестерина',
        badge: 'Патогенез',
        caption: 'Активация фермента HMG-CoA редуктазы под действием гиперинсулинемии приводит к избыточной секреции холестерина в желчь.'
      },
      {
        title: 'Лабораторные референсы HOMA-IR: Норма vs Инсулинорезистентность',
        badge: 'Референсные Значения',
        caption: 'Значения HOMA-IR выше 2.7 свидетельствуют о выраженной тканевой инсулинорезистентности.'
      },
      {
        title: 'Микроскопия желчи: Преципитация кристаллов моногидрата холестерина',
        badge: 'Микроскопия Желчи',
        caption: 'Образование первичных микролитов при перенасыщении желчи холестерином (билиарный сладж).'
      }
    ],
    content: `
      <div class="article-lead-box">
        <p>Многие пациенты удивляются, когда врач-гастроэнтеролог при камнях в желчном пузыре направляет их на исследование глюкозы и инсулина крови. Однако современная гастроэнтерология доказала: желчный пузырь — это орган-мишень метаболического синдрома.</p>
      </div>

      <h2>1. Механизм влияния инсулина на желчеобразование</h2>
      <p>Инсулин — ключевой гормон регуляции липидного обмена в печени. При формировании периферической резистентности тканей поджелудочная железа компенсаторно вырабатывает избыточное количество инсулина (гиперинсулинемия). Это запускает три патологических каскада:</p>
      <ul class="article-styled-list">
        <li>Стимуляция печеночной ГМГ-КоА-редуктазы с лавинообразным ростом синтеза холестерина.</li>
        <li>Подавление фермента холестерин-7-альфа-гидроксилазы, снижающее конверсию холестерина в защитные желчные кислоты.</li>
        <li>Нарушение нервно-мышечной чувствительности стенки желчного пузыря к холецистокинину (гипотония пузыря и застой).</li>
      </ul>

      <h2>2. Интерпретация показателя HOMA-IR</h2>
      <p>Формула расчета: <code>HOMA-IR = (Глюкоза натощак × Инсулин натощак) / 22.5</code>. Значение &lt; 2.0 считается физиологической нормой. Превышение порога 2.7 требует обязательной нутрициологической и терапевтической коррекции для успешного лечения заболеваний ЖКТ.</p>
    `
  },
  {
    id: 'bowel',
    title: 'Вздутие, боли и нарушение стула: как отличить СРК от воспаления кишечника',
    category: 'Кишечник и СРК',
    categoryKey: 'bowel',
    date: '18 августа 2026',
    readTime: '5 мин чтения',
    coverGrad: 'linear-gradient(135deg, #f59e0b, #b45309)',
    coverIcon: '🩺',
    badge: 'Дифференциальная диагностика',
    excerpt: 'Пошаговый алгоритм дифференциальной диагностики синдрома раздраженного кишечника (Римские критерии IV), исключение органической патологии и диета Low-FODMAP.',
    calcRoute: 'https://www.lotos74.ru/specialists/ufimtseva-irina-vladimirovna/',
    calcBtnText: '🗓️ Записаться на прием к гастроэнтерологу в МЦ «Лотос»',
    photos: [
      {
        title: 'Алгоритм Римских критериев IV поколения для СРК',
        badge: 'Клинический Алгоритм',
        caption: 'Рецидивирующая боль в животе по крайней мере 1 раз в неделю за последние 3 месяца, ассоциированная с дефекацией.'
      },
      {
        title: 'Уровень фекального кальпротектина: СРК vs ВЗК',
        badge: 'Лабораторный Маркер',
        caption: 'Кальпротектин &lt; 50 мкг/г подтверждает функциональный генез (СРК) и исключает язвенный колит и болезнь Крона.'
      },
      {
        title: 'Пирамида элиминационного протокола питания Low-FODMAP',
        badge: 'Диетотерапия',
        caption: 'Временное исключение ферментируемых олиго-, ди-, моносахаридов и полиолов для купирования метеоризма и вздутия.'
      }
    ],
    content: `
      <div class="article-lead-box">
        <p>Хроническое вздутие живота (метеоризм), спазмы и нерегулярный стул — одна из самых частых причин обращения к гастроэнтерологу. Главная задача клинициста на первом этапе — не перепутать функциональный СРК с тяжелыми органическими заболеваниями ЖКТ.</p>
      </div>

      <h2>1. Симптомы «красных флагов» (требуют срочной эндоскопии)</h2>
      <p>Функциональный синдром раздраженного кишечника никогда не сопровождается следующими признаками:</p>
      <ul class="article-styled-list">
        <li>Появление болей или позывов на дефекацию в ночные часы (функциональная боль никогда не будит спящего человека).</li>
        <li>Появление видимой крови в стуле или положительный тест на скрытую кровь.</li>
        <li>Необъяснимая потеря веса, анемия (снижение гемоглобина и ферритина), лихорадка.</li>
        <li>Повышение уровня СОЭ, С-реактивного белка и фекального кальпротектина &gt; 150–200 мкг/г.</li>
        <li>Впервые возникшие симптомы у пациентов старше 50 лет.</li>
      </ul>

      <h2>2. Доказательные подходы к терапии СРК</h2>
      <p>При подтвержденном функциональном характере расстройства терапия строится на нормализации оси «мозг–кишечник», селективных миотропных спазмолитиках (мебеверин, отилония бромид), таргетных пробиотиках и временном переходе на протокол Low-FODMAP под контролем врача.</p>
    `
  },
  {
    id: 'udca',
    title: 'Правильный расчет суточной дозы УДХК: частые ошибки при терапии',
    category: 'Фармакотерапия',
    categoryKey: 'pharma',
    date: '02 августа 2026',
    readTime: '4 мин чтения',
    coverGrad: 'linear-gradient(135deg, #0284c7, #0369a1)',
    coverIcon: '⚖️',
    badge: 'Клиническая фармакология',
    excerpt: 'Почему не работает назначение «1 капсула на ночь» и как правильно рассчитывать терапевтическую дозу урсодезоксихолевой кислоты по весу пациента.',
    calcRoute: '#udca',
    calcBtnText: '🧮 Рассчитать точную дозу УДХК в калькуляторе',
    photos: [
      {
        title: 'График зависимости насыщения желчи УДХК от дозировки (мг/кг/сут)',
        badge: 'Фармакокинетика',
        caption: 'Терапевтическая концентрация УДХК в пуле желчных кислот (> 60%) достигается только при дозе не менее 10–12 мг/кг.'
      },
      {
        title: 'Схема приема препарата в зависимости от клинической нозологии',
        badge: 'Протокол Приема',
        caption: 'При ЖКБ — вся доза однократно перед сном; при билиарном рефлюксе и холестазе — дробный прием во время еды.'
      }
    ],
    content: `
      <div class="article-lead-box">
        <p>Урсодезоксихолевая кислота (УДХК) — эталонный препарат гепато- и холелитолитического действия. Однако в амбулаторной практике мы регулярно сталкиваемся с ситуацией, когда препарат «не помог» только из-за грубых ошибок в дозировании.</p>
      </div>

      <h2>1. Главная ошибка: фиксированная низкая доза</h2>
      <p>Назначение 1–2 капсул (250–500 мг) взрослому пациенту с массой тела 80–90 кг создает субтерапевтическую концентрацию. Для надежного литолиза и гепатопротекции необходима доза строго <strong>10–15 мг на каждый килограмм массы тела</strong>. Пациент весом 85 кг должен получать не менее 1000–1250 мг в сутки (4–5 капсул по 250 мг).</p>

      <h2>2. Время приема: почему именно на ночь?</h2>
      <p>При желчнокаменной болезни всю суточную дозу необходимо принимать однократно перед сном. Ночью, в условиях длительного перерыва между приемами пищи, желчный пузырь не сокращается, и концентрация холестерина достигает максимума. Именно в эти часы высокая концентрация УДХК создает эффект обратного растворения холестериновых кристаллов.</p>
    `
  },
  {
    id: 'gastritis',
    title: 'Хронический гастрит и Helicobacter pylori: современные стандарты эрадикации',
    category: 'Заболевания желудка',
    categoryKey: 'pharma',
    date: '15 июля 2026',
    readTime: '5 мин чтения',
    coverGrad: 'linear-gradient(135deg, #ec4899, #be185d)',
    coverIcon: '🔬',
    badge: 'Гастроэнтерология',
    excerpt: 'Критерии диагностики хеликобактерной инфекции, показания к антибактериальной терапии первой линии и предотвращение атрофии слизистой оболочки.',
    calcRoute: 'https://www.lotos74.ru/specialists/ufimtseva-irina-vladimirovna/',
    calcBtnText: '🗓️ Записаться на прием к гастроэнтерологу в МЦ «Лотос»',
    photos: [
      {
        title: 'Эндоскопия желудка в узкоспектральном режиме NBI',
        badge: 'NBI-Эндоскопия',
        caption: 'Визуализация архитектоники микрососудистого русла слизистой оболочки антрального отдела желудка при хеликобактерном гастрите.'
      },
      {
        title: 'Схема Маастрихт-VI: Квадротерапия первой линии с препаратами висмута',
        badge: 'Протокол Эрадикации',
        caption: '14-дневный протокол: ИПП + висмута трикалия дицитрат + амоксициллин + кларитромицин (или метронидазол).'
      }
    ],
    content: `
      <div class="article-lead-box">
        <p>Бактерия <em>Helicobacter pylori</em> — основной этиологический фактор хронического активного гастрита, язвенной болезни желудка и двенадцатиперстной кишки, а также доказанный канцероген I класса. Своевременная эрадикация предотвращает каскад Корреа (атрофия → метаплазия → дисплазия).</p>
      </div>

      <h2>1. Достоверная диагностика перед лечением</h2>
      <p>Для назначения антибактериальной терапии требуется точное подтверждение активной инфекции. Золотой стандарт неинвазивной диагностики — 13С-уреазный дыхательный тест или определение антигена H. pylori в кале методом ИФА (моноклональные антитела). За 2 недели до исследования обязательно отменяются препараты ИПП.</p>

      <h2>2. Современные клинические рекомендации Маастрихт-VI</h2>
      <p>В связи с ростом резистентности к антибиотикам продолжительность эрадикационной терапии увеличена до строгих 14 дней. Стандартом первой линии в регионах с высокой резистентностью является классическая квадротерапия с препаратами висмута, обеспечивающая частоту эрадикации свыше 90%.</p>
    `
  }
];

// РЕНДЕРИНГ КАТАЛОГА СТАТЕЙ
function renderArticlesCatalog() {
  const container = document.getElementById('articlesCatalogGrid');
  if (!container) return;

  container.innerHTML = ARTICLES_DATA.map((art, idx) => `
    <article class="catalog-article-card" data-category="${art.categoryKey}">
      <div class="catalog-article-cover" style="background: ${art.coverGrad};">
        <div class="catalog-cover-icon">${art.coverIcon}</div>
        <span class="catalog-cat-badge">${art.category}</span>
        ${art.badge ? `<span class="catalog-special-badge">${art.badge}</span>` : ''}
      </div>
      <div class="catalog-article-body">
        <div class="catalog-meta-row">
          <span>${art.date}</span>
          <span>•</span>
          <span>⏱ ${art.readTime}</span>
        </div>
        <h3 class="catalog-article-title">${art.title}</h3>
        <p class="catalog-article-excerpt">${art.excerpt}</p>
        <div class="catalog-article-footer">
          <a href="#article-${art.id}" class="btn-read-article">
            <span>Читать статью (с фото)</span> →
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

// ЗАГРУЗКА И ОТОБРАЖЕНИЕ КОНКРЕТНОЙ СТАТЬИ
function loadArticleDetail(articleId) {
  const container = document.getElementById('articleReaderContainer');
  const crumbTitle = document.getElementById('article-detail-crumb');
  if (!container) return;

  const article = ARTICLES_DATA.find(a => a.id === articleId) || ARTICLES_DATA[0];

  if (crumbTitle) {
    crumbTitle.textContent = article.title;
  }

  // Генерация галереи фото
  const galleryHtml = article.photos && article.photos.length ? `
    <div class="article-photos-section">
      <div class="photos-section-header">
        <span class="photos-kicker">КЛИНИЧЕСКИЙ ФОТОМАТЕРИАЛ & СХЕМЫ</span>
        <h3>Иллюстрации, диагностические снимки и схемы к исследованию</h3>
      </div>
      <div class="article-gallery-grid">
        ${article.photos.map((photo, pIdx) => `
          <div class="article-photo-card">
            <div class="article-photo-preview" style="background: ${article.coverGrad};">
              <div class="photo-icon-overlay">${article.coverIcon}</div>
              <span class="photo-badge">${photo.badge || 'Фото ' + (pIdx + 1)}</span>
              <div class="photo-title-overlay">${photo.title}</div>
            </div>
            <div class="article-photo-caption">
              <strong>Рис. ${pIdx + 1}:</strong> ${photo.caption}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Другие статьи для блока "Читайте также"
  const otherArticles = ARTICLES_DATA.filter(a => a.id !== article.id).slice(0, 3);
  const otherHtml = `
    <div class="article-read-also-section">
      <h3>Читайте также в библиотеке врача:</h3>
      <div class="read-also-grid">
        ${otherArticles.map(oa => `
          <a href="#article-${oa.id}" class="read-also-card">
            <div class="read-also-icon" style="background: ${oa.coverGrad};">${oa.coverIcon}</div>
            <div>
              <div class="read-also-category">${oa.category}</div>
              <div class="read-also-title">${oa.title}</div>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="article-reader-header">
      <a href="#articles" class="btn-back-to-articles">← Назад ко всем статьям</a>
      <div class="article-meta-chips">
        <span class="article-chip-cat">${article.category}</span>
        <span class="article-chip-date">${article.date}</span>
        <span class="article-chip-time">⏱ ${article.readTime}</span>
      </div>
      <h1 class="article-reader-title">${article.title}</h1>
      <div class="article-author-card">
        <div class="author-avatar-stub">⚕</div>
        <div class="author-info-text">
          <div class="author-name">Уфимцева Ирина Владимировна</div>
          <div class="author-title">Врач-гастроэнтеролог высшей категории • Кандидат медицинских наук • МЦ «Лотос»</div>
        </div>
      </div>
    </div>

    <!-- ТЕЛО СТАТЬИ -->
    <div class="article-body-content">
      ${article.content}
    </div>

    <!-- ГАЛЕРЕЯ МЕДИЦИНСКИХ ФОТО И СХЕМ -->
    ${galleryHtml}

    <!-- БЛОК ПЕРЕХОДА В КАЛЬКУЛЯТОР ИЛИ НА ЗАПИСЬ -->
    <div class="article-action-box">
      <div class="action-box-content">
        <div class="action-box-kicker">ПРАКТИЧЕСКОЕ ПРИМЕНЕНИЕ</div>
        <h3>Примените методику на практике</h3>
        <p>Используйте валидированные клинические калькуляторы или запишитесь на очную консультацию к врачу-гастроэнтерологу Уфимцевой И.В. в МЦ «Лотос».</p>
        <div class="action-box-btns">
          ${article.calcRoute.startsWith('http') 
            ? `<a href="${article.calcRoute}" target="_blank" class="btn-action-primary">${article.calcBtnText}</a>`
            : `<a href="${article.calcRoute}" class="btn-action-primary">${article.calcBtnText}</a>`
          }
          <a href="https://www.lotos74.ru/specialists/ufimtseva-irina-vladimirovna/" target="_blank" class="btn-action-outline">
            🗓️ Записаться на прием в МЦ «Лотос»
          </a>
        </div>
      </div>
    </div>

    <!-- ЧИТАЙТЕ ТАКЖЕ -->
    ${otherHtml}
  `;
}

// ИНИЦИАЛИЗАЦИЯ СТАТЕЙ И ФИЛЬТРОВ
function initArticlesCatalog() {
  renderArticlesCatalog();

  const filterBtns = document.querySelectorAll('.article-filter-btn');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      const cards = document.querySelectorAll('.catalog-article-card');
      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.animation = 'springCardIn 0.45s cubic-bezier(0.34, 1.25, 0.64, 1) both';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}
