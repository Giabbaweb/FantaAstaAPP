# FantaAstaAPP — Specifica Master

**Stato:** progettazione approvata  
**Versione documento:** 1.0  
**Ambito:** FantaAstaAPP 1.0  
**Nome precedente:** AstaManager Evolution — denominazione abbandonata

## 1. Visione

FantaAstaAPP è un'applicazione locale per la gestione completa di un'asta di fantacalcio dal vivo. Deve funzionare senza Internet, su una rete Wi-Fi locale condivisa, con un PC del banditore, uno smartphone operatore per squadra, eventuali osservatori e uno schermo pubblico.

Obiettivi principali:

- governo completo dell'asta da parte del banditore;
- rilanci e PASS tramite smartphone;
- aggiornamento realtime di tutti i dispositivi;
- tracciabilità di comandi, eventi e correzioni;
- backup e recupero dopo interruzioni;
- esportazione delle rose nel formato FMS.

## 2. Regole della lega

### 2.1 Squadre e partecipanti

- Configurazione abituale: 8 squadre.
- Una squadra può avere due co-presidenti.
- Ogni squadra dispone di un solo dispositivo `OPERATOR` abilitato ai comandi.
- Altri dispositivi della stessa squadra possono collegarsi come `OBSERVER`, in sola lettura.

### 2.2 Crediti

- Crediti iniziali configurabili.
- Esempio storico: 330 crediti meno i costi dei giocatori rinnovati.
- Nessuna operazione può rendere impossibile completare la rosa.

### 2.3 Rosa ordinaria

| Ruolo | Quantità |
|---|---:|
| Portieri | 2 |
| Difensori | 8 |
| Centrocampisti | 8 |
| Attaccanti | 6 |
| **Totale** | **24** |

Il portiere aggiuntivo FMS:

- è fuori asta;
- non occupa uno dei 24 posti della rosa ordinaria;
- non è una `roster_entry`;
- non modifica crediti, slot o limiti di ruolo;
- viene selezionato separatamente per l’export FMS;
- deve essere un portiere della stessa sessione e non appartenere a una rosa;
- deve appartenere a una squadra reale rappresentata dai due portieri ordinari;
- non può essere selezionato da più partecipazioni;
- è selezionabile in `COMPLETED` o `CLOSED`;
- viene esportato con costo 0 e anno contratto 1.

### 2.4 Contratti

- Nuovo acquisto: anno contratto 1.
- Giocatore opzionato trattenuto: anno contratto 1.
- Giocatori già rinnovati: anno 2 o 3 secondo i dati importati.

## 3. Modalità dell'asta

L'asta si svolge a giro di tavolo prestabilito.

Il chiamante:

- sceglie il calciatore;
- effettua la prima offerta;
- non può aprire a 0;
- può rilanciare o fare PASS secondo le regole.

Il banditore:

- apre la chiamata;
- governa turno e correzioni;
- conferma sempre l'assegnazione finale;
- può operare per una squadra in modalità manuale;
- può sospendere e riprendere la sessione.

Non esistono PASS automatici, assegnazioni definitive automatiche o timeout operativi.

## 4. Rilanci

Pulsanti standard:

```text
+1
+2
+5
+10
custom
```

Ogni rilancio deve:

- provenire dal dispositivo autorizzato;
- essere eseguito nel turno corretto;
- superare l'offerta corrente;
- rispettare il massimo sostenibile;
- riferirsi alla versione corrente dello stato.

### 4.1 Massimo sostenibile

```text
maxBid = creditsRemaining - (freeSlots - 1)
```

Il sistema conserva almeno 1 credito per ogni posto ancora da riempire dopo l'acquisto corrente.

## 5. PASS

Il PASS:

- vale solo per il calciatore corrente;
- elimina la squadra dalla chiamata corrente;
- può essere annullato soltanto dal banditore;
- non si trasferisce alle chiamate successive.

Regola speciale del chiamante:

- può fare PASS soltanto dopo almeno un rilancio avversario.

Dopo `UNDO_PASS`:

- la squadra rientra al successivo turno naturale;
- non ottiene un turno immediato;
- il banditore può comunque usare `FORCE_TURN`.

## 6. Chiusura della chiamata

Quando il giro dovrebbe tornare alla squadra già miglior offerente:

```text
OPEN → PROVISIONAL_AWARD
```

Non viene concesso un altro turno al leader e non è consentito rilanciare contro se stessi.

In `PROVISIONAL_AWARD`:

- rilanci bloccati;
- PASS bloccati;
- il banditore può confermare, riaprire o annullare.

L'assegnazione diventa definitiva solo con `CONFIRM_AWARD` del banditore.

## 7. Stati della sessione

```text
SETUP
READY
RUNNING
SUSPENDED
COMPLETED
CLOSED
```

### 7.1 SUSPENDED e Pizza Break

`SUSPENDED` copre:

- Pizza Break;
- pausa organizzativa;
- pausa tecnica;
- problema di rete;
- sospensione volontaria;
- recovery dopo riavvio.

Durante la sospensione:

- la chiamata corrente viene congelata;
- offerta, leader, turno e PASS restano invariati;
- offerte e PASS sono bloccati;
- i telecomandi restano in sola lettura;
- lo schermo pubblico mostra la pausa;
- lo stato viene salvato;
- viene creato un backup;
- la ripresa è esclusivamente manuale.

Causali:

```text
PIZZA_BREAK
TECHNICAL_BREAK
ORGANIZATIONAL_BREAK
NETWORK_ISSUE
OTHER
```

Flusso tipico:

```text
RUNNING
  ↓
SUSPENDED — PIZZA_BREAK
  ↓
RUNNING
```

La sessione non riprende mai automaticamente.

## 8. Stati della chiamata

```text
DRAFT
OPEN
PROVISIONAL_AWARD
SUSPENDED
CONFIRMED
CANCELLED
ROLLED_BACK
```

## 9. Stati squadra nella chiamata

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

Regola fondamentale:

```text
DISCONNECTED ≠ PASSED
```

## 10. Architettura

```text
PC banditore
├─ Server Node.js
├─ Motore d'asta
├─ Database SQLite
├─ UI amministratore
├─ UI telecomando
├─ Schermo pubblico
├─ WebSocket server
├─ Import/export
├─ Backup/recovery
└─ Launcher
```

Percorsi:

```text
/admin
/remote
/public
```

Stack approvato:

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

Principio:

```text
Command → Validation → Event → State update → Realtime broadcast
```

Il server è autoritativo.

## 11. Rete locale

Tutti i dispositivi devono essere sulla stessa rete Wi-Fi locale. Internet non è necessario.

Configurazioni previste:

1. router domestico esistente;
2. router dedicato;
3. hotspot di emergenza.

Router dedicato consigliato in fase progettuale:

```text
GL.iNet Opal GL-SFT1200
```

Capacità target: circa 18 client contemporanei.

## 12. Interfacce

### 12.1 `/admin`

- configurazione lega;
- import giocatori;
- gestione squadre;
- apertura chiamata;
- controllo turno;
- undo PASS;
- force turn;
- conferma assegnazione;
- riapertura o annullamento;
- assegnazione manuale;
- sospensione e ripresa;
- export;
- backup e recovery.

### 12.2 `/remote`

Accesso tramite squadra, PIN e ruolo.

`OPERATOR`:

- rilanci;
- PASS;
- stato realtime.

`OBSERVER`:

- sola lettura;
- nessun comando.

Fuori turno, i pulsanti sono disabilitati. Il PASS richiede conferma.

### 12.3 `/public`

Per ogni squadra mostra:

- crediti residui;
- P, D, C, A acquistati;
- posti liberi;
- stato della chiamata.

Esempio:

```text
P 2/2
D 5/8
C 4/8
A 3/6
```

Modalità:

```text
STANDARD
HIGH_CONTRAST_OUTDOOR
COMPACT
```

La modalità outdoor usa sfondo nero, testo bianco, evidenziazioni giallo/arancio, stato vincente verde e caratteri grandi.

## 13. UX del Pizza Break

Comando amministratore:

```text
SOSPENDI SESSIONE
```

Schermo pubblico:

```text
ASTA TEMPORANEAMENTE SOSPESA

🍕 PIZZA BREAK 🍕

La sessione riprenderà
su indicazione del banditore
```

Telecomandi:

```text
SESSIONE IN PAUSA

Pizza Break

Le offerte sono temporaneamente bloccate.
La situazione dell'asta è stata salvata.
```

Ripresa:

```text
RIPRENDI SESSIONE
```

Prima della ripresa il sistema verifica server, database, chiamata, turno, stato e connessioni.

## 14. Modello dati principale

Entità previste:

- leagues
- teams
- participants
- devices
- players
- roster_entries
- auction_sessions
- auction_calls
- call_team_states
- bids
- pass_actions
- auction_events
- command_registry
- snapshots
- imports
- exports

La gestione automatica delle opzioni è rinviata alla versione 1.1.

## 15. Comandi principali

```text
PLACE_BID
PASS_TEAM
UNDO_PASS
FORCE_TURN
OPEN_CALL
SUSPEND_CALL
REOPEN_CALL
CONFIRM_AWARD
CANCEL_CALL
SUSPEND_SESSION
RESUME_SESSION
MANUAL_ASSIGNMENT
```

## 16. Eventi principali

```text
CALL_OPENED
BID_ACCEPTED
TEAM_PASSED
PASS_UNDONE
TURN_CHANGED
PROVISIONAL_AWARD_REACHED
AWARD_CONFIRMED
CALL_CANCELLED
SESSION_SUSPENDED
SESSION_RESUMED
MANUAL_ASSIGNMENT_CONFIRMED
```

## 17. Idempotenza e concorrenza

Ogni comando contiene:

```text
commandId
stateVersion
```

- Un `commandId` duplicato viene ignorato.
- Uno stato obsoleto viene rifiutato con `STALE_STATE`.
- I comandi vengono elaborati sequenzialmente.
- Non sono ammesse modifiche concorrenti dello stato.

## 18. Conferma assegnazione

Transazione unica:

1. verifica stato;
2. creazione voce rosa;
3. sottrazione crediti;
4. occupazione slot;
5. assegnazione giocatore;
6. chiusura chiamata;
7. registrazione evento;
8. backup.

## 19. Assegnazione manuale

Inclusa nella versione 1.0.

Campi:

- giocatore;
- squadra;
- costo;
- anno contratto;
- causale.

Causali:

```text
OPTION_EXERCISED_MANUALLY
OPTION_NO_EXTERNAL_BID
TECHNICAL_CORRECTION
OTHER
```

Deve validare disponibilità del giocatore, crediti, slot, limiti di rosa e sostenibilità.

## 20. Giocatori opzionati

Versione 1.0: gestione manuale tramite `MANUAL_ASSIGNMENT` prima dell'asta ordinaria.

Versione 1.1:

- titolare opzione escluso dai rilanci;
- partecipano le altre squadre;
- diritto di trattenere a offerta vincente + 1;
- senza offerte, assegnazione a 1;
- contratto anno 1.

## 21. Import/export FMS

File sorgenti:

- testo TAB-separated;
- archivio con codice FMS;
- rose con squadre, presidenti, costi e contratti.

Export:

```text
Role<TAB>Name<TAB>Cost<TAB>ContractYear
```

- nessuna intestazione;
- rosa ordinaria: `2 P / 8 D / 8 C / 6 A`, totale 24;
- file FMS finale: `3 P / 8 D / 8 C / 6 A`, totale 25 righe;
- il 25° giocatore è il portiere aggiuntivo FMS export-only;
- il portiere aggiuntivo è esportato con costo `0` e anno contratto `1`;
- i file delle squadre possono essere generati singolarmente o per l’intera sessione;
- l’export session-wide rispetta `tableOrder`.

## 22. Backup e recovery

- backup dopo assegnazioni importanti;
- backup alla sospensione;
- snapshot periodici;
- log eventi;
- ripristino controllato.

Dopo un riavvio con chiamata interrotta, la sessione viene caricata in `SUSPENDED`.

Il banditore sceglie:

- riprendi;
- annulla;
- recovery mode.

Nessun auto-resume.

## 23. Invarianti

1. Un giocatore appartiene a una sola rosa.
2. Massimo 2 P, 8 D, 8 C, 6 A.
3. Massimo 24 giocatori ordinari.
4. Crediti mai negativi.
5. Rosa sempre completabile.
6. Una sola chiamata attiva o sospesa.
7. Una chiamata aperta ha un leader valido dopo la prima offerta.
8. L'offerta corrente coincide con l'ultima valida.
9. Una squadra in PASS non può rilanciare.
10. Un osservatore non può inviare comandi.
11. Una disconnessione non equivale a PASS.
12. Una sessione sospesa non accetta comandi d'asta.
13. La ripresa richiede azione esplicita del banditore.

## 24. Roadmap sintetica

- **0.1:** fondazioni tecniche.
- **0.2:** configurazione lega e import.
- **0.3:** motore d'asta.
- **0.4:** telecomandi realtime.
- **0.5:** assegnazioni transazionali.
- **0.6:** schermo pubblico.
- **0.7:** sospensione, Pizza Break e resilienza.
- **0.8:** assegnazioni manuali e correzioni.
- **0.9:** FMS, backup e recovery.
- **1.0:** collaudo e rilascio.
- **1.1:** opzioni automatiche.

## 25. Approvazione

Sono approvate le Fasi 1–7. La progettazione funzionale e tecnica di FantaAstaAPP 1.0 è conclusa.

Il passo successivo è l'implementazione della Versione 0.1.
