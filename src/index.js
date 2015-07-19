const canUseDOM = !!(
    (typeof window !== 'undefined' &&
    window.document && window.document.createElement)
);

let initialized = false;
let consoleOverridden = false;
const consoleCss = 'color: #333; font-weight: 700;';
let openConnections = [];

function send(consoleData) {
    if (!openConnections.length) return;

    let message;

    try {
        message = JSON.stringify(consoleData);
    } catch (err) {
        const errorMessage = {
            consoleMethod: consoleData.consoleMethod,
            args: [
                'isolog couldn\'t send console.' + consoleData.consoleMethod + '() message to the client',
                err.toString()
            ]
        };

        message = JSON.stringify(errorMessage);
    }

    openConnections.forEach((connection) => {
        connection.write('data: ' + message + '\n\n');
    });
}

function overrideServerConsole() {
    if (consoleOverridden) return;

    ['log', 'info', 'warn', 'error', 'dir'].forEach((methodName) => {
        if (!console[methodName]) return;

        console[methodName] = (() => {
            const original = console[methodName];

            return (...args) => {
                const consoleData = {
                    consoleMethod: methodName,
                    args: args
                };

                //Override normal behaviour will special log messages
                if (args[0] !== 'serverLogOnly') {
                    send(consoleData);
                }

                if (args[0] !== 'clientLogOnly') {
                    original.call(console, ...args);
                }

            };
        })();
    });

    consoleOverridden = true;
}

function initServer(server) {
    if (canUseDOM || process.env.NODE_ENVIRONMENT === 'live') return;

    server.get('/iso-log', (req, res) => {
        req.socket.setTimeout(Infinity);
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        openConnections.push(res);

        req.on('close', function() {
            openConnections = openConnections.filter(openRes => openRes !== res);
        });
    });

    overrideServerConsole();
}

function logToClientConsole(e) {
    let {args, consoleMethod} = JSON.parse(e.data);

    if (!console[consoleMethod]) return;

    if (consoleMethod !== 'dir') {
        if (args.every((arg) => typeof arg === 'string')) {
            args = [`%cSERVER: ${args.join(' ')}`, consoleCss];
        } else if (typeof args[0] === 'string') {
            args[0] = `%cSERVER: ${args[0]}`;

            args.splice(1, 0, consoleCss);
        } else {
            args = ['%cSERVER:', consoleCss, ...args];
        }
        console[consoleMethod](...args);
    } else {
        console.group('%cSERVER:', consoleCss);
        console.dir(...args);
        console.groupEnd();
    }
}

function initClient() {
    if (!canUseDOM || !window.EventSource || initialized) return;

    let isologStream;

    function startListening() {
        if (initialized) return;

        isologStream = new EventSource('/iso-log');
        isologStream.onmessage = logToClientConsole;

        initialized = true;

        console.log('%c  --  CONSOLE MESSAGES FROM THE SERVER WILL APPEAR HERE --  ', consoleCss);
        console.log('%c  --  type "isolog.stopListening()" to stop --  ', consoleCss);
    }

    function stopListening() {
        if (!initialized) return;

        isologStream.close();

        initialized = false;
    }

    window.isolog = {
        startListening: () => {
            localStorage.setItem('isolog', 'listening');

            startListening();
        },

        stopListening: () => {
            localStorage.removeItem('isolog');

            stopListening();
        }
    };

    if (localStorage.getItem('isolog') === 'listening') {
        startListening()
    } else {
        console.log('%c  --  CONSOLE MESSAGES FROM THE SERVER ARE AVAILABLE --  ', consoleCss);
        console.log('%c  --  type "isolog.startListening()" to see them here --  ', consoleCss);
    }
}

export default {
    initServer: initServer,
    initClient: initClient
};
