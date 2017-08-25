# Medulla
multithreaded, no-dependency node.js server.

## Features
- [**Multithreaded**](#common-variables) request handling.
- **Caching files in memory**, use it for scripts, styles, texts etc.
- **Automatic restart of the server** when app source files changing.
- **Built-in proxy** for forwarding requests.
- **Logging to files** for commands: `console.log() / .warn() / .error()`.
- **Hot reload slyles and scripts, and auto refreshing page** if used special [plugin](https://www.npmjs.com/package/medulla-hotcode).
- **Quickly start** of app developing.

```es6
//launcher.conf.js

require('medulla').launch({
    serverApp : "./app.js",
    platforms : {
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```

```es6
//app.js

module.exports.onRequest = (io, req, res)=>{
    io.send('Hello World!');
};
```

`node launcher.conf.js`

**(!)** *module in development, this is unstable version with incomplete functional.*  

## Installation
As [npm](https://www.npmjs.com/package/medulla) package  
`npm install medulla`
  
As [git](https://github.com/mothgears/medulla.git) repository (with examples)  
`git clone https://github.com/mothgears/medulla.git`

## Plugins
- [medulla-hotcode](https://www.npmjs.com/package/medulla-hotcode)  
Plugin for hot reload pages, scripts and styles directly in browser.

## Usage
#### Server launcher and config
Create launcher (e.g. launcher.conf.js) and require medulla with some settings (for example):
```es6
//launcher.conf.js

const medulla = require('medulla');

medulla.launch({
    serverApp : "./myServerApp.js",
    port      : 3000,
    platforms : {
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```
**(!)** *if you change this file, you need restart medulla manually.*  

List of all available settings with default values:
- `serverApp: "./app.js"`  
Path to your app entry point.

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

- `pluging: {}`  
Server plugins in format "pluginModuleName" : "{plugin-settings}".

- `devPlugins: {}`  
This plugins used only in dev mode (-dev).

- `devMode: false`  
If set "true", the devPlugins will be included.

- `logging: {level:flags.LOG_TRACE, dir:process.cwd(), separatedTypes:true}`  
Async logging to file for "console.log()", "console.warn()" and "console.error()" methods.  
  - `level: flags.LOG_TRACE`  
  min level for logging, can be: medulla.flags.LOG_TRACE, LOG_WARNING or LOG_ERROR.
  - `dir: process.cwd()`  
  directory for .log files.
  - `separatedTypes: true`  
  split log into several files by level.

- `watchIgnore: {...}`  
Rules for ignoring files when watching
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

**(!)** *don't describe modules in "fileSystem" list, all required modules added automatically.*  
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
  - `cache-update`  
  Cache updating.

## License
MIT
