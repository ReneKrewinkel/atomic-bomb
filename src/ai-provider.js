import fs from "fs-extra";
import path from "node:path";
import { check, error } from "./logger.js";

const textExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".scss",
  ".ts",
  ".tsx",
]);

const atomicTypes = new Set([
  "atom",
  "molecule",
  "organism",
  "template",
  "page",
]);
const atomicTypeOrder = {
  atom: 0,
  molecule: 1,
  organism: 2,
  template: 3,
  page: 4,
};

const readTextFile = (filePath) => fs.readFileSync(filePath, "utf8");

const listFilesRecursive = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => !item.name.startsWith("."))
    .flatMap((item) => {
      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) return listFilesRecursive(itemPath);
      if (!textExtensions.has(path.extname(item.name))) return [];

      return [itemPath];
    })
    .sort();
};

const readFiles = ({ baseDir = ".", files }) =>
  files
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => ({
      path: path.relative(baseDir, filePath),
      content: readTextFile(filePath),
    }));

const isPrimaryGeneratedFile = (filePath) => {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);

  if (!textExtensions.has(ext)) return false;
  if (fileName.startsWith("index.")) return true;
  if (ext === ".mdx") return true;
  if (
    /\.(?:js|jsx|ts|tsx)$/.test(fileName) &&
    !/\.(?:mock|stories|test)\.(?:js|jsx|ts|tsx)$/.test(fileName)
  ) {
    return true;
  }
  if (/^[A-Z][A-Za-z0-9]*\.(?:js|jsx|ts|tsx)$/.test(fileName)) return true;
  if (/^[A-Z][A-Za-z0-9]*\.interface\.(?:js|jsx|ts|tsx)$/.test(fileName)) {
    return true;
  }
  if (/^_[A-Z][A-Za-z0-9]*\.style\.scss$/.test(fileName)) return true;

  return false;
};

const readGeneratedTargetFiles = ({ targetDirs }) =>
  readFiles({
    files: targetDirs
      .flatMap((dir) => listFilesRecursive(dir))
      .filter(isPrimaryGeneratedFile),
  }).map((file) => ({
    ...file,
    content:
      file.content.length > 4000
        ? `${file.content.slice(0, 4000)}\n/* ...truncated... */`
        : file.content,
  }));

const readSkillFiles = (skillPath) => {
  if (!skillPath || !fs.existsSync(skillPath)) {
    error(`AI skillPath not found: ${skillPath}`);
  }

  const skillDir = fs.statSync(skillPath).isDirectory()
    ? skillPath
    : path.dirname(skillPath);
  const files = [
    path.join(skillDir, "index.md"),
    ...listFilesRecursive(skillDir).filter(
      (filePath) => path.basename(filePath) !== "index.md",
    ),
  ].filter((filePath, index, items) => items.indexOf(filePath) === index);

  return readFiles({ files });
};

const readProjectContext = () => {
  const knownFiles = [
    "package.json",
    ".atomic-bomb",
    "src/components/index.ts",
    "src/components/index.js",
    "src/components/_types_/index.ts",
    "src/components/_types_/index.js",
    "src/components/atoms/index.tsx",
    "src/components/atoms/index.jsx",
    "src/components/atoms/index.js",
    "src/components/molecules/index.tsx",
    "src/components/molecules/index.jsx",
    "src/components/molecules/index.js",
    "src/components/organisms/index.tsx",
    "src/components/organisms/index.jsx",
    "src/components/organisms/index.js",
    "src/components/pages/index.tsx",
    "src/components/pages/index.jsx",
    "src/components/pages/index.js",
    "src/resources/design/tokens.json",
    "src/resources/styles/main.scss",
  ];

  return readFiles({ files: knownFiles });
};

const getApiKey = ({ apiConfig }) => {
  if (!apiConfig.apiKeyEnv) return undefined;

  const result = process.env[apiConfig.apiKeyEnv];

  if (!result) error(`${apiConfig.apiKeyEnv} is not set`);

  return result;
};

const parseJsonResponse = (content) => {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);

  return JSON.parse(fenced ? fenced[1] : trimmed);
};

const chat = async ({ aiConfig, messages }) => {
  const baseUrl = aiConfig.baseUrl || "https://api.openai.com/v1";
  const model = aiConfig.model || "gpt-5-mini";
  const apiKey = getApiKey({ apiConfig: aiConfig });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(aiConfig.timeoutMs) || 120000,
  );
  let response;

  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        messages,
        model,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") {
      error("AI provider request timed out");
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();

    error(`AI provider request failed (${response.status}): ${body}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;

  if (!content) error("AI provider returned no message content");

  try {
    return parseJsonResponse(content);
  } catch (err) {
    error(`AI provider returned invalid JSON: ${err.message}`);
  }
};

const systemPrompt =
  "You are the Atomic Bomb AI provider adapter. Return only valid JSON. Follow the installed Atomic Bomb skill instructions. Do not use Markdown outside JSON.";

const describeRequest = ({ options }) =>
  JSON.stringify(
    {
      forDomain: options.forDomain,
      forSubdomain: options.forSubdomain,
      names: options.names,
      prompt: options.prompt || "",
      type: options.type,
    },
    null,
    2,
  );

export const createAiScaffoldPlan = async ({ aiConfig, options, skillFiles }) =>
  chat({
    aiConfig,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          "Create an Atomic Bomb scaffold plan for this request.",
          "Return JSON shaped as:",
          '{"items":[{"type":"atom|molecule|organism|template|page","name":"PascalCaseName","reason":"short reason"}],"notes":["short note"]}',
          "Only include extra items that should be scaffolded in addition to the requested item.",
          "For page-level features, include the complete Atomic Design chain: atoms, molecules and organisms needed by the page.",
          "For organism-level features, include the atoms and molecules needed by the organism.",
          "Do not skip base atoms for labels, text, inputs, buttons, icons, loading states or feedback states.",
          "Use ButtonGroup as the molecule for primary/secondary actions.",
          "Use Form as the organism for form-like feature requests.",
          "Do not include hooks, libs, domains or subdomains in this plan yet.",
          "",
          "Request:",
          describeRequest({ options }),
          "",
          "Skill files:",
          JSON.stringify(skillFiles),
          "",
          "Project context:",
          JSON.stringify(readProjectContext()),
        ].join("\n"),
      },
    ],
  });

export const createAiFilePlan = async ({
  aiConfig,
  options,
  scaffoldPlan,
  skillFiles,
  targetDirs,
}) =>
  chat({
    aiConfig,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          "Complete the generated Atomic Bomb files for this request.",
          "Return JSON shaped as:",
          '{"files":[{"path":"relative/path/from/project/root","content":"complete file content"}],"notes":["short note"]}',
          "Only write text files. Paths must be relative to the project root. Prefer replacing primary component, interface, style and index files.",
          "Complete every generated MDX documentation file with useful request-specific documentation while preserving its Meta and Source blocks.",
          "Document purpose, public API, expected inputs and outputs, usage guidance, and important behavior supported by the generated source.",
          "Do not return mock, story or test files unless they materially need custom content for this request.",
          "Do not write files inside .skills.",
          "",
          "Request:",
          describeRequest({ options }),
          "",
          "Scaffold plan:",
          JSON.stringify(scaffoldPlan),
          "",
          "Skill files:",
          JSON.stringify(skillFiles),
          "",
          "Project context:",
          JSON.stringify(readProjectContext()),
          "",
          "Generated target files:",
          JSON.stringify(readGeneratedTargetFiles({ targetDirs })),
        ].join("\n"),
      },
    ],
  });

export const createAiValidationPlan = async ({
  aiConfig,
  options,
  scaffoldPlan,
  skillFiles,
  targetDirs,
}) =>
  chat({
    aiConfig,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          "Validate the generated Atomic Bomb software for this request.",
          "Return JSON shaped as:",
          '{"passed":true,"issues":[{"severity":"critical|high|medium|low","path":"relative/path/from/project/root","line":1,"message":"specific issue","suggestion":"specific fix"}],"notes":["short note"]}',
          "Do not rewrite files in this step.",
          "Validate against every installed skill instruction and the request-specific prompt.",
          "Check for bugs, prop/API mismatches, controlled input problems, missing handlers, broken imports, barrel export mistakes, invalid TypeScript/React usage, Sass/token misuse, accessibility issues and usability gaps.",
          "Mark passed false when any issue would make the generated component incorrect, hard to use, inaccessible or inconsistent with the Atomic Bomb skill.",
          "",
          "Request:",
          describeRequest({ options }),
          "",
          "Scaffold plan:",
          JSON.stringify(scaffoldPlan),
          "",
          "Skill files:",
          JSON.stringify(skillFiles),
          "",
          "Project context:",
          JSON.stringify(readProjectContext()),
          "",
          "Generated target files after AI file completion:",
          JSON.stringify(readGeneratedTargetFiles({ targetDirs })),
        ].join("\n"),
      },
    ],
  });

export const validateScaffoldPlan = ({ items = [] }) =>
  items
    .filter((item) => atomicTypes.has(item.type))
    .filter((item) => /^[A-Z][A-Za-z0-9]*$/.test(item.name));

const hasFormIntent = ({ options }) =>
  [...(options.names || []), options.prompt || ""]
    .join(" ")
    .toLowerCase()
    .match(
      /\b(action|button|cancel|field|form|input|intake|label|loading|save|search|submit|success|text|ticket|title)\b/,
    );

const standardAtomicStack = [
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
];

export const getRequiredScaffoldItems = ({ options }) => {
  if (!hasFormIntent({ options })) return [];

  if (options.type === "page") return standardAtomicStack;

  if (options.type === "organism") {
    return standardAtomicStack.filter((item) => item.type !== "organism");
  }

  if (options.type === "molecule") {
    return standardAtomicStack.filter((item) => item.type === "atom");
  }

  return [];
};

const scaffoldKey = (item) => `${item.type}:${item.name}`;

export const mergeScaffoldPlan = ({ options, scaffoldPlan = {} }) => {
  const requestedKeys = new Set(
    (options.names || []).map((name) =>
      scaffoldKey({ type: options.type, name }),
    ),
  );
  const items = [
    ...getRequiredScaffoldItems({ options }),
    ...validateScaffoldPlan(scaffoldPlan),
  ];
  const seen = new Set();

  return {
    ...scaffoldPlan,
    items: items
      .filter((item) => !requestedKeys.has(scaffoldKey(item)))
      .filter((item) => {
        const key = scaffoldKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => atomicTypeOrder[a.type] - atomicTypeOrder[b.type]),
  };
};

const assertSafeRelativePath = (filePath) => {
  if (!filePath || path.isAbsolute(filePath)) {
    error(`AI returned unsafe path: ${filePath}`);
  }

  const normalized = path.normalize(filePath);

  if (
    normalized.startsWith("..") ||
    normalized === ".atomic-bomb" ||
    normalized.startsWith(".skills")
  ) {
    error(`AI returned unsafe path: ${filePath}`);
  }

  return normalized;
};

export const applyAiFiles = ({ files = [] }) => {
  files.forEach((item) => {
    const filePath = assertSafeRelativePath(item.path);

    fs.ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, item.content);
    check(`🧠 ${filePath}`);
  });
};

const formatValidationIssue = (issue) => {
  const location = [
    issue.path || "unknown path",
    issue.line ? `:${issue.line}` : "",
  ].join("");
  const severity = issue.severity || "issue";
  const suggestion = issue.suggestion ? ` Fix: ${issue.suggestion}` : "";

  return `${severity} ${location} - ${issue.message || "No message"}${suggestion}`;
};

export const assertAiValidationPassed = (validationPlan = {}) => {
  const issues = Array.isArray(validationPlan.issues)
    ? validationPlan.issues
    : [];

  if (validationPlan.passed === true && issues.length === 0) {
    check("🧪 AI validation passed");
    return;
  }

  error(
    [
      "AI validation failed:",
      ...issues.map((issue) => `- ${formatValidationIssue(issue)}`),
      ...(issues.length === 0
        ? ["- Provider returned passed=false without issues"]
        : []),
    ].join("\n"),
  );
};

export const runOpenAiCompatibleGeneration = async ({
  aiConfig,
  expandScaffold = true,
  createExtraScaffold,
  options,
  targetDirs,
  validate = false,
}) => {
  const skillFiles = readSkillFiles(aiConfig.skillPath);
  const scaffoldPlan = expandScaffold
    ? await createAiScaffoldPlan({
        aiConfig,
        options,
        skillFiles,
      })
    : { items: [], notes: [] };
  const mergedScaffoldPlan = expandScaffold
    ? mergeScaffoldPlan({ options, scaffoldPlan })
    : scaffoldPlan;
  const extraItems = mergedScaffoldPlan.items;
  const extraTargetDirs = [];

  for (const item of extraItems) {
    const targetDir = createExtraScaffold?.(item);
    if (targetDir) extraTargetDirs.push(targetDir);
  }

  const filePlan = await createAiFilePlan({
    aiConfig,
    options,
    scaffoldPlan: mergedScaffoldPlan,
    skillFiles,
    targetDirs: [...targetDirs, ...extraTargetDirs],
  });

  applyAiFiles({ files: filePlan.files || [] });

  const validationPlan = validate
    ? await createAiValidationPlan({
        aiConfig,
        options,
        scaffoldPlan: mergedScaffoldPlan,
        skillFiles,
        targetDirs: [...targetDirs, ...extraTargetDirs],
      })
    : false;

  if (validationPlan) assertAiValidationPassed(validationPlan);

  return {
    extraItems,
    filePlan,
    scaffoldPlan: mergedScaffoldPlan,
    validationPlan,
  };
};
