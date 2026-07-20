import { matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, updateData } from "../../shared/storage.js";
import { extensionUrl } from "../../shared/navigation.js";

const MAX_HISTORY = 36;
const MAX_MESSAGE = 44;
const LAYER_LABELS = ["Bottom Layer", "Middle Layer", "Top Layer"];

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "flavour", label: "Flavour" },
  { id: "shape", label: "Shape" },
  { id: "layers", label: "Layers" },
  { id: "icing", label: "Icing" },
  { id: "decorations", label: "Toppings" },
  { id: "cherries", label: "Cherries" },
  { id: "candles", label: "Candles" },
  { id: "writing", label: "Writing" },
  { id: "preview", label: "Preview" },
];

const FLAVOURS = {
  chocolate: {
    name: "Chocolate",
    sponge: "#5a321f",
    side: "#734025",
    cream: "#8b4d2d",
    highlight: "#d6a16d",
    accent: "#3d2419",
  },
  butterscotch: {
    name: "Butterscotch",
    sponge: "#d8912e",
    side: "#c77b26",
    cream: "#f4bd60",
    highlight: "#fff0aa",
    accent: "#a85d19",
  },
  pista: {
    name: "Pista",
    sponge: "#9dcf77",
    side: "#78ae56",
    cream: "#c7eaa0",
    highlight: "#eff9d5",
    accent: "#5b8f3c",
  },
  pineapple: {
    name: "Pineapple",
    sponge: "#f4d46b",
    side: "#dbb653",
    cream: "#ffe58a",
    highlight: "#fff7c5",
    accent: "#c58822",
  },
  strawberry: {
    name: "Strawberry",
    sponge: "#f48bb1",
    side: "#dc6e98",
    cream: "#ffd0dd",
    highlight: "#fff4f7",
    accent: "#d74179",
  },
  vanilla: {
    name: "Vanilla",
    sponge: "#f3dcad",
    side: "#dec28c",
    cream: "#fff4d8",
    highlight: "#ffffff",
    accent: "#d8ad65",
  },
};

const SHAPES = [
  { id: "oval", label: "Oval" },
  { id: "heart", label: "Heart" },
  { id: "square", label: "Square" },
];

const ICING_STYLES = [
  { id: "full", label: "Full Frosting" },
  { id: "border", label: "Cream Border" },
  { id: "drip", label: "Drip Icing" },
  { id: "smooth", label: "Smooth Icing" },
  { id: "swirl", label: "Swirl Icing" },
  { id: "sprinkles", label: "Sprinkle-Covered" },
  { id: "none", label: "No Extra Icing" },
];

const ICING_COLORS = {
  white: { label: "White", value: "#fff8e8", ink: "#243048" },
  chocolate: { label: "Chocolate brown", value: "#6f3f28", ink: "#ffffff" },
  pink: { label: "Pink", value: "#ff9fbd", ink: "#472035" },
  yellow: { label: "Yellow", value: "#ffd95b", ink: "#423415" },
  green: { label: "Green", value: "#9fe182", ink: "#1d3a23" },
  blue: { label: "Blue", value: "#72c8f2", ink: "#17334b" },
  purple: { label: "Purple", value: "#ba9bff", ink: "#2f2452" },
  orange: { label: "Orange", value: "#ffa35a", ink: "#482610" },
};

const EDGE_STYLES = [
  { id: "cream", label: "Cream dots" },
  { id: "scallop", label: "Scallop border" },
  { id: "chips", label: "Candy chips" },
  { id: "stars", label: "Sugar stars" },
  { id: "none", label: "Plain edge" },
];

const TOPPINGS = [
  { id: "strawberry", label: "Strawberries" },
  { id: "pineapple", label: "Pineapple Pieces" },
  { id: "chocolate", label: "Chocolate Pieces" },
  { id: "butterscotch", label: "Butterscotch Pieces" },
  { id: "pista", label: "Pista Pieces" },
  { id: "sprinkles", label: "Sprinkles" },
  { id: "star", label: "Sugar Stars" },
  { id: "heart", label: "Sugar Hearts" },
  { id: "swirl", label: "Cream Swirls" },
  { id: "ball", label: "Chocolate Balls" },
  { id: "wafer", label: "Wafer Sticks" },
];

const CANDLE_TYPES = [
  { id: "normal", label: "Normal Candle" },
  { id: "striped", label: "Striped Candle" },
  { id: "star", label: "Star Candle" },
  { id: "heart", label: "Heart Candle" },
  { id: "sparkler", label: "Sparkler Candle" },
  { id: "number", label: "Number Candle" },
];

const CANDLE_COLORS = {
  red: "#ef5b63",
  orange: "#ff9b47",
  yellow: "#ffd35a",
  green: "#40bd7b",
  blue: "#46c7d9",
  purple: "#8d6aec",
  pink: "#ff9fbd",
  white: "#fff8e8",
};

const TEXT_COLORS = {
  berry: { label: "Berry", value: "#c72560" },
  chocolate: { label: "Chocolate", value: "#5b321f" },
  blue: { label: "Blue", value: "#1b78a6" },
  green: { label: "Green", value: "#32834f" },
  purple: { label: "Purple", value: "#6e4ec9" },
  white: { label: "White", value: "#fff8ee" },
};

const TEXT_STYLES = [
  { id: "script", label: "Icing Script", font: "Trebuchet MS, Segoe UI, sans-serif" },
  { id: "round", label: "Round Icing", font: "Verdana, Segoe UI, sans-serif" },
  { id: "bold", label: "Bold Icing", font: "Arial Black, Arial, sans-serif" },
];

const TEXT_POSITIONS = [
  { id: "center", label: "Centre" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function normalizeIndex(index, count) {
  return Math.max(0, Math.min(count - 1, index));
}

function readableDate(value) {
  if (!value) return "Today";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function makeLayer(template = {}) {
  return {
    flavour: template.flavour || "vanilla",
    icingStyle: template.icingStyle || "full",
    icingColor: template.icingColor || "white",
    edgeStyle: template.edgeStyle || "cream",
  };
}

function defaultCake() {
  return {
    id: null,
    name: "My Cake",
    createdAt: new Date().toISOString(),
    updatedAt: null,
    shape: "oval",
    layers: [makeLayer({ flavour: "vanilla" })],
    toppings: [],
    cherries: [],
    candles: [],
    text: {
      message: "Happy Birthday",
      color: "berry",
      size: 34,
      style: "script",
      position: "center",
      curved: false,
      warning: "",
    },
  };
}

function defaultParty() {
  return {
    active: false,
    heading: "Happy Birthday!",
    wishText: "",
    musicOn: false,
    volume: 0.72,
    controlsHidden: false,
    confetti: [],
    balloons: [],
    smoke: [],
    lightsTime: 0,
    confettiTime: 0,
  };
}

function cakeSummary(cake) {
  const flavours = cake.layers.map((layer) => FLAVOURS[layer.flavour]?.name || "Vanilla");
  const decorations = decorationSummary(cake);
  const candleCount = cake.candles.length;
  const message = cake.text.message.trim();
  return `${cake.layers.length} layer ${cake.shape} cake. Flavours: ${flavours.join(", ")}. ${decorations}. ${candleCount} candle${candleCount === 1 ? "" : "s"}.${message ? ` Message: ${message}.` : ""}`;
}

function decorationSummary(cake) {
  const counts = {};
  for (const topping of [...cake.toppings, ...cake.cherries]) {
    const key = topping.type || "cherry";
    counts[key] = (counts[key] || 0) + 1;
  }
  const lines = Object.entries(counts).map(([key, count]) => {
    const found = TOPPINGS.find((item) => item.id === key);
    const label = key === "cherry" ? "Cherries" : found?.label || key;
    return `${count} ${label.toLowerCase()}`;
  });
  return lines.length ? `Decorations: ${lines.join(", ")}` : "No toppings yet";
}

function defaultCelebrationHeading(cake) {
  const message = cake.text.message.trim().replace(/\s+/g, " ");
  if (!message) return "Happy Birthday!";
  const birthday = message.match(/^happy birthday\s*(.*)$/i);
  if (birthday) {
    const name = birthday[1].trim();
    return name ? `Happy Birthday, ${name}!` : "Happy Birthday!";
  }
  return /[.!?]$/.test(message) ? message : `${message}!`;
}

export function createCakeMakerGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;

  let currentData = clone(data);
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let raf = 0;
  let partyMusic = null;
  let saveResultPending = false;

  const state = {
    screen: "editor",
    stepIndex: 0,
    selectedLayer: 0,
    selectedItem: null,
    placementZone: "top",
    cake: defaultCake(),
    savedCakes: clone(data.progress.cakeMakerRecords.savedCakes || []),
    detailsCake: null,
    dialog: null,
    history: [],
    paused: false,
    view: { rotation: 0, zoom: 1, controlsHidden: false },
    party: defaultParty(),
    layout: null,
    hits: [],
    drag: null,
    viewport: { width: 800, height: 560 },
  };

  function initializeGame() {
    refreshSavedFromData(currentData);
    render();
    bindGlobalEvents();
    markRecentlyPlayed();
  }

  function startGame() {
    startLoop();
  }

  function refreshSavedFromData(source) {
    state.savedCakes = clone(source.progress.cakeMakerRecords.savedCakes || []);
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "cake-maker";
      return draft;
    });
    refreshSavedFromData(currentData);
    await onResult?.({ gameId: "cake-maker", summary: "Cake Maker opened" });
  }

  function render() {
    teardownCanvasObserver();
    root.className = "arcade-view cake-maker-game";
    root.replaceChildren();

    if (state.screen === "party") {
      renderPartyMode();
      renderDialog();
      return;
    }

    const bar = renderGameBar();
    if (state.screen === "finish") root.append(bar, renderFinishScreen());
    else if (state.screen === "gallery") root.append(bar, renderGalleryScreen());
    else if (state.screen === "details") root.append(bar, renderSavedDetails());
    else root.append(bar, renderEditorScreen());
    renderDialog();
    resizeCanvas();
    draw();
  }

  function renderGameBar() {
    const bar = element("section", "game-bar");
    const title = element("div", "game-title");
    title.append(element("h1", "", "Cake Maker"), element("p", "", "Creative sandbox - offline cake studio"));

    const actions = element("div", "game-actions cake-actions");
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("My Cakes", "", () => showGallery()),
      actionButton("Finish Cake", "", showFinish),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    bar.append(title, renderMiniStats(), actions);
    return bar;
  }

  function renderMiniStats() {
    const strip = element("div", "score-strip cake-mini-stats");
    strip.append(
      miniStat("Layers", String(state.cake.layers.length)),
      miniStat("Saved", String(state.savedCakes.length)),
      miniStat("Candles", String(state.cake.candles.length)),
    );
    return strip;
  }

  function miniStat(label, value) {
    const item = element("span", "");
    item.append(element("small", "", label), element("strong", "", value));
    return item;
  }

  function renderEditorScreen() {
    const shell = element("section", `cake-shell ${state.view.controlsHidden ? "is-clean" : ""}`);
    shell.append(renderWorkflow(), renderPreviewPanel(), renderToolPanel());
    return shell;
  }

  function renderWorkflow() {
    const side = element("aside", "cake-workflow");
    side.append(element("span", "field-label", "Cake Builder"));
    const list = element("div", "cake-step-list");
    STEPS.forEach((step, index) => {
      const stepButton = actionButton(`${index + 1}. ${step.label}`, "", () => {
        state.stepIndex = index;
        render();
      });
      stepButton.classList.toggle("is-active", index === state.stepIndex);
      stepButton.setAttribute("aria-current", index === state.stepIndex ? "step" : "false");
      list.append(stepButton);
    });
    side.append(list, renderLayerPicker("Layer Focus"));

    const summary = element("div", "cake-summary");
    summary.append(
      element("strong", "", state.cake.name || "Unsaved Cake"),
      element("span", "", `${shapeLabel(state.cake.shape)} | ${state.cake.layers.length} layer${state.cake.layers.length === 1 ? "" : "s"}`),
      element("span", "", decorationSummary(state.cake)),
    );
    side.append(summary);
    return side;
  }

  function renderPreviewPanel(cleanClass = "") {
    const panel = element("section", `cake-preview-panel ${cleanClass}`);
    const toolbar = element("div", "cake-preview-toolbar");
    toolbar.append(
      iconButton("Rotate Left", "L", () => setView({ rotation: state.view.rotation - 5 })),
      iconButton("Rotate Right", "R", () => setView({ rotation: state.view.rotation + 5 })),
      iconButton("Zoom Out", "-", () => setView({ zoom: state.view.zoom - 0.08 })),
      iconButton("Zoom In", "+", () => setView({ zoom: state.view.zoom + 0.08 })),
      actionButton("Reset View", "", () => setView({ rotation: 0, zoom: 1 })),
      actionButton(state.view.controlsHidden ? "Show Controls" : "Hide Controls", "", () => {
        state.view.controlsHidden = !state.view.controlsHidden;
        render();
      }),
    );
    const canvasWrap = element("div", "cake-canvas-wrap");
    canvas = document.createElement("canvas");
    canvas.id = "cakeMakerCanvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", cakeSummary(displayCake()));
    ctx = canvas.getContext("2d");
    canvasWrap.append(canvas, renderOverlayNode());
    const status = element("p", "cake-live-note", cakeSummary(displayCake()));
    panel.append(toolbar, canvasWrap, status);
    bindCanvasEvents();
    observeCanvas();
    return panel;
  }

  function renderOverlayNode() {
    const overlay = element("div", "game-overlay");
    overlay.id = "cakeMakerOverlay";
    return overlay;
  }

  function renderToolPanel() {
    const panel = element("section", "cake-tools");
    const step = STEPS[state.stepIndex];
    panel.append(element("span", "field-label", step.label));
    panel.append(stepTitle(step));
    if (step.id === "welcome") panel.append(renderWelcomeTools());
    if (step.id === "flavour") panel.append(renderFlavourTools());
    if (step.id === "shape") panel.append(renderShapeTools());
    if (step.id === "layers") panel.append(renderLayerTools());
    if (step.id === "icing") panel.append(renderIcingTools());
    if (step.id === "decorations") panel.append(renderDecorationTools());
    if (step.id === "cherries") panel.append(renderCherryTools());
    if (step.id === "candles") panel.append(renderCandleTools());
    if (step.id === "writing") panel.append(renderWritingTools());
    if (step.id === "preview") panel.append(renderPreviewTools());
    panel.append(renderStepActions());
    return panel;
  }

  function stepTitle(step) {
    const heading = element("h2", "", step.label === "Welcome" ? "Cake Studio" : step.label);
    return heading;
  }

  function renderWelcomeTools() {
    const group = element("div", "tool-group");
    group.append(
      actionButton("New Cake", "primary-action", makeAnotherCake),
      actionButton("Surprise Me", "", surpriseCake),
      actionButton("My Cakes", "", showGallery),
      actionButton("Save Cake", "", openSaveDialog),
      actionButton("Start Birthday Party", "", openPartyDialog),
    );
    return group;
  }

  function renderFlavourTools() {
    const group = element("div", "tool-stack");
    group.append(renderLayerPicker("Customise Layer"));
    const grid = element("div", "option-grid flavour-grid");
    Object.entries(FLAVOURS).forEach(([id, flavour]) => {
      const button = optionButton(flavour.name, id === selectedLayer().flavour, () => setLayerValue("flavour", id));
      button.style.setProperty("--flavour", flavour.sponge);
      button.style.setProperty("--cream", flavour.cream);
      const swatch = element("span", "flavour-swatch");
      button.prepend(swatch);
      grid.append(button);
    });
    group.append(grid, actionButton("Use This Flavour On All Layers", "", () => setLayerValue("flavour", selectedLayer().flavour, true)));
    return group;
  }

  function renderShapeTools() {
    const group = element("div", "option-grid shape-grid");
    for (const shape of SHAPES) {
      const button = optionButton(shape.label, state.cake.shape === shape.id, () => {
        pushHistory();
        state.cake.shape = shape.id;
        clampAllItems();
        audio.play("cakeDecorate");
        render();
      });
      button.append(element("span", `shape-icon ${shape.id}`));
      group.append(button);
    }
    return group;
  }

  function renderLayerTools() {
    const group = element("div", "tool-stack");
    const choices = element("div", "segmented wide");
    [
      [1, "Single Layer"],
      [2, "Double Layer"],
      [3, "Triple Layer"],
    ].forEach(([count, label]) => {
      const button = actionButton(label, "", () => setLayerCount(count));
      button.dataset.value = String(count);
      button.classList.toggle("is-selected", state.cake.layers.length === count);
      button.setAttribute("aria-pressed", String(state.cake.layers.length === count));
      choices.append(button);
    });
    const overview = element("div", "layer-overview");
    state.cake.layers.forEach((layer, index) => {
      const card = element("button", "layer-card");
      card.type = "button";
      card.classList.toggle("is-active", index === state.selectedLayer);
      card.append(
        element("strong", "", LAYER_LABELS[index]),
        element("span", "", `${FLAVOURS[layer.flavour].name} | ${icingStyleLabel(layer.icingStyle)}`),
      );
      card.addEventListener("click", () => {
        state.selectedLayer = index;
        render();
      });
      overview.append(card);
    });
    group.append(choices, overview);
    return group;
  }

  function renderIcingTools() {
    const group = element("div", "tool-stack");
    group.append(renderLayerPicker("Customise Layer"));
    const styleGrid = element("div", "option-grid");
    for (const style of ICING_STYLES) {
      styleGrid.append(optionButton(style.label, selectedLayer().icingStyle === style.id, () => setLayerValue("icingStyle", style.id)));
    }

    const colorGrid = element("div", "swatch-grid");
    Object.entries(ICING_COLORS).forEach(([id, color]) => {
      colorGrid.append(swatchButton(color.label, color.value, selectedLayer().icingColor === id, () => setLayerValue("icingColor", id)));
    });

    const edgeGrid = element("div", "option-grid compact");
    for (const edge of EDGE_STYLES) {
      edgeGrid.append(optionButton(edge.label, selectedLayer().edgeStyle === edge.id, () => setLayerValue("edgeStyle", edge.id)));
    }
    group.append(element("span", "field-label", "Icing Style"), styleGrid, element("span", "field-label", "Icing Colour"), colorGrid, element("span", "field-label", "Edge Decoration"), edgeGrid, actionButton("Undo", "", undoDecoration));
    return group;
  }

  function renderDecorationTools() {
    const group = element("div", "tool-stack");
    group.append(renderLayerPicker("Place On Layer"));
    const zones = element("div", "segmented");
    [["top", "Top"], ["edge", "Edge"]].forEach(([zone, label]) => {
      const zoneButton = actionButton(label, "", () => {
        state.placementZone = zone;
        render();
      });
      zoneButton.dataset.value = zone;
      zoneButton.classList.toggle("is-selected", state.placementZone === zone);
      zoneButton.setAttribute("aria-pressed", String(state.placementZone === zone));
      zones.append(zoneButton);
    });
    const grid = element("div", "option-grid toppings-grid");
    for (const topping of TOPPINGS) {
      const button = actionButton(topping.label, "topping-button", () => addDecoration(topping.id));
      button.prepend(toppingIcon(topping.id));
      grid.append(button);
    }
    group.append(
      zones,
      grid,
      renderSelectedItemActions("topping"),
      actionButton("Clear Toppings", "", () => clearKind("toppings")),
      actionButton("Clear All Decorations", "", clearDecorations),
      actionButton("Undo", "", undoDecoration),
    );
    return group;
  }

  function renderCherryTools() {
    const group = element("div", "tool-stack");
    group.append(renderLayerPicker("Place Cherries On"));
    const actions = element("div", "option-grid");
    actions.append(
      actionButton("One Centre Cherry", "", addCenterCherry),
      actionButton("Cherries Around Edge", "", addEdgeCherries),
      actionButton("Cherries On Cream Swirls", "", addCherrySwirls),
      actionButton("Random Cherry Arrangement", "", randomCherries),
      actionButton("Clear All Cherries", "", () => clearKind("cherries")),
    );
    group.append(actions, renderSelectedItemActions("cherry"), actionButton("Undo", "", undoDecoration));
    return group;
  }

  function renderCandleTools() {
    const group = element("div", "tool-stack");
    group.append(renderLayerPicker("Place Candles On"));
    const colorGrid = element("div", "swatch-grid");
    Object.entries(CANDLE_COLORS).forEach(([id, color]) => {
      colorGrid.append(swatchButton(id, color, state.candleColor === id, () => {
        state.candleColor = id;
        render();
      }));
    });

    const numberField = element("label", "field");
    numberField.append(element("span", "field-label", "Number Candle"));
    const numberSelect = document.createElement("select");
    for (let i = 0; i <= 9; i += 1) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = String(i);
      numberSelect.append(option);
    }
    numberSelect.value = state.numberCandle || "1";
    numberSelect.addEventListener("change", () => {
      state.numberCandle = numberSelect.value;
    });
    numberField.append(numberSelect);

    const typeGrid = element("div", "option-grid");
    for (const type of CANDLE_TYPES) {
      typeGrid.append(actionButton(type.label, "", () => addCandle(type.id)));
    }

    const ageField = element("label", "field");
    ageField.append(element("span", "field-label", "Birthday Age"));
    const ageInput = document.createElement("input");
    ageInput.type = "number";
    ageInput.min = "0";
    ageInput.max = "999";
    ageInput.placeholder = "Age";
    ageInput.value = state.ageValue || "";
    ageInput.addEventListener("input", () => {
      state.ageValue = ageInput.value.slice(0, 3);
    });
    ageField.append(ageInput);

    group.append(
      colorGrid,
      numberField,
      typeGrid,
      ageField,
      actionButton("Add Age Candle", "", () => addAgeCandles()),
      renderSelectedItemActions("candle"),
      actionButton("Light Candles", "", () => setCandlesLit(true)),
      actionButton("Extinguish Candles", "", () => setCandlesLit(false)),
      actionButton("Clear Candles", "", clearCandles),
      actionButton("Undo", "", undoDecoration),
    );
    return group;
  }

  function renderWritingTools() {
    const group = element("div", "tool-stack writing-tools");
    const inputField = element("label", "field");
    inputField.append(element("span", "field-label", "Cake Message"));
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = String(MAX_MESSAGE);
    input.placeholder = "Happy Birthday Thomas";
    input.value = state.cake.text.message;
    input.addEventListener("input", () => {
      pushHistoryOnceForInput();
      state.cake.text.message = input.value.slice(0, MAX_MESSAGE);
      draw();
      updateWritingWarning();
    });
    inputField.append(input);

    const colorGrid = element("div", "swatch-grid");
    Object.entries(TEXT_COLORS).forEach(([id, color]) => {
      colorGrid.append(swatchButton(color.label, color.value, state.cake.text.color === id, () => setTextValue("color", id)));
    });

    const styleGrid = element("div", "option-grid compact");
    for (const style of TEXT_STYLES) {
      styleGrid.append(optionButton(style.label, state.cake.text.style === style.id, () => setTextValue("style", style.id)));
    }

    const sizeField = element("label", "field");
    sizeField.append(element("span", "field-label", "Text Size"));
    const size = document.createElement("select");
    [
      [24, "Small"],
      [34, "Medium"],
      [44, "Large"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = label;
      size.append(option);
    });
    size.value = String(state.cake.text.size);
    size.addEventListener("change", () => setTextValue("size", Number(size.value)));
    sizeField.append(size);

    const positionGrid = element("div", "option-grid compact");
    for (const position of TEXT_POSITIONS) {
      positionGrid.append(optionButton(position.label, state.cake.text.position === position.id, () => setTextValue("position", position.id)));
    }

    const curved = toggleButton("Curved Text", state.cake.text.curved, (value) => setTextValue("curved", value));
    const warning = element("p", "cake-warning", state.cake.text.warning || "");
    warning.id = "cakeTextWarning";

    group.append(
      inputField,
      element("span", "field-label", "Text Colour"),
      colorGrid,
      element("span", "field-label", "Icing Font"),
      styleGrid,
      sizeField,
      element("span", "field-label", "Position"),
      positionGrid,
      curved,
      warning,
      actionButton("Remove Text", "", () => setTextValue("message", "")),
      actionButton("Undo", "", undoDecoration),
    );
    return group;
  }

  function renderPreviewTools() {
    const group = element("div", "tool-stack");
    const zoomField = element("label", "field");
    zoomField.append(element("span", "field-label", "Zoom"));
    const range = document.createElement("input");
    range.type = "range";
    range.min = "0.75";
    range.max = "1.25";
    range.step = "0.01";
    range.value = String(state.view.zoom);
    range.addEventListener("input", () => {
      state.view.zoom = Number(range.value);
      draw();
    });
    zoomField.append(range);
    group.append(
      zoomField,
      actionButton("Rotate Left", "", () => setView({ rotation: state.view.rotation - 5 })),
      actionButton("Rotate Right", "", () => setView({ rotation: state.view.rotation + 5 })),
      actionButton("Reset Viewing Angle", "", () => setView({ rotation: 0, zoom: 1 })),
      actionButton("Save Cake", "", openSaveDialog),
      actionButton("Finish Cake", "primary-action", showFinish),
      actionButton("Start Birthday Party", "", openPartyDialog),
    );
    return group;
  }

  function renderLayerPicker(label) {
    const group = element("div", "layer-picker");
    group.append(element("span", "field-label", label));
    const buttons = element("div", "segmented layer-tabs");
    state.cake.layers.forEach((layer, index) => {
      const tab = actionButton(LAYER_LABELS[index], "", () => {
        state.selectedLayer = index;
        render();
      });
      tab.dataset.value = String(index);
      tab.classList.toggle("is-selected", index === state.selectedLayer);
      tab.setAttribute("aria-pressed", String(index === state.selectedLayer));
      buttons.append(tab);
    });
    group.append(buttons);
    return group;
  }

  function renderStepActions() {
    const row = element("div", "cake-step-actions");
    const back = actionButton("Back", "", () => {
      state.stepIndex = Math.max(0, state.stepIndex - 1);
      render();
    });
    back.disabled = state.stepIndex === 0;
    const next = actionButton(state.stepIndex === STEPS.length - 1 ? "Finish" : "Next", "primary-action", () => {
      if (state.stepIndex === STEPS.length - 1) showFinish();
      else {
        state.stepIndex += 1;
        render();
      }
    });
    row.append(back, actionButton("Undo", "", undoDecoration), next);
    return row;
  }

  function renderSelectedItemActions(kind) {
    const group = element("div", "selected-actions");
    const selected = selectedObject();
    const active = selected && selected.kind === kind;
    group.append(element("span", "field-label", active ? `Selected ${kind}` : "Selected Item"));
    const remove = actionButton("Remove Selected", "", removeSelected);
    const duplicate = actionButton("Duplicate Selected", "", duplicateSelected);
    remove.disabled = !active;
    duplicate.disabled = !active;
    group.append(remove, duplicate);
    return group;
  }

  function renderFinishScreen() {
    const screen = element("section", "cake-finish-screen");
    const preview = renderPreviewPanel("finish-preview");
    const details = element("section", "cake-finish-details");
    details.append(element("span", "field-label", "Finished Cake"), element("h2", "", state.cake.name || "Custom Cake"));
    details.append(renderCakeFacts(state.cake));
    const actions = element("div", "finish-actions");
    actions.append(
      actionButton("Edit Cake", "", () => {
        state.screen = "editor";
        state.stepIndex = STEPS.length - 1;
        render();
      }),
      actionButton("Save Cake", "primary-action", openSaveDialog),
      actionButton("Make Another Cake", "", makeAnotherCake),
      actionButton("Start Birthday Party", "", openPartyDialog),
      actionButton("Return to Arcade", "", () => {
        destroyGame();
        onExit();
      }),
    );
    details.append(actions);
    screen.append(preview, details);
    return screen;
  }

  function renderCakeFacts(cake) {
    const facts = element("dl", "cake-facts");
    const flavours = cake.layers.map((layer, index) => `${LAYER_LABELS[index]}: ${FLAVOURS[layer.flavour].name}`).join(" | ");
    const rows = [
      ["Flavour", flavours],
      ["Shape", shapeLabel(cake.shape)],
      ["Layers", `${cake.layers.length}`],
      ["Decorations", decorationSummary(cake)],
      ["Written Message", cake.text.message.trim() || "None"],
      ["Candles", `${cake.candles.length}`],
    ];
    rows.forEach(([label, value]) => {
      facts.append(element("dt", "", label), element("dd", "", value));
    });
    return facts;
  }

  function renderGalleryScreen() {
    const screen = element("section", "cake-gallery-screen");
    const header = element("div", "cake-section-header");
    header.append(element("div", "", ""), actionButton("Return to Cake Editor", "", () => {
      state.screen = "editor";
      render();
    }));
    header.firstChild.append(element("span", "field-label", "My Cakes"), element("h2", "", `${state.savedCakes.length} Saved Cake${state.savedCakes.length === 1 ? "" : "s"}`));
    const grid = element("div", "cake-gallery-grid");
    if (!state.savedCakes.length) {
      grid.append(element("div", "empty-state", "No saved cakes yet."));
    } else {
      state.savedCakes.forEach((cake) => grid.append(savedCakeCard(cake)));
    }
    screen.append(header, grid);
    return screen;
  }

  function savedCakeCard(saved) {
    const card = element("article", "saved-cake-card");
    const thumb = document.createElement("img");
    thumb.alt = "";
    thumb.src = saved.thumbnail || "../assets/games/cake-maker.svg";
    const body = element("div", "saved-cake-body");
    body.append(element("h3", "", saved.name || "Saved Cake"), element("p", "", `${saved.layers.length} layer ${shapeLabel(saved.shape)} | ${readableDate(saved.updatedAt || saved.createdAt)}`));
    const actions = element("div", "saved-cake-actions");
    actions.append(
      actionButton("Open", "", () => openSavedDetails(saved.id)),
      actionButton("Edit", "", () => loadCake(saved.id, "editor")),
      actionButton("Duplicate", "", () => duplicateSavedCake(saved.id)),
      actionButton("Rename", "", () => renameSavedCake(saved.id)),
      actionButton("Delete", "", () => deleteSavedCake(saved.id)),
      actionButton("Party", "primary-action", () => loadCake(saved.id, "party")),
    );
    body.append(actions);
    card.append(thumb, body);
    return card;
  }

  function renderSavedDetails() {
    const cake = state.detailsCake || state.cake;
    const screen = element("section", "cake-details-screen");
    const preview = renderPreviewPanel("finish-preview");
    const details = element("section", "cake-finish-details");
    details.append(element("span", "field-label", "Saved Cake Details"), element("h2", "", cake.name || "Saved Cake"), renderCakeFacts(cake));
    const actions = element("div", "finish-actions");
    actions.append(
      actionButton("Edit Cake", "primary-action", () => {
        state.cake = clone(cake);
        state.detailsCake = null;
        state.screen = "editor";
        state.stepIndex = STEPS.length - 1;
        render();
      }),
      actionButton("Duplicate Cake", "", () => duplicateSavedCake(cake.id)),
      actionButton("Rename Cake", "", () => renameSavedCake(cake.id)),
      actionButton("Delete Cake", "", () => deleteSavedCake(cake.id)),
      actionButton("Start Birthday Party", "", () => {
        state.cake = clone(cake);
        openPartyDialog();
      }),
      actionButton("Back to My Cakes", "", showGallery),
    );
    details.append(actions);
    screen.append(preview, details);
    return screen;
  }

  function renderPartyMode() {
    root.className = "arcade-view cake-maker-game cake-party-root";
    const screen = element("section", `party-mode-screen ${state.party.controlsHidden ? "is-clean" : ""}`);
    const stage = element("div", "party-stage");
    canvas = document.createElement("canvas");
    canvas.id = "cakePartyCanvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${state.party.heading}. ${cakeSummary(state.cake)}`);
    ctx = canvas.getContext("2d");
    stage.append(canvas);

    const headingWrap = element("div", "party-heading");
    const heading = document.createElement("input");
    heading.type = "text";
    heading.maxLength = "46";
    heading.value = state.party.heading;
    heading.setAttribute("aria-label", "Celebration heading");
    heading.addEventListener("input", () => {
      state.party.heading = heading.value.slice(0, 46) || "Happy Birthday!";
    });
    headingWrap.append(heading, element("span", "", state.party.wishText || "Let's Celebrate!"));
    stage.append(headingWrap);

    const controlsPanel = element("section", "party-controls");
    controlsPanel.append(
      actionButton(state.party.musicOn ? "Pause Music" : "Play Music", "primary-action", togglePartyMusic),
      volumeControl(),
      actionButton("Restart Song", "", restartPartyMusic),
      actionButton("Stop Music", "", stopPartyMusic),
      actionButton("Replay Confetti", "", () => launchConfetti(true)),
      actionButton("Light Candles", "", () => setCandlesLit(true)),
      actionButton("Blow Out Candles", "", blowOutCandles),
      actionButton("Relight Candles", "", () => setCandlesLit(true)),
      actionButton(state.party.controlsHidden ? "Show Controls" : "Hide Controls", "", () => {
        state.party.controlsHidden = !state.party.controlsHidden;
        render();
      }),
      actionButton("Exit Party Mode", "", () => confirmExitParty("finish")),
      actionButton("Return to Cake Editor", "", () => confirmExitParty("editor")),
      actionButton("Make Another Cake", "", () => confirmExitParty("new")),
      actionButton("Return to Arcade", "", () => confirmExitParty("arcade")),
    );

    screen.append(stage, controlsPanel);
    root.append(screen);
    bindCanvasEvents();
    observeCanvas();
    resizeCanvas();
    draw();
  }

  function volumeControl() {
    const label = element("label", "field party-volume");
    label.append(element("span", "field-label", "Music Volume"));
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "1";
    input.step = "0.05";
    input.value = String(state.party.volume);
    input.addEventListener("input", () => {
      state.party.volume = Number(input.value);
      syncPartyMusicVolume();
    });
    label.append(input);
    return label;
  }

  function renderDialog() {
    if (!state.dialog) return;
    const overlay = element("div", "cake-modal-backdrop");
    const modal = element("section", "cake-modal");
    if (state.dialog.type === "save") {
      modal.append(element("h2", "", "Save Cake"));
      const field = element("label", "field");
      field.append(element("span", "field-label", "Cake Name"));
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = "32";
      input.value = state.dialog.name;
      input.addEventListener("input", () => {
        state.dialog.name = input.value;
      });
      field.append(input);
      modal.append(field);
      const actions = element("div", "modal-actions");
      actions.append(
        actionButton("Cancel", "", closeDialog),
        actionButton("Save Cake", "primary-action", async () => {
          await saveCake(state.dialog.name || "My Cake");
          closeDialog();
        }),
      );
      modal.append(actions);
      requestAnimationFrame(() => input.focus());
    }
    if (state.dialog.type === "party") {
      modal.append(element("h2", "", "Birthday Party"));
      const field = element("label", "field");
      field.append(element("span", "field-label", "Celebration Heading"));
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = "46";
      input.value = state.dialog.heading;
      input.addEventListener("input", () => {
        state.dialog.heading = input.value;
      });
      field.append(input);
      modal.append(field);
      const actions = element("div", "modal-actions");
      actions.append(
        actionButton("Cancel", "", closeDialog),
        actionButton("Start Birthday Party", "primary-action", () => {
          const heading = state.dialog.heading || "Happy Birthday!";
          closeDialog(false);
          startPartyMode(heading);
        }),
      );
      modal.append(actions);
      requestAnimationFrame(() => input.focus());
    }
    if (state.dialog.type === "exit-party") {
      modal.append(element("h2", "", "Exit Party Mode?"), element("p", "", "The cake will stay saved in the editor."));
      const actions = element("div", "modal-actions");
      actions.append(
        actionButton("Keep Celebrating", "", closeDialog),
        actionButton("Exit Party Mode", "primary-action", () => {
          const target = state.dialog.target;
          closeDialog(false);
          stopPartyMode(target);
        }),
      );
      modal.append(actions);
    }
    overlay.append(modal);
    root.append(overlay);
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function iconButton(label, glyph, handler) {
    const button = actionButton(glyph, "icon-action", handler);
    button.setAttribute("aria-label", label);
    button.title = label;
    return button;
  }

  function optionButton(label, active, handler) {
    const button = actionButton(label, "choice-button", handler);
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
    return button;
  }

  function swatchButton(label, color, active, handler) {
    const button = actionButton(label, "swatch-button", handler);
    button.style.setProperty("--swatch", color);
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", label);
    return button;
  }

  function toggleButton(label, active, onToggle) {
    const row = element("div", "toggle-row");
    row.append(element("span", "", label));
    const toggle = actionButton(active ? "Curved" : "Straight", "toggle-button", () => onToggle(!active));
    toggle.setAttribute("aria-pressed", String(active));
    row.append(toggle);
    return row;
  }

  function toppingIcon(type) {
    const icon = element("span", `topping-mini topping-${type}`);
    icon.setAttribute("aria-hidden", "true");
    return icon;
  }

  function selectedLayer() {
    state.selectedLayer = normalizeIndex(state.selectedLayer, state.cake.layers.length);
    return state.cake.layers[state.selectedLayer];
  }

  function displayCake() {
    return state.screen === "details" && state.detailsCake ? state.detailsCake : state.cake;
  }

  function shapeLabel(shape) {
    return SHAPES.find((item) => item.id === shape)?.label || "Oval";
  }

  function icingStyleLabel(style) {
    return ICING_STYLES.find((item) => item.id === style)?.label || "Full Frosting";
  }

  function setLayerValue(key, value, applyAll = false) {
    pushHistory();
    if (applyAll) {
      state.cake.layers.forEach((layer) => {
        layer[key] = value;
      });
    } else {
      selectedLayer()[key] = value;
    }
    audio.play("cakeDecorate");
    render();
  }

  function setTextValue(key, value) {
    pushHistory();
    state.cake.text[key] = value;
    draw();
    render();
  }

  function setLayerCount(count) {
    pushHistory();
    const nextLayers = state.cake.layers.slice(0, count);
    while (nextLayers.length < count) nextLayers.push(makeLayer(nextLayers[nextLayers.length - 1] || selectedLayer()));
    state.cake.layers = nextLayers;
    state.selectedLayer = normalizeIndex(state.selectedLayer, count);
    clampAllItems();
    audio.play("cakeDecorate");
    render();
  }

  function setView(next) {
    state.view.rotation = Math.max(-16, Math.min(16, next.rotation ?? state.view.rotation));
    state.view.zoom = Math.max(0.75, Math.min(1.25, next.zoom ?? state.view.zoom));
    render();
  }

  function createCake() {
    state.cake = defaultCake();
    state.history = [];
    state.selectedItem = null;
    state.selectedLayer = 0;
    state.stepIndex = 1;
    state.screen = "editor";
    render();
    return state.cake;
  }

  function makeAnotherCake() {
    if (state.screen !== "party" && !window.confirm("Start a fresh cake?")) return;
    createCake();
  }

  function surpriseCake() {
    pushHistory();
    const flavours = Object.keys(FLAVOURS);
    const shapes = SHAPES.map((shape) => shape.id);
    const styles = ICING_STYLES.map((style) => style.id);
    const colors = Object.keys(ICING_COLORS);
    const edges = EDGE_STYLES.map((edge) => edge.id);
    const count = randomInt(1, 3);
    state.cake = defaultCake();
    state.cake.shape = randomItem(shapes);
    state.cake.layers = Array.from({ length: count }, () => makeLayer({
      flavour: randomItem(flavours),
      icingStyle: randomItem(styles),
      icingColor: randomItem(colors),
      edgeStyle: randomItem(edges),
    }));
    state.cake.toppings = [];
    state.cake.cherries = [];
    state.cake.candles = [];
    const toppingCount = randomInt(5, 13);
    for (let i = 0; i < toppingCount; i += 1) addDecoration(randomItem(TOPPINGS).id, { silent: true, layer: randomInt(0, count - 1), random: true });
    const cherryCount = randomInt(3, 9);
    for (let i = 0; i < cherryCount; i += 1) addCherry(randomPoint("top"), randomInt(0, count - 1), true);
    const candleCount = randomInt(1, 5);
    for (let i = 0; i < candleCount; i += 1) addCandle(randomItem(CANDLE_TYPES).id, { silent: true, random: true });
    state.cake.text.message = "";
    state.selectedLayer = count - 1;
    audio.play("cakeParty");
    render();
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function randomPoint(zone = state.placementZone) {
    if (zone === "edge") {
      const angle = Math.random() * Math.PI * 2;
      return { x: Math.cos(angle) * 0.44, y: Math.sin(angle) * 0.42, zone };
    }
    return { x: (Math.random() - 0.5) * 0.62, y: (Math.random() - 0.5) * 0.54, zone };
  }

  function pushHistory() {
    state.history.push({ cake: clone(state.cake), selectedLayer: state.selectedLayer, selectedItem: clone(state.selectedItem) });
    if (state.history.length > MAX_HISTORY) state.history.shift();
    state.inputHistoryStarted = false;
  }

  function pushHistoryOnceForInput() {
    if (state.inputHistoryStarted) return;
    pushHistory();
    state.inputHistoryStarted = true;
  }

  function undoDecoration() {
    const last = state.history.pop();
    if (!last) return;
    state.cake = last.cake;
    state.selectedLayer = normalizeIndex(last.selectedLayer, state.cake.layers.length);
    state.selectedItem = last.selectedItem;
    state.inputHistoryStarted = false;
    audio.play("cakeDecorate");
    render();
  }

  function addDecoration(type, opts = {}) {
    if (!opts.silent) pushHistory();
    const layer = normalizeIndex(opts.layer ?? state.selectedLayer, state.cake.layers.length);
    const point = opts.random ? randomPoint(opts.zone || state.placementZone) : defaultPointForNewItem(opts.zone || state.placementZone);
    const item = {
      id: uid("topping"),
      kind: "topping",
      type,
      layer,
      x: point.x,
      y: point.y,
      zone: point.zone || state.placementZone,
      rotation: Math.random() * 0.7 - 0.35,
      scale: 0.9 + Math.random() * 0.22,
    };
    clampItem(item);
    state.cake.toppings.push(item);
    state.selectedItem = { kind: "topping", id: item.id };
    if (!opts.silent) {
      audio.play("cakeDecorate");
      render();
    }
    return item;
  }

  function defaultPointForNewItem(zone) {
    const offset = (state.cake.toppings.length + state.cake.cherries.length + state.cake.candles.length) % 9;
    if (zone === "edge") {
      const angle = (offset / 9) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(angle) * 0.44, y: Math.sin(angle) * 0.42, zone };
    }
    return { x: ((offset % 3) - 1) * 0.18, y: (Math.floor(offset / 3) - 1) * 0.14, zone };
  }

  function addCherry(point, layer = state.selectedLayer, silent = false) {
    if (!silent) pushHistory();
    const item = {
      id: uid("cherry"),
      kind: "cherry",
      type: "cherry",
      layer: normalizeIndex(layer, state.cake.layers.length),
      x: point.x,
      y: point.y,
      zone: point.zone || "top",
      rotation: Math.random() * 0.4 - 0.2,
      scale: 0.95,
    };
    clampItem(item);
    state.cake.cherries.push(item);
    state.selectedItem = { kind: "cherry", id: item.id };
    if (!silent) {
      audio.play("cakeDecorate");
      render();
    }
    return item;
  }

  function addCenterCherry() {
    addCherry({ x: 0, y: 0, zone: "top" });
  }

  function addEdgeCherries() {
    pushHistory();
    const layer = state.selectedLayer;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      addCherry({ x: Math.cos(angle) * 0.45, y: Math.sin(angle) * 0.42, zone: "edge" }, layer, true);
    }
    audio.play("cakeDecorate");
    render();
  }

  function addCherrySwirls() {
    pushHistory();
    const layer = state.selectedLayer;
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
      addDecoration("swirl", { silent: true, layer, zone: "edge", random: true });
      addCherry({ x: Math.cos(angle) * 0.37, y: Math.sin(angle) * 0.34, zone: "edge" }, layer, true);
    }
    audio.play("cakeDecorate");
    render();
  }

  function randomCherries() {
    pushHistory();
    for (let i = 0; i < 10; i += 1) addCherry(randomPoint(i % 3 === 0 ? "edge" : "top"), state.selectedLayer, true);
    audio.play("cakeDecorate");
    render();
  }

  function addCandle(type, opts = {}) {
    if (!opts.silent) pushHistory();
    const point = opts.random ? randomPoint("top") : defaultPointForNewItem("top");
    const item = {
      id: uid("candle"),
      kind: "candle",
      type,
      value: type === "number" ? String(state.numberCandle || "1") : "",
      color: state.candleColor || "red",
      layer: normalizeIndex(opts.layer ?? state.selectedLayer, state.cake.layers.length),
      x: point.x,
      y: Math.min(point.y, 0.18),
      lit: true,
      smoke: 0,
      scale: 1,
    };
    clampItem(item);
    state.cake.candles.push(item);
    state.selectedItem = { kind: "candle", id: item.id };
    if (!opts.silent) {
      audio.play("cakeCandle");
      render();
    }
    return item;
  }

  function addAgeCandles() {
    const digits = String(state.ageValue || "").replace(/\D/g, "").slice(0, 3);
    if (!digits) return;
    pushHistory();
    const layer = state.selectedLayer;
    const spread = Math.max(0.12, Math.min(0.24, digits.length * 0.09));
    digits.split("").forEach((digit, index) => {
      const x = (index - (digits.length - 1) / 2) * spread;
      state.numberCandle = digit;
      addCandle("number", { silent: true, layer });
      state.cake.candles[state.cake.candles.length - 1].x = x;
      state.cake.candles[state.cake.candles.length - 1].y = -0.04;
      state.cake.candles[state.cake.candles.length - 1].value = digit;
    });
    audio.play("cakeCandle");
    render();
  }

  function setCandlesLit(lit) {
    if (!state.cake.candles.length) return;
    pushHistory();
    state.cake.candles.forEach((candle) => {
      candle.lit = lit;
      if (!lit) candle.smoke = 1;
    });
    audio.play("cakeCandle");
    render();
  }

  function clearCandles() {
    if (!state.cake.candles.length) return;
    pushHistory();
    state.cake.candles = [];
    state.selectedItem = null;
    render();
  }

  function clearKind(kind) {
    const listName = kind === "cherries" ? "cherries" : "toppings";
    if (!state.cake[listName].length) return;
    pushHistory();
    state.cake[listName] = [];
    state.selectedItem = null;
    audio.play("cakeDecorate");
    render();
  }

  function clearDecorations() {
    if (!state.cake.toppings.length && !state.cake.cherries.length) return;
    pushHistory();
    state.cake.toppings = [];
    state.cake.cherries = [];
    state.selectedItem = null;
    audio.play("cakeDecorate");
    render();
  }

  function selectedObject() {
    if (!state.selectedItem) return null;
    const lists = {
      topping: state.cake.toppings,
      cherry: state.cake.cherries,
      candle: state.cake.candles,
    };
    const list = lists[state.selectedItem.kind] || [];
    const item = list.find((candidate) => candidate.id === state.selectedItem.id);
    return item ? { kind: state.selectedItem.kind, item, list } : null;
  }

  function removeSelected() {
    const selected = selectedObject();
    if (!selected) return;
    pushHistory();
    const index = selected.list.findIndex((item) => item.id === selected.item.id);
    if (index >= 0) selected.list.splice(index, 1);
    state.selectedItem = null;
    audio.play("cakeDecorate");
    render();
  }

  function duplicateSelected() {
    const selected = selectedObject();
    if (!selected) return;
    pushHistory();
    const next = clone(selected.item);
    next.id = uid(selected.kind);
    next.x += 0.08;
    next.y += 0.06;
    clampItem(next);
    selected.list.push(next);
    state.selectedItem = { kind: selected.kind, id: next.id };
    audio.play("cakeDecorate");
    render();
  }

  function clampAllItems() {
    for (const item of [...state.cake.toppings, ...state.cake.cherries, ...state.cake.candles]) {
      item.layer = normalizeIndex(item.layer || 0, state.cake.layers.length);
      clampItem(item);
    }
  }

  function clampItem(item) {
    const edge = item.zone === "edge";
    item.x = Math.max(-0.49, Math.min(0.49, item.x));
    item.y = Math.max(-0.48, Math.min(0.48, item.y));
    if (state.cake.shape === "square") {
      item.x = Math.max(-0.43, Math.min(0.43, item.x));
      item.y = Math.max(-0.39, Math.min(0.39, item.y));
      if (edge) {
        if (Math.abs(item.x) > Math.abs(item.y)) item.x = item.x < 0 ? -0.43 : 0.43;
        else item.y = item.y < 0 ? -0.39 : 0.39;
      }
      return;
    }
    if (state.cake.shape === "heart") {
      const lowerNarrow = item.y > 0.08 ? 1 - item.y * 0.9 : 1;
      const maxX = Math.max(0.15, 0.45 * lowerNarrow);
      item.x = Math.max(-maxX, Math.min(maxX, item.x));
      if (edge) {
        const angle = Math.atan2(item.y / 0.42, item.x / maxX);
        item.x = Math.cos(angle) * maxX;
        item.y = Math.sin(angle) * 0.4;
      }
      return;
    }
    const rx = 0.47;
    const ry = 0.42;
    const distance = (item.x * item.x) / (rx * rx) + (item.y * item.y) / (ry * ry);
    if (edge || distance > 1) {
      const angle = Math.atan2(item.y / ry, item.x / rx);
      item.x = Math.cos(angle) * rx;
      item.y = Math.sin(angle) * ry;
    }
  }

  async function saveCake(name = state.cake.name || "My Cake") {
    const cleanName = name.trim().slice(0, 32) || "My Cake";
    state.cake.name = cleanName;
    const now = new Date().toISOString();
    if (!state.cake.id) state.cake.id = uid("cake");
    if (!state.cake.createdAt) state.cake.createdAt = now;
    state.cake.updatedAt = now;
    const savedCake = clone(state.cake);
    savedCake.thumbnail = createThumbnail(savedCake);

    currentData = await updateData((draft) => {
      const records = draft.progress.cakeMakerRecords;
      const index = records.savedCakes.findIndex((cake) => cake.id === savedCake.id);
      if (index >= 0) {
        records.savedCakes[index] = savedCake;
      } else {
        records.savedCakes.unshift(savedCake);
        records.cakesMade += 1;
        draft.progress.totalGamesPlayed += 1;
      }
      records.recentlyCreatedCake = savedCake.id;
      records.recentCakeName = savedCake.name;
      draft.progress.recentlyPlayed = "cake-maker";
      draft.progress.recentResults = [
        {
          id: uid("cake-result"),
          playedAt: now,
          gameId: "cake-maker",
          mode: "solo",
          difficulty: "normal",
          summary: `Saved ${savedCake.name}`,
        },
        ...draft.progress.recentResults,
      ].slice(0, 12);
      return draft;
    });
    refreshSavedFromData(currentData);
    audio.play("cakeSave");
    await onResult?.({ gameId: "cake-maker", summary: `Saved ${savedCake.name}` });
    saveResultPending = false;
    render();
    return savedCake;
  }

  function openSaveDialog() {
    state.dialog = { type: "save", name: state.cake.name || "My Cake" };
    render();
  }

  function closeDialog(needsRender = true) {
    state.dialog = null;
    if (needsRender) render();
  }

  function showFinish() {
    state.screen = "finish";
    render();
  }

  function showGallery() {
    state.screen = "gallery";
    state.dialog = null;
    state.detailsCake = null;
    render();
  }

  async function openSavedDetails(id) {
    await refreshData();
    const saved = state.savedCakes.find((cake) => cake.id === id);
    if (!saved) return;
    state.detailsCake = clone(saved);
    state.screen = "details";
    render();
  }

  async function loadCake(id, target = "editor") {
    await refreshData();
    const saved = state.savedCakes.find((cake) => cake.id === id);
    if (!saved) return;
    state.cake = clone(saved);
    state.selectedLayer = normalizeIndex(state.selectedLayer, state.cake.layers.length);
    state.history = [];
    state.selectedItem = null;
    state.detailsCake = target === "details" ? clone(saved) : null;
    if (target === "party") {
      openPartyDialog();
    } else {
      state.screen = target === "details" ? "details" : "editor";
      state.stepIndex = STEPS.length - 1;
      render();
    }
  }

  async function duplicateSavedCake(id) {
    await refreshData();
    const saved = state.savedCakes.find((cake) => cake.id === id);
    if (!saved) return;
    const duplicate = clone(saved);
    duplicate.id = uid("cake");
    duplicate.name = `${saved.name || "Cake"} Copy`.slice(0, 32);
    duplicate.createdAt = new Date().toISOString();
    duplicate.updatedAt = duplicate.createdAt;
    currentData = await updateData((draft) => {
      const records = draft.progress.cakeMakerRecords;
      records.savedCakes.unshift(duplicate);
      records.cakesMade += 1;
      records.recentCakeName = duplicate.name;
      records.recentlyCreatedCake = duplicate.id;
      draft.progress.recentlyPlayed = "cake-maker";
      return draft;
    });
    refreshSavedFromData(currentData);
    audio.play("cakeSave");
    render();
  }

  async function renameSavedCake(id) {
    await refreshData();
    const saved = state.savedCakes.find((cake) => cake.id === id);
    if (!saved) return;
    const name = window.prompt("Rename cake", saved.name || "Saved Cake");
    if (!name) return;
    const clean = name.trim().slice(0, 32);
    if (!clean) return;
    currentData = await updateData((draft) => {
      const cake = draft.progress.cakeMakerRecords.savedCakes.find((item) => item.id === id);
      if (cake) {
        cake.name = clean;
        cake.updatedAt = new Date().toISOString();
        draft.progress.cakeMakerRecords.recentCakeName = clean;
      }
      return draft;
    });
    refreshSavedFromData(currentData);
    if (state.detailsCake?.id === id) state.detailsCake.name = clean;
    audio.play("cakeSave");
    render();
  }

  async function deleteSavedCake(id) {
    if (!window.confirm("Delete this saved cake?")) return;
    currentData = await updateData((draft) => {
      const records = draft.progress.cakeMakerRecords;
      records.savedCakes = records.savedCakes.filter((cake) => cake.id !== id);
      if (records.recentlyCreatedCake === id) {
        records.recentlyCreatedCake = records.savedCakes[0]?.id || null;
        records.recentCakeName = records.savedCakes[0]?.name || null;
      }
      return draft;
    });
    refreshSavedFromData(currentData);
    if (state.screen === "details" && state.detailsCake?.id === id) {
      state.detailsCake = null;
      state.screen = "gallery";
    }
    render();
  }

  async function refreshData() {
    currentData = await getData();
    refreshSavedFromData(currentData);
  }

  function openPartyDialog() {
    state.dialog = { type: "party", heading: defaultCelebrationHeading(state.cake) };
    render();
  }

  async function startPartyMode(heading = defaultCelebrationHeading(state.cake)) {
    state.party = defaultParty();
    state.party.active = true;
    state.party.heading = heading.trim() || "Happy Birthday!";
    state.party.musicOn = Boolean(currentData.settings.music);
    state.cake.candles.forEach((candle) => {
      candle.lit = true;
    });
    if (!state.cake.candles.length) {
      addCandle("normal", { silent: true, layer: state.cake.layers.length - 1 });
    }
    state.screen = "party";
    state.view.controlsHidden = false;
    state.party.balloons = createBalloons();
    launchConfetti(true);
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "cake-maker";
      draft.progress.cakeMakerRecords.partyStarts += 1;
      return draft;
    });
    await onResult?.({ gameId: "cake-maker", summary: "Birthday Party started" });
    render();
    if (state.party.musicOn) playPartyMusic();
  }

  function stopPartyMode(target = "finish") {
    stopPartyMusic();
    state.party = defaultParty();
    if (target === "arcade") {
      destroyGame();
      onExit();
      return;
    }
    if (target === "editor") {
      state.screen = "editor";
      state.stepIndex = STEPS.length - 1;
    } else if (target === "new") {
      createCake();
      return;
    } else {
      state.screen = "finish";
    }
    render();
  }

  function confirmExitParty(target) {
    state.dialog = { type: "exit-party", target };
    render();
  }

  function playPartyMusic() {
    if (!currentData.settings.music && !state.party.musicOn) return;
    if (!partyMusic) {
      partyMusic = new Audio(extensionUrl("assets/sounds/cake-maker/birthday.wav"));
      partyMusic.loop = true;
    }
    state.party.musicOn = true;
    syncPartyMusicVolume();
    partyMusic.play().catch(() => {});
  }

  function togglePartyMusic() {
    if (state.party.musicOn) {
      state.party.musicOn = false;
      if (partyMusic) partyMusic.pause();
      render();
    } else {
      state.party.musicOn = true;
      playPartyMusic();
      render();
    }
  }

  function restartPartyMusic() {
    state.party.musicOn = true;
    if (!partyMusic) partyMusic = new Audio(extensionUrl("assets/sounds/cake-maker/birthday.wav"));
    partyMusic.currentTime = 0;
    syncPartyMusicVolume();
    partyMusic.play().catch(() => {});
    render();
  }

  function stopPartyMusic() {
    state.party.musicOn = false;
    if (!partyMusic) return;
    partyMusic.pause();
    partyMusic.currentTime = 0;
  }

  function syncPartyMusicVolume() {
    if (!partyMusic) return;
    partyMusic.volume = Math.max(0, Math.min(1, currentData.settings.volume * state.party.volume));
  }

  function launchConfetti(burst = false) {
    const reduceMotion = Boolean(currentData.settings.reduceMotion);
    const amount = reduceMotion ? (burst ? 18 : 4) : burst ? 92 : 30;
    const { width, height } = state.viewport;
    const colors = ["#ef5b63", "#ffbf47", "#46c7d9", "#7f59e8", "#2fb36d", "#ff9fbd"];
    for (let i = 0; i < amount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      state.party.confetti.push({
        x: side < 0 ? -18 : width + 18,
        y: 70 + Math.random() * height * 0.45,
        vx: side * (reduceMotion ? 50 : 140 + Math.random() * 110),
        vy: reduceMotion ? 40 : -70 - Math.random() * 110,
        gravity: reduceMotion ? 60 : 220,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        color: randomItem(colors),
        shape: randomItem(["square", "streamer", "star", "heart"]),
        size: 5 + Math.random() * 8,
        life: reduceMotion ? 1.4 : 2.8 + Math.random() * 1.8,
      });
    }
    if (burst) {
      state.party.confettiTime = reduceMotion ? 0.8 : 4.2;
      audio.play("cakeConfetti");
    }
  }

  function createBalloons() {
    const reduceMotion = Boolean(currentData.settings.reduceMotion);
    const colors = ["#ef5b63", "#ffbf47", "#46c7d9", "#7f59e8", "#2fb36d", "#ff9fbd", "#ffa35a"];
    return Array.from({ length: reduceMotion ? 5 : 13 }, (_, index) => ({
      id: uid("balloon"),
      x: 50 + Math.random() * Math.max(260, state.viewport.width - 100),
      y: state.viewport.height + Math.random() * 360 + index * 18,
      sway: Math.random() * Math.PI * 2,
      speed: reduceMotion ? 12 + Math.random() * 7 : 24 + Math.random() * 22,
      color: randomItem(colors),
      shape: randomItem(["round", "heart", "star"]),
      size: 28 + Math.random() * 22,
      popped: 0,
    }));
  }

  function blowOutCandles() {
    if (!state.cake.candles.length) return;
    state.cake.candles.forEach((candle) => {
      candle.lit = false;
      candle.smoke = 1;
      const point = itemToCanvasPoint(candle);
      state.party.smoke.push({ x: point.x, y: point.y - 44, life: 1.4, size: 12 });
    });
    state.party.wishText = "Make a Wish!";
    const wishNode = root.querySelector(".party-heading span");
    if (wishNode) wishNode.textContent = state.party.wishText;
    audio.play("cakeWish");
    launchConfetti(true);
    draw();
  }

  function bindGlobalEvents() {
    window.addEventListener("keydown", handleKeydown);
  }

  function bindCanvasEvents() {
    if (!canvas) return;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
  }

  function observeCanvas() {
    if (!canvas) return;
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      draw();
    });
    resizeObserver.observe(canvas);
  }

  function teardownCanvasObserver() {
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || 780));
    const height = Math.max(360, Math.floor(rect.height || 540));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    state.viewport = { width, height };
    if (state.screen === "party" && state.party.balloons.length < 2) state.party.balloons = createBalloons();
  }

  function handleKeydown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      if (state.paused) resumeGame();
      else pauseGame();
    }
    if (event.target && ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    if (matchesControl(event, controls.undo)) undoDecoration();
    if (matchesControl(event, controls.save)) openSaveDialog();
    if (matchesControl(event, controls.party)) openPartyDialog();
  }

  function handlePointerDown(event) {
    if (!canvas) return;
    const point = eventPoint(event);
    if (state.screen === "party") {
      const balloon = findBalloon(point);
      if (balloon) {
        balloon.popped = 1;
        state.party.confetti.push({
          x: balloon.x,
          y: balloon.y,
          vx: 0,
          vy: -30,
          gravity: 60,
          rotation: 0,
          spin: 1,
          color: balloon.color,
          shape: "star",
          size: 7,
          life: 0.8,
        });
      }
      return;
    }
    const hit = findHit(point);
    if (!hit) {
      state.selectedItem = null;
      draw();
      return;
    }
    pushHistory();
    state.selectedItem = { kind: hit.kind, id: hit.id };
    state.selectedLayer = normalizeIndex(hit.layer, state.cake.layers.length);
    state.drag = { kind: hit.kind, id: hit.id, pointerId: event.pointerId };
    canvas.setPointerCapture?.(event.pointerId);
    draw();
  }

  function handlePointerMove(event) {
    if (!state.drag || !canvas) return;
    const selected = selectedObject();
    if (!selected) return;
    const layer = state.layout?.layers?.[selected.item.layer];
    if (!layer) return;
    const point = eventPoint(event);
    selected.item.x = (point.x - layer.cx) / layer.w;
    selected.item.y = (point.y - layer.cy) / layer.h;
    selected.item.zone = inferZone(selected.item);
    clampItem(selected.item);
    draw();
  }

  function handlePointerUp(event) {
    if (!state.drag) return;
    canvas?.releasePointerCapture?.(event.pointerId);
    state.drag = null;
    render();
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function inferZone(item) {
    if (Math.abs(item.x) > 0.36 || Math.abs(item.y) > 0.32) return "edge";
    return "top";
  }

  function findHit(point) {
    for (let i = state.hits.length - 1; i >= 0; i -= 1) {
      const hit = state.hits[i];
      if (Math.hypot(point.x - hit.x, point.y - hit.y) <= hit.radius) return hit;
    }
    return null;
  }

  function findBalloon(point) {
    return state.party.balloons.find((balloon) => !balloon.popped && Math.hypot(point.x - balloon.x, point.y - balloon.y) < balloon.size);
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    let last = performance.now();
    const tick = (time) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (!state.paused) update(dt);
      draw(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function update(dt) {
    if (state.screen !== "party") return;
    updateParty(dt);
  }

  function updateParty(dt) {
    const reduceMotion = Boolean(currentData.settings.reduceMotion);
    state.party.lightsTime += dt;
    state.party.confettiTime = Math.max(0, state.party.confettiTime - dt);
    if (state.party.confettiTime > 0 && !reduceMotion && Math.random() < dt * 3) launchConfetti(false);
    state.party.confetti.forEach((piece) => {
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.vy += piece.gravity * dt;
      piece.rotation += piece.spin * dt;
      piece.life -= dt;
    });
    state.party.confetti = state.party.confetti.filter((piece) => piece.life > 0 && piece.y < state.viewport.height + 120);
    state.party.smoke.forEach((puff) => {
      puff.y -= 18 * dt;
      puff.size += 18 * dt;
      puff.life -= dt;
    });
    state.party.smoke = state.party.smoke.filter((puff) => puff.life > 0);
    state.party.balloons.forEach((balloon) => {
      if (balloon.popped) {
        balloon.popped -= dt * 3.2;
        if (balloon.popped <= 0) resetBalloon(balloon, true);
        return;
      }
      balloon.y -= balloon.speed * dt;
      balloon.sway += dt * 1.2;
      if (balloon.y < -80) resetBalloon(balloon, false);
    });
  }

  function resetBalloon(balloon, lower) {
    balloon.x = 40 + Math.random() * Math.max(260, state.viewport.width - 80);
    balloon.y = lower ? state.viewport.height + 80 + Math.random() * 260 : state.viewport.height + 40;
    balloon.sway = Math.random() * Math.PI * 2;
    balloon.popped = 0;
  }

  function draw(time = performance.now()) {
    if (!ctx || !canvas) return;
    resizeCanvas();
    const { width, height } = state.viewport;
    ctx.clearRect(0, 0, width, height);
    state.hits = [];
    if (state.screen === "party") drawPartyScene(ctx, width, height, time);
    else drawEditorScene(ctx, width, height, displayCake(), time);
  }

  function drawEditorScene(context2d, width, height, cake, time) {
    const gradient = context2d.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#fff8f0");
    gradient.addColorStop(0.5, "#eef9ff");
    gradient.addColorStop(1, "#f0fff6");
    context2d.fillStyle = gradient;
    context2d.fillRect(0, 0, width, height);
    drawTable(context2d, width, height);
    state.layout = computeCakeLayout(width, height, cake, state.view, false);
    drawCake(context2d, cake, state.layout, time, false);
  }

  function drawPartyScene(context2d, width, height, time) {
    const sky = context2d.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#f9ecff");
    sky.addColorStop(0.5, "#e7f8ff");
    sky.addColorStop(1, "#fff7d8");
    context2d.fillStyle = sky;
    context2d.fillRect(0, 0, width, height);
    drawStreamers(context2d, width);
    drawLights(context2d, width, time);
    drawBalloons(context2d, time);
    drawConfetti(context2d);
    drawTable(context2d, width, height, true);
    state.layout = computeCakeLayout(width, height, state.cake, { rotation: state.view.rotation, zoom: Math.min(1.16, state.view.zoom + 0.08) }, true);
    drawCake(context2d, state.cake, state.layout, time, true);
    drawSmoke(context2d);
  }

  function drawTable(context2d, width, height, party = false) {
    context2d.save();
    context2d.fillStyle = party ? "#ffdfc2" : "#f5d8b6";
    context2d.beginPath();
    context2d.ellipse(width / 2, height * 0.78, width * 0.42, 44, 0, 0, Math.PI * 2);
    context2d.fill();
    context2d.fillStyle = party ? "#f2b98e" : "#d6a778";
    context2d.fillRect(width * 0.12, height * 0.78, width * 0.76, height * 0.22);
    context2d.restore();
  }

  function computeCakeLayout(width, height, cake, view, party) {
    const count = cake.layers.length;
    const zoom = view.zoom || 1;
    const baseWidth = Math.min(width * (party ? 0.58 : 0.62), 520) * zoom;
    const topHeight = Math.min(86, height * 0.15) * zoom;
    const sideHeight = Math.min(80, height * 0.14) * zoom;
    const lift = sideHeight * 0.66;
    const baseCy = height * (party ? 0.62 : 0.61) + Math.max(0, count - 1) * lift * 0.22;
    const cx = width / 2;
    const layers = [];
    for (let index = 0; index < count; index += 1) {
      const w = Math.max(210, baseWidth - index * 72 * zoom);
      const h = Math.max(48, topHeight - index * 4 * zoom);
      const cy = baseCy - index * lift;
      layers.push({
        index,
        cx: cx + view.rotation * (index - (count - 1) / 2) * 1.15,
        cy,
        w,
        h,
        sideHeight,
        x: cx - w / 2,
        y: cy - h / 2,
      });
    }
    return { layers, top: layers[count - 1], party };
  }

  function drawCake(context2d, cake, layout, time, party) {
    for (const layer of layout.layers) drawLayer(context2d, cake, layer);
    drawPlacedItems(context2d, cake.toppings, time);
    drawPlacedItems(context2d, cake.cherries, time);
    drawTextOnCake(context2d, cake);
    drawPlacedItems(context2d, cake.candles, time, party);
  }

  function drawLayer(context2d, cake, bounds) {
    const layer = cake.layers[bounds.index];
    const flavour = FLAVOURS[layer.flavour] || FLAVOURS.vanilla;
    context2d.save();
    drawLayerSide(context2d, cake.shape, bounds, flavour);
    drawLayerTop(context2d, cake.shape, bounds, flavour, layer);
    drawEdge(context2d, cake.shape, bounds, layer);
    context2d.restore();
  }

  function drawLayerSide(context2d, shape, bounds, flavour) {
    const { cx, cy, w, h, sideHeight } = bounds;
    context2d.fillStyle = flavour.side;
    context2d.strokeStyle = "rgba(39, 31, 31, 0.16)";
    context2d.lineWidth = 2;
    if (shape === "square") {
      roundRect(context2d, cx - w / 2, cy - h * 0.2, w, sideHeight, 16);
      context2d.fill();
      context2d.stroke();
      context2d.fillStyle = "rgba(255,255,255,0.16)";
      context2d.fillRect(cx - w / 2 + 18, cy + 4, w - 36, 8);
    } else if (shape === "heart") {
      heartPath(context2d, cx, cy + sideHeight * 0.45, w, h * 1.05);
      context2d.fill();
      context2d.stroke();
      context2d.fillStyle = "rgba(0,0,0,0.09)";
      heartPath(context2d, cx, cy + sideHeight * 0.72, w * 0.95, h * 0.8);
      context2d.fill();
    } else {
      context2d.beginPath();
      context2d.rect(cx - w / 2, cy, w, sideHeight);
      context2d.fill();
      context2d.beginPath();
      context2d.ellipse(cx, cy + sideHeight, w / 2, h / 2, 0, 0, Math.PI * 2);
      context2d.fillStyle = shade(flavour.side, -18);
      context2d.fill();
      context2d.stroke();
    }
  }

  function drawLayerTop(context2d, shape, bounds, flavour, layer) {
    context2d.save();
    clipShape(context2d, shape, bounds);
    context2d.fillStyle = flavour.cream;
    context2d.fillRect(bounds.cx - bounds.w / 2 - 8, bounds.cy - bounds.h / 2 - 8, bounds.w + 16, bounds.h + 16);
    applyIcing(context2d, shape, bounds, flavour, layer);
    context2d.restore();
    context2d.save();
    context2d.strokeStyle = "rgba(39,31,31,0.22)";
    context2d.lineWidth = 2;
    shapePath(context2d, shape, bounds);
    context2d.stroke();
    context2d.restore();
  }

  function applyIcing(context2d, shape, bounds, flavour, layer) {
    const color = ICING_COLORS[layer.icingColor]?.value || ICING_COLORS.white.value;
    if (layer.icingStyle === "none") {
      drawFlavourAccents(context2d, bounds, flavour);
      return;
    }
    if (["full", "smooth", "drip", "swirl", "sprinkles"].includes(layer.icingStyle)) {
      context2d.fillStyle = color;
      context2d.globalAlpha = layer.icingStyle === "smooth" ? 0.86 : 0.94;
      shapePath(context2d, shape, bounds);
      context2d.fill();
      context2d.globalAlpha = 1;
    }
    if (layer.icingStyle === "border") {
      drawFlavourAccents(context2d, bounds, flavour);
      drawCreamBorder(context2d, shape, bounds, color, 1);
    }
    if (layer.icingStyle === "drip") drawDrips(context2d, bounds, color);
    if (layer.icingStyle === "swirl") drawSwirlIcing(context2d, bounds, color);
    if (layer.icingStyle === "sprinkles") drawSprinkles(context2d, bounds, 36);
    if (layer.icingStyle === "full" || layer.icingStyle === "smooth") drawCreamBorder(context2d, shape, bounds, shade(color, -8), 0.65);
  }

  function drawFlavourAccents(context2d, bounds, flavour) {
    context2d.fillStyle = flavour.highlight;
    for (let i = 0; i < 12; i += 1) {
      const point = ellipsePoint(bounds, (i / 12) * Math.PI * 2);
      context2d.globalAlpha = 0.38;
      context2d.beginPath();
      context2d.arc(point.x * 0.92 + bounds.cx * 0.08, point.y * 0.88 + bounds.cy * 0.12, 3.5, 0, Math.PI * 2);
      context2d.fill();
    }
    context2d.globalAlpha = 1;
  }

  function drawCreamBorder(context2d, shape, bounds, color, alpha) {
    context2d.save();
    context2d.globalAlpha = alpha;
    context2d.fillStyle = color;
    const count = shape === "square" ? 18 : 22;
    for (let i = 0; i < count; i += 1) {
      const p = edgePointForShape(shape, bounds, i / count);
      context2d.beginPath();
      context2d.arc(p.x, p.y, Math.max(5, bounds.w * 0.018), 0, Math.PI * 2);
      context2d.fill();
    }
    context2d.restore();
  }

  function drawDrips(context2d, bounds, color) {
    context2d.save();
    context2d.fillStyle = shade(color, -10);
    const count = 9;
    for (let i = 0; i < count; i += 1) {
      const x = bounds.cx - bounds.w * 0.42 + (bounds.w * 0.84 * i) / (count - 1);
      const length = 16 + (i % 3) * 9;
      context2d.beginPath();
      context2d.roundRect(x - 8, bounds.cy + bounds.h * 0.3, 16, length, 8);
      context2d.fill();
      context2d.beginPath();
      context2d.arc(x, bounds.cy + bounds.h * 0.3 + length, 8, 0, Math.PI * 2);
      context2d.fill();
    }
    context2d.restore();
  }

  function drawSwirlIcing(context2d, bounds, color) {
    context2d.save();
    context2d.strokeStyle = shade(color, -14);
    context2d.lineWidth = 4;
    for (let i = 0; i < 7; i += 1) {
      const x = bounds.cx - bounds.w * 0.3 + (i % 4) * bounds.w * 0.2;
      const y = bounds.cy - bounds.h * 0.14 + Math.floor(i / 4) * bounds.h * 0.26;
      drawSpiral(context2d, x, y, 13, 2.8);
    }
    context2d.restore();
  }

  function drawEdge(context2d, shape, bounds, layer) {
    if (layer.edgeStyle === "none") return;
    const color = ICING_COLORS[layer.icingColor]?.value || "#fff8e8";
    const count = shape === "square" ? 16 : 20;
    for (let i = 0; i < count; i += 1) {
      const p = edgePointForShape(shape, bounds, i / count);
      if (layer.edgeStyle === "cream") drawCreamDot(context2d, p.x, p.y, color, 7);
      if (layer.edgeStyle === "scallop") drawScallop(context2d, p.x, p.y, color, 9);
      if (layer.edgeStyle === "chips") drawCandyChip(context2d, p.x, p.y, i);
      if (layer.edgeStyle === "stars") drawSugarStar(context2d, p.x, p.y, 8, i % 2 ? "#ffd35a" : "#ff9fbd");
    }
  }

  function drawPlacedItems(context2d, items, time, party = false) {
    for (const item of items) {
      const point = itemToCanvasPoint(item);
      const selected = state.selectedItem?.id === item.id;
      context2d.save();
      context2d.translate(point.x, point.y);
      context2d.rotate(item.rotation || 0);
      context2d.scale(item.scale || 1, item.scale || 1);
      if (item.kind === "topping") drawTopping(context2d, item.type, selected);
      if (item.kind === "cherry") drawCherry(context2d, selected);
      if (item.kind === "candle") drawCandle(context2d, item, time, selected, party);
      context2d.restore();
      const radius = item.kind === "candle" ? 28 : 20;
      if (displayCake() === state.cake) state.hits.push({ id: item.id, kind: item.kind, layer: item.layer, x: point.x, y: point.y, radius });
    }
  }

  function itemToCanvasPoint(item) {
    const layer = state.layout?.layers?.[normalizeIndex(item.layer || 0, state.layout.layers.length)] || state.layout?.top;
    if (!layer) return { x: 0, y: 0 };
    return { x: layer.cx + item.x * layer.w, y: layer.cy + item.y * layer.h };
  }

  function drawTopping(context2d, type, selected) {
    if (type === "strawberry") drawStrawberry(context2d);
    if (type === "pineapple") drawPineapple(context2d);
    if (type === "chocolate") drawChocolatePiece(context2d);
    if (type === "butterscotch") drawButterscotchPiece(context2d);
    if (type === "pista") drawPistaPiece(context2d);
    if (type === "sprinkles") drawSprinkleCluster(context2d);
    if (type === "star") drawSugarStar(context2d, 0, 0, 15, "#ffd35a");
    if (type === "heart") drawSugarHeart(context2d, 0, 0, 16, "#ff7aa4");
    if (type === "swirl") drawCreamSwirl(context2d);
    if (type === "ball") drawChocolateBall(context2d);
    if (type === "wafer") drawWafer(context2d);
    if (selected) drawSelectionRing(context2d, 23);
  }

  function drawCherry(context2d, selected) {
    context2d.save();
    context2d.fillStyle = "#e51f4f";
    context2d.strokeStyle = "#9c1735";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.arc(-5, 2, 9, 0, Math.PI * 2);
    context2d.arc(6, 3, 8, 0, Math.PI * 2);
    context2d.fill();
    context2d.stroke();
    context2d.strokeStyle = "#2f8b52";
    context2d.lineWidth = 2.5;
    context2d.beginPath();
    context2d.moveTo(0, -4);
    context2d.quadraticCurveTo(6, -18, 19, -16);
    context2d.stroke();
    context2d.fillStyle = "#fff1f4";
    context2d.beginPath();
    context2d.arc(-8, -1, 2.5, 0, Math.PI * 2);
    context2d.fill();
    if (selected) drawSelectionRing(context2d, 23);
    context2d.restore();
  }

  function drawCandle(context2d, candle, time, selected, party) {
    const color = CANDLE_COLORS[candle.color] || CANDLE_COLORS.red;
    const bodyHeight = candle.type === "sparkler" ? 46 : 38;
    context2d.save();
    context2d.translate(0, -bodyHeight / 2);
    if (candle.type === "heart") drawSugarHeart(context2d, 0, -8, 14, color);
    if (candle.type === "star") drawSugarStar(context2d, 0, -8, 14, color);
    context2d.fillStyle = color;
    context2d.strokeStyle = "#29364e";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.roundRect(-7, -2, 14, bodyHeight, 4);
    context2d.fill();
    context2d.stroke();
    if (candle.type === "striped") {
      context2d.strokeStyle = "#fff8e8";
      context2d.lineWidth = 3;
      for (let y = 4; y < bodyHeight; y += 11) {
        context2d.beginPath();
        context2d.moveTo(-7, y);
        context2d.lineTo(7, y - 7);
        context2d.stroke();
      }
    }
    if (candle.type === "sparkler") {
      context2d.strokeStyle = "#fff8e8";
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6 + time * 0.004;
        context2d.beginPath();
        context2d.moveTo(Math.cos(angle) * 3, -9 + Math.sin(angle) * 3);
        context2d.lineTo(Math.cos(angle) * 15, -9 + Math.sin(angle) * 15);
        context2d.stroke();
      }
    }
    if (candle.type === "number") {
      context2d.fillStyle = "#263142";
      context2d.font = "bold 19px Arial, sans-serif";
      context2d.textAlign = "center";
      context2d.textBaseline = "middle";
      context2d.fillText(candle.value || "0", 0, bodyHeight * 0.48);
    }
    if (candle.lit) drawFlame(context2d, 0, -9, time, party);
    if (candle.smoke && !candle.lit) {
      candle.smoke = Math.max(0, candle.smoke - 0.012);
      context2d.globalAlpha = candle.smoke;
      context2d.fillStyle = "#c7cbd3";
      context2d.beginPath();
      context2d.arc(3, -22 - (1 - candle.smoke) * 14, 5 + (1 - candle.smoke) * 6, 0, Math.PI * 2);
      context2d.fill();
    }
    context2d.restore();
    if (selected) drawSelectionRing(context2d, 30);
  }

  function drawFlame(context2d, x, y, time, party) {
    const flicker = currentData.settings.reduceMotion ? 0 : Math.sin(time * 0.012) * 2;
    context2d.save();
    context2d.translate(x, y - 6 + flicker * 0.2);
    context2d.fillStyle = party ? "#ffe66d" : "#ffd35a";
    context2d.beginPath();
    context2d.moveTo(0, -14);
    context2d.bezierCurveTo(12, -2, 6, 10, 0, 11);
    context2d.bezierCurveTo(-8, 8, -10, -3, 0, -14);
    context2d.fill();
    context2d.fillStyle = "#ff8a3d";
    context2d.beginPath();
    context2d.moveTo(0, -8);
    context2d.bezierCurveTo(5, 0, 3, 6, 0, 7);
    context2d.bezierCurveTo(-4, 4, -5, -1, 0, -8);
    context2d.fill();
    context2d.restore();
  }

  function drawTextOnCake(context2d, cake) {
    const message = cake.text.message.trim();
    if (!message || !state.layout?.top) {
      cake.text.warning = "";
      return;
    }
    const top = state.layout.top;
    const color = TEXT_COLORS[cake.text.color]?.value || TEXT_COLORS.berry.value;
    const style = TEXT_STYLES.find((font) => font.id === cake.text.style) || TEXT_STYLES[0];
    const maxWidth = top.w * (cake.shape === "heart" ? 0.48 : 0.6);
    const fit = fitText(context2d, message, style.font, cake.text.size, maxWidth);
    cake.text.warning = fit.warning;
    const yOffset = cake.text.position === "upper" ? -top.h * 0.18 : cake.text.position === "lower" ? top.h * 0.18 : 0;
    context2d.save();
    context2d.fillStyle = color;
    context2d.strokeStyle = color === "#fff8ee" ? "#8b6244" : "rgba(255,255,255,0.78)";
    context2d.lineWidth = 4;
    context2d.textAlign = "center";
    context2d.textBaseline = "middle";
    context2d.font = `${cake.text.style === "bold" ? "900" : "800"} ${fit.size}px ${style.font}`;
    if (cake.text.curved && fit.lines.length === 1) {
      drawCurvedText(context2d, fit.lines[0], top.cx, top.cy + yOffset, maxWidth * 0.62, fit.size);
    } else {
      fit.lines.forEach((line, index) => {
        const y = top.cy + yOffset + (index - (fit.lines.length - 1) / 2) * fit.size * 1.05;
        context2d.strokeText(line, top.cx, y);
        context2d.fillText(line, top.cx, y);
      });
    }
    context2d.restore();
  }

  function fitText(context2d, text, font, requestedSize, maxWidth) {
    let size = requestedSize;
    let lines = [text];
    let warning = "";
    const setFont = () => {
      context2d.font = `800 ${size}px ${font}`;
    };
    setFont();
    while (size > 18 && context2d.measureText(lines[0]).width > maxWidth) {
      size -= 2;
      setFont();
    }
    if (context2d.measureText(lines[0]).width > maxWidth) {
      lines = wrapMessage(text);
      while (size > 15 && Math.max(...lines.map((line) => context2d.measureText(line).width)) > maxWidth) {
        size -= 1;
        setFont();
      }
    }
    if (Math.max(...lines.map((line) => context2d.measureText(line).width)) > maxWidth) warning = "Message is very long. Shorten it for a cleaner cake.";
    return { lines, size, warning };
  }

  function wrapMessage(text) {
    const words = text.split(/\s+/);
    if (words.length < 2) return [text];
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")].filter(Boolean);
  }

  function drawCurvedText(context2d, text, cx, cy, radius, size) {
    const chars = [...text];
    const step = Math.min(0.18, Math.PI / Math.max(chars.length, 4));
    const start = -((chars.length - 1) * step) / 2;
    chars.forEach((char, index) => {
      const angle = start + index * step;
      context2d.save();
      context2d.translate(cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius * 0.22 + size * 0.4);
      context2d.rotate(angle * 0.34);
      context2d.strokeText(char, 0, 0);
      context2d.fillText(char, 0, 0);
      context2d.restore();
    });
  }

  function updateWritingWarning() {
    const warning = root.querySelector("#cakeTextWarning");
    if (warning) warning.textContent = state.cake.text.warning || "";
  }

  function shapePath(context2d, shape, bounds) {
    if (shape === "square") {
      roundRect(context2d, bounds.cx - bounds.w / 2, bounds.cy - bounds.h / 2, bounds.w, bounds.h, 18);
    } else if (shape === "heart") {
      heartPath(context2d, bounds.cx, bounds.cy, bounds.w, bounds.h * 1.45);
    } else {
      context2d.beginPath();
      context2d.ellipse(bounds.cx, bounds.cy, bounds.w / 2, bounds.h / 2, 0, 0, Math.PI * 2);
    }
  }

  function clipShape(context2d, shape, bounds) {
    shapePath(context2d, shape, bounds);
    context2d.clip();
  }

  function heartPath(context2d, cx, cy, w, h) {
    const top = cy - h * 0.22;
    context2d.beginPath();
    context2d.moveTo(cx, cy + h * 0.38);
    context2d.bezierCurveTo(cx - w * 0.52, cy + h * 0.06, cx - w * 0.48, top - h * 0.12, cx - w * 0.2, top);
    context2d.bezierCurveTo(cx - w * 0.08, top - h * 0.18, cx, top - h * 0.08, cx, top + h * 0.04);
    context2d.bezierCurveTo(cx, top - h * 0.08, cx + w * 0.08, top - h * 0.18, cx + w * 0.2, top);
    context2d.bezierCurveTo(cx + w * 0.48, top - h * 0.12, cx + w * 0.52, cy + h * 0.06, cx, cy + h * 0.38);
    context2d.closePath();
  }

  function roundRect(context2d, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context2d.beginPath();
    context2d.moveTo(x + r, y);
    context2d.arcTo(x + width, y, x + width, y + height, r);
    context2d.arcTo(x + width, y + height, x, y + height, r);
    context2d.arcTo(x, y + height, x, y, r);
    context2d.arcTo(x, y, x + width, y, r);
    context2d.closePath();
  }

  function edgePointForShape(shape, bounds, t) {
    if (shape === "square") {
      const perimeter = 4;
      const side = Math.floor(t * perimeter);
      const local = t * perimeter - side;
      const x0 = bounds.cx - bounds.w * 0.46;
      const x1 = bounds.cx + bounds.w * 0.46;
      const y0 = bounds.cy - bounds.h * 0.38;
      const y1 = bounds.cy + bounds.h * 0.38;
      if (side === 0) return { x: x0 + (x1 - x0) * local, y: y0 };
      if (side === 1) return { x: x1, y: y0 + (y1 - y0) * local };
      if (side === 2) return { x: x1 - (x1 - x0) * local, y: y1 };
      return { x: x0, y: y1 - (y1 - y0) * local };
    }
    const angle = t * Math.PI * 2 - Math.PI / 2;
    if (shape === "heart") {
      const narrow = Math.sin(angle) > 0 ? 0.74 : 1;
      return { x: bounds.cx + Math.cos(angle) * bounds.w * 0.39 * narrow, y: bounds.cy + Math.sin(angle) * bounds.h * 0.42 };
    }
    return ellipsePoint(bounds, angle);
  }

  function ellipsePoint(bounds, angle) {
    return { x: bounds.cx + Math.cos(angle) * bounds.w * 0.47, y: bounds.cy + Math.sin(angle) * bounds.h * 0.42 };
  }

  function drawSelectionRing(context2d, radius) {
    context2d.save();
    context2d.strokeStyle = "#16324f";
    context2d.lineWidth = 2;
    context2d.setLineDash([5, 4]);
    context2d.beginPath();
    context2d.arc(0, 0, radius, 0, Math.PI * 2);
    context2d.stroke();
    context2d.restore();
  }

  function drawStrawberry(context2d) {
    context2d.fillStyle = "#ef4d75";
    context2d.strokeStyle = "#9e2748";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.moveTo(0, 15);
    context2d.bezierCurveTo(-20, -2, -13, -18, 0, -12);
    context2d.bezierCurveTo(13, -18, 20, -2, 0, 15);
    context2d.fill();
    context2d.stroke();
    context2d.fillStyle = "#ffe17d";
    for (let i = 0; i < 6; i += 1) context2d.fillRect(-8 + (i % 3) * 8, -5 + Math.floor(i / 3) * 8, 2, 3);
    context2d.fillStyle = "#2fb36d";
    context2d.beginPath();
    context2d.moveTo(-7, -12);
    context2d.lineTo(0, -20);
    context2d.lineTo(7, -12);
    context2d.fill();
  }

  function drawPineapple(context2d) {
    context2d.fillStyle = "#ffd35a";
    context2d.strokeStyle = "#b77717";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.moveTo(-13, 12);
    context2d.lineTo(5, -14);
    context2d.lineTo(17, 8);
    context2d.closePath();
    context2d.fill();
    context2d.stroke();
    context2d.strokeStyle = "#fff4a5";
    context2d.beginPath();
    context2d.moveTo(-5, 2);
    context2d.lineTo(9, 8);
    context2d.moveTo(0, -7);
    context2d.lineTo(12, -2);
    context2d.stroke();
  }

  function drawChocolatePiece(context2d) {
    context2d.fillStyle = "#5a321f";
    context2d.strokeStyle = "#2c1810";
    context2d.lineWidth = 2;
    roundRect(context2d, -14, -11, 28, 22, 4);
    context2d.fill();
    context2d.stroke();
    context2d.strokeStyle = "#8d5a39";
    context2d.beginPath();
    context2d.moveTo(0, -10);
    context2d.lineTo(0, 11);
    context2d.moveTo(-14, 0);
    context2d.lineTo(14, 0);
    context2d.stroke();
  }

  function drawButterscotchPiece(context2d) {
    context2d.fillStyle = "#f3a936";
    context2d.strokeStyle = "#a85d19";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.arc(0, 0, 14, 0, Math.PI * 2);
    context2d.fill();
    context2d.stroke();
    context2d.fillStyle = "#ffe2a0";
    context2d.fillRect(-5, -5, 10, 10);
  }

  function drawPistaPiece(context2d) {
    context2d.fillStyle = "#9ad36c";
    context2d.strokeStyle = "#4a7835";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.ellipse(0, 0, 16, 9, -0.45, 0, Math.PI * 2);
    context2d.fill();
    context2d.stroke();
    context2d.fillStyle = "#eaffcb";
    context2d.beginPath();
    context2d.ellipse(-3, -2, 6, 3, -0.45, 0, Math.PI * 2);
    context2d.fill();
  }

  function drawSprinkleCluster(context2d) {
    const colors = ["#ef5b63", "#46c7d9", "#ffd35a", "#7f59e8", "#2fb36d"];
    context2d.lineWidth = 3;
    for (let i = 0; i < 8; i += 1) {
      context2d.strokeStyle = colors[i % colors.length];
      context2d.beginPath();
      context2d.moveTo(-14 + (i % 4) * 9, -8 + Math.floor(i / 4) * 12);
      context2d.lineTo(-9 + (i % 4) * 9, -10 + Math.floor(i / 4) * 12);
      context2d.stroke();
    }
  }

  function drawSugarStar(context2d, x, y, radius, color) {
    context2d.save();
    context2d.translate(x, y);
    context2d.fillStyle = color;
    context2d.strokeStyle = shade(color, -20);
    context2d.lineWidth = 1.5;
    context2d.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? radius : radius * 0.48;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) context2d.moveTo(px, py);
      else context2d.lineTo(px, py);
    }
    context2d.closePath();
    context2d.fill();
    context2d.stroke();
    context2d.restore();
  }

  function drawSugarHeart(context2d, x, y, size, color) {
    context2d.save();
    context2d.translate(x, y);
    context2d.fillStyle = color;
    context2d.strokeStyle = shade(color, -18);
    context2d.lineWidth = 1.5;
    context2d.beginPath();
    context2d.moveTo(0, size * 0.55);
    context2d.bezierCurveTo(-size, 0, -size * 0.55, -size * 0.7, 0, -size * 0.28);
    context2d.bezierCurveTo(size * 0.55, -size * 0.7, size, 0, 0, size * 0.55);
    context2d.closePath();
    context2d.fill();
    context2d.stroke();
    context2d.restore();
  }

  function drawCreamSwirl(context2d) {
    context2d.save();
    context2d.fillStyle = "#fff8e8";
    context2d.strokeStyle = "#d9b989";
    context2d.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      context2d.beginPath();
      context2d.ellipse(0, 7 - i * 6, 17 - i * 3, 7, 0, 0, Math.PI * 2);
      context2d.fill();
      context2d.stroke();
    }
    context2d.restore();
  }

  function drawChocolateBall(context2d) {
    const grad = context2d.createRadialGradient(-6, -6, 2, 0, 0, 15);
    grad.addColorStop(0, "#d6a16d");
    grad.addColorStop(1, "#59311f");
    context2d.fillStyle = grad;
    context2d.strokeStyle = "#2c1810";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.arc(0, 0, 15, 0, Math.PI * 2);
    context2d.fill();
    context2d.stroke();
  }

  function drawWafer(context2d) {
    context2d.save();
    context2d.rotate(-0.24);
    context2d.fillStyle = "#e2a35e";
    context2d.strokeStyle = "#9d6330";
    context2d.lineWidth = 2;
    roundRect(context2d, -7, -24, 14, 48, 4);
    context2d.fill();
    context2d.stroke();
    context2d.strokeStyle = "#ffdca4";
    for (let y = -16; y <= 16; y += 8) {
      context2d.beginPath();
      context2d.moveTo(-6, y);
      context2d.lineTo(6, y + 5);
      context2d.stroke();
    }
    context2d.restore();
  }

  function drawCreamDot(context2d, x, y, color, size) {
    context2d.fillStyle = color;
    context2d.strokeStyle = shade(color, -18);
    context2d.lineWidth = 1.5;
    context2d.beginPath();
    context2d.arc(x, y, size, 0, Math.PI * 2);
    context2d.fill();
    context2d.stroke();
  }

  function drawScallop(context2d, x, y, color, size) {
    context2d.fillStyle = color;
    context2d.beginPath();
    context2d.arc(x, y, size, Math.PI, 0);
    context2d.closePath();
    context2d.fill();
  }

  function drawCandyChip(context2d, x, y, index) {
    const colors = ["#ef5b63", "#46c7d9", "#ffd35a", "#7f59e8", "#2fb36d"];
    context2d.save();
    context2d.translate(x, y);
    context2d.rotate(index * 0.7);
    context2d.fillStyle = colors[index % colors.length];
    roundRect(context2d, -5, -3, 10, 6, 2);
    context2d.fill();
    context2d.restore();
  }

  function drawSprinkles(context2d, bounds, count) {
    const colors = ["#ef5b63", "#46c7d9", "#ffd35a", "#7f59e8", "#2fb36d"];
    context2d.save();
    context2d.lineWidth = 2.5;
    for (let i = 0; i < count; i += 1) {
      const a = seededUnit(i * 2 + bounds.index * 31);
      const b = seededUnit(i * 2 + 1 + bounds.index * 31);
      const p = {
        x: bounds.cx + (a - 0.5) * bounds.w * 0.8,
        y: bounds.cy + (b - 0.5) * bounds.h * 0.65,
      };
      context2d.strokeStyle = colors[i % colors.length];
      context2d.beginPath();
      context2d.moveTo(p.x - 3, p.y);
      context2d.lineTo(p.x + 3, p.y + 2);
      context2d.stroke();
    }
    context2d.restore();
  }

  function drawSpiral(context2d, x, y, radius, turns) {
    context2d.beginPath();
    for (let i = 0; i <= 36; i += 1) {
      const t = i / 36;
      const angle = t * Math.PI * 2 * turns;
      const r = radius * t;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r * 0.62;
      if (i === 0) context2d.moveTo(px, py);
      else context2d.lineTo(px, py);
    }
    context2d.stroke();
  }

  function drawStreamers(context2d, width) {
    const colors = ["#ef5b63", "#ffbf47", "#46c7d9", "#7f59e8", "#2fb36d"];
    context2d.save();
    context2d.lineWidth = 5;
    for (let i = 0; i < 6; i += 1) {
      context2d.strokeStyle = colors[i % colors.length];
      context2d.beginPath();
      const startX = (width / 5) * i - 40;
      context2d.moveTo(startX, 0);
      for (let x = startX; x < startX + width * 0.32; x += 32) {
        context2d.quadraticCurveTo(x + 16, 24 + (i % 2) * 10, x + 32, 0);
      }
      context2d.stroke();
    }
    context2d.restore();
  }

  function drawLights(context2d, width, time) {
    const colors = ["#ffd35a", "#ef5b63", "#46c7d9", "#2fb36d", "#ff9fbd"];
    context2d.save();
    context2d.strokeStyle = "#29364e";
    context2d.lineWidth = 2;
    context2d.beginPath();
    context2d.moveTo(20, 54);
    context2d.quadraticCurveTo(width / 2, 96, width - 20, 54);
    context2d.stroke();
    for (let i = 0; i < 12; i += 1) {
      const t = i / 11;
      const x = 20 + (width - 40) * t;
      const y = 54 + Math.sin(t * Math.PI) * 34;
      context2d.fillStyle = colors[i % colors.length];
      context2d.globalAlpha = 0.72 + Math.sin(time * 0.006 + i) * 0.18;
      context2d.beginPath();
      context2d.ellipse(x, y + 11, 6, 10, 0, 0, Math.PI * 2);
      context2d.fill();
    }
    context2d.restore();
  }

  function drawBalloons(context2d, time) {
    for (const balloon of state.party.balloons) {
      if (balloon.popped > 0) {
        context2d.save();
        context2d.globalAlpha = Math.max(0, balloon.popped);
        drawSugarStar(context2d, balloon.x, balloon.y, balloon.size * (1.2 - balloon.popped * 0.3), balloon.color);
        context2d.restore();
        continue;
      }
      const x = balloon.x + Math.sin(balloon.sway + time * 0.001) * 12;
      const y = balloon.y;
      context2d.save();
      context2d.strokeStyle = "rgba(41,54,78,0.32)";
      context2d.lineWidth = 1.5;
      context2d.beginPath();
      context2d.moveTo(x, y + balloon.size);
      context2d.quadraticCurveTo(x + 14, y + balloon.size + 28, x - 3, y + balloon.size + 58);
      context2d.stroke();
      if (balloon.shape === "heart") drawSugarHeart(context2d, x, y, balloon.size, balloon.color);
      else if (balloon.shape === "star") drawSugarStar(context2d, x, y, balloon.size, balloon.color);
      else {
        context2d.fillStyle = balloon.color;
        context2d.strokeStyle = shade(balloon.color, -18);
        context2d.lineWidth = 2;
        context2d.beginPath();
        context2d.ellipse(x, y, balloon.size * 0.72, balloon.size, 0, 0, Math.PI * 2);
        context2d.fill();
        context2d.stroke();
        context2d.fillStyle = "rgba(255,255,255,0.55)";
        context2d.beginPath();
        context2d.ellipse(x - balloon.size * 0.22, y - balloon.size * 0.22, 5, 10, 0.4, 0, Math.PI * 2);
        context2d.fill();
      }
      context2d.restore();
    }
  }

  function drawConfetti(context2d) {
    for (const piece of state.party.confetti) {
      context2d.save();
      context2d.globalAlpha = Math.max(0, Math.min(1, piece.life));
      context2d.translate(piece.x, piece.y);
      context2d.rotate(piece.rotation);
      context2d.fillStyle = piece.color;
      if (piece.shape === "star") drawSugarStar(context2d, 0, 0, piece.size, piece.color);
      else if (piece.shape === "heart") drawSugarHeart(context2d, 0, 0, piece.size, piece.color);
      else if (piece.shape === "streamer") {
        context2d.strokeStyle = piece.color;
        context2d.lineWidth = 3;
        context2d.beginPath();
        context2d.moveTo(-piece.size, -piece.size);
        context2d.quadraticCurveTo(0, piece.size, piece.size, -piece.size);
        context2d.stroke();
      } else {
        context2d.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
      }
      context2d.restore();
    }
  }

  function drawSmoke(context2d) {
    context2d.save();
    for (const puff of state.party.smoke) {
      context2d.globalAlpha = Math.max(0, puff.life / 1.4) * 0.45;
      context2d.fillStyle = "#aeb5c1";
      context2d.beginPath();
      context2d.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
      context2d.fill();
    }
    context2d.restore();
  }

  function shade(hex, amount) {
    const raw = hex.replace("#", "");
    const num = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  }

  function seededUnit(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function createThumbnail(cake) {
    try {
      const thumb = document.createElement("canvas");
      thumb.width = 360;
      thumb.height = 250;
      const thumbCtx = thumb.getContext("2d");
      const previousLayout = state.layout;
      const previousHits = state.hits;
      state.layout = computeCakeLayout(360, 250, cake, { rotation: 0, zoom: 0.72 }, false);
      state.hits = [];
      thumbCtx.fillStyle = "#fff8f0";
      thumbCtx.fillRect(0, 0, 360, 250);
      drawTable(thumbCtx, 360, 250);
      drawCake(thumbCtx, cake, state.layout, performance.now(), false);
      state.layout = previousLayout;
      state.hits = previousHits;
      return thumb.toDataURL("image/png");
    } catch {
      return "";
    }
  }

  function pauseGame() {
    if (state.paused) return;
    state.paused = true;
    const overlayNode = root.querySelector("#cakeMakerOverlay");
    if (!overlayNode) return;
    overlayNode.classList.add("is-visible");
    overlayNode.innerHTML = "";
    const panel = element("div", "game-overlay-panel");
    const actions = element("div", "overlay-actions");
    actions.append(
      actionButton("Resume", "primary-action", resumeGame),
      actionButton("Save Cake", "", openSaveDialog),
      actionButton("Restart Cake", "", createCake),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(element("h2", "", "Paused"), element("p", "", "The cake is waiting."), actions);
    overlayNode.append(panel);
  }

  function resumeGame() {
    state.paused = false;
    const overlayNode = root.querySelector("#cakeMakerOverlay");
    if (overlayNode) {
      overlayNode.classList.remove("is-visible");
      overlayNode.innerHTML = "";
    }
  }

  function restartGame() {
    createCake();
  }

  function updateCakePreview() {
    draw();
  }

  async function saveResult(result = null) {
    if (saveResultPending) return;
    saveResultPending = true;
    if (result?.name) state.cake.name = result.name;
    await saveCake(state.cake.name || "My Cake");
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    teardownCanvasObserver();
    stopPartyMusic();
    window.removeEventListener("keydown", handleKeydown);
    root.innerHTML = "";
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    createCake,
    updateCakePreview,
    addDecoration,
    removeDecoration: removeSelected,
    saveCake,
    loadCake,
    startPartyMode,
    stopPartyMode,
  };
}
