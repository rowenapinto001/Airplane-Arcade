export function createElement(tag, className, text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function clearNode(node) {
  node.replaceChildren();
}

export function extensionUrl(path) {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `../${path}`;
}

export function openArcade(route = "") {
  const url = extensionUrl(`arcade/index.html${route}`);
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, "_blank", "noopener");
  }
}

export function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = String(safe % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function setPressed(buttons, activeValue) {
  for (const button of buttons) {
    const active = button.dataset.value === activeValue;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

export function announce(node, text) {
  node.textContent = "";
  requestAnimationFrame(() => {
    node.textContent = text;
  });
}
