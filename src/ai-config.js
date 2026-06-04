import readline from "node:readline/promises";

export const defaultSkillPath = ".skills/atomic-bomb/latest/index.md";
export const defaultAiProvider = "openai";
export const defaultAiBaseUrl = "https://api.openai.com/v1";
export const defaultAiModel = "gpt-5-mini";
export const defaultAiApiKeyEnv = "OPENAI_API_KEY";

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
  isInteractive = input.isTTY && output.isTTY,
  question = false,
} = {}) => {
  if (!isInteractive) return existingAiConfig || false;

  const rl = question ? false : readline.createInterface({ input, output });
  const prompt = question || ((message) => rl.question(message));

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

    const apiKeyEnv = await promptWithDefault({
      prompt,
      question: "OpenAI API key environment variable name",
      defaultValue: existingAiConfig?.apiKeyEnv || defaultAiApiKeyEnv,
    });

    return {
      enabled: true,
      provider: defaultAiProvider,
      baseUrl: defaultAiBaseUrl,
      model: defaultAiModel,
      apiKeyEnv,
      skillPath: configuredDefaultSkillPath,
    };
  } finally {
    if (rl) rl.close();
  }
};
