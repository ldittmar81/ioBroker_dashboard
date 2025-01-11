let ioBrokerStates = [];
let pageIds = [];
let pageTypes = [];

let dashboardConfig = {};
dashboardConfig.pages = undefined;
dashboardConfig.console = false;

let sidebarConfig;
let isDemoVersion = false;
let userLoggedIn = '';
let users = [];

// Für iCal Zufallsdaten:
let firstCalTest = true;
let connectionsTry = 0; // Anzahl der Versuche, die Verbindung nach einem Abbruch wiederherzustellen

let countdownInterval;
let loaderVisible = false;
let resizeTimer;

// Hauptcontainer und IDs, die für jede Seite verwendet werden
let mainPages = [];
let lastPage = null;
let categoryTiles = [];
