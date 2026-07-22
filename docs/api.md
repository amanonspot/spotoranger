# API

FastAPI serves OpenAPI documentation at `/docs`.

**Postman:** [`docs/Spoto_Ranger_API.postman_collection.json`](./Spoto_Ranger_API.postman_collection.json)  
Import in Postman → set `baseUrl` to `http://3.110.101.147/api` (prod) or `http://localhost:8000` (local).

## Auth

- `POST /auth/otp/request` — body `{ phone, intent: "login"|"register", fullName? }`
  - `login` — existing phone only; `404` if no account
  - `register` — new phone only; `409` if already verified; `fullName` required
  - Demo phone (`DEFAULT_LOGIN_PHONE_NUMBER`) skips SMS and uses `DEFAULT_OTP`
- `POST /auth/otp/verify` — body `{ phone, code, fullName?, deliveryPlatform?, preferredArea?, upiId? }` → `{ status, user, token }`
  - `user.role` is `ranger` | `admin` | `recruiter`
  - Ranger PWA and Admin Console share the same OTP login (`/onboarding`); admins are redirected to `/console`

Phone is unique — the same number cannot create a second account.

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

Admin UI lives in `admin/` and calls these APIs. On EC2 it is served at `/console`.
