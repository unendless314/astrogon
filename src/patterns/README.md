# Patterns Archive

此目錄用來暫存「下架但保留樣板」的頁面。這些檔案不位於 `src/pages`，因此不會生成任何路由；模板與 UI 元件仍可直接重用。

目前歸檔
- recipes（`index.astro`、`[entry].astro`、`page/[slug].astro`）
- poetry（`index.astro`、`[entry].astro`）
- index-cards（單頁 `index-cards.astro`）

還原方式
- 將對應檔案或資料夾搬回 `src/pages/...` 即可恢復路由。
- 如需重新顯示導覽，編輯 `src/components/base/Header.astro` 的 `menu` 陣列新增項目。
- 建議使用 `git mv` 以保留檔案歷史。

開發小貼士
- 這些頁面使用的別名 `@components`、`@lib`、`@/types` 在此目錄仍然可用。
- 若僅需版型，可直接使用各自的 `EntryLayout` 或 `CollectionLayout` 元件。

