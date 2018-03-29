
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
    var svgdoc = parser.parseFromString(svgtext.value, 'image/svg+xml');
    var svg = svgdoc.documentElement;
    console.log(svg);
    rendercanvas.width = svg.width.baseVal.value;
    rendercanvas.height = svg.height.baseVal.value;
    var ctx = rendercanvas.getContext('2d');
    ctx.clearRect(0, 0, rendercanvas.width, rendercanvas.height);
    
    for (var node = svg.firstChild; node; node = node.nextSibling) {
      switch (node.nodeName) {
        case 'path':
          var style = window.getComputedStyle(node, null);
          var fill = style.getPropertyValue('fill');
          var stroke = style.getPropertyValue('stroke');
          console.log(fill, stroke);
          break;
      }
    }
  };
  renderbutton.disabled = false;
  
});
