import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import { installGlobalErrorMonitoring } from "./lib/errorMonitoring";
import { registerServiceWorker } from "./lib/pwa";

installGlobalErrorMonitoring();
registerServiceWorker();

const basename = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
