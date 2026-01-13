# Test: US-023: Auth Persistence

## Reload page and verify session

![Reload page and verify session](./screenshots/000-persisted.png)

**Verifications:**
- [x] Token in localStorage
- [x] User still logged in after reload

---

## Simulate token expiration

![Simulate token expiration](./screenshots/001-expiry.png)

**Verifications:**
- [x] Logged out after expiry

---

