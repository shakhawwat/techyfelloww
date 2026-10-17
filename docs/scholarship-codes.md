# Scholarship code generation

New codes use `TECHYFELLOW` plus four uppercase ASCII letters/digits, including at least one letter and one digit. Backend cryptographic entropy and rejection sampling produce the suffix. The existing unique `codeHash` index enforces uniqueness after the existing trim/uppercase normalization; a collision rolls back the entire generation batch and retries with fresh entropy, at most 24 times. Exhaustion returns an error without saving a replacement.

Existing codes, hashes and redemption rules are unchanged. New idempotent generation requests keep a private random nonce so the backend can reproduce the code with the existing server-only verification key for the existing 15-minute recovery window. Nonces and hashes are excluded from listing/public responses. Legacy generation keys retain their original recovery algorithm. Only the successful authorized generation response returns the plaintext code for copying.

Code-bearing quote, direct redemption, course-order and cart-order requests share MongoDB-backed limits: 20 code attempts per account per 15-minute window and 100 per UTC day, plus 60 per IP per 15-minute window and 300 per UTC day. Each supplied code in a cart batch consumes an attempt. Non-code requests are unaffected. Limiter keys are hashed and contain no scholarship codes; existing throttle expiry indexes clean them up. Existing trusted-proxy configuration controls the client IP.

These limits do not replace eligibility, recipient verification, expiry, revocation, usage limits, order confirmation or atomic course-specific enrollment checks.
