---
id: 20250814-products-list-page
title: 建立 /products 列表頁（RWD + SEO）
status: todo
owner: ai:assistant
created: 2025-08-14T00:00:00Z
links: [SPEC-20250812-products-catalog]
parents: [EPIC-20250813-products-catalog]
---

## Summary
新增 `src/pages/products/index.astro` 以網格顯示商品，含標題、價格與縮圖。

## Updates
- 2025-08-14T00:00:00Z — Created.
- 2025-08-14T09:12:00Z — Completed. 建立 `/products` + 分頁；卡片標題不覆蓋圖片；顯示價格，不放購買鈕。

## Next steps
- 以 `getCollection('products')` 取資料，顯示已 `published=true` 條目。
- 建立 `ProductCard.astro`（改造自 recipes 卡片）：移除覆蓋層，標題置於圖片下方；顯示價格，不放「購買」按鈕（可選「檢視」）。
- 列表沿用 `Pagination.astro`；必要時調整網格密度（RWD）。
- Header `menu` 加入 Products；`searchableCollections` 可新增 `products`（若啟用）。
- 基本 og:title/description 設定。
- 提交 `feat(card:20250814-products-list-page): add products list`。

## Outcome / Lessons
沿用 recipes 的網格與 Pagination；排序改以標題；Header 加入 Products；Search 納入 `products`。
