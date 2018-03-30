
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
    for (var node = doc.documentElement.firstChild; node; node = node.nextSibling) {
      if (node.nodeType !== 1) continue;
      ctx.save();
      ctx.translate(node.getAttribute('x') || 0, node.getAttribute('y') || 0);
      switch (node.nodeName) {
        case 'shape':
          var path = pathData.parse(node.getAttribute('path') || '');
          path = pathData.absolutize(path);
          path = pathData.reduce(path);
          var points = [];
          var loop = false;
          for (var i = 0; i < path.length; i++) {
            if (path[i].type === 'Z') {
              loop = true;
            }
            else {
              points.push({x:path[i].values[0], y:path[i].values[1]});
            }
          }
          if (node.hasAttribute('fill')) {
            ctx.fillStyle = node.getAttribute('fill');
            core.fill(ctx, points);
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
  };
  renderbutton.disabled = false;
  
  var points = [
    {x:247, y:887 - 650},
    {x:213, y:977 - 650},
    {x:168, y:893 - 650},
    {x:73, y:908 - 650},
    {x:123, y:826 - 650},
    {x:62, y:752 - 650},
    {x:158, y:755 - 650},
    {x:192, y:665 - 650},
    {x:238, y:749 - 650},
    {x:333, y:734 - 650},
    {x:282, y:816 - 650},
    {x:343, y:890 - 650},
  ];
  var ctx = rendercanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  core.fill(ctx, points);
  ctx.fillStyle = '#000';
  core.lines(ctx, points, true);
  
});
