# PROJECT_CONTEXT — FantaAstaAPP

## Identità

- **Nome definitivo:** FantaAstaAPP
- **Tipo:** applicazione locale per asta fantacalcio dal vivo
- **Stato:** Milestone 6 completata
- **Versione corrente:** v0.6.0
- **Prossimo obiettivo:** Versione 0.7 – Telecomandi realtime

## Regole immutabili

- 8 squadre tipiche.
- Crediti configurabili; esempio 330 meno rinnovi.
- Rosa: 2 P, 8 D, 8 C, 6 A, totale 24.
- Terzo portiere fuori asta, costo 0, escluso dagli export.
- Giro di tavolo prestabilito.
- Il chiamante effettua la prima offerta e non può aprire a 0.
- Rilanci: +1, +2, +5, +10, custom.
- Il banditore conferma sempre l'assegnazione.
- Nessun timeout operativo, PASS automatico o assegnazione definitiva automatica.
- Il chiamante può fare PASS solo dopo un rilancio avversario.
- Undo PASS soltanto dal banditore.
- Dopo undo PASS, rientro al turno naturale.
- Quando il turno tornerebbe al leader: `PROVISIONAL_AWARD`.
- Nessun rilancio contro se stessi.

## Formula economica

```text
maxBid = creditsRemaining - (freeSlots - 1)
```

## Stack

```text
Node.js
TypeScript
Fastify
React
Vite
SQLite
Drizzle ORM
Socket.IO
Zod
Pino
Vitest
```

Percorsi:

```text
/admin
/remote
/public
```

Principio:

```text
Command → Validation → Event → State update → Broadcast
```

Server autoritativo.

## Stati sessione

```text
SETUP
READY
RUNNING
SUSPENDED
COMPLETED
CLOSED
```

`SUSPENDED` include esplicitamente il Pizza Break. Durante la pausa lo stato è congelato, i telecomandi sono bloccati, viene creato un backup e la ripresa è esclusivamente manuale.

## Stati chiamata

```text
DRAFT
OPEN
PROVISIONAL_AWARD
SUSPENDED
CONFIRMED
CANCELLED
ROLLED_BACK
```

## Stati squadra

```text
ACTIVE
LEADING
PASSED
EXCLUDED_ROLE
EXCLUDED_CREDITS
EXCLUDED_ROSTER_COMPLETE
MANUAL
DISCONNECTED
```

```text
DISCONNECTED ≠ PASSED
```

## Realtime

Ogni comando contiene:

```text
commandId
stateVersion
```

- duplicati ignorati;
- stato obsoleto: `STALE_STATE`;
- elaborazione sequenziale.

## UI

- `/admin`: governo completo.
- `/remote`: un operatore per squadra e osservatori read-only.
- `/public`: crediti, P/D/C/A, posti liberi, chiamata corrente.
- Modalità schermo: `STANDARD`, `HIGH_CONTRAST_OUTDOOR`, `COMPACT`.

## Opzioni

- 1.0: gestione manuale con `MANUAL_ASSIGNMENT`.
- 1.1: automazione completa.

## Export FMS

```text
Role<TAB>Name<TAB>Cost<TAB>ContractYear
```

Nessuna intestazione. Terzo portiere escluso.

## Stato implementativo della v0.6.0

Sono completati:

- dominio `AuctionCall`;
- dominio `AuctionCallTeam`;
- macchina a stati della chiamata;
- calcolo del massimo rilancio sostenibile;
- apertura della chiamata;
- gestione dei rilanci;
- gestione di PASS e annullamento del PASS;
- aggiudicazione provvisoria;
- conferma e annullamento della chiamata;
- persistenza SQLite delle chiamate;
- repository e application service;
- route HTTP di lettura;
- route HTTP di comando;
- mapping degli errori;
- migrazione Drizzle;
- fixture condivise per i test;
- 63 test server verdi.

API principali:

```text
GET  /api/auction-calls/:id
GET  /api/auction-sessions/:auctionSessionId/auction-call
POST /api/auction-calls/:id/commands/:command
```

Comandi HTTP disponibili:

```text
open
bid
pass
undo-pass
confirm
cancel
```

## Prossimo obiettivo

Versione 0.7:

- Socket.IO;
- telecomandi squadra;
- ruoli `OPERATOR` e `OBSERVER`;
- sincronizzazione realtime;
- riconnessione e risincronizzazione;
- comandi con `commandId` e `stateVersion`.

Fonte autoritativa completa:

```text
docs/FANTA_ASTA_APP_SPEC.md
```
