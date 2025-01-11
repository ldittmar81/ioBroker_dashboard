/**
 * Das Modul deviceTemperatureJS stellt Funktionen bereit, um Temperatur-
 * und Luftfeuchtigkeitsanzeigen (Thermometer / Hygrometer) in einer Kachel darzustellen.
 *
 * @namespace deviceTemperatureJS
 */
const deviceTemperatureJS = {

  /**
   * @typedef {Object} TemperatureDeviceDefinition
   * @property {string} temperature - State-ID für die Temperatur (z.B. "alias.0.raum.temp").
   * @property {string} [humidity] - (Optional) State-ID für die Luftfeuchtigkeit (z.B. "alias.0.raum.hum").
   * // Weitere Felder (z. B. min/max Temp) kannst du bei Bedarf hinzufügen.
   */

  /**
   * Erzeugt DOM-Elemente für ein Thermometer und – falls vorhanden – ein Hygrometer.
   * - Registriert die State-IDs (`temperature`, ggf. `humidity`) über `ioBrokerJS.addPageId`.
   * - Liest den aktuellen Wert aus `ioBrokerStates` und legt einen Data-Attribute ab,
   *   damit die Anzeige später (`updateThermometer`/`updateHydrometer`) aktualisiert werden kann.
   * - Fügt die Elemente (Thermometer, Hygrometer) in das übergebene `tileContent` ein,
   *   und zwar vor dem Titel (`.tile-title`).
   *
   * @function
   * @memberof deviceTemperatureJS
   * @param {HTMLElement} tileContent - Das Kachel-Element (z. B. `<div class="tile-content">`).
   * @param {TemperatureDeviceDefinition} device - Objekt mit Temperatur- und optional Humidity-State-ID.
   * @returns {void}
   */
  addTemperatureControls(tileContent, device) {
    const container = document.createElement('div');
    container.classList.add('temp-hum-container');
    container.style.display = 'flex';

    // Thermometer-Container
    if (device.temperature) {
      const thermometerContainer = document.createElement('div');
      thermometerContainer.classList.add('thermometer-container');
      thermometerContainer.dataset.temperatureId = device.temperature;

      const thermometer = document.createElement('div');
      thermometer.id = 'thermometer';

      const temperatureDiv = document.createElement('div');
      temperatureDiv.id = 'temperature';

      // Berechnen der initialen Höhe und Wert
      const {heightPercent, currentTemp} = deviceTemperatureJS.calculateThermometer(device.temperature);

      temperatureDiv.style.height = heightPercent + '%';
      temperatureDiv.dataset.value = `${currentTemp}°C`;

      const graduations = document.createElement('div');
      graduations.id = 'graduations';

      thermometer.appendChild(temperatureDiv);
      thermometer.appendChild(graduations);
      thermometerContainer.appendChild(thermometer);
      container.appendChild(thermometerContainer);

      // Registriere die Temperatur-ID
      ioBrokerJS.addPageId(device.temperature, '°C');
    }

    // Hygrometer
    if (device.humidity) {
      const hygrometerContainer = document.createElement('div');
      hygrometerContainer.classList.add('hygrometer-container');
      hygrometerContainer.dataset.humidityId = device.humidity;

      const hygrometer = document.createElement('div');
      hygrometer.id = 'hygrometer';

      const humidityDiv = document.createElement('div');
      humidityDiv.id = 'humidity';

      const {heightPercent, currentHum, bgColor, bgClass} = deviceTemperatureJS.calculateHygrometer(device.humidity);

      humidityDiv.style.height = heightPercent + '%';
      humidityDiv.dataset.value = `${currentHum}°C`;
      humidityDiv.style.background = bgColor;
      container.classList.remove('hum-red', 'hum-yellow', 'hum-green');
      container.classList.add(bgClass);

      hygrometer.appendChild(humidityDiv);
      hygrometerContainer.appendChild(hygrometer);
      container.appendChild(hygrometerContainer);

      // Registriere die Humidity-ID
      ioBrokerJS.addPageId(device.humidity, '%');
    }

    // Füge das Ganze vor dem Titel in das tileContent ein
    tileContent.prepend(container);
  },

  /**
   * Aktualisiert das Thermometer-Element, indem die aktuelle Temperatur aus `ioBrokerStates[temperatureId]`
   * ausgelesen wird. Der Füllstand (`height`) wird anhand eines festen Bereichs (z. B. -50°C bis +50°C) berechnet.
   *
   * @function
   * @memberof deviceTemperatureJS
   * @param {string} temperatureId - Die State-ID, die die Temperatur enthält.
   * @returns {void}
   */
  updateThermometer(temperatureId) {
    const container = document.querySelector(`.thermometer-container[data-temperature-id="${temperatureId}"]`);
    if (!container) return;

    const temperatureDiv = container.querySelector('#temperature');
    if (!temperatureDiv) return;

    const {heightPercent, currentTemp} = deviceTemperatureJS.calculateThermometer(temperatureId);

    temperatureDiv.style.height = heightPercent + '%';
    temperatureDiv.dataset.value = `${currentTemp}°C`;
  },

  /**
   * Berechnet den Füllstand und den aktuellen Temperaturwert
   * basierend auf dem gemessenen Temperatur-State in einem Bereich von -50°C bis +50°C.
   *
   * @function
   * @memberof deviceTemperatureJS
   * @param {string} id - State-ID der Temperatur.
   * @returns {{heightPercent: number, currentTemp: number}} Ein Objekt mit `heightPercent` (0–100) und `currentTemp` (aktuelle Temperatur).
   */
  calculateThermometer(id) {
    const currentTemp = ioBrokerStates[id]?.val ?? 0;
    const minTemp = -50;
    const maxTemp = 50;
    const fraction = (currentTemp - minTemp) / (maxTemp - minTemp);
    const heightPercent = Math.min(Math.max(fraction, 0), 1) * 100;
    return {heightPercent, currentTemp};
  },

  /**
   * Aktualisiert das Hygrometer-Element mit der aktuellen Luftfeuchtigkeit.
   * Der Füllstand wird prozentual zwischen 0% und 100% berechnet, und
   * die Farbe (rot/gelb/grün) signalisiert verschiedene Feuchtigkeitsbereiche.
   *
   * @function
   * @memberof deviceTemperatureJS
   * @param {string} humidityId - Die State-ID, die die Luftfeuchtigkeit enthält.
   * @returns {void}
   */
  updateHydrometer(humidityId) {
    const container = document.querySelector(`.hygrometer-container[data-humidity-id="${humidityId}"]`);
    if (!container) return;

    const humidityDiv = container.querySelector('#humidity');
    if (!humidityDiv) return;

    const {heightPercent, currentHum, bgColor, bgClass} = deviceTemperatureJS.calculateHygrometer(humidityId);

    humidityDiv.style.height = heightPercent + '%';
    humidityDiv.dataset.value = `${currentHum}%`;

    humidityDiv.style.background = bgColor;
    container.classList.remove('hum-red', 'hum-yellow', 'hum-green');
    container.classList.add(bgClass);
  },

  /**
   * Berechnet den Füllstand, die aktuelle Luftfeuchtigkeit
   * und die Hintergrundfarbe/-klasse anhand definierter Grenzwerte.
   *
   * @function
   * @memberof deviceTemperatureJS
   * @param {string} id - State-ID der Luftfeuchtigkeit.
   * @returns {{
   *   heightPercent: number,
   *   currentHum: number,
   *   bgColor: string,
   *   bgClass: string
   * }} Ein Objekt mit `heightPercent` (0–100), `currentHum` (aktuelle Luftfeuchte),
   *     `bgColor` (CSS-Hintergrundfarbe) und `bgClass` (CSS-Klasse für die Farbcodierung).
   */
  calculateHygrometer(id) {
    const currentHum = ioBrokerStates[id]?.val ?? 0;
    const minHum = 0;
    const maxHum = 100;
    const fraction = (currentHum - minHum) / (maxHum - minHum);
    const heightPercent = Math.min(Math.max(fraction, 0), 1) * 100;

    let bgColor;
    let bgClass;
    if (currentHum < 40) {
      bgColor = 'linear-gradient(#f17a65, #f17a65)'; // rot
      bgClass = 'hum-red';
    } else if (currentHum <= 44) {
      bgColor = 'linear-gradient(#f1e865, #f1e865)'; // gelb
      bgClass = 'hum-yellow';
    } else if (currentHum <= 55) {
      bgColor = 'linear-gradient(#65f17a, #65f17a)'; // grün
      bgClass = 'hum-green';
    } else if (currentHum <= 59) {
      bgColor = 'linear-gradient(#f1e865, #f1e865)'; // gelb
      bgClass = 'hum-yellow';
    } else {
      bgColor = 'linear-gradient(#f17a65, #f17a65)'; // rot
      bgClass = 'hum-red';
    }

    return {heightPercent, currentHum, bgColor, bgClass};
  }
};
