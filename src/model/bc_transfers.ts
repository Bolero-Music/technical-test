import axios from 'axios';
import { BigNumber } from 'ethers';

export const handleBcTransferCreation = async (shareTokenId: BigNumber, txHash: string) => {
  const token = process.env.BOLERO_BACKEND_ACCESS_TOKEN;
  const apiBaseUrl = process.env.API_BASE_URL;
  const path = 'api/indexer/bc_transfers';
  const config = {
    headers: {
      'Content-type': 'application/json',
    },
    params: {
      auth_token: token,
    },
  };

  const data = {
    tx_hash: txHash,
    token_id: shareTokenId.toNumber(),
  };

  console.log(
    'Starting handleBcTransferCreation with shareTokenId',
    shareTokenId,
    'and txHash',
    txHash
  );

  try {
    const res = await axios.post(apiBaseUrl + path, { data }, config);
    if (res.status !== 201) {
      console.error(
        'Error in handleBcTransferCreation with status: ',
        res.status,
        'and data: ',
        res.data
      );
    }
  } catch (err) {
    console.error('Error in handleBcTransferCreation: ', err);
    // TODO: handle axios error and print only the status and the error
  }
};
