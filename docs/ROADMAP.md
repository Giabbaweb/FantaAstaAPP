# Roadmap di sviluppo

Questo documento descrive la roadmap tecnica corrente di **FantaAstaAPP**.

La roadmap nasce dalla specifica funzionale approvata e dalla roadmap di implementazione iniziale, ma viene aggiornata per riflettere lo stato reale del repository e l’ordine effettivo delle milestone.

---

## Stato corrente

Versione attuale:

```text
v0.11.0
```

Milestone completate:

- fondazioni del monorepo;
- backend Fastify;
- frontend React e Vite;
- TypeScript;
- SQLite;
- Drizzle ORM;
- migrazioni;
- endpoint di health check;
- endpoint di database health;
- logging;
- testing;
- repository Git;
- documentazione iniziale del progetto;
- gestione delle leghe;
- gestione delle sessioni d'asta;
- API CRUD delle sessioni;
- ciclo di vita delle sessioni;
- contratti condivisi;
- validazione di dominio;
- test di integrazione;
- gestione delle squadre;
- gestione dei presidenti;
- associazione squadre-sessioni d'asta;
- repository per la configurazione della lega;
- service per la configurazione della lega;
- API CRUD per squadre, presidenti e associazioni.
- gestione dei giocatori;
- gestione delle rose iniziali;
- parser FMS ReVo per archivio giocatori;
- parser FMS ReVo per rose iniziali;
- importazione archivio giocatori;
- pianificazione dell'importazione delle rose;
- importazione transazionale delle rose iniziali;
- modello di dominio delle chiamate d'asta;
- calcolo del massimo rilancio sostenibile;
- apertura e gestione delle chiamate;
- rilanci, PASS e annullamento del PASS;
- aggiudicazione provvisoria;
- conferma e annullamento delle chiamate;
- persistenza SQLite delle chiamate d'asta;
- repository, service e API del motore d'asta;
- test di dominio e integrazione HTTP del motore d'asta;
- bootstrap Socket.IO;
- connessioni e registrazione dei dispositivi;
- autenticazione delle squadre tramite PIN;
- ruoli realtime `OPERATOR` e `OBSERVER`;
- una sola postazione operativa per squadra;
- stanze realtime per sessione, squadra e ruolo;
- publisher e dispatcher realtime;
- snapshot autorevole alla registrazione;
- sincronizzazione di eventi e snapshot dopo i comandi;
- versione autoritativa dello stato tramite `stateVersion`;
- registro persistente dei comandi;
- idempotenza tramite `commandId`;
- rifiuto dei comandi obsoleti tramite `STALE_STATE`;
- esecuzione atomica dei comandi;
- protocollo realtime `auction:command`;
- comandi telecomando `BID`, `PASS` e `UNDO_PASS`;
- autorizzazione dei telecomandi per squadra e sessione;
- observer in sola lettura;
- conferma definitiva atomica delle aggiudicazioni;
- aggiornamento atomico di crediti, rosa e disponibilità giocatore;
- audit trail persistente tramite `auction_events`;
- evento `AUCTION_AWARD_CONFIRMED`;
- rollback completo dell'assegnazione e dell'audit;
- boundary post-commit per il futuro backup;
- connessione realtime `PUBLIC_DISPLAY` read-only di sessione;
- projection Public Display autorevole nello snapshot realtime;
- branding FantaAstaAPP e lega nello schermo pubblico;
- vista auction fullscreen con giocatore, prezzo, leader e turno;
- ultime aggiudicazioni confermate con scroll interno;
- crediti residui, massima offerta e composizione P/D/C/A per tutte le squadre;
- stati `PASSED` ed `EXCLUDED` con overlay e motivazione;
- stati visuali della sessione e banner `SUSPENDED`;
- modalità `STANDARD`, `HIGH_CONTRAST_OUTDOOR`, `COMPACT` e `DARK`;
- foglione elettronico delle rose con slot liberi;
- autorità amministrativa per `ADMINISTRATOR` e `AUCTIONEER`;
- assegnazioni manuali delle rose iniziali;
- assegnazioni manuali alle rose;
- correzioni tecniche di squadra, giocatore, costo e anno contrattuale;
- motivazione e identità dell'operatore nelle operazioni amministrative;
- audit persistente delle assegnazioni e delle correzioni;
- esecuzione atomica e idempotente dei comandi amministrativi;
- rispetto di crediti, slot, limiti di ruolo, dimensione rosa e sostenibilità economica;
- divieto delle correzioni tecniche durante `RUNNING`;
- protezione delle sessioni `CLOSED`;
- riapertura amministrativa controllata `CLOSED -> COMPLETED`;
- comando atomico e idempotente `REOPEN_SESSION`;
- evento persistente `SESSION_REOPENED`;
- evento realtime `SESSION_REOPENED`;
- 52 file di test server verdi;
- 364 test server verdi;
- 12 file di test domain verdi;
- 135 test domain verdi;
- typecheck e build completi del monorepo superati.

Prossima milestone:

```text
v0.12.0 — Import/export FMS
```

---

# v0.1.0 — Fondazioni

**Stato:** `COMPLETED`

## Obiettivi

- creare la struttura iniziale del repository;
- configurare TypeScript;
- configurare il monorepo pnpm;
- creare il backend Fastify;
- creare il frontend React e Vite;
- configurare SQLite;
- configurare Drizzle ORM;
- introdurre logging e test;
- creare la pagina amministrativa minima.

## Deliverable

- `apps/server`;
- `apps/web`;
- `packages/contracts`;
- `packages/domain`;
- configurazione TypeScript condivisa;
- script root;
- endpoint `/api/health`;
- database locale;
- prima migrazione;
- pagina `/admin`;
- Pino;
- Vitest.

## Criteri di completamento

- ambiente avviabile con un solo comando;
- build funzionante;
- type checking funzionante;
- almeno un test automatico;
- endpoint health disponibile;
- frontend raggiungibile;
- database inizializzabile.

---

# v0.2.0 — Persistenza e consolidamento

**Stato:** `COMPLETED`

## Obiettivi

- consolidare il monorepo;
- completare la persistenza iniziale;
- verificare le migrazioni;
- aggiungere il controllo di salute del database;
- predisporre il repository GitHub;
- formalizzare la documentazione di progetto.

## Deliverable

- SQLite operativo;
- Drizzle ORM operativo;
- migrazioni applicabili;
- endpoint `/api/db-health`;
- schema iniziale;
- branch `main` e `develop`;
- tag `v0.2.0`;
- README;
- CHANGELOG;
- LICENSE;
- CONTRIBUTING;
- documentazione architetturale.

## Stato del database

Tabelle iniziali:

- `auction_sessions`;
- `owners`;
- `teams`;
- `team_owners`.

---

# v0.3.0 — Gestione delle Sessioni d’Asta

**Stato:** `COMPLETED`

Questa milestone introduce la prima funzionalità applicativa completa.

## Obiettivi

- introdurre l'entità League;
- implementare la persistenza delle sessioni d'asta;
- definire il ciclo di vita delle sessioni;
- implementare le regole di transizione;
- creare repository e service dedicati;
- esporre API REST complete;
- condividere contratti e validazioni tramite Zod;
- introdurre test di integrazione completi.

## Stati previsti

```text
SETUP
READY
RUNNING
SUSPENDED
COMPLETED
CLOSED
```

## Backend

- entità `League`;
- modulo `auction-sessions`;
- repository SQLite;
- application service;
- route Fastify;
- contratti condivisi;
- validazioni Zod;
- regole di dominio;
- mapping degli errori;
- test di integrazione.

## API previste

```text
GET    /api/auction-sessions
GET    /api/auction-sessions/:id
POST   /api/auction-sessions
PATCH  /api/auction-sessions/:id
PATCH  /api/auction-sessions/:id/status
DELETE /api/auction-sessions/:id
```

## Frontend

La gestione amministrativa delle sessioni verrà sviluppata nella milestone successiva.

La Milestone 3 conclude esclusivamente l'infrastruttura backend, i contratti condivisi e le API.

## Regole principali

- solo le transizioni ammesse possono essere eseguite;
- una sessione `CLOSED` non può essere riaperta;
- una sessione `SUSPENDED` riprende solo manualmente;
- una sessione `RUNNING` non può essere modificata liberamente;
- ogni transizione deve essere validata lato server.

## Criteri di completamento

- CRUD delle sessioni operativo;
- ciclo di vita completo implementato;
- validazioni di dominio operative;
- contratti condivisi pubblicati;
- API REST funzionanti;
- gestione coerente degli errori;
- test di integrazione completi;
- build, typecheck e test superati;
- documentazione aggiornata.

---

# v0.4.0 — Configurazione della lega

**Stato:** `COMPLETED`

## Obiettivi

- gestione delle squadre;
- gestione dei presidenti;
- associazione presidenti-squadre;
- configurazione dei crediti;
- configurazione dei limiti di rosa;
- configurazione colori e abbreviazioni;
- gestione PIN;
- validazione della configurazione.

## Funzionalità previste

- creazione e modifica squadre;
- gestione co-presidenti;
- definizione del presidente principale;
- crediti iniziali configurabili;
- vincoli di ruolo;
- controlli di completezza della configurazione;
- blocco dell’avvio se la configurazione è incompleta.

---

# v0.5.0 — Giocatori, import e rose iniziali

**Stato:** `COMPLETED`

## Obiettivi

- importare la lista giocatori;
- gestire i codici FMS;
- gestire ruoli e disponibilità;
- importare le rose già confermate;
- registrare costi e anni di contratto;
- preparare la base dati dell’asta.

## Funzionalità previste

- parser di file TAB-separated;
- validazione degli input;
- anteprima import;
- gestione errori riga per riga;
- persistenza dei giocatori;
- rose iniziali;
- giocatori rinnovati;
- report di importazione.

---

# v0.6.0 — Motore d’asta

**Stato:** `COMPLETED`

Questa milestone ha introdotto il cuore logico e applicativo dell’asta.

## Obiettivi

- apertura della chiamata;
- gestione del giro di tavolo;
- rilanci;
- PASS;
- undo PASS;
- massimo sostenibile;
- esclusioni;
- assegnazione provvisoria.

## Stati della chiamata

```text
DRAFT
OPEN
PROVISIONAL_AWARD
SUSPENDED
CONFIRMED
CANCELLED
ROLLED_BACK
```

## Regole principali

- il chiamante effettua la prima offerta;
- l’offerta iniziale non può essere zero;
- nessun rilancio contro se stessi;
- una squadra in PASS non può rilanciare;
- il chiamante può fare PASS solo dopo almeno un rilancio avversario;
- quando il giro torna al leader si entra in `PROVISIONAL_AWARD`;
- l’assegnazione non è ancora definitiva.

## Implementazione completata

- aggregate `AuctionCall`;
- entità `AuctionCallTeam`;
- macchina a stati della chiamata;
- calcolo del massimo rilancio sostenibile;
- apertura della chiamata;
- gestione dei rilanci;
- gestione di PASS e annullamento del PASS;
- esclusione automatica delle squadre non più abilitate;
- aggiudicazione provvisoria;
- conferma e annullamento della chiamata;
- persistenza SQLite dell’aggregate;
- repository e application service;
- mapping coerente degli errori HTTP;
- API di lettura e comando;
- fixture condivise per i test di integrazione.

## Persistenza

Sono state introdotte le tabelle:

- `auction_calls`;
- `auction_call_teams`.

La migrazione Drizzle include chiavi esterne, vincoli sulle offerte
e unicità della partecipazione di una squadra alla chiamata.

## API

Sono disponibili:

- `GET /api/auction-calls/:id`;
- `GET /api/auction-sessions/:auctionSessionId/auction-call`;
- `POST /api/auction-calls/:id/commands/:command`.

Comandi HTTP supportati:

- `open`;
- `bid`;
- `pass`;
- `undo-pass`;
- `confirm`;
- `cancel`.

## Criteri di completamento

- motore di dominio indipendente dalla UI;
- transizioni di stato testate;
- massimo sostenibile verificato;
- gestione completa di rilanci e PASS;
- persistenza atomica dell’aggregate;
- API di lettura e comando operative;
- errori HTTP coerenti;
- migrazione database disponibile;
- typecheck e build superati;
- 63 test server superati;
- documentazione aggiornata.

---

# v0.7.0 — Telecomandi realtime

**Stato:** `COMPLETED`

## Obiettivi

- introdurre Socket.IO;
- collegare i dispositivi delle squadre;
- distinguere operatori e osservatori;
- sincronizzare lo stato;
- inviare rilanci e PASS.

## Funzionalità previste

- login squadra;
- autenticazione tramite PIN;
- registrazione dispositivo;
- ruolo `OPERATOR`;
- ruolo `OBSERVER`;
- una sola postazione operativa per squadra;
- riconnessione;
- risincronizzazione;
- gestione dei comandi obsoleti;
- conferma del PASS.

## Implementazione completata

- Socket.IO integrato con Fastify;
- registrazione e identità dei dispositivi;
- autenticazione tramite PIN;
- ruoli `OPERATOR` e `OBSERVER`;
- una sola postazione `OPERATOR` per squadra;
- stanze per sessione, squadra e ruolo;
- snapshot autorevole inviato dopo la registrazione;
- publisher di eventi e snapshot;
- protocollo `auction:command`;
- comandi remoti `BID`, `PASS` e `UNDO_PASS`;
- autorizzazione per squadra e sessione;
- observer in sola lettura;
- `commandId` e `stateVersion`;
- command registry persistente;
- controllo ottimistico della concorrenza;
- retry idempotenti;
- transazioni atomiche con rollback;
- nessun PASS automatico alla disconnessione;
- errori HTTP e Socket.IO coerenti;
- 187 test server superati.

## Criteri di completamento

- stato aggiornato in tempo reale;
- comandi validati lato server;
- dispositivi observer in sola lettura;
- riconnessione basata su nuova registrazione e snapshot autorevole;
- nessuna equivalenza tra disconnessione e PASS;
- comandi duplicati non applicati due volte;
- comandi obsoleti rifiutati;
- persistenza atomica verificata;
- typecheck e build superati;
- documentazione aggiornata.

---

# v0.8.0 — Conferma assegnazioni e transazioni

**Stato:** `COMPLETED`

## Obiettivi

- confermare definitivamente le assegnazioni;
- aggiornare crediti e rosa;
- registrare un audit trail persistente;
- garantire atomicità e rollback completo;
- predisporre il punto post-commit per il futuro backup.

## Operazione transazionale

La conferma comprende:

1. verifica dello stato;
2. verifica del vincitore provvisorio;
3. verifica della disponibilità del giocatore;
4. verifica dei crediti;
5. verifica degli slot e dei limiti per ruolo;
6. verifica della completabilità della rosa;
7. creazione della voce di rosa;
8. aggiornamento dei crediti residui;
9. aggiornamento del giocatore a `ROSTERED`;
10. chiusura della chiamata;
11. registrazione dell'evento di audit;
12. incremento di `stateVersion`;
13. registrazione del comando nel `command_registry`;
14. commit atomico.

Dopo il commit:

1. viene pubblicato l'evento realtime;
2. viene pubblicato lo snapshot autorevole;
3. viene invocato il boundary applicativo per la richiesta di backup.

Il sottosistema completo di backup e recovery non appartiene alla
v0.8.0 e rimane previsto dalla v0.13.0.

## Implementazione completata

- validazione di dominio dell'aggiudicazione definitiva;
- repository transazionali per player, partecipazione della squadra e rosa;
- servizio transazionale per l'assegnazione confermata;
- aggiornamento atomico di rosa, crediti e disponibilità del giocatore;
- errori della conferma mappati nel protocollo HTTP;
- tabella persistente `auction_events`;
- repository transazionale degli eventi d'asta;
- evento di audit `AUCTION_AWARD_CONFIRMED`;
- separazione tra audit di dominio e `command_registry`;
- audit incluso nella stessa transazione dell'assegnazione;
- nessun evento di audit persistito dopo rollback;
- evento realtime e snapshot pubblicati esclusivamente dopo commit;
- boundary post-commit `AuctionBackupRequester`;
- implementazione `NoopAuctionBackupRequester` per la v0.8.0;
- nessuna richiesta di backup duplicata sui replay idempotenti;
- fallimento della richiesta di backup isolato dal comando già committato;
- 31 file di test server superati;
- 217 test server superati;
- 10 file di test domain superati;
- 86 test domain superati;
- typecheck completo del monorepo superato;
- build completa del monorepo superata.

## Criteri di completamento

- nessuna assegnazione parziale;
- rollback completo in caso di errore;
- giocatore assegnato a una sola squadra;
- crediti mai negativi;
- rosa sempre completabile;
- audit trail persistente aggiornato atomicamente;
- nessun audit residuo dopo rollback;
- nessun effetto post-commit duplicato sui replay idempotenti;
- punto applicativo per il futuro backup disponibile;
- typecheck, test e build completi superati.

---

# v0.9.0 — Schermo pubblico

**Stato:** `COMPLETED`

## Obiettivi completati

- visualizzazione realtime read-only dello stato dell’asta su schermo condiviso;
- projection Public Display autorevole derivata dallo snapshot server;
- visualizzazione delle informazioni principali di tutte le squadre;
- supporto all’utilizzo in ambiente esterno;
- branding FantaAstaAPP e lega;
- foglione elettronico delle rose.

## Modalità implementate

```text
STANDARD
HIGH_CONTRAST_OUTDOOR
COMPACT
DARK
```

## Informazioni visualizzate

- giocatore chiamato;
- ruolo e squadra reale del giocatore;
- foto giocatore, quando disponibile;
- prezzo corrente;
- squadra leader;
- turno;
- squadre in PASS;
- squadre escluse e relativo motivo;
- crediti residui;
- massima offerta;
- posti liberi;
- P/D/C/A acquistati;
- ultime aggiudicazioni confermate;
- stato della sessione;
- messaggio di sospensione.

## Foglione elettronico

- vista completa delle otto squadre;
- giocatori già presenti in rosa;
- slot ancora liberi per ruolo;
- crediti residui;
- massima offerta;
- aggiornamento attraverso la stessa projection autorevole del Public Display.

## Criteri di completamento

- connessione `PUBLIC_DISPLAY` realtime e read-only;
- nessun comando d’asta inviabile dal Public Display;
- connessione alla sola room di sessione;
- snapshot autorevole come unica fonte dello stato visualizzato;
- stati `PASSED` ed `EXCLUDED` chiaramente distinguibili;
- sessione `SUSPENDED` chiaramente segnalata senza alterare lo stato sottostante;
- modalità STANDARD, HIGH_CONTRAST_OUTDOOR, COMPACT e DARK collaudate;
- foglione elettronico collaudato;
- test, typecheck e build completi superati.

---

# v0.10.0 — Sospensione e resilienza

**Stato:** `COMPLETED`

## Obiettivi

- introdurre la sospensione completa della sessione;
- supportare Pizza Break e pause tecniche;
- bloccare i comandi;
- preservare lo stato;
- permettere la ripresa manuale.

## Causali previste

```text
PIZZA_BREAK
TECHNICAL_BREAK
ORGANIZATIONAL_BREAK
NETWORK_ISSUE
OTHER
```

## Regole principali

- la chiamata viene congelata;
- offerta, leader, turno e PASS restano invariati;
- telecomandi in sola lettura;
- backup alla sospensione;
- nessuna ripresa automatica;
- ripresa esclusivamente manuale.

---

# v0.11.0 — Operazioni manuali e correzioni

**Stato:** `COMPLETED`

## Obiettivi completati

- assegnazioni manuali delle rose iniziali;
- assegnazioni manuali alle rose;
- correzioni tecniche;
- motivazioni obbligatorie;
- identità dell'operatore;
- audit persistente completo delle operazioni amministrative;
- riapertura controllata delle sessioni chiuse.

## Correzioni supportate

```text
TEAM
PLAYER
ACQUISITION_COST
CONTRACT_YEAR
```

## Regole principali

- operazioni amministrative riservate a `ADMINISTRATOR` e `AUCTIONEER`;
- validazione del giocatore;
- validazione dei crediti;
- validazione degli slot;
- rispetto dei limiti di ruolo e della dimensione della rosa;
- sostenibilità economica;
- registrazione dell'operatore;
- motivazione/commento obbligatorio per le correzioni;
- correzioni tecniche vietate durante `RUNNING`;
- sessione `CLOSED` protetta dalle correzioni dirette;
- riapertura esplicita `CLOSED -> COMPLETED`;
- `REOPEN_SESSION` atomico, idempotente e protetto da `stateVersion`;
- audit `SESSION_REOPENED`;
- pubblicazione realtime soltanto dopo commit.

---

# v0.12.0 — Import/export FMS

**Stato:** `COMPLETED`

## Obiettivi completati

- completata la compatibilità con FMS ReVo per l’export finale;
- export della singola rosa;
- selezione persistita del portiere aggiuntivo export-only;
- export finale a 25 righe;
- export dell’intera sessione ordinato per `tableOrder`;
- validazione dell’integrità dell’output.

## Formato implementato

```text
Role<TAB>Name<TAB>Cost<TAB>ContractYear
```

Regole:

- nessuna intestazione;
- rosa ordinaria FantaAstaAPP: `2 P / 8 D / 8 C / 6 A`, totale 24;
- file FMS ReVo: `3 P / 8 D / 8 C / 6 A`, totale 25 righe;
- il portiere aggiuntivo non appartiene a `roster_entries`;
- costo del portiere aggiuntivo: `0`;
- anno contratto del portiere aggiuntivo: `1`;
- selezione ammessa in `COMPLETED` e `CLOSED`;
- compatibilità con le squadre reali dei due portieri ordinari;
- unicità del giocatore selezionato;
- valori validati;
- ordine coerente;
- export session-wide ordinato per `tableOrder`.

La decisione architetturale relativa al portiere aggiuntivo è formalizzata
in ADR-050.

---

# v0.13.0 — Backup e recovery

**Stato:** `PLANNED`

## Obiettivi

- snapshot;
- backup del database;
- verifica di integrità;
- recovery controllato;
- consultazione dei log;
- ripristino dopo riavvio.

## Scenari previsti

- interruzione elettrica;
- crash del server;
- riavvio volontario;
- problema di rete;
- database danneggiato;
- sessione sospesa.

## Regola fondamentale

Dopo un riavvio con sessione interrotta:

```text
RUNNING → SUSPENDED
```

La ripresa richiede sempre un’azione manuale del banditore.

---

# v0.14.0 — Collaudo operativo

**Stato:** `PLANNED`

## Obiettivi

- simulare un’asta completa;
- verificare più dispositivi;
- misurare stabilità e tempi di risposta;
- testare recovery;
- correggere problemi UX;
- preparare la release candidate.

## Attività previste

- simulazione con otto squadre;
- operatori e osservatori;
- schermo pubblico;
- disconnessioni;
- comandi simultanei;
- sospensione;
- ripresa;
- assegnazioni manuali;
- export finale;
- recovery da backup.

---

# v1.0.0 — Release stabile

**Stato:** `PLANNED`

## Obiettivi

- completare tutte le funzioni previste per la versione 1.0;
- stabilizzare il sistema;
- preparare il pacchetto locale;
- produrre la documentazione operativa;
- validare l’uso durante un’asta reale.

## Deliverable

- launcher locale;
- backend;
- frontend;
- database;
- migrazioni;
- guida di installazione;
- guida del banditore;
- procedura di backup;
- procedura di recovery;
- esportazione FMS;
- release GitHub;
- changelog completo.

## Criteri di rilascio

- test automatici superati;
- simulazione completa superata;
- nessun errore critico aperto;
- recovery verificato;
- export verificato;
- interfacce utilizzabili;
- documentazione aggiornata;
- release candidate approvata.

---

# v1.1.0 — Opzioni automatiche

**Stato:** `FUTURE`

## Obiettivi

- automatizzare la gestione dei giocatori opzionati;
- escludere il titolare dell’opzione dai rilanci;
- consentire l’asta tra le altre squadre;
- offrire il diritto di trattenere a offerta vincente più uno;
- assegnare a uno in assenza di offerte;
- impostare il contratto al primo anno.

Questa funzionalità non fa parte della versione 1.0.

---

## Priorità di sviluppo

Le priorità attuali sono:

1. sospensione e resilienza
2. operazioni manuali e correzioni
3. import/export FMS
4. backup e recovery
5. collaudo operativo
6. release stabile.

---

## Regole di aggiornamento della roadmap

Questo documento deve essere aggiornato quando:

- una milestone viene completata;
- cambia l’ordine di sviluppo;
- viene introdotta una nuova milestone;
- una funzionalità viene rinviata;
- una decisione modifica il piano tecnico;
- viene preparata una release.

Gli stati utilizzati sono:

| Stato | Significato |
|---|---|
| `COMPLETED` | Milestone completata |
| `NEXT` | Prossima milestone |
| `IN_PROGRESS` | Milestone in sviluppo |
| `PLANNED` | Milestone pianificata |
| `BLOCKED` | Milestone bloccata |
| `FUTURE` | Funzionalità successiva alla v1.0 |

---

## Documenti correlati

```text
docs/FANTA_ASTA_APP_SPEC.md
docs/IMPLEMENTATION_ROADMAP.md
docs/INITIAL_STRUCTURE.md
docs/ARCHITECTURE.md
docs/DECISIONS.md
docs/CODING_STANDARDS.md
CHANGELOG.md
```

In caso di conflitto sui requisiti funzionali, prevale:

```text
docs/FANTA_ASTA_APP_SPEC.md
```

In caso di conflitto sullo stato effettivo dello sviluppo, prevalgono:

```text
CHANGELOG.md
Git history
Repository code
```
