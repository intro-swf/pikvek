
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
  
  function getCrossingPoint(ax1,ay1, ax2,ay2, bx1,by1, bx2,by2) {
    var a1 = ay2 - ay1;
    var b1 = ax1 - ax2;
    var c1 = a1*ax1 + b1*ay1;

    var a2 = by2 - by1;
    var b2 = bx1 - bx2;
    var c2 = a2*bx1 + b2*by1;

    var determinant = a1*b2 - a2*b1;

    return (determinant === 0) ? 'parallel' : {
      x: (b2*c1 - b1*c2)/determinant,
      y: (a1*c2 - a2*c1)/determinant,
    };
  }
  
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
                if (childNode.nodeType === 1) draw(childNode);
              }
              ctx.restore();
            }
          }
          if (node.hasAttribute('edges')) {
            ctx.fillStyle = node.getAttribute('edges');
            core.lines(ctx, points, loop);
          }
          break;
        case 'perspective':
          var srcBox = node.getAttribute('src-box').match(/^\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s*$/);
          if (!srcBox) {
            throw new Error('perspective must have valid src-box');
          }
          srcBox = {x:+srcBox[1], y:+srcBox[2], width:+srcBox[3], height:+srcBox[4]};
          var destPath = pathData.parse(node.getAttribute('dest-path'));
          destPath = pathData.absolutize(destPath);
          destPath = pathData.reduce(destPath);
          if (destPath.length !== 5
            || destPath[0].type !== 'M'
            || destPath[1].type !== 'L'
            || destPath[2].type !== 'L'
            || destPath[3].type !== 'L'
            || destPath[4].type !== 'Z'
          ) {
            throw new Error('perspective must have valid dest-path');
          }
          var ax = destPath[0].values[0], ay = destPath[0].values[1],
              bx = destPath[1].values[0], by = destPath[1].values[1],
              cx = destPath[2].values[0], cy = destPath[2].values[1],
              dx = destPath[3].values[0], dy = destPath[3].values[1];
          console.log(srcBox, destPath);
          var vanishingPoint1 = getCrossingPoint(ax,ay,bx,by,dx,dy,cx,cy);
          var vanishingPoint2 = getCrossingPoint(ax,ay,dx,dy,bx,by,cx,cy);
          console.log(vanishingPoint1, vanishingPoint2);
          break;
        default:
          console.warn('pikvek: unknown element ' + node.nodeName);
          break;
      }
      ctx.restore();
    }
    for (var node = doc.documentElement.firstChild; node; node = node.nextSibling) {
      if (node.nodeType === 1) draw(node);
    }
  };
  renderbutton.disabled = false;
  
});
