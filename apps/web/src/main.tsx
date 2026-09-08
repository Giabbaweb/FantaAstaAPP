import React from "react";
import ReactDOM from "react-dom/client";

import {
  AdminApp
} from "./admin/AdminApp.js";
import {
  AdminConfigApp
} from "./admin/AdminConfigApp.js";
import {
  PublicDisplay
} from "./public/PublicDisplay.js";
import {
  RemoteApp
} from "./remote/RemoteApp.js";
import {
  RemoteAllApp
} from "./remote/RemoteAllApp.js";
import {
  HomeApp
} from "./home/HomeApp.js";
import {
  ReadmeFirst
} from "./home/ReadmeFirst.js";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Elemento root non trovato"
  );
}

const rawPathname =
  window.location.pathname;

const pathname =
  rawPathname.length > 1
    ? rawPathname.replace(/\/+$/, "")
    : rawPathname;

const app =
  pathname === "/"
    ? <HomeApp />
    : pathname === "/readme-first"
      ? <ReadmeFirst />
      : pathname === "/public"
      ? <PublicDisplay />
    : pathname === "/admin/config"
      ? <AdminConfigApp />
      : pathname === "/admin"
        ? <AdminApp />
        : pathname === "/remote/all"
        ? <RemoteAllApp />
        : pathname === "/remote"
          ? <RemoteApp />
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
