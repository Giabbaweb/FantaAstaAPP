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

**Stato:** `SUPERSEDED`  
**Sostituita da:** ADR-025 
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

---

# ADR-025 — Una sola sessione operativamente attiva per lega

**Stato:** `ACCEPTED` 
**Data:** 2026-07  
**Ambito:** Gestione dello stato operativo

## Contesto

ADR-020 stabiliva che una sola sessione per installazione potesse trovarsi in uno stato operativamente attivo.

Durante l’implementazione delle sessioni d’asta è emersa la necessità di supportare più leghe indipendenti nella stessa installazione, senza imporre un vincolo globale non richiesto dal dominio.

Una sessione della SFL’92 e una sessione della Lega Ambrosiana 1989, per esempio, devono poter essere entrambe operative senza entrare in conflitto, perché appartengono a leghe differenti.

Il vincolo deve invece impedire che la stessa lega possieda contemporaneamente più sessioni operative.

## Decisione

ADR-020 viene sostituita.

Possono esistere contemporaneamente più sessioni operativamente attive nella stessa installazione, purché appartengano a leghe differenti.

Per ciascuna lega può esistere al massimo una sessione in uno dei seguenti stati:

```text
READY
RUNNING
SUSPENDED
```

---

# ADR-026 — Partecipazione delle squadre alla sessione e crediti iniziali per squadra

**Stato:** `ACCEPTED`
**Data:** 2026-07
**Ambito:** Configurazione della sessione d’asta

## Contesto

Le squadre sono entità permanenti appartenenti a una lega e possono partecipare a più sessioni d’asta nel corso delle stagioni.

La partecipazione di una squadra a una specifica sessione contiene però informazioni che non appartengono né alla squadra permanente né alla lega, come:

- l’effettiva partecipazione alla sessione;
- i crediti iniziali assegnati per quella sessione;
- la configurazione operativa specifica della sessione.

Memorizzare queste informazioni direttamente nella tabella `teams` impedirebbe di mantenere configurazioni differenti tra stagioni e comprometterebbe la conservazione dello storico.

## Decisione

Introdurre l’entità:

```text
auction_session_teams
```

come relazione esplicita tra:

```text
auction_sessions
teams
```

Ogni record rappresenta la partecipazione di una squadra a una specifica sessione d’asta.

La partecipazione deve essere univoca per la coppia:

```text
auctionSessionId
teamId
```

I crediti iniziali della squadra vengono memorizzati nella partecipazione alla sessione e non nella squadra permanente.

Il valore iniziale può essere copiato dal valore predefinito della sessione al momento della creazione della partecipazione, ma rimane configurabile in modo indipendente per ciascuna squadra.

Questo consente di gestire casi come:

- crediti differenti dovuti a rinnovi o conferme;
- bonus o penalizzazioni amministrative;
- regole specifiche della lega;
- correzioni manuali eccezionali.

La rimozione di una squadra da una sessione elimina soltanto la partecipazione e non la squadra permanente.

## Conseguenze

### Positive

- Separazione chiara tra identità permanente della squadra e configurazione della singola sessione.
- Conservazione coerente dello storico tra stagioni differenti.
- Supporto a crediti iniziali diversi per ciascuna squadra.
- Riutilizzo della stessa squadra in più sessioni d’asta.
- Base solida per roster, saldi, acquisti e statistiche future.

### Negative

- È necessaria un’entità relazionale aggiuntiva.
- Le operazioni sulla sessione devono verificare l’esistenza della partecipazione.
- I dati della squadra e quelli della partecipazione devono essere caricati e combinati.
- La rimozione della partecipazione deve rispettare lo stato della sessione e gli eventuali dati operativi collegati.

---

# ADR-027 — Proprietà della squadra e presidente principale

**Stato:** `ACCEPTED`
**Data:** 2026-07
**Ambito:** Squadre, proprietari e responsabilità operative

## Contesto

Una fantasquadra può essere gestita da una sola persona oppure da più presidenti.

Nella stessa lega possono quindi esistere:

- squadre con un unico presidente;
- squadre con un presidente principale e uno o più co-presidenti;
- persone che devono essere conservate come entità permanenti, indipendentemente dalla singola sessione d’asta.

Collegare un solo proprietario direttamente alla squadra non permetterebbe di rappresentare correttamente le comproprietà e renderebbe più difficile associare in futuro telecomandi, autorizzazioni e responsabilità operative.

## Decisione

Modellare separatamente le entità:

```text
owners
teams
```

Un `owner` rappresenta una persona permanente registrata nella lega.

Una squadra può essere associata a uno o più proprietari.

Tra i proprietari associati a una squadra deve essere identificato un solo:

```text
primary owner
```

Il proprietario principale rappresenta il presidente ufficiale di riferimento della squadra.

Gli altri proprietari associati rappresentano eventuali co-presidenti.

Si applicano le seguenti regole:

- ogni squadra configurata deve avere almeno un proprietario;
- una squadra non può avere più di un proprietario principale;
- il proprietario principale deve appartenere ai proprietari associati alla squadra;
- la rimozione del proprietario principale richiede l’assegnazione di un nuovo principale oppure lascia temporaneamente la squadra in configurazione incompleta;
- l’identità dell’owner rimane indipendente dalle credenziali o dai PIN che verranno introdotti nelle milestone future.

La proprietà rappresenta il rapporto organizzativo permanente tra una persona e una squadra.

La partecipazione a una specifica sessione d’asta rimane invece rappresentata da:

```text
auction_session_teams
```

## Conseguenze

### Positive

- Supporto nativo a presidente e co-presidenti.
- Identità permanenti riutilizzabili tra stagioni differenti.
- Separazione chiara tra proprietà della squadra e partecipazione alla sessione.
- Base solida per autorizzazioni, telecomandi e funzionalità di audit.
- Identificazione esplicita del referente principale della squadra.

### Negative

- Sono necessari controlli di coerenza aggiuntivi.
- Le operazioni di assegnazione e rimozione devono preservare l’unicità del proprietario principale.
- Una squadra può trovarsi temporaneamente in configurazione incompleta.
- Le future regole di accesso dovranno distinguere tra owner, primary owner e dispositivo collegato.

---

# ADR-028 — I calciatori appartengono alla sessione d’asta

**Stato:** `ACCEPTED`
**Data:** 2026-07
**Ambito:** Calciatori e liste stagionali

## Contesto

Le liste dei calciatori disponibili cambiano tra una stagione e l’altra.

Nel tempo possono cambiare:

* i calciatori presenti nella lista;
* il ruolo assegnato;
* il codice FMS;
* lo stato di disponibilità;
* le regole e le classificazioni adottate dalla lega.

Modellare i calciatori come entità globali permanenti richiederebbe la gestione di versioni storiche, trasferimenti tra stagioni e modifiche retroattive dei dati.

Una modifica alla lista corrente non deve alterare le sessioni concluse né compromettere la conservazione dello storico.

## Decisione

Ogni calciatore importato appartiene a una specifica sessione d’asta.

L’entità viene modellata come:

```text
players
```

con almeno i seguenti attributi:

```text
id
auctionSessionId
fmsCode
name
normalizedName
role
availabilityStatus
createdAt
updatedAt
```

Il codice FMS viene memorizzato come stringa e non come valore numerico.

Questo consente di:

* preservare eventuali zeri iniziali;
* trattarlo correttamente come identificatore;
* evitare conversioni numeriche non necessarie.

I ruoli persistiti sono:

```text
P
D
C
A
```

Il processo di importazione può accettare e normalizzare rappresentazioni equivalenti, come:

```text
POR
DIF
CEN
ATT
```

Gli stati di disponibilità inizialmente supportati sono:

```text
AVAILABLE
ROSTERED
UNAVAILABLE
```

Per ogni sessione devono essere univoci:

```text
fmsCode
normalizedName
```

Si applicano quindi i vincoli logici:

```text
UNIQUE(auctionSessionId, fmsCode)
UNIQUE(auctionSessionId, normalizedName)
```

I calciatori appartenenti a sessioni differenti sono entità distinte, anche quando rappresentano lo stesso calciatore reale.

## Conseguenze

### Positive

* Conservazione completa dello storico delle liste stagionali.
* Nessuna modifica retroattiva delle sessioni concluse.
* Importazioni indipendenti per ciascuna sessione.
* Vincoli di unicità semplici e delimitati alla sessione.
* Gestione diretta di ruoli e disponibilità specifici della stagione.

### Negative

* Lo stesso calciatore reale può essere duplicato tra sessioni differenti.
* Non è disponibile inizialmente un’anagrafica globale dei calciatori.
* Eventuali statistiche trasversali tra stagioni richiederanno una futura strategia di riconciliazione.
* Ogni nuova sessione richiede l’importazione della propria lista calciatori.

---

# ADR-029 — Le rose iniziali appartengono alla partecipazione della squadra alla sessione

**Stato:** `ACCEPTED`
**Data:** 2026-07
**Ambito:** Rose iniziali, contratti e partecipazione delle squadre

## Contesto

Una squadra è un’entità permanente della lega, mentre la sua rosa cambia tra una sessione d’asta e l’altra.

I calciatori confermati o già presenti all’inizio della sessione devono essere associati contemporaneamente:

* alla sessione d’asta;
* alla squadra partecipante;
* al calciatore della lista stagionale;
* al costo di acquisizione;
* all’anno di contratto;
* all’origine dell’assegnazione.

Collegare una rosa direttamente alla squadra permanente comprometterebbe lo storico e non permetterebbe di distinguere correttamente le diverse stagioni.

ADR-026 ha già introdotto:

```text
auction_session_teams
```

come entità che rappresenta la partecipazione di una squadra a una specifica sessione.

## Decisione

Introdurre l’entità:

```text
roster_entries
```

Ogni record rappresenta la presenza di un calciatore nella rosa di una squadra partecipante a una specifica sessione d’asta.

L’entità contiene almeno:

```text
id
auctionSessionTeamId
playerId
acquisitionCost
contractYear
source
createdAt
updatedAt
```

La relazione con la squadra deve avvenire attraverso:

```text
auction_session_teams
```

e non direttamente attraverso la squadra permanente.

Il calciatore associato deve appartenere alla stessa sessione d’asta della partecipazione della squadra.

Un calciatore può appartenere a una sola rosa all’interno della propria sessione.

Si applica quindi il vincolo:

```text
UNIQUE(playerId)
```

Gli anni di contratto inizialmente supportati sono:

```text
1
2
3
```

L’origine dell’assegnazione viene memorizzata nel campo:

```text
source
```

Il valore usato per le rose importate all’inizio della sessione è:

```text
INITIAL_ROSTER
```

Il modello deve poter supportare in futuro anche origini come:

```text
AUCTION
OPTION
MANUAL_ASSIGNMENT
TECHNICAL_CORRECTION
```

Il costo di acquisizione deve essere un intero maggiore o uguale a uno per i normali calciatori della rosa iniziale.

La gestione del terzo portiere in prestito a costo zero rimane esclusa da questa milestone e sarà disciplinata separatamente.

I crediti residui non vengono memorizzati direttamente.

Sono calcolati come:

```text
crediti iniziali della partecipazione
-
somma dei costi delle roster entries
```

I limiti iniziali della rosa sono:

```text
P 2
D 8
C 8
A 6
Totale 24
```

La loro parametrizzazione viene rinviata a una decisione futura.

## Conseguenze

### Positive

* Separazione chiara tra squadra permanente e rosa stagionale.
* Conservazione completa dello storico delle rose.
* Collegamento coerente con la partecipazione alla sessione.
* Supporto a costo, contratto e origine dell’assegnazione.
* Calcolo deterministico dei crediti residui.
* Base comune per rose iniziali e futuri acquisti d’asta.

### Negative

* Sono necessari controlli tra sessione del calciatore e sessione della squadra.
* Il saldo crediti deve essere calcolato interrogando le assegnazioni.
* I limiti della rosa sono inizialmente definiti nel dominio e non configurabili.
* La gestione del terzo portiere richiederà una decisione separata.
* Le modifiche a costi e contratti devono rispettare lo stato operativo della sessione.

---

# ADR-030 — Le importazioni utilizzano anteprima e applicazione atomica

**Stato:** `ACCEPTED`
**Data:** 2026-07
**Ambito:** Importazione di calciatori e rose iniziali

## Contesto

Le liste dei calciatori e le rose iniziali vengono fornite tramite file di testo con campi separati da tabulazioni.

I file possono contenere:

* righe incomplete;
* valori non validi;
* codici duplicati;
* ruoli non riconosciuti;
* squadre inesistenti;
* calciatori non presenti nella lista;
* costi o anni di contratto non validi;
* violazioni dei limiti di rosa o dei crediti disponibili.

Scrivere direttamente nel database durante la lettura del file potrebbe produrre importazioni parziali e lasciare la sessione in uno stato incoerente.

L’amministratore deve poter esaminare il risultato dell’analisi prima di confermare l’importazione.

## Decisione

Le importazioni vengono eseguite in due fasi distinte:

```text
File
↓
Parsing
↓
Validazione
↓
Anteprima
↓
Conferma esplicita
↓
Applicazione atomica
```

La fase di anteprima:

* legge il contenuto;
* normalizza i valori;
* valida ogni riga;
* rileva duplicati e conflitti;
* produce un rapporto;
* non modifica il database.

Ogni errore di riga deve contenere almeno:

```text
lineNumber
field
code
message
rawValue
```

Il rapporto deve distinguere almeno:

```text
totalRows
validRows
invalidRows
errors
```

L’applicazione richiede una conferma esplicita e deve rieseguire le validazioni necessarie.

Tutte le modifiche dell’importazione vengono eseguite all’interno di una singola transazione database.

Se una qualsiasi operazione fallisce:

```text
ROLLBACK
```

deve annullare l’intera importazione.

Non sono ammesse importazioni parziali.

Il formato canonico della lista calciatori è:

```text
FmsCode<TAB>Role<TAB>Name
```

Il formato canonico della rosa iniziale è:

```text
TeamIdentifier<TAB>FmsCode<TAB>Cost<TAB>ContractYear
```

I file canonici non richiedono una riga di intestazione.

Il parser può supportare normalizzazioni esplicitamente definite, ma non deve correggere silenziosamente valori ambigui.

Un eventuale registro persistente delle importazioni può memorizzare informazioni riepilogative come:

```text
id
auctionSessionId
type
filename
totalRows
importedRows
rejectedRows
createdAt
```

La memorizzazione integrale delle righe originali non è richiesta in questa milestone.

## Conseguenze

### Positive

* Nessuna modifica al database durante l’anteprima.
* Possibilità di correggere il file prima della conferma.
* Errori localizzati per riga e campo.
* Importazioni completamente atomiche.
* Protezione contro dati parziali o incoerenti.
* Flusso riutilizzabile per lista calciatori e rose iniziali.

### Negative

* Parsing e validazione devono essere eseguiti almeno due volte oppure protetti da un meccanismo equivalente.
* Il file può cambiare tra anteprima e applicazione.
* È necessaria una struttura condivisa per i rapporti di importazione.
* Le importazioni di grandi dimensioni richiedono attenzione alle prestazioni.
* Il supporto a formati aggiuntivi dovrà essere introdotto esplicitamente.

---

# ADR-031 — Il motore d'asta è governato da una macchina a stati

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Gestione delle chiamate d'asta

## Contesto

La chiamata di un calciatore rappresenta il processo centrale dell'asta.

Durante il suo ciclo di vita possono verificarsi numerosi eventi:

* apertura della chiamata;
* rilanci;
* passaggio del turno;
* sospensione;
* ripresa;
* aggiudicazione provvisoria;
* conferma;
* annullamento;
* eventuale rollback.

Consentire transizioni arbitrarie tra questi stati renderebbe difficile garantire la coerenza dell'asta e aumenterebbe il rischio di comportamenti non prevedibili.

Il server deve essere l'unica autorità in grado di determinare l'evoluzione della chiamata.

## Decisione

Ogni chiamata d'asta è rappresentata da un aggregate `AuctionCall` governato da una macchina a stati esplicita.

Gli stati ammessi sono:

```text
DRAFT
OPEN
PROVISIONAL_AWARD
SUSPENDED
CONFIRMED
CANCELLED
ROLLED_BACK
```

Ogni cambiamento di stato può avvenire esclusivamente attraverso una funzione di dominio dedicata.

Le transizioni non previste devono produrre un errore esplicito e non modificare lo stato della chiamata.

L'assegnazione definitiva di un calciatore non avviene automaticamente.

Quando rimane un solo offerente valido la chiamata entra nello stato:

```text
PROVISIONAL_AWARD
```

La conferma definitiva richiede sempre un comando esplicito.

L'annullamento della chiamata segue le stesse regole di transizione definite dalla macchina a stati.

## Conseguenze

### Positive

* Stato della chiamata sempre coerente.
* Transizioni completamente deterministiche.
* Regole centralizzate nel dominio.
* Possibilità di testare ogni transizione in modo indipendente.
* Riduzione della logica distribuita tra service e route.

### Negative

* Ogni nuovo stato richiede l'aggiornamento della macchina a stati.
* Le nuove funzionalità devono rispettare le transizioni esistenti.
* Le modifiche al ciclo di vita richiedono l'aggiornamento dei test di dominio.

---

# ADR-032 — Il server governa il turno e il flusso della chiamata

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Svolgimento della chiamata d'asta

## Contesto

Durante una chiamata d'asta ogni squadra deve poter intervenire secondo un ordine ben definito.

L'applicazione deve garantire che:

* il turno venga rispettato;
* nessuna squadra possa intervenire fuori turno;
* il PASS abbia effetto solo sulla chiamata corrente;
* il flusso della chiamata sia identico per tutti i client collegati.

Delegare queste regole ai client produrrebbe facilmente stati divergenti e comportamenti incoerenti.

## Decisione

Il server mantiene in modo autoritativo lo stato della chiamata e determina in ogni istante quale squadra abbia il diritto di intervenire.

L'ordine di tavolo viene stabilito all'inizio della sessione d'asta e rimane invariato per tutta la durata della sessione.

La squadra chiamante apre la chiamata con l'offerta iniziale.

Successivamente il turno passa alla squadra immediatamente successiva nell'ordine di tavolo.

Ogni squadra, quando è il proprio turno, può esclusivamente:

* effettuare un rilancio valido;
* dichiarare PASS.

Una squadra che dichiara PASS viene esclusa dalla chiamata corrente e non può più effettuare rilanci.

L'annullamento del PASS può avvenire esclusivamente tramite un comando esplicito del server.

Quando il PASS viene annullato, la squadra torna nello stato attivo previsto dal dominio e il turno viene ricalcolato secondo le regole della chiamata.

Quando tutte le squadre, ad eccezione del leader corrente, risultano escluse o hanno dichiarato PASS, la chiamata entra nello stato:

```text
PROVISIONAL_AWARD
```

L'aggiudicazione definitiva richiede una conferma esplicita.

## Conseguenze

### Positive

* Un solo flusso operativo valido per tutti i client.
* Nessuna possibilità di rilanciare fuori turno.
* PASS e annullamento del PASS gestiti in modo deterministico.
* Stato della chiamata identico su tutti i dispositivi collegati.
* Riduzione delle verifiche lato client.

### Negative

* Tutte le operazioni devono transitare dal server.
* Ogni comando richiede la validazione del turno corrente.
* Eventuali modifiche alle regole del giro di tavolo devono essere implementate esclusivamente nel dominio.

---

# ADR-033 — Il massimo rilancio sostenibile limita la partecipazione alla chiamata

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Regole economiche dell'asta

## Contesto

Durante una chiamata ogni squadra può rilanciare esclusivamente entro i limiti dei crediti ancora disponibili.

L'applicazione deve garantire che una squadra possa sempre completare la propria rosa rispettando il numero minimo di giocatori ancora da acquistare.

Consentire offerte superiori alla reale capacità economica della squadra potrebbe rendere impossibile completare la rosa e produrre uno stato non valido della sessione.

## Decisione

Per ogni squadra viene calcolato il massimo rilancio sostenibile mediante la formula:

```text
remainingCredits - remainingRosterSlots + 1
```

dove:

* `remainingCredits` rappresenta i crediti ancora disponibili;
* `remainingRosterSlots` rappresenta i giocatori ancora necessari per completare la rosa.

Nessun rilancio può superare tale valore.

Quando l'offerta corrente raggiunge o supera il massimo sostenibile di una squadra, quella squadra viene automaticamente esclusa dalla chiamata corrente.

L'esclusione è limitata esclusivamente alla chiamata in corso e non modifica la partecipazione della squadra alla sessione d'asta.

## Conseguenze

### Positive

* Nessuna squadra può compromettere il completamento della propria rosa.
* I controlli economici risultano uniformi in tutto il sistema.
* L'esclusione automatica riduce le verifiche manuali durante l'asta.
* Il dominio garantisce sempre la validità dei rilanci.

### Negative

* Ogni rilancio richiede il ricalcolo delle squadre ancora abilitate.
* Eventuali modifiche future alla formula richiederanno l'aggiornamento del dominio e dei relativi test.

---

# ADR-034 — La chiamata d'asta viene persistita come aggregate coerente

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Persistenza del motore d'asta

## Contesto

Una chiamata d'asta non è costituita esclusivamente dallo stato della chiamata, ma comprende anche lo stato di partecipazione delle singole squadre.

Durante l'evoluzione della chiamata vengono modificati contemporaneamente:

* lo stato della chiamata;
* l'offerta corrente;
* il leader corrente;
* il turno corrente;
* lo stato di ciascuna squadra (ACTIVE, PASSED o EXCLUDED);
* l'eventuale motivo di esclusione.

Salvare tali informazioni in momenti diversi potrebbe produrre stati intermedi incoerenti e compromettere la corretta ripresa dell'asta.

## Decisione

La persistenza della chiamata d'asta viene gestita come un unico aggregate composto da:

* `AuctionCall`;
* `AuctionCallTeam`.

L'aggregate rappresenta l'intero stato operativo della chiamata.

Ogni modifica prodotta dal dominio viene salvata in un'unica operazione atomica.

Il repository è responsabile della lettura e della scrittura dell'intero aggregate e non di singole entità indipendenti.

La persistenza utilizza le tabelle:

```text
auction_calls
auction_call_teams
```

Le modifiche all'aggregate devono essere eseguite all'interno di una singola transazione database.

Le operazioni di lettura restituiscono sempre l'intero aggregate comprensivo della chiamata e di tutte le squadre partecipanti.

## Conseguenze

### Positive

* Stato della chiamata sempre consistente.
* Nessuna possibilità di leggere dati parzialmente aggiornati.
* Repository semplice e allineato al modello di dominio.
* Maggiore affidabilità nelle operazioni di ripresa della chiamata.
* Riduzione del rischio di incoerenze tra chiamata e squadre partecipanti.

### Negative

* Ogni modifica richiede il salvataggio dell'intero aggregate.
* L'evoluzione dell'aggregate richiede l'aggiornamento della relativa migrazione e del repository.
* Il repository risulta maggiormente accoppiato alla struttura del dominio.

---

# ADR-035 — Le API del motore d'asta utilizzano un modello a comandi espliciti

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** API HTTP del motore d'asta

## Contesto

Il motore d'asta espone operazioni che rappresentano azioni di dominio e non semplici modifiche di dati.

Operazioni come:

* apertura della chiamata;
* rilancio;
* PASS;
* annullamento del PASS;
* conferma dell'aggiudicazione;
* annullamento della chiamata;

producono transizioni di stato governate dal dominio e non possono essere rappresentate come semplici operazioni CRUD.

Un modello basato esclusivamente su `PUT` o `PATCH` renderebbe meno esplicito il significato delle operazioni e aumenterebbe il rischio di aggiornamenti non validi.

## Decisione

Le operazioni del motore d'asta vengono esposte come comandi espliciti.

Le API distinguono chiaramente:

* operazioni di lettura;
* operazioni di comando.

Le principali operazioni di lettura sono:

```text
GET /api/auction-calls/:id

GET /api/auction-sessions/:auctionSessionId/auction-call
```

Le operazioni che modificano lo stato della chiamata vengono esposte tramite:

```text
POST /api/auction-calls/:id/commands/:command
```

I comandi attualmente supportati sono:

```text
open
bid
pass
undo-pass
confirm
cancel
```

Ogni comando viene validato dal dominio prima dell'applicazione.

Gli errori vengono convertiti in risposte HTTP uniformi utilizzando un mapping centralizzato.

## Conseguenze

### Positive

* API allineate al linguaggio del dominio.
* Maggiore leggibilità delle operazioni disponibili.
* Riduzione della logica nelle route HTTP.
* Validazioni centralizzate nel dominio.
* Maggiore estendibilità per futuri comandi del motore d'asta.

### Negative

* Le API non seguono un modello CRUD puro.
* L'aggiunta di un nuovo comando richiede l'aggiornamento del dominio, del service e del mapping HTTP.
* I client devono conoscere i comandi supportati dal server.
