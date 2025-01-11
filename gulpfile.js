const gulp = require('gulp');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const inquirer = require('inquirer').default;
const gutil = require('gulp-util');
const ftp = require('@gulpetl/vinyl-ftp');
const fs = require('fs');
const path = require('path');
const through2 = require('through2');
const replace = require('gulp-replace');
const rename = require('gulp-rename');

// Hilfsfunktion zum Laden der richtigen Konfiguration
function loadConfig(env = 'dev') {
  const configFile = env === 'prod' ? 'config_prod.json' : 'config.json';
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (err) {
    console.error(`Fehler beim Laden von ${configFile}:`, err);
    process.exit(1);
  }
}

// Globale Konfigurationswerte
let config;

async function cleanDist() {
  const {deleteAsync} = await import('del');
  return deleteAsync(['dist']);
}

function mainScripts() {
  return gulp.src([
    'assets/vendor/iobroker/socket.io.js',
    'assets/vendor/iobroker/conn.js',
    'assets/vendor/fontawesome/js/all.min.js',
    'assets/js/allVariables.js',
    'assets/js/console.js',
    'assets/js/demo.js',
    'assets/js/iobroker.js',
    'assets/js/format.js',
    'assets/js/fieldsForDevices.js',
    'assets/js/pin.js',
    'assets/js/login.js'
  ], {allowEmpty: true})
    .pipe(sourcemaps.init())
    .pipe(concat('main.bundle.min.js'))
    .pipe(terser())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/js'));
}

function scripts() {
  return gulp.src([
    'assets/js/sidebar*.js',
    'assets/js/device*.js',
  ], {allowEmpty: true})
    .pipe(sourcemaps.init())
    .pipe(concat('devices.bundle.min.js'))
    .pipe(terser())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/js'));
}

function lastScripts() {
  return gulp.src([
    'assets/js/startApp.js',
    'assets/js/mainPage.js',
    'assets/js/mainSidebar.js',
    'assets/js/mainDevice.js',
    'assets/js/mainUpdater.js'
  ], {allowEmpty: true})
    .pipe(sourcemaps.init())
    .pipe(concat('site.bundle.min.js'))
    .pipe(terser())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/js'));
}

function firstStyles() {
  return gulp.src([
    'assets/vendor/fontawesome/css/all.min.css',
    'assets/css/allVariables.css',
    'assets/css/demo.css',
    'assets/css/console.css',
    'assets/css/mainPage.css',
    'assets/css/fieldsForDevices.css',
    'assets/css/pin.css',
    'assets/css/login.css',
  ], {allowEmpty: true})
    .pipe(sourcemaps.init())
    .pipe(concat('first.bundle.min.css'))
    .pipe(postcss([autoprefixer()]))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/css'));
}

function secondStyles() {
  return gulp.src([
    'assets/css/mainSidebar.css',
    'assets/css/mainDevice.css'
  ], {allowEmpty: true})
    .pipe(sourcemaps.init())
    .pipe(concat('main.bundle.min.css'))
    .pipe(postcss([autoprefixer()]))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/css'));
}

function otherStyles() {
  return gulp.src([
    'assets/css/device*.css',
    'assets/css/sidebar*.css'
  ], {allowEmpty: true})
    .pipe(sourcemaps.init())
    .pipe(concat('other.bundle.min.css'))
    .pipe(postcss([autoprefixer()]))
    .pipe(cleanCSS())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/css'));
}

function copyAssets() {
  return gulp.src(['assets/img/**/*', 'assets/webfonts/**/*'], {base: 'assets', encoding: false})
    .pipe(gulp.dest('dist/assets'));
}

function copyUserStyles() {
  return gulp.src([`${config.dataFolder}/theme/*`], {base: `${config.dataFolder}/theme`, encoding: false})
    .pipe(gulp.dest('dist/assets/css/users'));
}
function copyOtherImages() {
  return gulp.src([`${config.dataFolder}/img/**/*`], {base: `${config.dataFolder}`, encoding: false})
    .pipe(gulp.dest('dist/assets'));
}

function copyData() {
  return gulp.src([`${config.dataFolder}/**/*`,
    `!${config.dataFolder}/schema/**`,
    `!${config.dataFolder}/img/**`,
    `!${config.dataFolder}/theme/**`], {base: `${config.dataFolder}`})
    .pipe(gulp.dest('dist/data'));
}

function copyConfig(env) {
  const configFile = env === 'prod' ? 'config_prod.json' : 'config.json';
  return gulp.src(configFile, { base: '.' })
    .pipe(rename('config.json'))
    .pipe(gulp.dest('dist'));
}

function getVersionNumber() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Monate sind 0-basiert
  const year = String(now.getFullYear()).slice(-2); // Letzten zwei Ziffern des Jahres
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${day}${month}${year}${hours}${minutes}`;
}

function version() {
  const versionNumber = getVersionNumber();
  console.log('Aktuelle Versionsnummer:', versionNumber);

  return gulp.src('index.html')
    .pipe(replace('{{version}}', versionNumber))
    .pipe(gulp.dest('dist'));
}

function deployTask() {
  let credentials;

  if (fs.existsSync('credentials.json')) {
    credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
  } else {
    console.log('Die Datei credentials.json wurde nicht gefunden. Bitte geben Sie die erforderlichen Informationen ein.');
    return inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: 'FTP-Host:',
      },
      {
        type: 'input',
        name: 'user',
        message: 'FTP-Benutzername:',
      },
      {
        type: 'password',
        name: 'pass',
        message: 'FTP-Passwort:',
        mask: '*',
      },
      {
        type: 'input',
        name: 'remotePath',
        message: 'Remote-Pfad:',
      },
    ]).then(answers => {
      // Speichern der eingegebenen Daten in credentials.json
      fs.writeFileSync('credentials.json', JSON.stringify(answers, null, 2), 'utf8');
      credentials = answers;
      // Jetzt die eigentliche Deploy-Logik ausführen
      return executeDeploy(credentials);
    });
  }

  // Wenn credentials.json existiert, die Deploy-Logik ausführen
  return executeDeploy(credentials);
}

function executeDeploy(credentials) {
  const conn = ftp.create({
    host: credentials.host,
    user: credentials.user,
    password: credentials.pass,
    port: 21,
    parallel: 2,
    log: gutil.log,
    idleTimeout: 10
  });

  const globs = ['dist/**', '!dist/config.json'];

  return new Promise((resolve, reject) => {
    gulp.src(globs, {base: 'dist', buffer: false, encoding: false})
      .pipe(conn.newerOrDifferentSize(credentials.remotePath))
      .pipe(conn.dest(credentials.remotePath))
      .on('end', () => {
        gulp.src('config_prod.json', {base: '.', buffer: false, encoding: false})
          .pipe(rename('config.json')) // hier umbenennen
          .pipe(conn.dest(credentials.remotePath))
          .on('end', () => {
            console.log('Der Deploy-Vorgang wurde erfolgreich abgeschlossen, config_prod.json wurde als config.json hochgeladen.');
            resolve();
          })
          .on('error', (err) => {
            console.error('Fehler beim Hochladen von config_prod.json als config.json:', err);
            reject(err);
          });
      })
      .on('error', (err) => {
        console.error('Fehler beim Deploy-Vorgang:', err);
        reject(err);
      });
  });
}

function createJSONFiles(env) {
  config = loadConfig(env);
  return gulp.src(`${config.dataFolder}/main/*.json`)
    .pipe(through2.obj(function (file, _, cb) {
      // Extrahieren des Typs aus dem Dateinamen
      const type = path.basename(file.path, '.json');

      // Parsen des JSON-Inhalts
      let data;
      try {
        data = JSON.parse(file.contents.toString());
      } catch (err) {
        console.error(`Fehler beim Parsen der Datei ${file.path}:`, err);
        return cb(null, file);
      }

      // Sicherstellen, dass der Ausgabeordner existiert
      const outputDir = path.join(config.dataFolder, 'devices', type);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
      }

      // Verarbeitung der Tiles
      if (Array.isArray(data.content)) {
        data.content.forEach(section => {
          if (section.tiles && Array.isArray(section.tiles)) {
            section.tiles.forEach(tile => {
              // Extrahieren des Namens des Tiles
              const name = tile.name || 'unnamed';

              // Generieren des Dateinamens
              const fileName = `${name.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase()}.json`;

              const filePath = path.join(outputDir, fileName);

              // Überprüfen, ob die Datei existiert
              if (!fs.existsSync(filePath)) {
                // Inhalt für die neue JSON-Datei
                const newContent = [
                  {
                    "category": "Kategorie",
                    "devices": [
                      {
                        "name": "Name",
                        "type": "button",
                        "value": "xxx"
                      }
                    ]
                  }
                ];

                // Schreiben der neuen JSON-Datei
                fs.writeFileSync(filePath, JSON.stringify(newContent, null, 2), 'utf8');
                console.log(`Datei erstellt: ${filePath}`);
              } else {
                console.log(`Datei existiert bereits und wird nicht überschrieben: ${filePath}`);
              }
            });
          }
        });
      }

      cb(null, file);
    }));
}

function createMainObject(env, done) {
  config = loadConfig(env);
  // Benutzer nach dem Namen und dem Icon fragen
  inquirer.prompt([
    {
      type: 'input',
      name: 'pageName',
      message: 'Bitte geben Sie den Namen der Hauptseite ein:',
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'Bitte geben Sie einen gültigen Namen ein.';
        }
      }
    },
    {
      type: 'input',
      name: 'iconName',
      message: 'Bitte geben Sie den Namen des FontAwesome-Icons ein (z.B. fa-home):',
      validate: function (value) {
        if (value) {
          return true;
        } else {
          return 'Bitte geben Sie einen gültigen Icon-Namen ein.';
        }
      }
    }
  ]).then(answers => {
    const {pageName, iconName} = answers;

    // Dateinamen generieren mit der normalize-Funktion
    const fileName = `${pageName.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()}.json`;

    const type = path.basename(fileName, '.json');

    // JSON-Objekt erstellen
    const mainObject = {
      "name": pageName,
      "type": type,
      "icon": iconName,
      "content": []
    };

    // Sicherstellen, dass das Verzeichnis data/main existiert
    const mainDir = path.join(config.dataFolder, 'main');
    if (!fs.existsSync(mainDir)) {
      fs.mkdirSync(mainDir, {recursive: true});
    }

    const filePath = path.join(mainDir, fileName);

    // JSON-Datei schreiben
    fs.writeFileSync(filePath, JSON.stringify(mainObject, null, 2), 'utf8');
    console.log(`Die Datei ${filePath} wurde erfolgreich erstellt.`);

    // Anpassung der config.json
    const configPath = path.join('config.json');
    let configData;
    try {
      configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      console.error('Fehler beim Lesen von config.json:', err);
      done(err);
      return;
    }

    // Neue Seite zur pages-Array hinzufügen, falls noch nicht vorhanden
    if (!configData.pages.includes(fileName)) {
      configData.pages.push(fileName);

      // Aktualisierte config.json schreiben
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
      console.log(`Die Datei config.json wurde aktualisiert.`);
    } else {
      console.log(`Die Seite ${fileName} ist bereits in config.json enthalten.`);
    }

    done();
  }).catch(err => {
    console.error('Fehler bei der Eingabe:', err);
    done(err);
  });
}

exports.buildDev = gulp.series(
  cleanDist,
  () => {
    config = loadConfig('dev');
    return Promise.resolve();
  },
  gulp.parallel(mainScripts, scripts, lastScripts, firstStyles, secondStyles, otherStyles, copyAssets, copyUserStyles, copyOtherImages, copyData, () => copyConfig('dev')),
  version
);

exports.buildProd = gulp.series(
  cleanDist,
  () => {
    config = loadConfig('prod');
    return Promise.resolve();
  },
  gulp.parallel(mainScripts, scripts, lastScripts, firstStyles, secondStyles, otherStyles, copyAssets, copyUserStyles, copyOtherImages, copyData, () => copyConfig('prod')),
  version
);

exports.createJSONFilesDev = () => createJSONFiles('dev');
exports.createJSONFilesProd = () => createJSONFiles('prod');
exports.createMainObjectDev = done => createMainObject('dev', done);
exports.createMainObjectProd = done => createMainObject('prod', done);
exports.deploy = gulp.series(exports.buildProd, deployTask);
exports.default = exports.buildDev;

