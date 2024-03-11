import { PrismaClient } from '@prisma/client';
import { CleanEnvType } from '../../dotenv';
import { ArtistCardNameAndSlug, getArtistsWithPublishedSongs } from '../../model/artists';
import { ARTISTS_VAULTS } from '../../util/artist_vault_infos';

export const findArtistWithPublishedSongsVaults = async (db: PrismaClient) => {
  const artistVaults = [];
  console.log('findArtistWithPublishedSongsVaults starting');
  try {
    const artists: ArtistCardNameAndSlug[] | [] = await getArtistsWithPublishedSongs(db);
    for await (const artist of artists) {
      const artistVaultName = artist.tokenized ? artist.card_name : artist.slug;
      const vault = await ARTISTS_VAULTS(artistVaultName);
      if (!vault) {
        console.log('Error in findArtistWithPublishedSongsVaults: vault not found');
      } else {
        artistVaults.push(vault.ADDR.toLowerCase());
      }
    }
  } catch (err) {
    console.log('error in findArtistWithPublishedSongsVaults: ', err);
  }
  return artistVaults;
};

export const getManagerContractVersion = async (env: CleanEnvType, contractAddress: string) => {
  if (env.BOLERO_NFT_MANAGER_CONTRACT_ADDR_V3.toLowerCase() === contractAddress.toLowerCase()) {
    return 3;
  }
};
