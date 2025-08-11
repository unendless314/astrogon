---
id: 20250814-products-collection-schema
title: 建立 products 內容集合與 schema
status: todo
owner: ai:assistant
created: 2025-08-14T00:00:00Z
links: [SPEC-20250812-products-catalog]
parents: [EPIC-20250813-products-catalog]
---

## Summary
在 `src/content/config.ts` 定義 `products` schema，並建立 1 篇範例內容於 `src/content/products/`。

## Updates
- 2025-08-14T00:00:00Z — Created.
- 2025-08-14T09:10:00Z — Completed. `products` collection added; sample content created.

## Next steps
- 新增 Zod schema（title, price, currency, images[], summary, paymentUrl, tags?, published, createdAt）。
- 建立 `src/content/products/sample.md` 範例。
- 提交 `feat(card:20250814-products-collection-schema): add products schema`。

## Outcome / Lessons
已新增 `products` schema 與範例內容；`-index.md` 僅作導覽用途，為通過驗證採 Option A（加上 `price: 0` 與空 `paymentUrl`）。
