import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkPlatform,
  processTemplates,
  pullPlatforms,
} from "../src/templates.js";

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "atomic-bomb-"));

const silenceConsole = (fn) => {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
};

test("pullPlatforms returns visible template directories", () => {
  const templatePath = makeTempDir();

  fs.mkdirSync(path.join(templatePath, "react"));
  fs.mkdirSync(path.join(templatePath, ".git"));
  fs.writeFileSync(path.join(templatePath, "react.json"), "{}");

  assert.deepEqual(pullPlatforms(templatePath), ["react"]);
});

test("checkPlatform returns platform settings", () => {
  const templatePath = makeTempDir();

  fs.mkdirSync(path.join(templatePath, "react"));
  fs.writeFileSync(
    path.join(templatePath, "react.json"),
    JSON.stringify({
      search: "react",
      platform: "react",
      destination: "src/components",
      scss: true,
    }),
  );

  assert.deepEqual(checkPlatform({ platform: "react", templatePath }), {
    search: "react",
    platform: "react",
    destination: "src/components",
    scss: true,
  });
});

test("processTemplates writes rendered files and index exports", () => {
  const dir = makeTempDir();
  const templatePath = path.join(dir, "templates");
  const platformDir = path.join(templatePath, "react");
  const componentsDir = path.join(dir, "src/components");
  const destination = path.join(componentsDir, "atoms/Button");

  fs.mkdirSync(platformDir, { recursive: true });
  fs.mkdirSync(destination, { recursive: true });
  fs.mkdirSync(path.join(componentsDir, "atoms"), { recursive: true });
  fs.writeFileSync(path.join(componentsDir, "atoms/_index.scss"), "");
  fs.writeFileSync(
    path.join(platformDir, "[NAME].js"),
    "export default function [NAME]() { return '[TYPE]'; }\n",
  );

  silenceConsole(() =>
    processTemplates({
      platform: "react",
      type: "atom",
      name: "Button",
      destination,
      componentsDir,
      extension: "js",
      scss: true,
      templatePath,
    }),
  );

  assert.equal(
    fs.readFileSync(path.join(destination, "Button.js"), "utf8"),
    "export default function Button() { return 'atoms'; }\n",
  );
  assert.match(
    fs.readFileSync(path.join(componentsDir, "atoms/_index.scss"), "utf8"),
    /@use '\.\/Button';/,
  );
  assert.match(
    fs.readFileSync(path.join(componentsDir, "atoms/index.js"), "utf8"),
    /export \{ default as Button \} from '\.\/Button'/,
  );
});
