import { getData, updateData } from "./storage.js";

const SOUND_FILES = {
  button: "button.wav",
  countdown: "countdown.wav",
  goal: "goal.wav",
  basket: "basket.wav",
  flip: "card-flip.wav",
  correct: "correct.wav",
  incorrect: "incorrect.wav",
  win: "win.wav",
  draw: "draw.wav",
  kick: "kick.wav",
  miss: "miss.wav",
  sumoStart: "sumo/start.wav",
  sumoMove: "sumo/move.wav",
  sumoPush: "sumo/push.wav",
  sumoImpact: "sumo/impact.wav",
  sumoFall: "sumo/fall.wav",
  sumoPoint: "sumo/point.wav",
};

function assetUrl(path) {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `../${path}`;
}

export class ArcadeAudio {
  constructor() {
    this.settings = { sound: true, music: false, volume: 0.65 };
    this.cache = new Map();
    this.music = null;
  }

  async loadSettings() {
    const data = await getData();
    this.settings = {
      sound: data.settings.sound,
      music: data.settings.music,
      volume: data.settings.volume,
    };
    return this.settings;
  }

  getSound(name) {
    if (!this.cache.has(name)) {
      const file = SOUND_FILES[name] || SOUND_FILES.button;
      const audio = new Audio(assetUrl(`assets/sounds/${file}`));
      audio.preload = "auto";
      this.cache.set(name, audio);
    }
    return this.cache.get(name);
  }

  play(name) {
    if (!this.settings.sound) return;
    const sound = this.getSound(name).cloneNode();
    sound.volume = Math.max(0, Math.min(1, this.settings.volume));
    sound.play().catch(() => {});
  }

  async setSound(enabled) {
    this.settings.sound = enabled;
    await updateData((data) => {
      data.settings.sound = enabled;
      return data;
    });
  }

  async setVolume(volume) {
    this.settings.volume = Math.max(0, Math.min(1, Number(volume)));
    await updateData((data) => {
      data.settings.volume = this.settings.volume;
      return data;
    });
  }

  async setMusic(enabled) {
    this.settings.music = enabled;
    await updateData((data) => {
      data.settings.music = enabled;
      return data;
    });
    if (!enabled) this.stopMusic();
  }

  startMusic() {
    if (!this.settings.music || this.music) return;
    this.music = new Audio(assetUrl("assets/sounds/music.wav"));
    this.music.loop = true;
    this.music.volume = Math.max(0, Math.min(0.22, this.settings.volume * 0.32));
    this.music.play().catch(() => {
      this.music = null;
    });
  }

  stopMusic() {
    if (!this.music) return;
    this.music.pause();
    this.music.currentTime = 0;
    this.music = null;
  }
}

export const arcadeAudio = new ArcadeAudio();
