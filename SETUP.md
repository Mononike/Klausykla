# Kaip ikelti i GitHub

## 1. Susikurk GitHub repozitorija

- Eik i github.com → "New repository"
- Pavadinimas: `klausykla`
- Public
- NEKURK README (mes jau turim)
- Create repository

## 2. Ikelk failus (terminale)

Atidaryk terminalą šio `klausykla` aplanko viduje ir paleisk:

```bash
git init
git add .
git commit -m "initial commit — klausykla installation"
git branch -M main
git remote add origin https://github.com/TAVO-USERNAME/klausykla.git
git push -u origin main
```

Pakeisk `TAVO-USERNAME` i savo GitHub varda.

## 3. Ijunk GitHub Pages

- Repo puslapyje eik: Settings → Pages
- Source: pasirink "GitHub Actions"
- Palaukk ~2 minutes kol suveiks deploy
- Tavo svetaine bus: `https://TAVO-USERNAME.github.io/klausykla/`

## 4. Web demo lokaliai (VS Code)

```bash
cd web-demo
npm install
npm run dev
```

Atsidarys `http://localhost:5173/klausykla/`

## 5. Jei keiti koda

Po pakeitimu tiesiog:

```bash
git add .
git commit -m "aprasymas ka pakeiciau"
git push
```

GitHub Pages automatiskai atsinaujins per ~2 minutes.

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
