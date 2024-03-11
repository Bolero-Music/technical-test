import axios from 'axios';
import { CleanEnvType } from '../dotenv';
import { sendMsgToSlack } from '../slack';

export const handleShareSecondaryMarketUpdate = async (
  env: CleanEnvType,
  shareSecondaryMarketUpdateId: bigint
) => {
  const token = env.BOLERO_BACKEND_ACCESS_TOKEN;
  const data = {
    share_secondary_market_update: {
      is_success: true,
    },
  };

  const apiBaseUrl = process.env.API_BASE_URL;
  const sellCreationPath = `api/v1/share_secondary_market_updates/update_from_indexer/${Number(
    shareSecondaryMarketUpdateId
  )}`;
  const config = {
    headers: {
      'Content-type': 'application/json',
    },
    params: {
      auth_token: token,
    },
  };

  console.log('Sending share secondary market update to backend with data: ', data);

  try {
    const res = await axios.patch(apiBaseUrl + sellCreationPath, data, config);
    if (res.status === 200) {
      return true;
    }
    const msg = `Error in handleShareSecondaryMarketUpdate: ${res.data.errors}`;
    console.error(msg);
    await sendMsgToSlack(msg);
    return false;
  } catch (err) {
    const msg = `Error in handleShareSecondaryMarketUpdate: ${err}`;
    console.log(msg);
    await sendMsgToSlack(msg);
    return false;
  }
};
