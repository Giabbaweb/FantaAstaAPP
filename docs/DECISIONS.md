# Decisioni architetturali

Questo documento registra le principali decisioni architetturali di **FantaAstaAPP**.

Le decisioni vengono documentate nel formato ADR (*Architecture Decision Record*) per conservare il contesto, le motivazioni e le conseguenze delle scelte tecniche più importanti.

---

## Stato delle decisioni

Ogni decisione può avere uno dei seguenti stati:

| Stato | Significato |
|---|---|
| `PROPOSED` | Decisione proposta ma non ancora approvata |
| `ACCEPTED` | Decisione approvata e attiva |
| `SUPERSEDED` | Decisione sostituita da una successiva |
| `DEPRECATED` | Decisione non più raccomandata |
| `REJECTED` | Decisione valutata e non adottata |

---

# ADR-001 — Applicazione offline first

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Architettura generale

## Contesto

FantaAstaAPP deve essere utilizzata durante un’asta di fantacalcio dal vivo.

La qualità della connessione Internet non può essere considerata affidabile e un’interruzione della rete esterna non deve compromettere lo svolgimento dell’asta.

## Decisione

L’applicazione viene progettata secondo il principio **offline first**.

Il sistema deve funzionare interamente su una rete locale Wi-Fi, senza dipendere da servizi cloud durante l’asta.

Il server, il database, le interfacce e i dati operativi devono essere disponibili localmente.

## Conseguenze

### Positive

- L’asta può continuare senza Internet.
- I tempi di risposta dipendono soltanto dalla rete locale.
- I dati rimangono disponibili sul PC del banditore.
- Il sistema non dipende dalla disponibilità di servizi esterni.

### Negative

- Il PC del banditore diventa un componente critico.
- Backup e recovery devono essere gestiti localmente.
- La distribuzione degli aggiornamenti richiede una procedura dedicata.
- La rete Wi-Fi locale deve essere configurata correttamente.

---

# ADR-002 — Server autoritativo

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Gestione dello stato

## Contesto

Più dispositivi possono inviare rilanci, PASS e altri comandi quasi contemporaneamente.

Affidare ai client la gestione autonoma dello stato potrebbe produrre divergenze, conflitti o assegnazioni errate.

## Decisione

Il server è l’unica fonte autorevole dello stato dell’asta.

I client:

- mostrano lo stato ricevuto;
- raccolgono l’interazione dell’utente;
- inviano comandi;
- non modificano autonomamente lo stato definitivo.

Ogni comando deve essere validato dal server prima di produrre un cambiamento.

## Conseguenze

### Positive

- Tutti i dispositivi condividono lo stesso stato.
- Le regole vengono applicate in un solo punto.
- I client rimangono semplici.
- Audit e recovery risultano più affidabili.
- I comandi non validi possono essere rifiutati centralmente.

### Negative

- Un’interruzione del server blocca temporaneamente i comandi.
- Il server deve gestire correttamente concorrenza e idempotenza.
- È necessario prevedere backup e recovery robusti.

---

# ADR-003 — Node.js e TypeScript

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Linguaggio e runtime

## Contesto

Il progetto comprende backend, frontend, contratti condivisi e comunicazione realtime.

L’utilizzo di linguaggi differenti aumenterebbe la complessità e la duplicazione dei tipi.

## Decisione

Utilizzare:

```text
Node.js 20
TypeScript
```

per il backend e per i package condivisi.

Il frontend React utilizza anch’esso TypeScript.

## Conseguenze

### Positive

- Un solo linguaggio nell’intero monorepo.
- Tipi condivisibili tra server e client.
- Buon supporto per sviluppo web e realtime.
- Ecosistema maturo.
- Maggiore sicurezza durante il refactoring.

### Negative

- I tipi TypeScript non sostituiscono la validazione runtime.
- È necessario mantenere una configurazione TypeScript coerente.
- Alcune librerie possono avere tipi incompleti o incompatibili.

---

# ADR-004 — Fastify come framework backend

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Backend HTTP

## Contesto

Il backend deve offrire API HTTP, validazione, logging e una struttura modulare mantenendo un overhead limitato.

## Decisione

Utilizzare **Fastify** come framework HTTP.

## Conseguenze

### Positive

- Buone prestazioni.
- Architettura a plugin.
- Integrazione con logging strutturato.
- Supporto TypeScript.
- Validazione e serializzazione integrate.
- Struttura adatta a un backend modulare.

### Negative

- Alcuni esempi e middleware dell’ecosistema Node sono orientati a Express.
- È necessario rispettare il ciclo di vita e il modello plugin di Fastify.
- L’integrazione con alcune librerie richiede adattatori specifici.

---

# ADR-005 — React e Vite per il frontend

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Interfaccia web

## Contesto

L’applicazione deve offrire tre interfacce web:

```text
/admin
/remote
/public
```

Le interfacce devono essere rapide, responsive e utilizzabili su PC, smartphone e schermi pubblici.

## Decisione

Utilizzare:

```text
React
Vite
```

per il frontend.

## Conseguenze

### Positive

- Sviluppo rapido.
- Build frontend semplice.
- Buon supporto TypeScript.
- Ecosistema ampio.
- Possibilità di condividere componenti e servizi.
- Aggiornamento realtime agevole.

### Negative

- Lo stato client deve essere mantenuto sotto controllo.
- La UI non deve duplicare la logica di dominio.
- Sarà necessario curare l’esperienza su dispositivi e dimensioni differenti.

---

# ADR-006 — SQLite come database locale

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Persistenza

## Contesto

FantaAstaAPP deve funzionare localmente e senza un server database esterno.

Il carico previsto è limitato e proviene da un numero contenuto di dispositivi collegati sulla stessa rete.

## Decisione

Utilizzare **SQLite** come database locale.

Il file principale viene conservato in:

```text
data/database/
```

## Conseguenze

### Positive

- Nessun server database separato.
- Installazione semplice.
- Backup tramite copia controllata del file.
- Buone prestazioni per il carico previsto.
- Adatto a un’applicazione locale.
- Portabilità elevata.

### Negative

- La concorrenza in scrittura deve essere gestita con attenzione.
- Le operazioni critiche richiedono transazioni.
- Il file del database deve essere protetto e sottoposto a backup.
- Una futura architettura distribuita richiederebbe una rivalutazione.

---

# ADR-007 — Drizzle ORM

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Persistenza e migrazioni

## Contesto

L’accesso a SQLite deve essere tipizzato e lo schema deve evolvere attraverso migrazioni versionate.

## Decisione

Utilizzare **Drizzle ORM** per:

- definizione dello schema;
- query tipizzate;
- relazioni;
- migrazioni;
- transazioni.

## Conseguenze

### Positive

- Schema TypeScript vicino al database.
- Query fortemente tipizzate.
- Migrazioni versionabili.
- Overhead contenuto.
- Buona compatibilità con SQLite.

### Negative

- Il team deve conoscere API e convenzioni di Drizzle.
- Le migrazioni devono essere controllate prima dell’applicazione.
- Alcune query complesse possono richiedere SQL esplicito.

---

# ADR-008 — Monorepo pnpm

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Organizzazione del repository

## Contesto

Il progetto comprende più applicazioni e package condivisi.

Sono necessari contratti comuni tra backend e frontend e una gestione centralizzata delle dipendenze.

## Decisione

Organizzare il progetto come monorepo gestito da **pnpm workspaces**.

Struttura principale:

```text
apps/
├── server/
└── web/

packages/
├── contracts/
└── domain/
```

## Conseguenze

### Positive

- Dipendenze gestite centralmente.
- Tipi e contratti condivisi.
- Script comuni dalla root.
- Refactoring coordinato.
- Separazione chiara tra applicazioni e package.

### Negative

- Build e type checking devono rispettare l’ordine delle dipendenze.
- Una configurazione errata del workspace può bloccare più package.
- Gli script root devono essere mantenuti coerenti.

---

# ADR-009 — Dominio separato dall’infrastruttura

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Organizzazione del codice

## Contesto

Le regole dell’asta sono il nucleo più importante del progetto.

Legarle direttamente a Fastify, React o SQLite renderebbe il sistema più difficile da testare e modificare.

## Decisione

Mantenere la logica di dominio separata dall’infrastruttura.

Il dominio non deve dipendere direttamente da:

- Fastify;
- React;
- Socket.IO;
- Drizzle;
- SQLite;
- API HTTP.

## Conseguenze

### Positive

- Regole testabili in isolamento.
- Maggiore chiarezza.
- Riduzione dell’accoppiamento.
- Possibilità di sostituire componenti infrastrutturali.
- Migliore riutilizzo dei tipi e delle regole.

### Negative

- Richiede mapping tra dominio e persistenza.
- Introduce alcuni livelli applicativi aggiuntivi.
- È necessario evitare astrazioni premature.

---

# ADR-010 — Validazione runtime con Zod

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Validazione

## Contesto

TypeScript garantisce controlli durante lo sviluppo, ma i payload ricevuti tramite HTTP, import e realtime non sono affidabili a runtime.

## Decisione

Utilizzare **Zod** per validare:

- richieste HTTP;
- comandi realtime;
- variabili di ambiente;
- file importati;
- dati esterni;
- configurazioni.

## Conseguenze

### Positive

- Validazione runtime esplicita.
- Errori prevedibili.
- Schemi riutilizzabili.
- Inferenza dei tipi TypeScript.
- Maggiore sicurezza ai confini del sistema.

### Negative

- Possibile duplicazione con alcuni tipi del dominio.
- Gli schemi devono essere mantenuti aggiornati.
- La validazione introduce un piccolo overhead.

---

# ADR-011 — Socket.IO per il realtime

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Comunicazione realtime

## Contesto

Telecomandi, console amministratore e schermo pubblico devono ricevere aggiornamenti immediati.

Il sistema deve gestire connessioni, riconnessioni e broadcasting su una rete locale.

## Decisione

Utilizzare **Socket.IO** per la comunicazione realtime.

## Conseguenze

### Positive

- Gestione semplificata delle connessioni.
- Supporto alla riconnessione.
- Broadcasting e stanze.
- Buona integrazione con applicazioni web.
- Adatto al numero previsto di client.

### Negative

- Introduce un protocollo sopra WebSocket.
- Client e server devono utilizzare versioni compatibili.
- La riconnessione non deve essere interpretata come ripresa automatica dei comandi.
- Lo stato deve sempre essere risincronizzato dal server.

---

# ADR-012 — Elaborazione sequenziale e idempotente dei comandi

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Concorrenza

## Contesto

Due dispositivi possono inviare comandi quasi contemporaneamente.

Ritardi di rete, retry o doppi tocchi possono inoltre produrre duplicati.

## Decisione

Ogni comando dovrà contenere:

```text
commandId
stateVersion
```

I comandi vengono elaborati sequenzialmente.

Un comando duplicato viene ignorato o restituisce il risultato già noto.

Un comando riferito a una versione obsoleta dello stato viene rifiutato con:

```text
STALE_STATE
```

## Conseguenze

### Positive

- Riduzione delle condizioni di gara.
- Protezione dai comandi duplicati.
- Stato coerente su tutti i dispositivi.
- Maggiore tracciabilità.
- Comportamento prevedibile.

### Negative

- È necessario mantenere un registro dei comandi elaborati.
- I client devono gestire il rifiuto per stato obsoleto.
- Il flusso dei comandi diventa più strutturato.

---

# ADR-013 — Conferma manuale delle assegnazioni

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Regole operative dell’asta

## Contesto

Durante un’asta dal vivo possono verificarsi errori di comunicazione, incomprensioni o necessità di verifica da parte del banditore.

Un’assegnazione automatica definitiva potrebbe produrre errori difficili da correggere.

## Decisione

Il raggiungimento della migliore offerta produce uno stato di assegnazione provvisoria.

L’assegnazione diventa definitiva soltanto dopo la conferma esplicita del banditore.

```text
OPEN
  ↓
PROVISIONAL_AWARD
  ↓
CONFIRMED
```

## Conseguenze

### Positive

- Maggiore controllo operativo.
- Riduzione delle assegnazioni errate.
- Possibilità di riaprire o annullare la chiamata.
- Coerenza con il funzionamento reale dell’asta.

### Negative

- Richiede un’azione aggiuntiva del banditore.
- La chiamata rimane in attesa finché non viene confermata.
- La UI deve evidenziare chiaramente lo stato provvisorio.

---

# ADR-014 — Nessuna ripresa automatica dopo una sospensione

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Resilienza

## Contesto

Una sessione può essere sospesa per Pizza Break, problema tecnico, interruzione di rete o riavvio.

Una ripresa automatica potrebbe consentire comandi quando i partecipanti non sono pronti.

## Decisione

Una sessione sospesa non riprende mai automaticamente.

La ripresa richiede un’azione esplicita del banditore.

Dopo un riavvio con una sessione interrotta, il sistema deve caricare la sessione in stato:

```text
SUSPENDED
```

## Conseguenze

### Positive

- Nessun comando imprevisto dopo una pausa.
- Il banditore conserva il controllo.
- Maggiore sicurezza durante recovery e riconnessioni.
- Stato operativo chiaro per tutti i dispositivi.

### Negative

- La ripresa richiede sempre un intervento manuale.
- Il sistema deve mostrare chiaramente la causa della sospensione.
- Devono essere eseguiti controlli prima della ripresa.

---

# ADR-015 — Logging strutturato con Pino

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Osservabilità

## Contesto

Durante lo sviluppo e durante un’asta è necessario diagnosticare errori e ricostruire le operazioni eseguite.

## Decisione

Utilizzare **Pino** per il logging strutturato del backend.

I log significativi devono includere identificatori di contesto quando disponibili.

## Conseguenze

### Positive

- Log strutturati e facilmente analizzabili.
- Buona integrazione con Fastify.
- Overhead limitato.
- Migliore diagnosi degli errori.
- Supporto all’audit tecnico.

### Negative

- I file di log devono essere gestiti e ruotati.
- È necessario evitare dati sensibili.
- Logging e audit di dominio non devono essere confusi.

---

# ADR-016 — Testing con Vitest

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Qualità

## Contesto

Le regole dell’asta includono transizioni di stato, limiti economici e vincoli che richiedono test automatici affidabili.

## Decisione

Utilizzare **Vitest** per unit test e integration test.

## Conseguenze

### Positive

- Buona integrazione con TypeScript e Vite.
- Esecuzione rapida.
- Configurazione condivisibile nel monorepo.
- Adatto a dominio, backend e frontend.

### Negative

- I test devono essere mantenuti insieme al codice.
- Le integrazioni database richiedono ambienti isolati.
- I test non sostituiscono la simulazione completa dell’asta.

---

# ADR-017 — Versionamento semantico e Conventional Commits

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Processo di sviluppo

## Contesto

Il progetto viene sviluppato per milestone incrementali e necessita di una cronologia comprensibile.

## Decisione

Adottare:

- Semantic Versioning;
- Keep a Changelog;
- Conventional Commits;
- branch `develop` per lo sviluppo;
- branch `main` per le release stabili.

## Conseguenze

### Positive

- Cronologia leggibile.
- Release prevedibili.
- Changelog più semplice da mantenere.
- Separazione tra sviluppo e versione stabile.

### Negative

- Richiede disciplina nei commit.
- Versioni e documentazione devono essere aggiornate a ogni release.
- I merge devono essere controllati.

---

## Come aggiungere una nuova decisione

Ogni nuova decisione significativa deve usare la seguente struttura:

```markdown
# ADR-XXX — Titolo

**Stato:** `PROPOSED`  
**Data:** YYYY-MM  
**Ambito:** Area interessata

## Contesto

Descrizione del problema e dei vincoli.

## Decisione

Descrizione della scelta adottata.

## Conseguenze

### Positive

- Benefici.

### Negative

- Costi, limiti e rischi.
```

Le nuove decisioni devono essere aggiunte in fondo al documento.

Una decisione esistente non deve essere cancellata quando viene sostituita. Deve invece essere marcata come:

```text
SUPERSEDED
```

e deve indicare l’ADR che la sostituisce.

---

# ADR-018 — Perimetro della Milestone 3: gestione delle sessioni d’asta

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Pianificazione della Milestone 3

## Contesto

La Milestone 3 introduce la gestione delle sessioni d’asta. Il progetto comprende anche squadre, presidenti, calciatori, rilanci, Socket.IO, recovery e backup, ma includere contemporaneamente tutte queste funzionalità renderebbe la milestone troppo ampia e difficile da verificare.

È necessario definire un perimetro chiaro che consenta di costruire e testare il ciclo di vita delle sessioni prima di introdurre il motore operativo dell’asta.

## Decisione

La Milestone 3 riguarda esclusivamente:

- gestione delle leghe;
- creazione, lettura, modifica ed eliminazione controllata delle sessioni;
- persistenza delle sessioni;
- validazione dei dati;
- gestione delle transizioni di stato;
- contratti API condivisi;
- test delle regole di dominio e dei casi d’uso.

Sono escluse dalla Milestone 3:

- gestione completa di squadre e presidenti;
- importazione e gestione dei calciatori;
- motore d’asta;
- rilanci e PASS;
- Socket.IO;
- recovery operativo;
- backup automatici.

Le precondizioni delle transizioni saranno inizialmente limitate ai dati disponibili nella Milestone 3 e verranno rafforzate nelle milestone successive senza modificare il significato degli stati.

## Conseguenze

### Positive

- Perimetro di sviluppo chiaro e verificabile.
- Riduzione del rischio di introdurre funzionalità incomplete.
- Possibilità di testare il ciclo di vita prima del motore d’asta.
- Minore probabilità di refactoring estesi.

### Negative

- Alcune transizioni avranno inizialmente prerequisiti meno completi.
- La sessione non sarà ancora utilizzabile per svolgere un’asta reale.
- Alcune funzionalità previste dal dominio saranno rinviate.

---

# ADR-019 — Ciclo di vita rigido delle sessioni d’asta

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Dominio delle sessioni

## Contesto

Una sessione d’asta attraversa fasi operative differenti. Consentire modifiche arbitrarie allo stato tramite un campo generico renderebbe possibili passaggi incoerenti, riaperture accidentali e alterazioni dei dati storici.

## Decisione

Adottare la seguente macchina a stati:

```text
SETUP
  ↓ ready
READY
  ↓ start
RUNNING
  ├─ suspend → SUSPENDED
  └─ complete → COMPLETED

SUSPENDED
  └─ resume → RUNNING

COMPLETED
  └─ close → CLOSED
```

Sono consentite esclusivamente queste transizioni:

| Stato attuale | Comando | Nuovo stato |
|---|---|---|
| `SETUP` | `ready` | `READY` |
| `READY` | `start` | `RUNNING` |
| `RUNNING` | `suspend` | `SUSPENDED` |
| `SUSPENDED` | `resume` | `RUNNING` |
| `RUNNING` | `complete` | `COMPLETED` |
| `COMPLETED` | `close` | `CLOSED` |

Non sono previste transizioni inverse verso `SETUP`, riaperture da `COMPLETED` o `CLOSED`, né modifiche dirette del campo `status`.

La ripresa da `SUSPENDED` richiede sempre un comando esplicito del banditore, in coerenza con ADR-014.

La validazione delle transizioni appartiene al dominio e deve essere richiamata dal livello applicativo.

## Conseguenze

### Positive

- Ciclo di vita prevedibile e testabile.
- Impossibilità di impostare arbitrariamente lo stato.
- Maggiore sicurezza operativa.
- Coerenza con la sospensione e la ripresa manuale.
- Separazione tra comandi di dominio e aggiornamenti generici.

### Negative

- Eventuali correzioni di stato richiederanno procedure amministrative dedicate.
- Non è possibile riaprire una sessione completata o chiusa.
- Il frontend deve gestire azioni distinte per ogni transizione.

---

# ADR-020 — Una sola sessione operativamente attiva per installazione

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Gestione dello stato operativo

## Contesto

La stessa installazione di FantaAstaAPP può conservare sessioni di più leghe e più stagioni. Per esempio, possono coesistere nel database una sessione della SFL’92 e una della Lega Ambrosiana 1989 per la medesima stagione.

Tuttavia, l’installazione locale utilizza un solo server autoritativo, un solo flusso operativo principale, un solo schermo pubblico e un solo banditore attivo alla volta.

## Decisione

Possono esistere contemporaneamente più sessioni nel database, anche per la stessa stagione e per leghe differenti.

Una sola sessione per installazione può però trovarsi in uno degli stati operativamente attivi:

```text
READY
RUNNING
SUSPENDED
```

Le sessioni in `SETUP`, `COMPLETED` o `CLOSED` non sono considerate operative e possono coesistere senza limiti.

La regola viene verificata dal service applicativo prima delle transizioni che rendono attiva una sessione.

Viene prevista un’operazione per recuperare l’unica sessione attiva dell’installazione.

## Conseguenze

### Positive

- Supporto a più leghe e stagioni nello stesso archivio.
- Semplificazione futura di Socket.IO, recovery e schermo pubblico.
- Nessuna ambiguità sulla sessione operativa corrente.
- Possibilità di preparare una sessione mentre un’altra è archiviata.

### Negative

- Due aste non possono essere eseguite contemporaneamente dalla stessa installazione.
- La concorrenza deve essere controllata dal service e, in futuro, eventualmente rafforzata nel database.
- L’avvio di una sessione può essere rifiutato se un’altra è già attiva.

---

# ADR-021 — Entità League e identità della sessione

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Modello di dominio e persistenza

## Contesto

FantaAstaAPP deve gestire nel tempo più leghe, ciascuna con una sola asta annuale. Il nome della lega non deve essere duplicato in ogni sessione come semplice testo, perché la lega rappresenta un’entità stabile con uno storico di stagioni.

Ogni sessione deve essere riconoscibile mediante dati di business comprensibili e coerenti nel tempo.

## Decisione

Introdurre `League` come entità autonoma con il modello minimo:

```text
League
- id
- name
- createdAt
- updatedAt
```

La sessione d’asta utilizza il seguente modello minimo:

```text
AuctionSession
- id
- leagueId
- season
- editionNumber
- status
- initialCredits
- createdAt
- updatedAt
```

La sessione non possiede un campo `name`, perché per ogni lega esiste una sola asta annuale.

La rappresentazione visibile della sessione viene costruita dai dati della lega e della sessione, per esempio:

```text
SFL’92 — 2026/2027 — 35ª edizione
```

Per ogni lega devono essere rispettate entrambe le seguenti unicità:

```text
UNIQUE (leagueId, season)
UNIQUE (leagueId, editionNumber)
```

Il nome della lega deve essere univoco senza distinzione tra maiuscole e minuscole e ignorando gli spazi esterni usati accidentalmente durante l’inserimento.

## Conseguenze

### Positive

- Storico ordinato per lega e stagione.
- Prevenzione di stagioni o numeri di edizione duplicati.
- Possibilità di aggiungere in futuro configurazioni e loghi alla lega.
- Identità funzionale chiara per l’utente.
- Nessuna dipendenza da un nome arbitrario della sessione.

### Negative

- È necessaria una relazione tra leghe e sessioni.
- La rinomina di una lega si riflette sulla visualizzazione di tutte le sessioni storiche.
- La normalizzazione del nome deve essere gestita in modo coerente.

---

# ADR-022 — Immutabilità storica e modificabilità dei dati della sessione

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Integrità dei dati storici

## Contesto

Una sessione d’asta rappresenta un evento storico. Dopo il suo completamento, modifiche o cancellazioni potrebbero compromettere statistiche, export, audit e ricostruzione degli eventi.

Alcuni dati devono tuttavia poter essere corretti durante la preparazione o l’esecuzione dell’asta.

## Decisione

Una sessione può essere eliminata soltanto quando si trova in stato `SETUP`.

I campi strutturali:

```text
leagueId
season
editionNumber
```

sono modificabili esclusivamente in `SETUP`.

Il campo:

```text
initialCredits
```

è modificabile negli stati:

```text
SETUP
READY
RUNNING
SUSPENDED
```

ed è bloccato negli stati:

```text
COMPLETED
CLOSED
```

La modifica di `initialCredits` rappresenta una correzione della configurazione di base e non deve ricalcolare retroattivamente crediti spesi, acquisti o saldi delle squadre.

Le sessioni `COMPLETED` e `CLOSED` sono permanenti e in sola lettura. Una sessione chiusa non può essere riaperta.

Una lega non viene eliminata nella Milestone 3 e, in ogni caso, non potrà essere eliminata quando possiede sessioni collegate.

## Conseguenze

### Positive

- Protezione dello storico delle aste.
- Riduzione delle cancellazioni accidentali.
- Possibilità di correggere i crediti iniziali durante l’operatività.
- Base affidabile per statistiche, audit, export e backup.
- Distinzione futura tra configurazione iniziale e saldo operativo delle squadre.

### Negative

- Gli errori scoperti dopo `COMPLETED` richiederanno procedure correttive dedicate.
- Una sessione non può essere riutilizzata per ricominciare l’asta.
- La modifica dei campi deve dipendere dallo stato corrente.

---

# ADR-023 — API esplicite, contratti condivisi ed errori uniformi

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** API HTTP e contratti

## Contesto

Le API devono impedire aggiornamenti arbitrari dello stato, condividere tipi affidabili con il frontend e restituire errori prevedibili.

Un singolo endpoint generico per modificare lo stato renderebbe più difficile rappresentare i comandi del dominio e controllare le transizioni.

## Decisione

Esporre le seguenti API per le leghe:

```text
GET    /api/leagues
GET    /api/leagues/:id
POST   /api/leagues
PATCH  /api/leagues/:id
```

Nella Milestone 3 non viene esposto `DELETE /api/leagues/:id`.

Esporre le seguenti API per le sessioni:

```text
GET    /api/auction-sessions
GET    /api/auction-sessions/active
GET    /api/auction-sessions/:id
POST   /api/auction-sessions
PATCH  /api/auction-sessions/:id
DELETE /api/auction-sessions/:id
```

Le transizioni utilizzano comandi dedicati:

```text
POST /api/auction-sessions/:id/ready
POST /api/auction-sessions/:id/start
POST /api/auction-sessions/:id/suspend
POST /api/auction-sessions/:id/resume
POST /api/auction-sessions/:id/complete
POST /api/auction-sessions/:id/close
```

Il campo `status` non viene accettato né durante la creazione né nel `PATCH`. Alla creazione, il server assegna sempre `SETUP`.

I contratti e gli schemi Zod condivisi vengono definiti in:

```text
packages/contracts
```

Gli errori utilizzano una struttura uniforme:

```json
{
  "error": {
    "code": "AUCTION_SESSION_INVALID_TRANSITION",
    "message": "Cannot start an auction session from SETUP status.",
    "details": {}
  }
}
```

Codici HTTP principali:

| Caso | HTTP |
|---|---:|
| Creazione riuscita | `201` |
| Lettura o modifica riuscita | `200` |
| Cancellazione riuscita | `204` |
| Input non valido | `400` |
| Risorsa inesistente | `404` |
| Violazione di una regola di dominio | `409` |
| Errore interno | `500` |

## Conseguenze

### Positive

- Comandi di dominio espliciti.
- Contratti condivisi tra server e frontend.
- Errori stabili e gestibili dalla UI.
- Impossibilità di modificare direttamente lo stato.
- API più semplici da testare e documentare.

### Negative

- Numero maggiore di endpoint.
- Gli schemi e i DTO devono essere mantenuti coerenti.
- Il frontend deve gestire codici di errore applicativi specifici.

---

# ADR-024 — Architettura a livelli, vincoli database e commit atomici

**Stato:** `ACCEPTED`  
**Data:** 2026-07  
**Ambito:** Organizzazione del codice, persistenza e processo di sviluppo

## Contesto

Le regole delle sessioni devono rimanere separate da Fastify e SQLite, ma il database deve comunque proteggere l’integrità dei dati.

L’implementazione della Milestone 3 coinvolge dominio, schema, repository, service, route, contratti, test e documentazione. Modifiche troppo grandi in un singolo commit renderebbero difficile revisionare o annullare il lavoro.

## Decisione

Ogni richiesta segue il flusso:

```text
HTTP Request
      ↓
Route
      ↓
Service
      ↓
Domain
      ↓
Repository
      ↓
Database
```

Responsabilità:

- le route gestiscono HTTP e validazione dei payload;
- i service coordinano i casi d’uso e le transazioni;
- il dominio contiene regole pure e transizioni;
- i repository astraggono la persistenza;
- `packages/contracts` contiene DTO e schemi condivisi;
- `packages/domain` contiene logica indipendente dall’infrastruttura;
- il frontend utilizza esclusivamente le API.

Il database rafforza le regole con:

- chiavi primarie;
- chiavi esterne;
- `NOT NULL`;
- `CHECK` per stato e crediti iniziali positivi;
- unicità del nome normalizzato della lega;
- `UNIQUE (leagueId, season)`;
- `UNIQUE (leagueId, editionNumber)`.

La singola sessione attiva viene garantita dal service nella Milestone 3. Eventuali transazioni, lock o indici parziali specifici saranno valutati quando aumenteranno i requisiti di concorrenza.

L’implementazione viene suddivisa in commit piccoli e coerenti, separando almeno:

- dominio;
- schema e migrazioni;
- repository;
- service;
- API;
- test;
- documentazione;
- aggiornamento della versione.

## Conseguenze

### Positive

- Responsabilità chiare e codice testabile.
- Regole di dominio indipendenti dall’infrastruttura.
- Integrità rafforzata dal database.
- Commit facilmente revisionabili e revertibili.
- Cronologia Git comprensibile.

### Negative

- Maggiore numero di file e livelli applicativi.
- Sono necessari mapping tra dominio, DTO e persistenza.
- La garanzia della singola sessione attiva non è ancora duplicata a livello database.
- La suddivisione in commit richiede disciplina durante lo sviluppo.

