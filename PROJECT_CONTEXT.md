# PROJECT_CONTEXT — FantaAstaAPP

## Identità

- **Nome definitivo:** FantaAstaAPP
- **Tipo:** applicazione locale per asta fantacalcio dal vivo
- **Stato:** Milestone 8 completata
- **Versione corrente:** v0.8.0
- **Prossimo obiettivo:** Versione 0.9 – Schermo pubblico

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

## Stato implementativo della v0.8.0

Sono completati tutti gli elementi della v0.7.0 e inoltre:

- validazione di dominio dell'aggiudicazione definitiva;
- repository transazionali necessari alla conferma;
- servizio transazionale per l'assegnazione confermata;
- creazione atomica della voce di rosa;
- aggiornamento atomico dei crediti residui;
- aggiornamento atomico del giocatore a `ROSTERED`;
- verifica della disponibilità del giocatore;
- verifica dei crediti;
- verifica degli slot di rosa;
- verifica dei limiti per ruolo;
- verifica della completabilità della rosa;
- rollback completo in caso di errore;
- mapping HTTP degli errori di conferma;
- tabella persistente `auction_events`;
- repository transazionale degli eventi d'asta;
- audit di dominio separato dal `command_registry`;
- evento persistente `AUCTION_AWARD_CONFIRMED`;
- audit incluso nella stessa transazione della conferma;
- nessun audit residuo dopo rollback;
- evento realtime e snapshot pubblicati solo dopo commit;
- boundary post-commit `AuctionBackupRequester`;
- implementazione `NoopAuctionBackupRequester`;
- nessuna richiesta di backup duplicata sui replay idempotenti;
- fallimento della richiesta di backup isolato dal comando committato;
- 31 file di test server;
- 217 test server verdi;
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

Versione 0.9 — Schermo pubblico:

- visualizzare lo stato dell'asta su uno schermo condiviso;
- mostrare giocatore chiamato, prezzo, leader e turno;
- mostrare crediti residui e posti liberi;
- mostrare P/D/C/A acquistati;
- mostrare lo stato della sessione;
- supportare modalità `STANDARD`;
- supportare modalità `HIGH_CONTRAST_OUTDOOR`;
- supportare modalità `COMPACT`;
- mantenere lo schermo pubblico in sola lettura;
- alimentare la UI tramite stato autorevole e realtime esistenti.

Fonte autoritativa completa:

docs/FANTA_ASTA_APP_SPEC.md
