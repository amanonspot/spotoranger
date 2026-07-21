# API

FastAPI serves OpenAPI documentation at `/docs`.

## Auth

- `POST /auth/otp/request` — body `{ phone, fullName? }` → SMS OTP via 2Factor (DLT). Demo phone skips SMS.
- `POST /auth/otp/verify` — body `{ phone, code, fullName?, deliveryPlatform?, preferredArea?, upiId? }` → `{ status, user, token }`

Authenticated requests send `Authorization: Bearer <token>`.

## Ranger

- `GET /properties` — list leads for the authenticated ranger
- `POST /properties` — submit a new rental lead
- `GET /properties/{id}` — lead detail + status history
- `GET /wallet/{ranger_id}` — wallet summary + transactions
- `POST /wallet/{ranger_id}/withdraw` — request withdrawal (min ₹100, requires UPI)
- `GET /ranger/{ranger_id}` — profile
- `PATCH /ranger/{ranger_id}` — update name / platform / area / UPI
- `GET /notifications?user_id=` — notifications for the current user
- `GET /training` — training articles
- `GET /health`

## Admin

- `/admin/*` — review, verify, reward (JWT admin role required)
