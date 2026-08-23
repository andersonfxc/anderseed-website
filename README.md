# Anderseed BA Readiness Assessment MVP V2

This is a separate V2 working copy. The previous assessment has not been overwritten and this version has not been deployed.

## Local review

```sh
npm install
npm run build
npm test
npm run preview:assessment
```

Open:

- Assessment: `http://127.0.0.1:8792/assessment/`
- Anonymous funnel report: `http://127.0.0.1:8792/admin/assessment-report/`

The local preview writes test-only data to `.local-data/`, which is excluded from source control. The report accepts any non-empty test token locally; production requires the protected secret below.

## Production prerequisites

Before deployment:

1. Provision Netlify Database for the target Netlify site so the migration in `netlify/database/migrations/` can run.
2. Add an `ASSESSMENT_REPORTING_ADMIN_SECRET` environment variable containing a unique value of at least 32 characters.
3. Confirm the production domain and contact placeholders in `content/settings.json`.
4. Complete professional privacy/legal review and production browser testing.
5. Build and deploy only when explicitly approved.

Brevo contact sync, automated result emails and nurture sequences are intentionally out of scope for this MVP.
