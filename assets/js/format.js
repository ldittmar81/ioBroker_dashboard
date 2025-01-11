/**
 * Das Modul formatJS stellt Hilfsfunktionen zur Formatierung von Werten bereit:
 * - Zahlenrundung und Zeitanzeigen
 * - Farbkonvertierungen und Farbberechnungen
 * - Platzhalter-Substitution in Strings
 * - etc.
 *
 * @namespace formatJS
 */
const formatJS = {

  /**
   * Rundet einen numerischen Wert auf eine bestimmte Anzahl von Dezimalstellen.
   *
   * @function
   * @memberof formatJS
   * @param {number|string} value - Der zu rundende Wert (wird in eine Zahl konvertiert).
   * @param {number} [decimalPlaces=2] - Die gewünschte Anzahl Dezimalstellen.
   * @returns {string} Der gerundete Wert als Zeichenkette (z.B. "12.34").
   */
  formatDecimal(value, decimalPlaces = 2) {
    if (isNaN(value)) return value;
    return parseFloat(value).toFixed(decimalPlaces);
  },

  /**
   * Konvertiert eine Angabe in Minuten in ein menschenlesbares Format.
   * Beispiel: 90 → "1h 30m".
   *
   * @function
   * @memberof formatJS
   * @param {number|string} value - Die Minutenanzahl (z.B. "90" oder 90).
   * @returns {string} Formatierter String, z.B. "1h 30m".
   */
  formatTime(value) {
    const minutes = parseInt(value, 10);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    // Hier für Sekunden, falls die Eingabe dezimal sein kann (z.B. 90.5)
    const seconds = Math.floor((value - minutes) * 60);

    let formattedTime = "";
    if (hours > 0) formattedTime += `${hours}h `;
    if (remainingMinutes > 0) formattedTime += `${remainingMinutes}m `;
    if (seconds > 0) formattedTime += `${seconds}s`;

    return formattedTime.trim();
  },

  /**
   * Formatiert eine Zeitangabe in Sekunden zu einem String der Form "HH:MM:SS" oder "MM:SS".
   * - Z.B. 75 → "01:15" (keine Stunde)
   * - 3605 → "01:00:05"
   *
   * @function
   * @memberof formatJS
   * @param {number} seconds - Die Zeit in Sekunden.
   * @returns {string} Die formatierte Zeit, z.B. "01:15" oder "01:00:05".
   */
  formatSecondsTime(seconds) {
    if (isNaN(seconds)) return '00:00';

    seconds = Math.floor(seconds);
    let hours = Math.floor(seconds / 3600);
    let minutes = Math.floor((seconds % 3600) / 60);
    let secs = seconds % 60;

    let formattedTime = '';

    if (hours > 0) {
      formattedTime += hours.toString().padStart(2, '0') + ':';
    }

    formattedTime += minutes.toString().padStart(2, '0') + ':';
    formattedTime += secs.toString().padStart(2, '0');

    return formattedTime;
  },

  /**
   * Formatiert einen Wert mit optionaler Einheit, Dezimalstellen und Label-Mapping.
   *
   * - `labels` kann entweder ein Array sein oder eine kommagetrennte Liste von key:value-Paaren,
   *   um bestimmte numerische Werte durch Labels zu ersetzen.
   * - Wenn unit === "min", wird `formatTime()` verwendet.
   * - Wenn unit === "s", wird `formatSecondsTime()` verwendet.
   *
   * @function
   * @memberof formatJS
   * @param {*} value - Zu formatierender Wert.
   * @param {string} [unit] - Einheit (z.B. "°C", "min", "s"), optional.
   * @param {number|string} [decimal] - Anzahl Dezimalstellen, sofern numerisch.
   * @param {string|string[]} [labels] - Labeldefinitionen z.B. "0:Aus,1:An" oder ["0:Aus","1:An"].
   * @returns {string} Der formatierte Wert (ggf. inkl. Einheit oder mit Label ersetzt).
   */
  formatValue(value, unit, decimal, labels) {
    if (value === undefined || value === "undefined") return "";

    // Dezimalformatierung anwenden, falls gefordert
    let formattedValue = decimal && typeof Number(decimal) === 'number'
      ? formatJS.formatDecimal(value, Number(decimal))
      : value;

    // Falls ein Label-Mapping vorhanden ist, ersetze den Wert entsprechend
    if (labels !== undefined && labels !== "undefined") {
      if (!Array.isArray(labels)) labels = labels.split(',');
      for (const label of labels) {
        const [key, labelValue] = label.split(":");
        if (key === formattedValue?.toString()) {
          return labelValue;
        }
      }
    }

    // Einheit nicht vorhanden?
    if (unit === undefined || unit === "undefined") return formattedValue;

    // Spezielle Behandlung für bestimmte Einheiten
    switch (unit) {
      case "min":
        return formatJS.formatTime(formattedValue);
      case "s":
        return formatJS.formatSecondsTime(formattedValue);
    }

    return `${formattedValue} ${unit}`;
  },

  /**
   * Wendet je nach Wert Fehler- oder Warnungsformatierungen an.
   *
   * - Wird ein Fehlerzustand erkannt, wird das Element rot markiert.
   * - Wird ein Warnzustand erkannt, wird das Element in Orange markiert.
   * - Bei Alarm kann zudem die Elternkachel farblich hervorgehoben werden.
   *
   * @function
   * @memberof formatJS
   * @param {HTMLElement} statusElement - DOM-Element für die Statusanzeige (z.B. ein `<span>`).
   * @param {number|string} value - Der aktuelle Wert.
   * @param {string} [errorCondition] - Ein String-Ausdruck zur Fehlererkennung (z.B. "val == 0").
   * @param {string} [warningCondition] - Ein String-Ausdruck zur Warnung (z.B. "val > 50").
   * @param {boolean} [alarm] - Wenn true, wird auch die Kachel (`tile`) selbst markiert.
   * @param {HTMLElement} [tile] - Das übergeordnete Kachel-Element, falls vorhanden.
   * @returns {void}
   */
  applyConditionalFormatting(statusElement, value, errorCondition, warningCondition, alarm, tile) {
    const val = parseFloat(value);

    statusElement.style.color = "";
    if (alarm && tile) {
      tile.classList.remove("alarm-red", "alarm-orange");
    }

    // Prüfe Fehlerbedingung
    if (errorCondition && eval(errorCondition.replace("val", val))) {
      statusElement.style.color = "red";
      if (alarm && tile) {
        tile.classList.add("alarm-red");
      }
    }
    // Prüfe Warnbedingung
    else if (warningCondition && eval(warningCondition.replace("val", val))) {
      statusElement.style.color = "darkorange";
      if (alarm && tile) {
        tile.classList.add("alarm-orange");
      }
    }
  },

  /**
   * Konvertiert einen Hex-Farbwert in eine RGBA-Farbe mit gegebener Transparenz.
   *
   * Beispiel: `hexToRgba("#ff0000", 0.5)` => "rgba(255,0,0,0.5)"
   *
   * @function
   * @memberof formatJS
   * @param {string} hex - Eine hexadezimale Farbangabe (#rrggbb).
   * @param {number} alpha - Der Alphawert (0.0 bis 1.0).
   * @returns {string} Die RGBA-Farbe, z.B. "rgba(255,0,0,0.5)".
   * @throws {Error} Wirft einen Fehler, wenn das Hex-Format ungültig ist.
   */
  hexToRgba(hex, alpha) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    throw new Error('Fehlerhafte Hex-Farbe: ' + hex);
  },

  /**
   * Ermittelt aus einer Hex-Farbe den Hue-Wert (Farbwinkel in Grad).
   *
   * @function
   * @memberof formatJS
   * @param {string} hex - Farbwert im Hex-Format (#rrggbb).
   * @returns {number} Farbwinkel (Hue) zwischen 0 und 360.
   */
  hexToHue(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;

    if (delta === 0) {
      hue = 0;
    } else if (max === r) {
      hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
    } else if (max === g) {
      hue = ((b - r) / delta + 2) * 60;
    } else if (max === b) {
      hue = ((r - g) / delta + 4) * 60;
    }

    return Math.round(hue % 360);
  },

  /**
   * Konvertiert einen Hue-Wert (0-360) zurück in einen Hex-Farbwert (#rrggbb).
   * Hierfür wird ein einfacher Algorithmus verwendet, der einen RGB-Wert
   * berechnet und dann in Hex umwandelt.
   *
   * @function
   * @memberof formatJS
   * @param {number} hue - Der Farbwinkel (0 bis 360).
   * @returns {string} Hexadezimale Darstellung, z.B. "#ff0000".
   */
  hueToHex(hue) {
    const c = 1;
    const x = 1 - Math.abs((hue / 60) % 2 - 1);
    const m = 0;

    let r = 0, g = 0, b = 0;

    if (hue >= 0 && hue < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (hue >= 300 && hue <= 360) {
      r = c;
      g = 0;
      b = x;
    }

    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
  },

  /**
   * Berechnet anhand einer Farbtemperatur (in Kelvin) eine approximate RGB-Farbe.
   * Dies wird z.B. verwendet, um verschiedene Weißtöne (warm bis kalt) darzustellen.
   *
   * @function
   * @memberof formatJS
   * @param {number} kelvin - Die Farbtemperatur in Kelvin (z.B. 2700 für warmweiß).
   * @returns {string} Ein RGB-String, z.B. "rgb(255,200,150)".
   */
  getRGBFromTemperature(kelvin) {
    let temperature = kelvin / 100;
    let red, green, blue;

    // Rot-Bereich
    if (temperature <= 66) {
      red = 255;
    } else {
      red = temperature - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      red = Math.min(Math.max(red, 0), 255);
    }

    // Grün-Bereich
    if (temperature <= 66) {
      green = temperature;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
      green = Math.min(Math.max(green, 0), 255);
    } else {
      green = temperature - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
      green = Math.min(Math.max(green, 0), 255);
    }

    // Blau-Bereich
    if (temperature >= 66) {
      blue = 255;
    } else if (temperature <= 19) {
      blue = 0;
    } else {
      blue = temperature - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      blue = Math.min(Math.max(blue, 0), 255);
    }

    return `rgb(${Math.round(red)},${Math.round(green)},${Math.round(blue)})`;
  },

  /**
   * Ersetzt Platzhalter in der Form `{{...}}` innerhalb eines Textes
   * mit entsprechenden Werten aus den `ioBrokerStates`.
   *
   * - Beispiel: "Temperatur: {{alias.0.Wohnzimmer.Temperatur}}" wird durch den aktuellen Wert ersetzt.
   * - Ruft bei Bedarf `demoJS.addDemoValue(id)` auf, um Demowerte zu initialisieren.
   *
   * @function
   * @memberof formatJS
   * @param {string} text - Der Originaltext mit Platzhaltern.
   * @returns {string} Der Text mit ersetzten Platzhaltern.
   */
  placeholderSubstitute(text) {
    const placeholderRegex = /{{(.*?)}}/g;

    let match, response = text;
    while ((match = placeholderRegex.exec(text)) !== null) {
      const id = match[1].trim();
      demoJS.addDemoValue(id);  // ggf. Demo-Wert erzeugen
      const value = ioBrokerStates[id]?.val || '';
      response = text.replace(match[0], value);
    }
    return response;
  },

  /**
   * Prüft, ob ein gegebener Wert als "true" interpretiert werden kann
   * (entweder boolean `true` oder String `"true"`).
   *
   * @function
   * @memberof formatJS
   * @param {*} value - Der zu prüfende Wert.
   * @returns {boolean} Gibt `true` zurück, wenn value ein "echtes" true ist, sonst false.
   */
  isTrue(value) {
    return value === true || value === 'true';
  }
};
