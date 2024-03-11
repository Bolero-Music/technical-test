import { PrismaClient } from '@prisma/client';
import { IUserIdAndUsername } from '../types/Users';

export const getDbUserWallet = async (db: PrismaClient, userId: bigint) => {
  let wallet = null;
  try {
    const user = await db.users.findUnique({
      where: {
        id: userId,
      },
      select: {
        wallet_address: true,
      },
    });

    if (user) {
      wallet = user.wallet_address;
    }
  } catch (err) {
    console.log('Error caught : users.findUnique', err);
  }
  return wallet;
};
