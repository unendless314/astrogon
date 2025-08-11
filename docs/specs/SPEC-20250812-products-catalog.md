---
id: SPEC-20250812-products-catalog
title: 產品目錄 MVP 技術規格
status: draft
owner: eng:owner
created: 2025-08-12T00:00:00Z
prd: PRD-20250811-products-catalog-mvp
---

## Overview
以 Astro 內容集合驅動商品數據，提供列表/詳情頁並以 Payment Link 付款；Webhook 在 Cloudflare Workers 驗證與通知。為降低風險，列表/詳情版型以 `recipes` 為基底調整。

## Architecture & Components
- Content: `src/content/products/`（MD/MDX），schema 定義於 `src/content/config.ts`。
- Pages: `src/pages/products/index.astro`（列表），`src/pages/products/[slug].astro`（詳情）。
- Components: `src/components/products/`（如 `ProductCard.astro`）。
- Config: `astro.config.mjs` 依部署環境參數化（GH Pages vs Cloudflare）。

## UI / Layout
- Catalog 卡片：圖片上方或下方顯示標題；不得以覆蓋層蓋住圖片。顯示名稱、價格、縮圖；預設不顯示購買按鈕（可選「檢視」）。
- Detail 頁：首屏顯示主要 CTA「前往付款」（`target=\"_blank\" rel=\"noopener\"`），價格置於 CTA 附近；可選行動裝置底部吸附條固定 CTA。
- 網格：沿用 `recipes` 集合的網格與 `Pagination.astro`；確保 RWD 良好。
- 導航：在 Header `menu` 中加入 Products；可選擇把 `products` 納入站內搜尋。

## 購買流程與數量
- 預設流程：Catalog → Detail → Stripe Payment Link。
- 數量：優先使用 Stripe Payment Link 的數量欄位；若無，提供固定包裝（1×/3×/5×）對應不同 Payment Links。

## 功能旗標
- `PUBLIC_PRODUCTS_QUICK_BUY`（預設 false）：若為 true，Catalog 卡片顯示次要「快速購買」按鈕（僅單一 SKU/單一定價商品適用）。

## Data / Content Schema
必填欄位：
- `title: string`
- `price: number`（單位為最低幣值單位或顯示用整數）
- `currency: string`（如 `TWD`）
- `images: string[]`（相對於 `public/` 或 `src/assets/`）
- `summary: string`
- `paymentUrl: string`（Stripe Payment Link）
- `tags?: string[]`
- `published: boolean`
- `createdAt: string`（ISO）

## API / Integrations
- Stripe: 以 Payment Link 重導；Worker 端驗證 Webhook（`STRIPE_SIGNING_SECRET`）。
- SendGrid: `SENDGRID_API_KEY` 用於付款成功通知。
- Secrets 設於 Cloudflare（`wrangler secret put ...`）。

## Acceptance Criteria
- [ ] 新增 `products` schema 與 1 篇範例內容。
- [ ] `/products` 以網格展示（RWD/SEO）；卡片標題不覆蓋圖片，顯示價格，不顯示「購買」按鈕（可選「檢視」）。
- [ ] `/products/[slug]` 顯示價格、圖片、描述與付款按鈕（`target="_blank" rel="noopener"`）。
- [ ] 若 `PUBLIC_PRODUCTS_QUICK_BUY=true`，Catalog 卡片出現「快速購買」按鈕並導向 Payment Link。
- [ ] 數量透過 Payment Link（或固定包裝）處理。
- [ ] Webhook Worker 驗證與記錄事件；可呼叫 SendGrid 寄信（雖可先以假資料/乾跑驗證）。
- [ ] Header 出現 Products 導航；若啟用搜尋，`searchableCollections` 包含 `products`。

## Risks & Assumptions
- GH Pages 階段僅靜態前端；Webhook 需獨立 Worker。

## Rollout / Flags
Phase 1：前端頁面與內容集合。Phase 2：Worker Webhook 與通知。

## Impacted Paths
`src/content/config.ts`, `src/pages/products/*`, `src/components/products/*`, `astro.config.mjs`, `wrangler.jsonc`。
