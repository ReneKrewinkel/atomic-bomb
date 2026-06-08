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
  createModuleFiles,
  createScopedModuleFiles,
  createScopedSubdomainFiles,
  createSidecarFiles,
  createSubdomainFiles,
  createWorkflow,
  getLibDir,
  getLogicExtension,
  getModuleComponentsDir,
  getModuleDir,
  getScopedModuleDir,
  getSidecarDir,
  removeGeneratedItem,
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

  assert.equal(fs.existsSync(path.join(componentsDir, "_types_")), true);
  assert.equal(
    fs.existsSync(path.join(componentsDir, "_types_", "index.ts")),
    true,
  );
  assert.equal(
    fs.readFileSync(path.join(componentsDir, "index.ts"), "utf8"),
    [
      "export * from './_types_'",
      "export * from './atoms'",
      "export * from './molecules'",
      "export * from './organisms'",
      "export * from './pages'",
      "export * from './templates'",
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
    "export const FormatDate = () => {}\n\nexport default FormatDate\n",
  );
  assert.equal(
    fs.readFileSync(path.join(libDir, "FormatDate/index.ts"), "utf8"),
    "export { default } from './FormatDate'\n",
  );
  assert.match(
    fs.readFileSync(path.join(libDir, "index.ts"), "utf8"),
    /export \{ default as FormatDate \} from '\.\/FormatDate'/,
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
    "export const UseActive = () => {}\n\nexport default UseActive\n",
  );
  assert.equal(
    fs.readFileSync(path.join(hooksDir, "UseActive/index.ts"), "utf8"),
    "export { default } from './UseActive'\n",
  );
  assert.match(
    fs.readFileSync(path.join(hooksDir, "index.ts"), "utf8"),
    /export \{ default as UseActive \} from '\.\/UseActive'/,
  );
});

test("createSidecarFiles creates service files and root services export", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const servicesDir = path.join(dir, "src/services");

  silenceConsole(() =>
    createSidecarFiles({
      componentsDir,
      extension: "tsx",
      name: "orderService",
      type: "service",
    }),
  );

  assert.equal(
    fs.readFileSync(
      path.join(servicesDir, "orderService/orderService.ts"),
      "utf8",
    ),
    "export const orderService = () => {}\n\nexport default orderService\n",
  );
  assert.equal(
    fs.readFileSync(path.join(servicesDir, "orderService/index.ts"), "utf8"),
    "export { default } from './orderService'\n",
  );
  assert.match(
    fs.readFileSync(path.join(servicesDir, "index.ts"), "utf8"),
    /export \{ default as orderService \} from '\.\/orderService'/,
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
    /export \* as Billing from '\.\/Billing'/,
  );
});

test("top domains barrel exports each domain with an alias", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() => {
    createDomainFiles({
      componentsDir,
      extension: "tsx",
      name: "Billing",
    });
    createDomainFiles({
      componentsDir,
      extension: "tsx",
      name: "Orders",
    });
  });

  assert.equal(
    fs.readFileSync(path.join(dir, "src/domains/index.ts"), "utf8"),
    [
      "export * as Billing from './Billing'",
      "export * as Orders from './Orders'",
    ].join("\n"),
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

test("createModuleFiles creates a module with atomic and sidecar directories", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const moduleDir = path.join(dir, "src/modules/UserManager");

  silenceConsole(() =>
    createModuleFiles({
      componentsDir,
      extension: "tsx",
      name: "UserManager",
      scss: true,
    }),
  );

  assert.equal(
    getModuleDir({ componentsDir, moduleName: "UserManager" }),
    moduleDir,
  );
  assert.equal(
    getModuleComponentsDir({ componentsDir, moduleName: "UserManager" }),
    path.join(moduleDir, "components"),
  );

  for (const atomicDir of [
    "atoms",
    "molecules",
    "organisms",
    "pages",
    "templates",
  ]) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, "components", atomicDir, "index.tsx")),
      true,
    );
  }

  for (const sidecarDir of ["hooks", "lib", "services"]) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, sidecarDir, "index.ts")),
      true,
    );
  }

  for (const unsupportedDir of [
    "api",
    "events",
    "helpers",
    "models",
    "state",
  ]) {
    assert.equal(fs.existsSync(path.join(moduleDir, unsupportedDir)), false);
  }

  assert.match(
    fs.readFileSync(path.join(dir, "src/modules/index.ts"), "utf8"),
    /export \* as UserManager from '\.\/UserManager'/,
  );
  assert.match(
    fs.readFileSync(path.join(moduleDir, "index.ts"), "utf8"),
    /export \* from '\.\/components'/,
  );
});

test("top modules barrel exports each module with an alias without duplicates", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() => {
    createModuleFiles({
      componentsDir,
      extension: "tsx",
      name: "UserManager",
    });
    createModuleFiles({
      componentsDir,
      extension: "tsx",
      name: "OrderManager",
    });
    createModuleFiles({
      allowExisting: true,
      componentsDir,
      extension: "tsx",
      name: "UserManager",
    });
  });

  assert.equal(
    fs.readFileSync(path.join(dir, "src/modules/index.ts"), "utf8"),
    [
      "export * as UserManager from './UserManager'",
      "export * as OrderManager from './OrderManager'",
    ].join("\n"),
  );
});

test("createModuleFiles creates domain and subdomain modules with alias barrels", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() => {
    createModuleFiles({
      componentsDir,
      domainName: "Orders",
      extension: "tsx",
      name: "Checkout",
    });
    createModuleFiles({
      componentsDir,
      domainName: "Orders",
      extension: "tsx",
      name: "UserManager",
      subdomainName: "Sales",
    });
  });

  assert.equal(
    getScopedModuleDir({
      componentsDir,
      domainName: "Orders",
      moduleName: "Checkout",
    }),
    path.join(dir, "src/domains/Orders/modules/Checkout"),
  );
  assert.equal(
    getScopedModuleDir({
      componentsDir,
      domainName: "Orders",
      moduleName: "UserManager",
      subdomainName: "Sales",
    }),
    path.join(dir, "src/domains/Orders/Sales/modules/UserManager"),
  );
  assert.match(
    fs.readFileSync(
      path.join(dir, "src/domains/Orders/modules/index.ts"),
      "utf8",
    ),
    /export \* as Checkout from '\.\/Checkout'/,
  );
  assert.match(
    fs.readFileSync(
      path.join(dir, "src/domains/Orders/Sales/modules/index.ts"),
      "utf8",
    ),
    /export \* as UserManager from '\.\/UserManager'/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/Orders/index.ts"), "utf8"),
    /export \* from '\.\/modules'/,
  );
  assert.match(
    fs.readFileSync(
      path.join(dir, "src/domains/Orders/Sales/index.ts"),
      "utf8",
    ),
    /export \* from '\.\/modules'/,
  );
});

test("createScopedModuleFiles creates module-level sidecars", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() =>
    createScopedModuleFiles({
      componentsDir,
      extension: "tsx",
      moduleName: "UserManager",
      name: "userService",
      type: "service",
    }),
  );

  const serviceDir = path.join(
    dir,
    "src/modules/UserManager/services/userService",
  );
  assert.equal(
    fs.readFileSync(path.join(serviceDir, "userService.ts"), "utf8"),
    "export const userService = () => {}\n\nexport default userService\n",
  );
  assert.match(
    fs.readFileSync(
      path.join(dir, "src/modules/UserManager/services/index.ts"),
      "utf8",
    ),
    /export \{ default as userService \} from '\.\/userService'/,
  );
});

test("createScopedModuleFiles creates sidecars in a subdomain module", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");

  silenceConsole(() =>
    createScopedModuleFiles({
      componentsDir,
      domainName: "Orders",
      extension: "tsx",
      moduleName: "UserManager",
      name: "userService",
      subdomainName: "Sales",
      type: "service",
    }),
  );

  assert.equal(
    fs.existsSync(
      path.join(
        dir,
        "src/domains/Orders/Sales/modules/UserManager/services/userService/userService.ts",
      ),
    ),
    true,
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
    "modules",
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
      new RegExp(`export \\* from '\\./${atomicDir}'`),
    );
  }

  assert.equal(
    fs.existsSync(path.join(subdomainDir, "components", "_types_")),
    true,
  );
  assert.equal(
    fs.existsSync(path.join(subdomainDir, "components", "_types_", "index.ts")),
    true,
  );
  assert.match(
    fs.readFileSync(path.join(subdomainDir, "components/index.ts"), "utf8"),
    /export \* from '\.\/_types_'/,
  );
  assert.equal(
    fs.readFileSync(path.join(subdomainDir, "index.ts"), "utf8"),
    [
      "export * from './components'",
      "export * from './modules'",
      "export * from './hooks'",
      "export * from './services'",
      "export * from './state'",
      "export * from './models'",
      "export * from './events'",
      "export * from './helpers'",
      "export * from './api'",
      "export * from './pages'",
      "",
    ].join("\n"),
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/index.ts"), "utf8"),
    /export \* as Billing from '\.\/Billing'/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/Billing/index.ts"), "utf8"),
    /export \* as Invoicing from '\.\/Invoicing'/,
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
    /export \* from '\.\/components'/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/index.ts"), "utf8"),
    /export \* as Billing from '\.\/Billing'/,
  );
  assert.match(
    fs.readFileSync(path.join(dir, "src/domains/Billing/index.ts"), "utf8"),
    /export \* as Invoicing from '\.\/Invoicing'/,
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
    ["hook", "hooks", "useOrders"],
    ["model", "models", "orderSummary"],
    ["page", "pages", "SalesOverview"],
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
      `export const ${name} = () => {}\n\nexport default ${name}\n`,
    );
    assert.equal(
      fs.readFileSync(path.join(folderDir, name, "index.ts"), "utf8"),
      `export { default } from './${name}'\n`,
    );
    assert.match(
      fs.readFileSync(path.join(folderDir, "index.ts"), "utf8"),
      new RegExp(`export \\{ default as ${name} \\} from '\\./${name}'`),
    );
    assert.match(
      fs.readFileSync(path.join(subdomainDir, "index.ts"), "utf8"),
      new RegExp(`export \\* from '\\./${folder}'`),
    );
  }
});

test("removeGeneratedItem removes matching generated directories and barrel references", () => {
  const dir = makeTempDir();
  const componentsDir = path.join(dir, "src/components");
  const atomsDir = path.join(componentsDir, "atoms");
  const scopedAtomsDir = path.join(
    dir,
    "src/domains/Orders/Sales/components/atoms",
  );
  const hooksDir = path.join(dir, "src/hooks");
  const servicesDir = path.join(dir, "src/services");

  fs.mkdirSync(path.join(atomsDir, "DataTable"), { recursive: true });
  fs.mkdirSync(path.join(atomsDir, "KeepMe"), { recursive: true });
  fs.mkdirSync(path.join(scopedAtomsDir, "DataTable"), { recursive: true });
  fs.mkdirSync(path.join(hooksDir, "dataTable"), { recursive: true });
  fs.mkdirSync(path.join(servicesDir, "dataTable"), { recursive: true });
  fs.writeFileSync(
    path.join(atomsDir, "index.tsx"),
    [
      "export { default as DataTable } from './DataTable'",
      "export { default as KeepMe } from './KeepMe'",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(atomsDir, "_index.scss"),
    ["@use './DataTable';", "@use './KeepMe';", ""].join("\n"),
  );
  fs.writeFileSync(
    path.join(scopedAtomsDir, "index.tsx"),
    [
      "export { default as DataTable } from './DataTable'",
      "export { default as KeepMe } from './KeepMe'",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(hooksDir, "index.ts"),
    [
      "export { default as dataTable } from './dataTable'",
      "export { default as useKeepMe } from './useKeepMe'",
      "",
    ].join("\n"),
  );
  fs.writeFileSync(
    path.join(servicesDir, "index.ts"),
    [
      "export { default as dataTable } from './dataTable'",
      "export { default as keepService } from './keepService'",
      "",
    ].join("\n"),
  );

  const removed = silenceConsole(() =>
    removeGeneratedItem({ componentsDir, name: "data table" }),
  );

  assert.equal(removed.length, 4);
  assert.equal(fs.existsSync(path.join(atomsDir, "DataTable")), false);
  assert.equal(fs.existsSync(path.join(scopedAtomsDir, "DataTable")), false);
  assert.equal(fs.existsSync(path.join(hooksDir, "dataTable")), false);
  assert.equal(fs.existsSync(path.join(servicesDir, "dataTable")), false);
  assert.equal(fs.existsSync(path.join(atomsDir, "KeepMe")), true);
  assert.match(
    fs.readFileSync(path.join(atomsDir, "index.tsx"), "utf8"),
    /KeepMe/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(atomsDir, "index.tsx"), "utf8"),
    /DataTable/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(atomsDir, "_index.scss"), "utf8"),
    /DataTable/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(servicesDir, "index.ts"), "utf8"),
    /dataTable/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(hooksDir, "index.ts"), "utf8"),
    /dataTable/,
  );
});
