const PATH = 'scripts/'
const scripts = [
    'doCalc.js',
    'test.js'
];

// Recursively load all scripts in the tree.
function loadScript(index = 0) {
    const script = scripts[index];
    if (!script) return;

    const s = document.createElement('script');
    s.src = chrome.runtime.getURL(PATH + script);

    s.onload = () => {
        s.remove();
        loadScript(index + 1);
    };

    (document.head || document.documentElement).appendChild(s);
}

// Only start loading once the window is loaded
// just in case any of the resources we're overwriting are needed
window.onload = function() {
    loadScript();
};
