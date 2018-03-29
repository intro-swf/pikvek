
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
    var svg = parser.parseFromString(svgtext.value, 'image/svg+xml');
    console.log(svg);
    rendercanvas.width = svg.documentElement.width.baseVal.value;
    rendercanvas.height = svg.documentElement.height.baseVal.value;
    var ctx = rendercanvas.getContext('2d');
    ctx.clearRect(0, 0, rendercanvas.width, rendercanvas.height);
  };
  renderbutton.disabled = false;
  
});
