/*
 *  Node Classloader
 */

var sourcePath = process.argv[2];
var package = process.argv[3];

var Classloader = (function(){

  var Glob = require('./Glob.js');
  var FileSystem = require('fs');
  var ClassObject = require("./Class.js");
  
  var Classloader = function Classloader(sourcePath, package)
  {
    this.version = "1.1";

    if(sourcePath == undefined || package == undefined)
      throw new Error("Classloader requires a source folder and package name")

    this.sourcePath = sourcePath;
    this.package = package;
    this.classes = {};
    this.classOrder = [];
    this.namespaces = {};

    this.encoding = "utf-8";
    this.EOF = "\n";
    this.D_EOF = "\n\n";

    this.filelist = new Glob(sourcePath + "/" + this.package.replace(/\./g, "/"), ".js").getList();

    this.sourceCode = this.getSourceContent(this.filelist);
  };

  Classloader.prototype.Classloader = Classloader;

  Classloader.prototype.Package = function (namespaceURI)
  {
    // Create a class; a class always starts with a package, subsequent function calls will be applied to this class.
    this.currentClass = new ClassObject(namespaceURI);

    var namespaces = namespaceURI.split(".");
    var obj = this.namespaces;

    for (var i = 0; i < namespaces.length; i++) 
    {
      var ns = namespaces[i];
      if(obj[ns] === undefined) 
      {
        obj[ns] = {};
        obj = obj[ns];
      }
      else
        obj = obj[ns];
    }
  };

  Classloader.prototype.Import = function ()
  {
    // register the imports on the class
    for (var i = 0; i < arguments.length; i++) 
    {
     var importClass = arguments[i];
     this.currentClass.addImport(importClass);
    }
  };

  Classloader.prototype.Extends = function ()
  {
    // register extension on the class
    for (var i = 0; i < arguments.length; i++) 
    {
     var extendClass = arguments[i];
     this.currentClass.addExtend(extendClass);
    } 
  };

  Classloader.prototype.Class = function () 
  {
    // the 'Class' method contains the contents of the class
    this.parseMethods(arguments); 
  };

  Classloader.prototype.Singleton = function () 
  {
    this.currentClass.setSingleton();

    this.parseMethods(arguments);
  };

  // register a resource on the class
  Classloader.prototype.CSSResource = function (rsc) 
  {
    this.currentClass.addResource("CSSResource", this.sourcePath, rsc);
  };

  // register a resource on the class
  Classloader.prototype.XMLResource = function (rsc) 
  {
    this.currentClass.addResource("XMLResource", this.sourcePath, rsc);
  };

  Classloader.prototype.Static = "static";
  Classloader.prototype.Public = "public";
  Classloader.prototype.Protected = "protected";

  Classloader.prototype.parseMethods = function (args) 
  {
    // Parse the methods in the class
    for (var i = 0; i < args.length; i++) 
    {
      var arg = args[i];
      if(typeof arg == 'function')
      {
        var name = this.getMethodName(arg);
        if(i == 0) // the first method is the constructor 
        {
          this.currentClass.setConstructor(name, arg);

          // add the class now that we have the full identifier
          var namespaceURI = this.currentClass.getName();
          this.classes[namespaceURI] = this.currentClass;
        }
        else
          this.currentClass.addMethod(name, arg);
      }
      else
        this.currentClass.setFlag(arg);        
    } 
  };

  Classloader.prototype.getMethodName = function (f) {
    var str = f.toString();
    var name = str.substring(str.indexOf(' ')+1, str.indexOf("("));
    if(name == '' || name == ' ')
      return false;
    else
      return name;
  };

  Classloader.prototype.resolveDependencies = function () 
  {
    var classes = this.getUnresolvedClasses();
    var runs = 0;
    var maxruns = 20;
    while(classes != 0 && maxruns >= runs)
    {
      for (var namespaceURI in classes) 
      {
        var c = classes[namespaceURI];

        if(c.hasUnresolvedDependencies(this.classes))
          continue;
        else
        {
          c.setResolved();
          // add the classname to an ordered list of classes to render
          this.classOrder.push(c.getName());
        }
      }

      runs++;
      classes = this.getUnresolvedClasses();
    }
  };

  Classloader.prototype.getUnresolvedClasses = function ()
  {
    var classes = {};
    for(var namespaceURI in this.classes)
      if(!this.classes[namespaceURI].isResolved())
        classes[namespaceURI] = this.classes[namespaceURI];
    if (Object.keys(classes).length != 0) 
      return classes;
    else
      return false;
  };

  Classloader.prototype.getSourceContent = function(filelist)
  {
    var sources = filelist.map(function(file){
            return FileSystem.readFileSync(file, this.encoding);
          });
    return sources.join(this.EOF);
  };

  Classloader.prototype.compile = function ()  
  {
    eval(this.sourceCode);

    this.resolveDependencies();
  };

  Classloader.prototype.writeOutput = function() 
  {    
    process.stdout.write("// Node Classloader Version " + this.version + this.D_EOF);
    process.stdout.write(this.writeExtendsFunction() + this.D_EOF);
    process.stdout.write(this.writeNamespaces(this.namespaces, true) + this.D_EOF);

    for (var i = 0; i < this.classOrder.length; i++) 
      process.stdout.write(this.writeClassDefinition(this.classes[this.classOrder[i]]));
  };

  Classloader.prototype.writeExtendsFunction = function()
  {
    return ["Function.prototype.Extends = function(base)", 
            "{", 
            "  if(!base)", 
            "    debugger;", 
            "  for (var name in base.prototype)", 
            "  {", 
            "    if (this.prototype[name]) //if the method exists, declare it as a super method" +this.EOF + 
            "      this.prototype[base.name + \"$\" + name] = base.prototype[name];" +this.EOF + 
            "    else //if the method does not exist, declare it as regular", 
            "      this.prototype[name] = base.prototype[name];", 
            "  }", 
            "} "].join(this.EOF) ;
  };

  Classloader.prototype.writeNamespaces = function (obj, isroot) 
  {
    var str = "";
    for(var name in obj)
    {
      if(isroot)
        str += "var " + name +" = {" + this.writeNamespaces(obj[name])+ "}; ";
      else
        str += name +": {" + this.writeNamespaces(obj[name])+ "},";
    }

    return str.substring(0, str.length - 1);
  }

  Classloader.prototype.writeClassDefinition = function(c)
  {
    var str = "";
    str += "// " + c.getName() + this.EOF;
    str += "if (typeof " + c.getName() + " == 'undefined')" + this.EOF;
    str += c.getName() + " = (function()" + this.EOF;
    str += "{" + this.D_EOF;

    for(var namespaceURI in c.dependencies)
      str += "  var " + this.classes[namespaceURI].getClassName() + " = " + namespaceURI + ";"+ this.EOF;
    
    if(c.hasDependencies())
      str += this.EOF;

    str += "  var " + c.getClassName() + " = " + c.constr.method + this.D_EOF;

    var prototypestr = "  " + c.getClassName() + ".prototype.";
    var staticstr = "  " + c.getClassName() + ".";
    str +=  prototypestr+ c.getClassName() + " = " + c.getClassName() + ";" + this.D_EOF;

    for (var i = 0; i < c.methods.length; i++) 
    {
      var method = c.methods[i];
      if(!method.name) //anonymous functions
        str += "  (" + method.method + ")();" + this.D_EOF;
      else if(method.flag == this.Static) // static methods
        str += staticstr + method.name + " = " + method.method + ";" + this.D_EOF;
      else
        str += prototypestr + method.name + " = " + method.method + ";" + this.D_EOF;
    }
    if(c.extends)  
      str += "  " + c.getClassName() + ".Extends(" + c.extends +");" + this.D_EOF;

    for (var i = 0; i < c.resources.length; i++)
      str += "  " + c.getClassName() + "." + c.resources[i].type + " = \"" + c.resources[i].getContents() + "\";" + this.D_EOF;

    str += "  if (!" + c.getClassName() + ".name) " + c.getClassName() + ".name = '" +c.getClassName()+ "';" + this.D_EOF;

    if(c.singleton)
      str += "  return new " + c.getClassName() + "();" + this.D_EOF + "})();" + this.D_EOF;
    else
      str += "  return " + c.getClassName() + ";" + this.D_EOF + "})();" + this.D_EOF;
    return str;
  };

  return Classloader;
})();


var classloader = new Classloader(sourcePath, package);

// globally register functions called in source , and route them to the Classloader
Package     = function () { classloader.Package.apply(classloader, arguments)};
Extends     = function () { classloader.Extends.apply(classloader, arguments)};
Import      = function () { classloader.Import.apply(classloader, arguments)};
Class       = function () { classloader.Class.apply(classloader, arguments)};
Singleton   = function () { classloader.Singleton.apply(classloader, arguments)};
XMLResource = function () { classloader.XMLResource.apply(classloader, arguments)};
CSSResource = function () { classloader.CSSResource.apply(classloader, arguments)};

// flags
Static      = classloader.Static;
Public      = classloader.Public;
Protected   = classloader.Protected;

classloader.compile();
classloader.writeOutput();