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
git -C build fetch && git -C build status   # 一定要先做，見下方
python3 build_payload.py                    # 由 共用/工作流結果/ 重建 payload.json
python3 encrypt.py                          # 加密後直接寫進 build/payload.enc.js
cd build && git add -A && git commit -m "…" && git push
```

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

### ⚠️ 同步目前是壞的（2026-10-06 查核）

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
