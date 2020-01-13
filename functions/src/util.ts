import { Setting, CustomSetting } from './interfaces';
import { femaleNouns, speechTiggers, sounds } from './data';
import { OptionItems } from 'actions-on-google/dist/service/actionssdk';

function quoteFixer(text: string) {
  const lines = text.split('\n');
  let quoteCount = 0;

  return lines
    .map((line, index) => {
      let newLine = line;
      quoteCount += (line.match(/"/g) || []).length;
      const next = lines[index + 1] || '';

      // Quote count is uneven, probably exists on next line
      if (next.startsWith('"') && quoteCount & 1) {
        newLine += '"';
        lines[index + 1] = next.replace(/^"/, '');
        quoteCount++;

        // Quote count is uneven, probably missing
      } else if (quoteCount & 1) {
        newLine += '"';
        quoteCount++;
      }
      return newLine;
    })
    .join('\n');
}

function newLineFixer(text: string) {
  return text.trim().replace(/\n+/g, '\n');
}

function splitSentences(text: string) {
  const sentences = [''];
  let quoteCount = 0;
  let index = 0;
  for (const char of text) {
    if (char === '"') quoteCount++;
    if (char === '\n') continue;
    sentences[index] += char;

    // Outside of quote, create new sentence
    if (!(quoteCount & 1) && /[.:;]/.test(char)) sentences[++index] = '';
  }

  return sentences.map(sentence => sentence.trim());
}

function genderizeQuote(
  sentence: string,
  prevFemale: boolean,
): { sentence: string; female: boolean } {
  // No quote
  if (!/"/.test(sentence)) return { sentence, female: prevFemale };

  const quoteRegex = /("[\s\S]+?")/g;
  const noQuotes = sentence.replace(quoteRegex, '').toLowerCase();
  const female = !noQuotes.length
    ? prevFemale
    : femaleNouns.some(noun => noQuotes.includes(noun)) &&
      speechTiggers.some(trigger => noQuotes.includes(trigger));

  return {
    female,
    sentence: sentence.replace(
      quoteRegex,
      `<voice gender="${female ? 'female' : 'male'}" variant="${
        female ? 1 : 2
      }">$1</voice>`,
    ),
  };
}

export function analyzeStory(text: string): string {
  const sentences = splitSentences(quoteFixer(newLineFixer(text)));

  let prevFemale = false;

  return sentences
    .map((sentence, index) => {
      let newSentence = sentence;

      const genderized = genderizeQuote(newSentence, prevFemale);
      newSentence = genderized.sentence;
      prevFemale = genderized.female;

      return newSentence;
    })
    .join(' ');
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
