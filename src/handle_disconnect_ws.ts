import { AppSingleton } from './http_app';
import { AppConfig } from './server';
import { Contract } from 'ethers';
import { BOLERO_NFT_CONTRACT_ABI_V3 } from './smartcontract_abi/bolero_nft_v3';
import { listenEventSongShare } from './business/song_shares_events';

const EXPECTED_PONG_BACK = 15000;
const KEEP_ALIVE_CHECK_INTERVAL = 7500;

const listenBCSongSharesEvent = async (appConfig: AppConfig, contractMint: Contract) => {
  await listenEventSongShare(appConfig, contractMint);
};

export const refreshConnection = (appConfig: AppConfig) => {
  let pingTimeout = null;
  let keepAliveInterval = null;
  try {
    appConfig.bcWsProvider = AppSingleton.GetBCWebsocketsProvider(true);
    appConfig.bcWsProvider._websocket.on('open', () => {
      keepAliveInterval = setInterval(() => {
        appConfig.bcWsProvider._websocket.ping();

        // Use `WebSocket#terminate()`, which immediately destroys the connection,
        // instead of `WebSocket#close()`, which waits for the close timer.
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        pingTimeout = setTimeout(() => {
          appConfig.bcWsProvider._websocket.terminate();
        }, EXPECTED_PONG_BACK);
      }, KEEP_ALIVE_CHECK_INTERVAL);

      //Ecoute V3
      try {
        console.log(
          'listenBCNftEvent V3 starting for nft mint contract ',
          appConfig.env.BOLERO_NFT_CONTRACT_ADDR_V3
        );
        listenBCSongSharesEvent(
          appConfig,
          new Contract(
            appConfig.env.BOLERO_NFT_CONTRACT_ADDR_V3,
            BOLERO_NFT_CONTRACT_ABI_V3,
            appConfig.bcWsProvider
          )
        );
      } catch (err) {
        console.log('Error listenBCNftEvent V3', err);
      }
    });

    appConfig.bcWsProvider._websocket.on('close', () => {
      console.error('The websocket connection was closed');
      clearInterval(keepAliveInterval);
      clearTimeout(pingTimeout);
      refreshConnection(appConfig);
    });

    appConfig.bcWsProvider._websocket.on('pong', () => {
      clearInterval(pingTimeout);
    });
  } catch (err) {
    console.log('Error refreshConnection', err);
    clearInterval(keepAliveInterval);
    clearTimeout(pingTimeout);
    refreshConnection(appConfig);
  }
};
