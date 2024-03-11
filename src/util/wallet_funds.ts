import { ethers, utils } from 'ethers';
import { sendMsgToSlack } from '../slack';

export const warnWalletFunds = async (
  wallet: string,
  ceil: number,
  provider: ethers.providers.StaticJsonRpcProvider,
  walletName?: string
) => {
  try {
    const balance = await provider.getBalance(wallet);
    const humanBalance = Number(balance.toBigInt()) / 1e18;
    const bigNumCeil = utils.parseUnits(ceil.toString(), 18);
    if (balance.lt(bigNumCeil)) {
      sendMsgToSlack(
        `WARNING!!: MATIC AMOUNT (${humanBalance.toFixed(
          6
        )} MATIC) FOR ${walletName} (${wallet}) IS UNDER ${ceil} MATIC!`
      );
    }
  } catch (error) {
    {
      sendMsgToSlack(
        `WARNING!!: THERE HAS BEEN AN ERROR IN warnWalletCeil FOR WALLET ${wallet} AND CEIL ${ceil} MATIC!`
      );
    }
  }
};
