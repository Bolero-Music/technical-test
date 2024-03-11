import { bc_transfer_packages, PrismaClient } from '@prisma/client';

export const createBcTransferPackage = async (
  db: PrismaClient,
  txHash: string,
  version: number,
  transferType: 'grant_shares_to_wallet' | 'grant_shares_to_vault' | 'transfer_shares_to_wallet',
  transferrableDetailId: bigint,
  transferrableDetailType: 'StripeDetail' | 'GiftDetail' | 'DirectSaleDetail',
  sharesCount: number
): Promise<bc_transfer_packages | null> => {
  try {
    return await db.bc_transfer_packages.create({
      data: {
        tx_hash: txHash,
        version,
        transfer_type: transferType,
        shares_count: sharesCount,
        transferrable_detail_type: transferrableDetailType,
        transferrable_detail_id: transferrableDetailId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  } catch (err) {
    console.log('Error in createBcTransferPackage for txHash: ', txHash, 'with error: ', err);
    return null;
  }
};
