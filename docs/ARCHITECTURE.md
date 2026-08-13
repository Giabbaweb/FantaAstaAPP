# Architettura di FantaAstaAPP

## 1. Scopo del documento

Questo documento descrive l’architettura tecnica di **FantaAstaAPP**, i principi che guidano lo sviluppo, la struttura del monorepo e le responsabilità dei principali componenti.

La specifica funzionale completa rimane disponibile in:

```text
docs/FANTA_ASTA_APP_SPEC.md
```

La roadmap di implementazione originale è disponibile in:

```text
docs/IMPLEMENTATION_ROADMAP.md
```

---

## 2. Visione architetturale

FantaAstaAPP è un’applicazione locale progettata per gestire un’asta di fantacalcio dal vivo attraverso una rete Wi-Fi condivisa.

Il sistema deve funzionare anche senza connessione Internet.

La configurazione prevista comprende:

- un PC del banditore;
- uno smartphone operatore per ciascuna squadra;
- eventuali dispositivi osservatori;
- uno schermo pubblico;
- un server locale;
- un database SQLite locale.

Il PC del banditore ospita l’applicazione e rappresenta il nodo centrale del sistema.

```text
                    RETE WI-FI LOCALE

       ┌─────────────────────────────────────┐
       │         PC DEL BANDITORE            │
       │                                     │
       │  Fastify Server                     │
       │  Motore applicativo                 │
       │  SQLite + Drizzle ORM               │
       │  API HTTP e realtime                │
       └──────────────────┬──────────────────┘
                          │
          ┌───────────────┼───────────────────┐
          │               │                   │
          ▼               ▼                   ▼
    UI amministratore  Telecomandi       Schermo pubblico
        /admin          /remote              /public
```

---

## 3. Principi fondamentali

### 3.1 Offline first

L’asta deve poter essere gestita senza dipendere da servizi esterni o dalla disponibilità di Internet.

Tutti i dati necessari vengono conservati localmente:

- configurazione della sessione;
- squadre e presidenti;
- giocatori;
- crediti;
- rose;
- chiamate;
- offerte;
- eventi;
- backup;
- esportazioni.

Internet può essere utile durante lo sviluppo o per aggiornamenti del software, ma non è richiesto durante l’asta.

---

### 3.2 Server autoritativo

Il server è l’unica fonte autorevole dello stato dell’asta.

Le interfacce utente non modificano direttamente lo stato locale. Inviano invece comandi al server, che li valida e decide se accettarli.

```text
Client
  │
  ▼
Command
  │
  ▼
Server-side validation
  │
  ▼
Domain operation
  │
  ▼
Database transaction
  │
  ▼
State update
  │
  ▼
Realtime broadcast
```

Questo principio impedisce che dispositivi differenti mantengano stati incompatibili.

---

### 3.3 Separazione delle responsabilità

La logica di business deve rimanere separata da:

- interfaccia grafica;
- trasporto HTTP;
- comunicazione realtime;
- persistenza SQLite;
- import ed export;
- logging;
- backup.

Il dominio dell’asta non deve dipendere direttamente da React, Fastify o Drizzle.

---

### 3.4 Sviluppo incrementale

Ogni milestone introduce un insieme limitato di funzionalità verificabili.

Ogni incremento deve mantenere:

- build funzionante;
- type checking superato;
- migrazioni applicabili;
- test eseguibili;
- documentazione aggiornata;
- compatibilità con quanto già implementato.

---

### 3.5 Affidabilità operativa

Durante un’asta dal vivo, la continuità operativa è più importante della complessità tecnica.

Le scelte architetturali devono privilegiare:

- comportamento prevedibile;
- semplicità;
- validazione lato server;
- persistenza immediata;
- tracciabilità;
- backup;
- recupero controllato;
- assenza di automatismi irreversibili.

---

## 4. Stack tecnologico

| Area | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Linguaggio | TypeScript |
| Backend | Fastify |
| Frontend | React |
| Build frontend | Vite |
| Database | SQLite |
| ORM | Drizzle ORM |
| Realtime | Socket.IO |
| Validazione | Zod |
| Logging | Pino |
| Testing | Vitest |
| Workspace | pnpm |

---

## 5. Struttura del monorepo

```text
FantaAstaAPP/
├── apps/
│   ├── server/
│   └── web/
├── packages/
│   ├── contracts/
│   └── domain/
├── data/
│   ├── database/
│   ├── imports/
│   └── exports/
├── backups/
├── logs/
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### `apps/server`

Contiene l’applicazione backend.

Responsabilità:

- avvio del server Fastify;
- configurazione dell’applicazione;
- API HTTP;
- accesso al database;
- migrazioni;
- servizi applicativi;
- logging;
- gestione futura di Socket.IO;
- import, export, backup e recovery.

---

### `apps/web`

Contiene l’applicazione React costruita con Vite.

Ospiterà le tre interfacce principali:

```text
/admin
/remote
/public
```

Responsabilità:

- presentazione dello stato;
- raccolta dei comandi dell’utente;
- comunicazione con il server;
- aggiornamento realtime;
- gestione dello stato strettamente necessario alla UI.

La UI non contiene la logica autorevole dell’asta.

---

### `packages/contracts`

Contiene i contratti condivisi tra backend e frontend.

Esempi previsti:

- DTO delle API;
- schemi dei comandi;
- payload degli eventi;
- codici di errore;
- tipi delle risposte;
- contratti realtime.

Questo package riduce la duplicazione e mantiene coerenti server e client.

---

### `packages/domain`

Contiene la logica di dominio indipendente dall’infrastruttura.

Esempi previsti:

- stati della sessione;
- regole di transizione;
- validazione economica;
- calcolo del massimo sostenibile;
- regole di rosa;
- regole delle chiamate;
- eventi di dominio;
- invarianti.

Il package non deve dipendere dalle interfacce React né dal trasporto HTTP.

---

### `data`

Contiene i dati locali dell’applicazione.

```text
data/
├── database/
├── imports/
└── exports/
```

- `database/`: file SQLite locali;
- `imports/`: file sorgente destinati all’importazione;
- `exports/`: file prodotti dall’applicazione.

I dati runtime non devono essere inclusi nel repository Git.

---

### `backups`

Conterrà i backup generati dall’applicazione.

Sono previsti backup:

- dopo operazioni critiche;
- alla sospensione della sessione;
- durante il recovery;
- su richiesta del banditore.

I file runtime della cartella non vengono versionati.

---

### `logs`

Contiene i log applicativi generati dal server.

Il logging strutturato viene gestito tramite Pino.

I log dovranno consentire di ricostruire:

- avvio e arresto del server;
- errori applicativi;
- operazioni sul database;
- comandi ricevuti;
- rifiuti di validazione;
- eventi critici;
- operazioni di backup e recovery.

---

## 6. Architettura backend

Il backend sarà organizzato per moduli funzionali.

Struttura obiettivo:

```text
apps/server/src/
├── app.ts
├── server.ts
├── config/
├── db/
├── modules/
│   ├── health/
│   ├── auction-sessions/
│   ├── teams/
│   ├── owners/
│   ├── players/
│   ├── auction/
│   ├── realtime/
│   ├── imports/
│   ├── exports/
│   └── backups/
├── shared/
└── types/
```
> **Nota:** la struttura mostrata rappresenta l'architettura di riferimento verso cui evolverà il progetto. Nella versione **v0.6.0** alcuni moduli sono ancora organizzati secondo una struttura semplificata (route, repository, service e database), mantenendo comunque la separazione delle responsabilità descritta in questo documento. La completa modularizzazione è prevista a partire dalla v0.7.0 con l'introduzione del layer realtime.

Ogni modulo potrà includere, quando necessario:

```text
module/
├── routes.ts
├── schemas.ts
├── service.ts
├── repository.ts
├── types.ts
└── tests/
```

La struttura potrà essere adattata quando la complessità reale del modulo lo richiederà.

Non devono essere introdotti livelli astratti privi di utilità concreta.

---

## 7. Livelli applicativi

### 7.1 Transport layer

Comprende:

- route Fastify;
- gestione delle richieste HTTP;
- autenticazione futura;
- validazione dei payload;
- conversione degli errori in risposte HTTP.

Questo livello non deve contenere regole di business complesse.

---

### 7.2 Application layer

Coordina i casi d’uso.

Esempi:

- creare una sessione;
- aggiornare una sessione;
- avviare una sessione;
- sospendere una sessione;
- aprire una chiamata;
- registrare un’offerta;
- confermare un’assegnazione.

Il livello applicativo coordina dominio, repository, transazioni e pubblicazione degli eventi.

---

### 7.3 Domain layer

Contiene le regole fondamentali dell’asta.

Esempi:

- transizioni di stato ammesse;
- crediti mai negativi;
- rosa sempre completabile;
- una sola chiamata attiva;
- una squadra in PASS non può rilanciare;
- una sessione sospesa non accetta comandi d’asta;
- una disconnessione non equivale a PASS.

Il dominio deve essere testabile senza avviare Fastify o SQLite.

---

### 7.4 Persistence layer

Gestisce l’accesso al database tramite Drizzle ORM.

Responsabilità:

- query;
- inserimenti;
- aggiornamenti;
- transazioni;
- mapping tra record persistiti e oggetti applicativi;
- vincoli di integrità.

Le route non devono eseguire direttamente query complesse.

---

## 8. Database

### 8.1 Tecnologia

Il database locale utilizza:

```text
SQLite + Drizzle ORM
```

La scelta di SQLite è coerente con i requisiti:

- funzionamento offline;
- installazione semplice;
- database in un singolo file;
- backup agevole;
- assenza di un server database separato;
- carico limitato e prevedibile.

---

### 8.2 Stato della v0.6.0

Le tabelle attualmente presenti comprendono:

- `leagues`;
- `auction_sessions`;
- `teams`;
- `owners`;
- `auction_session_teams`;
- `players`;
- `roster_entries`;

La configurazione completa della lega è ora persistita nel database.

La struttura verrà estesa nelle milestone successive con:

- chiamate;
- offerte;
- eventi di asta.

---

### 8.3 Migrazioni

Ogni modifica allo schema deve essere gestita attraverso una migrazione Drizzle.

Regole:

- non modificare manualmente un database esistente;
- versionare i file di migrazione;
- verificare le migrazioni su un database pulito;
- mantenere separati schema applicativo e dati runtime;
- eseguire un backup prima di migrazioni potenzialmente distruttive.

---

### 8.4 Transazioni

Le operazioni critiche devono essere atomiche.

La conferma futura di un’assegnazione dovrà comprendere in una singola transazione:

1. verifica dello stato;
2. creazione della voce nella rosa;
3. sottrazione dei crediti;
4. occupazione dello slot;
5. assegnazione del giocatore;
6. chiusura della chiamata;
7. registrazione dell’evento.

In caso di errore, l’intera operazione deve essere annullata.

---

## 9. API HTTP

La v0.6.0 espone:

```text
GET    /api/health
GET    /api/db-health

GET    /api/auction-sessions
GET    /api/auction-sessions/:id
POST   /api/auction-sessions
PATCH  /api/auction-sessions/:id
PATCH  /api/auction-sessions/:id/status
DELETE /api/auction-sessions/:id

GET    /api/teams
GET    /api/teams/:id
POST   /api/teams
PATCH  /api/teams/:id
DELETE /api/teams/:id

GET    /api/owners
GET    /api/owners/:id
POST   /api/owners
PATCH  /api/owners/:id
DELETE /api/owners/:id

GET    /api/auction-session-teams
GET    /api/auction-session-teams/:id
POST   /api/auction-session-teams
PATCH  /api/auction-session-teams/:id
DELETE /api/auction-session-teams/:id
```

### `/api/health`

Verifica che il server applicativo sia raggiungibile.

### `/api/db-health`

Verifica che il database sia accessibile e operativo.

Le API future verranno raggruppate per risorsa o modulo, ad esempio:

```text
/api/teams
/api/owners
/api/players
/api/auction
```

Le API devono restituire risposte coerenti e prevedibili.

Struttura indicativa:

```json
{
  "data": {},
  "error": null
}
```

oppure, in caso di errore:

```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

I contratti condivisi vengono definiti nel package `packages/contracts`.

---

## 10. Realtime

La comunicazione realtime è implementata tramite Socket.IO ed è integrata con il server Fastify.

Il server è l'unica fonte autoritativa dello stato.

I client non si scambiano direttamente informazioni tra loro.

Il layer realtime comprende:

- connessioni Socket.IO;
- registrazione dei dispositivi;
- autenticazione tramite PIN;
- ruoli OPERATOR e OBSERVER;
- una sola connessione OPERATOR per squadra;
- room per sessione;
- room per squadra;
- room per operatori;
- room per osservatori;
- publisher realtime;
- dispatcher degli eventi;
- dispatcher degli snapshot;
- snapshot autorevole alla registrazione;
- socket command handler.

Eventi principali:

realtime:connected
realtime:register
realtime:registered
realtime:error
auction:command
auction:event
auction:snapshot

Il flusso realtime operativo è:

Client command
      |
      v
Socket command handler
      |
      v
Command coordinator
      |
      v
Atomic command service
      |
      v
Atomic executor
      |
      v
Database transaction
      |
      v
Commit
      |
      +--> Auction event
      |
      +--> Authoritative snapshot

Gli observer sono sempre read-only.

I telecomandi OPERATOR possono inviare solo comandi relativi alla propria squadra e alla propria sessione.

I comandi remoti disponibili nella v0.7.0 sono:

BID
PASS
UNDO_PASS

I comandi amministrativi restano riservati al banditore:

OPEN
CONFIRM
CANCEL

La disconnessione di un dispositivo non equivale mai a PASS.

La riconnessione richiede una nuova registrazione e produce un nuovo snapshot autorevole.

---

## 11. Comandi ed eventi

Un comando rappresenta una richiesta di modifica dello stato.

Ogni comando di modifica contiene almeno:

commandId
stateVersion

Il commandId identifica univocamente il comando.

stateVersion rappresenta la versione autoritativa dello stato sulla quale il comando è stato costruito.

La pipeline dei comandi è:

Validation
      |
      v
Idempotency check
      |
      v
stateVersion check
      |
      v
Domain command
      |
      v
Aggregate persistence
      |
      v
stateVersion increment
      |
      v
Command registry
      |
      v
Commit
      |
      v
Realtime event
      |
      v
Authoritative snapshot

Gli eventi rappresentano fatti già avvenuti e accettati dal server.

Eventi d'asta implementati:

AUCTION_CALL_OPENED
BID_PLACED
TEAM_PASSED
TEAM_PASS_UNDONE
AUCTION_CALL_CONFIRMED
AUCTION_CALL_CANCELLED

Gli eventi vengono pubblicati soltanto dopo il completamento della transazione.

Un replay idempotente non genera una nuova pubblicazione di evento o snapshot.

---

## 12. Concorrenza e idempotenza

La consistenza è garantita tramite optimistic concurrency control.

La tabella della sessione contiene uno stateVersion persistente.

Ogni comando specifica:

commandId
expected stateVersion

L'esecuzione atomica comprende:

- lettura dell'aggregate;
- controllo del command registry;
- verifica dello stateVersion;
- applicazione delle regole di dominio;
- persistenza dell'aggregate;
- incremento dello stateVersion;
- registrazione del comando;
- commit.

Se lo stateVersion ricevuto non coincide con quello corrente, il comando viene rifiutato con:

STALE_STATE

Se lo stesso commandId viene ripresentato con gli stessi dati:

- il comando non viene rieseguito;
- viene restituito il risultato precedentemente persistito;
- idempotentReplay è true;
- evento e snapshot non vengono ripubblicati.

Se lo stesso commandId viene riutilizzato con dati differenti, il comando viene rifiutato con:

COMMAND_ID_CONFLICT

Aggregate, stateVersion e command registry vengono aggiornati nella stessa transazione.

In caso di errore la transazione viene interamente annullata.

---

## 13. Frontend

L’applicazione web utilizza React e Vite.

### `/admin`

Interfaccia del banditore.

Responsabilità previste:

- configurazione;
- gestione delle sessioni;
- gestione delle squadre;
- importazione dei giocatori;
- governo dell’asta;
- correzioni manuali;
- sospensione e ripresa;
- esportazione;
- backup e recovery.

---

### `/remote`

Interfaccia per smartphone.

Ruoli previsti:

- `OPERATOR`: può inviare rilanci e PASS;
- `OBSERVER`: sola lettura.

Un solo dispositivo per squadra può operare come `OPERATOR`.

---

### `/public`

Interfaccia destinata allo schermo pubblico.

Mostrerà:

- chiamata corrente;
- offerta;
- squadra leader;
- crediti residui;
- composizione delle rose;
- posti liberi;
- stato della sessione.

Non consente l’invio di comandi.

---

## 14. Gestione degli errori

Gli errori devono essere:

- identificabili tramite codice;
- registrati nei log;
- comprensibili per l’utente;
- privi di dettagli sensibili;
- coerenti tra API e realtime.

Categorie previste:

```text
VALIDATION_ERROR
NOT_FOUND
CONFLICT
INVALID_STATE_TRANSITION
INSUFFICIENT_CREDITS
ROSTER_LIMIT_REACHED
STALE_STATE
UNAUTHORIZED_COMMAND
DATABASE_ERROR
INTERNAL_ERROR
```

Gli errori tecnici dettagliati devono essere conservati nei log, mentre al client deve essere restituito un messaggio controllato.

---

## 15. Logging

Pino è utilizzato per il logging strutturato.

Ogni log significativo dovrebbe includere, quando disponibile:

- timestamp;
- livello;
- modulo;
- request ID;
- session ID;
- command ID;
- team ID;
- operation;
- error code.

Non devono essere registrati:

- PIN in chiaro;
- segreti;
- credenziali;
- payload sensibili non necessari.

---

## 16. Testing

Il progetto utilizza Vitest.

La strategia di test prevede:

### Unit test

Per:

- regole di dominio;
- transizioni di stato;
- validazioni;
- calcoli economici;
- massimo sostenibile;
- limiti della rosa.

### Integration test

Per:

- route Fastify;
- repository;
- database SQLite;
- transazioni;
- migrazioni;
- casi d’uso applicativi.

### End-to-end test

Saranno introdotti quando le principali interfacce saranno operative.

Prima di una release devono essere eseguiti:

```bash
pnpm typecheck
pnpm test
pnpm build
```

---

## 17. Sicurezza nella rete locale

FantaAstaAPP opera principalmente in una rete locale controllata, ma non deve considerare affidabili i client.

Il server deve sempre validare:

- identità del dispositivo;
- ruolo;
- squadra associata;
- turno corrente;
- stato della sessione;
- versione dello stato;
- validità economica del comando.

La presenza nella rete locale non equivale ad autorizzazione.

---

## 18. Backup e recovery

Il sistema dovrà poter recuperare una sessione dopo:

- riavvio del server;
- arresto accidentale;
- interruzione elettrica;
- problema di rete;
- errore operativo;
- sospensione volontaria.

Sono previsti:

- backup del file SQLite;
- snapshot applicativi;
- audit trail;
- verifica dell’integrità;
- ripristino controllato.

Dopo un riavvio con una sessione interrotta, il sistema non deve riprendere automaticamente l’asta.

La sessione viene caricata in stato sospeso e richiede un’azione esplicita del banditore.

---

## 19. Stato attuale

La versione corrente è:

```text
v0.10.0
```

Sono operative:

- monorepo pnpm;
- backend Fastify;
- frontend React e Vite;
- SQLite e Drizzle ORM;
- configurazione della lega;
- import giocatori e rose iniziali;
- motore d'asta;
- persistenza delle chiamate d'asta;
- API REST del motore d'asta;
- Socket.IO integrato con Fastify;
- registrazione e autenticazione dei dispositivi realtime;
- ruoli `OPERATOR`, `OBSERVER` e `PUBLIC_DISPLAY`;
- una sola connessione `OPERATOR` per partecipazione;
- connessioni `OBSERVER` e `PUBLIC_DISPLAY` in sola lettura;
- stanze realtime per sessione e squadra;
- registrazione `PUBLIC_DISPLAY` senza identità di squadra;
- ingresso del Public Display nella sola room `session:<auctionSessionId>`;
- rifiuto lato server dei comandi di scrittura provenienti dal Public Display;
- snapshot autorevoli;
- projection Public Display derivata dallo snapshot autorevole;
- projection Public Display con dati lega, squadre, giocatore corrente, ultime aggiudicazioni e roster entries;
- eventi realtime dell'asta;
- `stateVersion` persistente;
- command registry persistente;
- controllo ottimistico della concorrenza;
- idempotenza tramite `commandId`;
- esecuzione atomica dei comandi;
- protocollo HTTP atomico;
- protocollo Socket.IO `auction:command`;
- telecomandi `BID`, `PASS` e `UNDO_PASS`;
- riconnessione con nuova sincronizzazione;
- conferma definitiva atomica delle aggiudicazioni;
- aggiornamento atomico di rosa, crediti e disponibilità del giocatore;
- validazione di crediti, slot, ruoli e completabilità della rosa;
- audit trail persistente tramite `auction_events`;
- evento persistente `AUCTION_AWARD_CONFIRMED`;
- separazione tra audit di dominio e `command_registry`;
- rollback completo dell'assegnazione e dell'audit;
- pubblicazione realtime esclusivamente dopo commit;
- boundary post-commit `AuctionBackupRequester`;
- implementazione `NoopAuctionBackupRequester`;
- isolamento degli errori della richiesta backup dal comando già committato;
- vista `/public` fullscreen e read-only;
- branding FantaAstaAPP e lega nello schermo pubblico;
- giocatore chiamato, prezzo corrente, leader e turno;
- ultime aggiudicazioni confermate con scroll interno;
- crediti residui, massima offerta e composizione P/D/C/A delle squadre;
- stati `PASSED` ed `EXCLUDED` con overlay e motivo di esclusione;
- stato visuale della sessione e banner dedicato per `SUSPENDED`;
- modalità Public Display `STANDARD`, `HIGH_CONTRAST_OUTDOOR`, `COMPACT` e `DARK`;
- foglione elettronico delle rose con otto colonne, roster entries e slot liberi;
- sospensione operativa persistente della sessione con causale;
- causali `PIZZA_BREAK`, `TECHNICAL_BREAK`, `ORGANIZATIONAL_BREAK`, `NETWORK_ISSUE` e `OTHER`;
- comandi atomici e idempotenti `SUSPEND_SESSION` e `RESUME_SESSION`;
- controllo ottimistico dei comandi di sessione tramite `stateVersion`;
- rifiuto server-side dei comandi d'asta durante `SUSPENDED`;
- conservazione di chiamata, offerta, leader, turno, PASS ed esclusioni durante la pausa;
- eventi persistenti di audit `SESSION_SUSPENDED` e `SESSION_RESUMED`;
- audit della sospensione e ripresa nella stessa transazione del comando autorevole;
- eventi realtime di sessione pubblicati esclusivamente dopo commit;
- snapshot autorevole aggiornato dopo sospensione e ripresa;
- causale della sospensione esposta nello snapshot e mostrata dal Public Display;
- richiesta post-commit del backup alla sospensione tramite `AuctionBackupRequester`;
- nessuna duplicazione di eventi realtime o richieste backup sui replay idempotenti;
- isolamento degli errori del backup dalla sospensione già committata;
- nessuna ripresa automatica dopo reconnect o ricostruzione del runtime;
- resilienza dello stato persistito `SUSPENDED` verificata tramite test di ricostruzione;
- 43 file di test server e 287 test server verdi;
- 10 file di test domain e 86 test domain verdi;
- typecheck e build completi del monorepo superati.

La v0.10.0 completa quindi la sospensione operativa della sessione
mantenendo il server come unica fonte autoritativa. La pausa congela lo
stato corrente dell'asta senza alterare la macchina a stati della chiamata,
blocca i comandi operativi lato server, pubblica audit, eventi e snapshot
solo dopo commit e richiede una ripresa esplicita del banditore.

Il boundary di backup viene invocato dopo una sospensione committata,
senza anticipare il sottosistema completo di backup e recovery previsto
dalla v0.13.0.

---

## 20. Prossima evoluzione

La prossima milestone funzionale è:

```text
v0.11.0 — Operazioni manuali e correzioni
```

La milestone comprenderà:

- assegnazioni manuali;
- gestione manuale delle opzioni;
- correzioni tecniche;
- motivazioni obbligatorie;
- audit completo delle operazioni manuali;
- validazione del giocatore, dei crediti e degli slot;
- rispetto dei limiti di rosa e della sostenibilità economica;
- registrazione dell'operatore e della motivazione.

Le decisioni architetturali significative continueranno a essere registrate in:

```text
docs/DECISIONS.md
```

---

## 21. Fonti progettuali

Questo documento sintetizza e traduce in architettura tecnica le regole definite nella specifica master, nella roadmap e nella struttura iniziale del progetto.

In caso di conflitto sui requisiti funzionali, prevale:

```text
docs/FANTA_ASTA_APP_SPEC.md
```
