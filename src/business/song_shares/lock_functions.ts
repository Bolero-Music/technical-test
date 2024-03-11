import { BigNumber, ethers } from 'ethers';
import { CleanEnvType } from '../../dotenv';
import { setNftV3MintContract } from '../../util/contracts_connection';
import { calculateGasPrice } from '../../util/gas_price_methods';
import { AppConfig } from '../../server';
import { updateShareIsLocked } from '../../model/shares';

const isLocked = async (
  tokenId: BigNumber,
  env: CleanEnvType,
  bcProvider: ethers.providers.JsonRpcProvider
): Promise<boolean | string> => {
  try {
    const boleroNftV3 = await setNftV3MintContract(env, bcProvider);
    return boleroNftV3?.isLocked(tokenId);
  } catch (error) {
    const errMsg = `error in isLocked function, error: ${error}`;
    console.error(errMsg);
    return errMsg;
  }
};

export const handleTokenUnlock = async (
  managerContractSignedWithKeeper: ethers.Contract,
  tokenId: BigNumber,
  appConfig: AppConfig,
  version: number
): Promise<{ isUnLocked: boolean }> => {
  console.log('starting handleTokenUnlock');
  const env = appConfig.env as CleanEnvType;
  const bcProvider = appConfig.bcProvider;
  const db = appConfig.db;
  if (!bcProvider) {
    console.log('error in handleTokenUnlock, bcProvider is null');
    return { isUnLocked: false };
  }
  try {
    const locked = await isLocked(tokenId, env, bcProvider);
    if (typeof locked !== 'boolean') {
      console.error('error in handleTokenUnlock, isLocked getter failed with response:', locked);
      return { isUnLocked: false };
    }
    if (!locked) {
      console.error('token is already unlocked');
      await updateShareIsLocked(db, tokenId, version, locked);
      return { isUnLocked: true };
    }
    const gasEstimated = await managerContractSignedWithKeeper.estimateGas.unlockId(tokenId);
    const gas = await calculateGasPrice(env, gasEstimated);
    const tx = await managerContractSignedWithKeeper.unlockId(tokenId, gas);
    const txReceipt = await tx.wait();
    return { isUnLocked: txReceipt.status !== 0 };
  } catch (error) {
    console.log('error in handleTokenUnlock', error);
    return { isUnLocked: false };
  }
};

export const handleTokenLock = async (
  managerContractSignedWithKeeper: ethers.Contract,
  tokenId: BigNumber,
  appConfig: AppConfig,
  version: number
): Promise<boolean> => {
  console.log('starting handleTokenLock');
  const env = appConfig.env as CleanEnvType;
  const bcProvider = appConfig.bcProvider;
  if (!bcProvider) {
    console.log('error in handleTokenLock, bcProvider is null');
    return false;
  }
  const db = appConfig.db;
  const locked = await isLocked(tokenId, env, bcProvider);
  if (typeof locked !== 'boolean') {
    console.log('error in handleTokenUnlock, isLocked contract function failed');
    return false;
  }
  if (locked) {
    console.log('token is already locked');
    await updateShareIsLocked(db, tokenId, version, locked);
    return true;
  }
  try {
    const gasEstimated = await managerContractSignedWithKeeper.estimateGas.lockId(tokenId);
    const gas = await calculateGasPrice(env, gasEstimated);
    if (!gas) {
      console.log('error in handleTokenLock, gas is null');
      return false;
    }
    const tx = await managerContractSignedWithKeeper.lockId(tokenId, gas);
    const txReceipt = await tx.wait();
    return txReceipt.status !== 0;
  } catch (error) {
    console.log('error in handleTokenLock', error);
    return false;
  }
};
