import fs from "fs-extra";
import shell from "shelljs";
import { check, error } from "./logger.js";

const icons = {
  atom: "⚛️",
  molecule: "🔅",
  organism: "🐙",
  template: "⊟",
  page: "𝍌",
};

const isHidden = ({ name }) => /^\./.test(name);

export const pullTemplateRepository = ({
  templatePath,
  templateRepository,
}) => {
  fs.rmSync(templatePath, { recursive: true, force: true });

  if (
    shell.exec(`git clone --quiet ${templateRepository} ${templatePath}`)
      .code !== 0
  ) {
    error("Code templates not available");
  }
};

export const pullPlatforms = (templatePath) =>
  fs
    .readdirSync(templatePath, { withFileTypes: true })
    .filter((dir) => dir.isDirectory() && !isHidden(dir))
    .map((dir) => dir.name);

export const checkPlatform = ({ platform, templatePath }) => {
  if (!fs.existsSync(`${templatePath}/${platform}`)) {
    error(
      `Platform "${platform}" does not exist (yet). You might want to open a PR?`,
    );
  }

  return JSON.parse(
    fs.readFileSync(`${templatePath}/${platform}.json`, "utf-8"),
  );
};

export const processTemplates = ({
  platform,
  type,
  name,
  destination,
  componentsDir,
  extension,
  scss,
  templatePath,
}) => {
  try {
    const base = `${componentsDir}/${type}s`;
    const files = fs.readdirSync(`${templatePath}/${platform}`);

    files.forEach((file) => {
      const fileName = file.replace("[NAME]", name);
      check(`${icons[type]} ${type}s/${name}/${fileName}`);

      const content = fs.readFileSync(
        `${templatePath}/${platform}/${file}`,
        "utf8",
      );
      const result = content
        .replace(/\[NAME\]/g, name)
        .replace(/\[TYPE\]/g, `${type}s`);

      fs.writeFileSync(`${destination}/${fileName}`, result);
    });

    if (scss) fs.appendFileSync(`${base}/_index.scss`, `\n@use './${name}';`);
    if (extension) {
      fs.appendFileSync(
        `${base}/index.${extension}`,
        `\nexport { default as ${name} } from './${name}'`,
      );
    }
  } catch (err) {
    error(`oops, ${err.message}`);
  }
};
