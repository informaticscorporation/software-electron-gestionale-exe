# Gestionale Noleggi Pro (Electron)

Applicazione desktop professionale per agenzie di noleggio **auto, moto e barche**, con persistenza locale SQLite e pacchetto installabile per PC.

## Funzionalità principali

- Dashboard con KPI operativi:
  - Veicoli disponibili
  - Noleggi attivi
  - Fatturato mensile
  - Rientri imminenti
- Anagrafica clienti con contatti e documento
- Gestione flotta multi-categoria (Auto / Moto / Barca)
- Gestione contratti di noleggio:
  - Creazione contratto
  - Cambio stato (Prenotato → In Corso → Completato)
  - Aggiornamento disponibilità mezzo in automatico
- Database locale `better-sqlite3` (file persistente nel profilo utente)
- Build installabile tramite `electron-builder` (target NSIS Windows)

## Requisiti

- Node.js 20.x o 22.x LTS (Node 25 non supportato da `better-sqlite3`)
- npm 9+

## Avvio sviluppo

```bash
npm install
npm run dev

> Se hai installato Node 25+, passa a una versione LTS (20 o 22) prima di eseguire `npm install`.
```

## Build installabile

### Windows (.exe con installer NSIS)

```bash
npm run dist
```

Gli artefatti verranno creati in `dist/`.

### Build locale non installabile (cartella unpacked)

```bash
npm run pack
```

## Struttura progetto

- `src/main.js`: processo principale Electron e IPC
- `src/db.js`: schema SQLite, query e logica repository
- `src/preload.js`: API sicura esposta al renderer
- `renderer/index.html`: UI del gestionale
- `renderer/app.js`: logica frontend (CRUD e rendering)
- `renderer/styles.css`: stile professionale responsive

## Note tecniche

- Il DB viene creato automaticamente al primo avvio in `app.getPath('userData')`.
- L'app è pronta per essere estesa con:
  - esportazione PDF contratti
  - gestione pagamenti e fatture elettroniche
  - autenticazione multi-operatore
  - sincronizzazione cloud
