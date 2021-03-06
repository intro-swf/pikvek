
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
  
  function pointLineDistanceSq(pointX, pointY, lineX1, lineY1, lineX2, lineY2) {
    const lineLengthSq = (lineX2 - lineX1)*(lineX2 - lineX1) + (lineY2 - lineY1)*(lineY2 - lineY1);
    if (lineLengthSq === 0) return NaN;
    const t = ((pointX - lineX1) * (lineX2 - lineX1) + (pointY - lineY1) * (lineY2 - lineY1)) / lineLengthSq;
    const meetX = lineX1 + t * (lineX2 - lineX1);
    const meetY = lineY1 + t * (lineY2 - lineY1);
    return (meetX - pointX)*(meetX - pointX) + (meetY - pointY)*(meetY - pointY);
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
          var vanish1 = getCrossingPoint(ax,ay,bx,by,dx,dy,cx,cy);
          var vanish2 = getCrossingPoint(ax,ay,dx,dy,bx,by,cx,cy);
          var aDist = pointLineDistanceSq(ax,ay, vanish1.x, vanish1.y, vanish2.x, vanish2.y);
          var bDist = pointLineDistanceSq(bx,by, vanish1.x, vanish1.y, vanish2.x, vanish2.y);
          var cDist = pointLineDistanceSq(cx,cy, vanish1.x, vanish1.y, vanish2.x, vanish2.y);
          var dDist = pointLineDistanceSq(dx,dy, vanish1.x, vanish1.y, vanish2.x, vanish2.y);
          var maxDist = Math.max(aDist, bDist, cDist, dDist);
          var oppositeMidX, oppositeMidY;
          if (aDist === maxDist) {
            oppositeMidX = ax; oppositeMidY = ay;
          }
          else if (bDist === maxDist) {
            oppositeMidX = bx; oppositeMidY = by;
          }
          else if (cDist === maxDist) {
            oppositeMidX = cx; oppositeMidY = cy;
          }
          else /* dDist === maxDist */ {
            oppositeMidX = dx; oppositeMidY = dy;
          }
          var oppositeMidX2 = oppositeMidX + (vanish2.x - vanish1.x);
          var oppositeMidY2 = oppositeMidY + (vanish2.y - vanish1.y);
          var opposite1 = getCrossingPoint(vanish1.x, vanish1.y, ax, ay, oppositeMidX,oppositeMidY, oppositeMidX2,oppositeMidY2);
          var opposite2 = getCrossingPoint(vanish2.x, vanish2.y, cx, cy, oppositeMidX,oppositeMidY, oppositeMidX2,oppositeMidY2);
          const xBaseX = oppositeMidX, xBaseY = oppositeMidY;
          const xOffX = (opposite2.x - xBaseX) / srcBox.width, xOffY = (opposite2.y - xBaseY) / srcBox.width;
          const yBaseX = opposite1.x, yBaseY = opposite1.y;
          const yOffX = (oppositeMidX - yBaseX) / srcBox.height, yOffY = (oppositeMidY - yBaseY) / srcBox.height;
          const reverseX = srcBox.width / Math.sqrt(Math.pow(opposite2.x - xBaseX,2) + Math.pow(opposite2.y - xBaseY,2));
          const reverseY = srcBox.height / Math.sqrt(Math.pow(oppositeMidX - yBaseX,2) + Math.pow(oppositeMidY - yBaseY,2));
          console.log(xBaseX,xBaseY, xOffX,xOffY, yBaseX,yBaseY, yOffX,yOffY);
          function transform(point) {
            return getCrossingPoint(
              vanish2.x, vanish2.y, xBaseX + point.x * xOffX, xBaseY + point.x * xOffY,
              vanish1.x, vanish1.y, yBaseX + point.y * yOffX, yBaseY + point.y * yOffY);
          }
          function reverseTransform(point) {
            var project1 = getCrossingPoint(vanish1.x, vanish1.y, point.x, point.y, opposite1.x, opposite1.y, opposite2.x, opposite2.y);
            var project2 = getCrossingPoint(vanish2.x, vanish2.y, point.x, point.y, opposite1.x, opposite1.y, opposite2.x, opposite2.y);
            var xd = Math.sqrt(Math.pow(project2.x - oppositeMidX, 2) + Math.pow(project2.y - oppositeMidY, 2)) * reverseX;
            var yd = Math.sqrt(Math.pow(project1.x - opposite1.x, 2) + Math.pow(project1.y - opposite1.y, 2)) * reverseY;
            return {x:xd, y:yd};
          }
          window.transformPoint = transform;
          window.transformPointReverse = reverseTransform;
          ctx.fillStyle = '#000';
          function roundPoint(pt) {
            return {x:Math.round(pt.x), y:Math.round(pt.y)};
          }
          for (var i = 0; i <= 10; i++) {
            var xi = srcBox.x + i*srcBox.width/10;
            var yi = srcBox.y + i*srcBox.height/10;
            core.lines(ctx, [
              roundPoint(transform({x:xi, y:srcBox.y})),
              roundPoint(transform({x:xi, y:srcBox.y + srcBox.height})),
            ], false);
            core.lines(ctx, [
              roundPoint(transform({x:srcBox.x, y:yi})),
              roundPoint(transform({x:srcBox.x + srcBox.width, y:yi})),
            ], false);
          }
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
