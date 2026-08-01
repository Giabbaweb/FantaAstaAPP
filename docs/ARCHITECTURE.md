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

La comunicazione realtime sarà introdotta nelle milestone dedicate ai telecomandi.

Tecnologia prevista:

```text
Socket.IO
```

Il server pubblicherà aggiornamenti verso:

- console amministratore;
- operatori delle squadre;
- osservatori;
- schermo pubblico.

I client non si scambiano direttamente informazioni tra loro.

```text
Client command
      │
      ▼
Authoritative server
      │
      ├── validation
      ├── persistence
      ├── event creation
      └── state update
              │
              ▼
      Realtime broadcast
```

---

## 11. Comandi ed eventi

Il modello operativo previsto segue il principio:

```text
Command → Validation → Event → State update → Broadcast
```

### Comandi

Un comando rappresenta una richiesta di modifica dello stato.

Esempi:

```text
OPEN_CALL
PLACE_BID
PASS_TEAM
UNDO_PASS
CONFIRM_AWARD
SUSPEND_SESSION
RESUME_SESSION
```

Ogni comando realtime dovrà contenere almeno:

```text
commandId
stateVersion
```

### Eventi

Un evento rappresenta un fatto già avvenuto e accettato dal server.

Esempi:

```text
CALL_OPENED
BID_ACCEPTED
TEAM_PASSED
AWARD_CONFIRMED
SESSION_SUSPENDED
SESSION_RESUMED
```

Gli eventi saranno utilizzati per:

- aggiornare i client;
- costruire l’audit trail;
- supportare il recovery;
- diagnosticare problemi.

---

## 12. Concorrenza e idempotenza

Anche se l’applicazione opera su una rete locale, più dispositivi possono inviare comandi quasi simultaneamente.

Per evitare inconsistenze:

- i comandi vengono elaborati sequenzialmente;
- ogni comando possiede un identificatore univoco;
- un comando duplicato non viene applicato due volte;
- ogni comando fa riferimento a una versione dello stato;
- un comando basato su uno stato obsoleto viene rifiutato;
- il database applica transazioni alle operazioni critiche.

Errore previsto:

```text
STALE_STATE
```

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
v0.5.0
```

Sono operative:

- monorepo pnpm;
- backend Fastify;
- frontend React e Vite;
- TypeScript;
- SQLite;
- Drizzle ORM;
- migrazioni;
- logging;
- test;
- health check applicativo;
- health check del database;
- gestione delle sessioni d'asta;
- gestione delle squadre;
- gestione dei presidenti;
- associazione squadre-sessioni d'asta;
- repository applicativi;
- service applicativi;
- API REST complete per la configurazione della lega;
- gestione dei giocatori;
- gestione delle rose iniziali;
- import archivio giocatori FMS ReVo;
- import transazionale delle rose iniziali;
- repository e service dedicati ai giocatori;
- API REST per l'importazione.

Il motore d'asta, il realtime, i telecomandi e lo schermo pubblico non sono ancora implementati.

---

## 20. Prossima evoluzione

La prossima milestone funzionale è dedicata a:

```text
Motore d'asta
```

L'obiettivo sarà introdurre:

- apertura delle chiamate;
- gestione dei rilanci;
- PASS;
- undo PASS;
- assegnazione provvisoria;
- conferma del banditore;
- aggiornamento dei crediti;
- eventi di dominio dell'asta.

Le decisioni architetturali significative verranno registrate in:

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