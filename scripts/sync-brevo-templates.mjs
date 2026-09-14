import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { renderTemplateHtml, renderTemplateText, templates } from "../integrations/brevo/email-templates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "integrations/brevo/template-manifest.json");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(path.join(root, ".env"));
const currentManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const updateKey = (process.argv.find((argument) => argument.startsWith("--update=")) || "").slice("--update=".length);
if (updateKey && !templates.some(({ key }) => key === updateKey)) throw new Error(`Unknown template key: ${updateKey}`);

for (const template of templates) {
  const outputBase = path.join(root, "integrations/brevo/templates", template.key);
  fs.writeFileSync(`${outputBase}.html`, `${renderTemplateHtml(template)}\n`);
  fs.writeFileSync(`${outputBase}.txt`, renderTemplateText(template));
}

if (process.argv.includes("--render-only")) {
  const syncedKeys = new Set(currentManifest.draftLibrary?.templates?.map(({ key }) => key) || []);
  currentManifest.draftLibrary = {
    ...(currentManifest.draftLibrary || {}),
    pendingTemplates: templates.filter(({ key }) => !syncedKeys.has(key)).map(({ key }) => key),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(currentManifest, null, 2)}\n`);
  console.log(JSON.stringify({ rendered: templates.length, pendingTemplates: currentManifest.draftLibrary.pendingTemplates }, null, 2));
  process.exit(0);
}

const apiKey = String(process.env.BREVO_API_KEY || "").trim();
const senderId = Number(process.env.BREVO_TEMPLATE_SENDER_ID || 1);
if (!apiKey) throw new Error("BREVO_API_KEY is required.");
if (!Number.isInteger(senderId) || senderId <= 0) throw new Error("BREVO_TEMPLATE_SENDER_ID must be a positive integer.");

async function brevo(pathname, options = {}) {
  const response = await fetch(`https://api.brevo.com/v3${pathname}`, {
    ...options,
    headers: { accept: "application/json", "api-key": apiKey, ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${payload.message || text || response.statusText}`);
  return payload;
}

async function listTemplates(active) {
  const query = new URLSearchParams({ templateStatus: String(active), limit: "100", offset: "0", sort: "desc" });
  return (await brevo(`/smtp/templates?${query}`)).templates || [];
}

const [activeTemplates, inactiveTemplates] = await Promise.all([listTemplates(true), listTemplates(false)]);
const existingTemplates = [...activeTemplates, ...inactiveTemplates];
const syncedTemplates = [];

for (const template of templates) {
  const recorded = currentManifest.draftLibrary?.templates?.find(({ key }) => key === template.key);
  const existing = existingTemplates.find((entry) => entry.id === recorded?.templateId) || existingTemplates.find((entry) => entry.name === template.templateName);
  if (existing) {
    if (existing.isActive) throw new Error(`Refusing to modify active template: ${template.templateName}`);
    if (updateKey === template.key) {
      await brevo(`/smtp/templates/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify({ sender: { id: senderId }, templateName: template.templateName, subject: template.subject, htmlContent: renderTemplateHtml(template), isActive: false, tag: template.tag }),
      });
      syncedTemplates.push({ ...template, templateId: existing.id, status: "inactive", action: "updated" });
    } else {
      syncedTemplates.push({ ...template, templateId: existing.id, status: "inactive", action: "existing" });
    }
    continue;
  }
  const created = await brevo("/smtp/templates", {
    method: "POST",
    body: JSON.stringify({ sender: { id: senderId }, templateName: template.templateName, subject: template.subject, htmlContent: renderTemplateHtml(template), isActive: false, tag: template.tag }),
  });
  syncedTemplates.push({ ...template, templateId: created.id, status: "inactive", action: "created" });
}

const extractParameters = (template) => Array.from(`${template.closing} ${JSON.stringify(template.details || [])}`.matchAll(/\{\{ params\.([a-z0-9_]+) \}\}/g), (match) => match[1]);
const nextManifest = {
  ...currentManifest,
  draftLibrary: {
    senderId,
    syncRule: "Create missing templates. Modify an inactive template only with an explicit --update key. Never activate templates.",
    pendingTemplates: [],
    templates: syncedTemplates.map((template) => ({
      key: template.key,
      templateId: template.templateId,
      name: template.templateName,
      subject: template.subject,
      classification: template.classification,
      status: template.status,
      tag: template.tag,
      parameters: [...new Set([...(template.cta ? [template.cta.parameter] : []), ...(template.parameters || []), ...(template.classification === "marketing" ? ["telegram_url", "tiktok_url", "instagram_url", "youtube_url"] : []), ...extractParameters(template)])],
    })),
  },
};
fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

console.log(JSON.stringify({
  senderId,
  created: syncedTemplates.filter((template) => template.action === "created").length,
  existing: syncedTemplates.filter((template) => template.action === "existing").length,
  updated: syncedTemplates.filter((template) => template.action === "updated").length,
  templates: syncedTemplates.map(({ key, templateId, status, action }) => ({ key, templateId, status, action })),
}, null, 2));
