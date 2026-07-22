# FantaAstaAPP — Struttura iniziale proposta

```text
FantaAstaAPP/
├── apps/
│   ├── server/
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   │   ├── client.ts
│   │   │   │   ├── schema.ts
│   │   │   │   └── migrations/
│   │   │   ├── modules/
│   │   │   │   ├── health/
│   │   │   │   ├── leagues/
│   │   │   │   ├── teams/
│   │   │   │   ├── players/
│   │   │   │   ├── auction/
│   │   │   │   ├── realtime/
│   │   │   │   ├── imports/
│   │   │   │   ├── exports/
│   │   │   │   └── backups/
│   │   │   ├── shared/
│   │   │   └── types/
│   │   └── tests/
│   └── web/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── admin/
│       │   │   ├── remote/
│       │   │   └── public/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── styles/
│       │   └── types/
│       └── public/
├── packages/
│   ├── contracts/
│   ├── domain/
│   ├── validation/
│   └── config/
├── data/
│   ├── database/
│   ├── imports/
│   └── exports/
├── backups/
├── logs/
├── launcher/
├── docs/
│   ├── FANTA_ASTA_APP_SPEC.md
│   ├── IMPLEMENTATION_ROADMAP.md
│   └── INITIAL_STRUCTURE.md
├── PROJECT_CONTEXT.md
├── README.md
├── package.json
├── tsconfig.base.json
├── .env.example
└── .gitignore
```

Principi:

- dominio separato dall'infrastruttura;
- motore d'asta indipendente dalla UI;
- contratti realtime condivisi;
- logica di presentazione fuori dal database;
- validazione comandi sempre lato server.
