# Standard di sviluppo

Questo documento definisce le convenzioni di sviluppo adottate per **FantaAstaAPP**.

L’obiettivo non è imporre regole inutilmente rigide, ma mantenere il codice:

- leggibile;
- coerente;
- testabile;
- facilmente manutenibile;
- sicuro durante il refactoring;
- comprensibile anche a distanza di tempo.

---

## 1. Principi generali

Il codice deve privilegiare:

- chiarezza rispetto alla brevità;
- semplicità rispetto all’astrazione prematura;
- comportamento esplicito rispetto alla magia implicita;
- funzioni piccole e focalizzate;
- responsabilità ben separate;
- tipi precisi;
- errori prevedibili;
- test delle regole critiche.

Una soluzione semplice e corretta è preferibile a una soluzione elegante ma difficile da comprendere.

---

## 2. Linguaggio

Il codice sorgente utilizza:

```text
TypeScript
```

Le seguenti parti devono essere scritte in inglese:

- nomi di variabili;
- nomi di funzioni;
- nomi di classi;
- nomi di file;
- commenti nel codice;
- messaggi di commit;
- codici di errore;
- nomi degli eventi;
- nomi dei comandi;
- nomi delle route tecniche.

La documentazione interna del progetto può rimanere in italiano.

---

## 3. TypeScript

### 3.1 Tipizzazione esplicita

Evitare `any`.

Preferire tipi precisi:

```ts
type AuctionSessionStatus =
  | "SETUP"
  | "READY"
  | "RUNNING"
  | "SUSPENDED"
  | "COMPLETED"
  | "CLOSED";
```

Quando un valore può essere assente, dichiararlo esplicitamente:

```ts
string | null
```

oppure:

```ts
string | undefined
```

La scelta tra `null` e `undefined` deve essere coerente con il contesto.

---

### 3.2 Evitare cast non sicuri

Evitare:

```ts
const session = value as AuctionSession;
```

quando il valore proviene da:

- API;
- database;
- file importati;
- variabili di ambiente;
- Socket.IO;
- input dell’utente.

In questi casi utilizzare una validazione runtime.

---

### 3.3 Utilizzare `unknown` ai confini del sistema

Quando il tipo non è noto:

```ts
function parsePayload(payload: unknown) {
  // Runtime validation
}
```

`unknown` è preferibile a `any` perché obbliga a validare il valore prima dell’uso.

---

### 3.4 Tipi condivisi

I tipi condivisi tra backend e frontend devono essere collocati in:

```text
packages/contracts
```

Le regole e i tipi di dominio indipendenti dall’infrastruttura devono essere collocati in:

```text
packages/domain
```

Non duplicare manualmente lo stesso tipo in più applicazioni.

---

### 3.5 Type inference

Utilizzare l’inferenza TypeScript quando il tipo è evidente:

```ts
const initialCredits = 330;
```

Dichiarare esplicitamente il tipo quando:

- chiarisce l’intento;
- rappresenta un contratto pubblico;
- definisce un valore restituito importante;
- evita inferenze troppo generiche;
- riguarda API o funzioni di dominio.

---

## 4. Naming

### 4.1 Variabili e funzioni

Utilizzare `camelCase`.

```ts
const sessionId = "session-1";

function createAuctionSession() {
  // ...
}
```

I nomi devono descrivere l’intento.

Preferire:

```ts
calculateMaximumBid()
```

a:

```ts
calc()
```

---

### 4.2 Tipi, classi e componenti React

Utilizzare `PascalCase`.

```ts
type AuctionSession = {
  // ...
};

class AuctionSessionService {
  // ...
}

function AdminSessionPage() {
  // ...
}
```

---

### 4.3 Costanti

Per costanti realmente globali o immutabili utilizzare `UPPER_SNAKE_CASE`.

```ts
const DEFAULT_INITIAL_CREDITS = 330;
const MAX_STANDARD_ROSTER_SIZE = 24;
```

Le costanti locali possono mantenere `camelCase` quando risultano più leggibili.

---

### 4.4 Booleani

I booleani devono utilizzare prefissi descrittivi:

```ts
isActive
isPrimary
hasPermission
canPlaceBid
shouldCreateBackup
```

Evitare nomi ambigui:

```ts
active
permission
backup
```

---

### 4.5 Collezioni

Utilizzare nomi plurali:

```ts
const teams = [];
const auctionSessions = [];
const activeCommands = [];
```

---

### 4.6 Identificatori

Utilizzare il suffisso `Id`:

```ts
sessionId
teamId
ownerId
playerId
commandId
```

Evitare varianti incoerenti come:

```text
sessionID
session_id
SessionId
```

nel codice TypeScript.

Nel database viene utilizzato lo stile previsto dallo schema SQL.

---

## 5. Nomi dei file

Utilizzare preferibilmente `kebab-case`.

```text
auction-session.service.ts
auction-session.repository.ts
auction-session.routes.ts
auction-session.schemas.ts
```

Per i componenti React è ammesso `PascalCase` quando coerente con la configurazione del progetto:

```text
AuctionSessionForm.tsx
AdminSessionPage.tsx
```

Una volta scelta una convenzione all’interno di un’area, mantenerla coerente.

---

## 6. Struttura dei moduli backend

Un modulo backend può essere organizzato come segue:

```text
auction-sessions/
├── auction-session.routes.ts
├── auction-session.schemas.ts
├── auction-session.service.ts
├── auction-session.repository.ts
├── auction-session.types.ts
└── auction-session.test.ts
```

Non tutti i file sono obbligatori.

Creare un nuovo livello soltanto quando esiste una responsabilità reale da separare.

---

## 7. Route

Le route Fastify devono occuparsi di:

- ricevere la richiesta;
- validare parametri e payload;
- richiamare il servizio applicativo;
- trasformare il risultato in una risposta HTTP;
- delegare la gestione degli errori.

Le route non devono contenere:

- query complesse;
- regole di dominio;
- transazioni;
- calcoli economici;
- logica di transizione di stato.

Esempio:

```ts
fastify.post(
  "/api/auction-sessions",
  async (request, reply) => {
    const input = createAuctionSessionSchema.parse(request.body);

    const session = await auctionSessionService.create(input);

    return reply.code(201).send({
      data: session,
      error: null,
    });
  },
);
```

---

## 8. Service

I service coordinano i casi d’uso.

Responsabilità tipiche:

- applicare regole di business;
- verificare precondizioni;
- coordinare repository;
- avviare transazioni;
- generare eventi;
- produrre log applicativi;
- restituire risultati prevedibili.

Esempio:

```ts
class AuctionSessionService {
  constructor(
    private readonly repository: AuctionSessionRepository,
  ) {}

  async create(
    input: CreateAuctionSessionInput,
  ): Promise<AuctionSession> {
    return this.repository.create(input);
  }
}
```

I service non devono dipendere direttamente da oggetti Fastify come:

```text
request
reply
```

---

## 9. Repository

I repository isolano l’accesso alla persistenza.

Responsabilità:

- query;
- inserimenti;
- aggiornamenti;
- cancellazioni;
- mapping dei record;
- transazioni quando delegate dal service.

Esempio di interfaccia:

```ts
interface AuctionSessionRepository {
  findById(id: string): Promise<AuctionSession | null>;

  create(
    input: CreateAuctionSessionInput,
  ): Promise<AuctionSession>;

  update(
    id: string,
    input: UpdateAuctionSessionInput,
  ): Promise<AuctionSession>;
}
```

Le route non devono accedere direttamente al database quando il modulo contiene logica applicativa significativa.

---

## 10. Domain layer

Le regole di dominio devono essere pure quando possibile.

Esempio:

```ts
function canTransitionSessionStatus(
  currentStatus: AuctionSessionStatus,
  nextStatus: AuctionSessionStatus,
): boolean {
  // ...
}
```

Una funzione di dominio non deve:

- leggere il database;
- accedere a Fastify;
- inviare eventi Socket.IO;
- leggere variabili di ambiente;
- scrivere file;
- manipolare componenti React.

Questo rende le regole facilmente testabili.

---

## 11. Validazione con Zod

Tutti i dati che attraversano i confini del sistema devono essere validati.

Esempi:

- richieste HTTP;
- parametri delle route;
- comandi realtime;
- file importati;
- configurazione;
- variabili di ambiente.

Esempio:

```ts
import { z } from "zod";

export const createAuctionSessionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  season: z.string().trim().min(1).max(20),
  initialCredits: z.number().int().positive(),
});
```

Derivare il tipo TypeScript quando utile:

```ts
export type CreateAuctionSessionInput = z.infer<
  typeof createAuctionSessionSchema
>;
```

La validazione strutturale non sostituisce le regole di dominio.

Esempio:

- Zod verifica che `initialCredits` sia un intero positivo;
- il dominio verifica che il valore sia compatibile con le regole della sessione.

---

## 12. Error handling

### 12.1 Errori applicativi

Gli errori previsti devono avere un codice stabile.

Esempio:

```ts
class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}
```

Esempi di codici:

```text
VALIDATION_ERROR
AUCTION_SESSION_NOT_FOUND
INVALID_STATE_TRANSITION
DUPLICATE_SESSION_NAME
STALE_STATE
INSUFFICIENT_CREDITS
INTERNAL_ERROR
```

I codici devono essere:

- in inglese;
- in `UPPER_SNAKE_CASE`;
- specifici;
- stabili nel tempo.

---

### 12.2 Non nascondere gli errori

Evitare:

```ts
try {
  await operation();
} catch {
  return null;
}
```

Un errore non deve essere ignorato senza:

- gestione esplicita;
- log;
- conversione in errore applicativo;
- motivazione documentata.

---

### 12.3 Messaggi al client

Il client deve ricevere messaggi comprensibili ma controllati.

Non esporre:

- stack trace;
- query SQL;
- percorsi del filesystem;
- dettagli interni;
- segreti;
- credenziali.

---

## 13. Logging

Utilizzare il logger applicativo basato su Pino.

Preferire log strutturati:

```ts
logger.info(
  {
    sessionId,
    operation: "auction-session-created",
  },
  "Auction session created",
);
```

Evitare:

```ts
console.log("Session created " + sessionId);
```

Non utilizzare `console.log` nel codice applicativo, salvo script temporanei o casi esplicitamente giustificati.

Livelli consigliati:

| Livello | Utilizzo |
|---|---|
| `debug` | Informazioni dettagliate per lo sviluppo |
| `info` | Operazioni applicative normali |
| `warn` | Situazioni anomale ma gestibili |
| `error` | Operazioni fallite o errori inattesi |
| `fatal` | Errore che impedisce la prosecuzione |

Non registrare PIN, segreti o dati sensibili in chiaro.

---

## 14. Funzioni

Le funzioni devono avere una sola responsabilità principale.

Preferire parametri nominati tramite oggetto quando il numero di argomenti aumenta:

```ts
function createTeam(input: {
  name: string;
  shortName: string;
  sessionId: string;
}) {
  // ...
}
```

Evitare:

```ts
function createTeam(
  name: string,
  shortName: string,
  sessionId: string,
  colorPrimary: string,
  colorSecondary: string,
) {
  // ...
}
```

Evitare funzioni molto lunghe.

Quando una funzione gestisce più fasi concettualmente differenti, estrarre funzioni private o funzioni di dominio.

---

## 15. Return anticipati

Utilizzare return anticipati quando migliorano la leggibilità.

Preferire:

```ts
if (!session) {
  throw new ApplicationError(
    "AUCTION_SESSION_NOT_FOUND",
    "Auction session not found",
    404,
  );
}

if (session.status !== "SETUP") {
  throw new ApplicationError(
    "INVALID_STATE_TRANSITION",
    "The session cannot be modified in its current state",
    409,
  );
}

return updateSession(session);
```

a strutture profondamente annidate.

---

## 16. Immutabilità

Evitare mutazioni non necessarie, soprattutto nel dominio e nel frontend.

Preferire:

```ts
const updatedSession = {
  ...session,
  status: "READY",
};
```

Quando una mutazione è necessaria per prestazioni o API specifiche, deve risultare chiara e circoscritta.

---

## 17. Async e Promise

Utilizzare `async/await` per il codice asincrono.

Preferire:

```ts
const session = await repository.findById(sessionId);
```

Evitare catene lunghe di `.then()` quando riducono la leggibilità.

Gestire esplicitamente le Promise:

- non lasciare Promise non attese;
- non ignorare errori asincroni;
- usare `Promise.all` solo per operazioni realmente indipendenti.

---

## 18. Database

### 18.1 Migrazioni

Ogni modifica allo schema deve passare tramite una migrazione Drizzle.

Non modificare manualmente il database di produzione locale.

---

### 18.2 Query

Le query devono essere:

- leggibili;
- limitate ai dati necessari;
- protette da parametri;
- isolate nei repository quando appropriato.

Evitare di caricare intere tabelle quando non necessario.

---

### 18.3 Transazioni

Utilizzare transazioni per operazioni composte che devono essere atomiche.

Esempi:

- conferma di un’assegnazione;
- aggiornamento crediti e rosa;
- operazioni di recovery;
- importazioni composte;
- modifiche che coinvolgono più entità correlate.

---

### 18.4 Date

Conservare le date in un formato coerente.

Preferire timestamp UTC o formati ISO 8601 quando applicabile.

La conversione nella timezone locale appartiene al livello di presentazione.

---

## 19. API

### 19.1 Route naming

Utilizzare risorse plurali:

```text
/api/auction-sessions
/api/teams
/api/owners
/api/players
```

Evitare route basate su verbi quando l’operazione è CRUD.

Preferire:

```text
POST /api/auction-sessions
```

a:

```text
POST /api/create-auction-session
```

Per azioni di dominio esplicite è ammesso un endpoint dedicato:

```text
POST /api/auction-sessions/:id/suspend
POST /api/auction-sessions/:id/resume
```

---

### 19.2 Status code

Utilizzare status code coerenti:

| Codice | Utilizzo |
|---:|---|
| `200` | Richiesta riuscita |
| `201` | Risorsa creata |
| `204` | Operazione riuscita senza contenuto |
| `400` | Input non valido |
| `401` | Autenticazione richiesta |
| `403` | Operazione non autorizzata |
| `404` | Risorsa non trovata |
| `409` | Conflitto o transizione non valida |
| `500` | Errore interno inatteso |

---

### 19.3 Formato delle risposte

Utilizzare un formato coerente.

Successo:

```json
{
  "data": {},
  "error": null
}
```

Errore:

```json
{
  "data": null,
  "error": {
    "code": "AUCTION_SESSION_NOT_FOUND",
    "message": "Auction session not found"
  }
}
```

---

## 20. Realtime

Gli eventi Socket.IO devono avere nomi stabili e descrittivi.

Esempi:

```text
auction:state-updated
auction:session-suspended
auction:bid-accepted
auction:command-rejected
```

I comandi e gli eventi di dominio devono rimanere distinti.

Esempio:

```text
Command: PLACE_BID
Event: BID_ACCEPTED
```

Ogni comando deve includere, quando richiesto:

```ts
type CommandMetadata = {
  commandId: string;
  stateVersion: number;
};
```

Il client non deve assumere che un comando sia riuscito finché il server non lo conferma.

---

## 21. React

### 21.1 Componenti

I componenti devono essere focalizzati su una responsabilità.

Separare:

- componenti di presentazione;
- componenti di pagina;
- hook;
- servizi API;
- logica di dominio.

---

### 21.2 Stato

Non duplicare nel frontend lo stato autorevole dell’asta.

Il client può mantenere:

- stato della UI;
- loading;
- errori;
- valori temporanei dei form;
- ultima rappresentazione ricevuta dal server.

Le decisioni definitive appartengono al server.

---

### 21.3 Side effect

Utilizzare `useEffect` soltanto per sincronizzazioni con sistemi esterni.

Non utilizzare `useEffect` per calcolare valori derivabili direttamente durante il rendering.

Preferire:

```ts
const remainingCredits =
  initialCredits - spentCredits;
```

a uno stato duplicato aggiornato tramite effetto.

---

### 21.4 Servizi API

Centralizzare le chiamate HTTP in servizi dedicati.

Esempio:

```text
src/services/auction-session-api.ts
```

Evitare chiamate `fetch` sparse in molti componenti.

---

## 22. Test

### 22.1 Naming

I test devono descrivere il comportamento.

Preferire:

```ts
it("rejects the transition from CLOSED to RUNNING", () => {
  // ...
});
```

a:

```ts
it("works", () => {
  // ...
});
```

---

### 22.2 Struttura Arrange, Act, Assert

Quando utile, seguire:

```ts
// Arrange
const session = createSession({ status: "CLOSED" });

// Act
const action = () =>
  transitionSession(session, "RUNNING");

// Assert
expect(action).toThrow();
```

---

### 22.3 Cosa testare

Dare priorità a:

- regole di dominio;
- transizioni di stato;
- massimo sostenibile;
- limiti della rosa;
- comandi duplicati;
- stato obsoleto;
- transazioni;
- errori applicativi;
- route principali.

Non testare dettagli interni irrilevanti.

---

### 22.4 Isolamento

Ogni test deve poter essere eseguito indipendentemente.

I test database devono utilizzare un database separato e controllato.

Non dipendere dall’ordine di esecuzione dei test.

---

## 23. Commenti

I commenti devono spiegare il perché, non ripetere il codice.

Evitare:

```ts
// Increment bid by one
bid += 1;
```

Preferire un commento quando esiste una regola non ovvia:

```ts
// Reserve one credit for every roster slot
// that must still be filled after this purchase.
const maximumBid =
  creditsRemaining - (freeSlots - 1);
```

Rimuovere commenti obsoleti durante il refactoring.

---

## 24. TODO

I `TODO` devono essere specifici.

Evitare:

```ts
// TODO fix this
```

Preferire:

```ts
// TODO(v0.4): replace the temporary in-memory
// authorization check with device registration.
```

Un `TODO` non deve sostituire una issue o una voce di roadmap quando il lavoro è significativo.

---

## 25. Import

Organizzare gli import in gruppi:

1. moduli Node.js;
2. dipendenze esterne;
3. package interni;
4. moduli locali;
5. tipi, se separati dalla configurazione.

Esempio:

```ts
import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { AuctionSession } from "@fantaasta/domain";

import { db } from "../../db/client";
import { auctionSessions } from "../../db/schema";
```

Rimuovere import inutilizzati.

---

## 26. Export

Preferire export nominati:

```ts
export function createAuctionSession() {
  // ...
}
```

Gli export di default possono essere utilizzati quando richiesti da framework o convenzioni già adottate, ma non devono diventare la scelta predefinita.

Gli export nominati facilitano:

- refactoring;
- ricerca;
- import coerenti;
- tooling.

---

## 27. Configurazione

Le variabili di ambiente devono essere:

- documentate in `.env.example`;
- validate all’avvio;
- lette da un modulo di configurazione;
- mai replicate direttamente in più file.

Esempio:

```ts
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_PATH: z
    .string()
    .default("data/database/fantaasta.sqlite"),
});
```

Il codice applicativo deve usare la configurazione validata, non leggere direttamente `process.env` in ogni modulo.

---

## 28. Sicurezza

Non inserire nel repository:

- credenziali;
- PIN reali;
- token;
- file `.env`;
- database runtime;
- backup;
- log contenenti dati sensibili.

Ogni input proveniente da un client deve essere considerato non affidabile.

Le autorizzazioni devono essere verificate lato server.

---

## 29. Git e commit

Il progetto utilizza Conventional Commits.

Formati principali:

```text
feat(scope): description
fix(scope): description
docs(scope): description
refactor(scope): description
test(scope): description
chore(scope): description
```

Esempi:

```text
feat(sessions): add auction session creation API

fix(database): handle missing database directory

docs(architecture): describe persistence layer

test(domain): cover session state transitions

chore(release): prepare v0.3.0
```

I commit devono:

- descrivere una modifica coerente;
- evitare cambiamenti non correlati;
- essere comprensibili dal messaggio;
- lasciare il progetto in uno stato funzionante.

---

## 30. Branch

Ruoli principali:

| Branch | Scopo |
|---|---|
| `main` | Release stabili |
| `develop` | Sviluppo attivo |

Il lavoro ordinario avviene su `develop`.

Il merge in `main` avviene dopo:

```bash
pnpm typecheck
pnpm test
pnpm build
```

e dopo l’aggiornamento della documentazione di release.

---

## 31. Definition of Done

Una funzionalità può essere considerata completata quando:

- il comportamento richiesto è implementato;
- i tipi sono corretti;
- la validazione runtime è presente ai confini;
- gli errori previsti sono gestiti;
- i test rilevanti passano;
- il type checking passa;
- la build passa;
- non sono presenti log temporanei;
- la documentazione necessaria è aggiornata;
- il changelog è aggiornato quando richiesto;
- il commit segue le convenzioni.

Checklist:

```text
[ ] Implementation complete
[ ] Runtime validation complete
[ ] Errors handled
[ ] Tests added or updated
[ ] pnpm typecheck passes
[ ] pnpm test passes
[ ] pnpm build passes
[ ] Documentation updated
[ ] No sensitive data committed
```

---

## 32. Eccezioni alle regole

Le convenzioni possono essere adattate quando una situazione concreta lo richiede.

Ogni eccezione significativa deve:

- migliorare realmente la soluzione;
- essere limitata al caso necessario;
- essere comprensibile;
- non creare incoerenza non motivata;
- essere documentata se influenza l’architettura.

Le regole devono servire il progetto, non ostacolarlo.