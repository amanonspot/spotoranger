# Product Notes

The core MVP loop is:

1. Recruiter invites Ranger.
2. Ranger registers and verifies phone by OTP.
3. Ranger submits a rental property in under 60 seconds.
4. Admin reviews and changes lead status in the admin console (`admin/`).
5. Wallet reward is credited when business rules are satisfied.
6. Ranger withdraws after reaching the minimum balance (manual UPI payout).

Surfaces:

- Ranger PWA — lead submit, wallet, profile
- Admin console — review leads, rewards, withdrawals
- Backend API — auth, RBAC, ledger (source of truth)

Future features such as referral bonuses, contests, heatmaps, AI duplicate detection, Ranger score, and badges should plug into the existing user, property, wallet, and audit-log foundations.

