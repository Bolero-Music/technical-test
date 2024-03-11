import { ArtistVault, getArtistVault } from '../business/secretKeyService';
import { AppSingleton } from '../http_app';

export const ARTISTS_VAULTS = async (tokenName: string): Promise<ArtistVault | null> => {
  const env = AppSingleton.GetEnv();
  try {
    const artistVault = await getArtistVault(tokenName + '-' + env.NODE_ENV, env);
    return JSON.parse(artistVault);
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const getWalletData = async (walletName: string): Promise<string> => {
  const env = AppSingleton.GetEnv();
  try {
    const walletData = await getArtistVault(walletName + '-' + env.NODE_ENV, env);
    return JSON.parse(walletData);
  } catch (error) {
    console.log('Error in getWalletAddress', error);
    return '';
  }
};
