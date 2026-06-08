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

test("processTemplates names Storybook stories for their component scope", () => {
  const cases = [
    { scope: [], title: "atoms/Button" },
    {
      scope: ["domains", "Orders"],
      title: "domains/Orders/atoms/Button",
    },
    {
      scope: ["domains", "Orders", "Sales"],
      title: "domains/Orders/Sales/atoms/Button",
    },
    {
      scope: ["modules", "UserManager"],
      title: "modules/UserManager/atoms/Button",
    },
    {
      scope: ["domains", "Orders", "modules", "Checkout"],
      title: "domains/Orders/modules/Checkout/atoms/Button",
    },
    {
      scope: ["domains", "Orders", "Sales", "modules", "UserManager"],
      title: "domains/Orders/Sales/modules/UserManager/atoms/Button",
    },
  ];

  for (const { scope, title } of cases) {
    const dir = makeTempDir();
    const templatePath = path.join(dir, "templates");
    const platformDir = path.join(templatePath, "react");
    const componentsDir = path.join(dir, "components");
    const destination = path.join(componentsDir, "atoms/Button");

    fs.mkdirSync(platformDir, { recursive: true });
    fs.mkdirSync(destination, { recursive: true });
    fs.mkdirSync(path.join(componentsDir, "atoms"), { recursive: true });
    fs.writeFileSync(
      path.join(platformDir, "[NAME].stories.js"),
      'const meta = { title: "[TYPE]/[NAME]" }\n',
    );

    silenceConsole(() =>
      processTemplates({
        platform: "react",
        type: "atom",
        name: "Button",
        storybookScope: scope,
        destination,
        componentsDir,
        extension: "js",
        scss: false,
        templatePath,
      }),
    );

    assert.equal(
      fs.readFileSync(path.join(destination, "Button.stories.js"), "utf8"),
      `const meta = { title: "${title}" }\n`,
    );
  }
});
