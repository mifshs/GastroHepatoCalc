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
const routes = ['home', 'litoliz', 'steatoz', 'udca', 'homa', 'cirsg', 'fib4', 'apri', 'fli', 'childpugh', 'meld', 'admin'];

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

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '') || 'home';
  renderRoute(hash);
});

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

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initYandexMetrika();
  initMobileMenu();

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
  const initialHash = window.location.hash.replace('#', '') || 'home';
  renderRoute(initialHash);
});
