import superagent from 'superagent';
import { AppSingleton } from './http_app';

export const sendMsgToSlack = async (msg: string, json: any | undefined = undefined) => {
  const slack = AppSingleton.GetEnv().SLACK_URL_FOR_NOTIFICATION;

  try {
    slack &&
      slack.length > 0 &&
      (await superagent
        .post(slack)
        .set('Content-Type', 'application/json')
        .send(json ?? { text: msg }));
  } catch (error) {
    console.log('Cannot send message to Slack', error);
  }
};
