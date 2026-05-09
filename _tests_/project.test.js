import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkPlatformDependency,
  createAtomicDirs,
  createDomainFiles,
  createLibFiles,
  createScopedSubdomainFiles,
  createSidecarFiles,
  createSubdomainFiles,
  createWorkflow,
  getLibDir,
  getLogicExtension,
  getSidecarDir,
} from "../src/project.js";

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

test("checkPlatformDependency accepts devDependencies", () => {
  const dir = makeTempDir();
  const packagePath = path.join(dir, "package.json");

  fs.writeFileSync(
    packagePath,
    JSON.stringify({
      devDependencies: {
        react: "^18.2.0",
      },
    }),
  );

  assert.doesNotThrow(() =>
    silenceConsole(() =>
      checkPlatformDependency({ packagePath, packageName: "react" }),
    ),
  );
});

test("createAtomicDirs creates atomic design directories and indexes", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  createAtomicDirs({ dir: componentsDir, extension: "tsx", scss: true });

  for (const atomicDir of [
    "atoms",
    "molecules",
    "organisms",
    "templates",
    "pages",
  ]) {
    assert.equal(fs.existsSync(path.join(componentsDir, atomicDir)), true);
    assert.equal(
      fs.existsSync(path.join(componentsDir, atomicDir, "_index.scss")),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(componentsDir, atomicDir, "index.tsx")),
      true,
    );
  }

  assert.equal(
    fs.readFileSync(path.join(componentsDir, "index.ts"), "utf8"),
    [
      "export * from './atoms';",
      "export * from './molecules';",
      "export * from './organisms';",
      "export * from './pages';",
      "export * from './templates';",
    ].join("\n"),
  );
});

test("createWorkflow creates workflow file when only .github exists", () => {
  const dir = makeTempDir();
  const workflowTemplatePath = path.join(dir, "atomic-todo-to-issue.yml");
  const currentWorkingDirectory = process.cwd();

  fs.mkdirSync(path.join(dir, ".github"));
  fs.writeFileSync(workflowTemplatePath, "name: test\n");

  try {
    process.chdir(dir);
    createWorkflow({ workflowTemplatePath });

    assert.equal(
      fs.readFileSync(
        path.join(dir, ".github/workflows/atomic-todo-to-issue.yml"),
        "utf8",
      ),
      "name: test\n",
    );
  } finally {
    process.chdir(currentWorkingDirectory);
  }
});

test("getLibDir creates a lib path next to components", () => {
  assert.equal(getLibDir("src/components"), "src/lib");
  assert.equal(getLibDir("components"), "lib");
});

test("getLogicExtension maps jsx extensions to logic file extensions", () => {
  assert.equal(getLogicExtension("tsx"), "ts");
  assert.equal(getLogicExtension("jsx"), "js");
  assert.equal(getLogicExtension("ts"), "ts");
  assert.equal(getLogicExtension("js"), "js");
});

test("getSidecarDir creates typed paths next to components", () => {
  assert.equal(
    getSidecarDir({ componentsDir: "src/components", type: "hook" }),
    "src/hooks",
  );
  assert.equal(
    getSidecarDir({ componentsDir: "components", type: "hook" }),
    "hooks",
  );
  assert.equal(
    getSidecarDir({ componentsDir: "src/components", type: "domain" }),
    "src/domains",
  );
});

test("createLibFiles creates library files and root export", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const libDir = path.join(dir, "src/lib");

  silenceConsole(() =>
    createLibFiles({
      componentsDir,
      extension: "ts",
      name: "FormatDate",
    }),
  );

  assert.equal(
    fs.readFileSync(path.join(libDir, "FormatDate/FormatDate.ts"), "utf8"),
    "export const FormatDate = () => {};\n\nexport default FormatDate;\n",
  );
  assert.equal(
    fs.readFileSync(path.join(libDir, "FormatDate/index.ts"), "utf8"),
    "export { default } from './FormatDate';\n",
  );
  assert.match(
    fs.readFileSync(path.join(libDir, "index.ts"), "utf8"),
    /export \{ default as FormatDate \} from '\.\/FormatDate';/,
  );
});

test("createSidecarFiles creates hook files and root hooks export", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const hooksDir = path.join(dir, "src/hooks");

  silenceConsole(() =>
    createSidecarFiles({
      componentsDir,
      extension: "tsx",
      name: "UseActive",
      type: "hook",
    }),
  );

  assert.equal(
    fs.readFileSync(path.join(hooksDir, "UseActive/UseActive.ts"), "utf8"),
    "export const UseActive = () => {};\n\nexport default UseActive;\n",
  );
  assert.equal(
    fs.readFileSync(path.join(hooksDir, "UseActive/index.ts"), "utf8"),
    "export { default } from './UseActive';\n",
  );
  assert.match(
    fs.readFileSync(path.join(hooksDir, "index.ts"), "utf8"),
    /export \{ default as UseActive \} from '\.\/UseActive';/,
  );
});

test("createDomainFiles creates a domain directory and root domains export", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const domainsDir = path.join(dir, "src/domains");

  silenceConsole(() =>
    createDomainFiles({
      componentsDir,
      extension: "tsx",
      name: "Billing",
    }),
  );

  assert.equal(fs.existsSync(path.join(domainsDir, "Billing")), true);
  assert.equal(
    fs.existsSync(path.join(domainsDir, "Billing/Billing.ts")),
    false,
  );
  assert.equal(
    fs.readFileSync(path.join(domainsDir, "Billing/index.ts"), "utf8"),
    "",
  );
  assert.match(
    fs.readFileSync(path.join(domainsDir, "index.ts"), "utf8"),
    /export \* as Billing from '\.\/Billing';/,
  );
});

test("createSidecarFiles routes domain to a domain directory", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() =>
    createSidecarFiles({
      componentsDir,
      extension: "ts",
      name: "Billing",
      type: "domain",
    }),
  );

  assert.equal(
    fs.existsSync(path.join(dir, "src/domains/Billing/index.ts")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(dir, "src/domains/Billing/Billing.ts")),
    false,
  );
});

test("createSubdomainFiles creates a nested subdomain structure", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const subdomainDir = path.join(dir, "src/domains/Billing/Invoicing");

  silenceConsole(() =>
    createSubdomainFiles({
      componentsDir,
      domainName: "Billing",
      extension: "tsx",
      name: "Invoicing",
    }),
  );

  for (const subdir of [
    "components",
    "hooks",
    "services",
    "state",
    "models",
    "events",
    "helpers",
    "api",
    "pages",
  ]) {
    assert.equal(fs.existsSync(path.join(subdomainDir, subdir)), true);
    assert.equal(
      fs.existsSync(path.join(subdomainDir, subdir, "index.ts")),
      true,
    );
  }

  for (const atomicDir of [
    "atoms",
    "molecules",
    "organisms",
    "pages",
    "templates",
  ]) {
    assert.equal(
      fs.existsSync(
        path.join(subdomainDir, "components", atomicDir, "index.tsx"),
      ),
      true,
    );
    assert.match(
      fs.readFileSync(path.join(subdomainDir, "components/index.ts"), "utf8"),
      new RegExp(`export \\* from '\\./${atomicDir}';`),
    );
  }

  assert.equal(
    fs.readFileSync(path.join(subdomainDir, "index.ts"), "utf8"),
    [
      "export * from './components';",
      "export * from './hooks';",
      "export * from './services';",
      "export * from './state';",
      "export * from './models';",
      "export * from './events';",
      "export * from './helpers';",
      "export * from './api';",
      "export * from './pages';",
      "",
    ].join("\n"),
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/index.ts"), "utf8"),
    /export \* as Billing from '\.\/Billing';/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/Billing/index.ts"), "utf8"),
    /export \* as Invoicing from '\.\/Invoicing';/,
  );
});

test("createSubdomainFiles can repair existing subdomain index files", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const subdomainDir = path.join(dir, "src/domains/Billing/Invoicing");

  fs.mkdirSync(path.join(subdomainDir, "components"), { recursive: true });

  silenceConsole(() =>
    createSubdomainFiles({
      allowExisting: true,
      componentsDir,
      domainName: "Billing",
      extension: "tsx",
      name: "Invoicing",
    }),
  );

  for (const subdir of [
    "components",
    "hooks",
    "services",
    "state",
    "models",
    "events",
    "helpers",
    "api",
    "pages",
  ]) {
    assert.equal(
      fs.existsSync(path.join(subdomainDir, subdir, "index.ts")),
      true,
    );
  }

  assert.match(
    fs.readFileSync(path.join(subdomainDir, "index.ts"), "utf8"),
    /export \* from '\.\/components';/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/index.ts"), "utf8"),
    /export \* as Billing from '\.\/Billing';/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/Billing/index.ts"), "utf8"),
    /export \* as Invoicing from '\.\/Invoicing';/,
  );
});

test("createSubdomainFiles does not duplicate parent domain exports", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() => {
    createSubdomainFiles({
      componentsDir,
      domainName: "Billing",
      extension: "ts",
      name: "Invoicing",
    });
    createSubdomainFiles({
      allowExisting: true,
      componentsDir,
      domainName: "Billing",
      extension: "ts",
      name: "Invoicing",
    });
  });

  assert.equal(
    fs
      .readFileSync(path.join(dir, "src/domains/index.ts"), "utf8")
      .match(/export \* as Billing/g).length,
    1,
  );
  assert.equal(
    fs
      .readFileSync(path.join(dir, "src/domains/Billing/index.ts"), "utf8")
      .match(/export \* as Invoicing/g).length,
    1,
  );
});

test("createScopedSubdomainFiles creates files in the matching subdomain folder", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const subdomainDir = path.join(dir, "src/domains/Orders/Sales");
  const cases = [
    ["api", "api", "fetchOrders"],
    ["event", "events", "orderCreated"],
    ["helper", "helpers", "formatOrder"],
    ["model", "models", "orderSummary"],
    ["service", "services", "orderService"],
    ["state", "state", "orderState"],
  ];

  silenceConsole(() => {
    cases.forEach(([type, _folder, name]) => {
      createScopedSubdomainFiles({
        componentsDir,
        domainName: "Orders",
        extension: "tsx",
        name,
        subdomainName: "Sales",
        type,
      });
    });
  });

  for (const [_type, folder, name] of cases) {
    const folderDir = path.join(subdomainDir, folder);

    assert.equal(
      fs.readFileSync(path.join(folderDir, name, `${name}.ts`), "utf8"),
      `export const ${name} = () => {};\n\nexport default ${name};\n`,
    );
    assert.equal(
      fs.readFileSync(path.join(folderDir, name, "index.ts"), "utf8"),
      `export { default } from './${name}';\n`,
    );
    assert.match(
      fs.readFileSync(path.join(folderDir, "index.ts"), "utf8"),
      new RegExp(`export \\{ default as ${name} \\} from '\\./${name}';`),
    );
    assert.match(
      fs.readFileSync(path.join(subdomainDir, "index.ts"), "utf8"),
      new RegExp(`export \\* from '\\./${folder}';`),
    );
  }
});
