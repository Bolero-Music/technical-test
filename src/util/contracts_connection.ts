import { NonceManager } from '@ethersproject/experimental';
import { ethers, Wallet } from 'ethers';
import { CleanEnvType } from '../dotenv';
import { BOLERO_NFT_MANAGER_ABI_V3 } from '../smartcontract_abi/bolero_nft_manager_v3';
import { BOLERO_NFT_CONTRACT_ABI_V3 } from '../smartcontract_abi/bolero_nft_v3';
import { getWalletData } from './artist_vault_infos';
import { warnWalletFunds } from './wallet_funds';

export const setNftV3ManagerContract = async (
  env: CleanEnvType,
  bcProvider: ethers.providers.StaticJsonRpcProvider,
  role: string
) => {
  try {
    const provider = bcProvider;
    let privKey = null;
    try {
      privKey = await getWalletData(role);
    } catch (err) {
      console.log('error in getGranter', err);
      return null;
    }
    if (!privKey.KEY) {
      console.log('error in getGranter, privKey is null');
      return null;
    }
    await warnWalletFunds(privKey.ADDR, env.WALLET_MINIMUM_MATIC_AMOUNT_CEIL, provider, role);
    const wallet = new Wallet(privKey.KEY);
    const connectedWallet = wallet.connect(provider);
    const managedSigner = new NonceManager(connectedWallet);
    return new ethers.Contract(
      env.BOLERO_NFT_MANAGER_CONTRACT_ADDR_V3,
      BOLERO_NFT_MANAGER_ABI_V3,
      managedSigner
    );
  } catch (err) {
    console.log('error in setManagerContract', err);
    return null;
  }
};

export const setNftV3MintContract = async (
  env: CleanEnvType,
  bcProvider: ethers.providers.StaticJsonRpcProvider
) => {
  try {
    const provider = bcProvider;
    return new ethers.Contract(
      env.BOLERO_NFT_CONTRACT_ADDR_V3,
      BOLERO_NFT_CONTRACT_ABI_V3,
      provider
    );
  } catch (err) {
    console.log('error in setNftV3MintContract', err);
    return null;
  }
};

export const setNftV3MintContractWithSigner = async (
  env: CleanEnvType,
  bcProvider: ethers.providers.StaticJsonRpcProvider,
  connectedWalletPrivKey: string
) => {
  try {
    const provider = bcProvider;
    const wallet = new Wallet(connectedWalletPrivKey);
    const connectedWallet = wallet.connect(provider);
    const managedSigner = new NonceManager(connectedWallet);
    return new ethers.Contract(
      env.BOLERO_NFT_CONTRACT_ADDR_V3,
      BOLERO_NFT_CONTRACT_ABI_V3,
      managedSigner
    );
  } catch (err) {
    console.log('error in setNftV3MintContract', err);
    return null;
  }
};
