---
id: EPIC-20250813-products-catalog
title: 產品目錄 MVP
status: open
owner: human:owner
created: 2025-08-13T00:00:00Z
prd: PRD-20250811-products-catalog-mvp
specs: [SPEC-20250812-products-catalog]
cards: [20250814-products-collection-schema, 20250814-products-list-page, 20250814-products-detail-page, 20250814-products-webhook-worker]
progress: 3/4
---

## Summary
以最小可行範圍上線商品瀏覽與付款連結；後續補上 Webhook 通知。

## Scope
- In: 內容集合、列表/詳情頁（卡片標題不覆蓋圖片；Catalog 顯示價格不含購買鈕；Detail 置頂主要 CTA）、付款連結、Webhook 骨架、導航/搜尋整合（可選）、數量策略（Payment Link 或固定包裝）。
- Out: 購物車、會員、庫存。

## Milestones
- M1：前端完成並上線 GH Pages。
- M2：Cloudflare Worker Webhook 與通知。

## Risks / Dependencies
- 部署環境切換與密鑰管理。

## Success metrics
- 新增商品→發布≤1 分鐘；頁面可用性/SEO ≥ 90。
