import { artists } from '@prisma/client';

export interface IPurchaseWithSharesAndDetails {
  id: bigint;
  buyer_id: bigint | null;
  buyer_type: string | null;
  payment_type: string | null;
  payment_status: string | null;
  purchase_shares: {
    share_token_id: bigint;
  }[];
  gift_details: {
    id: bigint;
  }[];
  stripe_details: {
    id: bigint;
  }[];
  direct_sale_details: {
    id: bigint;
  }[];
  songs: {
    artists: {
      card_name: string | null;
      slug: string | null;
      tokenized: boolean;
    };
  };
}

export interface IBuyerAddressWithShareTokenIds {
  buyerAddress: string | null;
  sharesTokenIdsToTransfer: bigint[];
  paymentStatus: string | null;
  artist: Pick<artists, 'card_name' | 'slug' | 'tokenized'>;
  detailId: bigint | null;
  detailType: 'StripeDetail' | 'GiftDetail' | 'DirectSaleDetail' | null;
}
