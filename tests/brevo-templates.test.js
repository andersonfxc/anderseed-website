const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
let renderTemplateHtml;
let renderTemplateText;
let templates;

test.before(async () => {
  ({ renderTemplateHtml, renderTemplateText, templates } = await import("../integrations/brevo/email-templates.mjs"));
});

test("the Brevo draft library contains five marketing and five service templates", () => {
  assert.equal(templates.length, 10);
  assert.equal(templates.filter(({ classification }) => classification === "marketing").length, 5);
  assert.equal(templates.filter(({ classification }) => classification === "service").length, 5);
  assert.equal(new Set(templates.map(({ key }) => key)).size, templates.length);
  assert.equal(new Set(templates.map(({ templateName }) => templateName)).size, templates.length);
  assert.equal(new Set(templates.map(({ tag }) => tag)).size, templates.length);
});

test("the approved career email preserves the salary claim and supporting context", () => {
  const template = templates.find(({ key }) => key === "nurtureCareer");
  const html = renderTemplateHtml(template);
  const text = renderTemplateText(template);
  assert.equal(template.timing, "Day 24");
  assert.match(html, /Anderseed trainees have secured Business Analyst roles with salaries ranging from £41,000 to £55,000/);
  assert.match(html, /£23,000 for starters to £55,000 for experienced Business Analysts/);
  assert.match(text, /Salary and progression references: National Careers Service/);
  assert.match(html, /\{\{ params\.career_path_url \}\}/);
});

test("the assessment roadmap prompt is shown only when marketing consent is false", () => {
  const template = templates.find(({ key }) => key === "assessmentRoadmapDelivery");
  const html = renderTemplateHtml(template);
  assert.match(html, /\{% if not contact\.MARKETING_CONSENT %\}/);
  assert.match(html, /You are not currently subscribed to ongoing Anderseed emails/);
  assert.match(html, /\{\{ params\.preferences_url \}\}/);
  assert.match(html, /\{% endif %\}/);
});

test("every generated email is accessible, branded and uses configurable CTA URLs", () => {
  for (const template of templates) {
    const html = renderTemplateHtml(template);
    const text = renderTemplateText(template);
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<table role="presentation"/);
    assert.match(html, /Ander<span style="color:#7ed4a0">seed<\/span>/);
    assert.match(html, /\{\{ contact\.FIRSTNAME \}\}/);
    assert.doesNotMatch(html, /localhost|127\.0\.0\.1|example\.com/i);
    assert.doesNotMatch(html, /https?:\/\//i);
    assert.match(text, /Anderseed Consulting/);
    if (template.cta) assert.match(html, new RegExp(`\\{\\{ params\\.${template.cta.parameter} \\}\\}`));
  }
});

test("marketing drafts contain unsubscribe controls and service drafts remain separate", () => {
  for (const template of templates) {
    const html = renderTemplateHtml(template);
    if (template.classification === "marketing") {
      assert.match(html, /href="\{\{ unsubscribe \}\}"/);
      assert.match(html, /chose to receive practical BA tips/);
      assert.match(html, /Stay connected with Anderseed/);
      assert.match(html, /\{\{ params\.telegram_url \}\}/);
      assert.match(html, /\{\{ params\.tiktok_url \}\}/);
      assert.match(html, /\{\{ params\.instagram_url \}\}/);
      assert.match(html, /\{\{ params\.youtube_url \}\}/);
    } else {
      assert.doesNotMatch(html, /\{\{ unsubscribe \}\}/);
      assert.doesNotMatch(html, /Stay connected with Anderseed/);
      assert.match(html, /separate from marketing consent/);
    }
  }
});

test("the existing active roadmap template remains unchanged in the manifest", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "integrations/brevo/template-manifest.json"), "utf8"));
  assert.equal(manifest.roadmapDelivery.templateId, 1);
  assert.equal(manifest.roadmapDelivery.status, "active");
  assert.equal(manifest.roadmapDelivery.linkParameter, "roadmap_url");
});

test("the synced Brevo library is inactive and matches its version-controlled output", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "integrations/brevo/template-manifest.json"), "utf8"));
  const syncedKeys = manifest.draftLibrary.templates.map(({ key }) => key);
  const pendingKeys = manifest.draftLibrary.pendingTemplates || [];
  assert.equal(new Set([...syncedKeys, ...pendingKeys]).size, templates.length);
  assert.equal(new Set(manifest.draftLibrary.templates.map(({ templateId }) => templateId)).size, manifest.draftLibrary.templates.length);

  for (const template of templates) {
    const synced = manifest.draftLibrary.templates.find(({ key }) => key === template.key);
    if (synced) {
      assert.ok(synced.templateId > 1);
      assert.equal(synced.status, "inactive");
    } else {
      assert.ok(pendingKeys.includes(template.key));
    }
    assert.equal(
      fs.readFileSync(path.join(root, "integrations/brevo/templates", `${template.key}.html`), "utf8").trim(),
      renderTemplateHtml(template).trim()
    );
    assert.equal(
      fs.readFileSync(path.join(root, "integrations/brevo/templates", `${template.key}.txt`), "utf8"),
      renderTemplateText(template)
    );
  }
});
