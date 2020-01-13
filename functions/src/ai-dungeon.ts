import * as functions from 'firebase-functions';
import axios from 'axios';

import { Story, Session, Selection, Config, User } from './interfaces';

export class AIDungeon {
  static api = `https://api.aidungeon.io`;
  static token = functions.config().aidungeon.token;

  static authenticate(email: string, password: string): Promise<User> {
    return axios
      .post<User>(`${AIDungeon.api}/users`, {
        email,
        password,
      })
      .then(res => res.data);
  }

  static getConfig(): Promise<Config> {
    return axios
      .get<Config>(`${AIDungeon.api}/sessions/*/config`, {
        headers: {
          'x-access-token': AIDungeon.token,
        },
      })
      .then(res => res.data);
  }

  static createSession(selection: Selection): Promise<Session> {
    return axios
      .post<Session>(`${AIDungeon.api}/sessions`, selection, {
        headers: {
          'x-access-token': AIDungeon.token,
        },
      })
      .then(res => res.data);
  }

  static respond(input: string, sessionId: number): Promise<Story> {
    return axios
      .post<Story[]>(
        `${AIDungeon.api}/sessions/${sessionId}/inputs`,
        { text: input },
        {
          headers: {
            'x-access-token': AIDungeon.token,
          },
        },
      )
      .then(stories => stories.data[stories.data.length - 1]);
  }
}
