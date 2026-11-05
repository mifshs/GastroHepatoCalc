/**
 * GastroHepato Ultra-Hardened Backend Server
 * 
 * ПОЛНЫЙ КОМПЛЕКС ЗАЩИТЫ ОТ DDOS И ВЗЛОМА (SECURITY BOUNTY HUNTER V2):
 * 1. [CRITICAL FIXED] Remote Process Crash (CWE-248): new URL() с битым заголовком Host ронял весь процесс.
 *    Исправлено: фиксированный парсер базового домена 'http://localhost' + внешний try/catch.
 * 2. [HIGH FIXED] Slowloris DoS (CWE-400): зависание сокетов при медленной отправке байтов.
 *    Исправлено: server.requestTimeout = 15s, headersTimeout = 10s, keepAliveTimeout = 5s.
 * 3. [HIGH FIXED] Race Condition / Double Response Crash (ERR_HTTP_HEADERS_SENT):
 *    Исправлено: флаг isFinished предотвращает отправку заголовков после req.destroy().
 * 4. [HIGH FIXED] ClientError Crash: server.on('clientError') корректно закрывает битые TCP-сокеты.
 * 5. [HIGH FIXED] Global Uncaught Protection: перехватчики process.on('uncaughtException')
 *    гарантируют, что ни один некорректный сокет или запрос не убьет рабочий процесс.
 * 6. [HIGH FIXED] Global Flood Shield: глобальный лимит 300 req/sec на сервер для защиты ядра.
 * 7. [HIGH FIXED] White-list статики и закрытая формула литолиза.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'gastro2026';

// Хэш пароля для безопасного сравнения
const ADMIN_PASSWORD_HASH = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();

// --- 1. ГЛОБАЛЬНЫЕ ПЕРЕХВАТЧИКИ ИСКЛЮЧЕНИЙ (Anti-Crash Shield) ---
process.on('uncaughtException', (err) => {
  console.error('[SHIELD] Перехвачена непредвиденная ошибка сокета/протокола (процесс защищен):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SHIELD] Перехвачен необработанный промис (процесс защищен):', reason);
});

// --- 2. СЕССИИ АДМИНИСТРАТОРА (КРИПТО-ТОКЕНЫ) ---
const activeAdminSessions = new Map();
const MAX_SESSIONS = 500;

function generateSessionToken() {
  if (activeAdminSessions.size >= MAX_SESSIONS) {
    const oldest = activeAdminSessions.keys().next().value;
    activeAdminSessions.delete(oldest);
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expire = Date.now() + 2 * 60 * 60 * 1000; // 2 часа
  activeAdminSessions.set(token, expire);
  return token;
}

function isValidAdminSession(token) {
  if (!token || typeof token !== 'string') return false;
  const expire = activeAdminSessions.get(token);
  if (!expire) return false;
  if (Date.now() > expire) {
    activeAdminSessions.delete(token);
    return false;
  }
  return true;
}

// --- 3. МНОГОУРОВНЕВЫЙ RATE LIMITING & DDOS SHIELD ---
const MAX_BUCKETS = 5000;
const requestBuckets = new Map();
const failedAdminAttempts = new Map();

// Глобальный счетчик всплеска запросов (защита от мгновенного флуда)
let globalRequestsInSecond = 0;
let lastSecondReset = Date.now();
const MAX_GLOBAL_RPS = 300; // максимум 300 запросов в секунду на весь сервер

function getSafeClientIp(req) {
  if (!TRUST_PROXY) {
    return req.socket.remoteAddress || '127.0.0.1';
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const parts = forwarded.split(',');
    return parts[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ipKey, maxRequests = 120, windowMs = 60000) {
  const now = Date.now();
  let bucket = requestBuckets.get(ipKey);

  if (!bucket || now > bucket.resetTime) {
    if (requestBuckets.size >= MAX_BUCKETS) {
      const firstKey = requestBuckets.keys().next().value;
      requestBuckets.delete(firstKey);
    }
    bucket = { count: 1, resetTime: now + windowMs };
    requestBuckets.set(ipKey, bucket);
    return true;
  }

  bucket.count++;
  return bucket.count <= maxRequests;
}

// Регулярная очистка памяти
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of requestBuckets.entries()) {
    if (now > b.resetTime) requestBuckets.delete(ip);
  }
  for (const [ip, l] of failedAdminAttempts.entries()) {
    if (now > l.lockedUntil) failedAdminAttempts.delete(ip);
  }
  for (const [tok, exp] of activeAdminSessions.entries()) {
    if (now > exp) activeAdminSessions.delete(tok);
  }
}, 30000);

// --- 4. ЗАКРЫТАЯ ФОРМУЛА ЛИТОЛИЗА ---
function calculateLitolizSecret(rk, homa, bsd, cirs) {
  const x = 11.06 + (-0.205 * rk) + (-0.948 * homa) + (-2.27 * bsd) + (-3.378 * cirs);
  const p = 1 / (1 + Math.exp(-x));
  const percent = Number((p * 100).toFixed(1));

  let status = '';
  let statusClass = '';
  let desc = '';

  if (p >= 0.70) {
    status = 'Высокая вероятность успеха (≥ 70%)';
    statusClass = 'status-high';
    desc = '<strong>Клиническое заключение:</strong> Высокий потенциал растворения конкрементов препаратами УДХК (доза 10–15 мг/кг/сут). Конкременты рентгеннегативные/холестериновые, сохранная функция ЖП и низкий коморбидный фон способствуют полному литолизу. Рекомендован контрольный УЗ-мониторинг через 3 и 6 месяцев.';
  } else if (p >= 0.40) {
    status = 'Умеренная вероятность (40–69%)';
    statusClass = 'status-medium';
    desc = '<strong>Клиническое заключение:</strong> Промежуточный прогноз. Возможно назначение пробного курса литолитической терапии на 3–6 месяцев. При отсутствии положительной динамики размеров конкрементов через 6 месяцев консервативную терапию следует пересмотреть.';
  } else {
    status = 'Низкая вероятность (< 40%)';
    statusClass = 'status-low';
    desc = '<strong>Клиническое заключение:</strong> Консервативный литолиз малоэффективен (высокая плотность конкрементов по КТ, крупные размеры, инсулинорезистентность или высокий балл коморбидности CIRS-G). Рекомендована консультация хирурга для решения вопроса о плановой холецистэктомии.';
  }

  return { p, percent, status, statusClass, desc };
}

// --- 5. БЕЛЫЙ СПИСОК ПУБЛИЧНЫХ ФАЙЛОВ ---
const ALLOWED_STATIC_FILES = new Set([
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/favicon.ico'
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

function serveSecureStatic(req, res, pathname) {
  const cleanPath = path.posix.normalize(pathname);

  if (!ALLOWED_STATIC_FILES.has(cleanPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403: Доступ запрещен системой безопасности.');
    return;
  }

  const fileName = cleanPath === '/' ? 'index.html' : cleanPath.slice(1);
  const filePath = path.resolve(__dirname, fileName);

  if (!filePath.startsWith(path.resolve(__dirname) + path.sep) && filePath !== path.resolve(__dirname, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403: Доступ запрещен (Path Traversal Detected).');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404: Файл не найден');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru; style-src 'self' 'unsafe-inline'; connect-src 'self' https://mc.yandex.ru; img-src 'self' data: https://mc.yandex.ru;"
    });
    res.end(content);
  });
}

// --- 6. ОСНОВНОЙ СЕРВЕР ---
const server = http.createServer((req, res) => {
  // Защита от краха при обработке всего запроса
  try {
    const now = Date.now();
    if (now - lastSecondReset > 1000) {
      globalRequestsInSecond = 0;
      lastSecondReset = now;
    }
    globalRequestsInSecond++;

    // Глобальная отсечка при мощном DDoS (> 300 запросов/сек)
    if (globalRequestsInSecond > MAX_GLOBAL_RPS) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '1' });
      res.end('503: Сервер перегружен. Защита от DDoS (Global Rate Limit).');
      return;
    }

    const ip = getSafeClientIp(req);

    // Персональный лимит клиента (120 req/min)
    if (!checkRateLimit(`global_${ip}`, 120, 60000)) {
      res.writeHead(429, { 
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': '60'
      });
      res.end(JSON.stringify({ error: 'Слишком много запросов. Подождите 1 минуту (Anti-DDoS).' }));
      return;
    }

    // БЕЗОПАСНЫЙ ПАРСИНГ URL: базовый хост строго фиксирован
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, 'http://127.0.0.1');
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400: Некорректный URL');
      return;
    }

    const pathname = parsedUrl.pathname;

    // API: Расчет формулы литолиза
    if (pathname === '/api/calc/litoliz' && req.method === 'POST') {
      if (!checkRateLimit(`calc_${ip}`, 30, 60000)) {
        res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Лимит расчетов превышен. Пожалуйста, подождите 1 минуту.' }));
        return;
      }

      let body = '';
      let isDone = false;

      req.on('data', chunk => {
        if (isDone) return;
        body += chunk;
        if (body.length > 8192) {
          isDone = true;
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
        }
      });

      req.on('end', () => {
        if (isDone) return;
        try {
          const data = JSON.parse(body);
          const rk = parseFloat(data.rk);
          const homa = parseFloat(data.homa);
          const bsd = parseInt(data.bsd, 10);
          const cirs = parseFloat(data.cirs);

          if (isNaN(rk) || isNaN(homa) || (bsd !== 0 && bsd !== 1) || isNaN(cirs) ||
              rk < 0.1 || rk > 100 || homa < 0 || homa > 100 || cirs < 0 || cirs > 56) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Некорректные параметры расчета.' }));
            return;
          }

          const result = calculateLitolizSecret(rk, homa, bsd, cirs);

          res.writeHead(200, { 
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Неверный формат JSON.' }));
        }
      });
      return;
    }

    // API: Аутентификация администратора
    if (pathname === '/api/admin/verify' && req.method === 'POST') {
      const lockInfo = failedAdminAttempts.get(ip);
      const nowTs = Date.now();

      if (lockInfo && lockInfo.lockedUntil > nowTs) {
        const waitMin = Math.ceil((lockInfo.lockedUntil - nowTs) / 60000);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ 
          error: `Доступ заблокирован из-за множественных ошибок ввода. Попробуйте через ${waitMin} мин.` 
        }));
        return;
      }

      let body = '';
      let isDone = false;

      req.on('data', chunk => {
        if (isDone) return;
        body += chunk;
        if (body.length > 1024) {
          isDone = true;
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
        }
      });

      req.on('end', () => {
        if (isDone) return;
        try {
          const { password } = JSON.parse(body);
          if (typeof password !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Некорректный пароль' }));
            return;
          }

          const inputHash = crypto.createHash('sha256').update(password).digest();
          const isMatch = crypto.timingSafeEqual(inputHash, ADMIN_PASSWORD_HASH);

          if (isMatch) {
            failedAdminAttempts.delete(ip);
            const token = generateSessionToken();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, token }));
          } else {
            const attempts = (lockInfo ? lockInfo.attempts : 0) + 1;
            const lockedUntil = attempts >= 5 ? nowTs + 15 * 60000 : 0;
            failedAdminAttempts.set(ip, { attempts, lockedUntil });

            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
              success: false, 
              error: attempts >= 5 ? 'Превышено число попыток! IP заблокирован на 15 минут.' : `Неверный пароль. Осталось попыток: ${5 - attempts}`
            }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Ошибка запроса' }));
        }
      });
      return;
    }

    // API: Проверка сессии
    if (pathname === '/api/admin/check-session' && req.method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/, '').trim();
      const valid = isValidAdminSession(token);
      res.writeHead(valid ? 200 : 401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ valid }));
      return;
    }

    // Статика
    serveSecureStatic(req, res, pathname);

  } catch (err) {
    console.error('[SERVER ERROR]:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500: Внутренняя ошибка');
    }
  }
});

// --- 7. ЗАЩИТА ОТ SLOW HTTP / SLOWLORIS DOS ---
server.requestTimeout = 15000;    // 15 сек на выполнение всего запроса
server.headersTimeout = 10000;    // 10 сек на получение заголовков
server.keepAliveTimeout = 5000;   // 5 сек на idle-соединения
server.maxHeadersCount = 50;      // Защита от переполнения памяти заголовками

// Обработка битых клиентских сокетов без падения процесса
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    socket.destroy();
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️  GastroHepato Ultra-Hardened Server (Anti-DDoS v2)`);
  console.log(`🌐 Порт: ${PORT} | Адрес: http://localhost:${PORT}`);
  console.log(`⚡ Slowloris Protection: requestTimeout 15s, headersTimeout 10s`);
  console.log(`⚡ Flood Protection: Global ${MAX_GLOBAL_RPS} RPS cap + Client Rate Limiter`);
  console.log(`🔒 Crash Shield: Unhandled Exceptions & Host Header Injection Trapped`);
  console.log(`====================================================`);
});
