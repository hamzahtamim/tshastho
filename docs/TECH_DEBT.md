# Technical Debt — Tshastho

During the security and code quality audit, the following technical debt items were identified and deferred for future sprints.

## 1. Remaining "any" Types (approx. 753)
While all ESLint errors were resolved and the build passes, there are still strict `any` types in the following modules:
- `src/lib/ocr/providers/*` (Third-party OCR API responses)
- `src/lib/whatsapp/providers/*` (WhatsApp Cloud API responses)
- `src/lib/pharmacy/stock.ts`, `interactions.ts` (Complex Prisma aggregations)
- `src/lib/sms/index.ts` (Provider specific payloads)

**Recommendation:** Developers should create strict Zod schemas or TypeScript interfaces for third-party API responses and remove the `any` casts.

## 2. Automated Test Coverage
Currently, we have basic tests for Auth, Payments, and VAT. 
**Recommendation:** Add Playwright for E2E testing (checkout flow, POS sale flow) and Jest integration tests for Prisma database transactions.
