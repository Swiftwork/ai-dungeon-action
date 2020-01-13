import { Setting, CustomSetting } from './interfaces';
import { femaleNouns, speechTiggers, sounds } from './data';
import { OptionItems } from 'actions-on-google/dist/service/actionssdk';

function genderizeQuote(sentence: string, prev: string, next: string): string {
  // No quote
  if (!/"/.test(sentence)) return sentence;

  const quoteRegex = /("[\s\S]+?(?:"|$))/g;
  const concatNoQuotes = (prev + sentence + next)
    .replace(quoteRegex, '')
    .toLowerCase();
  const female =
    femaleNouns.some(noun => concatNoQuotes.includes(noun)) &&
    speechTiggers.some(trigger => concatNoQuotes.includes(trigger));

  return sentence.replace(
    quoteRegex,
    `<voice gender="${female ? 'female' : 'male'}" variant="${
      female ? 1 : 2
    }">$1</voice>`,
  );
}

export function analyzeStory(text: string): string {
  const sentences = text.split(/(?<=[.:;]"?)/g);

  return sentences
    .map((sentence, index) => {
      let newSentence = sentence;

      // Change voice based on gender
      newSentence = genderizeQuote(
        newSentence,
        sentences[index - 1] || '',
        sentences[index + 1] || '',
      );

      return newSentence;
    })
    .join('');
}

export function createAudio(
  id: 'welcome' | 'fantasy' | 'mystery' | 'apocalyptic' | 'zombies' | 'custom',
): string {
  const audio = sounds[id];
  return `<audio src="${audio.src}" clipBegin="${audio.start}ms" clipEnd="${audio.end}ms"></audio>`;
}

export function createSettingsList(data: {
  [mode: string]: Setting | CustomSetting;
}) {
  const modes: OptionItems = {};
  Object.entries(data).map(([name, mode]) => {
    modes[name] = {
      title: name,
      description: isCustomSetting(mode) ? mode.instructions : mode.settings[0],
    };
  });
  return modes;
}

export function createCharactersList(setting: Setting | CustomSetting) {
  const characters: OptionItems = {};
  if (!isCustomSetting(setting)) {
    Object.entries(setting.characters).map(([name, character]) => {
      characters[name] = {
        title: name,
      };
    });
  }
  return characters;
}

export function isCustomSetting(
  mode: Setting | CustomSetting,
): mode is CustomSetting {
  return 'instructions' in mode;
}
