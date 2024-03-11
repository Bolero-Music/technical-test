import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import express, { Application } from 'express';
import { CleanEnvType, initDotEnv, initEnvalid } from './dotenv';
import { ethers } from 'ethers';
// import { createPublicClient, http } from 'viem';
// import { polygon } from 'viem/chains';

export class AppSingleton {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  private static app: Application | undefined = undefined;
  private static bcProvider: ethers.providers.StaticJsonRpcProvider = undefined;
  private static bcWsProvider: ethers.providers.WebSocketProvider = undefined;
  private static bcProviderMainNet: ethers.providers.StaticJsonRpcProvider = undefined;
  private static db: PrismaClient | undefined = undefined;
  private static env: undefined | CleanEnvType | NodeJS.ProcessEnv = undefined;
  private static version: string = '';
  private static listenedWalletAddresses: Map<string, bigint> = new Map();

  static GetHttpApp() {
    if (AppSingleton.app === undefined) {
      AppSingleton.app = express();
    }

    return AppSingleton.app;
  }

  static GetPrisma() {
    if (AppSingleton.db === undefined) {
      AppSingleton.db = new PrismaClient();
    }

    return AppSingleton.db;
  }

  static GetListenedWalletAddresses() {
    return AppSingleton.listenedWalletAddresses;
  }

  static GetBCProvider() {
    try {
      if (AppSingleton.bcProvider === undefined) {
        AppSingleton.bcProvider = new ethers.providers.StaticJsonRpcProvider(
          AppSingleton.GetEnv().ALCHEMY_POLYGON_URL,
          Number(AppSingleton.GetEnv().ALCHEMY_POLYGON_NETWORK_ID)
        );
        AppSingleton.bcProvider.pollingInterval = 5000;
      }
      return AppSingleton.bcProvider;
    } catch (error) {
      console.log('Error caught in AppSingleton.GetBCProvider', error);
      return undefined;
    }
  }

  static GetBCWebsocketsProvider(refreshConnection: boolean) {
    try {
      if (AppSingleton.bcWsProvider === undefined || refreshConnection) {
        AppSingleton.bcWsProvider = new ethers.providers.WebSocketProvider(
          AppSingleton.GetEnv().ALCHEMY_POLYGON_WS,
          Number(AppSingleton.GetEnv().ALCHEMY_POLYGON_NETWORK_ID)
        );
      }
      return AppSingleton.bcWsProvider;
    } catch (error) {
      console.log('Error caught in AppSingleton.GetBCProvider', error);
      return undefined;
    }
  }

  static GetVersion() {
    if (AppSingleton.version === '') {
      const jsonConfigStr = readFileSync(path.join(__dirname, '..', 'package.json'), {
        encoding: 'utf8',
      });
      AppSingleton.version = JSON.parse(jsonConfigStr).version;
    }

    return AppSingleton.version;
  }

  public static GetEnv(): CleanEnvType | NodeJS.ProcessEnv {
    if (!AppSingleton.env) {
      if (process.env.NODE_ENV !== 'production') {
        initDotEnv();
      }

      AppSingleton.env = initEnvalid();
    }

    return AppSingleton.env;
  }
}
