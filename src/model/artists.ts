import { PrismaClient } from '@prisma/client';

export type ArtistIdAndName = {
  id: bigint;
  artists: {
    name: string;
    id: bigint;
  }[];
};

export type ArtistCardNameAndSlug = {
  card_name: string;
  slug: string;
  tokenized: boolean;
};

export const getArtistByWallet = async (
  db: PrismaClient,
  wallet_address: string
): Promise<ArtistIdAndName> => {
  console.log(`starting getArtistByWallet for artist wallet address: ${wallet_address}`);
  try {
    return await db.users.findFirst({
      where: {
        wallet_address: { contains: wallet_address, mode: 'insensitive' },
      },
      select: {
        id: true,
        artists: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (err) {
    console.log('Error caught for getArtistByWallet/db.artists.findFirst', err);
    return null;
  }
};

export const getArtistsWithPublishedSongs = async (
  db: PrismaClient
): Promise<ArtistCardNameAndSlug[] | []> => {
  console.log('starting getArtistsWithPublishedSongs');
  try {
    return await db.artists.findMany({
      where: {
        songs: {
          some: {
            published: true,
          },
        },
      },
      select: {
        tokenized: true,
        card_name: true,
        slug: true,
      },
    });
  } catch (err) {
    console.log('Error caught for getArtistsWithPublishedSongs/db.artists.findMany', err);
    return [];
  }
};
