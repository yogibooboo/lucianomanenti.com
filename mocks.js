var window = {
    gameScale: 1,
    console: console,
    location: { search: "" },
    setTimeout: function (fn) { try { fn() } catch (e) { } }
};
var document = {
    getElementById: function () { return { play: function () { }, currentTime: 0 }; },
    querySelector: function () { return { style: {} }; },
    addEventListener: function () { },
    body: {},
    createElement: function () { return { style: {} }; } // Added createElement
};
var location = window.location;

var readyCallback = null;
var $ = function (selector) {
    // Return a fresh object structure every time to avoid shared state issues
    // and ensure [0] is a valid object we can attach properties to
    var mockElement = { style: {} };

    var mockObj = {
        0: mockElement,
        length: 1,
        offset: function () { return { left: 0, top: 0 }; },
        css: function () { return 0; },
        append: function () { },
        width: function () { return 1000; },
        height: function () { return 1000; },
        hide: function () { },
        show: function () { },
        text: function () { },
        html: function () { },
        val: function () { return 0; },
        click: function () { },
        bind: function () { },
        removeClass: function () { },
        addClass: function () { return this; },
        animate: function () { },
        ready: function (cb) { readyCallback = cb; },
        filter: function () { return { click: function () { } }; }
    };
    return mockObj;
};
$.extend = function () { };

var log = function (msg) { console.log(msg); };
log.enabled = true;
