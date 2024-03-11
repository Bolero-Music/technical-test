// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://aws.amazon.com/developers/getting-started/nodejs/

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  GetSecretValueCommandOutput,
  GetSecretValueCommandInput,
} from '@aws-sdk/client-secrets-manager'; // ES Modules import
import { CleanEnvType } from '../dotenv';

export type ArtistVault = {
  ADDR: string;
  KEY: string;
};

export const getArtistVault = async (
  secretKey: string,
  env: CleanEnvType | NodeJS.ProcessEnv
): Promise<string | null> => {
  // Create a Secrets Manager client
  const client = new SecretsManagerClient({
    region: 'eu-west-1',
    credentials: {
      accessKeyId: env.ACCESS_KEY!,
      secretAccessKey: env.ACCESS_SECRET!,
    },
  });

  const secretValueInput: GetSecretValueCommandInput = {
    SecretId: secretKey,
  };

  const command: GetSecretValueCommand = new GetSecretValueCommand(secretValueInput);

  try {
    const res: GetSecretValueCommandOutput = await client.send(command);
    const secretString = res.SecretString;
    const secretBinary = res.SecretBinary;
    if (secretString) {
      return secretString;
    }

    if (secretBinary) {
      const buff = Buffer.from(secretBinary);
      const decodedBinarySecret = buff.toString('ascii');
      return decodedBinarySecret;
    }

    return null;
  } catch (error) {
    console.log('Error in getArtistVault', error);
    return null;
  }
};
