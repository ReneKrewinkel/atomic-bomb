import chalk from "chalk";

export const check = (message) => {
  console.log(`✅ ${message}`);
};

export const error = (message) => {
  console.log(chalk.red(`💀 ${message}`));
  process.exit(1);
};

export const showCopyright = ({ name, version, author }) => {
  console.log(`\n💥 ${name} v${version} © ${author} \n`);
};
