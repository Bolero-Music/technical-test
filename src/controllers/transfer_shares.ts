import { Response, Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CleanEnvType } from '../dotenv';
import { getDbUserWallet } from '../model/users';
import { sendMsgToSlack } from '../slack';
import {
  setNftV3ManagerContract,
  setNftV3MintContractWithSigner,
} from '../util/contracts_connection';
import { ARTISTS_VAULTS } from '../util/artist_vault_infos';
import { verifyAuthorized } from './api_controller';
import { BigNumber, ethers } from 'ethers';
import { calculateGasPrice } from '../util/gas_price_methods';
import { ArtistVault } from '../business/secretKeyService';
import { PrismaClient } from '@prisma/client';
import { warnWalletFunds } from '../util/wallet_funds';
import { handleTokenLock, handleTokenUnlock } from '../business/song_shares/lock_functions';
import { AppConfig } from '../server';
import { createBcTransferPackage } from '../model/bc_transfer_packages';
import { IBuyerAddressWithShareTokenIds, IPurchaseWithSharesAndDetails } from '../types/Purchases';
import { fetchPurchaseRecipientAndAvailableSharesById } from '../model/purchases';

const handleError = async (
  msg: string,
  returnDataObject: { isSuccess: boolean; error: any },
  withLock: boolean,
  appConfig: AppConfig,
  managerContractSignedWithKeeper?: ethers.Contract,
  tokenIdBigNumber?: BigNumber,
  version?: number
) => {
  console.log(msg);
  // relock token
  if (!managerContractSignedWithKeeper || !tokenIdBigNumber || !version) {
    returnDataObject.error =
      'error in handleShareTransferProcess, managerContractSignedWithKeeper is null';
    return returnDataObject;
  }
  if (withLock)
    await handleTokenLock(managerContractSignedWithKeeper, tokenIdBigNumber, appConfig, version);
  return returnDataObject;
};

const findArtistVault = async (artist: IPurchaseWithSharesAndDetails['songs']['artists']) => {
  try {
    // FIND A WAY TO USE ONLY ONE REF BY ARTIST
    const artistVault = artist.tokenized ? artist.card_name : artist.slug;
    if (!artistVault) return null;
    const receiverData = await ARTISTS_VAULTS(artistVault);
    return receiverData;
  } catch (err) {
    return null;
  }
};

const handleTransfer = async (
  env: CleanEnvType,
  bcProvider: ethers.providers.JsonRpcProvider,
  db: PrismaClient,
  userId: number,
  tokenIdBigNumber: BigNumber,
  artist: IPurchaseWithSharesAndDetails['songs']['artists']
): Promise<{
  tx: any;
  error: string | null;
}> => {
  console.log('starting handleTransfer');
  try {
    // Find the vault of the artist to send the nft from it
    let tx = null;
    if (!artist) {
      return { tx, error: 'error in handleShareTransfer, artist is null' };
    }
    const artistVault: ArtistVault | null = await findArtistVault(artist);
    if (!artistVault) {
      return { tx, error: 'error in handleShareTransfer, artistVault is null' };
    }

    // Check if the vault has enough funds
    await warnWalletFunds(
      artistVault.ADDR,
      env.WALLET_MINIMUM_MATIC_AMOUNT_CEIL,
      bcProvider,
      `${artist.slug} vault`
    );

    // Find the contract of the nft and sign it with the vault's private key
    const boleroNftV3 = await setNftV3MintContractWithSigner(env, bcProvider, artistVault.KEY);
    if (!boleroNftV3) {
      return { tx, error: 'error in handleShareTransfer, boleroNftV3 is null' };
    }

    // Find the wallet of the user to send the nft to it
    const walletAddress = await getDbUserWallet(db, BigInt(userId));
    if (!walletAddress) {
      return { tx, error: 'error in handleShareTransfer, walletAddress is null' };
    }

    // Estimate gas and send the nft
    const gasEstimated = await boleroNftV3.estimateGas.safeTransferFrom(
      artistVault.ADDR,
      walletAddress,
      tokenIdBigNumber
    );
    const gas = await calculateGasPrice(env, gasEstimated);
    if (!gas) {
      return { tx, error: 'error in handleShareTransfer, gas is null' };
    }
    try {
      tx = await boleroNftV3.safeTransferFrom(
        artistVault.ADDR,
        walletAddress,
        tokenIdBigNumber,
        gas
      );
    } catch (err) {
      return { tx, error: `error in handleShareTransfer: ${err}` };
    }
    return { error: null, tx };
  } catch (err) {
    return { error: `error in handleTransfer: ${err}`, tx: null };
  }
};

const fetchSecondaryMarket = async (db: PrismaClient, tokenId: bigint, version: number) => {
  const songSecondaryMarket = await db.shares.findFirst({
    where: {
      bc_token_id: tokenId,
      contract_version: version,
    },
    select: {
      secondary_market: true,
    },
  });
  if (!songSecondaryMarket) return null;
  return songSecondaryMarket.secondary_market;
};

const handleTransferProcess = async (
  appConfig: AppConfig,
  purchase: IBuyerAddressWithShareTokenIds,
  userId: number,
  txIdsAndTokenIdObject: {
    purchase_id: number;
    version: number;
  }
): Promise<{
  isSuccess: boolean;
  error: string | null;
}> => {
  console.log('starting handle transfer');
  let errors = [];
  let isSuccess = false;
  let env = appConfig.env as CleanEnvType;
  let bcProvider = appConfig.bcProvider;
  const db = appConfig.db;
  const version = txIdsAndTokenIdObject.version;

  if (!bcProvider) {
    const msg = 'error in handleShareTransferProcess, bcProvider is null';
    return await handleError(msg, { isSuccess: false, error: msg }, false, appConfig);
  }
  try {
    const managerContractSignedWithKeeper = await setNftV3ManagerContract(
      env,
      bcProvider,
      'NFT-KEEPER'
    );

    if (!managerContractSignedWithKeeper) {
      const msg = 'error in handleShareTransferProcess, managerContractSignedWithKeeper is null';
      return await handleError(msg, { isSuccess: false, error: msg }, false, appConfig);
    }

    if (!purchase.detailType || !purchase.detailId) {
      const msg =
        'error in handleShareTransferProcess, purchase.detailType or purchase.detailId is null';
      return await handleError(msg, { isSuccess: false, error: msg }, false, appConfig);
    }

    if (!purchase.sharesTokenIdsToTransfer[0]) {
      const msg = 'error in handleShareTransferProcess, sharesTokenIdsToTransfer is null';
      return await handleError(msg, { isSuccess: false, error: msg }, false, appConfig);
    }

    const isPrimaryMarket: boolean | null = !(await fetchSecondaryMarket(
      db,
      purchase.sharesTokenIdsToTransfer[0],
      version
    ));

    const tokenIdsList = purchase.sharesTokenIdsToTransfer;
    for (let i = 0; i < tokenIdsList.length; i++) {
      const tokenId = tokenIdsList[i];
      const tokenIdBigNumber = BigNumber.from(tokenId);

      // Try to unlock the share
      let { isUnLocked } = await handleTokenUnlock(
        managerContractSignedWithKeeper,
        tokenIdBigNumber,
        appConfig,
        version
      );

      // If the share is still locked, stop the process, handle error and return
      if (!isUnLocked) {
        const msg = `error in handleShareTransferProcess, isUnLocked is false for token id ${tokenId}`;
        isSuccess = false;
        await handleError(
          msg,
          { isSuccess, error: msg },
          isPrimaryMarket,
          appConfig,
          managerContractSignedWithKeeper,
          tokenIdBigNumber,
          version
        );
        errors.push(msg);
        continue;
      }

      // Launch the share transfer
      const { tx, error } = await handleTransfer(
        env,
        bcProvider,
        db,
        userId,
        tokenIdBigNumber,
        purchase.artist
      );

      // If the share transfer launch failed, stop the process, handle error and pass to the next share
      if (error) {
        const msg = `error in handleShareTransferProcess: ${error}`;
        isSuccess = false;
        await handleError(
          error,
          { isSuccess, error: error },
          isPrimaryMarket,
          appConfig,
          managerContractSignedWithKeeper,
          tokenIdBigNumber,
          version
        );
        errors.push(msg);
        continue;
      }

      // Create the bc_transfer_package

      const bcTransferPackage = await createBcTransferPackage(
        db,
        tx.hash,
        3,
        'transfer_shares_to_wallet',
        purchase.detailId,
        purchase.detailType,
        1
      );
      if (!bcTransferPackage) {
        const errorMsg = 'Error in handleShareTransferProcess, bcTransferPackage is null';
        isSuccess = false;
        await handleError(
          errorMsg,
          { isSuccess, error: errorMsg },
          isPrimaryMarket,
          appConfig,
          managerContractSignedWithKeeper,
          tokenIdBigNumber,
          version
        );
        errors.push(errorMsg);
        continue;
      }

      // Wait for the tx to be mined and check if it's successful
      const txReceipt = tx.wait();
      if (txReceipt.status === 0) {
        const msg = `error in handleShareTransferProcess, txReceipt.status is 0 (reverted) for txHash: ${tx.hash}`;
        isSuccess = false;
        await handleError(
          msg,
          { isSuccess, error: msg },
          isPrimaryMarket,
          appConfig,
          managerContractSignedWithKeeper,
          tokenIdBigNumber,
          version
        );
        errors.push(msg);
        continue;
      }

      isSuccess = true;

      // If the tx is successful and the share is still in primary market, lock it.
      if (isPrimaryMarket) {
        const isLocked = await handleTokenLock(
          managerContractSignedWithKeeper,
          tokenIdBigNumber,
          appConfig,
          version
        );

        // If the share is still unlocked, stop the process, handle error and return
        if (!isLocked) {
          isSuccess = false;
          const msg = 'error in handleShareTransferProcess, isLocked is false';
          await handleError(
            msg,
            { isSuccess, error: msg },
            true,
            appConfig,
            managerContractSignedWithKeeper,
            tokenIdBigNumber,
            version
          );
          errors.push(msg);
        }
      }
    }

    if (!isSuccess) {
      const errorsString = errors.join(' ');
      const error = `several errors in handleShareTransferProcess: ${errorsString}`;

      return { isSuccess, error };
    }
    return { isSuccess: true, error: null };
  } catch (error) {
    const msg = `error in handleShareTransferProcess: ${error}`;
    console.log(msg);
    return { isSuccess: false, error: msg };
  }
};

export const transferSharesProcess = async (
  req: Request<
    {},
    {},
    {
      token: string;
      user_id: number;
      purchase_ids_and_token_ids_list: {
        purchase_id: number;
        token_ids: number[];
        version: number;
      }[];
    }
  >,
  res: Response
) => {
  console.log('transferSharesProcess request received');
  const appConfig = req.appConfig;
  const token = req.body.token;
  const env = appConfig.env as CleanEnvType;

  const { isAuthorized, message, status } = verifyAuthorized(
    req.path,
    token,
    env.BOLERO_BACKEND_ACCESS_TOKEN
  );
  if (!isAuthorized) {
    console.error(message);
    return res.sendStatus(status);
  }

  const tokenIdsByPurchaseId = req.body.purchase_ids_and_token_ids_list;
  if (tokenIdsByPurchaseId.length === 0) {
    const msg = 'transferSharesProcess: No token ids to transfer';
    console.error(msg);
    await sendMsgToSlack(msg);
    return res.status(StatusCodes.BAD_REQUEST).send(msg);
  }

  const userId = req.body.user_id;
  if (!userId) {
    const msg = 'transferSharesProcess: No user id';
    console.error(msg);
    await sendMsgToSlack(msg);
    return res.status(StatusCodes.BAD_REQUEST).send(msg);
  }

  res.status(StatusCodes.OK).send('transferShareProcess started successfully');

  let errors = [];

  for (let index = 0; index < tokenIdsByPurchaseId.length; index++) {
    const purchaseIdsAndTokenIdObject = tokenIdsByPurchaseId[index];
    const { errorMessage, formattedRecipient } = await fetchPurchaseRecipientAndAvailableSharesById(
      purchaseIdsAndTokenIdObject.purchase_id,
      appConfig.db,
      'transfer'
    );

    if (!formattedRecipient) {
      errors.push(
        `transferSharesProcess: error while fetching purchase with id ${purchaseIdsAndTokenIdObject.purchase_id}: ${errorMessage}`
      );
      continue;
    }
    const { isSuccess, error } = await handleTransferProcess(
      appConfig,
      formattedRecipient,
      userId,
      purchaseIdsAndTokenIdObject
    );
    if (!isSuccess) {
      errors.push(
        `error while transferring shares for purchase with id ${purchaseIdsAndTokenIdObject.purchase_id}: ${error}`
      );
    }
  }

  if (errors.length > 0) {
    const msg = `transferSharesProcess: errors: ${errors.join(', ')}`;
    console.error(msg);
    await sendMsgToSlack(msg);
  }
};
