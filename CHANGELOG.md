# Changelog

All notable changes to this project are documented in this file.

This project adheres loosely to [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and uses semantic-ish versioning for milestones.

## \[v1.1] – 2025-08-22

### Added

* **Bomben-Upgrade** für den Standardturm (exklusiv zu Eis/Feuer/Gift):

  * Schießt **langsamer** (Cooldown-Multiplier), verursacht **AoE-Schaden**.
  * Basis-AoE-Radius = **2/3** des Feuer-Explosionsradius.
  * **5 Upgrade-Stufen**, die den AoE-Radius pro Stufe erhöhen.
  * Bomben-Geschosse übernehmen **Krit-Chance** und **Krit-Multiplikator**.
  * AoE-Schaden profitiert vom **×2-Debuff-Multiplikator**, wenn Ziele alle drei Debuffs tragen (z. B. durch andere Türme).
* **UI-Erweiterung** für Bomben-Track: Anzeige von Blast-Radius, Upgrade-Button, goldener Reichweitenring bei aktiver Bomben-Spezialisierung.

### Changed

* **Spezialisierungs-Exklusivität** erweitert: Pro Turm weiterhin nur **eine** Spezialisierung (Eis **oder** Feuer **oder** Gift **oder** Bombe). Nicht kompatible Buttons werden ausgeblendet.
* Feuerrate des Turms wird bei aktivem Bomben-Upgrade durch den **Bomben-Cooldown-Multiplikator** verlangsamt.
* Spawning refaktoriert: **`spawnTick(dt)`** sorgt für robuste Gegnererzeugung pro Frame.

### Fixed

* **Freeze bei Bombenexplosion**: Bomben-Projektil rechnet AoE-Schaden jetzt **lokal & nebenwirkungsfrei**, markiert sich **vor** dem AoE als beendet und iteriert über eine **Kopie** der Gegnerliste. Keine zyklischen Effekte/Re-Entrys mehr.
* **Wellen-Spawns** erscheinen zuverlässig nach „Nächste Welle“ (Timer-Init auf 0; Mindestabstand zwischen Spawns; defensive Fallbacks für `spawnInterval`).
* Stabilere Projektile-Updates/Draws (tolerant, falls unterschiedliche Projektiltypen vorhanden sind).

---

## [v1.0] – 2025-08-22

### Added

* Core gameplay loop: S‑förmiger Weg, Gegnerwellen, Burg mit HP & Reparatur, Gold‑Economy.
* Ein Turmtyp (Pfeile) mit Upgrades: **Schaden**, **Reichweite**, **Angriffstempo**, **Krit**.
* **Krit-Upgrade** neu skaliert: +5% Chance pro Level; Multiplikator startet bei ×1.5 und steigt um +0.1 pro Level (Chance capped).
* **Zielmodi**: Stärkster, Geringste HP, Nächster, Weitester, **Erster (Standard)**, **Letzter**.
* **Status-Effekte**:

  * **Feuer** (DoT, stackt bis ×3), Level 1–5 (mehr Schaden, schnellere Ticks).
  * **Gift** (DoT, stackt bis ×3), Level 1–5 (mehr Schaden, schnellere Ticks).
  * **Eis** (Slow, einmalig).
  * **Exklusivität**: Ein Turm kann **nur einen** der drei DoT‑Tracks besitzen (Feuer **oder** Gift **oder** Eis). UI blendet nicht kompatible Buttons aus.
* **Feuer‑Explosion** (AoE) **nur beim Tod** eines brennenden Gegners; entflammt nahe Gegner (mit reduzierten Werten). Sichtbarer Explosionsring als VFX.
* **Debug‑Tools** (Dev‑Panel):

  * 🧪 *Testwelle* starten
  * 👾 *1 Gegner spawnen*
  * ⏩ Spielgeschwindigkeit ×1/×2/×4
  * 🎯 Hitboxen/Pfad‑Buffer anzeigen
  * 🧬 DoT‑Overlay (Stacks & nächste Tick‑Zeiten je Gegner)
  * 🐞 *Kosten 0* Umschalter

### Changed

* „Ressourcen“ → **Gold** (Begriffswechsel im gesamten UI/Code).
* Wellen‑Button jederzeit drückbar (kann mehrere Wellen back‑to‑back starten / stapeln).
* Default‑Zielmodus des Turms ist jetzt **Erster Gegner**.
* Projekt in Module aufgeteilt (leichtere Wartung):

  * `config.js`, `state.js`, `main.js`, `utils.js`, `cost.js`,
  * `effects.js`, `targeting.js`, `vfx.js`, `ui.js`,
  * `entities/Enemy.js`, `entities/Tower.js`, `entities/Projectile.js`.

### Fixed

* **Pfad** wird stabil gerendert (mehrlagiger Stroke, Canvas‑State‑Reset).
* **UI‑Klicks**: Event‑Delegation + „dirty render“ verhindert Eingabe‑Schlucken; Buttons reagieren zuverlässig (auch bei Touchpad/Trackpad).
* **Spawn‑System** wiederhergestellt (Timers/Spawnschleife, stapelbare Wellen).
* **DoT‑Stabilität**:

  * Ticks haben Sicherheitskappen (`MIN_TICK`, `MAX_TICKS_PER_UPDATE`) gegen FPS‑Einbrüche.
  * Feuer/Gift‑Stacks ersetzen bei vollem Limit den **ältesten** Stack (kein Flackern 0–3).
  * Zufalls‑Offsets für Tick/Laufzeit entkoppeln Stack‑Abläufe.
  * AoE wird **nicht** mehr beim DoT‑Ablauf ausgelöst.
* **Krit‑Upgrade** neu berechnet (Chance & Multiplikator korrekt skaliert).
* Zielmodi **Erster/Letzter** vertauscht → **korrigiert**.

### Notes / Dev

* Lokaler Start via HTTP (z. B. `php -S localhost:8000 -t .`) nötig, da ES‑Modules per `file://` durch CORS blockiert werden.
* HUD rendert nur bei Änderungen (Performance), VFX und Overlays separat gezeichnet.

---

## \[Unreleased]

* (Platzhalter für kommende Features/Balancing)

[v1.0]: https://example.com/releases/v1.0
