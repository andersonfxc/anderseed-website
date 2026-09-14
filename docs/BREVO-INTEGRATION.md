# Brevo Integration

## Phase 1: safe foundation

Brevo is intentionally disabled by default. This phase adds configuration only; it does not send email, create contacts, alter assessment behaviour, or call the Brevo API.

Local secrets belong in `.env`, which Git ignores. Hosting secrets belong in the hosting provider's environment-variable settings. Never put a real Brevo API key in source code, Decap CMS content, GitHub, screenshots, or chat messages.

Copy `.env.example` to `.env` locally and set values there when the API connection phase begins. Keep these safeguards in place:

- `BREVO_ENVIRONMENT=development` while testing.
- `BREVO_TEST_RECIPIENTS` must contain only inboxes controlled by Anderseed.
- `BREVO_INTEGRATION_ENABLED=false` until the relevant integration tests pass.
- `BREVO_PRODUCTION_SEND_ENABLED=false` until the final domain is authenticated and launch is approved.

## Sender during development

Because the final domain is not available yet, use an existing inbox controlled by Anderseed as a temporary test sender and complete Brevo's email verification. Send only to the test-recipient allowlist. Replace it with an address on the final domain before launch.

## Deferred until the final domain exists

- Create the production sender address.
- Authenticate SPF and DKIM in DNS.
- Add a DMARC policy and verify alignment.
- Replace the temporary sender in Brevo and hosting configuration.
- Run inbox-placement and delivery tests.
- Enable production sending only after those checks pass.

## Phase 4: assessment contact sync and roadmap delivery

The existing assessment contact endpoint now performs the Brevo integration only after the website has validated the email, verified the completion token, enforced the one-assessment-per-email rule, and committed the local contact and consent records.

- The contact is idempotently upserted into All Leads, BA Roadmap, and Assessment Completed lists.
- Brevo receives lifecycle summaries needed for segmentation, including readiness stage, readiness score, strongest area, growth area, start timeline, initial lead score, lead tier, and consent status. Raw assessment answers are not sent.
- Marketing consent remains separate. A person who does not opt in may still receive the one requested roadmap service email, but is marked Service only for nurture filtering.
- The roadmap template uses the configurable BREVO_ROADMAP_URL and an assessment-specific idempotency key, preventing duplicate email sends when a submission is retried.
- Development and test activity remains restricted to BREVO_TEST_RECIPIENTS. Production activity requires the independent production switch, and a placeholder roadmap can never be sent in production.
- Brevo failures are contained and cannot prevent the personalised result from appearing. Operational status is stored in assessment_brevo_syncs without duplicating the contact name or email.

The current website intentionally has no second standalone roadmap form. The assessment result gate is the single roadmap request journey.

## Phase 5: controlled live verification

A development-only live test was completed on 12 September 2026 using one allowlisted Anderseed-controlled inbox.

- Contact upsert succeeded.
- Membership of lists 8, 9, and 10 was confirmed.
- Assessment and lead lifecycle attributes were confirmed.
- Marketing consent remained false and nurture status remained Service only.
- Transactional template 1 was activated after the first test identified that it was disabled.
- The second roadmap email was accepted and confirmed delivered by Brevo transactional events.
- The placeholder download URL currently returns 404 because the PDF has not been deployed. Production remains disabled, and this URL must be replaced or published before launch.

## Phase 6: transactional delivery webhooks

A central authenticated webhook endpoint is available at `/api/v1/brevo/webhook`. It is disabled by default and must not be registered in Brevo until a public HTTPS deployment exists.

- Brevo must send a dedicated bearer token using the `Authorization` header. The token is separate from the Brevo API key and is stored only in environment configuration.
- Supported roadmap events are sent, delivered, deferred, soft bounce, hard bounce, blocked, invalid, error, spam, opened, clicked, and unsubscribed.
- Events are correlated to the assessment using Brevo's message ID. Webhook audit rows do not store the learner's email address, name, answers, score breakdown, or result.
- Duplicate webhook deliveries are idempotent. Each event is audited once, and each scoring category can affect a lead only once.
- Delivery and engagement statuses are written to both the website audit record and the existing Brevo contact attributes.
- Opens carry no lead score. The first roadmap click adds 2 points. Current marketing subscription contributes 10 points; unsubscribe replaces it with -15, and verified resubscription restores +10 without accumulating points. Invalid delivery, blocked mail, and spam complaints apply the approved state-based penalties and suppress nurture where appropriate. Automated digital activity is capped at 89.
- Delayed and soft-bounce events are marked retry-eligible for review. The website does not automatically resend a new roadmap email, avoiding duplicate messages when delivery state is uncertain.
- Permanent failures are not retried automatically. Invalid, hard-bounced, blocked, spam, and unsubscribed contacts are suppressed from nurture.
- A temporary database failure returns HTTP 429 so Brevo can retry. Duplicate retries cannot duplicate lead-score changes.

Before live registration, deploy the database migration, add `BREVO_WEBHOOK_ENABLED=true` and `BREVO_WEBHOOK_SECRET` to the hosting environment, then create a transactional Brevo webhook with bearer authentication for the supported events. The local secret must never be copied into source control.
