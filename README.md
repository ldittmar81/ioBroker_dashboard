![ioBroker Dashboard](doc/img/ioBrokerDashboard.png)
# ioBroker Dashboard
Das ioBroker Dashboard ist eine schlanke und benutzerfreundliche Weboberfläche, die sich über den [ioBroker.ws-Adapter](https://github.com/ioBroker/ioBroker.ws) mit ioBroker verbindet. Es setzt bewusst auf reines JavaScript und CSS, um den Code einfach und verständlich zu halten, sodass auch Entwickler*innen ohne tiefgehende Framework-Kenntnisse mitwirken können.

## Voraussetzungen
- **ioBroker**: Eine funktionierende Installation von ioBroker.
- **ioBroker.ws-Adapter** Installation und Konfiguration gemäß der [Anleitung](https://github.com/ioBroker/ioBroker.ws).
- **Node.js und npm**: Für die Installation und Nutzung der Entwicklungsumgebung.
- **Webserver**: Ein lokaler Webserver zur Ausführung des Dashboards.

## Dokumentation
Muss noch geschrieben werden...

## Nutzung
### 1. ioBroker.ws Adapter installieren
Installiere den Adapter wie in dessen [GitHub-Repo](https://github.com/ioBroker/ioBroker.ws) beschrieben.
### 2. Entwicklungsumgebung einrichten
- Ich persönlich nutze **IntelliJ IDEA** für die Entwicklung. Du kannst jedoch auch andere Entwicklungsumgebungen verwenden.
- Stelle sicher, dass Node.js und npm installiert sind, und installiere die notwendigen Abhängigkeiten.
### 3. `config.json` anpassen
- Bearbeite die Datei `config.json`, bevor du das Dashboard startest.
- Setze den Wert für `connLink` auf die IP-Adresse deines ioBroker-Servers sowie den Port des ioBroker.ws-Adapters.
### 4. Das Dashboard starten
#### Mit IntelliJ IDEA
- Nutze die vordefinierte Startkonfiguration "ioBroker Dashboard starten".
#### Ohne IntelliJ IDEA
1. Führe das `gulpfile.js` aus, um das Projekt zu kompilieren.
2. Starte einen Webserver in deinem Projektverzeichnis.
3. Öffne `http://localhost:xxxx/dist/index.html` in deinem Browser, wobei `xxxx` der Port deines Webservers ist.

## Konfigurations Editor
Um die JSON Dateien einfacher zu editieren, wurde ein Editor auf Basis von Node.JS entwickelt.

## Handhabung bei Produktivnutzung

## Changelog
### 0.0.1 (2025-02-xx)
- (ldittmar) Konfiguration Editor (in Arbeit)
- (ldittmar) Grundfunktionen hinzugefügt
- (ldittmar) Testdaten hinzugefügt
- (ldittmar) Dokumentation hinzugefügt
- (ldittmar) Initiales Repository erstellt

## Lizenz
The MIT License (MIT)

Copyright (c) 2024-2025 Lissandro Dittmar <l.dittmar@lmdsoft.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
