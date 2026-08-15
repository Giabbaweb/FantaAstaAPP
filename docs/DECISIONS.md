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

**Stato:** `SUPERSEDED`
**Sostituita da:** ADR-042
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

---

# ADR-036 — I contratti realtime sono condivisi e il protocollo utilizza comandi tipizzati

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Protocollo realtime e contratti condivisi

## Contesto

La comunicazione realtime introduce un ulteriore confine applicativo tra i client e il server.

I payload ricevuti tramite Socket.IO provengono da un confine non affidabile e devono essere validati prima di raggiungere i casi d'uso applicativi.

Definire eventi, acknowledgement e payload direttamente negli handler Socket.IO produrrebbe il rischio di:

* divergenze tra server e client;
* nomi degli eventi incoerenti;
* payload non validati;
* duplicazione dei metadati comuni ai comandi;
* accoppiamento dei contratti condivisi all'implementazione Socket.IO.

I comandi realtime devono inoltre conservare la stessa natura esplicita già adottata dalle API HTTP del motore d'asta.

## Decisione

I contratti del protocollo realtime vengono definiti in:

```text
packages/contracts
```

e validati tramite Zod.

I contratti condivisi non espongono oggetti infrastrutturali di Socket.IO.

Il protocollo distingue esplicitamente:

* registrazione della connessione;
* snapshot autorevole;
* eventi applicativi;
* comandi inviati dal client;
* acknowledgement del comando;
* errori realtime.

I comandi d'asta realtime utilizzano un envelope comune:

```text
auction:command
```

contenente i metadati comuni:

```text
commandId
stateVersion
```

e un comando appartenente a una union chiusa e tipizzata.

Il protocollo non accetta aggiornamenti arbitrari dello stato.

L'acknowledgement comunica al mittente l'esito del comando e rimane distinto dagli eventi e dagli snapshot che rappresentano lo stato autorevole stabilito dal server.

## Conseguenze

### Positive

* Server e client condividono gli stessi contratti.
* I payload vengono validati prima dell'esecuzione.
* I nomi degli eventi rimangono centralizzati.
* `commandId` e `stateVersion` hanno una semantica uniforme.
* L'acknowledgement non viene confuso con lo stato autorevole.
* Il protocollo può evolvere senza spostare regole di dominio nei transport.

### Negative

* Ogni modifica del protocollo richiede l'aggiornamento dei contratti condivisi.
* L'aggiunta di nuovi comandi richiede l'estensione esplicita della union e dei relativi test.
* Client e server devono utilizzare versioni compatibili dei contratti.

---

# ADR-037 — L'identità del dispositivo è distinta dalla connessione realtime

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Identità, registrazione e riconnessione realtime

## Contesto

Una connessione Socket.IO è temporanea.

Refresh del browser, perdita della rete o riconnessione producono un nuovo socket anche quando il dispositivo logico rimane lo stesso.

Il solo fatto che un client riesca a collegarsi al server locale non costituisce inoltre un'autorizzazione ad accedere allo stato operativo dell'asta o a inviare comandi.

È quindi necessario distinguere:

* identità della connessione;
* identità del dispositivo;
* partecipazione della squadra alla sessione;
* ruolo autorizzato della connessione.

## Decisione

`socketId` identifica esclusivamente una singola connessione Socket.IO.

`deviceId` identifica logicamente il dispositivo e può rimanere stabile tra connessioni successive.

Ogni nuova connessione nasce nello stato:

```text
UNREGISTERED
```

Una connessione non registrata non può utilizzare i comandi operativi dell'asta.

La registrazione richiede al server di validare le informazioni necessarie alla connessione, incluse:

```text
auctionSessionId
auctionSessionTeamId
deviceId
requestedRole
```

e le credenziali previste dal protocollo.

Solo dopo una registrazione valida la connessione assume lo stato:

```text
REGISTERED
```

e può essere associata alle room autorizzate.

Una riconnessione viene trattata come una nuova connessione:

* viene assegnato un nuovo `socketId`;
* l'identità viene rivalidata;
* l'autorizzazione viene rivalidata;
* le room vengono riassegnate;
* viene fornito nuovamente lo stato autorevole.

Nessuna autorizzazione viene dedotta dal solo `socketId` o da una registrazione precedente.

## Conseguenze

### Positive

* Le riconnessioni non riutilizzano autorizzazioni implicite.
* Il dispositivo può mantenere un'identità stabile pur cambiando socket.
* Una connessione non registrata non può accedere alle operazioni dell'asta.
* Refresh e perdita temporanea della rete possono essere gestiti senza modificare lo stato di dominio.
* Il server mantiene il controllo completo dell'autorizzazione.

### Negative

* Ogni riconnessione richiede una nuova registrazione applicativa.
* Il client deve conservare un `deviceId` stabile.
* La gestione della connessione richiede uno stato applicativo distinto dallo stato Socket.IO.

---

# ADR-038 — Il realtime è isolato per sessione tramite Socket.IO rooms

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Isolamento delle comunicazioni realtime

## Contesto

FantaAstaAPP può gestire sessioni operative appartenenti a leghe differenti.

Un broadcast Socket.IO globale potrebbe quindi inviare informazioni di un'asta a dispositivi collegati a una sessione differente.

Sono inoltre necessari canali che permettano di distinguere lo stato generale della sessione dalle comunicazioni destinate a una specifica partecipazione.

L'appartenenza a una room, tuttavia, non può essere considerata una prova sufficiente dell'autorizzazione a eseguire un comando.

## Decisione

Le comunicazioni realtime operative vengono isolate tramite Socket.IO rooms.

I nomi delle room vengono generati attraverso funzioni centralizzate e deterministiche.

Il protocollo utilizza almeno:

```text
session:<auctionSessionId>
team:<auctionSessionTeamId>
```

I broadcast relativi allo stato dell'asta vengono indirizzati alla sessione interessata e non vengono inviati globalmente a tutti i socket.

Le comunicazioni specifiche di una squadra possono utilizzare la relativa team room.

Gli handler non devono costruire autonomamente nomi di room quando esiste l'helper centralizzato.

L'appartenenza a una room non sostituisce mai:

* la registrazione;
* l'identità della connessione;
* il ruolo;
* la verifica dell'autorizzazione del comando.

## Conseguenze

### Positive

* Sessioni appartenenti a leghe differenti rimangono isolate.
* I broadcast non espongono stato a dispositivi non interessati.
* La convenzione dei nomi delle room rimane uniforme.
* Le comunicazioni di squadra possono essere indirizzate separatamente.
* Autorizzazione e routing rimangono responsabilità distinte.

### Negative

* Ogni registrazione valida deve gestire correttamente l'ingresso nelle room.
* Eventuali nuove categorie di destinatari richiederanno l'estensione controllata della convenzione.
* I test realtime devono verificare esplicitamente l'isolamento tra sessioni.

---

# ADR-039 — Il PIN operativo appartiene alla partecipazione della squadra alla sessione

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Autenticazione locale dei dispositivi

## Contesto

L'accesso operativo di un telecomando riguarda la partecipazione di una squadra a una specifica sessione d'asta.

Associare il PIN alla squadra permanente renderebbe la credenziale valida implicitamente anche per sessioni future e confonderebbe l'identità organizzativa della squadra con l'autorizzazione operativa della singola asta.

Il PIN attraversa inoltre un confine di autenticazione e non deve essere esposto nei log, negli snapshot o negli eventi realtime.

## Decisione

Il PIN operativo viene associato a:

```text
auction_session_teams
```

e quindi alla partecipazione della squadra a una specifica sessione d'asta.

Il PIN viene utilizzato durante la registrazione realtime per verificare che il dispositivo possa operare per quella partecipazione.

Il PIN:

* non viene incluso negli snapshot;
* non viene trasmesso nei broadcast;
* non viene conservato nei dati della connessione dopo la validazione;
* non viene scritto nei log applicativi;
* non viene restituito nei messaggi di errore.

La validazione del PIN non sostituisce le ulteriori verifiche di sessione, squadra e ruolo.

## Conseguenze

### Positive

* La credenziale operativa rimane delimitata alla singola sessione.
* Squadra permanente e accesso operativo rimangono concetti distinti.
* Il PIN non viene propagato nello stato realtime.
* La registrazione dei dispositivi può essere rivalidata a ogni connessione.
* Le future sessioni possono utilizzare credenziali differenti.

### Negative

* Ogni nuova partecipazione deve disporre della propria configurazione di accesso.
* Le procedure amministrative devono consentire la gestione del PIN della sessione.
* La protezione della credenziale richiede attenzione nei log e negli errori.

---

# ADR-040 — Ogni partecipazione può avere un solo OPERATOR e più OBSERVER in sola lettura

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Ruoli e autorizzazioni realtime

## Contesto

Una squadra può collegare più dispositivi alla rete locale, ma soltanto uno deve poter inviare comandi operativi per evitare ambiguità e doppi interventi.

Altri dispositivi possono essere utili come viste aggiuntive dello stato dell'asta, senza capacità di modifica.

La sola appartenenza a una room o la presenza di pulsanti nella UI non costituiscono una protezione sufficiente.

## Decisione

Per ogni `auctionSessionTeamId` può esistere al massimo un dispositivo registrato con ruolo:

```text
OPERATOR
```

Possono esistere più dispositivi registrati con ruolo:

```text
OBSERVER
```

Gli `OBSERVER` sono sempre in sola lettura.

L'autorizzazione viene verificata lato server per ogni comando e non viene dedotta dalla UI o dalla room di appartenenza.

Un `OPERATOR` può inviare esclusivamente comandi compatibili con la propria partecipazione.

Quando un nuovo socket con lo stesso `deviceId` sostituisce la connessione precedente, la registrazione può recuperare il ruolo operativo secondo le regole del connection manager.

Un dispositivo differente che richiede `OPERATOR` mentre ne esiste già uno attivo viene rifiutato con un errore applicativo esplicito.

La disconnessione di un `OPERATOR` non equivale mai a un comando `PASS`.

## Conseguenze

### Positive

* Una sola fonte di comandi di squadra per volta.
* Più dispositivi possono osservare la stessa asta.
* Le autorizzazioni sono applicate dal server.
* Refresh e riconnessioni dello stesso dispositivo possono essere gestiti senza duplicare operatori.
* La perdita della connessione non modifica il dominio della chiamata.

### Negative

* Il server deve mantenere il registro delle connessioni attive.
* La sostituzione dell'operatore richiede una politica esplicita.
* I client devono gestire il rifiuto `OPERATOR_ALREADY_CONNECTED`.

---

# ADR-041 — Lo snapshot autorevole è la base della sincronizzazione realtime

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Sincronizzazione dello stato realtime

## Contesto

Gli eventi incrementali non sono sufficienti a ricostruire in modo affidabile lo stato dopo:

* una riconnessione;
* un refresh;
* una perdita temporanea della rete;
* un comando rifiutato per stato obsoleto;
* l'apertura tardiva di un dispositivo.

Il client non deve tentare di ricostruire autonomamente lo stato definitivo dell'asta.

## Decisione

Il server produce uno snapshot autorevole della sessione d'asta.

Lo snapshot comprende lo stato operativo necessario ai client e include almeno:

```text
auctionSession
currentAuctionCall
auctionCallTeams
stateVersion
serverTime
connectionContext
```

Lo snapshot non rappresenta una copia indiscriminata delle tabelle del database.

Dopo una registrazione valida il client riceve lo stato autorevole della sessione.

La risincronizzazione utilizza nuovamente lo snapshot completo.

Gli eventi incrementali informano sui cambiamenti avvenuti, ma non sostituiscono lo snapshot come base di sincronizzazione.

Il client deve considerare lo stato ricevuto dal server come autoritativo.

## Conseguenze

### Positive

* Riconnessioni e refresh possono ricostruire lo stato senza dipendere dalla cronologia locale.
* Il client rimane semplice e non duplica la logica dell'asta.
* `stateVersion` permette di correlare snapshot e comandi.
* Lo stato trasmesso può essere limitato ai dati realmente necessari.
* La risincronizzazione dopo errori è deterministica.

### Negative

* La costruzione dello snapshot richiede query e mapping dedicati.
* Lo snapshot deve essere mantenuto coerente con l'evoluzione del modello.
* Payload completi sono più grandi dei singoli eventi incrementali.

---

# ADR-042 — La concorrenza dei comandi è gestita con stateVersion, transazioni atomiche e command registry persistente

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Concorrenza, idempotenza e consistenza dei comandi

## Contesto

ADR-012 prevedeva un'elaborazione sequenziale e idempotente dei comandi.

Durante l'implementazione del realtime è emerso che una coda applicativa in memoria per sessione non sarebbe sufficiente, da sola, a garantire:

* consistenza dopo un riavvio;
* protezione dai retry dopo riconnessione;
* deduplicazione persistente;
* controllo dello stato obsoleto;
* atomicità tra modifica dello stato e registrazione del comando.

È quindi necessario spostare la garanzia di consistenza sul confine transazionale autorevole.

## Decisione

ADR-012 viene sostituita.

La concorrenza dei comandi che modificano lo stato autorevole viene gestita mediante:

```text
commandId
stateVersion
transazione SQLite
command registry persistente
optimistic concurrency control
```

`stateVersion` appartiene alla sessione d'asta ed è memorizzata in:

```text
auction_sessions.state_version
```

Ogni comando autorevole deve dichiarare la versione dello stato sulla quale è stato costruito.

Se la versione ricevuta non coincide con quella corrente, il comando viene rifiutato con:

```text
STALE_STATE
```

Un comando accettato incrementa `stateVersion` una sola volta e nella stessa transazione delle altre modifiche persistenti.

Le connessioni, le disconnessioni e gli altri cambiamenti di sola presenza non incrementano `stateVersion`.

Ogni comando viene identificato da un `commandId` e registrato in modo persistente in:

```text
command_registry
```

Un retry coerente dello stesso comando non viene rieseguito e restituisce il risultato già noto.

Il riutilizzo dello stesso `commandId` con metadati o contenuto incompatibili viene rifiutato con:

```text
COMMAND_ID_CONFLICT
```

La v0.7.0 non introduce una coda applicativa dedicata per sessione.

La consistenza è garantita dal controllo ottimistico della versione e dalla transazione atomica sul database autorevole.

## Conseguenze

### Positive

* I comandi duplicati non vengono applicati due volte.
* La protezione rimane valida anche dopo il riavvio del processo.
* Uno stato obsoleto viene rilevato prima di applicare modifiche definitive.
* `stateVersion`, comando e stato persistito evolvono in modo coerente.
* Sessioni differenti non richiedono una coda globale condivisa.
* La strategia è compatibile con l'estensione futura dei casi d'uso atomici.

### Negative

* I client devono gestire `STALE_STATE` e risincronizzarsi.
* Il command registry introduce persistenza e logica aggiuntive.
* Comandi concorrenti costruiti sulla stessa versione possono produrre un rifiuto e richiedere un retry su stato aggiornato.
* Un'eventuale futura esigenza di ordinamento FIFO esplicito richiederà una decisione separata.

---

# ADR-043 — I comandi autorevoli condividono una pipeline atomica e pubblicano realtime solo dopo il commit

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Orchestrazione dei comandi e pubblicazione realtime

## Contesto

HTTP e Socket.IO rappresentano due transport differenti verso gli stessi casi d'uso applicativi.

Se ciascun transport eseguisse autonomamente la persistenza e il broadcast si potrebbero creare:

* regole duplicate;
* differenze tra comandi HTTP e realtime;
* eventi pubblicati prima della persistenza definitiva;
* doppi broadcast;
* aggiornamenti realtime relativi a transazioni poi fallite.

Le garanzie di `stateVersion`, idempotenza e command registry devono inoltre appartenere allo stesso confine atomico del comando.

## Decisione

I comandi autorevoli vengono coordinati attraverso una pipeline applicativa condivisa.

La pipeline segue concettualmente il flusso:

```text
transport
↓
command coordinator
↓
atomic command service
↓
atomic command executor
↓
SQLite transaction
↓
domain / repository writes
↓
stateVersion increment
↓
command registry
↓
COMMIT
↓
auction event
↓
authoritative snapshot
```

HTTP e Socket.IO non implementano copie indipendenti delle regole dell'asta.

Il dominio non conosce Socket.IO e non pubblica direttamente eventi realtime.

La pubblicazione di eventi e snapshot può avvenire esclusivamente dopo il completamento positivo della transazione.

Se la transazione fallisce:

```text
ROLLBACK
```

nessun evento realtime relativo al comando deve essere pubblicato.

Un retry idempotente che restituisce un risultato già registrato non deve generare una seconda pubblicazione dello stesso cambiamento.

Le route HTTP non devono contenere chiamate dirette a `io.emit()`.

## Conseguenze

### Positive

* HTTP e realtime condividono gli stessi casi d'uso.
* Nessun client osserva uno stato che non sia stato prima committato.
* Rollback e pubblicazione rimangono coerenti.
* La logica del dominio resta indipendente dal transport.
* La pipeline può essere estesa dalle milestone successive senza creare un percorso parallelo.
* I replay idempotenti non producono eventi duplicati.

### Negative

* L'orchestrazione richiede più componenti applicativi.
* I test devono distinguere chiaramente fase transazionale e fase post-commit.
* Gli effetti post-commit che falliscono richiedono una propria strategia di gestione e recovery.

---

# ADR-044 — La presenza realtime è separata dallo stato di dominio della chiamata

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Presenza dei dispositivi e stato dell'asta

## Contesto

La presenza online di un dispositivo è uno stato effimero della rete.

Lo stato di una squadra all'interno di una chiamata d'asta rappresenta invece una decisione di dominio persistente.

Confondere questi due concetti potrebbe produrre effetti pericolosi, per esempio interpretando una perdita di connessione come un `PASS` o modificando il turno a causa di un problema Wi-Fi.

La v0.6.0 rappresenta la partecipazione alla chiamata mediante stati come:

```text
ACTIVE
PASSED
EXCLUDED
```

mentre il realtime deve gestire separatamente connessioni e disconnessioni.

## Decisione

La presenza dei dispositivi viene mantenuta dal layer realtime e dal connection manager.

La disconnessione di un dispositivo:

* non produce `PASS`;
* non modifica lo stato di `AuctionCallTeam`;
* non modifica il leader;
* non modifica il turno;
* non incrementa `stateVersion`.

La riconnessione ripristina l'accesso attraverso una nuova registrazione e una nuova sincronizzazione autorevole.

Gli eventuali eventi di presenza destinati alle future interfacce amministrative rimangono distinti dagli eventi che rappresentano modifiche dello stato d'asta.

La persistenza di uno storico completo della presenza dei dispositivi non viene introdotta nella v0.7.0.

## Conseguenze

### Positive

* Problemi di rete non modificano il risultato dell'asta.
* Il dominio rimane indipendente da Socket.IO.
* `PASS` conserva esclusivamente il proprio significato applicativo.
* Reconnect e refresh possono essere gestiti senza correzioni del dominio.
* Le future UI amministrative possono mostrare la presenza come vista separata.

### Negative

* La presenza online deve essere ricostruita dopo il riavvio del server.
* Un pannello amministrativo completo richiederà ulteriori eventi o viste di presenza.
* Stato di rete e stato della chiamata devono essere combinati dalla UI quando necessario.

---

# ADR-045 — L’audit di dominio è persistito separatamente dal command registry

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Audit, persistenza e integrità delle operazioni d’asta

## Contesto

La pipeline autorevole dei comandi utilizza un `command_registry`
persistente per garantire idempotenza, controllo dei duplicati e
ricostruzione del risultato di un comando già applicato.

Il `command_registry` registra informazioni tecniche quali:

- `commandId`;
- tipo di comando;
- versione dello stato attesa;
- versione dello stato risultante;
- fingerprint della richiesta;
- aggregate risultante.

Queste informazioni sono necessarie all’infrastruttura dei comandi,
ma non costituiscono da sole un audit trail di dominio esplicito.

In particolare, una conferma di aggiudicazione deve poter essere
ricostruita semanticamente come operazione economica e di rosa,
senza dipendere dall’interpretazione del payload tecnico conservato
nel command registry.

La Milestone 8 richiede inoltre che la registrazione dell’operazione
faccia parte della stessa unità atomica che assegna il giocatore,
aggiorna i crediti, aggiorna la rosa e chiude la chiamata.

## Decisione

Introdurre un audit trail persistente di dominio separato dal
`command_registry`.

Gli eventi di dominio dell’asta vengono persistiti in una struttura
dedicata:

```text
auction_events
```

Il primo evento richiesto dalla Milestone 8 rappresenta la conferma
definitiva di un’aggiudicazione.

L’evento deve contenere almeno:

```text
auctionSessionId
auctionCallId
eventType
auctionSessionTeamId
playerId
amount
createdAt
```

Quando utili alla ricostruzione dell’operazione possono essere
persistiti anche dati economici direttamente collegati
all’assegnazione, come:

```text
creditsBefore
creditsAfter
```

La registrazione dell’evento di conferma deve avvenire nella stessa
transazione SQLite che:

1. verifica l’aggiudicazione;
2. crea la voce di rosa;
3. aggiorna i crediti residui;
4. aggiorna la disponibilità del giocatore;
5. persiste la chiamata confermata;
6. incrementa `stateVersion`;
7. registra il comando nel `command_registry`.

Se una qualsiasi parte dell’operazione fallisce, anche l’evento di
audit deve essere annullato dal rollback della stessa transazione.

Il `command_registry` mantiene esclusivamente la propria
responsabilità infrastrutturale e non viene utilizzato come
sostituto dell’audit trail di dominio.

Il logging Pino rimane separato sia dal `command_registry` sia
dall’audit di dominio.

## Conseguenze

### Positive

- Separazione esplicita tra idempotenza tecnica e storico di dominio.
- Le aggiudicazioni possono essere ricostruite senza interpretare
  payload tecnici.
- L’audit partecipa alla stessa atomicità dell’operazione critica.
- Nessun evento può descrivere un’assegnazione annullata dal rollback.
- Base stabile per storico, diagnostica, esportazioni e recovery.
- L’audit potrà essere esteso ad altre operazioni significative senza
  sovraccaricare il command registry.

### Negative

- Viene introdotta una nuova struttura persistente.
- Sono necessari schema, repository e migration dedicati.
- Alcune informazioni possono essere presenti sia nel risultato del
  command registry sia nell’evento di dominio.
- Occorre definire quali operazioni future meritino un evento
  persistente.

## Relazioni

Questa decisione integra:

- ADR-015 per la separazione tra logging tecnico e audit;
- ADR-042 per `stateVersion`, transazioni atomiche e command registry;
- ADR-043 per la pipeline atomica dei comandi autorevoli.

Il sottosistema completo di backup e recovery rimane separato ed è
previsto dalla Milestone 13.

La Milestone 8 predisporrà soltanto il punto applicativo necessario
a richiedere un backup dopo il commit dell’operazione critica.

---

# ADR-046 — Il Public Display è una connessione realtime read-only di sessione

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Realtime, autorizzazioni e Schermo Pubblico

## Contesto

Il protocollo realtime attualmente implementato è progettato per dispositivi associati alla partecipazione di una squadra a una sessione d'asta.

Una connessione realtime di squadra registrata contiene:

```text
deviceId
auctionSessionId
auctionSessionTeamId
role
```

con ruolo:

```text
OPERATOR
OBSERVER
```

La registrazione richiede inoltre il PIN operativo associato a `auction_session_teams`.

Questo modello è corretto per i telecomandi e per gli osservatori di squadra, ma non rappresenta correttamente lo Schermo Pubblico previsto dalla route:

```text
/public
```

Il Public Display:

- appartiene alla sessione d'asta e non a una singola squadra;
- deve visualizzare lo stato dell'intera sessione;
- non possiede un `auctionSessionTeamId`;
- non deve utilizzare il PIN operativo di una squadra;
- non deve inviare comandi d'asta;
- deve ricevere lo snapshot autorevole;
- deve ricevere gli aggiornamenti realtime della sessione;
- deve poter risincronizzarsi dopo refresh o riconnessione.

Registrare artificialmente lo Schermo Pubblico come `OBSERVER` di una squadra introdurrebbe un'associazione inesistente nel dominio e confonderebbe il ruolo di squadra con una vista pubblica di sessione.

## Decisione

Il Public Display viene modellato come una connessione realtime registrata distinta dai dispositivi di squadra.

Il modello realtime deve distinguere almeno due categorie concettuali:

```text
TEAM
PUBLIC_DISPLAY
```

Una registrazione `TEAM` conserva il modello esistente e comprende:

```text
deviceId
auctionSessionId
auctionSessionTeamId
role
```

dove il ruolo rimane:

```text
OPERATOR
OBSERVER
```

Una registrazione `PUBLIC_DISPLAY` appartiene invece esclusivamente alla sessione e comprende almeno:

```text
deviceId
auctionSessionId
```

Non possiede:

```text
auctionSessionTeamId
RealtimeRole
PIN di squadra
```

Il tipo `RealtimeRole` continua quindi a rappresentare esclusivamente i ruoli dei dispositivi associati a una squadra e non viene esteso con `PUBLIC_DISPLAY`.

Una connessione Public Display autorizzata viene associata alla room di sessione già prevista:

```text
auction-session:<auctionSessionId>
```

Non è necessario introdurre una nuova room specifica per lo Schermo Pubblico nella Milestone 9.

Il Public Display può ricevere:

```text
realtime:registered
auction:snapshot
auction:event
```

e gli eventuali ulteriori messaggi read-only previsti dal protocollo.

Il Public Display non possiede alcuna capacità di inviare comandi tramite:

```text
auction:command
```

La sola assenza di controlli interattivi nella UI non costituisce una garanzia sufficiente.

Il server deve impedire l'esecuzione di comandi provenienti da una connessione Public Display.

Lo Schermo Pubblico mantiene esclusivamente l'ultima rappresentazione ricevuta dal server e non introduce uno stato d'asta autorevole alternativo.

Lo snapshot autorevole definito da ADR-041 rimane la base della sincronizzazione iniziale e delle successive risincronizzazioni.

Gli eventi realtime rappresentano aggiornamenti già accettati dal server e non sostituiscono lo snapshot come fonte di sincronizzazione.

## Conseguenze

### Positive

- Il Public Display non viene associato artificialmente a una squadra.
- `OPERATOR` e `OBSERVER` mantengono il loro significato attuale.
- Non viene utilizzato il PIN operativo di una squadra per lo Schermo Pubblico.
- La room di sessione esistente può essere riutilizzata.
- Il Public Display riceve lo stesso stato autorevole degli altri client.
- La read-only capability viene garantita lato server.
- Nessuna nuova logica d'asta viene introdotta nel frontend.
- Nessuna modifica è richiesta al significato di `stateVersion`.
- Nessuna modifica è richiesta al `command_registry`.
- Il modello rimane compatibile con ADR-002, ADR-036, ADR-037, ADR-038, ADR-040, ADR-041, ADR-042, ADR-043 e ADR-044.

### Negative

- Il contratto di registrazione realtime deve supportare più di una forma di registrazione.
- Il modello delle connessioni registrate deve distinguere una connessione di squadra da una connessione Public Display.
- Il connection manager e gli handler Socket.IO devono gestire esplicitamente entrambe le categorie.
- I test realtime devono verificare che il Public Display non possa eseguire comandi d'asta.

## Relazioni

Questa decisione integra:

- ADR-002 per il server autoritativo;
- ADR-011 per Socket.IO;
- ADR-036 per i contratti realtime condivisi;
- ADR-037 per la separazione tra dispositivo e connessione;
- ADR-038 per l'isolamento realtime tramite room;
- ADR-040 per i ruoli `OPERATOR` e `OBSERVER`;
- ADR-041 per lo snapshot autorevole;
- ADR-043 per la pubblicazione realtime post-commit;
- ADR-044 per la separazione tra presenza realtime e stato di dominio.

La decisione riguarda esclusivamente accesso e sincronizzazione dello Schermo Pubblico.

Le modalità grafiche:

```text
STANDARD
HIGH_CONTRAST_OUTDOOR
COMPACT
```

rimangono decisioni di presentazione e non richiedono una ADR separata.

---

# ADR-047 — La sospensione operativa della sessione congela l’asta senza modificare la chiamata corrente

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Lifecycle sessione, comandi autorevoli, resilienza e backup

## Contesto

FantaAstaAPP prevede fin dalla gestione del lifecycle delle sessioni lo stato:

```text
SUSPENDED
```

con transizione:

```text
RUNNING
  ↓ suspend
SUSPENDED
  ↓ resume
RUNNING
```

ADR-014 stabilisce inoltre che una sessione sospesa non riprenda mai automaticamente e che la ripresa richieda sempre un’azione esplicita del banditore.

La Milestone 10 completa il comportamento operativo della sospensione.

La v0.9.0 è già in grado di rappresentare graficamente una sessione `SUSPENDED` nello Schermo Pubblico, ma tale rappresentazione non costituisce ancora una sospensione operativa completa.

Il codice esistente distingue inoltre due concetti:

```text
AuctionSession.status
AuctionCall.status
```

Entrambi prevedono uno stato `SUSPENDED`, ma la sospensione di `AuctionCall` non è attualmente collegata a un caso d’uso applicativo del server.

La macchina a stati di `AuctionCall` consente:

```text
OPEN
  ↓ suspend
SUSPENDED
  ↓ resume
OPEN
```

mentre la sospensione dell’intera sessione deve poter congelare lo stato corrente dell’asta senza ricostruire artificialmente la chiamata al momento della ripresa.

Durante una sospensione devono rimanere invariati almeno:

```text
giocatore corrente
offerta corrente
leader corrente
turno corrente
PASS
esclusioni
stati delle squadre
```

La sospensione deve inoltre rispettare le garanzie già introdotte per i comandi autorevoli:

```text
commandId
stateVersion
command registry persistente
optimistic concurrency
transazione SQLite
realtime post-commit
```

e deve richiedere un backup dopo il commit.

## Decisione

La sospensione operativa dell’intera asta viene rappresentata esclusivamente tramite:

```text
AuctionSession.status = SUSPENDED
```

La sospensione della sessione non modifica automaticamente lo stato della chiamata corrente.

Per esempio:

```text
AuctionSession:
RUNNING → SUSPENDED

AuctionCall:
OPEN → OPEN
```

oppure:

```text
AuctionSession:
RUNNING → SUSPENDED

AuctionCall:
PROVISIONAL_AWARD → PROVISIONAL_AWARD
```

L’aggregate della chiamata corrente rimane invariato.

Non vengono modificati:

```text
currentBid
currentLeaderAuctionSessionTeamId
currentTurnAuctionSessionTeamId
provisionalWinnerAuctionSessionTeamId
AuctionCallTeam.status
exclusionReason
```

Lo stato `AuctionCall.SUSPENDED` rimane parte della macchina a stati della chiamata e non viene eliminato né ridefinito, ma non rappresenta automaticamente la sospensione operativa dell’intera sessione.

Durante:

```text
AuctionSession.status = SUSPENDED
```

lo stato della sessione rappresenta un gate operativo globale.

I comandi che modificano lo stato dell’asta devono essere rifiutati lato server.

Sono bloccati almeno:

```text
OPEN
BID
PASS
UNDO_PASS
CONFIRM
CANCEL
```

e qualsiasi ulteriore comando operativo che possa modificare la chiamata o lo stato autorevole dell’asta.

La sola disabilitazione dei controlli nella UI non costituisce una protezione sufficiente.

Il server rimane l’unica autorità responsabile dell’enforcement.

La sospensione richiede una causale appartenente alla seguente union chiusa:

```text
PIZZA_BREAK
TECHNICAL_BREAK
ORGANIZATIONAL_BREAK
NETWORK_ISSUE
OTHER
```

La causale viene persistita insieme allo stato della sessione in modo che rimanga disponibile dopo:

```text
refresh
reconnect
server restart
```

La ripresa della sessione può avvenire esclusivamente tramite un comando esplicito del banditore:

```text
RESUME_SESSION
```

Non possono produrre una ripresa automatica:

```text
scadenza di un timer
ritorno della rete
riconnessione di un dispositivo
refresh di un client
riavvio del server
riapertura del Public Display
```

La disconnessione di un dispositivo continua a essere separata dallo stato di dominio e non modifica la sessione, la chiamata, il turno o i PASS.

I comandi di sospensione e ripresa sono comandi autorevoli e devono rispettare le stesse garanzie architetturali previste per gli altri comandi che modificano lo stato.

Devono quindi partecipare a un flusso che garantisca almeno:

```text
commandId
expected stateVersion
request fingerprint
controllo idempotenza
controllo optimistic concurrency
transazione SQLite
incremento stateVersion
registrazione nel command_registry
commit
pubblicazione realtime post-commit
```

L’ADR non impone una specifica classe applicativa o il riutilizzo diretto dell’attuale executor delle chiamate d’asta.

L’implementazione deve preservare le garanzie della pipeline autorevole senza introdurre un percorso concorrente o meno affidabile.

La sospensione e la ripresa sono eventi significativi di dominio.

Devono essere registrabili nell’audit trail persistente separato dal `command_registry` tramite eventi semanticamente distinti:

```text
SESSION_SUSPENDED
SESSION_RESUMED
```

L’evento di sospensione deve conservare almeno:

```text
auctionSessionId
eventType
suspensionReason
createdAt
```

L’evento di ripresa deve conservare almeno:

```text
auctionSessionId
eventType
createdAt
```

La registrazione dell’audit deve partecipare alla stessa atomicità del comando autorevole.

Se la transazione viene annullata, non deve rimanere alcun evento di audit relativo alla sospensione o alla ripresa fallita.

Dopo un commit riuscito devono essere pubblicati:

```text
auction:event
auction:snapshot
```

coerenti con il nuovo stato autorevole.

Un replay idempotente non deve produrre una seconda pubblicazione degli stessi effetti realtime.

Durante `SUSPENDED`, i telecomandi continuano a ricevere lo snapshot autorevole e gli aggiornamenti realtime, ma operano in sola lettura.

Il frontend può disabilitare i controlli operativi, ma il rifiuto dei comandi deve essere garantito lato server.

Il Public Display continua a essere una connessione read-only di sessione e deve mostrare:

```text
stato SUSPENDED
causale della sospensione
stato congelato dell’asta
```

senza ricostruire autonomamente lo stato.

Una sospensione appena committata deve richiedere un backup attraverso il boundary applicativo di backup.

Il backup viene richiesto esclusivamente dopo il commit.

Si applicano le seguenti regole:

```text
rollback
→ nessun backup

idempotent replay
→ nessun backup duplicato

errore del backup
→ non annulla la sospensione già committata
```

Il sottosistema completo di backup e recovery rimane separato ed è previsto dalla Milestone 13.

Questa decisione non introduce quindi:

```text
restore automatico
integrity check completo
retention dei backup
rotazione dei backup
recovery workflow
recovery UI
```

Se il server viene riavviato mentre una sessione persistita è:

```text
SUSPENDED
```

la sessione deve rimanere:

```text
SUSPENDED
```

Il bootstrap del server non può trasformarla automaticamente in `RUNNING`.

I client che si riconnettono ricevono lo stato tramite il normale snapshot autorevole.

La sospensione e la ripresa rimangono operazioni amministrative esplicite riservate alla capacità del banditore.

La modalità tecnica con cui tale capacità viene autenticata o autorizzata non viene ridefinita da questa ADR e deve rispettare il modello amministrativo esistente.

## Conseguenze

### Positive

- La sospensione della sessione non altera né ricostruisce artificialmente la chiamata corrente.
- Offerta, leader, turno, PASS ed esclusioni rimangono invariati durante la pausa.
- `AuctionSession.status` rappresenta un gate operativo globale semplice e deterministico.
- La macchina a stati della chiamata mantiene la propria semantica indipendente.
- I comandi vengono bloccati dal server e non soltanto dalla UI.
- La causale della sospensione rimane disponibile dopo reconnect o restart.
- Suspend e resume partecipano alle stesse garanzie di idempotenza e concorrenza degli altri comandi autorevoli.
- L’audit di dominio rimane separato dal command registry.
- Eventi e snapshot vengono pubblicati solo dopo il commit.
- I replay idempotenti non duplicano effetti realtime o backup.
- Il Public Display può continuare a mostrare lo stato congelato già previsto dalla v0.9.0.
- Il boundary di backup esistente può essere esteso senza anticipare il completo sottosistema di recovery.
- Nessun evento di rete o riavvio può causare una ripresa automatica.

### Negative

- È necessario introdurre un percorso atomico per comandi di sessione che non dipenda esclusivamente dall’aggregate `AuctionCall`.
- Ogni comando operativo deve verificare anche lo stato della sessione.
- La causale della sospensione richiede persistenza e contratti condivisi.
- L’audit trail deve essere esteso con nuovi tipi di evento.
- Snapshot e frontend devono esporre e interpretare la causale della sospensione.
- Il backup alla sospensione introduce un effetto I/O post-commit.
- Stato visibile e capacità operative devono rimanere concetti distinti nei client.

## Relazioni

Questa decisione integra:

- ADR-002 per il server autoritativo;
- ADR-014 per il divieto di ripresa automatica;
- ADR-019 per il lifecycle della sessione;
- ADR-031 per la macchina a stati della chiamata;
- ADR-034 per la persistenza coerente dell’aggregate della chiamata;
- ADR-036 per i contratti realtime condivisi;
- ADR-041 per lo snapshot autorevole;
- ADR-042 per `stateVersion`, optimistic concurrency e command registry;
- ADR-043 per la pipeline atomica e la pubblicazione realtime post-commit;
- ADR-044 per la separazione tra presenza realtime e dominio;
- ADR-045 per l’audit persistente separato dal command registry;
- ADR-046 per il Public Display read-only di sessione.

La decisione riguarda esclusivamente la sospensione operativa e la ripresa controllata della sessione.

Il sottosistema completo di backup e recovery rimane previsto dalla Milestone 13.

# ADR-048 — Autorità amministrativa, operazioni manuali e correzioni tecniche

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Operazioni amministrative, assegnazioni manuali, correzioni e audit

## Contesto

FantaAstaAPP utilizza un server autoritativo e una pipeline atomica per tutte le operazioni che modificano lo stato dell'asta.

Le milestone precedenti hanno introdotto:

- `commandId`;
- `stateVersion`;
- optimistic concurrency;
- command registry persistente;
- idempotenza;
- transazioni SQLite atomiche;
- audit di dominio persistente tramite `auction_events`;
- pubblicazione realtime esclusivamente dopo commit;
- snapshot autorevole;
- aggiornamento atomico di rosa, crediti e disponibilità del giocatore.

La versione 1.0 deve inoltre consentire al banditore e all'amministratore di intervenire manualmente per:

- completare la configurazione delle rose iniziali;
- registrare acquisizioni avvenute fuori dal normale motore d'asta;
- registrare il risultato finale delle opzioni gestite manualmente;
- correggere errori tecnici o operativi già persistiti.

Il banditore rappresenta l'autorità operativa finale dell'asta e deve poter correggere errori come:

- assegnazione avvenuta ma non registrata;
- costo di acquisizione errato;
- squadra assegnataria errata;
- giocatore registrato errato;
- contratto errato;
- combinazioni dei casi precedenti.

Questa autorità non può però aggirare le invarianti del dominio.

Una correzione che produrrebbe uno stato finale non valido deve essere rifiutata.

La gestione automatica completa delle opzioni rimane esclusa dalla versione 1.0 ed è prevista per la v1.1.0.

Il sottosistema completo di backup e recovery rimane previsto dalla v0.13.0.

## Decisione

### Autorità amministrative

Vengono distinti i ruoli centrali:

```text
ADMINISTRATOR
AUCTIONEER
```

Entrambi possono eseguire operazioni manuali e correzioni tecniche.

I ruoli:

```text
OPERATOR
OBSERVER
```

rimangono ruoli associati ai dispositivi delle fantasquadre e non autorizzano operazioni amministrative o correttive.

Una stessa persona fisica può ricoprire più ruoli contemporaneamente.

Per la versione 1.0 non viene introdotto un sistema utenti complesso con account, password, ACL o autenticazione personale.

L'identità dell'attore delle operazioni amministrative viene rappresentata in modo semplice mediante almeno:

```text
actorName
actorRole
```

dove `actorRole` è:

```text
ADMINISTRATOR
AUCTIONEER
```

L'attore non deve necessariamente essere un `Owner` della lega.

### Tipi di operazione manuale

La versione 1.0 distingue tre categorie concettuali.

#### 1. Inserimento manuale nella rosa iniziale

Un giocatore confermato può entrare nella rosa iniziale:

- tramite import FMS ReVo;
- tramite inserimento manuale dell'amministratore.

Entrambi i percorsi producono lo stesso stato autorevole e utilizzano:

```text
source = INITIAL_ROSTER
```

L'inserimento manuale non viene classificato come correzione tecnica soltanto perché è stato effettuato manualmente.

#### 2. `MANUAL_ASSIGNMENT`

`MANUAL_ASSIGNMENT` registra una nuova acquisizione che non è passata dal normale motore d'asta.

Comprende almeno:

- risultato finale di un'opzione gestita manualmente;
- assegnazione realmente avvenuta ma non registrata dal sistema;
- altra acquisizione amministrativa eccezionale consentita.

Le causali previste dalla specifica rimangono:

```text
OPTION_EXERCISED_MANUALLY
OPTION_NO_EXTERNAL_BID
TECHNICAL_CORRECTION
OTHER
```

Il risultato finale della procedura manuale delle opzioni viene registrato nel sistema senza automatizzare nella versione 1.0:

- il diritto di opzione;
- la partecipazione o esclusione automatica del titolare;
- l'asta competitiva tra gli altri partecipanti;
- il diritto automatico di trattenere a offerta vincente + 1;
- il rilevamento automatico dell'assenza di offerte.

Questi automatismi rimangono previsti per la v1.1.0.

#### 3. Correzione tecnica di un'assegnazione esistente

Una correzione tecnica può rettificare atomicamente un'assegnazione già persistita.

Deve poter correggere almeno:

- costo;
- squadra assegnataria;
- giocatore;
- anno di contratto;
- combinazioni coerenti dei campi precedenti.

La correzione deve aggiornare nello stesso confine transazionale tutte le entità coinvolte, comprese quando necessario:

- `roster_entries`;
- crediti residui delle squadre interessate;
- disponibilità dei giocatori;
- audit di dominio;
- `stateVersion`;
- `command_registry`.

Non sono ammesse sequenze intenzionalmente incoerenti nelle quali il sistema viene lasciato temporaneamente in uno stato invalido per essere corretto con un comando successivo.

### Stati della sessione

Le operazioni manuali e correttive sono consentite nei seguenti stati:

```text
SETUP
READY
SUSPENDED
COMPLETED
```

Non sono consentite in:

```text
RUNNING
CLOSED
```

Durante una sessione operativa, una correzione richiede quindi il flusso:

```text
RUNNING
  ↓ SUSPEND_SESSION
SUSPENDED
  ↓ operazione manuale o correzione
SUSPENDED
  ↓ RESUME_SESSION
RUNNING
```

La presenza o assenza di una chiamata corrente non modifica questa regola.

In `RUNNING` non è consentita alcuna correzione.

### Invarianti obbligatorie

Ogni operazione manuale o correttiva deve lasciare il sistema in uno stato valido.

Devono essere verificate almeno:

- appartenenza del giocatore alla sessione;
- appartenenza della squadra alla sessione;
- unicità del giocatore nella rosa della sessione;
- coerenza dello stato di disponibilità del giocatore;
- limiti di ruolo;
- limite complessivo della rosa;
- crediti mai negativi;
- sostenibilità economica e completabilità della rosa;
- validità del costo;
- validità dell'anno di contratto;
- stato della sessione compatibile con l'operazione.

L'autorità amministrativa non può disabilitare o forzare il superamento di queste invarianti.

### Motivazione e audit

Ogni correzione tecnica deve avere un commento testuale obbligatorio, non vuoto e persistito nell'audit.

Il commento deve permettere di comprendere in futuro il motivo della correzione.

Quando esiste uno stato precedente, l'audit deve conservare informazioni sufficienti a ricostruire semanticamente:

```text
BEFORE
AFTER
```

L'audit deve registrare almeno:

```text
actorName
actorRole
comment
```

oltre ai dati necessari a identificare l'operazione e le entità interessate.

Per le assegnazioni manuali vengono conservate anche le causali previste dalla specifica.

Il logging tecnico Pino, il `command_registry` e l'audit di dominio rimangono responsabilità separate.

### Pipeline autorevole

Le operazioni manuali e correttive non costituiscono un percorso privilegiato verso il database.

Devono utilizzare le stesse garanzie architetturali degli altri comandi autorevoli:

```text
Command
↓
runtime validation
↓
authorization / application validation
↓
idempotency check
↓
stateVersion check
↓
domain validation
↓
SQLite transaction
↓
authoritative state mutations
↓
domain audit
↓
stateVersion increment
↓
command_registry
↓
COMMIT
↓
realtime event
↓
authoritative snapshot
↓
eventuali side effect post-commit
```

Un replay idempotente non deve duplicare:

- modifiche allo stato;
- eventi di audit;
- eventi realtime;
- snapshot;
- eventuali side effect post-commit.

Le operazioni manuali non possono essere implementate mediante modifiche dirette al database esterne alla pipeline autorevole.

## Conseguenze

### Positive

- Il banditore e l'amministratore possono risolvere gli errori operativi reali senza modifiche manuali al database.
- Le correzioni mantengono le stesse garanzie di consistenza costruite nelle milestone precedenti.
- Lo storico delle modifiche rimane ricostruibile.
- La gestione degli utenti rimane semplice e proporzionata all'uso locale in LAN.
- Import e inserimento manuale delle rose iniziali convergono sullo stesso stato autorevole.
- La versione 1.0 può gestire manualmente le opzioni senza anticipare il motore automatico della v1.1.0.
- Le correzioni durante l'asta avvengono in una fase operativa esplicitamente controllata tramite `SUSPENDED`.

### Negative

- Le correzioni complesse richiedono logica transazionale dedicata.
- `auction_events` deve evolvere per registrare attore, motivazione e informazioni prima/dopo.
- Il command registry deve supportare i nuovi comandi amministrativi.
- Alcune operazioni che il banditore vorrebbe forzare possono essere rifiutate quando violano le invarianti.
- Il flusso operativo richiede la sospensione esplicita della sessione prima di correggere durante l'asta.

## Relazioni

Questa decisione integra:

- ADR-002 per il server autoritativo;
- ADR-009 per la separazione del dominio dall'infrastruttura;
- ADR-010 per la validazione runtime;
- ADR-029 per `roster_entries` e relativa origine;
- ADR-033 per la sostenibilità economica;
- ADR-041 per lo snapshot autorevole;
- ADR-042 per `stateVersion`, idempotenza e command registry;
- ADR-043 per la pipeline atomica e la pubblicazione post-commit;
- ADR-045 per la separazione dell'audit di dominio dal command registry;
- ADR-047 per la sospensione operativa della sessione.

La riapertura di una sessione `CLOSED` è disciplinata separatamente da ADR-049.

---

# ADR-049 — Riapertura amministrativa controllata delle sessioni chiuse

**Stato:** `ACCEPTED`
**Data:** 2026-08
**Ambito:** Ciclo di vita della sessione, correzioni amministrative e immutabilità storica

## Contesto

ADR-019 ha definito un ciclo di vita rigido delle sessioni d'asta.

ADR-022 ha stabilito che le sessioni `COMPLETED` e `CLOSED` siano permanenti e in sola lettura e che una sessione chiusa non possa essere riaperta.

La gestione operativa reale richiede tuttavia la possibilità di correggere errori scoperti dopo la chiusura formale della sessione.

Consentire modifiche dirette a una sessione `CLOSED` indebolirebbe il significato dello stato e renderebbe meno chiaro quando lo storico sia effettivamente bloccato.

È quindi necessario mantenere `CLOSED` come stato protetto, introducendo una sola azione amministrativa esplicita che permetta di tornare alla fase correttiva.

## Decisione

Viene introdotto il comando amministrativo:

```text
REOPEN_SESSION
```

che consente esclusivamente la transizione:

```text
CLOSED
  ↓ REOPEN_SESSION
COMPLETED
```

La macchina a stati della sessione diventa quindi:

```text
SETUP
  ↓ ready
READY
  ↓ start
RUNNING
  ├─ suspend → SUSPENDED
  │               ↓ resume
  │             RUNNING
  └─ complete → COMPLETED
                    ↓ close
                  CLOSED
                    ↓ reopen
                  COMPLETED
```

Non vengono introdotte altre transizioni inverse.

In particolare non sono consentite transizioni dirette:

```text
CLOSED → RUNNING
CLOSED → SUSPENDED
CLOSED → READY
CLOSED → SETUP
COMPLETED → RUNNING
```

`CLOSED` rimane in sola lettura per tutte le normali operazioni.

Per eseguire una correzione su una sessione chiusa il flusso è:

```text
CLOSED
  ↓ REOPEN_SESSION
COMPLETED
  ↓ operazione manuale o correzione
COMPLETED
  ↓ close
CLOSED
```

La riapertura non annulla, modifica o cancella automaticamente alcun dato storico.

Produce esclusivamente la transizione controllata della sessione da `CLOSED` a `COMPLETED`.

`REOPEN_SESSION` è riservato alle autorità amministrative previste da ADR-048:

```text
ADMINISTRATOR
AUCTIONEER
```

Il comando deve utilizzare:

```text
commandId
stateVersion
```

e partecipare alla pipeline autorevole.

La transizione, l'incremento di `stateVersion`, l'audit e la registrazione nel `command_registry` devono essere atomici.

Eventi realtime e snapshot autorevole vengono pubblicati esclusivamente dopo commit.

Un replay idempotente non ripete la transizione né gli effetti post-commit.

La riapertura deve produrre un evento di audit persistente dedicato che consenta di ricostruire l'azione amministrativa.

## Modifica delle decisioni precedenti

ADR-049 modifica ADR-019 esclusivamente nella parte in cui il ciclo di vita non consentiva alcuna transizione da `CLOSED`.

La nuova eccezione ammessa è soltanto:

```text
CLOSED → COMPLETED
```

tramite `REOPEN_SESSION`.

ADR-049 modifica ADR-022 esclusivamente nella parte in cui una sessione `CLOSED` era dichiarata definitivamente non riapribile.

Rimangono valide le altre protezioni di ADR-022:

- una sessione `CLOSED` è normalmente in sola lettura;
- i campi strutturali non diventano modificabili;
- la riapertura non autorizza modifiche generiche tramite `PATCH`;
- le correzioni avvengono esclusivamente attraverso comandi amministrativi dedicati;
- la sessione non può essere cancellata.

Tutte le altre parti di ADR-019 e ADR-022 rimangono attive.

## Conseguenze

### Positive

- Gli errori scoperti dopo la chiusura possono essere corretti senza modificare direttamente il database.
- `CLOSED` conserva un significato forte di stato protetto.
- La riapertura è deliberata, esplicita, auditata e idempotente.
- Non vengono introdotte riaperture arbitrarie verso stati operativi.
- La sessione può essere nuovamente chiusa dopo le correzioni.
- Il comportamento rimane compatibile con la pipeline autoritativa esistente.

### Negative

- Il lifecycle della sessione non è più strettamente unidirezionale.
- Il dominio, i contratti, il command registry e i test devono supportare `REOPEN_SESSION`.
- L'audit deve distinguere chiaramente chi ha riaperto la sessione e perché.
- Le interfacce amministrative devono evitare riaperture accidentali.

## Relazioni

Questa decisione integra:

- ADR-019 per il ciclo di vita della sessione;
- ADR-022 per l'immutabilità storica;
- ADR-042 per `stateVersion`, idempotenza e command registry;
- ADR-043 per la pipeline atomica e la pubblicazione post-commit;
- ADR-045 per l'audit di dominio;
- ADR-048 per autorità amministrative e correzioni.
