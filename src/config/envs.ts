import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
}

const envVarsSchema = joi.object<EnvVars>({
  PORT: joi.number().default(3000),
});

function validateEnv<T>(
  schema: joi.ObjectSchema<T>,
  env: NodeJS.ProcessEnv = process.env,
): T {
  const { value, error } = schema.validate(env, {
    allowUnknown: true,
    convert: true,
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return value;
}

type LowerCaseKeys<T> = {
  [K in keyof T as Lowercase<string & K>]: T[K];
};

const validatedEnv = validateEnv(envVarsSchema);

export const envs: LowerCaseKeys<EnvVars> = {
  port: validatedEnv.PORT,
};
