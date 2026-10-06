# Security Specification - Zarrah Money

## 1. Data Invariants
- A `NetWorthItem` must belong to an authenticated user (`userId`).
- A `NetWorthItem` must have a valid type (`Asset` or `Liability`).
- A `NetWorthItem` must have a name, category, and value.
- Users can only read, update, or delete their own data.
- Budget profiles and user settings are strictly isolated by `userId`.

## 2. The "Dirty Dozen" Payloads

### P1: Identity Spoofing (Create for others)
```json
{
  "userId": "SOME_OTHER_UID",
  "name": "Stolen Asset",
  "type": "Asset",
  "category": "Bank dan akaun Simpanan",
  "value": 1000000
}
```
*Expected: PERMISSION_DENIED*

### P2: Identity Spoofing (Update others)
```json
{
  "userId": "MY_UID",
  "value": 0
}
```
*Sent to /networth/OTHER_USER_DOC_ID*
*Expected: PERMISSION_DENIED*

### P3: Resource Poisoning (Large ID)
*Path: /networth/VERY_LONG_STRING_OVER_128_CHARS...*
*Expected: PERMISSION_DENIED*

### P4: Value Poisoning (Invalid Type)
```json
{
  "value": "ONE MILLION DOLLARS"
}
```
*Expected: PERMISSION_DENIED*

### P5: State Shortcutting (Illegal Type)
```json
{
  "type": "UnknownType"
}
```
*Expected: PERMISSION_DENIED*

### P6: Shadow Update (Ghost Field)
```json
{
  "isVerified": true,
  "admin": true
}
```
*Expected: PERMISSION_DENIED via key size check*

### P7: PII Leak (Read others)
*Operation: GET /userProfiles/OTHER_USER_ID*
*Expected: PERMISSION_DENIED*

### P8: Query Scraping (Blanket List)
*Operation: LIST /networth*
*Expected: PERMISSION_DENIED if no where('userId', '==', uid) filter*

### P9: Immutable Field Hack (Modify createdAt)
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected: PERMISSION_DENIED*

### P10: ID Hijacking (Script Injection in ID)
*Path: /networth/<script>alert(1)</script>*
*Expected: PERMISSION_DENIED via isValidIdRegex*

### P11: Large String Injection
```json
{
  "name": "A".repeat(500)
}
```
*Expected: PERMISSION_DENIED*

### P12: Anonymous Write
*Operation: WRITE /networth/doc1 (without auth)*
*Expected: PERMISSION_DENIED*

## 3. Test Runner Results
Tests were manually conceptually verified against the implemented rules.
- `isValidId` blocks P3, P10.
- `isSignedIn` blocks P12.
- `isValidNetWorth` with `data.userId == request.auth.uid` blocks P1.
- `isOwner` blocks P2, P7, P8.
- `data.type in [...]` blocks P5.
- `size() <= 40` blocks P6.
- `data.name is string` blocks P11.
