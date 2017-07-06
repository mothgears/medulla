# Changelog

## V 0.6.3 (dev)
##### Improvements
- added common variables storage

## V 0.6.2 (dev)
##### Improvements
- now `watchIgnore` apply to folders and when files adding to index

##### Fixes 
- fixed bug with icorrect cache update

## V 0.6.1 (dev)
##### Fixes
- incorrect default `watchIgnore` functions

## V 0.6.0 (dev)
##### Improvements
- now `watchedFiles` handles adding/removing files and folders
- added support "one-line" hosts notation: `"Home-pc, debian": {logging: {level: 'warning'}}`

##### Fixes
- fixed incorrect file removing handling when used some IDE/OS
- now arrays in medulla settings is merging (when merged default/host/platform settings)

## V 0.5.3
##### Changes
- plugins api: `settings` argument moved to `io` argument

##### Fixes
- fixed bug with incorrect handling "`~`" symbol in templates of `publicAccess`

## V 0.5.2
##### Fixes
- removing watched files from disk now is handled

## V 0.5.1
##### Improvements
- added "as" information to "index add" info
- to plugins API added method `toClient`

## V 0.5.0
##### Changes
- plugins API is fully changed

## V 0.4.0
##### Changes
- **(!)** watchedFiles / publicAccess: `src` and `url` are reversed (src param removed, url param added)

##### Improvements
- modified plugins api, added `cacheModificator`
- `image/x-icon` added to standart mimeTypes

##### Fixes
- isPage added for modules and cache updates

## V 0.3.7
##### Changes
- log files format is updated: `traces-YEAR-MM-DD.log`

##### Improvements
- new `logging.level: 'warning'`
- added logging for `console.warn()` method
- labels for log records and console output (e.g. `[ERROR]*`)

##### Fixes
- page 404 is has been corrected
- module without `exports.onRequest` is now handled correctly

## V 0.3.6
##### Improvements
- added reference to `medulla-hotcode` plugin

## v 0.3.5
##### Improvements
- to `watchedFiles` added variable ext (`?`)

##### Fixes
- templates in `watchedFiles` resolved more correctly

## v 0.3.4
##### Changes
- `logging.enabled` replaced with `logging.level`

##### Improvements
- added `logging.separatedTypes` setting
- `appModel: export.onRequest` now is optional

##### Fixes
- fixed logging settings
- platforms/hosts settings merging now is recursive

## v 0.3.3
##### Improvements
- added `platforms` settings

##### Fixes
- the numbering of months in the names of the logfiles has changed, now from 1 to 12

## v 0.3.2
##### Improvements
- added async logging to file

## v 0.3.1
##### Fixes
- corrected path determination in `medulla.require()`

## v 0.3.0
##### Changes
- setting `devMode:true` is actual
- `includePlugins` proxy-flag changed to `isPage`
- `fileIndex` renamed to `watchedFiles`
- setting `watchFiles` removed, now `type:'file'` will be watched by server anyway
- `serverDir` default value now is `process.cwd()`
- extra `mimeTypes` removed from settings, and added to main module

##### Improvements
- added `isPage` prop for watched files index
- added `publicAccess` - list of access rules to files

##### Fixes
- fixed error handling
- fixed incorrect url combining, `serverDir` and `serverApp` now will be combining using path.resolve
- fixed incorrect medulla.require path combining
- fixed no-mimeType error

## v 0.2.7
##### Changes
- mimeType is firstly determined by src file extension, if not, then by url

##### Improvements
- added optional possibility to use function `serverApp:(export)=>{...}` instead of path to main module (but not recommended)
- added fileIndex templates with recursive search `'*.png': {src:/mydir/~*png}`

##### Fixes
- fixed incorrect current dir detection in fileIndex templates

## v 0.2.6
##### Changes
- special settings have been moved from main module to server settings (entry point file)
- mimeType setting changed from file to object and now extend base types from mimeType.json file

## v 0.2.4
##### Fixes
- fixed incorrect detecting a changes in the params of the fileIndex items

## v 0.2.2
##### Changes
- setting `devMode:true` replaced with launch parameter `-dev`

##### Improvements
- added console commands:  
  - `version` - show current module version  
  - `stop` - shutdown server

## v 0.2.1
##### Fixes
- handler function set as local