import React from "react";
import ReactDOM from "react-dom/client";

const App = (): React.JSX.Element => {
  return (
    <main>
      <h1>FantaAstaAPP</h1>
      <p>Frontend in inizializzazione.</p>
    </main>
  );
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento root non trovato");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
