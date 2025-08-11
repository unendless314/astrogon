---
id: 20250814-products-webhook-worker
title: Stripe Webhook Worker（驗證 + SendGrid 通知）
status: blocked
owner: ai:assistant
created: 2025-08-14T00:00:00Z
links: [SPEC-20250812-products-catalog]
parents: [EPIC-20250813-products-catalog]
blocked_reason: 等待 Cloudflare 環境與密鑰（STRIPE_SIGNING_SECRET、SENDGRID_API_KEY）
review_at: 2025-08-20T09:00:00Z
---

## Summary
在 Cloudflare Workers 建立 webhook 端點，驗證 Stripe 簽章並於成功時寄送 SendGrid 通知。

## Updates
- 2025-08-14T00:00:00Z — Created and set to blocked pending secrets.

## Next steps
- 設定 `wrangler.toml`/`wrangler.jsonc` 路由與 secrets。
- 撰寫驗證與事件處理（先支援付款完成事件）。
- 試跑本地 `npx wrangler dev`，以測試簽章驗證與寄信樣板。
- 提交 `feat(card:20250814-products-webhook-worker): add webhook worker`。

## Outcome / Lessons

