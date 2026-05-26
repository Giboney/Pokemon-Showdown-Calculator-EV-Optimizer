const scriptsPath = 'scripts/'
const scripts = [
    // 'doCalc.js',
    'util.js',
    'setbuilder.js',
    'ui.js',
    'main.js'
];

const stylesPath = 'css/'
const styles = [
    'styles.css',
    'darkStyles.css'
]

// Recursively load all scripts in the tree.
function loadScripts(index = 0) {
    const script = scripts[index];
    if (!script) return;

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(scriptsPath + script);
    s.type = 'module';

    s.onload = () => {
        s.remove(); // interesting
        loadScripts(index + 1);
    };

    (document.head || document.documentElement).appendChild(s);
}

// Recursively load all styles in the tree.
function loadStyles(index = 0) {
    const style = styles[index];
    if (!style) return;

    const s = document.createElement('link');
    s.rel = 'stylesheet';
    s.href = chrome.runtime.getURL(stylesPath + style);
    s.id = style.slice(0,-4);

    s.onload = () => {
        loadStyles(index + 1);
    }

    (document.head || document.documentElement).appendChild(s);
}

// Only start loading once the window is loaded
// just in case any of the resources we're overwriting are needed
window.onload = function() {
    loadStyles(); // load styles first
    loadScripts();
};
