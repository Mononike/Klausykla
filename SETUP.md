

## Repo struktura

```
klausykla/
├── .github/workflows/deploy.yml   ← automatinis deploy
├── supercollider/
│   ├── 01_synthdefs.scd           ← garso receptai
│   ├── 02_piezo_serial.scd        ← piezo → garsas
│   └── klausykla_be_piezo.scd     ← GUI testavimui
├── arduino/
│   └── piezo_arduino.ino          ← piezo skaitymas
├── web-demo/
│   ├── src/App.jsx                ← interaktyvus maketas
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── .gitignore
├── README.md                      ← angliskas aprasymas
└── SETUP.md                       ← sita instrukcija
```
