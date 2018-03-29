
requirejs.config({
  waitSeconds: 0,
});

require(['//cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1/domReady.min.js'], function() {
  
  'use strict';
  
  var svgtext = document.getElementById('svgtext');
  var renderbutton = document.getElementById('renderbutton');
  var rendercanvas = document.getElementById('rendercanvas');
  
  var parser = new DOMParser;
  
  renderbutton.onclick = function() {
    var svgdoc = JSON.parse(svgtext.value);
    svgdoc.paths.forEach(function(path) {
      console.log(path);
    });
  };
  renderbutton.disabled = false;
  
});
