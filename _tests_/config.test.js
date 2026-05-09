import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createDotFile,
  readAppConfig,
  readDotFile,
  writeDotFile,
} from "../src/config.js";

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "atomic-bomb-"));

test("readAppConfig reads package metadata for the CLI", () => {
  const dir = makeTempDir();
  const packagePath = path.join(dir, "package.json");

  fs.writeFileSync(
    packagePath,
    JSON.stringify({
      name: "atomic-bomb",
      version: "1.2.3",
      author: "Test Author",
      config: {
        templates: "https://example.com/templates.git",
      },
    }),
  );

  assert.deepEqual(readAppConfig(packagePath), {
    name: "atomic-bomb",
    banner: "AtomicBomb",
    version: "1.2.3",
    author: "Test Author",
    templateRepository: "https://example.com/templates.git",
  });
});

test("createDotFile copies the platform config when missing", () => {
  const dir = makeTempDir();
  const templatePath = path.join(dir, "templates");
  const dotFilePath = path.join(dir, ".atomic-bomb");

  fs.mkdirSync(templatePath);
  fs.writeFileSync(
    path.join(templatePath, "react.json"),
    JSON.stringify({
      search: "react",
      extension: "tsx",
      platform: "react",
      destination: "src/components",
      scss: true,
    }),
  );

  createDotFile({ dotFilePath, platform: "react", templatePath });

  assert.equal(fs.existsSync(dotFilePath), true);
  assert.equal(
    JSON.parse(fs.readFileSync(dotFilePath, "utf8")).platform,
    "react",
  );
});

test("writeDotFile overwrites the existing platform config", () => {
  const dir = makeTempDir();
  const templatePath = path.join(dir, "templates");
  const dotFilePath = path.join(dir, ".atomic-bomb");

  fs.mkdirSync(templatePath);
  fs.writeFileSync(
    path.join(templatePath, "react-ts.json"),
    JSON.stringify({
      search: "react",
      extension: "tsx",
      platform: "react-ts",
      destination: "src/components",
      scss: true,
    }),
  );
  fs.writeFileSync(
    dotFilePath,
    JSON.stringify({
      search: "react",
      extension: "js",
      platform: "react",
      destination: "src/components",
      scss: true,
    }),
  );

  writeDotFile({ dotFilePath, platform: "react-ts", templatePath });

  assert.equal(
    JSON.parse(fs.readFileSync(dotFilePath, "utf8")).platform,
    "react-ts",
  );
});

test("readDotFile applies defaults for optional config values", () => {
  const dir = makeTempDir();
  const dotFilePath = path.join(dir, ".atomic-bomb");

  fs.writeFileSync(
    dotFilePath,
    JSON.stringify({
      search: "react",
      platform: "react",
      destination: "src/components",
      scss: false,
    }),
  );

  assert.deepEqual(readDotFile(dotFilePath), {
    search: "react",
    extension: "js",
    platform: "react",
    destination: "src/components",
    scss: false,
  });
});
