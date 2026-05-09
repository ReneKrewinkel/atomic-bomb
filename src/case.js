const splitWords = (value) =>
  value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean);

const capitalize = (value) => `${value[0].toUpperCase()}${value.slice(1)}`;
const uncapitalize = (value) => `${value[0].toLowerCase()}${value.slice(1)}`;

export const convertToPascalCase = (value) => {
  const words = splitWords(value);

  if (words.length === 0) return "";

  return words.map(capitalize).join("");
};

export const convertToCamelCase = (value) => {
  const pascalCase = convertToPascalCase(value);

  if (!pascalCase) return "";

  return uncapitalize(pascalCase);
};

export const convertNameForType = ({ type, value }) => {
  const pascalCaseTypes = [
    "atom",
    "domain",
    "molecule",
    "organism",
    "page",
    "subdomain",
    "template",
  ];

  return pascalCaseTypes.includes(type)
    ? convertToPascalCase(value)
    : convertToCamelCase(value);
};
