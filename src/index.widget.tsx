import { createRoot, Root } from "react-dom/client";
import App from "./App";
import "./index.css";

export interface SocketIOWidgetOptions {
  containerElementId: string;
}

declare global {
  interface Window {
    renderReactWidget: (config: string) => void;
    unmountReactWidget: (containerId: string) => void;
  }
}

const roots: Record<string, Root> = {};

window.renderReactWidget = (config: string) => {
  let options: SocketIOWidgetOptions;

  try {
    options = JSON.parse(config);
  } catch {
    console.error("Invalid widget config");
    return;
  }

  const container = document.getElementById(options.containerElementId);

  if (!container) {
    console.error(`Container '${options.containerElementId}' not found`);
    return;
  }

  if (roots[options.containerElementId]) {
    roots[options.containerElementId].unmount();
  }

  const root = createRoot(container);

  root.render(<App />);

  roots[options.containerElementId] = root;
};

window.unmountReactWidget = (containerId: string) => {
  roots[containerId]?.unmount();
  delete roots[containerId];
};