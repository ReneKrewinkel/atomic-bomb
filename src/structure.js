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
};

const scopedTypeDirs = {
  api: "api",
  event: "events",
  helper: "helpers",
  hook: "hooks",
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

const itemSchema = (type) =>
  z.object({
    for: z
      .string()
      .regex(/^[^/]+\/[^/]+$/, "must be formatted as DOMAIN/SUBDOMAIN")
      .optional(),
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

export const generationStructureSchema = z.object({
  items: z.array(structureItemSchema),
  platform: z.string().optional(),
  version: z.literal(1),
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

  const domainsDir = getSidecarDir({ componentsDir, type: "domain" });
  visibleDirectories(domainsDir).forEach((domainName) => {
    const domainDir = path.join(domainsDir, domainName);

    visibleDirectories(domainDir).forEach((name) => {
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
      items: result.data.items.map((item) => ({
        ...item,
        ...(item.for ? { for: normalizeFor(item.for) } : {}),
        ...(item.for && item.for.includes("/")
          ? {
              forDomain: normalizeFor(item.for).split("/")[0],
              forSubdomain: normalizeFor(item.for).split("/")[1],
            }
          : {}),
        name: convertNameForType({ type: item.type, value: item.name }),
      })),
    };
  } catch (err) {
    error(`${filePath}: ${err.message}`);
  }
};
