# Security Specification — Países en Guerra (Firestore)

## 1. Data Invariants
1. **Strict Owner Isolation**: Every user profile (`/users/{userId}`), saved campaign metadata (`/users/{userId}/campaigns/{campaignId}`), and full simulation snapshot (`/users/{userId}/campaigns/{campaignId}/data/state`) belongs strictly to the verified Firebase Auth user whose `uid` equals `{userId}`.
2. **Master Gate & Atomic Parent Consistency**:
   - Creating/updating/reading/deleting a campaign requires `/users/{userId}` to exist and match `request.auth.uid`.
   - Creating/updating/reading/deleting a campaign snapshot requires `snapshotId == 'state'` and the parent campaign document `/users/{userId}/campaigns/{campaignId}` to exist (or exist after atomic batch commit via `existsAfter`/`getAfter`) with `ownerId == request.auth.uid`.
3. **Immutable Ownership & Creation Timestamps**: `uid`, `ownerId`, `campaignId`, and `createdAt` can never be reassigned after creation. `createdAt` and `updatedAt` must equal `request.time`.
4. **No Blanket Reads or Client Query Delegation**: `users` cannot be listed; `campaigns` `allow list` explicitly evaluates `resource.data.ownerId == request.auth.uid` without `get()`/`exists()` lookups; `data` subcollection disables `list`.
5. **Terminal State Protection**: Once a campaign reaches `outcome == 'defeat'`, updates to that campaign or its snapshot are denied (the player may only read or delete it).
6. **Strict Key & Volumetric Bounds**: All writes reject unknown/ghost fields (`hasOnly`), enforce `maxLength` / `size()` limits on strings, bytes, and arrays, and validate regex IDs (`^[a-zA-Z0-9_\\-]+$`).

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: `request.auth == null` reading `/users/u1/campaigns/c1`.
2. **Unverified Email Spoofing**: `request.auth.token.email_verified == false` writing `/users/u1`.
3. **Cross-User Read (PII Leak)**: User `u2` attempting `get` on `/users/u1` (containing email).
4. **Cross-User Campaign Hijack**: User `u2` creating `/users/u1/campaigns/c1` with `ownerId: "u2"` or `"u1"`.
5. **Shadow / Ghost Field Injection**: Creating `/users/u1` with extra field `isAdmin: true` or `role: "superuser"`.
6. **Path Variable Poisoning**: Using a 1,500-character or invalid-symbol `campaignId` like `../admin$bad`.
7. **Timestamp Forgery**: Providing a client-fabricated `createdAt` or `updatedAt` != `request.time`.
8. **Immutable Field Tampering**: Updating `/users/u1/campaigns/c1` to change `ownerId` or `createdAt`.
9. **Orphaned Snapshot Write**: Creating `/users/u1/campaigns/missing/data/state` when parent `/users/u1/campaigns/missing` does not exist and is not in the same batch.
10. **Invalid Snapshot Document ID**: Writing `/users/u1/campaigns/c1/data/arbitrary_id` instead of `'state'`.
11. **Array / Byte Bomb (Denial of Wallet)**: Writing `wars` with 5,000 items or `ownerGridRle` > 500 KB or `countries.size() != 195`.
12. **Post-Defeat Mutation**: Updating `/users/u1/campaigns/c1` or `/data/state` after `existing().outcome == 'defeat'`.
