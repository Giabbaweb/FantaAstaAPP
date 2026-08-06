# PROJECT_CONTEXT — FantaAstaAPP

## Identità

- **Nome definitivo:** FantaAstaAPP
- **Tipo:** applicazione locale per asta fantacalcio dal vivo
- **Stato:** Milestone 7 completata
- **Versione corrente:** v0.7.0
- **Prossimo obiettivo:** Versione 0.8 – Conferma assegnazioni e transazioni

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

## Stato implementativo della v0.7.0

Sono completati tutti gli elementi della v0.6.0 e inoltre:

- bootstrap Socket.IO integrato con Fastify;
- modello di identità delle connessioni realtime;
- connection manager;
- stanze per sessione, squadra, operatori e osservatori;
- registrazione dei dispositivi;
- autenticazione delle squadre tramite PIN;
- ruoli `OPERATOR` e `OBSERVER`;
- una sola connessione operativa per squadra;
- publisher realtime astratto;
- publisher Socket.IO;
- contratti degli eventi d'asta;
- snapshot autorevole dell'asta;
- invio dello snapshot dopo la registrazione;
- event dispatcher;
- snapshot dispatcher;
- sincronizzazione dopo ogni comando confermato;
- `stateVersion` persistente sulla sessione;
- command registry persistente;
- esecuzione atomica dei comandi;
- controllo ottimistico della concorrenza;
- idempotenza tramite `commandId`;
- rilevazione dei comandi obsoleti tramite `STALE_STATE`;
- rilevazione del riuso incompatibile tramite `COMMAND_ID_CONFLICT`;
- rollback transazionale verificato;
- command handler di dominio condiviso;
- atomic auction call command service;
- protocollo HTTP atomico;
- protocollo Socket.IO `auction:command`;
- socket command handler;
- autorizzazione per ruolo, squadra e sessione;
- observer in sola lettura;
- comandi telecomando `BID`, `PASS` e `UNDO_PASS`;
- nessuna associazione tra disconnessione e PASS;
- mapping uniforme degli errori atomici;
- 27 file di test server;
- 187 test server verdi.

## Protocollo dei comandi

Ogni comando di modifica contiene:

commandId
stateVersion

Pipeline autoritativa:

validazione
→ controllo idempotenza
→ controllo stateVersion
→ applicazione dominio
→ persistenza aggregate
→ incremento stateVersion
→ registrazione comando
→ commit
→ evento realtime
→ snapshot autorevole

Un retry identico restituisce il risultato persistito con:

idempotentReplay: true

senza ripubblicare evento o snapshot.

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

Versione 0.8 — Conferma assegnazioni e transazioni:

- trasformare l'aggiudicazione provvisoria in assegnazione definitiva;
- verificare leader, crediti e slot;
- creare la voce di rosa;
- sottrarre i crediti;
- aggiornare la disponibilità del giocatore;
- chiudere la chiamata;
- registrare l'operazione;
- garantire rollback completo;
- creare il punto di backup dopo l'operazione critica.

Fonte autoritativa completa:

docs/FANTA_ASTA_APP_SPEC.md
