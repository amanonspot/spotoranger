# Database

**Engine: PostgreSQL only.** SQLite is rejected at startup.

Core entities:

- `users`
- `ranger_profiles`
- `recruiter_profiles`
- `invitations`
- `otp_sessions`
- `properties`
- `property_status_history`
- `wallets`
- `wallet_transactions`
- `withdrawals`
- `notifications`
- `training_articles`
- `audit_logs`

```mermaid
erDiagram
  USER ||--o| RANGER_PROFILE : has
  USER ||--o| RECRUITER_PROFILE : has
  RECRUITER_PROFILE ||--o{ RANGER_PROFILE : recruits
  RECRUITER_PROFILE ||--o{ INVITATION : creates
  RANGER_PROFILE ||--o{ PROPERTY : submits
  PROPERTY ||--o{ PROPERTY_STATUS_HISTORY : records
  RANGER_PROFILE ||--|| WALLET : owns
  WALLET ||--o{ WALLET_TRANSACTION : records
  WALLET ||--o{ WITHDRAWAL : requests
  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ AUDIT_LOG : performs
```

Wallet balances must be derived from an append-only ledger pattern. Direct balance updates should happen only inside wallet service transactions.

