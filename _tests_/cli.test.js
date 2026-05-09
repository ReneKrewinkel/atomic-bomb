import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/cli.js";

const parserOptions = {
  appName: "atomic-bomb",
  platforms: ["react", "react-ts", "react-native"],
};

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
