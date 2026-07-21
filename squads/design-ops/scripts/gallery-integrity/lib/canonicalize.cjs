"use strict";

const crypto = require("crypto");

const VOLATILE_KEYS = new Set(["generatedAt", "_timestamp", "_buildId", "_random"]);

function sortJson(val) {
  if (Array.isArray(val)) return val.map(sortJson);
  if (!val || typeof val !== "object") return val;
  const out = {};
  for (const key of Object.keys(val).sort()) {
    out[key] = sortJson(val[key]);
  }
  return out;
}

function stripVolatile(val) {
  if (Array.isArray(val)) return val.map(stripVolatile);
  if (!val || typeof val !== "object") return val;
  const out = {};
  for (const [key, value] of Object.entries(val)) {
    if (!VOLATILE_KEYS.has(key)) out[key] = stripVolatile(value);
  }
  return out;
}

function canonicalize(obj) {
  if (obj == null) return "";
  return JSON.stringify(sortJson(stripVolatile(obj)));
}

function sha256(str) {
  return `sha256:${crypto.createHash("sha256").update(String(str)).digest("hex")}`;
}

function hashObj(obj) {
  if (obj == null) return null;
  return sha256(canonicalize(obj));
}

function hashText(text) {
  if (text == null) return null;
  return sha256(String(text));
}

module.exports = { canonicalize, sha256, hashObj, hashText, sortJson, stripVolatile };
