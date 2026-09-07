# MalMit

Kollaboratives Whiteboard — gemeinsam in Echtzeit zeichnen, kein Login nötig.

## Features

- **Echtzeit-Kollaboration** — mehrere Nutzer im gleichen Raum via Socket.IO
- **Username** — Namenswahl beim Betreten des Raums
- **Zeichenwerkzeuge** — Stift, Linie, Rechteck, Kreis, Radierer, Auswahl
- **HSL-Farbpicker** — Spektralstreifen + H/S/L-Regler inkl. Vorschau
- **128-Farben-Palette** — Rechtsklick speichert, Linksklick lädt (localStorage)
- **Neon-Glow-Effekt** — automatisch für helle, gesättigte Farben
- **Peer-Cursor** — sieht wo andere gerade zeichnen
- **KI-Verfeinerung** — markierten Bereich per lokaler Stable Diffusion (Vulkan) verbessern
- **Undo / Clear / Download** — Zeichnung als PNG exportieren
- **Touch-support** — funktioniert auf Tablets und Mobilgeräten
- **Dark Theme** — augenschonendes, modernes UI

## Quick Start

### Lokal (Node.js)

```bash
npm install
npm start
```

App läuft auf `http://localhost:3030`

### Docker

```bash
docker compose up -d
```

Port 3030 wird exposed. Stoppen mit `docker compose down`.

## Nutzung

1. Namen eingeben
2. Raumname eingeben oder „Create Random Room" wählen
3. Link kopieren (Raum-ID oben klicken) und teilen
4. Loszeichnen!

## KI-Verfeinerung (optional)

Voraussetzung: Lokaler Stable Diffusion Server (z.B. [sd-server](https://github.com/AUTOMATIC1111/stable-diffusion-webui) mit API) auf `localhost:8080`.

1. Werkzeug „Select" wählen
2. Bereich auf Canvas markieren
3. Stern-Button (✨) klicken
4. Markiertes Bild wird an `/api/refine` gesendet → SD img2img → Ergebnis wird eingefügt

## API

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/refine` | POST | Bild an Stable Diffusion senden. Body: `{ image: dataURL, prompt: string }` |

## Technologien

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Vanilla JS, Canvas API, HSL-Farbsystem
- **AI:** Stable Diffusion img2img (lokal via Vulkan)
- **Deployment:** Docker (node:20-alpine)

## Projektstruktur

```
malmit/
├── server.js          # Express + Socket.IO Server
├── public/
│   └── index.html     # Komplette Single-Page-App
├── package.json
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

## Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `PORT` | `3030` | Server-Port |

## Lizenz

MIT
