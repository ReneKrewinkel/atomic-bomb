import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  applyAiFiles,
  assertAiValidationPassed,
  mergeScaffoldPlan,
  runOpenAiCompatibleGeneration,
  validateScaffoldPlan,
} from "../src/ai-provider.js";

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "atomic-bomb-"));

const silenceConsole = async (fn) => {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
};

test("validateScaffoldPlan keeps supported PascalCase component items", () => {
  assert.deepEqual(
    validateScaffoldPlan({
      items: [
        { type: "atom", name: "Button" },
        { type: "hook", name: "useData" },
        { type: "molecule", name: "searchBar" },
      ],
    }),
    [{ type: "atom", name: "Button" }],
  );
});

test("mergeScaffoldPlan adds required atomic stack for page form requests", () => {
  assert.deepEqual(
    mergeScaffoldPlan({
      options: {
        names: ["ServiceDesk"],
        prompt:
          "Create a ticket intake screen with title input, save/cancel actions, loading state, and success callback.",
        type: "page",
      },
      scaffoldPlan: {
        items: [{ type: "organism", name: "Form", reason: "Provider item" }],
      },
    }).items,
    [
      { type: "atom", name: "Label", reason: "Base text label primitive" },
      { type: "atom", name: "InputField", reason: "Base form input primitive" },
      { type: "atom", name: "Button", reason: "Base action primitive" },
      { type: "atom", name: "Icon", reason: "Base visual state primitive" },
      {
        type: "molecule",
        name: "ButtonGroup",
        reason: "Grouped primary and secondary actions",
      },
      { type: "organism", name: "Form", reason: "Feature form composition" },
    ],
  );
});

test("applyAiFiles writes safe relative files", async () => {
  const dir = makeTempDir();
  const cwd = process.cwd();

  try {
    process.chdir(dir);
    await silenceConsole(() =>
      applyAiFiles({
        files: [
          {
            path: "src/components/pages/ServiceDesk/ServiceDesk.tsx",
            content: "export default ServiceDesk\n",
          },
        ],
      }),
    );

    assert.equal(
      fs.readFileSync(
        path.join(dir, "src/components/pages/ServiceDesk/ServiceDesk.tsx"),
        "utf8",
      ),
      "export default ServiceDesk\n",
    );
  } finally {
    process.chdir(cwd);
  }
});

test("assertAiValidationPassed allows passing validations", async () => {
  await silenceConsole(() =>
    assertAiValidationPassed({
      issues: [],
      passed: true,
    }),
  );
});

test("runOpenAiCompatibleGeneration creates extra scaffold and applies returned files", async () => {
  const dir = makeTempDir();
  const cwd = process.cwd();
  const originalFetch = globalThis.fetch;
  const skillDir = path.join(dir, ".skills/atomic-bomb/1.2.3");
  const targetDir = path.join(dir, "src/components/pages/ServiceDesk");
  const responses = [
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [],
            }),
          },
        },
      ],
    },
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              files: [
                {
                  path: "src/components/pages/ServiceDesk/ServiceDesk.tsx",
                  content: "export const ServiceDesk = () => null\n",
                },
              ],
            }),
          },
        },
      ],
    },
  ];

  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "index.md"), "# Skill\n");
  fs.writeFileSync(path.join(targetDir, "ServiceDesk.tsx"), "template\n");

  globalThis.fetch = async () => ({
    json: async () => responses.shift(),
    ok: true,
  });

  try {
    process.chdir(dir);
    const result = await silenceConsole(() =>
      runOpenAiCompatibleGeneration({
        aiConfig: {
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          provider: "openai-compatible",
          skillPath: path.join(skillDir, "index.md"),
        },
        createExtraScaffold: (item) => {
          const extraDir = path.join(dir, "src/components/atoms", item.name);
          fs.mkdirSync(extraDir, { recursive: true });
          fs.writeFileSync(
            path.join(extraDir, `${item.name}.tsx`),
            "template\n",
          );
          return extraDir;
        },
        options: {
          names: ["ServiceDesk"],
          prompt: "Create a ticket intake screen.",
          type: "page",
        },
        targetDirs: [targetDir],
      }),
    );

    assert.deepEqual(result.extraItems, [
      { type: "atom", name: "Label", reason: "Base text label primitive" },
      { type: "atom", name: "InputField", reason: "Base form input primitive" },
      { type: "atom", name: "Button", reason: "Base action primitive" },
      { type: "atom", name: "Icon", reason: "Base visual state primitive" },
      {
        type: "molecule",
        name: "ButtonGroup",
        reason: "Grouped primary and secondary actions",
      },
      { type: "organism", name: "Form", reason: "Feature form composition" },
    ]);
    assert.equal(
      fs.readFileSync(path.join(targetDir, "ServiceDesk.tsx"), "utf8"),
      "export const ServiceDesk = () => null\n",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(cwd);
  }
});

test("runOpenAiCompatibleGeneration completes MDX without scaffold expansion", async () => {
  const dir = makeTempDir();
  const cwd = process.cwd();
  const originalFetch = globalThis.fetch;
  const skillDir = path.join(dir, ".skills/atomic-bomb/1.2.3");
  const targetDir = path.join(dir, "src/hooks/useOrders");
  const documentationPath = path.join(targetDir, "useOrders.mdx");
  let requestBody;

  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "index.md"), "# Skill\n");
  fs.writeFileSync(
    path.join(targetDir, "useOrders.ts"),
    "export default () => []\n",
  );
  fs.writeFileSync(
    documentationPath,
    '<Meta title="hooks/useOrders" />\n\nAdd Documentation here.\n',
  );

  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);

    return {
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                files: [
                  {
                    path: "src/hooks/useOrders/useOrders.mdx",
                    content:
                      '<Meta title="hooks/useOrders" />\n\nLoads the current orders.\n',
                  },
                ],
              }),
            },
          },
        ],
      }),
      ok: true,
    };
  };

  try {
    process.chdir(dir);
    const result = await silenceConsole(() =>
      runOpenAiCompatibleGeneration({
        aiConfig: {
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          provider: "openai-compatible",
          skillPath: path.join(skillDir, "index.md"),
        },
        expandScaffold: false,
        options: {
          names: ["useOrders"],
          type: "hook",
        },
        targetDirs: [targetDir],
      }),
    );

    assert.deepEqual(result.extraItems, []);
    assert.match(
      requestBody.messages[1].content,
      /Complete every generated MDX documentation file/,
    );
    assert.match(requestBody.messages[1].content, /useOrders\.mdx/);
    assert.equal(
      fs.readFileSync(documentationPath, "utf8"),
      '<Meta title="hooks/useOrders" />\n\nLoads the current orders.\n',
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(cwd);
  }
});

test("runOpenAiCompatibleGeneration validates generated files when requested", async () => {
  const dir = makeTempDir();
  const cwd = process.cwd();
  const originalFetch = globalThis.fetch;
  const skillDir = path.join(dir, ".skills/atomic-bomb/1.2.3");
  const targetDir = path.join(dir, "src/components/pages/ServiceDesk");
  const responses = [
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [],
            }),
          },
        },
      ],
    },
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              files: [
                {
                  path: "src/components/pages/ServiceDesk/ServiceDesk.tsx",
                  content: "export const ServiceDesk = () => null\n",
                },
              ],
            }),
          },
        },
      ],
    },
    {
      choices: [
        {
          message: {
            content: JSON.stringify({
              issues: [],
              notes: ["Looks consistent with the skill."],
              passed: true,
            }),
          },
        },
      ],
    },
  ];

  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "index.md"), "# Skill\n");
  fs.writeFileSync(path.join(targetDir, "ServiceDesk.tsx"), "template\n");

  globalThis.fetch = async () => ({
    json: async () => responses.shift(),
    ok: true,
  });

  try {
    process.chdir(dir);
    const result = await silenceConsole(() =>
      runOpenAiCompatibleGeneration({
        aiConfig: {
          baseUrl: "https://api.example.com/v1",
          model: "example-model",
          provider: "openai-compatible",
          skillPath: path.join(skillDir, "index.md"),
        },
        createExtraScaffold: (item) => {
          const extraDir = path.join(dir, "src/components/atoms", item.name);
          fs.mkdirSync(extraDir, { recursive: true });
          fs.writeFileSync(
            path.join(extraDir, `${item.name}.tsx`),
            "template\n",
          );
          return extraDir;
        },
        options: {
          names: ["ServiceDesk"],
          prompt: "Create a ticket intake screen.",
          type: "page",
        },
        targetDirs: [targetDir],
        validate: true,
      }),
    );

    assert.equal(result.validationPlan.passed, true);
    assert.deepEqual(result.validationPlan.issues, []);
    assert.equal(responses.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(cwd);
  }
});
