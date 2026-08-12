# PROJECT_CONTEXT — FantaAstaAPP

## Identità

- **Nome definitivo:** FantaAstaAPP
- **Tipo:** applicazione locale per asta fantacalcio dal vivo
- **Stato:** Milestone 9 completata
- **Versione corrente:** v0.9.0
- **Prossimo obiettivo:** Versione 0.10 – Sospensione e resilienza

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

## Stato implementativo della v0.9.0

Sono completati tutti gli elementi della v0.8.0 e inoltre:

- ruolo realtime `PUBLIC_DISPLAY` read-only di sessione;
- registrazione Public Display senza `auctionSessionTeamId`;
- ingresso del Public Display nella sola room `session:<auctionSessionId>`;
- divieto lato server di inviare comandi d'asta dal Public Display;
- projection Public Display inclusa nello snapshot autorevole;
- dati lega inclusi nella projection;
- dati squadre con crediti residui, massima offerta e conteggi P/D/C/A;
- giocatore corrente con ruolo e squadra reale;
- supporto foto giocatore lato UI;
- ultime aggiudicazioni confermate;
- projection completa delle roster entries;
- foglione elettronico delle rose con 8 colonne e slot liberi;
- header con branding FantaAstaAPP e lega;
- vista `/public` fullscreen read-only;
- stati squadra `PASSED` ed `EXCLUDED` visualizzati con overlay;
- motivo di esclusione visualizzato;
- stato sessione visualizzato;
- banner dedicato per `SUSPENDED`;
- modalità visuali `STANDARD`, `HIGH_CONTRAST_OUTDOOR`, `COMPACT` e `DARK`;
- collaudo visivo degli overlay PASS/ESCLUSA in STANDARD, OUTDOOR e DARK;
- collaudo visivo del banner SUSPENDED in STANDARD, OUTDOOR, DARK e COMPACT;
- 33 file di test server;
- 236 test server verdi;
- 10 file di test domain;
- 86 test domain verdi;
- typecheck completo del monorepo superato;
- build completa del monorepo superata.

## Protocollo dei comandi

Ogni comando di modifica contiene:

commandId
stateVersion

Pipeline autoritativa:

validazione
→ controllo idempotenza
→ controllo stateVersion
→ applicazione dominio
→ assegnazione definitiva
→ aggiornamento rosa, crediti e giocatore
→ registrazione audit di dominio
→ persistenza aggregate
→ incremento stateVersion
→ registrazione comando
→ commit
→ evento realtime
→ snapshot autorevole
→ boundary richiesta backup

Un retry identico restituisce il risultato persistito con:

idempotentReplay: true

senza ripubblicare evento o snapshot e senza richiedere un nuovo backup.

## Realtime e telecomandi

Eventi principali:

realtime:connected
realtime:register
realtime:registered
realtime:error
auction:command
auction:event
auction:snapshot

I telecomandi di squadra possono inviare:

BID
PASS
UNDO_PASS

I comandi amministrativi restano riservati al banditore:

OPEN
CONFIRM
CANCEL

La riconnessione richiede una nuova registrazione del dispositivo e produce un nuovo snapshot autorevole.

## Prossimo obiettivo

Versione 0.10 — Sospensione e resilienza:

- introdurre la sospensione operativa completa della sessione;
- supportare Pizza Break e pause tecniche;
- bloccare i comandi durante `SUSPENDED`;
- preservare lo stato corrente dell'asta;
- mantenere i telecomandi in sola lettura durante la sospensione;
- richiedere una ripresa esclusivamente manuale dal banditore;
- predisporre le causali di sospensione previste dalla roadmap;
- integrare il boundary di backup previsto per la sospensione.

Fonte autoritativa completa:

docs/FANTA_ASTA_APP_SPEC.md
