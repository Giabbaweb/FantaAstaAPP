import type {
  ReactNode
} from "react";

import "./home.css";

type HomeIconProps = {
  children: ReactNode;
};

function HomeIcon({
  children
}: HomeIconProps) {
  return (
    <span
      className="home-action__icon"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        role="presentation"
      >
        {children}
      </svg>
    </span>
  );
}

function BookIcon() {
  return (
    <HomeIcon>
      <path
        d="M7 9.5c5-1.8 10.7-1 17 3v27c-6.3-4-12-4.8-17-3V9.5Z"
      />
      <path
        d="M41 9.5c-5-1.8-10.7-1-17 3v27c6.3-4 12-4.8 17-3V9.5Z"
      />
    </HomeIcon>
  );
}

function SetupIcon() {
  return (
    <HomeIcon>
      <circle cx="24" cy="24" r="7" />
      <path
        d="M24 5v6M24 37v6M5 24h6M37 24h6"
      />
      <path
        d="m10.6 10.6 4.3 4.3M33.1 33.1l4.3 4.3M37.4 10.6l-4.3 4.3M14.9 33.1l-4.3 4.3"
      />
      <circle cx="24" cy="24" r="15" />
    </HomeIcon>
  );
}

function GavelIcon() {
  return (
    <HomeIcon>
      <path
        d="m15 8 12 12M21 5l9 9-7 7-9-9 7-7ZM31 18l9 9-7 7-9-9 7-7Z"
      />
      <path
        d="M26 27 10 43M7 40l4 4"
      />
      <path
        d="M25 42h17"
      />
    </HomeIcon>
  );
}

function DisplayIcon() {
  return (
    <HomeIcon>
      <rect
        x="5"
        y="7"
        width="38"
        height="27"
        rx="2"
      />
      <path
        d="M19 41h10M24 34v7"
      />
    </HomeIcon>
  );
}

function QrIcon() {
  return (
    <HomeIcon>
      <rect x="6" y="6" width="13" height="13" />
      <rect x="29" y="6" width="13" height="13" />
      <rect x="6" y="29" width="13" height="13" />
      <rect x="10" y="10" width="5" height="5" />
      <rect x="33" y="10" width="5" height="5" />
      <rect x="10" y="33" width="5" height="5" />
      <path
        d="M27 27h6v6h-6zM35 27h7M35 31v11M27 35h5M27 40h8M40 36h2"
      />
    </HomeIcon>
  );
}

export function HomeApp() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <img
          className="home-logo"
          src="/branding/fantaastaapp-logo.png"
          alt="FantaAstaAPP"
        />

        <div className="home-title">
          <span>
            ASTA FANTACALCIO · TUTTO SOTTO
            CONTROLLO, IN LAN
          </span>

          <h1>FantaAstaAPP</h1>

          <p>
            Gestione locale dell'asta,
            telecomandi e schermo pubblico.
          </p>
        </div>
      </section>

      <section
        className="home-actions"
        aria-label="Navigazione principale"
      >
        <a
          className="home-action home-action--guide"
          href="/readme-first"
        >
          <BookIcon />

          <div className="home-action__content">
            <span className="home-action__eyebrow">
              GUIDA OPERATIVA
            </span>

            <strong>LEGGIMI</strong>

            <span>
              Avvio, connessioni, gestione asta,
              emergenze, export e chiusura.
            </span>
          </div>

        </a>

        <a
          className="home-action home-action--primary"
          href="/admin/config"
        >
          <SetupIcon />

          <div className="home-action__content">
            <span className="home-action__eyebrow">
              PREPARAZIONE
            </span>

            <strong>Setup asta</strong>

            <span>
              Configura lega, sessione,
              squadre e dati iniziali.
            </span>
          </div>

        </a>

        <a
          className="home-action"
          href="/admin"
        >
          <GavelIcon />

          <div className="home-action__content">
            <span className="home-action__eyebrow">
              OPERATIVITÀ
            </span>

            <strong>Cockpit asta</strong>

            <span>
              Avvia e gestisci la sessione
              dal posto del banditore.
            </span>
          </div>

        </a>

        <a
          className="home-action home-action--secondary-row"
          href="/public"
        >
          <DisplayIcon />

          <div className="home-action__content">
            <span className="home-action__eyebrow">
              PROIEZIONE
            </span>

            <strong>Schermo pubblico</strong>

            <span>
              Apri la visualizzazione per
              monitor e proiettore.
            </span>
          </div>

        </a>

        <a
          className="home-action home-action--secondary-row"
          href="/docs/QRcode.pdf"
          target="_blank"
          rel="noreferrer"
        >
          <QrIcon />

          <div className="home-action__content">
            <span className="home-action__eyebrow">
              ACCESSO PRESIDENTI
            </span>

            <strong>QR code squadre</strong>

            <span>
              Apri o stampa il documento
              con i codici delle 8 squadre.
            </span>
          </div>

        </a>
      </section>

      <footer className="home-footer">
        <span>Powered by</span>

        <img
          src="/branding/arti-john-logo.png"
          alt="ArtiJohn - l'artigiano informatico"
        />
      </footer>
    </main>
  );
}
