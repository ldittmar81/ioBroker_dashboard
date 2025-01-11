/**
 * Das Modul sidebarWeatherJS stellt Funktionen bereit, um Wetterdaten über die
 * OpenWeatherMap-API zu laden, darzustellen und regelmäßig zu aktualisieren.
 *
 * - Erzeugt in der Sidebar ein Wetter-Widget (Icon, Temperatur, Beschreibung usw.).
 * - Greift auf `ioBrokerStates` (sowie ggf. Demo-Modus über `demoJS`) zu.
 * - Unterstützt das Zwischenspeichern (Caching) von Geokoordinaten.
 *
 * @namespace sidebarWeatherJS
 */
const sidebarWeatherJS = {

  /**
   * Erzeugt ein HTML-Widget (Container, Icon, Beschreibung etc.) für das Wetter
   * in einem übergeordneten `parentElement`. Ruft anschließend `fetchWeatherData()` auf,
   * um die Daten zu laden, und zeigt diese an.
   *
   * @function
   * @memberof sidebarWeatherJS
   * @param {HTMLElement} parentElement - Das DOM-Element, in das das Wetter-Widget eingefügt wird.
   * @param {Object} weatherConfig - Einstellungen für das Wetter (API-Key, Ort, etc.).
   *   @param {string} weatherConfig.apiKey - Dein OpenWeatherMap-API-Key.
   *   @param {string} weatherConfig.location - Ort (z.B. "Berlin").
   *   @param {string} [weatherConfig.imageSet] - Ordner/Set für Icons (z. B. "dark", "light").
   *   @param {string} [weatherConfig.imageType="gif"] - Dateityp für das Wetter-Icon (z. B. "png", "gif").
   * @returns {void}
   */
  createWeatherDisplay(parentElement, weatherConfig) {
    const weatherContainer = document.createElement('div');
    weatherContainer.classList.add('weather-container');

    const weatherIcon = document.createElement('img');
    weatherIcon.classList.add('weather-icon');

    const weatherInfo = document.createElement('div');
    weatherInfo.classList.add('weather-info');

    const weatherTemp = document.createElement('div');
    weatherTemp.classList.add('weather-temp');

    const weatherDesc = document.createElement('div');
    weatherDesc.classList.add('weather-desc');

    const weatherHighLow = document.createElement('div');
    weatherHighLow.classList.add('weather-high-low');

    const weatherWind = document.createElement('div');
    weatherWind.classList.add('weather-wind');

    const weatherHumidity = document.createElement('div');
    weatherHumidity.classList.add('weather-humidity');

    const weatherError = document.createElement('div');
    weatherError.classList.add('weather-error');
    weatherError.style.display = 'none';

    // Struktur zusammenbauen
    weatherInfo.appendChild(weatherTemp);
    weatherInfo.appendChild(weatherDesc);
    weatherInfo.appendChild(weatherHighLow);
    weatherInfo.appendChild(weatherWind);
    weatherInfo.appendChild(weatherHumidity);

    weatherContainer.appendChild(weatherIcon);
    weatherContainer.appendChild(weatherInfo);
    weatherContainer.appendChild(weatherError);

    parentElement.appendChild(weatherContainer);

    // Wetterdaten abrufen und Anzeige aktualisieren
    sidebarWeatherJS.fetchWeatherData(weatherConfig)
      .then(data => {
        sidebarWeatherJS.updateWeatherDisplay(data, weatherConfig, {
          weatherIcon,
          weatherTemp,
          weatherDesc,
          weatherHighLow,
          weatherWind,
          weatherHumidity,
          weatherError
        });
      })
      .catch(error => {
        console.error('Fehler beim Abrufen der Wetterdaten:', error);
        sidebarWeatherJS.displayWeatherError({
          weatherIcon,
          weatherTemp,
          weatherDesc,
          weatherHighLow,
          weatherWind,
          weatherHumidity,
          weatherError
        }, error);
      });
  },

  /**
   * Ruft die OpenWeatherMap-Geokodierung auf, um aus dem Ort Namen Koordinaten zu ermitteln,
   * oder nutzt ggf. zwischengespeicherte Koordinaten aus `localStorage`.
   * Anschließend wird `fetchWeatherDataWithCoords` verwendet, um die eigentlichen
   * Wetterdaten (current weather) zu laden.
   *
   * @function
   * @memberof sidebarWeatherJS
   * @param {Object} weatherConfig - Konfiguration für das Wetter (enthält API-Key, location etc.).
   * @returns {Promise<Object>} Promise, das ein Objekt `{ currentData }` enthält.
   * @throws {Error} Falls der Ort nicht gefunden wird oder eine ungültige API-Antwort erfolgt.
   */
  fetchWeatherData(weatherConfig) {
    const apiKey = weatherConfig.apiKey;
    const location = weatherConfig.location;
    const cacheKey = `weather_coords_${location}`;

    // Versuch, zwischengespeicherte Koordinaten zu laden
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const cachedCoords = JSON.parse(cachedData);
      if (!sidebarWeatherJS.isCacheExpired(cachedCoords.timestamp)) {
        // Cache noch gültig
        return sidebarWeatherJS.fetchWeatherDataWithCoords(cachedCoords.lat, cachedCoords.lon, apiKey);
      } else {
        localStorage.removeItem(cacheKey);
      }
    }

    // Geokodierungs-API
    const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;

    return fetch(geocodingUrl)
      .then(response => response.json())
      .then(geoData => {
        if (!geoData || geoData.length === 0) {
          throw new Error('Ort nicht gefunden.');
        }
        const lat = geoData[0].lat;
        const lon = geoData[0].lon;

        // Koordinaten cachen
        localStorage.setItem(cacheKey, JSON.stringify({lat, lon, timestamp: Date.now()}));

        // Wetterdaten abrufen
        return sidebarWeatherJS.fetchWeatherDataWithCoords(lat, lon, apiKey);
      });
  },

  /**
   * Lädt die aktuellen Wetterdaten (OpenWeatherMap Current Weather) anhand von Koordinaten.
   *
   * @function
   * @memberof sidebarWeatherJS
   * @param {number} lat - Breitengrad
   * @param {number} lon - Längengrad
   * @param {string} apiKey - Dein OWM-API-Schlüssel
   * @returns {Promise<Object>} Promise, das ein Objekt `{ currentData }` mit den Wetterinfos liefert.
   * @throws {Error} Falls die API einen Fehler zurückgibt (z. B. {cod: 401}).
   */
  fetchWeatherDataWithCoords(lat, lon, apiKey) {
    const currentWeatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=de&appid=${apiKey}`;

    return fetch(currentWeatherUrl)
      .then(response => response.json())
      .then(currentData => {
        if (currentData.cod !== 200) {
          throw new Error(`Fehler bei der Wetterabfrage: ${currentData.message}`);
        }
        return {currentData};
      });
  },

  /**
   * Prüft, ob der geokodierte Cache (Koordinaten) bereits abgelaufen ist.
   * Hier wird 1 Woche als Gültigkeitsdauer verwendet.
   *
   * @function
   * @memberof sidebarWeatherJS
   * @param {number} timestamp - Zeitstempel der zwischengespeicherten Koordinaten.
   * @returns {boolean} true, wenn abgelaufen; false, wenn noch gültig.
   */
  isCacheExpired(timestamp) {
    const now = Date.now();
    const cacheDuration = 7 * 24 * 60 * 60 * 1000; // 1 Woche
    return now - timestamp > cacheDuration;
  },

  /**
   * Aktualisiert das angezeigte Wetter, indem die via OWM geladenen Daten
   * in die entsprechenden DOM-Elemente geschrieben werden (Icon, Temperatur,
   * Beschreibung, Min/Max, Wind, Luftfeuchtigkeit).
   * Anschließend wird ein Timer gesetzt, um die Daten nach 15 Minuten erneut
   * zu aktualisieren.
   *
   * @function
   * @memberof sidebarWeatherJS
   * @param {Object} data - Objekt mit `currentData` (dem JSON-Antwortobjekt).
   * @param {Object} weatherConfig - Konfiguration (imageSet, imageType, etc.).
   * @param {Object} elements - Sammlungsobjekt aller relevanten DOM-Elemente (Icon, Temp, Desc, usw.).
   * @returns {void}
   */
  updateWeatherDisplay(data, weatherConfig, elements) {
    const {
      weatherIcon,
      weatherTemp,
      weatherDesc,
      weatherHighLow,
      weatherWind,
      weatherHumidity,
      weatherError
    } = elements;

    // Fehleranzeige ausblenden
    weatherError.style.display = 'none';

    // Wetterelemente anzeigen
    weatherIcon.style.display = 'block';
    weatherTemp.style.display = 'block';
    weatherDesc.style.display = 'block';
    weatherHighLow.style.display = 'block';
    weatherWind.style.display = 'block';
    weatherHumidity.style.display = 'block';

    const {currentData} = data;

    // Extrahiere Wetterdaten
    const temp = Math.round(currentData.main.temp);
    const tempMin = Math.round(currentData.main.temp_min);
    const tempMax = Math.round(currentData.main.temp_max);
    const description = currentData.weather[0].description;
    const imageCode = currentData.weather[0].icon;
    const windSpeed = currentData.wind.speed;
    const humidity = currentData.main.humidity;

    // Icon
    const imageType = weatherConfig.imageType || 'gif';
    weatherIcon.src = `assets/img/sidebar/weather/${weatherConfig.imageSet}/${imageCode}.${imageType}`;
    weatherIcon.alt = description;

    // Textbefüllung
    weatherTemp.textContent = `${temp}°C`;
    weatherDesc.textContent =
      description.charAt(0).toUpperCase() + description.slice(1);
    weatherHighLow.textContent = `H: ${tempMax}°C  T: ${tempMin}°C`;
    weatherWind.textContent = `Wind: ${windSpeed} m/s`;
    weatherHumidity.textContent = `Luftfeuchtigkeit: ${humidity}%`;

    // Wetterdaten nach 15 Minuten erneut aktualisieren
    setTimeout(() => {
      sidebarWeatherJS.fetchWeatherData(weatherConfig)
        .then(newData => {
          sidebarWeatherJS.updateWeatherDisplay(newData, weatherConfig, elements);
        })
        .catch(error => {
          console.error('Fehler beim Aktualisieren der Wetterdaten:', error);
          sidebarWeatherJS.displayWeatherError(elements, error);
        });
    }, 15 * 60 * 1000);
  },

  /**
   * Zeigt eine Fehlermeldung an, indem alle Wetterelemente ausgeblendet und
   * stattdessen ein Fehler-DIV (`weatherError`) eingeblendet wird.
   *
   * @function
   * @memberof sidebarWeatherJS
   * @param {Object} elements - Enthält DOM-Referenzen (Icon, Temp, Desc, usw.).
   * @param {Error} error - Der Fehler, der aufgetreten ist (z. B. ungültiger API-Key).
   * @returns {void}
   */
  displayWeatherError(elements, error) {
    const {
      weatherIcon,
      weatherTemp,
      weatherDesc,
      weatherHighLow,
      weatherWind,
      weatherHumidity,
      weatherError
    } = elements;

    // Alle ausblenden
    weatherIcon.style.display = 'none';
    weatherTemp.style.display = 'none';
    weatherDesc.style.display = 'none';
    weatherHighLow.style.display = 'none';
    weatherWind.style.display = 'none';
    weatherHumidity.style.display = 'none';

    // Fehlermeldung einblenden
    weatherError.style.display = 'block';

    if (error.message.includes('Invalid API key')) {
      weatherError.textContent = 'Fehler: Ungültiger API-Schlüssel für Wetterdaten.';
    } else if (error.message.includes('Ort nicht gefunden')) {
      weatherError.textContent = 'Fehler: Ort nicht gefunden.';
    } else {
      weatherError.textContent = 'Fehler beim Abrufen der Wetterdaten.';
    }
  }
};
