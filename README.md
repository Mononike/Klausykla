# Laipčiaus Klausykla

**Haptic sound installation — master's thesis project**

*Staircase Listening Room* explores listening as an embodied action. The Lithuanian word **KLAUSYK** (LISTEN) is transformed into tactile 3D letter sculptures, where each letter becomes a haptic-acoustic architecture activated by touch.

The installation is grounded in the **kiki-bouba** crossmodal correspondence: angular forms generate high-frequency, sharp sounds; curved forms produce low-frequency, warm resonances. Touch intensity (via piezo sensors) controls sound parameters in real time — the object *invites sound from itself*, and the viewer is a witness, not an author.

The title "Staircase Listening Room" is a *metaphor for a metaphor* — there are no physical stairs in the installation.

## Live Demo


→ **[Web Demo](https://YOUR-USERNAME.github.io/klausykla/)** *(update after deploying)*

Interactive browser prototype using Tone.js. Mouse position on each letter modulates sound parameters, simulating piezo sensor input.

## Repository Structure



```
klausykla/
├── supercollider/
│   ├── 01_synthdefs.scd        # Five sound type definitions
│   ├── 02_piezo_serial.scd     # Arduino serial → sound mapping
│   └── klausykla_be_piezo.scd  # GUI version for testing without hardware
├── arduino/
│   └── piezo_arduino.ino       # Piezo sensor reading + serial output
├── web-demo/                   # Interactive browser prototype (React + Tone.js)
│   ├── src/App.jsx
│   └── ...
└── README.md
```

## Five Sound Types

| Sound | Character | Trigger | Letter |
|-------|-----------|---------|--------|
| **Kiki Cluster** | Sharp, high-frequency FM cluster | Strong touch | K |
| **Bass Rumble** | Sub-frequency vibration felt in the body | Gentle touch | L |
| **Modulation & Reverb** | Evolving spatial sound — *khôra* | Medium touch | A |
| **Low Hum** | Deep warm drone — bouba warmth | Very gentle touch | U, S |
| **Glitch Clicks** | Fragmented clicks — temporal masking | Strong touch | Y |

## Technical Architecture

```
[Piezo Sensor] → [Arduino Uno (A0)] → [USB Serial 115200] → [SuperCollider]
    touch           analogRead()          println(raw)         sound synthesis
```

Piezo value (0–1023) is normalized to 0.0–1.0 and maps to:
- **Which sound** plays (gentle → bouba, strong → kiki)
- **How it sounds** (each parameter responds to touch intensity)

## Hardware Setup

**Components:** Arduino Uno, piezo disc, 1MΩ resistor, jumper wires

```
Arduino A0 ---+--- Piezo (+)
              |
           [1MΩ]
              |
Arduino GND --+--- Piezo (-)
```

## Quick Start

### SuperCollider (with hardware)

1. Upload `arduino/piezo_arduino.ino` to Arduino
2. Open SuperCollider, run `supercollider/01_synthdefs.scd` (Cmd+A, Cmd+Enter)
3. In `supercollider/02_piezo_serial.scd`, update serial port name, run "Step 1" block
4. Touch the piezo — hear sound

### SuperCollider (without hardware)

1. Open and run `supercollider/klausykla_be_piezo.scd`
2. Use GUI slider + buttons 1–5

### Web Demo (local)

```bash
cd web-demo
npm install
npm run dev
```

Opens at `localhost:5173`. Hover over letters, move mouse — distance from center = piezo intensity.

### Deploy to GitHub Pages

```bash
cd web-demo
npm run build
```

Then enable GitHub Pages in repo settings → Source: GitHub Actions, or push the `dist` folder to a `gh-pages` branch.

## Theoretical Framework

The project draws on crossmodal correspondence research (Ramachandran & Hubbard), embodied cognition (Lakoff & Johnson), phenomenology of listening (Barthes), and psychoacoustic studies of sound-shape associations in Lithuanian (Mikalonytė & Dranseika).

## Author

Part of a master's thesis at Vilnius Academy of Arts.

## License

This project is shared for educational and research purposes.
