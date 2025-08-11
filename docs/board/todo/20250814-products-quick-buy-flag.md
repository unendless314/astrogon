---
id: 20250814-products-quick-buy-flag
title: （可選）Catalog 快速購買按鈕（功能旗標）
status: todo
owner: ai:assistant
created: 2025-08-14T00:00:00Z
links: [SPEC-20250812-products-catalog]
parents: [EPIC-20250813-products-catalog]
---

## Summary
在 Catalog 卡片新增「快速購買」按鈕（次要 CTA），僅於 `PUBLIC_PRODUCTS_QUICK_BUY=true` 時顯示，且僅適用單一 SKU/定價商品。

## Updates
- 2025-08-14T00:00:00Z — Created.

## Next steps
- 新增公開環境變數 `PUBLIC_PRODUCTS_QUICK_BUY=false`（預設）。
- 卡片模板：在旗標為 true 時顯示次要 CTA，導向 `paymentUrl`（`target="_blank" rel="noopener"`）。
- 文件：標示使用限制與風險（避免誤觸、只限單一 SKU/價）。
- 提交 `feat(card:20250814-products-quick-buy-flag): add optional quick-buy flag`。

## Outcome / Lessons

