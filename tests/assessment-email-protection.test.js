const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function dnsError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

test("email normalization is case-insensitive and rejects malformed addresses", async () => {
  const { normalizeEmail } = await import("../netlify/functions/_email-validation.mjs");

  assert.equal(normalizeEmail("  Test.Person+BA@GMAIL.COM  "), "test.person+ba@gmail.com");
  assert.equal(normalizeEmail("person..name@example.org"), "");
  assert.equal(normalizeEmail("person@localhost"), "");
  assert.equal(normalizeEmail("person @example.org"), "");
  assert.equal(normalizeEmail("person@-example.org"), "");
});

test("email validation catches common domain typos before a DNS request", async () => {
  const { validateEmailDeliverability } = await import("../netlify/functions/_email-validation.mjs");
  let dnsCalls = 0;
  const resolver = async () => {
    dnsCalls += 1;
    return [{ exchange: "mail.example" }];
  };

  const outcome = await validateEmailDeliverability("learner@gmial.com", {
    resolveMx: resolver,
    resolve4: resolver,
    resolve6: resolver,
  });

  assert.equal(outcome.valid, false);
  assert.equal(outcome.code, "email_domain_typo");
  assert.match(outcome.message, /learner@gmail\.com/);
  assert.equal(dnsCalls, 0);
});

test("email validation accepts domains with mail delivery records", async () => {
  const { validateEmailDeliverability } = await import("../netlify/functions/_email-validation.mjs");
  const outcome = await validateEmailDeliverability("learner@working-domain.co.uk", {
    resolveMx: async () => [{ exchange: "mail.working-domain.co.uk", priority: 10 }],
    resolve4: async () => { throw dnsError("ENODATA"); },
    resolve6: async () => { throw dnsError("ENODATA"); },
  });

  assert.equal(outcome.valid, true);
  assert.equal(outcome.verification, "mx");
  assert.equal(outcome.normalizedEmail, "learner@working-domain.co.uk");
});

test("email validation rejects domains without MX, IPv4 or IPv6 delivery routes", async () => {
  const { validateEmailDeliverability } = await import("../netlify/functions/_email-validation.mjs");
  const missing = async () => { throw dnsError("ENODATA"); };
  const outcome = await validateEmailDeliverability("learner@does-not-receive-mail.invalidhost", {
    resolveMx: missing,
    resolve4: missing,
    resolve6: missing,
  });

  assert.equal(outcome.valid, false);
  assert.equal(outcome.code, "email_domain_unavailable");
});

test("email validation fails open on a temporary DNS outage", async () => {
  const { validateEmailDeliverability } = await import("../netlify/functions/_email-validation.mjs");
  const outcome = await validateEmailDeliverability("learner@temporarily-unreachable.co.uk", {
    resolveMx: async () => { throw dnsError("ETIMEOUT"); },
  });

  assert.equal(outcome.valid, true);
  assert.equal(outcome.verification, "inconclusive");
  assert.equal(outcome.code, "email_domain_check_deferred");
});

test("database and local preview enforce one retained assessment per normalized email", () => {
  const migration = read("netlify/database/migrations/20260911090000_prevent_duplicate_assessment_email.sql");
  const contact = read("netlify/functions/assessment-contact.mjs");
  const preview = read("scripts/assessment-preview-server.js");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS assessment_email_claims/);
  assert.match(migration, /email_hash TEXT PRIMARY KEY/);
  assert.match(migration, /assessment_id UUID NOT NULL UNIQUE/);
  assert.match(migration, /SELECT DISTINCT ON \(email_hash\)/);
  assert.match(contact, /INSERT INTO assessment_email_claims/);
  assert.match(contact, /ON CONFLICT DO NOTHING/);
  assert.match(contact, /assessment_email_already_used/);
  assert.match(preview, /contactRecord\.email === email/);
  assert.match(preview, /assessment_email_already_used/);
});

test("the result gate keeps the completed assessment available after an email error", () => {
  const client = read("assets/assessment.js");
  const build = read("scripts/build.js");
  const contactFlow = client.slice(client.indexOf("async function submitLead"), client.indexOf("function restart"));

  assert.match(client, /error\.code = data\.code/);
  assert.match(contactFlow, /emailInput\?\.setAttribute\("aria-invalid", "true"\)/);
  assert.match(contactFlow, /setStatus\(storageStatus, error\.message\)/);
  assert.ok(contactFlow.indexOf("postJson(config.endpoints.contact") < contactFlow.indexOf("clearDraft()"));
  const failedSubmissionFlow = contactFlow.slice(contactFlow.indexOf("catch (error)"));
  assert.doesNotMatch(failedSubmissionFlow, /clearDraft\(\)/);
  assert.match(build, /aria-describedby="assessmentContactStatus"/);
  assert.match(build, /id="assessmentContactStatus"[^>]*role="alert"/);
});

test("privacy notice describes the duplicate-submission email hash", () => {
  const privacy = read("content/pages/privacy.json");
  assert.match(privacy, /one-way hash of the normalised email address/i);
  assert.match(privacy, /prevent repeat assessment submissions/i);
});
