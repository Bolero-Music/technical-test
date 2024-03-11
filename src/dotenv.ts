import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import path from 'path';
import { cleanEnv, str, port, num, bool } from 'envalid';

export type AppEnv = CleanEnvType | NodeJS.ProcessEnv;
const DEFAULT_PORT = 3001;

export const initDotEnv = () => {
  const DEFAULT_NODE_ENV = process.env.NODE_ENV ?? 'development';
  const resultDotEnv = dotenv.config({
    path: path.join(__dirname, '..', `.env.${DEFAULT_NODE_ENV}`),
  });

  if (resultDotEnv.error) {
    console.log('Error in dotenv init');
    throw resultDotEnv.error;
  }

  dotenvExpand(resultDotEnv);
};

const cleanEnvValidator = {
  PORT: port({ default: DEFAULT_PORT }),
  DATABASE_URL: str(),
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'] }),
  ALCHEMY_POLYGON_URL: str(),
  ALCHEMY_POLYGON_NETWORK_ID: num(),
  ALCHEMY_POLYGON_WS: str(),
  WALLET_MINIMUM_MATIC_AMOUNT_CEIL: num(),
  BOLERO_BACKEND_ACCESS_TOKEN: str(),
  SLACK_URL_FOR_NOTIFICATION: str(),
  BOLERO_NFT_CONTRACT_ADDR_V3: str(),
  BOLERO_NFT_MANAGER_CONTRACT_ADDR_V3: str(),
  API_BASE_URL: str(),
  ACCESS_KEY: str(),
  ACCESS_SECRET: str(),
  GAS_PERCENT_TO_ADD: num(),
};

// We need to declare a dummy function in order to get its return type
const localCleanEnv = () => cleanEnv(process.env, cleanEnvValidator);

export type CleanEnvType = ReturnType<typeof localCleanEnv>;

export const initEnvalid = (): CleanEnvType => {
  return localCleanEnv();
};
