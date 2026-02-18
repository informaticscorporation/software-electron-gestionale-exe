# Gestionale Noleggi Pro (Electron)

Applicazione desktop professionale per agenzie di noleggio **auto, moto e barche**, con persistenza locale e pacchetto installabile per PC.

## Novità importanti (compatibilità Windows)

Questa versione evita dipendenze native che richiedono compilazione C++ in fase di `npm install`.

- ✅ Nessuna dipendenza `node-gyp` per il database
- ✅ Installazione più semplice su Windows
- ✅ Compatibile con Node LTS (consigliato Node 20 o 22)

> Se stai usando Node 23, passa a una versione LTS per massima stabilità con Electron.

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
- Archivio locale persistente (file JSON nel profilo utente)
- Build installabile tramite `electron-builder` (target NSIS Windows)

## Requisiti

- Node.js **20 o 22 LTS**
- npm 9+

## Avvio sviluppo

```bash
npm install
npm run dev
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
- `src/db.js`: repository e persistenza locale JSON
- `src/preload.js`: API sicura esposta al renderer
- `renderer/index.html`: UI del gestionale
- `renderer/app.js`: logica frontend (CRUD e rendering)
- `renderer/styles.css`: stile professionale responsive

## Dove salva i dati

L'app crea e aggiorna automaticamente:

- `gestionale-noleggi.json` in `app.getPath('userData')`

## Troubleshooting rapido (Windows)

- Errore `"electron" non è riconosciuto`: significa che `npm install` non è completato. Riesegui installazione su Node LTS.
- Se hai residui corrotti:
  1. chiudi editor/terminali aperti sul progetto
  2. elimina `node_modules` e `package-lock.json`
  3. esegui `npm install`
