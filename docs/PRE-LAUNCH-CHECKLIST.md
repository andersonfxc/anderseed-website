# Anderseed Pre-Launch Checklist

Complete this checklist before connecting the final domain or accepting live payments.

## Hosting and deployment

- Choose the final production host: Netlify or Hostinger.
- Configure the production build to run `node scripts/build.js` and publish `dist`.
- Add a deployment test gate so a failed test cannot replace the live site.
- Apply equivalent security response headers on the chosen host.
- Test the custom 404 page and every clean URL on the production host.
- Confirm a tested rollback route to the previous successful deployment.

## Domain and search

- Replace the temporary Netlify address with the final production domain everywhere.
- Confirm canonical URLs, `robots.txt`, `sitemap.xml`, Open Graph URLs, and structured data.
- Connect and verify Google Search Console after the final domain is live.
- Submit the production sitemap and check indexing coverage.

## Privacy and analytics

- Review the privacy notice and consent wording against the final analytics and email tools.
- Confirm PostHog stays disabled until a visitor explicitly accepts optional analytics.
- Verify PostHog events on the production hostname and exclude staff/test traffic.
- Obtain legal review of the first-party assessment event retention and lawful basis.
- Set and document retention periods for assessment, contact, consent, and analytics data.

## Content and CMS

- Confirm Decap CMS authentication works with the chosen host and final domain.
- Pin Decap CMS to an exact tested version rather than a floating CDN version.
- Test one CMS text update, one FAQ update, and one blog publication end to end.
- Confirm uploaded media is optimised and published to the expected asset path.

## Lead capture and payments

- Connect the roadmap form to Brevo or the selected email platform.
- Replace the placeholder roadmap PDF, change its manifest status to `final`, and verify its checksum before production delivery.
- Add the final-domain Brevo sender address and remove the temporary test sender.
- Authenticate the sending domain with SPF and DKIM; add and verify DMARC alignment.
- Keep `BREVO_PRODUCTION_SEND_ENABLED=false` until sender authentication and delivery testing pass.
- Test confirmation, roadmap delivery, marketing opt-in, unsubscribe, and failed-delivery handling.
- Deploy the Brevo delivery-event database migration before enabling its webhook.
- Generate a production webhook secret in the hosting environment; never reuse or expose the Brevo API key.
- Register the public HTTPS `/api/v1/brevo/webhook` URL in Brevo with bearer authentication.
- Verify sent, delivered, opened, clicked, deferred, soft-bounce, hard-bounce, invalid, blocked, spam, and unsubscribe events.
- Confirm webhook retries remain idempotent and do not duplicate lead-score adjustments.
- Replace payment placeholders with approved Stripe, Klarna, Clearpay, and bank-transfer flows.
- Verify that payment is available only after application approval, as described on the site.
- Test confirmation emails and the internal follow-up process.

## Repository and final quality

- Return the GitHub repository to private before launch.
- Remove temporary collaborators, tokens, and unused deployment permissions.
- Run the full automated suite and final desktop/mobile UAT.
- Check keyboard navigation, screen-reader labels, forms, links, and all CTA destinations.
- Take a final backup and tag the release used for launch.
