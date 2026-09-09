-- Deliberately no data mutation. Iterations are part of the password hash.
-- Reducing the number without the password makes valid hashes unverifiable.
-- New passwords use the runtime-compatible default in src/crypto.ts.
-- Legacy accounts require an administrator password reset (see UPDATE-ANLEITUNG.md).
SELECT 1;
