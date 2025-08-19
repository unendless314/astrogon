# Lightboard（臨時筆記看板）AI 使用SOP

適用對象：在專案中以「臨時筆記／工作記錄」方式使用的 AI 協作者（2–3 位）。
目標：零依賴、單檔看板、可於新專案直接攜帶，最少學習成本即可安全協作。

---

## 核心原則
- 單一資料來源：只使用模組目錄內的 `kanban/docs/BOARD.md`（分區：`TODO | BLOCKED | DONE`）。
- 一律用 CLI 操作：請勿手改 `BOARD.md`，避免格式與競態問題。
- 輕量最優先：不做自動重試與重度流程控管；保持易攜、易替換。
- 可追溯：Commit/PR 需引用 `board:<id>`，DONE 可附 `(pr|commit|spec|prd)` 連結。

## 快速上手
1) 安裝需求：Node.js 18+。
2) 初始化：不需額外指令。任何 CLI（如 `board:create` 或 `board:list`）會在缺少 `kanban/docs/BOARD.md` 時自動建立初始看板。
   - 注意：若設定相對路徑覆寫（例如 `BOARD_PATH=docs/BOARD.md`），將被視為「相對模組資料夾」而非相對 CWD；若要寫到模組外，請使用絕對路徑。
3) 常用指令（皆以 `npm run` 執行；參數在 `--` 之後）：
```bash
npm run board:create  -- --title "修正登入錯誤" --owner ai:your-ai [--due 2025-08-20]
npm run board:edit    -- --id 20250811-fix-login --title "調整登入驗證" [--owner human:you] [--due YYYY-MM-DD]
npm run board:block   -- --id 20250811-fix-login --reason "等待後端API" --review 2025-08-21
npm run board:unblock -- --id 20250811-fix-login
npm run board:complete-- --id 20250811-fix-login --links "pr:#123 | spec:SPEC-AUTH"
npm run board:move    -- --id 20250811-fix-login --to TODO|BLOCKED  # 不可直接移動到 DONE，請用 complete
npm run board:list
npm run board:archive
npm run lint:board
npm run validate:pr   # 由CI在PR上執行，也可本地檢查
npm run board:clean-lock
```

## 看板條目格式（供AI理解與Lint）
- ID：`YYYYMMDD-<slug>(-N)`；CLI 會自動去重（`-2`, `-3` …）。
- 擁有者：`ai:<name>` 或 `human:<name>`（小寫、數字、`._-`）。
- 日期：UTC `YYYY-MM-DD`（`due | review | completed`）。
- 區塊格式（摘要）：
  - TODO：`- [ ] <id> — <title> (owner: ...) [due: YYYY-MM-DD]`
  - BLOCKED：`- [ ] ... [blocked: <reason>; review: YYYY-MM-DD]`
  - DONE：`- [x] ... [completed: YYYY-MM-DD] (pr|commit|spec|prd: ...)`

## 每日建議流程
1) 新任務：
```bash
npm run board:create -- --title "撰寫 README" --owner ai:your-ai --due 2025-08-20
# 輸出：Created: 20250818-write-readme
```

2) 進度變更（必要時）：
```bash
npm run board:edit -- --id 20250818-write-readme --owner human:alice
```

3) 阻塞處理：
```bash
npm run board:block -- --id 20250818-write-readme \
  --reason "等待設計稿" --review 2025-08-22
```

4) 解除阻塞：
```bash
npm run board:unblock -- --id 20250818-write-readme
```

5) 完成並附上連結：
```bash
npm run board:complete -- --id 20250818-write-readme \
  --links "pr:#45 | commit:abc123 | spec:SPEC-DOCS"
```

6) 清單與歸檔：
```bash
npm run board:list
npm run board:archive   # 將 DONE 區塊較舊條目滾動到 kanban/docs/board-archive/
```

## 在父倉庫根目錄執行（嵌入情境）
- 直接呼叫：`node kanban/scripts/board.mjs list`
- 透過 npm：`npm --prefix kanban run board:list`

## 併發與鎖定（重要）
- 當 2–3 位 AI 同時操作時，系統使用簡易檔案鎖避免衝突。
- 忙碌時輸出並以代碼 2 結束：
```
⏳ Board is busy, locked since 2025-08-18T10:30:05.123Z (age: 12s)
```
- 建議退避策略（Adaptive Backoff）：
  - `age < 10s` → 等待約 5s 後重試。
  - `age < 60s` → 等待約 15s 後重試。
  - `age ≥ 60s` → 可能是陳舊鎖；與人類協作或執行：
    ```bash
    npm run board:clean-lock
    ```
- 注意：僅在確定超過 `lockTimeout`（預設 60s）時才清理鎖。

## Commit / PR 規範
- Commit 訊息建議使用 Conventional Commits，且包含 `board:<id>`：
  - 例如：`fix(board): require review on blocked items board:20250811-fix-login`
- PR 內容需包含：`board:<id>`（CI 會檢查），可附 `spec:SPEC-...` 或 `prd:PRD-...`。
- 送 PR 前可本地檢查：
```bash
echo "fix: adjust readme\n\nboard:20250818-write-readme\nspec:SPEC-DOCS" | npm run validate:pr
```

## Lint 與 CI
- 本地檢查格式：`npm run lint:board`。
- CI 會在 PR 上：
  - 嘗試清理陳舊鎖（安全策略）。
  - 執行格式 Lint。
  - 檢查 PR 描述是否包含 `board:<id>`。

## 故障排除（FAQ）
- 看板忙碌（Busy）：依照「併發與鎖定」的退避策略處理；必要時 `board:clean-lock`。
- Lint 失敗：
  - 檢查是否使用 CLI 操作。
  - 確認 owner、日期格式、BLOCKED 是否包含 `reason + review`。
  - 確認 ID 無重複（如同日同 slug，CLI 會自動附 `-2` 等）。
- 找不到 ID：先 `npm run board:list`，或搜尋 `kanban/docs/BOARD.md` 與 `kanban/docs/board-archive/`。
- 不能直接移到 DONE：請使用 `board:complete`，並在需要時附上 `(pr|commit|spec|prd)` 連結。

## 最佳實踐
- 條目名稱具體可行；大型任務切分為小步驟。
- BLOCKED 一定要寫清楚原因與 review 日期（UTC）。
- DONE 請附上與變更關聯的 `pr|commit|spec|prd` 連結，方便追溯。
- 維持 `kanban/docs/BOARD.md` 可讀性：定期 `archive` 與 `lint`。

---

以上流程足以支援 2–3 位 AI 在專案中的臨時筆記與任務追蹤，保持看板輕量、可靠、可攜帶。將本模組複製到新專案後，即可直接使用上述指令開始記錄與協作。
