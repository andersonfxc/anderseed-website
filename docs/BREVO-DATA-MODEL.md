# Brevo Data Model

Created in the Brevo Free account during Phase 2. No contacts, templates, campaigns, automations, or emails were created in this phase.

## Folder

- `Anderseed Lifecycle` (ID `7`)

## Purpose-based lists

| Purpose | Brevo list | ID |
| --- | --- | ---: |
| Master lead record | Anderseed - All Leads | 8 |
| Free roadmap request | Lead Magnet - BA Roadmap | 9 |
| Completed assessment | BA Readiness - Completed | 10 |
| Mentorship application | Mentorship - Applicants | 11 |
| Consultation booking | Consultation - Bookings | 12 |
| Event registration | Events - Registrants | 13 |
| Completed payment | Customers - Paid | 14 |

Lists describe why a contact entered or progressed through Anderseed. Lead temperature must not be represented by moving contacts between static lists.

## Lead temperature

- `LEAD_SCORE` stores the current numeric lead score.
- `LEAD_TIER` stores `Cold`, `Warm`, `Hot`, or `Super Hot`.
- `MANUAL_TIER_OVERRIDE` and `MANUAL_SCORE_ADJUSTMENT` preserve owner control.
- `LAST_SCORE_EVENT`, `LAST_SCORE_DELTA`, and `LEAD_SCORE_DATE` provide a readable audit trail.

Dynamic segments and automations will use these fields in a later phase.

## Contact attribute groups

### Acquisition and consent

`LEAD_SOURCE`, `ACQUISITION_DETAIL`, `MARKETING_CONSENT`, `CONSENT_DATE`, `EMAIL_VALIDATION_STATUS`

### Assessment

`ASSESSMENT_VERSION`, `SCORING_VERSION`, `ASSESSMENT_DATE`, `READINESS_STAGE`, `READINESS_SCORE`, `STRONGEST_AREA`, `PRIMARY_GROWTH_AREA`, `START_TIMELINE`

### Lead lifecycle and nurture

`LEAD_SCORE`, `LEAD_TIER`, `LEAD_SCORE_DATE`, `LAST_SCORE_EVENT`, `LAST_SCORE_DELTA`, `MANUAL_TIER_OVERRIDE`, `MANUAL_SCORE_ADJUSTMENT`, `NURTURE_STATUS`, `LAST_ENGAGEMENT_DATE`

### Roadmap and email delivery

`ROADMAP_DELIVERY_STATUS`, `ROADMAP_SENT_DATE`, `EMAIL_DELIVERY_STATUS`, `TELEGRAM_CLICKED`

### Consultation and events

`CONSULTATION_STATUS`, `CONSULTATION_BOOKED_DATE`, `CONSULTATION_ATTENDED_DATE`, `CONSULTATION_NO_SHOW`, `EVENTBRITE_STATUS`, `EVENT_ATTENDED_DATE`

### Application, payment, and customer state

`APPLICATION_STATUS`, `APPLICATION_STARTED_DATE`, `APPLICATION_SUBMITTED_DATE`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `PAYMENT_STARTED_DATE`, `CUSTOMER_SINCE`

## Website sync audit

The website stores Brevo operational state in assessment_brevo_syncs. It records contact status, roadmap status, attempt count, a safe error code, the Brevo message ID, and timestamps. It references the assessment record and does not duplicate names or email addresses.

## Transactional delivery audit

`brevo_webhook_events` records a non-PII, idempotent audit of Brevo transactional events using the Brevo message ID, normalized event name, event timestamp, processing status, safe error code, and applied score delta. It does not store the recipient email, first name, assessment answers, or personalised result.

`brevo_lead_score_events` allows each approved score category to affect an assessment only once. This prevents webhook retries and repeated link clicks from inflating or repeatedly reducing a lead score.

The website audit distinguishes:

- sent, delivered, opened, and clicked
- deferred and soft-bounced, which remain reviewable rather than being treated as permanent failures
- hard-bounced, invalid, blocked, spam, and unsubscribed, which are suppressed where appropriate

Current email-event score rules are deliberately conservative: an open adds no score, the first roadmap click adds 2, invalid delivery subtracts 20, blocked mail subtracts 10, spam subtracts 30, and unsubscribe subtracts 15. Lead tiers remain Cold 0-34, Warm 35-69, Hot 70-89, and Super Hot 90-100.
