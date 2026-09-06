import "./readme-first.css";

export function ReadmeFirst() {
  function printPage() {
    window.print();
  }

  return (
    <main className="readme-page">
      <header className="readme-header">
        <div className="readme-header__brand">
          <img
            src="/branding/fantaastaapp-logo.png"
            alt="FantaAstaAPP"
          />

          <div>
            <span>GUIDA OPERATIVA</span>
            <h1>LEGGIMI</h1>
            <p>
              Dall'accensione della macchina
              alla chiusura dell'asta.
            </p>
          </div>
        </div>

        <div className="readme-header__actions">
          <a
            className="readme-button"
            href="/"
          >
            ← Home
          </a>

          <button
            className="readme-button readme-button--primary"
            type="button"
            onClick={printPage}
          >
            Stampa
          </button>
        </div>
      </header>

      <section className="readme-alert">
        <strong>Regola numero uno</strong>
        <p>
          FantaAstaAPP lavora in rete locale.
          Durante l'asta non è necessaria una
          connessione Internet: PC, smartphone,
          tablet, monitor e proiettore devono
          semplicemente essere collegati alla
          stessa LAN.
        </p>
      </section>

      <nav className="readme-index">
        <strong>Indice rapido</strong>

        <div>
          <a href="#prima">1. Prima di iniziare</a>
          <a href="#avvio">2. Avvio applicazione</a>
          <a href="#rete">3. Rete e dispositivi</a>
          <a href="#setup">4. Setup asta</a>
          <a href="#ready">5. Da READY all'asta</a>
          <a href="#asta">6. Durante l'asta</a>
          <a href="#sospensione">7. Sospensione</a>
          <a href="#straordinarie">8. Operazioni straordinarie</a>
          <a href="#backup">9. Backup e ripristino</a>
          <a href="#chiusura">10. Fine asta ed export</a>
          <a href="#emergenza">11. Checklist emergenza</a>
        </div>
      </nav>

      <div className="readme-content">
        <section
          id="prima"
          className="readme-section"
        >
          <span className="readme-section__number">
            01
          </span>

          <div>
            <h2>Prima di iniziare</h2>

            <ul>
              <li>
                PC principale alimentato e collegato
                via Ethernet al router della LAN.
              </li>
              <li>
                Router acceso e Wi-Fi disponibile.
              </li>
              <li>
                iPad/tablet del banditore pronto.
              </li>
              <li>
                Smartphone dei Presidenti disponibili.
              </li>
              <li>
                Monitor e/o proiettore collegati.
              </li>
              <li>
                Archivio giocatori e rose iniziali
                già disponibili per l'import.
              </li>
              <li>
                PDF con i QR code delle squadre
                disponibile anche in forma stampata.
              </li>
            </ul>

            <p className="readme-note">
              Consigliato: alimentatori collegati,
              niente risparmio energetico aggressivo
              e nessun riavvio automatico durante
              la sessione.
            </p>
          </div>
        </section>

        <section
          id="avvio"
          className="readme-section"
        >
          <span className="readme-section__number">
            02
          </span>

          <div>
            <h2>Avvio applicazione</h2>

            <p>
              Avvia server e frontend FantaAstaAPP
              sul PC principale.
            </p>

            <div className="readme-command">
              <code>
                pnpm --filter @fantaastaapp/server dev
              </code>
            </div>

            <div className="readme-command">
              <code>
                pnpm --filter @fantaastaapp/web dev
              </code>
            </div>

            <p>
              Apri poi sul PC:
            </p>

            <div className="readme-address">
              http://localhost:5173/
            </div>

            <p>
              La Landing Page permette di raggiungere
              direttamente LEGGIMI, Setup asta,
              Cockpit, Schermo pubblico e PDF QR.
            </p>
          </div>
        </section>

        <section
          id="rete"
          className="readme-section"
        >
          <span className="readme-section__number">
            03
          </span>

          <div>
            <h2>Rete e dispositivi</h2>

            <h3>PC principale</h3>

            <ul>
              <li>
                Collegalo preferibilmente via Ethernet.
              </li>
              <li>
                In Windows imposta la rete locale
                come <strong>Privata</strong>.
              </li>
              <li>
                Norton può rimanere attivo.
              </li>
            </ul>

            <h3>Indirizzo LAN</h3>

            <p>
              Non utilizzare un indirizzo IP scritto
              a mano se non necessario. In
              <strong> Setup asta → Accesso telecomandi</strong>
              usa il pulsante
              <strong> Rileva indirizzo LAN</strong>.
            </p>

            <h3>Smartphone e tablet</h3>

            <ul>
              <li>
                Collegali tutti al Wi-Fi del router
                utilizzato per l'asta.
              </li>
              <li>
                I telecomandi entrano tramite QR code.
              </li>
              <li>
                Verifica che ogni telecomando mostri
                <strong> ONLINE</strong>.
              </li>
            </ul>

            <h3>Schermo pubblico</h3>

            <p>
              Apri <strong>/public</strong> sul
              dispositivo destinato al monitor o al
              proiettore.
            </p>
          </div>
        </section>

        <section
          id="setup"
          className="readme-section"
        >
          <span className="readme-section__number">
            04
          </span>

          <div>
            <h2>Setup asta</h2>

            <p>
              Apri <strong>/admin/config</strong> e
              completa la configurazione prima
              dell'avvio.
            </p>

            <ol>
              <li>
                Seleziona o configura la Lega.
              </li>
              <li>
                Controlla stagione, edizione,
                crediti e limiti della sessione.
              </li>
              <li>
                Verifica le squadre partecipanti.
              </li>
              <li>
                Controlla Presidenti e associazioni.
              </li>
              <li>
                Verifica l'ordine del girotavolo.
              </li>
              <li>
                Controlla i PIN dei telecomandi.
              </li>
              <li>
                Rileva e salva l'indirizzo LAN.
              </li>
              <li>
                Importa l'archivio giocatori.
              </li>
              <li>
                Importa le rose iniziali/confermati.
              </li>
              <li>
                Verifica la checklist di prontezza.
              </li>
            </ol>

            <p className="readme-note">
              Una sessione non deve essere avviata
              finché la configurazione non risulta
              completa e coerente.
            </p>
          </div>
        </section>

        <section
          id="ready"
          className="readme-section"
        >
          <span className="readme-section__number">
            05
          </span>

          <div>
            <h2>Da READY all'asta</h2>

            <ul>
              <li>
                Apri il Cockpit su
                <strong> /admin</strong>.
              </li>
              <li>
                Apri lo Schermo pubblico.
              </li>
              <li>
                Collega i telecomandi tramite QR.
              </li>
              <li>
                Controlla che i dispositivi risultino
                online.
              </li>
              <li>
                Avvia la sessione soltanto quando
                tutto è pronto.
              </li>
            </ul>

            <p>
              Dopo START la sessione passa a
              <strong> RUNNING</strong> e il sistema
              indica automaticamente la squadra che
              deve effettuare la chiamata.
            </p>
          </div>
        </section>

        <section
          id="asta"
          className="readme-section"
        >
          <span className="readme-section__number">
            06
          </span>

          <div>
            <h2>Durante l'asta</h2>

            <ol>
              <li>
                Il Cockpit indica chi deve chiamare.
              </li>
              <li>
                Seleziona il giocatore.
              </li>
              <li>
                Apri la chiamata con l'offerta iniziale.
              </li>
              <li>
                I telecomandi effettuano rilanci o PASS.
              </li>
              <li>
                Il sistema aggiorna leader, turno,
                crediti e massimo rilancio.
              </li>
              <li>
                Quando resta il vincitore, la chiamata
                passa all'aggiudicazione provvisoria.
              </li>
              <li>
                Il banditore conferma sempre
                l'aggiudicazione definitiva.
              </li>
            </ol>

            <p>
              Dopo la conferma vengono aggiornati
              automaticamente rosa, crediti,
              Schermo pubblico e telecomandi.
            </p>
          </div>
        </section>

        <section
          id="sospensione"
          className="readme-section"
        >
          <span className="readme-section__number">
            07
          </span>

          <div>
            <h2>Sospensione della sessione</h2>

            <p>
              Usa <strong>Sospendi asta</strong> per
              pause organizzative, problemi tecnici,
              problemi di rete o altre interruzioni.
            </p>

            <ul>
              <li>
                La situazione dell'asta viene congelata.
              </li>
              <li>
                I telecomandi passano in sola lettura.
              </li>
              <li>
                Lo stato della chiamata viene preservato.
              </li>
              <li>
                Viene creato un recovery point.
              </li>
              <li>
                La ripresa è sempre manuale.
              </li>
            </ul>

            <p className="readme-note">
              Non tentare correzioni amministrative
              mentre la sessione è RUNNING:
              sospendere prima la sessione.
            </p>
          </div>
        </section>

        <section
          id="straordinarie"
          className="readme-section"
        >
          <span className="readme-section__number">
            08
          </span>

          <div>
            <h2>Operazioni straordinarie</h2>

            <p>
              Nel Cockpit <strong>/admin</strong> sono
              disponibili tre strumenti straordinari,
              ciascuno destinato a una situazione
              operativa precisa.
            </p>

            <h3>Telecomando universale — SALVASERATA</h3>

            <p>
              È il controllo di emergenza del banditore
              da utilizzare quando uno o più telecomandi
              dei Presidenti non sono utilizzabili.
              Si apre dal pulsante
              <strong> Telecomando universale</strong>
              presente nelle Operazioni straordinarie
              del Cockpit.
            </p>

            <ul>
              <li>
                Funziona durante una normale chiamata
                con sessione <strong>RUNNING</strong>.
              </li>
              <li>
                Mostra contemporaneamente le otto
                squadre nell'ordine del girotavolo.
              </li>
              <li>
                Evidenzia leader, squadre che hanno
                passato e squadra a cui tocca.
              </li>
              <li>
                Il banditore può inserire l'importo
                e premere <strong>RILANCIA</strong>,
                oppure premere <strong>PASS</strong>,
                per conto della squadra di turno.
              </li>
              <li>
                Rilancio e PASS utilizzano lo stesso
                motore d'asta dei telecomandi normali.
              </li>
              <li>
                Terminata l'emergenza, torna al
                Cockpit e prosegui normalmente.
              </li>
            </ul>

            <p className="readme-warning">
              <strong>Telecomando guasto ≠ asta da sospendere.</strong>
              Se il problema riguarda soltanto uno o
              più telecomandi e la chiamata è regolarmente
              in corso, usa il Telecomando universale.
            </p>

            <h3>Assegnazione manuale</h3>

            <p>
              Da utilizzare quando è necessario
              saltare il normale giro di rilanci/PASS
              e assegnare direttamente un giocatore.
            </p>

            <p>
              Specificare giocatore, squadra,
              costo e motivazione. Restano comunque
              validi i controlli su crediti, rosa,
              ruolo e unicità del giocatore.
            </p>

            <p className="readme-note">
              Non è un sostituto del Telecomando
              universale: serve per un'assegnazione
              diretta eccezionale, non per continuare
              una normale chiamata.
            </p>

            <h3>Correzione amministrativa</h3>

            <p>
              Da utilizzare per correggere una
              assegnazione già effettuata durante
              la sessione. La motivazione deve
              sempre essere registrata.
            </p>

            <p className="readme-note">
              Assegnazione manuale e Correzione
              amministrativa non si eseguono durante
              il normale flusso RUNNING: quando
              necessario, sospendi prima la sessione.
            </p>
          </div>
        </section>

        <section
          id="backup"
          className="readme-section"
        >
          <span className="readme-section__number">
            09
          </span>

          <div>
            <h2>Backup e ripristino</h2>

            <p>
              I recovery point vengono creati
              automaticamente durante le operazioni
              critiche. È inoltre possibile creare
              un backup manuale.
            </p>

            <h3>Prima di un restore</h3>

            <ul>
              <li>
                Sospendi la sessione.
              </li>
              <li>
                Seleziona con attenzione il recovery
                point corretto.
              </li>
              <li>
                Conferma il ripristino.
              </li>
              <li>
                Il sistema crea prima un backup
                PRE-RESTORE.
              </li>
              <li>
                Dopo il restore segui l'indicazione
                di riavvio dell'applicazione.
              </li>
              <li>
                Verifica sempre stato sessione,
                ultima aggiudicazione e rose.
              </li>
            </ul>

            <p className="readme-warning">
              Non cancellare backup durante una
              sessione reale salvo necessità
              eccezionale.
            </p>
          </div>
        </section>

        <section
          id="chiusura"
          className="readme-section"
        >
          <span className="readme-section__number">
            10
          </span>

          <div>
            <h2>Fine asta ed export</h2>

            <ol>
              <li>
                Verifica che tutte le rose siano complete.
              </li>
              <li>
                Termina la sessione dal Cockpit.
              </li>
              <li>
                Controlla i dati finali delle squadre.
              </li>
              <li>
                Se previsto, seleziona il terzo
                portiere export-only.
              </li>
              <li>
                Genera l'export FMS finale.
              </li>
              <li>
                Conserva export e backup della serata.
              </li>
              <li>
                Chiudi definitivamente la sessione
                soltanto dopo i controlli.
              </li>
            </ol>

            <p className="readme-note">
              Il terzo portiere export-only non
              appartiene alla rosa ordinaria,
              non modifica i crediti e viene
              esportato a costo 0.
            </p>
          </div>
        </section>

        <section
          id="emergenza"
          className="readme-section readme-section--emergency"
        >
          <span className="readme-section__number">
            SOS
          </span>

          <div>
            <h2>Checklist emergenza</h2>

            <h3>Un telecomando non risponde</h3>

            <ol>
              <li>
                Non sospendere automaticamente l'asta.
              </li>
              <li>
                Dal Cockpit apri
                <strong> Telecomando universale</strong>.
              </li>
              <li>
                Verifica quale squadra è di turno.
              </li>
              <li>
                Esegui dal Telecomando universale
                il <strong>RILANCIA</strong> oppure
                il <strong>PASS</strong> richiesto
                dal Presidente.
              </li>
              <li>
                Nel frattempo controlla il Wi-Fi,
                ricarica la pagina del telefono
                oppure riapri il QR della squadra.
              </li>
              <li>
                Quando il telecomando torna operativo,
                torna al Cockpit e continua normalmente.
              </li>
            </ol>

            <p className="readme-note">
              Il Telecomando universale può sostituire
              anche più telecomandi durante la stessa
              chiamata: il banditore agisce sempre
              soltanto per la squadra a cui tocca.
            </p>

            <h3>La rete ha problemi</h3>

            <ol>
              <li>Sospendi l'asta.</li>
              <li>Non continuare con rilanci manuali.</li>
              <li>Controlla router e collegamenti.</li>
              <li>Verifica l'indirizzo LAN del PC.</li>
              <li>Ricollega i dispositivi.</li>
              <li>Riprendi soltanto dopo il controllo.</li>
            </ol>

            <h3>Il PC o il server si riavvia</h3>

            <ol>
              <li>Riavvia FantaAstaAPP.</li>
              <li>
                La sessione deve rientrare in stato
                di sicurezza SUSPENDED.
              </li>
              <li>
                Verifica la situazione ricostruita.
              </li>
              <li>
                Riprendi manualmente solo dopo
                aver controllato tutto.
              </li>
            </ol>

            <h3>Errore grave sui dati</h3>

            <ol>
              <li>Sospendi immediatamente.</li>
              <li>Non effettuare nuove aggiudicazioni.</li>
              <li>Controlla i recovery point.</li>
              <li>
                Esegui restore solo se realmente
                necessario.
              </li>
            </ol>
          </div>
        </section>
      </div>

      <footer className="readme-footer">
        <span>FantaAstaAPP</span>
        <span>•</span>
        <span>Guida operativa locale</span>
        <span>•</span>
        <span>ArtiJohn</span>
      </footer>
    </main>
  );
}
