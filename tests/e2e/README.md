# Test: Issue #95: Auth Refresh Robustness

## Verify logout if refresh hangs and token is expired

![Verify logout if refresh hangs and token is expired](./screenshots/000-timeout-when-expired.png)

**Verifications:**
- [x] Logs out after 10s if token expired

---

## Verify app stays logged in if refresh hangs but token still valid (in buffer)

![Verify app stays logged in if refresh hangs but token still valid (in buffer)](./screenshots/001-no-logout-if-buffer.png)

**Verifications:**
- [x] Remains logged in if within buffer

---

