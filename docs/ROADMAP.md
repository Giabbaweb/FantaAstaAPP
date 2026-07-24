# Roadmap di sviluppo

Questo documento descrive la roadmap tecnica corrente di **FantaAstaAPP**.

La roadmap nasce dalla specifica funzionale approvata e dalla roadmap di implementazione iniziale, ma viene aggiornata per riflettere lo stato reale del repository e l’ordine effettivo delle milestone.

---

## Stato corrente

Versione attuale:

```text
v0.2.0
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
- documentazione iniziale del progetto.

Prossima milestone:

```text
v0.3.0 — Gestione delle Sessioni d’Asta
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

**Stato:** `NEXT`

Questa milestone introduce la prima funzionalità applicativa completa.

## Obiettivi

- gestire il ciclo di vita di una sessione d’asta;
- introdurre API dedicate;
- formalizzare gli stati della sessione;
- implementare regole di transizione;
- creare la prima UI amministrativa funzionale.

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

- modulo `auction-sessions`;
- repository;
- service applicativo;
- route Fastify;
- schemi Zod;
- mapping database;
- errori applicativi;
- logging dedicato;
- test unitari;
- test di integrazione.

## API previste

```text
GET    /api/auction-sessions
GET    /api/auction-sessions/:id
POST   /api/auction-sessions
PATCH  /api/auction-sessions/:id
POST   /api/auction-sessions/:id/ready
POST   /api/auction-sessions/:id/start
POST   /api/auction-sessions/:id/suspend
POST   /api/auction-sessions/:id/resume
POST   /api/auction-sessions/:id/complete
POST   /api/auction-sessions/:id/close
```

L’elenco definitivo potrà essere adattato durante l’implementazione.

## Frontend

- pagina elenco sessioni;
- creazione sessione;
- dettaglio sessione;
- modifica dati consentiti;
- visualizzazione dello stato;
- azioni amministrative;
- gestione loading ed errori.

## Regole principali

- solo le transizioni ammesse possono essere eseguite;
- una sessione `CLOSED` non può essere riaperta;
- una sessione `SUSPENDED` riprende solo manualmente;
- una sessione `RUNNING` non può essere modificata liberamente;
- ogni transizione deve essere validata lato server.

## Criteri di completamento

- CRUD essenziale operativo;
- transizioni testate;
- errori coerenti;
- API documentate;
- UI amministrativa utilizzabile;
- build, type checking e test superati;
- database migrabile da v0.2.0;
- changelog aggiornato.

---

# v0.4.0 — Configurazione della lega

**Stato:** `PLANNED`

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

**Stato:** `PLANNED`

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

**Stato:** `PLANNED`

Questa milestone introduce il cuore logico dell’applicazione.

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

## Criteri di completamento

- motore di dominio indipendente dalla UI;
- transizioni testate;
- massimo sostenibile verificato;
- gestione completa dei PASS;
- stato coerente dopo ogni comando;
- nessuna dipendenza diretta da Fastify o React.

---

# v0.7.0 — Telecomandi realtime

**Stato:** `PLANNED`

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

## Criteri di completamento

- stato aggiornato in tempo reale;
- comandi validati lato server;
- dispositivi observer in sola lettura;
- riconnessione senza perdita di coerenza;
- nessuna equivalenza tra disconnessione e PASS.

---

# v0.8.0 — Conferma assegnazioni e transazioni

**Stato:** `PLANNED`

## Obiettivi

- confermare le assegnazioni;
- aggiornare crediti e rosa;
- registrare eventi;
- garantire atomicità;
- creare backup dopo operazioni critiche.

## Operazione transazionale

La conferma deve comprendere:

1. verifica dello stato;
2. verifica del leader;
3. verifica dei crediti;
4. verifica degli slot;
5. assegnazione del giocatore;
6. aggiornamento crediti;
7. aggiornamento rosa;
8. chiusura della chiamata;
9. registrazione evento;
10. backup.

## Criteri di completamento

- nessuna assegnazione parziale;
- rollback completo in caso di errore;
- giocatore assegnato a una sola squadra;
- crediti mai negativi;
- rosa sempre completabile;
- audit trail aggiornato.

---

# v0.9.0 — Schermo pubblico

**Stato:** `PLANNED`

## Obiettivi

- visualizzare lo stato dell’asta su uno schermo condiviso;
- mostrare le informazioni principali di tutte le squadre;
- supportare l’utilizzo in ambiente esterno.

## Modalità previste

```text
STANDARD
HIGH_CONTRAST_OUTDOOR
COMPACT
```

## Informazioni visualizzate

- giocatore chiamato;
- prezzo corrente;
- squadra leader;
- turno;
- squadre in PASS;
- crediti residui;
- posti liberi;
- P/D/C/A acquistati;
- stato della sessione;
- messaggi di sospensione.

---

# v0.10.0 — Sospensione e resilienza

**Stato:** `PLANNED`

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

**Stato:** `PLANNED`

## Obiettivi

- assegnazioni manuali;
- gestione manuale delle opzioni;
- correzioni tecniche;
- motivazioni obbligatorie;
- audit completo.

## Causali previste

```text
OPTION_EXERCISED_MANUALLY
OPTION_NO_EXTERNAL_BID
TECHNICAL_CORRECTION
OTHER
```

## Regole principali

- validazione del giocatore;
- validazione crediti;
- validazione slot;
- rispetto dei limiti di rosa;
- sostenibilità economica;
- registrazione dell’operatore;
- registrazione della motivazione.

---

# v0.12.0 — Import/export FMS

**Stato:** `PLANNED`

## Obiettivi

- completare la compatibilità con FMS;
- esportare le rose;
- escludere il terzo portiere;
- verificare l’integrità dell’output.

## Formato previsto

```text
Role<TAB>Name<TAB>Cost<TAB>ContractYear
```

Regole:

- nessuna intestazione;
- una riga per giocatore;
- terzo portiere escluso;
- valori validati;
- ordine coerente.

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

1. gestione delle sessioni;
2. configurazione della lega;
3. giocatori e import;
4. motore d’asta;
5. realtime;
6. assegnazioni;
7. schermo pubblico;
8. sospensione e resilienza;
9. operazioni manuali;
10. FMS;
11. recovery;
12. collaudo;
13. release stabile.

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