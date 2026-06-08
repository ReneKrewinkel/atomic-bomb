import test from "node:test";
import assert from "node:assert/strict";
import { getAiUnavailableMessage, parseArgs } from "../src/cli.js";
import { validComponentTypes } from "../src/project.js";

const parserOptions = {
  appName: "atomic-bomb",
  platforms: ["react", "react-ts", "react-native"],
};

const typeCases = [
  ["api", ["--for", "orders/sales"], "fetch orders", ["fetchOrders"]],
  ["atom", [], "data table", ["DataTable"]],
  ["event", ["--for", "orders/sales"], "order created", ["orderCreated"]],
  ["helper", ["--for", "orders/sales"], "format order", ["formatOrder"]],
  ["molecule", [], "button group", ["ButtonGroup"]],
  ["model", ["--for", "orders/sales"], "order summary", ["orderSummary"]],
  ["module", [], "user manager", ["UserManager"]],
  ["organism", [], "main nav", ["MainNav"]],
  ["template", [], "dashboard shell", ["DashboardShell"]],
  ["page", [], "home page", ["HomePage"]],
  ["lib", [], "format date", ["formatDate"]],
  ["hook", [], "use data", ["useData"]],
  ["domain", [], "sales orders", ["SalesOrders"]],
  ["service", [], "order service", ["orderService"]],
  ["state", ["--for", "orders/sales"], "order state", ["orderState"]],
  ["subdomain", ["--for", "orders"], "sales", ["Sales"]],
];

test("parseArgs accepts -p as platform alias", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "-p", "react-ts", "--name", "label"],
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "atom",
      names: ["Label"],
    },
  );
});

test("parseArgs allows --platform without --name", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--platform", "react-ts"],
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: null,
      names: [],
      platformOnly: true,
    },
  );
});

test("parseArgs allows -p without --name", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "-p", "react-native"],
      ...parserOptions,
    }),
    {
      platform: "react-native",
      type: null,
      names: [],
      platformOnly: true,
    },
  );
});

test("parseArgs lets explicit platform override dotfile platform", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--platform",
        "react-native",
        "--name",
        "button",
      ],
      dotConfig: {
        platform: "react",
      },
      ...parserOptions,
    }),
    {
      platform: "react-native",
      type: "atom",
      names: ["Button"],
    },
  );
});

test("parseArgs falls back to dotfile platform when no platform flag is used", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--name", "input"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "atom",
      names: ["Input"],
    },
  );
});

test("parseArgs supports every registered component type", () => {
  assert.deepEqual(
    typeCases.map(([type]) => type),
    validComponentTypes,
  );

  for (const [type, scopeArgs, name, names] of typeCases) {
    const result = parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        type,
        ...scopeArgs,
        "--name",
        name,
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    });

    assert.equal(result.platform, "react-ts");
    assert.equal(result.type, type);
    assert.deepEqual(result.names, names);

    if (type === "subdomain") {
      assert.equal(result.forDomain, "Orders");
    } else if (scopeArgs.length > 0) {
      assert.equal(result.forDomain, "Orders");
      assert.equal(result.forSubdomain, "Sales");
    }
  }
});

test("parseArgs supports lib as a component type", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--type", "lib", "--name", "formatDate"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "lib",
      names: ["formatDate"],
    },
  );
});

test("parseArgs preserves uppercase lib names", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--type", "lib", "--name", "API"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "lib",
      names: ["API"],
    },
  );
});

test("parseArgs supports ai flag for generated components", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "atom",
        "--name",
        "button",
        "--ai",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      ai: true,
      platform: "react-ts",
      type: "atom",
      names: ["Button"],
    },
  );
});

test("parseArgs supports prompt with ai flag for generated components", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "molecule",
        "--name",
        "search bar",
        "--ai",
        "--prompt",
        "Use an input, submit button, loading state, and compact variant.",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      ai: true,
      prompt:
        "Use an input, submit button, loading state, and compact variant.",
      platform: "react-ts",
      type: "molecule",
      names: ["SearchBar"],
    },
  );
});

test("parseArgs supports validate with ai flag for generated components", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "page",
        "--name",
        "service desk",
        "--ai",
        "--validate",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      ai: true,
      platform: "react-ts",
      type: "page",
      names: ["ServiceDesk"],
      validate: true,
    },
  );
});

test("getAiUnavailableMessage requires configured AI provider", () => {
  assert.equal(
    getAiUnavailableMessage({ aiConfig: false }),
    "AI generation requested, but no AI provider is configured. Run atomic-bomb -p and configure an AI provider first.",
  );
});

test("getAiUnavailableMessage rejects unimplemented AI provider adapters", () => {
  assert.equal(
    getAiUnavailableMessage({
      aiConfig: {
        enabled: true,
        provider: "future-provider",
        skillPath: ".skills/atomic-bomb/7.0.0/index.md",
      },
      options: { type: "page" },
    }),
    'AI generation requested with provider "future-provider", but no provider adapter is implemented yet. Remove --ai to scaffold normally, or add an adapter for this provider.',
  );
});

test("getAiUnavailableMessage allows openai-compatible component generation", () => {
  assert.equal(
    getAiUnavailableMessage({
      aiConfig: {
        enabled: true,
        provider: "openai-compatible",
        skillPath: ".skills/atomic-bomb/7.0.0/index.md",
      },
      options: { type: "page" },
    }),
    false,
  );
});

test("getAiUnavailableMessage allows openai provider alias", () => {
  assert.equal(
    getAiUnavailableMessage({
      aiConfig: {
        enabled: true,
        provider: "openai",
        skillPath: ".skills/atomic-bomb/7.0.0/index.md",
      },
      options: { type: "page" },
    }),
    false,
  );
});

test("getAiUnavailableMessage rejects scoped AI generation", () => {
  assert.equal(
    getAiUnavailableMessage({
      aiConfig: {
        enabled: true,
        provider: "openai-compatible",
        skillPath: ".skills/atomic-bomb/7.0.0/index.md",
      },
      options: { forSubdomain: "Sales", type: "organism" },
    }),
    "AI generation for scoped subdomain components is not implemented yet. Remove --ai to scaffold normally.",
  );
});

test("parseArgs supports hook as a component type", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--type", "hook", "--name", "useData"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "hook",
      names: ["useData"],
    },
  );
});

test("parseArgs converts spaced lib and hook names to camelCase", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--type", "hook", "--name", "use active"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "hook",
      names: ["useActive"],
    },
  );
});

test("parseArgs preserves already PascalCase component names", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--type", "atom", "--name", "DataTable"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "atom",
      names: ["DataTable"],
    },
  );
});

test("parseArgs supports domain as a component type", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--type", "domain", "--name", "billing"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "domain",
      names: ["Billing"],
    },
  );
});

test("parseArgs supports module creation", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "module",
        "--name",
        "user manager",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "module",
      names: ["UserManager"],
    },
  );
});

test("parseArgs supports module creation for a domain", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "module",
        "--for",
        "orders",
        "--name",
        "user manager",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Orders",
      platform: "react-ts",
      type: "module",
      names: ["UserManager"],
    },
  );
});

test("parseArgs supports module creation for a subdomain", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "module",
        "--for",
        "orders/sales",
        "--name",
        "user manager",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Orders",
      forSubdomain: "Sales",
      platform: "react-ts",
      type: "module",
      names: ["UserManager"],
    },
  );
});

test("parseArgs supports module-scoped generation with --for", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--for",
        "user manager",
        "--type",
        "atom",
        "--name",
        "button",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      moduleName: "UserManager",
      platform: "react-ts",
      type: "atom",
      names: ["Button"],
    },
  );
});

test("parseArgs supports module-scoped generation with --module", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--module",
        "user manager",
        "--type",
        "service",
        "--name",
        "user service",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      moduleName: "UserManager",
      platform: "react-ts",
      type: "service",
      names: ["userService"],
    },
  );
});

test("parseArgs supports a domain-owned module target", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--module",
        "user manager",
        "--for",
        "orders",
        "--type",
        "atom",
        "--name",
        "button",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Orders",
      moduleName: "UserManager",
      platform: "react-ts",
      type: "atom",
      names: ["Button"],
    },
  );
});

test("parseArgs supports a subdomain-owned module target", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--module",
        "user manager",
        "--for",
        "orders/sales",
        "--type",
        "service",
        "--name",
        "user service",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Orders",
      forSubdomain: "Sales",
      moduleName: "UserManager",
      platform: "react-ts",
      type: "service",
      names: ["userService"],
    },
  );
});

test("parseArgs supports subdomain with a parent domain", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "subdomain",
        "--for",
        "billing",
        "--name",
        "invoicing",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Billing",
      platform: "react-ts",
      type: "subdomain",
      names: ["Invoicing"],
    },
  );
});

test("parseArgs supports scoped hook generation inside a subdomain", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--for",
        "orders/sales",
        "--type",
        "hook",
        "--name",
        "useOrders",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Orders",
      forSubdomain: "Sales",
      platform: "react-ts",
      type: "hook",
      names: ["useOrders"],
    },
  );
});

test("parseArgs supports scoped service generation inside a subdomain", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--for",
        "orders/sales",
        "--type",
        "service",
        "--name",
        "orderService",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      forDomain: "Orders",
      forSubdomain: "Sales",
      platform: "react-ts",
      type: "service",
      names: ["orderService"],
    },
  );
});

test("parseArgs supports root service generation", () => {
  assert.deepEqual(
    parseArgs({
      args: [
        "node",
        "atomic-bomb",
        "--type",
        "service",
        "--name",
        "order service",
      ],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      type: "service",
      names: ["orderService"],
    },
  );
});

test("parseArgs supports scoped DDD file types inside a subdomain", () => {
  const cases = [
    ["api", "fetch orders", "fetchOrders"],
    ["event", "order created", "orderCreated"],
    ["helper", "format order", "formatOrder"],
    ["model", "order summary", "orderSummary"],
    ["service", "order service", "orderService"],
    ["state", "order state", "orderState"],
  ];

  for (const [type, inputName, expectedName] of cases) {
    assert.deepEqual(
      parseArgs({
        args: [
          "node",
          "atomic-bomb",
          "--for",
          "orders/sales",
          "--type",
          type,
          "--name",
          inputName,
        ],
        dotConfig: {
          platform: "react-ts",
        },
        ...parserOptions,
      }),
      {
        forDomain: "Orders",
        forSubdomain: "Sales",
        platform: "react-ts",
        type,
        names: [expectedName],
      },
    );
  }
});

test("parseArgs supports export action", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--export", "structure.json"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      exportFile: "structure.json",
      platform: "react-ts",
    },
  );
});

test("parseArgs supports from action", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--from", "structure.json"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      fromFile: "structure.json",
      platform: "react-ts",
    },
  );
});

test("parseArgs supports remove action", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--remove", "data table"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      removeName: "data table",
    },
  );
});

test("parseArgs supports update action", () => {
  assert.deepEqual(
    parseArgs({
      args: ["node", "atomic-bomb", "--update"],
      dotConfig: {
        platform: "react-ts",
      },
      ...parserOptions,
    }),
    {
      platform: "react-ts",
      updateSkills: true,
    },
  );
});
