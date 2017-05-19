# Changelog

## Dev
##### Changes
- setting `devMode:true` is actual
- `includePlugins` proxy-flag changed to `isPage`
- `fileIndex` renamed to `watchedFiles`
- setting `watchFiles` removed, now `type:'file'` will be watched by server anyway
- added `publicAccess` - list of access rules to files

##### Fixes
- fixed error handling

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