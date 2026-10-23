# AUTHORIZATION MATRIX — Tshastho

This document provides a high-level classification of all API routes. 
*Note: Developers must ensure every route uses `requireAuth` or `requireRole` unless explicitly public.*

## Public Routes
- `/api/auth/login`
- `/api/auth/register/*`
- `/api/health`
- `/api/webhooks/*`
- `/api/payments/sslcommerz/*` (Validated via gateway signature/IPN)

## Authenticated Routes (Role-restricted)
- **Admin:** `/api/admin/*` (Requires `SUPER_ADMIN`)
- **Pharmacy:** `/api/pharmacy/*` (Requires `PHARMACY_OWNER` or `PHARMACY_STAFF`)
- **Doctor:** `/api/doctor/*` (Requires `DOCTOR`)
- **Patient:** `/api/patient/*` (Requires `PATIENT`)
- **General User:** `/api/user/*`, `/api/wallet/*`, `/api/orders/*`

## Internal/System Routes
- `/api/internal/*` (Requires specific internal API keys or cron secrets)
