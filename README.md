# Medulla
Multithreaded node.js server.  

## Features
- **Multithreaded** request handling.
- **Caching files in memory**, use it for scripts, styles, texts etc.
- **Linking and packing client scripts as modules with "exports/require" functions** (use Babel if you need es6 notation)
- **Automatic restart of the server** when app source files changing.
- **Built-in proxy** for forwarding requests.
- **Logging to files** for commands: `console.log() / .warn() / .error()`.
- **Hot reload slyles and scripts, and auto refreshing page** in dev mode.
- **Quickly start** of app developing.

**(!)** *module in development, this is unstable version.*  

## Examples
#### Simple server-side "Hello World!"
**server.es6**
```es6
module.exports.onRequest = (io, req, res)=>{
    io.send('Hello World!');
};
```

**launcher.conf.es6**
```es6
require('medulla').launch({
    serverEntryPoint: "./server.es6",
    port: 3000,
    platforms : {
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```

**File structure**
- `project/`
  - `node_modules/`
  - `package.json`
  - **`launcher.conf.es6`**
  - **`server.es6`**

**To start**  
Command: `node launcher.conf.es6 -dev`  
Open in browser: `localhost:3000`

#### Client-side "Hello world!" with scripts auto-linking
**server.es6**
```es6
module.exports.onRequest = io=>io.send('<div class="root"></div>');
```

**client.js**
```js
var sayHello = require('say-hello.js');
require('styles.css');

var container = document.querySelector('div.root');
sayHello(container, 'world');
```

**say-hello.js**
```js
module.exports = function (container, to) {
	container.innerHTML = 'Hello ' + to + '!';
};
```

**styles.css**
```css
html {
	background: #f0f0f0;
	color: #090;
	font-weight: bold;
	font-family: sans-serif;
}
```

**launcher.conf.js**
```es6
require('medulla').launch({
	serverEntryPoint : "server.app.es6",
	clientEntryPoint : "client.app.js",
	platforms : {
		"win32" : {"forcewatch":false},
		"linux" : {"forcewatch":true}
	},
	requireResolve: m=>require.resolve(m)
});
```

**File structure**
- `project/`
  - `node_modules/`
  - `package.json`
  - **`launcher.conf.es6`**
  - **`server.es6`**
  - **`client.js`**
  - **`say-hello.js`**
  - **`styles.css`**

**To start**  
Command: `node launcher.conf.es6 -dev`  
Open in browser: `localhost:3000`

## Installation
As [npm](https://www.npmjs.com/package/medulla) package  
`npm i medulla`
  
As [git](https://github.com/mothgears/medulla.git) repository (with examples)  
`git clone https://github.com/mothgears/medulla.git`

## Usage
#### Server launcher and config
Create launcher (e.g. launcher.conf.js) and require medulla with some settings (for example):
```es6
//launcher.conf.js

const medulla = require('medulla');

medulla.launch({
    serverEntryPoint : "./myServerApp.js",
    port      : 3000,
    platforms : {
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```
**(!)** *if you change this file, you need restart medulla manually.*  

List of all available settings with default values:
- `serverEntryPoint: "./server.js"`  
Path to your app server scripts entry point.

- `clientEntryPoint: null`  
Path to your app client scripts entry point, set if you need linking and packing scripts

- `serverDir: process.cwd()`  
Path to app dir.

- `port: 3000`  
Server port.

- `watchForChanges: flags.WATCH_SOURCE`  
if set "medulla.flags.WATCH_SOURCE", server will watch for modules and cached files and automatically restart workers or update the cache each time it changes.
If WATCH_ALL - watch for all files, if WATCH_NO - not watching. 

- `forcewatch: false`  
Set true if "fs.watch" don't work correctly (with some OS/IDE) and server not reacting on file changes.

- `platforms: {}`  
Individual configs for specific platforms (process.platform) in format "platform_name" : {"setting":"value"}.

- `hosts: {}`  
Individual configs for specific hosts (os.hostname()) in format "hostname" : {"setting":"value"}.

- `devMode: false`  
If set "true", server working in the devMode.

- `logging: {level: flags.LOG_WARNING, dir: process.cwd(), separatedTypes: true}`  
Async logging to file for "console.log()", "console.warn()" and "console.error()" methods.  
  - `level: flags.LOG_TRACE`  
  min level for logging, can be: medulla.flags.LOG_TRACE, LOG_WARNING or LOG_ERROR.
  - `dir: process.cwd()`  
  directory for .log files.
  - `separatedTypes: true`  
  split log into several files by level.

- `hotcode: {enabled: true, showtraces: true}`  
Hot reload pages, scripts and styles directly in browser (work only if `devMode` is true).
(Also, you may using it with apache / nginx or other third-party servers, just set medulla as proxy.)
  - `showtraces: true`  
  If set true, all changes will display in console.

- `watchIgnore: {...}`  
Rules for ignoring files when watching.
Represents a list of functions which return true if need ignore this file or directory.

- `dashboardPassword: null`  
Password for dashboard

#### App main module (entry point)
Create the server-side main module of your app (e.g. myServerApp.js) and set `fileSystem`, dependent of settings some files will be watched by server:
```es6
//myServerApp.js

module.exports.fileSystem = {    
    //static files in format 'src:url'
    "readme.txt"      : "readme.txt", //similar to "readme.txt":{type:"file", url:"readme.txt"}
    "public_html/~*?" : "~*?",        //all files from "public_html" folder and subfolders
    "images/*.png"    : "pic/*.png",  //all png files directly from "images" folder
    
    //cached files in format 'src:{params}'
    "somescript.js"         : {}                    //similar to "somescript.js":{type:"cached"}
    "bin/*.js"              : {url:"scripts/*.js"}, //all js files directly from "bin" folder
    "styles/~*.css"         : {type:"cached"}       //all css files from "bin" folder and subfolders
    "styles2/main-new.css"  : {type:"cached"},
    "bin/client-script.es6" : {type:"cached", url:"client-script.es6"}
};
```

**(!)** *don't describe server/client modules in "fileSystem" list, all required modules added automatically.*  
**(!)** *for watched files will be create watchers, therefore on some OS, directories which contain this files/folders may be blocked for rename or delete.*  

- `~`  
File dir/path
- `*`  
File name
- `?`  
File extension

- `type:"cached"`  
*(Default value for files with props in curly braces)*  
Add file content to variable (for each worker).
- `type:"file"`  
*(Default value for files with props as string)*  
Will read file from disc in every request.  
- `includeMedullaCode:false`  
If set is true, medulla js code (plugins) will be included to this page (use for all html-pages).

**Hotcode**
- `reload: "lazy"`  
Default value, page will reload when file changed and cursor will be moved in browser window.

- `reload: "hot"`  
Set this value for file (css or js script) so that it reloaded without refreshing the page.  
**(!)** *for script files recommended use **only** in the case, if they contains solely functions without side effects.*

- `reload: "force"`  
Page will reload immediately when file changed.
  
Default url is path to file, but you may specify it directly use `url` param.  

To share included modules also as js script, use `medulla.require` function instead of `require`:
```es6
//Sample

const myModule1 = medulla.require('./myModule1.js', {url:'client-module1.js', type:'cached'});
const myModule2 = medulla.require('./myModule2.js', {url:'client-module2.js', type:'file'});
```

Add extra mime types in format {"ext":"mime"}:
```es6
//myServerApp.js

module.exports.mimeTypes : {
    "es6" : "application/javascript"
},
```

Describe the worker function for request handling:
```es6
//myServerApp.js

module.exports.onRequest = io=>{
    if (io.url !== '/') io.send(404);
    else                io.send('<html><body>Hello World!</body></html>');
};
```

Or use it as proxy
```es6
//myServerApp.js

module.exports.onRequest = io=>{
    io.forward("mysite.net");
};
```

#### Start server
For start the server run the laucher:
```
node launcher.conf.js
```

or for start the server with dev plugins, run it with parameter:
```
node launcher.conf.js -dev
```
and open the site in browser (e.g. `localhost:3000`)

#### Common variables
You may share variables between workers using `medulla.common` method like this:
```es6

module.exports.onRequest = io=>{
    if (io.url !== '/') {
        io.send(404);
        return;
    }

    //Counter of requests
    medulla.common(storage=>{
        storage.counter = storage.sharedVariable || 0;
        storage.sharedVariable++;
        console.info('Requests: ' + storage.sharedVariable)
    });
    
    io.send('<html><body>It works!</body></html>');
};
```
#### Dashboard
You may see server status, or stop server use link: `/medulla-dashboard` 

#### Console commands
  - `version`  
  Show module current version.
  - `stop`  
  Shutdown server.

## License
MIT
