import { PrismaClient } from '@prisma/client';
import { IBuyerAddressWithShareTokenIds, IPurchaseWithSharesAndDetails } from '../types/Purchases';

const fetchPurchaseById = async (
  purchaseId: number,
  db: PrismaClient
): Promise<IPurchaseWithSharesAndDetails | null> => {
  try {
    return await db.purchases.findUnique({
      where: {
        id: purchaseId,
      },
      select: {
        id: true,
        buyer_id: true,
        buyer_type: true,
        payment_type: true,
        payment_status: true,
        purchase_shares: {
          select: {
            share_token_id: true,
          },
        },
        stripe_details: {
          select: {
            id: true,
          },
        },
        gift_details: {
          select: {
            id: true,
          },
        },
        direct_sale_details: {
          select: {
            id: true,
          },
        },
        songs: {
          select: {
            artists: {
              select: {
                card_name: true,
                slug: true,
                tokenized: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Error in fetchPurchaseById for purchase id', purchaseId, ':', error);
    return null;
  }
};

const fetchBuyerByIdAndType = async (
  buyerId: bigint | null,
  buyerType: string | null = 'User',
  db: PrismaClient
) => {
  let errorMsg = null;
  let buyer = null;
  if (!buyerId) {
    errorMsg = 'Error in fetchBuyerByIdAndType: buyerId is null';
    return { errorMsg: errorMsg, buyer: buyer };
  }
  if (!buyerType) {
    errorMsg = 'Error in fetchBuyerByIdAndType: buyerType is null';
    return { errorMsg: errorMsg, buyer: buyer };
  }
  try {
    if (buyerType === 'User') {
      buyer = await db.users.findUnique({
        where: {
          id: buyerId,
        },
        select: {
          wallet_address: true,
        },
      });
    }
    if (buyerType === 'BlockchainUser') {
      buyer = await db.blockchain_users.findUnique({
        where: {
          id: buyerId,
        },
        select: {
          wallet_address: true,
        },
      });
    }
  } catch (error) {
    errorMsg = `Error in fetchBuyerByIdAndType for buyer id ${buyerId} and buyer type ${buyerType}: ${error}`;
  }
  return { errorMsg, buyer };
};

const fetchSharesToTransfer = async (
  purchase: IPurchaseWithSharesAndDetails,
  db: PrismaClient,
  transferType: 'grant' | 'transfer'
) => {
  let sharesToTransfer: bigint[] = [];
  let errMsg = null;
  try {
    const allSharesTokenTokenIds = purchase.purchase_shares.map((share) => share.share_token_id);
    const bcLocation = transferType === 'grant' ? 'swap' : 'vault';
    const availableShares = await db.shares.findMany({
      where: {
        bc_location: bcLocation,
        bc_token_id: {
          in: allSharesTokenTokenIds,
        },
      },
      select: {
        bc_token_id: true,
      },
    });
    availableShares.forEach((share) => {
      const tokenId = share.bc_token_id;
      if (tokenId) sharesToTransfer.push(tokenId);
    });
  } catch (error) {
    errMsg = `Error in fetchSharesToTransfer for purchase id ${purchase.id}: ${error}`;
  }
  return { sharesToTransfer, errMsg };
};

export const fetchPurchaseRecipientAndAvailableSharesById = async (
  purchaseId: number,
  db: PrismaClient,
  transferType: 'grant' | 'transfer'
): Promise<{
  errorMessage: string | null;
  formattedRecipient: IBuyerAddressWithShareTokenIds | null;
}> => {
  let errorMessage = null;
  let formattedRecipient = null;
  try {
    const purchase = await fetchPurchaseById(Number(purchaseId), db);
    if (!purchase) {
      errorMessage = `Error in fetchPurchaseRecipientById: purchase is null for purchase id ${purchaseId}`;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }
    if (purchase.payment_status !== 'paid') {
      errorMessage = `Error in fetchPurchaseRecipientById: purchase payment status is not paid for purchase id ${purchaseId}`;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }
    const { errorMsg, buyer } = await fetchBuyerByIdAndType(
      purchase.buyer_id,
      purchase.buyer_type,
      db
    );
    if (errorMsg) {
      errorMessage = errorMsg;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }
    if (!buyer) {
      errorMessage = `Error in fetchPurchaseRecipientById: buyer is null for purchase id ${purchaseId}`;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }
    const { sharesToTransfer, errMsg } = await fetchSharesToTransfer(purchase, db, transferType);
    if (errMsg) {
      errorMessage = errMsg;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }
    if (sharesToTransfer.length === 0) {
      errorMessage = `Error in fetchPurchaseRecipientById: sharesToTransfer is empty for purchase id ${purchaseId}`;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }
    let detailId = null;
    let detailType: 'StripeDetail' | 'GiftDetail' | 'DirectSaleDetail' | null = null;
    if (purchase.stripe_details[0]) {
      detailId = purchase.stripe_details[0].id;
      detailType = 'StripeDetail';
    }

    if (purchase.gift_details[0]) {
      detailId = purchase.gift_details[0].id;
      detailType = 'GiftDetail';
    }
    if (purchase.direct_sale_details[0]) {
      detailId = purchase.direct_sale_details[0].id;
      detailType = 'DirectSaleDetail';
    }

    if (!detailId || !detailType) {
      errorMessage = `Error in fetchPurchaseRecipientById: detailId or detailType are null for purchase id ${purchaseId}`;
      console.error(errorMessage);
      return { errorMessage, formattedRecipient };
    }

    formattedRecipient = {
      buyerAddress: buyer.wallet_address,
      sharesTokenIdsToTransfer: sharesToTransfer,
      paymentStatus: purchase.payment_status,
      artist: purchase.songs.artists,
      detailId: detailId,
      detailType: detailType,
    };
    return { errorMessage, formattedRecipient };
  } catch (error) {
    errorMessage = `Error in fetchPurchaseRecipientById for purchase id ${purchaseId}: ${error}`;
    console.error(errorMessage);
  }
  return { errorMessage, formattedRecipient };
};
