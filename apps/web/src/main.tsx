import React from "react";
import ReactDOM from "react-dom/client";

import {
  PublicDisplay
} from "./public/PublicDisplay.js";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Elemento root non trovato"
  );
}

const pathname =
  window.location.pathname;

const app =
  pathname === "/public"
    ? <PublicDisplay />
    : (
        <main>
          <h1>FantaAstaAPP</h1>
          <p>
            Frontend in inizializzazione.
          </p>
        </main>
      );

ReactDOM.createRoot(
  rootElement
).render(
  <React.StrictMode>
    {app}
  </React.StrictMode>
);
