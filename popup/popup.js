import { arcadeAudio } from "../shared/audio.js";
import { GAME_CATALOG, getGameName } from "../shared/game-state.js";
import { getData, getGameProgress, getTotalWins, updateData } from "../shared/storage.js";
import { openArcade } from "../shared/navigation.js";

const recentGame = document.querySelector("#recentGame");
const totalWins = document.querySelector("#totalWins");
const continueBtn = document.querySelector("#continueBtn");
const gameList = document.querySelector("#gameList");
const openArcadeBtn = document.querySelector("#openArcadeBtn");
const soundBtn = document.querySelector("#soundBtn");
const helpBtn = document.querySelector("#helpBtn");

let data;

function routeForGame(gameId) {
  return gameId ? `#game=${encodeURIComponent(gameId)}` : "";
}

function renderGameCards() {
  gameList.replaceChildren();
  for (const game of GAME_CATALOG) {
    const card = document.createElement("article");
    card.className = "game-card";
    const badges = ["Solo", "Two Player", "Offline", ...(game.badges || [])];
    card.innerHTML = `
      <img src="${game.image}" alt="" />
      <div>
        <h2>${game.name}</h2>
        <p>${getGameProgress(data, game.id)}</p>
        <div class="badges">
          ${badges.map((badge) => `<span class="badge ${badge === "Two Player" ? "two" : ""} ${badge === "Offline" ? "offline" : ""}">${badge}</span>`).join("")}
        </div>
      </div>
    `;
    const play = document.createElement("button");
    play.type = "button";
    play.textContent = "Play";
    play.addEventListener("click", () => {
      arcadeAudio.play("button");
      openArcade(routeForGame(game.id));
      window.close();
    });
    card.append(play);
    gameList.append(card);
  }
}

function render() {
  const recent = data.progress.recentlyPlayed;
  recentGame.textContent = recent ? getGameName(recent) : "No games yet";
  totalWins.textContent = String(getTotalWins(data));
  continueBtn.disabled = !recent;
  soundBtn.textContent = data.settings.sound ? "Sound On" : "Sound Off";
  soundBtn.setAttribute("aria-pressed", String(data.settings.sound));
  renderGameCards();
}

continueBtn.addEventListener("click", () => {
  arcadeAudio.play("button");
  openArcade(routeForGame(data.progress.recentlyPlayed));
  window.close();
});

openArcadeBtn.addEventListener("click", () => {
  arcadeAudio.play("button");
  openArcade();
  window.close();
});

soundBtn.addEventListener("click", async () => {
  data = await updateData((draft) => {
    draft.settings.sound = !draft.settings.sound;
    return draft;
  });
  await arcadeAudio.loadSettings();
  arcadeAudio.play("button");
  render();
});

helpBtn.addEventListener("click", () => {
  arcadeAudio.play("button");
  openArcade("#help");
  window.close();
});

async function boot() {
  data = await getData();
  await arcadeAudio.loadSettings();
  render();
}

boot();
