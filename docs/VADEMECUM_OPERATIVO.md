# FantaAstaAPP — Vademecum operativo per la trasferta

> Manuale pratico per preparazione, avvio, conduzione e chiusura di una serata d'asta.
>
> Questo documento affianca README, SPEC, ADR e documentazione tecnica. Non sostituisce le regole di dominio: serve come checklist operativa per il banditore/amministratore.

---

## 1. Obiettivo del vademecum

Questo documento descrive il flusso operativo verificato durante il collaudo end-to-end di FantaAstaAPP, dalla preparazione della postazione fino alla chiusura definitiva della sessione.

La sequenza generale è:

```text
Preparazione postazione
→ avvio FantaAstaAPP
→ configurazione /admin/config
→ READY
→ START
→ asta ordinaria
→ eventuali sospensioni/correzioni
→ completamento rose 24/24
→ COMPLETED
→ scelta terzi portieri FMS
→ export FMS ReVo
→ verifica file/import
→ CLOSED
```

---

## 2. Preparazione prima della trasferta

Prima di lasciare la postazione di sviluppo:

- verificare che il branch operativo sia aggiornato e pulito;
- eseguire almeno test principali, typecheck e build;
- verificare che i runtime locali non siano finiti accidentalmente in Git;
- verificare la presenza del database operativo;
- verificare che il PC disponga dei file necessari per avvio/arresto dell'app;
- portare con sé eventuali QR code statici già preparati;
- verificare che l'archivio giocatori importato in FantaAstaAPP sia della stessa stagione che verrà usata in FMS ReVo.

### Controllo Git rapido

```powershell
git status
git log -3 --oneline --decorate
```

Le directory runtime locali, se presenti, non devono essere committate.

---

## 3. Configurazione fisica consigliata

Configurazione collaudata:

- **PC principale**: setup/configurazione, browser di servizio e launcher AVVIA/ARRESTA FantaAstaAPP;
- **monitor esterno collegato al PC**: `/public`;
- **iPad**: `/admin`;
- **smartphone dei presidenti**: `/remote`;
- **dispositivo di emergenza / PC**: `/remote/all` (telecomando universale).

Il monitor pubblico deve essere configurato come schermo esteso, non duplicato.

---

## 4. Avvio dell'applicazione

### Procedura normale

1. Avviare il PC.
2. Collegare il PC alla rete locale che verrà usata durante l'asta.
3. Collegare e configurare il monitor esterno.
4. Avviare FantaAstaAPP tramite il collegamento **AVVIA FantaAstaAPP**.
5. Attendere l'avvio del server e della web app.
6. Aprire la Home.
7. Aprire setup sul PC, `/public` sul monitor esterno, `/admin` sull'iPad e i telecomandi sugli smartphone.

### Controllo tecnico opzionale

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -eq 3001 } |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Nel runtime production v1.0:

- `3001` = unico endpoint Fastify per API, Socket.IO, asset e frontend compilato;
- `5173` è una porta esclusivamente di sviluppo Vite e non è richiesta durante l'asta.

---

## 5. Arresto completo dell'applicazione

Usare il collegamento **ARRESTA FantaAstaAPP**.

Per verificare che l'arresto sia stato completo:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -eq 3001 }
```

Il comando non deve restituire righe.

Controllo ulteriore:

```powershell
Get-Process node -ErrorAction SilentlyContinue |
  Select-Object Id, ProcessName, Path
```

Durante il collaudo, lo script di arresto ha liberato entrambe le porte e terminato tutti i processi Node relativi all'app.

---

## 6. Connessione dei dispositivi

### iPad amministratore

Aprire `/admin`. Per un uso più simile a un'app dedicata, usare il collegamento aggiunto alla schermata Home dell'iPad.

### Monitor pubblico

Aprire `/public` sul monitor esterno e portarlo a schermo intero.

### Telecomandi squadra

Ogni squadra può collegarsi tramite QR code generato/configurato, QR code statico precedentemente preparato se coerente con la sessione, oppure URL remoto con identificazione squadra e PIN.

### Telecomando universale

`/remote/all` è destinato all'uso amministrativo/emergenza e permette di gestire rilanci e PASS anche senza utilizzare i singoli smartphone dei presidenti.

---

### PDF QR della sessione

Per v1.0.0 il PDF QR non viene caricato da `/admin/config`.

Il file sorgente servito dall'applicazione deve essere sostituito in:

```text
apps/web/public/docs/QRcode.pdf
```

e successivamente deve essere eseguito:

```powershell
pnpm build
```

Vite copierà il documento in `apps/web/dist/docs/QRcode.pdf`. La cartella
`dist` è output generato e non deve essere usata come sorgente master.

È consigliato conservare fuori dal repository una copia chiaramente nominata
del PDF di ciascuna lega/sessione e sostituire il master prima della relativa
asta. L'upload amministrativo del PDF QR è rinviato alla v1.0.1.

## 7. Setup della sessione

In `/admin/config` verificare almeno:

- lega corretta;
- stagione ed edizione;
- crediti iniziali;
- squadre partecipanti;
- presidenti;
- PIN;
- ordine girotavolo;
- import archivio giocatori;
- import rose iniziali/confermati;
- readiness della sessione.

Una sessione non deve essere portata a READY finché la configurazione non è coerente.

---

## 8. Avvio e conduzione dell'asta

Quando il setup è pronto:

```text
SETUP → READY → RUNNING
```

Dopo START:

- il sistema determina il prossimo chiamante;
- il chiamante seleziona un giocatore;
- il banditore prepara la chiamata;
- viene impostato il prezzo iniziale;
- la chiamata viene aperta;
- i telecomandi gestiscono rilanci/PASS;
- il sistema determina leader, esclusioni e aggiudicazione;
- il banditore conferma l'aggiudicazione definitiva.

---

## 9. Preparazione di una chiamata

Il pulsante **Prepara chiamata** deve essere utilizzabile solo quando:

- la sessione è RUNNING;
- non esiste una chiamata operativa;
- il giocatore è disponibile;
- il prossimo chiamante ha ancora spazio nel ruolo del giocatore selezionato.

Se il ruolo è già completo per il prossimo chiamante, il pulsante resta disabilitato.

Tooltip previsto:

```text
Ruolo gia completo per <Nome Squadra>
```

Il backend mantiene comunque le proprie validazioni: il blocco UI è una protezione aggiuntiva.

---

## 10. Rotazione del chiamante

La rotazione segue `tableOrder`, ma salta le squadre con rosa ordinaria già completa.

Esempio:

```text
ultimo chiamante: squadra 6
squadra 7: 24/24 → SALTA
squadra 8: incompleta → prossimo chiamante
```

Se una squadra ha completato un singolo ruolo ma non la rosa, resta eleggibile come chiamante ma può chiamare solo giocatori appartenenti a ruoli con slot ancora disponibili.

Quando tutte le rose sono complete non esiste più un prossimo chiamante eleggibile.

---

## 11. Rilanci, PASS ed esclusioni

Durante una chiamata il sistema può escludere automaticamente una squadra per motivi quali:

- rosa completa;
- limite ruolo raggiunto;
- massimo rilancio insufficiente;
- esclusione amministrativa/operativa prevista dal dominio.

### Caso limite verificato

Se il prezzo corrente è già pari al massimo rilancio di un'altra squadra, questa non può rilanciare ulteriormente. Il sistema può quindi escluderla automaticamente, lasciare il leader come unico partecipante e proporre direttamente la conferma dell'aggiudicazione.

Non è necessario imporre un PASS artificiale.

---

## 12. Telecomando universale

Il telecomando universale è utile per collaudo, emergenza, assenza temporanea di un telecomando squadra e gestione centralizzata da parte del banditore.

Quando non esiste una chiamata operativa, le squadre possono apparire come `ATTIVA`: in questo contesto indica semplicemente che non esiste un'esclusione relativa a una chiamata corrente.

Durante una chiamata, invece, `ATTIVA`, `ESCLUSO`, `LEADER`, `TOCCA A TE` e altri stati descrivono la partecipazione effettiva a quella specifica chiamata.

---

## 13. Sospensione e ripresa

Per pause o problemi usare la sospensione della sessione.

```text
RUNNING → SUSPENDED → RUNNING
```

Durante `SUSPENDED`:

- i telecomandi sono in sola lettura;
- non devono essere eseguite normali operazioni d'asta;
- è possibile effettuare le operazioni amministrative previste;
- la ripresa è manuale.

La sospensione genera il backup previsto dal sottosistema event-driven.

---

## 14. Operazioni straordinarie

### 14.1 Assegnazione manuale

Serve per saltare l'intero workflow di chiamata/rilanci/PASS e assegnare direttamente un giocatore nei casi eccezionali previsti.

Continua a rispettare disponibilità del giocatore, limiti ruolo, capienza della rosa, crediti, sostenibilità economica, unicità del giocatore, audit e `stateVersion`.

### 14.2 Correzione amministrativa

Serve per rimuovere/correggere un giocatore già assegnato.

Il motivo è obbligatorio.

La correzione aggiorna rosa e crediti, rende nuovamente disponibile il giocatore quando previsto e conserva tracciabilità/audit.

---

## 15. Fine delle rose ordinarie

La rosa autoritativa FantaAstaAPP è:

```text
2 P
8 D
8 C
6 A
Totale 24
```

Quando tutte le squadre hanno completato i 24 slot:

1. non devono essere aperte nuove chiamate;
2. premere **Termina asta**;
3. la sessione passa a `COMPLETED`.

La conclusione della sessione ordinaria attiva la fase di preparazione dell'export FMS ReVo.

---

## 16. Terzo portiere FMS ReVo

Il terzo portiere è **export-only**.

Non è il 25° giocatore della rosa FantaAstaAPP e non crea una normale `roster_entry`, non occupa uno dei 24 slot, non consuma crediti, non modifica `remainingCredits` e non altera i limiti `2 P / 8 D / 8 C / 6 A`.

### Requisiti

Per ogni fantasquadra:

- la rosa ordinaria deve avere esattamente 2 portieri;
- entrambi devono avere squadra reale valorizzata;
- il terzo portiere deve avere ruolo `P`, essere disponibile, appartenere ad almeno una delle squadre reali dei due portieri ordinari e non essere già selezionato come terzo portiere da un'altra fantasquadra.

La scelta è consentita in:

```text
COMPLETED
CLOSED
```

### Costo export

```text
role = P
acquisitionCost = 0
contractYear = 1
```

---

## 17. Conflitto nella scelta del terzo portiere

Uno stesso portiere non può essere selezionato come export-only da due fantasquadre.

È possibile che una scelta valida fatta per una squadra renda successivamente impossibile la scelta obbligata di un'altra.

Procedura:

1. tornare sulla scelta della squadra precedente;
2. selezionare un candidato alternativo compatibile;
3. liberare il candidato necessario alla squadra vincolata;
4. completare le selezioni fino a 8/8.

Questo caso è raro e non richiede una risoluzione automatica globale.

---

## 18. Export FMS ReVo

Dopo rose ordinarie complete e terzi portieri selezionati 8/8, premere **Esporta rose FMS ReVo**.

Il formato finale è TAB-separated, senza intestazione:

```text
Role<TAB>Name<TAB>Cost<TAB>ContractYear
```

Ogni file contiene:

```text
3 P
8 D
8 C
6 A
Totale 25 righe
```

Il terzo portiere compare a costo `0`.

---

## 19. Download multiplo nel browser

L'export dell'intera sessione genera un file `.txt` per ogni fantasquadra.

Il browser può chiedere l'autorizzazione a scaricare più file. Scegliere **Consenti**.

---

## 20. Verifica dei file prima della chiusura

Prima di chiudere definitivamente la sessione:

1. aprire almeno uno o due file esportati;
2. verificare che contengano 25 righe, il terzo portiere e il terzo portiere a costo 0;
3. se possibile, effettuare una prova di import in FMS ReVo.

---

## 21. Nota fondamentale: coerenza stagionale FMS ReVo

Un file `.txt` può essere formalmente corretto ma essere rifiutato da FMS ReVo se contiene giocatori non presenti nell'archivio della stagione attualmente caricata in FMS.

Caso verificato durante il collaudo:

- file FantaAstaAPP relativo a rose/stagione `2025/2026`;
- FMS ReVo aggiornato all'archivio `2026/2027`;
- FMS segnala file non elaborabile;
- rimuovendo dal file i giocatori non presenti nell'archivio corrente, lo stesso file viene accettato.

Conclusione:

> Prima dell'asta reale, l'archivio giocatori usato da FantaAstaAPP e quello presente in FMS ReVo devono essere coerenti con la stessa stagione.

Un errore FMS di import non implica automaticamente un errore di formato dell'export.

---

## 22. Checklist di chiusura FMS

Prima di chiudere la sessione verificare:

```text
✓ Rose ordinarie complete
✓ Terzi portieri 8/8
✓ Export FMS ReVo
```

Dopo l'export il pulsante può diventare **Esporta nuovamente**.

---

## 23. Chiusura definitiva della sessione

Dopo aver verificato l'export:

1. premere **Chiudi sessione**;
2. leggere la conferma;
3. confermare solo se l'export FMS è stato completato/verificato.

```text
COMPLETED → CLOSED
```

In `CLOSED` le normali operazioni d'asta non sono disponibili, le rose finali e lo storico rimangono consultabili e la sessione assume uno stato protetto.

Non chiudere la sessione prima di aver verificato l'export.

---

## 24. Backup operativo

Il backup è event-driven.

Trigger previsti includono almeno:

- aggiudicazione definitiva;
- correzione definitiva;
- sospensione sessione;
- completamento sessione;
- backup manuale.

Durante la serata non effettuare pruning automatico dei backup.

---

## 25. Recovery ed emergenza

In caso di crash o problema serio:

1. non modificare direttamente il database;
2. se possibile fermare l'app;
3. verificare lo stato dei processi;
4. usare il flusso di recovery previsto;
5. selezionare esplicitamente il backup da ripristinare;
6. non scegliere automaticamente "l'ultimo backup" senza verifica;
7. dopo il ripristino, verificare sessione, rose, crediti e stato operativo prima di riprendere.

Una sessione `CLOSED` non deve essere modificata direttamente. Se occorre correggerla, utilizzare esclusivamente il percorso amministrativo previsto:

```text
CLOSED → COMPLETED
```

---

## 26. Checklist rapida del banditore

### Prima di partire

- [ ] Repository aggiornato e pulito
- [ ] Test/typecheck/build verdi
- [ ] Database operativo presente
- [ ] QR code disponibili
- [ ] Archivio giocatori della stagione corretta
- [ ] Script AVVIA/ARRESTA disponibili
- [ ] PC, iPad, monitor, telefoni e alimentatori pronti

### In sala — prima dell'asta

- [ ] Rete locale funzionante
- [ ] Monitor esterno collegato
- [ ] FantaAstaAPP avviata
- [ ] `/admin/config` raggiungibile
- [ ] `/admin` raggiungibile da iPad
- [ ] `/public` aperto sul monitor
- [ ] `/remote` verificato almeno su un telefono
- [ ] `/remote/all` disponibile per emergenza
- [ ] Lega/sessione corretta
- [ ] 8 squadre presenti
- [ ] Ordine girotavolo corretto
- [ ] Archivio giocatori importato
- [ ] Rose iniziali/confermati importati
- [ ] Presidenti/PIN/QR verificati
- [ ] Sessione READY

### Durante l'asta

- [ ] START
- [ ] Controllare prossimo chiamante
- [ ] Preparare giocatore corretto
- [ ] Aprire chiamata
- [ ] Gestire rilanci/PASS
- [ ] Confermare aggiudicazione
- [ ] Verificare eventuali esclusioni automatiche
- [ ] Usare SUSPEND per pause/correzioni
- [ ] Usare operazioni straordinarie solo quando necessario

### Fine asta

- [ ] Tutte le rose 24/24
- [ ] Termina asta
- [ ] Stato COMPLETED
- [ ] Selezionare terzi portieri 8/8
- [ ] Esportare file FMS
- [ ] Consentire download multiplo nel browser
- [ ] Verificare almeno uno/due file
- [ ] Verificare compatibilità con archivio FMS della stagione
- [ ] Chiudi sessione
- [ ] Stato CLOSED

---

## 27. Nota finale

Il collaudo end-to-end ha verificato il percorso completo fino a `CLOSED`, incluse connessioni multi-dispositivo, telecomandi, telecomando universale, rilanci e PASS, esclusioni automatiche, rotazione del chiamante con salto delle rose complete, limiti di ruolo, assegnazione manuale, correzione amministrativa, sospensione/ripresa, completamento delle rose, scelta dei terzi portieri, conflitto di selezione export-only, export FMS ReVo, download multiplo, compatibilità stagionale dell'archivio FMS e chiusura definitiva della sessione.

Il Vademecum deve essere aggiornato quando il workflow operativo reale cambia.
