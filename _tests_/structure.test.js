import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectGenerationStructure,
  generationStructureSchema,
  readGenerationStructure,
  writeGenerationStructure,
} from "../src/structure.js";
import { validComponentTypes } from "../src/project.js";

const makeTempDir = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), "atomic-bomb-"));

test("generationStructureSchema validates supported items", () => {
  const result = generationStructureSchema.safeParse({
    items: [
      { name: "Label", type: "atom" },
      { name: "FormatDate", type: "lib" },
      { name: "UseActive", type: "hook" },
      { name: "Billing", type: "domain" },
      { name: "UserManager", type: "module" },
      { module: "UserManager", name: "Button", type: "atom" },
      { for: "Billing", name: "Admin", type: "module" },
      {
        for: "Billing/Invoicing",
        module: "Admin",
        name: "Button",
        type: "atom",
      },
      { for: "Billing", name: "Invoicing", type: "subdomain" },
      { for: "Billing/Invoicing", name: "useOrders", type: "hook" },
      { for: "Billing/Invoicing", name: "orderService", type: "service" },
    ],
    platform: "react-ts",
    version: 1,
  });

  assert.equal(result.success, true);
});

test("generationStructureSchema validates every registered component type", () => {
  const scopedTypes = new Set([
    "api",
    "event",
    "helper",
    "hook",
    "model",
    "service",
    "state",
  ]);
  const items = validComponentTypes.map((type) => {
    if (type === "subdomain") {
      return { for: "Orders", name: "Sales", type };
    }

    if (scopedTypes.has(type)) {
      return { for: "Orders/Sales", name: "generatedItem", type };
    }

    return { name: "GeneratedItem", type };
  });

  const result = generationStructureSchema.safeParse({
    items,
    version: 1,
  });

  assert.equal(result.success, true);
});

test("generationStructureSchema rejects subdomains without for", () => {
  const result = generationStructureSchema.safeParse({
    items: [{ name: "Invoicing", type: "subdomain" }],
    version: 1,
  });

  assert.equal(result.success, false);
});

test("generationStructureSchema accepts one-segment module scopes", () => {
  const result = generationStructureSchema.safeParse({
    items: [{ for: "Billing", name: "useOrders", type: "hook" }],
    version: 1,
  });

  assert.equal(result.success, true);
});

test("generationStructureSchema rejects scopes deeper than domain/subdomain", () => {
  const result = generationStructureSchema.safeParse({
    items: [
      {
        for: "Billing/Invoicing/Archive",
        name: "useOrders",
        type: "hook",
      },
    ],
    version: 1,
  });

  assert.equal(result.success, false);
});

test("generationStructureSchema rejects unsupported module artifact types", () => {
  for (const type of ["api", "event", "helper", "model", "state"]) {
    const result = generationStructureSchema.safeParse({
      items: [
        {
          module: "UserManager",
          name: "generatedItem",
          type,
        },
      ],
      version: 1,
    });

    assert.equal(result.success, false);
  }
});

test("collectGenerationStructure exports directories without file contents", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  fs.mkdirSync(path.join(componentsDir, "atoms/Label"), { recursive: true });
  fs.mkdirSync(path.join(componentsDir, "molecules/Header"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(dir, "src/lib/FormatDate"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src/hooks/UseActive"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src/services/orderService"), {
    recursive: true,
  });
  fs.mkdirSync(
    path.join(dir, "src/modules/UserManager/components/atoms/Button"),
    {
      recursive: true,
    },
  );
  fs.mkdirSync(path.join(dir, "src/modules/UserManager/services/userService"), {
    recursive: true,
  });
  fs.mkdirSync(
    path.join(
      dir,
      "src/domains/Billing/modules/Admin/components/atoms/AdminButton",
    ),
    { recursive: true },
  );
  fs.mkdirSync(
    path.join(
      dir,
      "src/domains/Billing/Invoicing/modules/Invoice/components/atoms/InvoiceButton",
    ),
    { recursive: true },
  );
  fs.mkdirSync(path.join(dir, "src/domains/Billing/Invoicing"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(dir, "src/lib/FormatDate/FormatDate.ts"), "");
  fs.writeFileSync(path.join(dir, "src/hooks/UseActive/UseActive.ts"), "");
  fs.writeFileSync(
    path.join(dir, "src/services/orderService/orderService.ts"),
    "",
  );
  fs.writeFileSync(path.join(dir, "src/modules/UserManager/index.ts"), "");
  fs.writeFileSync(
    path.join(dir, "src/modules/UserManager/services/userService/index.ts"),
    "",
  );
  fs.writeFileSync(
    path.join(dir, "src/domains/Billing/modules/Admin/index.ts"),
    "",
  );
  fs.writeFileSync(
    path.join(dir, "src/domains/Billing/Invoicing/modules/Invoice/index.ts"),
    "",
  );
  fs.writeFileSync(path.join(dir, "src/domains/Billing/index.ts"), "");
  fs.writeFileSync(
    path.join(dir, "src/domains/Billing/Invoicing/index.ts"),
    "",
  );
  fs.mkdirSync(
    path.join(dir, "src/domains/Billing/Invoicing/hooks/useOrders"),
    {
      recursive: true,
    },
  );
  fs.mkdirSync(
    path.join(dir, "src/domains/Billing/Invoicing/services/orderService"),
    {
      recursive: true,
    },
  );
  fs.writeFileSync(
    path.join(dir, "src/domains/Billing/Invoicing/hooks/useOrders/index.ts"),
    "",
  );
  fs.writeFileSync(
    path.join(
      dir,
      "src/domains/Billing/Invoicing/services/orderService/index.ts",
    ),
    "",
  );

  assert.deepEqual(
    collectGenerationStructure({
      componentsDir,
      extension: "tsx",
      platform: "react-ts",
    }),
    {
      items: [
        { name: "Label", type: "atom" },
        { name: "Header", type: "molecule" },
        { name: "Billing", type: "domain" },
        { name: "UseActive", type: "hook" },
        { name: "FormatDate", type: "lib" },
        { name: "orderService", type: "service" },
        { name: "UserManager", type: "module" },
        { module: "UserManager", name: "Button", type: "atom" },
        { module: "UserManager", name: "userService", type: "service" },
        { for: "Billing", name: "Admin", type: "module" },
        {
          for: "Billing",
          module: "Admin",
          name: "AdminButton",
          type: "atom",
        },
        { for: "Billing", name: "Invoicing", type: "subdomain" },
        {
          for: "Billing/Invoicing",
          name: "Invoice",
          type: "module",
        },
        {
          for: "Billing/Invoicing",
          module: "Invoice",
          name: "InvoiceButton",
          type: "atom",
        },
        { for: "Billing/Invoicing", name: "useOrders", type: "hook" },
        {
          for: "Billing/Invoicing",
          name: "orderService",
          type: "service",
        },
      ],
      platform: "react-ts",
      version: 1,
    },
  );
});

test("writeGenerationStructure writes JSON and readGenerationStructure normalizes names", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const filePath = path.join(dir, "structure.json");

  fs.mkdirSync(path.join(componentsDir, "atoms/my label"), { recursive: true });

  writeGenerationStructure({
    componentsDir,
    extension: "js",
    filePath,
    platform: "react",
  });

  assert.deepEqual(readGenerationStructure(filePath), {
    items: [{ name: "MyLabel", type: "atom" }],
    platform: "react",
    version: 1,
  });
});

test("readGenerationStructure preserves camelCase hook and lib names", () => {
  const dir = makeTempDir();
  const filePath = path.join(dir, "structure.json");

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      items: [
        { name: "useData", type: "hook" },
        { name: "formatDate", type: "lib" },
      ],
      version: 1,
    }),
  );

  assert.deepEqual(readGenerationStructure(filePath), {
    items: [
      { name: "useData", type: "hook" },
      { name: "formatDate", type: "lib" },
    ],
    version: 1,
  });
});

test("readGenerationStructure normalizes scoped for paths", () => {
  const dir = makeTempDir();
  const filePath = path.join(dir, "structure.json");

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      items: [{ for: "orders/sales", name: "order service", type: "service" }],
      version: 1,
    }),
  );

  assert.deepEqual(readGenerationStructure(filePath), {
    items: [
      {
        for: "Orders/Sales",
        forDomain: "Orders",
        forSubdomain: "Sales",
        name: "orderService",
        type: "service",
      },
    ],
    version: 1,
  });
});

test("readGenerationStructure normalizes module scopes", () => {
  const dir = makeTempDir();
  const filePath = path.join(dir, "structure.json");

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      items: [{ for: "user manager", name: "button", type: "atom" }],
      version: 1,
    }),
  );

  assert.deepEqual(readGenerationStructure(filePath), {
    items: [
      {
        for: "UserManager",
        forModule: "UserManager",
        name: "Button",
        type: "atom",
      },
    ],
    version: 1,
  });
});

test("readGenerationStructure normalizes nested module scopes", () => {
  const dir = makeTempDir();
  const filePath = path.join(dir, "structure.json");

  fs.writeFileSync(
    filePath,
    JSON.stringify({
      items: [
        {
          for: "orders/sales",
          module: "user manager",
          name: "button",
          type: "atom",
        },
      ],
      version: 1,
    }),
  );

  assert.deepEqual(readGenerationStructure(filePath), {
    items: [
      {
        for: "Orders/Sales",
        forDomain: "Orders",
        forSubdomain: "Sales",
        module: "UserManager",
        moduleName: "UserManager",
        name: "Button",
        type: "atom",
      },
    ],
    version: 1,
  });
});
