import { StatusCodes } from 'http-status-codes';
import { sendMsgToSlack } from '../slack';

export const verifyAuthorized = (
  path: string,
  receivedToken: string | null,
  expectedToken: string
) => {
  let message = null;
  let status = StatusCodes.OK;
  let isAuthorized = true;
  if (!receivedToken) {
    console.log('No authorized token provided', 'for path', path);
    sendMsgToSlack(`No authorized token provided for path ${path}`);
    return {
      isAuthorized: false,
      message: 'No authorized token provided',
      status: StatusCodes.FORBIDDEN,
    };
  }

  if (receivedToken !== expectedToken) {
    console.log('Invalid authorized token', receivedToken);
    sendMsgToSlack(`Invalid authorized token: ${receivedToken} for path ${path}`);
    return {
      isAuthorized: false,
      message: 'Invalid authorized token',
      status: StatusCodes.FORBIDDEN,
    };
  }
  return { isAuthorized, message, status };
};
