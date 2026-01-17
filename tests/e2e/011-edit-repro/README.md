# Test: Bug Repro: Edit Persistence on Re-open

## User opens the log page

![User opens the log page](./screenshots/000-open-logger.png)

**Verifications:**
- [x] Camera button visible

---

## User uploads image and waits for analysis

![User uploads image and waits for analysis](./screenshots/001-fill-entry.png)

**Verifications:**
- [x] Description populated

---

## User saves the entry

![User saves the entry](./screenshots/002-save-entry.png)

**Verifications:**
- [x] Original food visible in list

---

## User edits the existing entry

![User edits the existing entry](./screenshots/003-edit-entry.png)

**Verifications:**
- [x] Edited food visible in list

---

## Edited value persists after reload

![Edited value persists after reload](./screenshots/004-verify-persistence.png)

**Verifications:**
- [x] Detail view shows edited name

---

