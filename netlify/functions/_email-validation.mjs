import { resolve4, resolve6, resolveMx } from "node:dns/promises";
import { domainToASCII } from "node:url";

const localPartPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const domainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const unavailableTopLevelDomains = new Set(["example", "invalid", "local", "localhost", "test"]);
const unavailableDomains = new Set(["example.com", "example.net", "example.org"]);
const commonDomainTypos = new Map([
  ["gamil.com", "gmail.com"],
  ["gmai.com", "gmail.com"],
  ["gmail.co", "gmail.com"],
  ["gmail.con", "gmail.com"],
  ["gmial.com", "gmail.com"],
  ["hotmai.com", "hotmail.com"],
  ["hotmial.com", "hotmail.com"],
  ["outllook.com", "outlook.com"],
  ["outlok.com", "outlook.com"],
  ["yaho.com", "yahoo.com"],
]);

const permanentDnsErrors = new Set(["ENODATA", "ENODOMAIN", "ENOTFOUND", "NOTFOUND", "NXDOMAIN"]);

export function normalizeEmail(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 254 || /\s/.test(raw)) return "";

  const separator = raw.lastIndexOf("@");
  if (separator <= 0 || separator !== raw.indexOf("@") || separator === raw.length - 1) return "";

  const localPart = raw.slice(0, separator).toLowerCase();
  const domain = domainToASCII(raw.slice(separator + 1).toLowerCase());
  if (
    !domain ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !localPartPattern.test(localPart)
  ) return "";

  const labels = domain.split(".");
  if (domain.length > 253 || labels.length < 2 || labels.some((label) => !domainLabelPattern.test(label))) return "";
  return `${localPart}@${domain}`;
}

function result(valid, code, message, normalizedEmail = "", verification = "") {
  return { valid, code, message, normalizedEmail, verification };
}

function withTimeout(operation, timeoutMs) {
  let timer;
  return Promise.race([
    operation,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error("Email-domain check timed out");
        error.code = "ETIMEOUT";
        reject(error);
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function lookup(resolver, domain, timeoutMs) {
  try {
    const records = await withTimeout(Promise.resolve().then(() => resolver(domain)), timeoutMs);
    return { status: Array.isArray(records) && records.length ? "found" : "missing", records: records || [] };
  } catch (error) {
    return {
      status: permanentDnsErrors.has(String(error?.code || "").toUpperCase()) ? "missing" : "inconclusive",
      records: [],
    };
  }
}

export async function validateEmailDeliverability(value, options = {}) {
  const normalizedEmail = normalizeEmail(value);
  if (!normalizedEmail) {
    return result(false, "email_invalid", "Please enter a complete, valid email address.");
  }

  const [localPart, domain] = normalizedEmail.split("@");
  const suggestedDomain = commonDomainTypos.get(domain);
  if (suggestedDomain) {
    return result(
      false,
      "email_domain_typo",
      `Did you mean ${localPart}@${suggestedDomain}? Please check your email address.`,
      normalizedEmail
    );
  }

  const topLevelDomain = domain.split(".").at(-1);
  if (unavailableDomains.has(domain) || unavailableTopLevelDomains.has(topLevelDomain)) {
    return result(
      false,
      "email_domain_unavailable",
      "That email domain cannot receive your result. Please use a working email address.",
      normalizedEmail
    );
  }

  const timeoutMs = Math.max(250, Number(options.timeoutMs) || 2500);
  const resolveMxFn = options.resolveMx || resolveMx;
  const resolve4Fn = options.resolve4 || resolve4;
  const resolve6Fn = options.resolve6 || resolve6;
  const mx = await lookup(resolveMxFn, domain, timeoutMs);

  if (mx.status === "found") {
    const acceptsMail = mx.records.some((record) => String(record?.exchange || "").replace(/\.$/, "") !== "");
    if (acceptsMail) return result(true, "email_domain_verified", "", normalizedEmail, "mx");
    return result(
      false,
      "email_domain_unavailable",
      "That email domain does not accept email. Please use a working email address.",
      normalizedEmail
    );
  }

  if (mx.status === "inconclusive") {
    return result(true, "email_domain_check_deferred", "", normalizedEmail, "inconclusive");
  }

  const addresses = await Promise.all([
    lookup(resolve4Fn, domain, timeoutMs),
    lookup(resolve6Fn, domain, timeoutMs),
  ]);
  if (addresses.some((outcome) => outcome.status === "found")) {
    return result(true, "email_domain_verified", "", normalizedEmail, "address");
  }
  if (addresses.some((outcome) => outcome.status === "inconclusive")) {
    return result(true, "email_domain_check_deferred", "", normalizedEmail, "inconclusive");
  }

  return result(
    false,
    "email_domain_unavailable",
    "We could not find a working email service for that address. Please check it and try again.",
    normalizedEmail
  );
}
