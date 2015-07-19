# isolog
Send node console messages to your browser's console.

The idea behind isolog is simple: take `console.log()` messages in node and send them to your browser's console. 
This gives you easy access to logs that otherwise might be a pain to get to.

It also has the benefit of easy-to-navigate collapsible object trees that browsers give you in their consoles. And pretty colors!

The console message type will be preserved, so if you `console.error('bup bow')` in node, you will get a nice red `console.error('bup bow')` in the browser.

##Using The Thing
This is meant for apps that use express 4.

For ES2015:
```javascript
import isolog from 'isolog';
```
or old school:
```javascript
var isolog = require('isolog');
```

###On the Server
Isolog works by creating a route and listening for a get request from a client to start sending logs. And so, when you init the server you must pass it a reference to your express app. 
```javascript
isolog.initServer(yourExpressApp);
```

###On the Client
In code that will run on the client:
```javascript
isolog.initClient();
```

If your app is isomorphic and code could run on the server AND on the client that's fine, the `init()` methods will be ignored if not running in the right environment.

##On/Off switch
By default, messages will not be shown, but once isolog is imported/required and initialised, 
you can type `isolog.stopListening()` and `isolog.stopListening()` to turn on/off logging to the browser. 
Your setting is saved in localStorage for next time.

##Browser Support
Isolog uses `EventSource` which means it only works in cool browsers.