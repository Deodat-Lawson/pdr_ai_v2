# PR Roadmap Ideas

## 1. Secure Company Settings Update API
- **Problem**: `/api/updateCompany` accepts a `userId` from the client, trusts it without verifying the session, and updates company settings without confirming role or company ownership.
- **Scope**:
  - Switch to `auth()` within the handler to derive the authenticated user and reject unauthenticated calls.
  - Rework validation with `validateRequestBody` + a new schema that only covers mutable fields (name, passkeys, staff count).
  - Look up the user via Clerk ID, ensure their role is `employer`/`owner`, and that they belong to the target company; return 403 otherwise.
  - Update the frontend (`src/app/employer/settings/page.tsx:154`) to stop sending `userId` and handle new error shapes.
  - Expand Jest coverage to include: unauthenticated, unauthorized role, mismatched company, and successful update.
- **Acceptance**: API no longer trusts client-provided identifiers, rejects cross-company attempts, and tests document the new behaviour.

## 2. Harden Employee Approval & Removal APIs
- **Problem**: `/api/approveEmployees` and `/api/removeEmployees` trust the incoming `employeeId` and only check caller role; they can mutate users in other companies, accept non-numeric input, and return vague errors.
- **Scope**:
  - Add Zod schemas (`ApproveEmployeeSchema` updates) to require numeric IDs and descriptive error responses.
  - Within each handler, pull the target employee, verify they belong to the caller’s company, and short-circuit if they are already in the desired state (e.g., already verified).
  - Provide differentiated messages for missing employee, cross-company access, and invalid role.
  - Extend Jest suites under `__tests__/api` to cover success, invalid payload, employee not found, cross-company access, and duplicate approvals.
- **Acceptance**: Both endpoints block cross-tenant mutations, give actionable errors, and maintain parity with updated tests.

## 3. Document Upload Telemetry & Rate Guardrails
- Add server-side logging around `/api/uploadDocument` to capture PDF size, processing duration, and OpenAI latency (without storing file contents). Emit aggregated metrics for slow uploads and retries.
- Introduce rate limiting (e.g., per user/company via Upstash or in-memory p-limit) to prevent accidental DoS from rapid uploads.
- Extend tests to assert guardrails trigger when exceeding thresholds and ensure logs are emitted on critical branches.

## 4. Predictive Analysis Cache Diagnostics
- Surface cache hits vs misses from `/api/predictive-document-analysis` in the employer dashboard UI to make the 24h TTL observable.
- Add an API query parameter to return cache freshness metadata, and create a lightweight UI indicator on `src/app/employer/documents/page.tsx`.
- Cover UI state with component tests (mocking fetch) and an API unit test for cache-enabled responses.

## 5. Structured Error Responses for AI Endpoints
- Standardize error envelopes (`{ success, message, code }`) across `/api/AIAssistant`, `/api/predictive-document-analysis`, and `/api/LangChain`.
- Replace `console.error` with structured logger hooks that tag request IDs and user IDs (when available) to simplify tracing.
- Update front-end fetch consumers to handle the new envelope and show actionable toasts; backfill Jest tests to assert codes and messages.
