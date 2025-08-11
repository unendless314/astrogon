---
id: PRD-20250811-products-catalog-mvp
title: 產品目錄 MVP
status: approved
owner: product:owner
created: 2025-08-11T00:00:00Z
---

## 背景
用 Astro 建立簡單的「商品陳列 + 詳情頁」，付款導至 Stripe Payment Links；後端僅以 Cloudflare Workers 接收 Webhook 並寄送通知（SendGrid）。

## 目標
- 商品列表與詳情頁可瀏覽、行動版優化。
- 詳情頁提供「前往付款」按鈕（Payment Link）。
- 內容以內容集合管理（Markdown + Frontmatter）。
- 基礎 SEO（標題、描述、OG 圖）。

## 非目標
- 購物車、折扣碼、庫存、會員系統。

## 使用者/場景
- 維護者：以檔案方式新增/調整商品。
- 訪客：瀏覽商品並透過 Payment Link 付款。

## 需求
- 新增 `products` 內容集合與 schema。
- 列表頁 `/products`、詳情頁 `/products/[slug]`。
- 付款按鈕直接連結 `paymentUrl`。
- 後端：Cloudflare Worker 處理 Stripe Webhook，成功後以 SendGrid 寄送通知。

## 設計/可用性約束
- 商品卡片標題不得覆蓋在商品圖片上（標題置於圖片上方或下方）。
- 列表頁提供基礎網格與分頁；行動版可讀性優先於像素級視覺。
 - 漏斗：目錄（Catalog）→ 詳情（Detail）→ 結帳（Stripe Payment Link）。
 - 目錄頁預設不顯示「購買」按鈕，僅顯示圖片、名稱、價格；必要時可透過功能旗標啟用「快速購買」。
 - 詳情頁於首屏顯示主要 CTA（前往付款）；行動版可考慮底部吸附條固定 CTA（非必須）。
 - 數量：優先使用 Stripe Payment Link 的數量選項；若不適用，改用 1×/3×/5× 等固定包裝連結。

## 成功指標
- 產品可於 1 分鐘內新增/上線。
- 基礎 Lighthouse 可用性/SEO 通過（>= 90）。

## 連結
- SPEC: SPEC-20250812-products-catalog
- EPIC: EPIC-20250813-products-catalog
