type DateString = string;

export interface Selection {
  storyMode?: string;
  characterType?: string;
  name?: string;
  customPrompt?: string;
  promptId?: string;
}

export interface Store {
  stage: 'setting' | 'character' | 'name' | 'custom' | 'done';
  errors: number;
  prompt: number;
  config?: Config;
  sessionId?: number;
  selection: Selection;
}

export interface User {
  id: number;
  accessToken: string;
  facebookAccountId: string | null;
  facebookAccessToken: string | null;
  email: string;
  username: string;
  password: string;
  gameSafeMode: boolean;
  gameShowTips: boolean;
  gameTextColor: string | null;
  gameTextSpeed: number | null;
  isSetup: boolean;
  createdAt: DateString;
  updatedAt: DateString;
  deletedAt: string | null;
}

export interface Character {
  prompts: string[];
  items1: string[];
  items2: string[];
}

export interface Setting {
  settings: string[];
  characters: { [character: string]: Character };
}

export interface CustomSetting {
  instructions: string;
  userDefined: boolean;
}

export interface Config {
  modes: { [setting: string]: Setting | CustomSetting };
}

export interface Story {
  type: string;
  value: string;
}

export interface Session {
  visibility: string;
  id: number;
  promptId: string | null;
  userId: number;
  story: Story[];
  updatedAt: DateString;
  createdAt: DateString;
  publicId: string;
}
