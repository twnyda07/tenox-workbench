# 給 Claude 的專案須知

十牛圖修行指南　編輯協作台。以下是跨 session 都適用的約定，請先讀完再動手。

## Google 帳號

本專案**固定使用寶嚴的共用 Google 帳號**，不論在哪一台電腦上操作
（kinds 的電腦、venjianhui 的電腦，都是同一個帳號）。

帳號位址寫在 Drive 的「00_總索引_這個專案的東西放在哪裡」文件裡，
不寫在這個 repo，因為 repo 一度是公開的。

需要用到 Google 帳號的場合：Drive 的素材與報告、Apps Script 後端、
以及協作台的裁示資料庫試算表。三者都掛在同一個帳號下。

**不要**為了方便而改用其他帳號或建立第二個帳號。素材、後端、裁示紀錄
一旦分散到不同帳號，權限會開始打架，而且事後很難追回誰改了什麼。

## 東西放在哪裡

| 類別 | 位置 |
|---|---|
| 程式與工具 | 這個 repo |
| 原始素材、產出報告 | Google Drive「十牛圖彙編_2026增補版」 |
| 212 項裁示紀錄 | Google 試算表「十牛圖編輯協作台後端」 |

一條原則：**同一份內容不要同時存在兩個地方。** 使用者有兩台電腦，
檔案不同步正是他最初要解決的問題。

## 改這個網站的流程

網站檔（`index.html`、`config.js`、`payload.enc.js`、`token.html`、`分析報告.html`）
**只有這個 repo 裡這一份**。repo 的上一層 `協作版/` 只放產生器，不放網站檔的副本。

```bash
cd ~/十牛圖出版/協作版
python3 build_payload.py     # 由 共用/工作流結果/ 重建 payload.json
python3 encrypt.py           # 加密後直接寫進 build/payload.enc.js
./發佈.sh "commit 訊息"       # 先 fetch 擋住落後、蓋版本戳、commit、push、等 Pages 生效
```

**用 `發佈.sh`，不要自己 commit push。** 它做兩件手動容易漏的事：
落後遠端時直接擋下來，以及蓋版本戳。

版本戳是 `<meta name="build">`，給前端的 `checkUpdate()` 用。
GitHub Pages 的 HTML `cache-control: max-age=600`，瀏覽器自己還會再留一份，
不蓋戳的話改好的東西對方要硬重新整理才看得到——2026-10-06 就發生過，
使用者在另一台打開協作台，新加的匯出鈕完全看不到。
現在版本一變，頁面底部會出現「協作台有新版本，點這裡更新」。

**動手前一定要先 `git fetch`。** 不只一個 session 在推這個 repo，而且是跨電腦的。
2026-10-06 就發生過：上層 `協作版/` 停在三天前的版本，照舊流程 `cp index.html build/`
差一步把另一個 session 推上去的後端 token 驗證整個洗掉。當時是靠 `git push` 被 reject
才發現。後來把上層的副本全部刪掉，就是為了讓這件事不可能再發生——
**不要為了方便又在上層放一份 index.html。**

同樣的道理，Apps Script 程式碼也只留 `apps-script/` 這一份。
`clasp` 設定（含 scriptId）在 repo 外的 `協作版/gas/.clasp.json`，`rootDir` 指向這裡。
曾經上層另有一份舊版 `Code.js`（沒有 token 驗證），誰用它 `clasp push` 就會把
token 驗證推掉，已經刪除。

## 後端

裁示同步需要 token，token 由協作台密碼派生（PBKDF2，salt
`tenox-backend-v1`，迭代 600k），存在 Apps Script 的指令碼屬性
`TENOX_TOKEN`，不進版控。

細節見 `設定指南.md`。改動後端前先讀那份文件，特別是「重新部署」那一節
——必須「新增部署作業」而非「編輯」。

**未經使用者明確授權，不要對後端發出任何寫入請求。**

### 根因（2026-10-08 查到，之前的推測都不完整）

**一、專案和試算表都被丟進垃圾桶了。**
Apps Script 專案開啟時顯示「專案在垃圾桶中」，試算表顯示「將於 30 天後永久刪除」。
兩個已於 2026-10-08 移出垃圾桶。**這才是後端失效的真正原因，不是設定沒做。**
誰丟的不明。下次後端整個不動時，第一件事是確認它還在不在垃圾桶。

**二、`doGet` 的 list 讀錯分頁。**
試算表有「工作表1」和「裁示」兩個分頁，資料寫在「裁示」，
但 `?action=list` 不論試算表裡有沒有資料都回 `{"ok":true,"data":{},"count":0}`。
已實測：先用 POST 寫入 3 筆（寫進得去，試算表看得到），再打 list 仍回 0。
**改後端時要一併修這個讀取分頁的錯。**

這兩件加起來，才是舊版前端 `STATE=j.data||{}` 會清空本機裁示的完整因果。

**待清理**：試算表「裁示」分頁裡有 3 筆測試資料（`ac1-1`／`ac1-2`／`ac1-3`，
註記「測試理由」、裁示人「未具名」，時間 2026-10-07T14:48），
是在 localhost 測試架構審核時誤打到線上 API 的。用 POST `action=del` 清不掉
（舊部署對 POST 回 HTML），**改好後端後記得手動刪這 3 列**。

### 現況（2026-10-08 設定完成）

**已完成**：守衛程式上線、`TENOX_TOKEN` 已設、新部署（網頁應用程式／執行身分我／
所有人）、舊部署已封存、`config.js` 指向新網址。

| 動作 | 狀態 |
|---|---|
| `GET` | 回 `unauthorized` ✅ 守衛生效 |
| `POST set` / `POST del` | 回 `{ok:true}` ✅ 裁示進得了試算表 |
| `POST list` | 回 `{"ok":false,"err":"bad request"}` ❌ |

**list 為什麼壞**：原本的架構是 `doGet` 負責讀、`doPost` 負責寫（只認得 `set`／`del`）。
前端後來改成全部走 POST，於是 `list` 被送進 `doPost_`，它不認得。
**修法**：在守衛的 `doPost` 裡，`body.action === 'list'` 時改呼叫 `doGet_(e)`。
一行就好，但見下方的坑。

> ⚠️ **Apps Script 編輯器在瀏覽器自動化下改不動。**
> 2026-10-08 實測：`Cmd+Option+F` 開不了取代框、`computer type` 連單一字元都進不去、
> `Cmd+C`／`Cmd+V` 複製貼上無效、`Page.captureScreenshot` 一律逾時。
> Monaco 的 `pushEditOperations` 雖然改得動畫面，但 **Apps Script 不會把它認定為變更，
> `Cmd+S` 存不進去**（重載後復原）。唯一成功過一次的是剛連上瀏覽器時的取代框操作，
> 之後再也無法重現。**要改這份程式碼，請人工開編輯器改，或等 clasp 憑證重新授權。**

**在 list 修好之前怎麼辦**：`build_payload.py` 會直接用 rclone 抓
`gdrive:十牛圖編輯協作台後端.xlsx`，把「裁示」分頁烘進 `payload.seed`，
前端載入時併入本機沒有的項目（本機優先）。所以**兩台的裁示會在每次發佈時互相看到**，
只是不即時。list 修好後可以把這一段拿掉。

> 解析 xlsx 的坑：抓儲存格時不要把 `t` 屬性寫進同一個正則的可選群組
> （`<c[^>]*?(?: t="(\w+)")?[^>]*>`）——非貪婪會先配到空的 `t`，再讓 `[^>]*` 吃掉 `t="s"`，
> 結果 sharedStrings 的索引被當成字面值，整張表讀出來是 `0,1,2…`。要分開抓屬性與內容。

### ⚠️ 以下是 2026-10-06 的查核紀錄（部分已過時，保留供追溯）

`設定指南.md` 那幾步**還沒有執行**，後端停在舊版：

- `GET ?action=list` 可通，但回 `{"ok":true,"data":{},"count":0}`——**後端一筆裁示都沒有**
- `POST`（前端現在用的方式，帶 token）回的是 Google 登入頁 HTML，不是 JSON
- 結果：協作台右上角顯示「認證失敗」，`push()` 的 fetch 一律失敗

前端的 `push()` 是**先存 localStorage 再打後端**，所以裁示沒有遺失，
但**只存在當初按下去的那一台電腦的那一個瀏覽器裡**，換電腦就看不到。
2026-10-06 使用者在 venjianhui 那台裁示了近一半，kinds 這台完全看不到，就是這個原因。

在後端修好之前，跨電腦搬運裁示要用「待裁示」分頁上的
**匯出這台的裁示 / 匯入裁示檔**（純前端，不碰後端）。
匯出的 JSON 長這樣，`state` 就是 localStorage 的 `tenox_state`：

```json
{"kind":"tenox-decisions","who":"…","savedAt":"…","count":N,"state":{"f0":{…},"a1":{…}}}
```

**提醒使用者：清瀏覽器快取會讓這些裁示永久消失。** 修好後端之前先匯出一份留底。

## 加密內容

`payload.enc.js` 是 AES-GCM 加密的正文（388 節骨架、295 則公案總帳、
662 則人物事例、212 項待裁示）。沒有密碼讀不到明文，這是刻意的。

需要分析內容時，使用 `分析報告.html` —— 它在使用者自己的瀏覽器裡解密，
密碼不會離開他的機器。**不要要求使用者把密碼貼進對話**，那會留在
transcript 裡。

## 資料結構備忘

容易踩到的一點：**人物事例掛在每一冊底下的 `v.people`**，不是頂層欄位。
曾經因此整段漏掉 662 則。

- `P.vols[]` → `{n, stage, thesis, methods[], chapters[], unplaced[], gaps, people[]}`
- `chapters[]` → `{num, title, sections[]}`
- `sections[]` → `{t, thin, m[]}`，`m[]` 是素材，`thin` 標記素材不足
- `P.ledger` → `{rows[], stats{}}`
- `P.decisions[]` → `{id, kind, title, ctx, opts[], rec, vol}`
