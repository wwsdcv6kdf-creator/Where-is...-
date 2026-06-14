# Where is…? 🌍📍

Ein Geografie-Quiz fürs iPhone (Web-App / PWA). Pro Runde:

1. **Flagge → Land** (1 Punkt) – Welches Land gehört zur gezeigten Flagge? 4 Auswahlmöglichkeiten.
2. **Hauptstadt** (1 Punkt) – Wie heißt die Hauptstadt? 4 Auswahlmöglichkeiten.
3. **Lage** (max. 3 Punkte) – Setze die Stecknadel auf der Weltkarte möglichst nah an die Hauptstadt.
   Die Entfernung Stecknadel → Hauptstadt entscheidet:
   - **≤ 50 km → 3 Punkte**
   - **≤ 200 km → 2 Punkte**
   - **≤ 300 km → 1 Punkt**
   - darüber → 0 Punkte

Es werden **5 Runden** gespielt, danach werden die Punkte addiert (**maximal 25**).
Die Karte zeigt **nur Landmassen, keine Ländergrenzen und keine Beschriftung** – die Lage muss man erraten.

## Inhalt
- **195 Länder** mit deutschem Namen, Hauptstadt, Hauptstadt-Koordinaten und Flagge.
- Datenquelle: [Natural Earth](https://www.naturalearthdata.com/) (gemeinfrei).
- Karte: [Leaflet](https://leafletjs.com/) (lokal eingebunden, keine externen Kartenkacheln) + Land-Polygone von Natural Earth.

## Starten

### Schnell ausprobieren (Computer)
Im Ordner `where-is/` einen kleinen Webserver starten und die Seite öffnen:

```bash
cd where-is
python3 -m http.server 8099
# dann im Browser: http://localhost:8099/
```

> Tipp: Direktes Öffnen der Datei per `file://` kann am Service Worker scheitern – die App
> funktioniert aber auch ohne ihn. Für die beste Erfahrung über einen Webserver / Hosting öffnen.

### Aufs iPhone (wie eine App)
1. Den Ordner `where-is/` irgendwo hosten (z. B. GitHub Pages, Netlify, oder einen lokalen Server im selben WLAN).
2. Die Adresse in **Safari** auf dem iPhone öffnen.
3. **Teilen-Symbol → „Zum Home-Bildschirm"** wählen.
4. Die App startet danach im Vollbild mit eigenem Icon („Where is…?").

Nach dem ersten Laden funktioniert das Spiel dank Service Worker **offline**.

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Aufbau / Bildschirme |
| `styles.css` | Gestaltung (mobil-first) |
| `app.js` | Spiellogik, Punkte, Karte |
| `data/countries.js` | 195 Länder (Name, Hauptstadt, Koordinaten, Flagge, Kontinent) |
| `data/land.js` | Land-Polygone für die Karte (ohne Grenzen) |
| `vendor/leaflet.*` | Leaflet (lokal) |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | PWA / Home-Bildschirm / Offline |
