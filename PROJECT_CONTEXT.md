# PROJECT_CONTEXT — FantaAstaAPP

## Identità

- **Nome definitivo:** FantaAstaAPP
- **Tipo:** applicazione locale per asta fantacalcio dal vivo
- **Stato:** Milestone 3 completata
- **Prossimo obiettivo:** Versione 0.4 – League Configuration

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

- Versione 1.0: gestione manuale con `MANUAL_ASSIGNMENT`.
- Versione 1.1: automazione completa del flusso d'asta.

## Export FMS

```text
Role<TAB>Name<TAB>Cost<TAB>ContractYear
```

Nessuna intestazione. Terzo portiere escluso.

## Stato attuale

Completato fino alla Versione 0.3:

1. struttura del repository;
2. backend Fastify;
3. frontend React + Vite;
4. SQLite + Drizzle ORM;
5. schema iniziale del database;
6. endpoint `/api/health`;
7. endpoint `/api/db-health`;
8. gestione delle leghe;
9. gestione delle sessioni d'asta;
10. ciclo di vita delle sessioni;
11. contratti condivisi;
12. validazioni di dominio;
13. API REST complete;
14. test di integrazione.

Prossimo obiettivo:

```text
Versione 0.4 — League Configuration
```

Fonte autoritativa completa:

```text
docs/FANTA_ASTA_APP_SPEC.md
```
