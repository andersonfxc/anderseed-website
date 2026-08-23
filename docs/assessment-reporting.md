# BA Assessment funnel reporting

## Access

Set `ASSESSMENT_REPORTING_ADMIN_SECRET` in the Netlify production environment to a unique value of at least 32 characters. The API accepts that value only in an `Authorization: Bearer …` header; it is never accepted in a URL.

The reporting screen is available at `/admin/assessment-report/`. The page itself contains no assessment data. It keeps the token only in the live form field and does not write it to local or session storage.

## Report semantics

`GET /api/v1/admin/assessment-funnel?start=YYYY-MM-DD&end=YYYY-MM-DD` returns only aggregate, anonymous session reach. It does not select contact details, marketing-consent records, assessment answer values, readiness scores, or lead temperatures.

The report shows:

- reach for entry, start, each question displayed, completion, lead capture, result reveal and the primary Anderseed programme CTA;
- conversion from the previous step;
- exits and drop-off after each step;
- assessment abandonment from `assessment_started` to `assessment_completed`;
- lead-capture abandonment from `assessment_completed` to `contact_details_submitted`;
- anonymous roadmap and programme CTA reach.

Session IDs are deduplicated inside each UTC day and funnel step. A session that crosses a UTC date boundary can be counted on both days when a multi-day report is totalled. `unmatchedNextStepReach` is exposed per step so missing or out-of-order instrumentation is visible rather than silently hidden.

## Roll-up and retention

`assessment-funnel-maintenance.mjs` runs daily at 02:15 UTC. In one database transaction it:

1. refreshes daily, anonymous distinct-session counts for every raw event still present, including overdue events if a previous schedule was missed;
2. deletes raw anonymous events older than seven days.
3. deletes expired assessment runs. Runs without submitted contact details expire after seven days; named runs expire after 365 days. Existing foreign-key cascades remove their associated structured answers, contact record and consent decision in the same transaction.

Daily aggregate counts are retained for historical reporting. The report prefers a raw daily count when one is still available, then falls back to the daily aggregate, so the same day and event are not counted twice.

## Deployment boundary

No reporting secret is included in source control. Add the environment variable and provision Netlify Database before enabling production reporting. This implementation does not deploy the site or connect Brevo.
