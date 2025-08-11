---
id: 20250814-products-detail-page
title: 建立 /products/[slug] 詳情頁（含付款連結）
status: todo
owner: ai:assistant
created: 2025-08-14T00:00:00Z
links: [SPEC-20250812-products-catalog]
parents: [EPIC-20250813-products-catalog]
---

## Summary
新增詳情頁顯示圖片、價格、描述與「前往付款」按鈕（連至 `paymentUrl`）。

## Updates
- 2025-08-14T00:00:00Z — Created.
- 2025-08-14T09:14:00Z — Completed. 詳情頁含主要 CTA「前往付款」，新分頁開啟。

## Next steps
- 新增 `src/pages/products/[slug].astro`，顯示圖片、標題、價格、描述與主要 CTA「前往付款」（首屏可見；行動版可選底部吸附條）。
- 使用共用 `Button.astro`；付款按鈕 `rel="noopener" target="_blank"` 連到 Payment Link。
- 提交 `feat(card:20250814-products-detail-page): add product detail`。

## Outcome / Lessons
CTA 放在詳情頁首屏；Catalog 僅顯示檢視按鈕；未實作行動端吸附條（可作後續優化）。
