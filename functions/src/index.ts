import * as functions from 'firebase-functions';
import { actionssdk, List, JsonObject } from 'actions-on-google';
import { ActionsSdkConversation } from 'actions-on-google/dist/service/actionssdk';

import { AIDungeon } from './ai-dungeon';
import { Store, Session } from './interfaces';
import {
  analyzeStory,
  createAudio,
  createSettingsList,
  createCharactersList,
  isCustomSetting,
} from './util';

const app = actionssdk<ActionsSdkConversation<Store>>();

/* === QUESTIONS === */

const askSetting = (conv: ActionsSdkConversation<Store, JsonObject>) => {
  if (!conv.data.config) throw new Error('No config stored!');
  const settings = createSettingsList(conv.data.config.modes);
  conv.ask(
    `Please pick a setting...\nYour options are: ${Object.keys(settings)
      .join(', ')
      .replace(/, ([^,]+)$/, ', and $1')}`,
  );
  conv.ask(new List({ title: 'Settings', items: settings }));
};

const askCustom = (conv: ActionsSdkConversation<Store, JsonObject>) => {
  if (!conv.data.config) throw new Error('No config stored!');
  const mode = conv.data.config.modes.custom;
  if (isCustomSetting(mode)) conv.ask(mode.instructions);
};

const askCharacter = (
  conv: ActionsSdkConversation<Store, JsonObject>,
  setting: string,
) => {
  if (!conv.data.config) throw new Error('No config stored!');
  const characters = createCharactersList(conv.data.config.modes[setting]);
  conv.ask(
    `Select a character...\nYour options are: ${Object.keys(characters)
      .join(', ')
      .replace(/, ([^,]+)$/, ', and $1')}`,
  );
  conv.ask(new List({ title: 'Characters', items: characters }));
};

/* === INTENTS === */

app.intent('actions.intent.MAIN', async conv => {
  conv.data.selection = {};
  conv.data.prompt = 0;
  conv.data.errors = 0;

  try {
    conv.data.config = await AIDungeon.getConfig();
    conv.ask(
      `<speak>Welcome back brave adventurer!\n${createAudio(
        'welcome',
      )}</speak>`,
    );
    conv.data.stage = 'setting';
    askSetting(conv);
  } catch (error) {
    console.error(error);
    conv.close(`There is no adventure to be had, please return later.`);
  }
});

app.intent('actions.intent.OPTION', async (conv, input, option: string) => {
  if (!conv.data.config) throw new Error('No config stored!');

  switch (conv.data.stage) {
    case 'setting':
      conv.data.selection.storyMode = option;
      if (option === 'custom') {
        askCustom(conv);
        conv.data.stage = 'custom';
      } else {
        askCharacter(conv, option);
        conv.data.stage = 'character';
      }
      break;

    case 'character':
      conv.data.selection.characterType = option;
      conv.ask(`Enter your character's name...`);
      conv.data.stage = 'name';
      break;
  }
});

app.intent('actions.intent.TEXT', async (conv, input) => {
  let session: Session;
  try {
    switch (conv.data.stage) {
      case 'setting':
        conv.ask(`Sorry, "${input}" is not a valid setting.`);
        askSetting(conv);
        break;

      case 'character':
        conv.ask(`Sorry, "${input}" is not a valid character.`);
        askCharacter(conv, conv.data.selection.storyMode as string);
        break;

      case 'name':
        conv.data.selection.name = input;
        session = await AIDungeon.createSession(conv.data.selection);
        conv.data.sessionId = session.id;
        conv.ask(
          `<speak>${createAudio(
            conv.data.selection.storyMode as any,
          )}${analyzeStory(session.story[0].value)}</speak>`,
        );
        conv.ask('What will you do?');
        conv.data.stage = 'done';
        break;

      case 'custom':
        conv.data.selection.customPrompt = input;
        session = await AIDungeon.createSession(conv.data.selection);
        conv.data.sessionId = session.id;
        conv.ask(
          `<speak>${createAudio(
            conv.data.selection.storyMode as any,
          )}${analyzeStory(session.story[0].value)}</speak>`,
        );
        conv.ask('What will you do?');
        conv.data.stage = 'done';
        break;

      case 'done':
        if (!conv.data.sessionId) throw new Error('No session id stored!');
        const story = await AIDungeon.respond(input, conv.data.sessionId);
        conv.ask(`<speak>${analyzeStory(story.value)}</speak>`);
        if (conv.data.prompt < 2) conv.ask('Now what?');
        break;
    }

    conv.data.errors = 0;
  } catch (error) {
    console.error(error);
    if (conv.data.errors < 2) {
      conv.ask(
        `Your adventure had a hiccup, please tell me what you do again?`,
      );
    } else {
      conv.close(
        `Your adventuring came to an unexpected end, please return later.`,
      );
    }
    conv.data.errors++;
  }

  conv.data.prompt++;
});

app.intent('actions.intent.CANCEL', conv => {
  conv.close(
    `Till we meet again ${conv.data.selection.characterType ||
      'unnamned'} ${conv.data.selection.name || 'adventurer'}!`,
  );
});

export const aiDungeon = functions.https.onRequest(app);
