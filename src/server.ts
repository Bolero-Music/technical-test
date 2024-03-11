import { AppSingleton } from './http_app';
import compression from 'compression'; // compresses requests
import helmet from 'helmet';
import StatusCodes from 'http-status-codes';
import { ROUTE_TRANSFER_SHARES } from './controllers/route_constants';

import { Application, Response, Request, NextFunction, json } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppEnv } from './dotenv';
import { sendMsgToSlack } from './slack';
import { ethers } from 'ethers';
import { refreshConnection } from './handle_disconnect_ws';
import { transferSharesProcess } from './controllers/transfer_shares';

declare module 'express' {
  interface Request {
    appConfig: AppConfig;
    listenedWalletAdresses: Map<string, bigint>;
  }
}

export type AppConfig = {
  db: PrismaClient;
  env: AppEnv;
  bcProvider: ethers.providers.StaticJsonRpcProvider | undefined;
  bcWsProvider: ethers.providers.WebSocketProvider | undefined;
};

const defaultErrorHandler = (
  error: any,
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log('App Default Error handle', error);
  response.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
  next();
};

const setMiddleware = (app: Application) => {
  app.use(helmet());
  app.use(compression());
  app.use(json());

  const appConfig: AppConfig = {
    env: AppSingleton.GetEnv(),
    bcProvider: AppSingleton.GetBCProvider(),
    db: AppSingleton.GetPrisma(),
    bcWsProvider: AppSingleton.GetBCWebsocketsProvider(false),
  };

  app.use((req: Request, res: Response, next: NextFunction) => {
    req.appConfig = appConfig;
    next();
  });
  app.post(ROUTE_TRANSFER_SHARES, transferSharesProcess);
  app.use(defaultErrorHandler);
};

const httpServer = (port: number) => {
  const app = AppSingleton.GetHttpApp();

  setMiddleware(app);

  app.listen(port, () => {
    console.log('=== Server listening on port %d', port);
  });
};

const main = () => {
  const env = AppSingleton.GetEnv();
  const version = AppSingleton.GetVersion();
  console.log('\n===========================');
  console.log(`=== Starting the Blockchain Indexer v. ${version}`);
  sendMsgToSlack(`=== Starting the Blockchain Indexer v. ${version}, NODE_ENV :${env.NODE_ENV}`);
  console.log('=== NODE_ENV :', env.NODE_ENV);

  const listenPort = env.PORT;

  // HTTP server
  httpServer(Number(listenPort));

  // Blockchain Listener
  const appConfig: AppConfig = {
    env: AppSingleton.GetEnv(),
    bcProvider: AppSingleton.GetBCProvider(),
    db: AppSingleton.GetPrisma(),
    bcWsProvider: AppSingleton.GetBCWebsocketsProvider(false),
  };
  refreshConnection(appConfig);
};

main();
