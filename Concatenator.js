// Concats files into a temp file

var encoding = "utf-8";
var end_of_line = "\n";

var outfile = "concat.js";

// get file system module
var fs = require('fs');
// get file list (generated by php)
var filelist = require('./filelist.js').filelist;

function Concatenator(filelist)
{
  return filelist.map(function(file){
          return fs.readFileSync(file, encoding);
        });
}
var out = new Concatenator(filelist);
out = "module.exports.code = function code(){" + out.join(end_of_line) + "}";
fs.writeFileSync(outfile, out , encoding);
