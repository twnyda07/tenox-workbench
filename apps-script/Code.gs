/**
 * 十牛圖編輯協作台 — 後端存取控制
 *
 * 用法：把這段貼到你現有的 Apps Script 專案最上方，
 * 然後把你「原本的」doGet / doPost 各改名為 doGet_ / doPost_（結尾加底線）。
 * 底線結尾的函式不會被 Apps Script 當成網頁進入點，只會被下面的守衛呼叫。
 * 你原本的儲存邏輯完全不用動。
 *
 * 部署設定（重要）：
 *   執行身分 Execute as      : 我 (Me)
 *   具有存取權的使用者 Access : 任何人 (Anyone)
 *   —— 保持 Anyone，驗證改由下面的 token 負責。
 *   改成「僅限 Google 帳號」會讓瀏覽器 fetch 被導向登入頁而觸發 CORS 失敗，
 *   這就是原本程式碼要寫 redirect:'follow' 的原因。
 *
 * 設定 token（不要寫在程式碼裡）：
 *   Apps Script 編輯器 → 專案設定 → 指令碼屬性 → 新增
 *   屬性名稱 TENOX_TOKEN，值為一組長隨機字串。
 *   產生方式（本機終端機擇一）：
 *     openssl rand -base64 32
 *     python -c "import secrets;print(secrets.token_urlsafe(32))"
 */

var TOKEN_PROP = 'TENOX_TOKEN';

/** 常數時間比對，避免以回應時間逐字元試探 */
function tokenOk_(given) {
  var want = PropertiesService.getScriptProperties().getProperty(TOKEN_PROP);
  if (!want) return false;              // 未設定 token 一律拒絕，不要退回放行
  if (typeof given !== 'string') return false;
  if (given.length !== want.length) return false;
  var diff = 0;
  for (var i = 0; i < want.length; i++) {
    diff |= given.charCodeAt(i) ^ want.charCodeAt(i);
  }
  return diff === 0;
}

function deny_() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * GET 一律拒絕。
 * 讀取改走 POST，token 放在請求主體裡，才不會被寫進 Google 的存取紀錄、
 * 瀏覽器歷史、或是 Referer 標頭。
 */
function doGet(e) {
  return deny_();
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return deny_();
  }

  if (!tokenOk_(body.token)) return deny_();

  // 不要把 token 往下傳給你原本的處理函式
  delete body.token;
  e.postData.contents = JSON.stringify(body);
  e.parameter = e.parameter || {};
  e.parameter.action = body.action;

  return doPost_(e);
}
