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
import {
  defaultAiApiKeyEnv,
  defaultAiBaseUrl,
  defaultAiModel,
  defaultAiProvider,
  defaultSkillPath,
  promptAiConfig,
} from "../src/ai-config.js";

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "atomic-bomb-"));

const stripAnsi = (value) =>
  value.replace(/\u001b\[[0-9;]*m/g, "");

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

test("readDotFile reports malformed JSON in .atomic-bomb", () => {
  const dir = makeTempDir();
  const dotFilePath = path.join(dir, ".atomic-bomb");
  const originalLog = console.log;
  const originalExit = process.exit;
  const messages = [];

  fs.writeFileSync(
    dotFilePath,
    [
      "{",
      '  "search": "react",',
      '  "extension": "tsx",',
      '  "platform": "react-ts",',
      '  "destination": "src/components",',
      '  "scss": true',
      '  "ai": {',
      '    "enabled": true',
      "  }",
      "}",
    ].join("\n"),
  );

  console.log = (message) => messages.push(stripAnsi(message));
  process.exit = (code) => {
    throw Object.assign(new Error("process.exit"), { code });
  };

  try {
    assert.throws(() => readDotFile(dotFilePath), {
      code: 1,
    });
  } finally {
    console.log = originalLog;
    process.exit = originalExit;
  }

  assert.equal(
    messages
      .join("\n")
      .startsWith(
        "💀 .atomic-bomb: oops: Expected ',' or '}' after property value in JSON",
      ),
    true,
  );
});

test("writeDotFile stores optional ai provider config", () => {
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

  writeDotFile({
    aiConfig: {
      enabled: true,
      provider: "openai-compatible",
      baseUrl: "https://api.example.com/v1",
      model: "example-model",
      apiKeyEnv: "EXAMPLE_API_KEY",
      skillPath: defaultSkillPath,
    },
    dotFilePath,
    platform: "react-ts",
    templatePath,
  });

  assert.deepEqual(readDotFile(dotFilePath), {
    search: "react",
    extension: "tsx",
    platform: "react-ts",
    destination: "src/components",
    scss: true,
    ai: {
      enabled: true,
      provider: "openai-compatible",
      baseUrl: "https://api.example.com/v1",
      model: "example-model",
      apiKeyEnv: "EXAMPLE_API_KEY",
      skillPath: defaultSkillPath,
    },
  });
});

test("promptAiConfig preserves existing config in non-interactive shells", async () => {
  const existingAiConfig = {
    enabled: true,
    provider: "ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "llama3.2",
    skillPath: defaultSkillPath,
  };

  assert.deepEqual(
    await promptAiConfig({
      existingAiConfig,
      input: {},
      output: {},
    }),
    existingAiConfig,
  );
});

test("promptAiConfig only asks for OpenAI API key env in interactive shells", async () => {
  const questions = [];
  const answers = ["y", ""];

  assert.deepEqual(
    await promptAiConfig({
      defaultSkillPath,
      isInteractive: true,
      question: async (message) => {
        questions.push(message);
        return answers.shift();
      },
    }),
    {
      enabled: true,
      provider: defaultAiProvider,
      baseUrl: defaultAiBaseUrl,
      model: defaultAiModel,
      apiKeyEnv: defaultAiApiKeyEnv,
      skillPath: defaultSkillPath,
    },
  );
  assert.deepEqual(questions, [
    "Configure AI provider for --ai? [y/N]: ",
    "OpenAI API key environment variable name (OPENAI_API_KEY): ",
  ]);
});
