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
  ludoDice: "sky-ludo/dice-roll.wav",
  ludoMove: "sky-ludo/token-move.wav",
  ludoLeave: "sky-ludo/leave-yard.wav",
  ludoSafe: "sky-ludo/safe.wav",
  ludoCapture: "sky-ludo/capture.wav",
  ludoBlock: "sky-ludo/block.wav",
  ludoHomeEntry: "sky-ludo/home-entry.wav",
  ludoHome: "sky-ludo/token-home.wav",
  ludoTurn: "sky-ludo/turn.wav",
  ludoNoMove: "sky-ludo/no-move.wav",
  ludoVictory: "sky-ludo/victory.wav",
  ludoDefeat: "sky-ludo/defeat.wav",
  chefMove: "airport-chef/move.wav",
  chefPickup: "airport-chef/pickup.wav",
  chefChop: "airport-chef/chop.wav",
  chefCook: "airport-chef/cook.wav",
  chefReady: "airport-chef/ready.wav",
  chefBurn: "airport-chef/burn.wav",
  chefServe: "airport-chef/serve.wav",
  chefWrong: "airport-chef/wrong.wav",
  chefMiss: "airport-chef/miss.wav",
  chefCombo: "airport-chef/combo.wav",
  chefUpgrade: "airport-chef/upgrade.wav",
  chefVictory: "airport-chef/victory.wav",
  chefFail: "airport-chef/fail.wav",
  chefPower: "airport-chef/power.wav",
  archeryAim: "archery/aim.wav",
  archeryShoot: "archery/shoot.wav",
  archeryTravel: "archery/travel.wav",
  archeryImpact: "archery/impact.wav",
  archery25: "archery/hit25.wav",
  archery50: "archery/hit50.wav",
  archery75: "archery/hit75.wav",
  archeryBullseye: "archery/bullseye.wav",
  archeryTurn: "archery/turn.wav",
  archeryRound: "archery/round.wav",
  archeryTie: "archery/tie.wav",
  cakeDecorate: "cake-maker/decorate.wav",
  cakeSave: "cake-maker/save.wav",
  cakeCandle: "cake-maker/candle.wav",
  cakeConfetti: "cake-maker/confetti.wav",
  cakeWish: "cake-maker/wish.wav",
  cakeParty: "cake-maker/party.wav",
  pyramidAim: "pyramid-smash/aim.wav",
  pyramidCharge: "pyramid-smash/charge.wav",
  pyramidThrow: "pyramid-smash/throw.wav",
  pyramidImpact: "pyramid-smash/impact.wav",
  pyramidCrate: "pyramid-smash/crate.wav",
  pyramidIce: "pyramid-smash/ice.wav",
  pyramidSpring: "pyramid-smash/spring.wav",
  pyramidBreak: "pyramid-smash/break.wav",
  pyramidFall: "pyramid-smash/fall.wav",
  pyramidStar: "pyramid-smash/star.wav",
  pyramidComplete: "pyramid-smash/complete.wav",
  pyramidFail: "pyramid-smash/fail.wav",
  pyramidChampion: "pyramid-smash/champion.wav",
  circuitEngine: "runway-circuit/engine-idle.wav",
  circuitAccelerate: "runway-circuit/accelerate.wav",
  circuitBrake: "runway-circuit/brake.wav",
  circuitDrift: "runway-circuit/drift.wav",
  circuitCollision: "runway-circuit/collision.wav",
  circuitBoost: "runway-circuit/boost.wav",
  circuitCountdown: "runway-circuit/countdown.wav",
  circuitLap: "runway-circuit/lap.wav",
  circuitFinalLap: "runway-circuit/final-lap.wav",
  circuitCheckpoint: "runway-circuit/checkpoint.wav",
  circuitWrongWay: "runway-circuit/wrong-way.wav",
  circuitFinish: "runway-circuit/finish.wav",
  circuitVictory: "runway-circuit/victory.wav",
  circuitUnlock: "runway-circuit/unlock.wav",
  rallyEngine: "cloud-ridge-rally/engine.wav",
  rallyAccelerate: "cloud-ridge-rally/accelerate.wav",
  rallyBrake: "cloud-ridge-rally/brake.wav",
  rallySuspension: "cloud-ridge-rally/suspension.wav",
  rallyCoin: "cloud-ridge-rally/coin.wav",
  rallyFuel: "cloud-ridge-rally/fuel.wav",
  rallyJump: "cloud-ridge-rally/jump.wav",
  rallyLanding: "cloud-ridge-rally/landing.wav",
  rallyHardLanding: "cloud-ridge-rally/hard-landing.wav",
  rallyStunt: "cloud-ridge-rally/stunt.wav",
  rallyCheckpoint: "cloud-ridge-rally/checkpoint.wav",
  rallyCrash: "cloud-ridge-rally/crash.wav",
  rallyComplete: "cloud-ridge-rally/complete.wav",
  rallyUnlock: "cloud-ridge-rally/unlock.wav",
  rallyUpgrade: "cloud-ridge-rally/upgrade.wav",
  redGreen: "red-eye-run/green.wav",
  redWarning: "red-eye-run/warning.wav",
  redSignal: "red-eye-run/red-signal.wav",
  redDetected: "red-eye-run/detected.wav",
  redEliminate: "red-eye-run/eliminate.wav",
  redQualify: "red-eye-run/qualify.wav",
  redVictory: "red-eye-run/victory.wav",
  redCountdown: "red-eye-run/countdown.wav",
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
