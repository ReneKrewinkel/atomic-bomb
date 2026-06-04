import readline from "node:readline/promises";

export const defaultSkillPath = ".skills/atomic-bomb/latest/index.md";

const normalizeOptional = (value) => {
  const result = value.trim();

  return result ? result : undefined;
};

const promptWithDefault = async ({ prompt, question, defaultValue = "" }) => {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = await prompt(`${question}${suffix}: `);
  const normalized = answer.trim();

  return normalized || defaultValue;
};

export const promptAiConfig = async ({
  defaultSkillPath: configuredDefaultSkillPath = defaultSkillPath,
  existingAiConfig = false,
  input = process.stdin,
  output = process.stdout,
} = {}) => {
  if (!input.isTTY || !output.isTTY) return existingAiConfig || false;

  const rl = readline.createInterface({ input, output });
  const prompt = (question) => rl.question(question);

  try {
    const action = existingAiConfig ? "update" : "configure";
    const shouldConfigure = await prompt(
      `Configure AI provider for --ai? ${action === "update" ? "[Y/n]" : "[y/N]"}: `,
    );
    const normalized = shouldConfigure.trim().toLowerCase();

    if (
      (!existingAiConfig && normalized !== "y" && normalized !== "yes") ||
      (existingAiConfig && normalized === "n")
    ) {
      return existingAiConfig || false;
    }

    const provider = await promptWithDefault({
      prompt,
      question: "AI provider",
      defaultValue: existingAiConfig?.provider || "openai-compatible",
    });
    const baseUrl = await promptWithDefault({
      prompt,
      question: "AI API base URL",
      defaultValue: existingAiConfig?.baseUrl || "",
    });
    const model = await promptWithDefault({
      prompt,
      question: "AI model",
      defaultValue: existingAiConfig?.model || "",
    });
    const apiKeyEnv = await promptWithDefault({
      prompt,
      question: "API key environment variable name",
      defaultValue: existingAiConfig?.apiKeyEnv || "",
    });
    const skillPath = await promptWithDefault({
      prompt,
      question: "AI skill index path",
      defaultValue: existingAiConfig?.skillPath || configuredDefaultSkillPath,
    });
    const normalizedBaseUrl = normalizeOptional(baseUrl);
    const normalizedModel = normalizeOptional(model);
    const normalizedApiKeyEnv = normalizeOptional(apiKeyEnv);

    return {
      enabled: true,
      provider,
      ...(normalizedBaseUrl ? { baseUrl: normalizedBaseUrl } : {}),
      ...(normalizedModel ? { model: normalizedModel } : {}),
      ...(normalizedApiKeyEnv ? { apiKeyEnv: normalizedApiKeyEnv } : {}),
      skillPath,
    };
  } finally {
    rl.close();
  }
};
