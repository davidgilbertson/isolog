'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var canUseDOM = !!(typeof window !== 'undefined' && window.document && window.document.createElement);

var initialized = false;
var consoleOverridden = false;
var consoleCss = 'color: #333; font-weight: 700;';
var openConnections = [];

function send(consoleData) {
    if (!openConnections.length) return;

    var message = undefined;

    try {
        message = JSON.stringify(consoleData);
    } catch (err) {
        var errorMessage = {
            consoleMethod: consoleData.consoleMethod,
            args: ['isoLog couldn\'t send console.' + consoleData.consoleMethod + '() message to the client', err.toString()]
        };

        message = JSON.stringify(errorMessage);
    }

    openConnections.forEach(function (connection) {
        connection.write('data: ' + message + '\n\n');
    });
}

function overrideServerConsole() {
    if (consoleOverridden) return;

    ['log', 'info', 'warn', 'error', 'dir'].forEach(function (methodName) {
        if (!console[methodName]) return;

        console[methodName] = (function () {
            var original = console[methodName];

            return function () {
                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                var consoleData = {
                    consoleMethod: methodName,
                    args: args
                };

                //Override normal behaviour will special log messages
                if (args[0] !== 'serverLogOnly') {
                    send(consoleData);
                }

                if (args[0] !== 'clientLogOnly') {
                    original.call.apply(original, [console].concat(args));
                }
            };
        })();
    });

    consoleOverridden = true;
}

function initServer(server) {
    if (canUseDOM || process.env.NODE_ENVIRONMENT === 'live') return;

    server.get('/iso-log', function (req, res) {
        req.socket.setTimeout(Infinity);
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        openConnections.push(res);

        req.on('close', function () {
            openConnections = openConnections.filter(function (openRes) {
                return openRes !== res;
            });
        });
    });

    overrideServerConsole();
}

function logToClientConsole(e) {
    var _JSON$parse = JSON.parse(e.data);

    var args = _JSON$parse.args;
    var consoleMethod = _JSON$parse.consoleMethod;

    if (!console[consoleMethod]) return;

    if (consoleMethod !== 'dir') {
        if (args.every(function (arg) {
            return typeof arg === 'string';
        })) {
            args = ['%cSERVER: ' + args.join(' '), consoleCss];
        } else if (typeof args[0] === 'string') {
            args[0] = '%cSERVER: ' + args[0];

            args.splice(1, 0, consoleCss);
        } else {
            args = ['%cSERVER:', consoleCss].concat(_toConsumableArray(args));
        }
        console[consoleMethod].apply(console, _toConsumableArray(args));
    } else {
        console.group('%cSERVER:', consoleCss);
        console.dir.apply(console, _toConsumableArray(args));
        console.groupEnd();
    }
}

function initClient() {
    if (!canUseDOM || !window.EventSource || initialized) return;

    var isoLogStream = undefined;

    function _startListening() {
        if (initialized) return;

        isoLogStream = new EventSource('/iso-log');
        isoLogStream.onmessage = logToClientConsole;

        initialized = true;

        console.log('%c  --  CONSOLE MESSAGES FROM THE SERVER WILL APPEAR HERE --  ', consoleCss);
        console.log('%c  --  type "isoLog.stopListening()" to stop --  ', consoleCss);
    }

    function _stopListening() {
        if (!initialized) return;

        isoLogStream.close();

        initialized = false;
    }

    window.isoLog = {
        startListening: function startListening() {
            localStorage.setItem('isoLog', 'listening');

            _startListening();
        },

        stopListening: function stopListening() {
            localStorage.removeItem('isoLog');

            _stopListening();
        }
    };

    if (localStorage.getItem('isoLog') === 'listening') {
        _startListening();
    } else {
        console.log('%c  --  CONSOLE MESSAGES FROM THE SERVER ARE AVAILABLE --  ', consoleCss);
        console.log('%c  --  type "isoLog.startListening()" to see them here --  ', consoleCss);
    }
}

exports['default'] = {
    initServer: initServer,
    initClient: initClient
};
module.exports = exports['default'];
