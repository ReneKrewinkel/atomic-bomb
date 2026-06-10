import fs from "fs-extra";
import path from "node:path";
import { z } from "zod";
import { convertNameForType, convertToPascalCase } from "./case.js";
import { error } from "./logger.js";
import { getLogicExtension, getSidecarDir } from "./project.js";

const atomicTypeDirs = {
  atom: "atoms",
  molecule: "molecules",
  organism: "organisms",
  page: "pages",
  template: "templates",
};

const sidecarTypeDirs = {
  domain: "domains",
  hook: "hooks",
  lib: "lib",
  service: "services",
};

const scopedTypeDirs = {
  api: "api",
  event: "events",
  helper: "helpers",
  hook: "hooks",
  lib: "lib",
  model: "models",
  page: "pages",
  service: "services",
  state: "state",
};

const scopedAtomicTypeDirs = {
  atom: "atoms",
  molecule: "molecules",
  organism: "organisms",
  template: "templates",
};
const moduleTypeDirs = {
  hook: "hooks",
  lib: "lib",
  service: "services",
};
const moduleTypes = new Set([
  "atom",
  "hook",
  "lib",
  "molecule",
  "organism",
  "page",
  "service",
  "template",
]);

const itemSchema = (type) =>
  z.object({
    for: z
      .string()
      .regex(
        /^[^/]+(?:\/[^/]+)?$/,
        "must be formatted as MODULE or DOMAIN/SUBDOMAIN",
      )
      .optional(),
    module: z.string().min(1).optional(),
    name: z.string().min(1),
    type: z.literal(type),
  });

export const structureItemSchema = z.discriminatedUnion("type", [
  itemSchema("atom"),
  itemSchema("api"),
  itemSchema("event"),
  itemSchema("helper"),
  itemSchema("molecule"),
  itemSchema("model"),
  itemSchema("module"),
  itemSchema("organism"),
  itemSchema("page"),
  itemSchema("service"),
  itemSchema("state"),
  itemSchema("template"),
  itemSchema("domain"),
  itemSchema("hook"),
  itemSchema("lib"),
  z.object({
    for: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("subdomain"),
  }),
]);

export const generationStructureSchema = z
  .object({
    items: z.array(structureItemSchema),
    platform: z.string().optional(),
    version: z.literal(1),
  })
  .superRefine(({ items }, context) => {
    items.forEach((item, index) => {
      if (item.module && !moduleTypes.has(item.type)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "module artifacts must be atom, molecule, organism, template, page, hook, lib, or service",
          path: ["items", index, "type"],
        });
      }
    });
  });

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const visibleDirectories = (dir) => {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((item) => item.isDirectory() && !item.name.startsWith("."))
    .map((item) => item.name)
    .sort();
};

const hasIndex = ({ dir, extension, name }) =>
  fs.existsSync(path.join(dir, name, `index.${extension}`));

const normalizeFor = (value) => {
  if (!value.includes("/")) return convertToPascalCase(value);

  return value
    .split("/")
    .map((item) => convertToPascalCase(item))
    .join("/");
};

export const collectGenerationStructure = ({
  componentsDir,
  extension,
  platform,
}) => {
  const items = [];
  const logicExtension = getLogicExtension(extension);
  const collectModules = ({ modulesDir, parentFor }) => {
    visibleDirectories(modulesDir).forEach((moduleName) => {
      const moduleDir = path.join(modulesDir, moduleName);

      if (!fs.existsSync(path.join(moduleDir, `index.${logicExtension}`))) {
        return;
      }

      items.push({
        ...(parentFor ? { for: parentFor } : {}),
        type: "module",
        name: moduleName,
      });

      Object.entries(atomicTypeDirs).forEach(([type, dirName]) => {
        visibleDirectories(path.join(moduleDir, "components", dirName)).forEach(
          (name) => {
            items.push({
              ...(parentFor ? { for: parentFor } : {}),
              module: moduleName,
              name,
              type,
            });
          },
        );
      });

      Object.entries(moduleTypeDirs).forEach(([type, dirName]) => {
        visibleDirectories(path.join(moduleDir, dirName)).forEach((name) => {
          if (
            hasIndex({
              dir: path.join(moduleDir, dirName),
              extension: logicExtension,
              name,
            })
          ) {
            items.push({
              ...(parentFor ? { for: parentFor } : {}),
              module: moduleName,
              name,
              type,
            });
          }
        });
      });
    });
  };

  Object.entries(atomicTypeDirs).forEach(([type, dirName]) => {
    visibleDirectories(path.join(componentsDir, dirName)).forEach((name) => {
      items.push({ type, name });
    });
  });

  Object.entries(sidecarTypeDirs).forEach(([type, dirName]) => {
    const dir = path.join(path.dirname(componentsDir), dirName);

    visibleDirectories(dir).forEach((name) => {
      if (
        type !== "domain" ||
        hasIndex({ dir, extension: logicExtension, name })
      ) {
        items.push({ type, name });
      }
    });
  });

  const modulesDir = getSidecarDir({ componentsDir, type: "module" });
  collectModules({ modulesDir });

  const domainsDir = getSidecarDir({ componentsDir, type: "domain" });
  visibleDirectories(domainsDir).forEach((domainName) => {
    const domainDir = path.join(domainsDir, domainName);

    collectModules({
      modulesDir: path.join(domainDir, "modules"),
      parentFor: domainName,
    });

    visibleDirectories(domainDir)
      .filter((name) => name !== "modules")
      .forEach((name) => {
        if (
          fs.existsSync(path.join(domainDir, name, `index.${logicExtension}`))
        ) {
          items.push({
            for: domainName,
            name,
            type: "subdomain",
          });

          const subdomainDir = path.join(domainDir, name);
          const scopedFor = `${domainName}/${name}`;

          collectModules({
            modulesDir: path.join(subdomainDir, "modules"),
            parentFor: scopedFor,
          });

          Object.entries(scopedAtomicTypeDirs).forEach(([type, dirName]) => {
            visibleDirectories(
              path.join(subdomainDir, "components", dirName),
            ).forEach((itemName) => {
              items.push({ for: scopedFor, name: itemName, type });
            });
          });

          Object.entries(scopedTypeDirs).forEach(([type, dirName]) => {
            visibleDirectories(path.join(subdomainDir, dirName)).forEach(
              (itemName) => {
                if (
                  hasIndex({
                    dir: path.join(subdomainDir, dirName),
                    extension: logicExtension,
                    name: itemName,
                  })
                ) {
                  items.push({ for: scopedFor, name: itemName, type });
                }
              },
            );
          });
        }
      });
  });

  return {
    items,
    platform,
    version: 1,
  };
};

export const writeGenerationStructure = ({
  componentsDir,
  extension,
  filePath,
  platform,
}) => {
  const structure = collectGenerationStructure({
    componentsDir,
    extension,
    platform,
  });

  fs.writeFileSync(filePath, `${JSON.stringify(structure, null, 2)}\n`);

  return structure;
};

export const readGenerationStructure = (filePath) => {
  try {
    const result = generationStructureSchema.safeParse(readJson(filePath));

    if (!result.success) {
      const issues = result.error.issues
        .map((item) => `${item.path.join(".")}: ${item.message}`)
        .join("\n\t - ");

      error(`${filePath}: invalid structure\n\t - ${issues}`);
    }

    return {
      ...result.data,
      items: result.data.items.map((item) => {
        const normalizedFor = item.for ? normalizeFor(item.for) : false;
        const hasParentScope = item.module || item.type === "module";

        return {
          ...item,
          ...(normalizedFor ? { for: normalizedFor } : {}),
          ...(item.module ? { module: convertToPascalCase(item.module) } : {}),
          ...(item.module
            ? { moduleName: convertToPascalCase(item.module) }
            : {}),
          ...(normalizedFor && (normalizedFor.includes("/") || hasParentScope)
            ? {
                forDomain: normalizedFor.split("/")[0],
                ...(normalizedFor.includes("/")
                  ? { forSubdomain: normalizedFor.split("/")[1] }
                  : {}),
              }
            : {}),
          ...(normalizedFor && !normalizedFor.includes("/") && !hasParentScope
            ? { forModule: normalizedFor }
            : {}),
          name: convertNameForType({ type: item.type, value: item.name }),
        };
      }),
    };
  } catch (err) {
    error(`${filePath}: ${err.message}`);
  }
};
