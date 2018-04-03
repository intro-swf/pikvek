
requirejs.config({
  waitSeconds: 0,
});

require([
  '//cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1/domReady.min.js!'
  ,'pathData'
  ,'pikvek/core'
], function(
  domReady
  ,pathData
  ,core
) {
  
  'use strict';
  
  var svgtext = document.getElementById('svgtext');
  var renderbutton = document.getElementById('renderbutton');
  var rendercanvas = document.getElementById('rendercanvas');
  
  var parser = new DOMParser;
  
  renderbutton.onclick = function() {
    var doc = parser.parseFromString(svgtext.value, 'application/xml');
    rendercanvas.width = doc.documentElement.getAttribute('width') || 300;
    rendercanvas.height = doc.documentElement.getAttribute('height') || 150;
    var ctx = rendercanvas.getContext('2d');
    ctx.clearRect(0, 0, rendercanvas.width, rendercanvas.height);
    function draw(node) {
      ctx.save();
      ctx.translate(
        node.getAttribute('x') || 0,
        node.getAttribute('y') || 0);
      switch (node.nodeName) {
        case 'shape':
          var path = pathData.parse(node.getAttribute('path') || '');
          path = pathData.absolutize(path);
          path = pathData.reduce(path);
          path = pathData.linearize(path);
          var points = [];
          var loop = false;
          for (var i = 0; i < path.length; i++) {
            if (path[i].type === 'Z') {
              loop = true;
            }
            else {
              points.push({x:Math.round(path[i].values[0]), y:Math.round(path[i].values[1])});
            }
          }
          if (node.hasAttribute('fill')) {
            ctx.fillStyle = node.getAttribute('fill');
            core.fill(ctx, points);
            if (node.childNodes.length > 0) {
              ctx.save();
              ctx.clip('evenodd');
              for (var childNode = node.firstChild; childNode; childNode = childNode.nextSibling) {
                draw(childNode);
              }
              ctx.restore();
            }
          }
          if (node.hasAttribute('edges')) {
            ctx.fillStyle = node.getAttribute('edges');
            core.lines(ctx, points, loop);
          }
          break;
        default:
          console.warn('pikvek: unknown element ' + node.nodeName);
          break;
      }
      ctx.restore();
    }
    for (var node = doc.documentElement.firstChild; node; node = node.nextSibling) {
      if (node.nodeType !== 1) continue;
      draw(node);
    }
  };
  renderbutton.disabled = false;
  
});
