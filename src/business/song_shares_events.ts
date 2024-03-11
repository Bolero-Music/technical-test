import { AppConfig } from '../server';
import { BigNumber, Contract, Event } from 'ethers';
import { findArtistWithPublishedSongsVaults } from './callbacks/song_shares_callbacks';
import { updateShareIsLocked } from '../model/shares';

import { handleBcTransferCreation } from '../model/bc_transfers';

export const listenEventSongShare = async (appConfig: AppConfig, contractMint: Contract) => {
  const db = appConfig.db;
  contractMint.on(
    'Transfer',
    async (from: string, to: string, tokenId: BigNumber, event: Event) => {
      const artistVaults = await findArtistWithPublishedSongsVaults(db);
      if (!artistVaults) {
        console.log('Error caught for Transfer event listening, artistVaults not found');
      }
      if (artistVaults?.includes(from.toLowerCase())) {
        try {
          await handleBcTransferCreation(tokenId, event.transactionHash);
        } catch (err) {
          console.log('Error caught for Transfer event listening', err);
        }
      }
    }
  );

  contractMint.on('TokenLocked', async (tokenId: BigNumber, approvedContract: string, event) => {
    await updateShareIsLocked(db, tokenId, 3, true);
  });

  contractMint.on('TokenUnlocked', async (tokenId: BigNumber, approvedContract: string, event) => {
    await updateShareIsLocked(appConfig.db, tokenId, 3, false);
  });
};
