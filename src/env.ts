import { z } from "zod";

const normalize = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

const requiredString = () =>
  z.preprocess(normalize, z.string().min(1, "Value is required"));

const optionalString = () =>
  z.preprocess(normalize, z.string().min(1)).optional();

const serverSchema = z.object({
  DATABASE_URL: z.preprocess(normalize, z.string().url()),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OPENAI_API_KEY: requiredString(),
  CLERK_SECRET_KEY: requiredString(),
  UPLOADTHING_TOKEN: requiredString(),
  DATALAB_API_KEY: optionalString(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requiredString(),
});

const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "true" ||
  process.env.SKIP_ENV_VALIDATION === "1";

const parseEnv = <T extends z.AnyZodObject>(
  schema: T,
  values: z.input<T>,
): z.infer<T> => {
  if (skipValidation) {
    const result = schema.partial().safeParse(values);
    if (result.success) {
      return result.data as z.infer<T>;
    }

    return values as z.infer<T>;
  }

  return schema.parse(values);
};

export const env = {
  server: parseEnv(serverSchema, {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    DATALAB_API_KEY: process.env.DATALAB_API_KEY,
  }),
  client: parseEnv(clientSchema, {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }),
};

