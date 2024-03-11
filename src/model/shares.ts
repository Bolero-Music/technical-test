import { PrismaClient } from '@prisma/client';
import { BigNumber } from 'ethers';

export const updateShareIsLocked = async (
  db: PrismaClient,
  shareTokenId: BigNumber,
  version: number,
  isLocked: boolean
) => {
  console.log('Updating share', shareTokenId.toBigInt(), 'to locked', isLocked);
  const shares = await db.shares.updateMany({
    where: {
      bc_token_id: shareTokenId.toBigInt(),
      contract_version: version,
    },
    data: {
      locked: isLocked,
    },
  });
  return shares;
};
