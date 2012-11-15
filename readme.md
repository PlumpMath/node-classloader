# Node ClassLoader

This is a Javascript classloader that converts easy to read (and valid) Javascript in functioning and executable Javascript.

The classloader uses a php script to output the compiled code as Javascript to the browser. I didn't feel like using a NodeJS server for that. The php calls does a command line call to NodeJS to run the Classloader.

The Classloader parses the original Javascript. Resolves dependencies and finally writes the output. The Classloader compiles classes that follow the format below. 

## Example source code

<pre>
/* Always start a class with a package declaration */  
Package("com.something.components.thing");
 
/* Import classes to use them */  
Import("com.something.AnotherClass");
 
/* Extend classes to inherit functionality */  
Extends("com.something.components.AnotherThing");
 
/* Resources can be used to import data */  
XMLResource("Thing.template.xml");

/* A CSS resource */  
CSSResource("Thing.css");

/* This is the class declaration */    
Class  
(
  /* The first method is the constructor and carries the name of the class */  
  function Thing(argument)
  {
    /* Call to super constructor */  
    this.AnotherThing(parentScope);
  },
 
  /* A method on the class */  
  function doSomething(a1, a2)
  {
    var statement = a1;
    var f = function(){return a2 + 2;};
 
    return f;
  },
 
  /* A static method */  
  Static, function test()
  {
  },
 
  /* An anonymous method, which will be called within the class  */  
  function ()
  {
  }
)
</pre> 
The classloader supports Class or Singleton, Importing and Extending other classes, resources, and Static and anonymous methods.

## Example output

<pre>
/* A comment to lead in */
//#com.something.components.thing.Thing
 
if (typeof com.something.components.thing.Thing == 'undefined')
com.something.components.thing.Thing = (function() {
 
  /*  Make Imports and Extended classes available  */
  var AnotherClass = com.something.AnotherClass;
  var AnotherThing = com.something.components.AnotherThing;

  /* First we create a variable and assign a function, the foundation of the class */
  var Thing = function Thing(parentScope) 
  {
    this.AnotherThing(parentScope);
  };
 
  /* This is to keep the constructor property correct and when extended creates the super as this.Classname.*/
  Thing.prototype.Thing = Thing;
 
  /* Add simple a method to the class */
  Thing.prototype.doSomething = function doSomething(a1, a2)
  {
    var statement = a1;
    var f = function(){return a2 + 2;};

    return f;
  };
 
  /* A static method */
  Thing.test = function test()
  {
  };
 
  (function ()
  {
  })();
 
  /* Inhertance is accomplished by the Extends method that the Classloader adds to Function.prototype */
  Thing.Extends(com.something.components.AnotherThing, Identifier({AnotherThing:1}));

  /* Resources are added as static properties */
  Thing.XMLResource = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><xml/>";
 
  Thing.CSSResource = "xml {font-family:arial;}";
  
  /* Set a name property on the Class */
  if (!DOMCompat.name) DOMCompat.name = 'DOMCompat';
  
  /* This completes the Class */
  return Thing;
 
})(); 
</pre>

## Todo
- write down demands on code and source folders and packages
- throw more errors when you write improper classes
- set up unit testing of a sort.
- implement crypting
- implement building
- implement minifying (isn't that the same as crypting?)