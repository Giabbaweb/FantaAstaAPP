# FantaAstaAPP — Roadmap di implementazione

## 0.1 — Fondazioni

Deliverable:

- struttura repository;
- TypeScript;
- Fastify;
- SQLite + Drizzle;
- migrazioni;
- `GET /api/health`;
- React + Vite;
- pagina `/admin` minima;
- Pino;
- Vitest;
- `.env.example`;
- script di avvio locale.

Criteri di accettazione:

- un solo comando avvia l'ambiente;
- health check OK;
- database creato;
- migrazione applicabile;
- `/admin` raggiungibile;
- log disponibili;
- almeno un test passa.

## 0.2 — Configurazione lega

- squadre;
- presidenti;
- PIN;
- crediti;
- vincoli ruolo;
- giocatori;
- import;
- rose iniziali.

## 0.3 — Motore d'asta

- apertura chiamata;
- giro di tavolo;
- rilanci;
- PASS;
- undo PASS;
- massimo sostenibile;
- esclusioni;
- assegnazione provvisoria.

## 0.4 — Telecomandi

- Socket.IO;
- login squadra;
- operatore;
- osservatore;
- stato realtime;
- rilanci;
- conferma PASS.

## 0.5 — Assegnazione

- conferma banditore;
- transazione;
- crediti;
- rosa;
- eventi;
- backup.

## 0.6 — Schermo pubblico

- 8 squadre;
- crediti;
- P/D/C/A;
- posti liberi;
- chiamata corrente;
- modalità outdoor.

## 0.7 — Pausa e resilienza

- `SUSPENDED`;
- Pizza Break;
- ripresa manuale;
- blocco comandi;
- disconnessioni;
- modalità manuale;
- backup pausa.

## 0.8 — Operazioni manuali

- assegnazioni manuali;
- opzioni manuali;
- correzioni;
- motivazioni;
- audit.

## 0.9 — Compatibilità e recovery

- import FMS;
- export FMS;
- snapshot;
- recovery;
- log consultabile;
- verifica integrità.

## 1.0 — Rilascio

- test completi;
- simulazione asta;
- hardening;
- launcher;
- guida operativa;
- pacchetto locale.

## 1.1 — Opzioni automatiche

- esclusione titolare;
- asta tra avversari;
- diritto di trattenere a +1;
- assegnazione a 1 senza offerte;
- contratto anno 1.
