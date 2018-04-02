define(function() {

  'use strict';

  var core = {
    fill: function(ctx, points) {
      function plotLineLow(p0, p1) {
        var dx = p1.x - p0.x, dy = p1.y - p0.y;
        var yi = 1;
        var h = dy;
        if (dy < 0) {
          yi = -1;
          dy = -dy;
          h = 0;
        }
        var D = 2*dy - dx;
        var y = p0.y;
        for (var x = p0.x; x < p1.x; x++) {
          ctx.rect(x, y, 1, h);
          if (D > 0) {
            y += yi;
            h -= yi;
            D -= 2*dx;
          }
          D += 2*dy;
        }
        if (dy < 0) {
          ctx.rect(p1.x, p1.y, 10000, -dy);
        }
        else {
          ctx.rect(p1.x, p0.y, 10000, dy);
        }
      }

      function plotLineHigh(p0, p1) {
        var dx = p1.x - p0.x, dy = p1.y - p0.y;
        var xi = 1;
        var w = dx;
        if (dx < 0) {
          xi = -1;
          dx = -dx;
          w = 0;
        }
        var D = 2*dx - dy;
        var x = p0.x;
        for (var y = p0.y; y < p1.y; y++) {
          ctx.rect(x, y, w, 1);
          if (D > 0) {
            x += xi;
            w -= xi;
            D -= 2*dy;
          }
          D += 2*dx;
        }
        if (dx < 0) {
          ctx.rect(p1.x, p0.y, 10000, dy);
        }
        else {
          ctx.rect(p0.x, p0.y, 10000, dy);
        }
      }

      function edge(p0, p1) {
        if (Math.abs(p1.y - p0.y) < Math.abs(p1.x - p0.x)) {
          if (p0.x > p1.x) {
            plotLineLow(p1, p0);
          }
          else {
            plotLineLow(p0, p1);
          }
        }
        else {
          if (p0.y > p1.y) {
            plotLineHigh(p1, p0);
          }
          else {
            plotLineHigh(p0, p1);
          }
        }
      }
      
      ctx.beginPath();
      edge(points[points.length-1], points[0]);
      for (var i_p2 = 1; i_p2 < points.length; i_p2++) {
        edge(points[i_p2-1], points[i_p2]);
      }
      ctx.fill('evenodd');
    },
    lines: function(ctx, points, loop) {
      function plotLineLow(p0, p1) {
        var dx = p1.x - p0.x, dy = p1.y - p0.y;
        var yi = 1;
        if (dy < 0) {
          yi = -1;
          dy = -dy;
        }
        var D = 2*dy - dx;
        var y = p0.y;
        for (var x = p0.x; x < p1.x; x++) {
          ctx.rect(x, y, 1, 1);
          if (D > 0) {
            y += yi;
            D -= 2*dx;
          }
          D += 2*dy;
        }
      }

      function plotLineHigh(p0, p1) {
        var dx = p1.x - p0.x, dy = p1.y - p0.y;
        var xi = 1;
        if (dx < 0) {
          xi = -1;
          dx = -dx;
        }
        var D = 2*dx - dy;
        var x = p0.x;
        for (var y = p0.y; y < p1.y; y++) {
          ctx.rect(x, y, 1, 1);
          if (D > 0) {
            x += xi;
            D -= 2*dy;
          }
          D += 2*dx;
        }
      }

      function edge(p0, p1) {
        if (Math.abs(p1.y - p0.y) < Math.abs(p1.x - p0.x)) {
          if (p0.x > p1.x) {
            plotLineLow(p1, p0);
          }
          else {
            plotLineLow(p0, p1);
          }
        }
        else {
          if (p0.y > p1.y) {
            plotLineHigh(p1, p0);
          }
          else {
            plotLineHigh(p0, p1);
          }
        }
      }
      
      ctx.beginPath();
      if (loop) {
        var last = points[points.length-1];
        if (last.x !== points[0].x || last.y !== points[0].y) {
          edge(last, points[0]);
        }
      }
      for (var i_p2 = 1; i_p2 < points.length; i_p2++) {
        edge(points[i_p2-1], points[i_p2]);
      }
      ctx.fill();
    },
  };
  
  return core;

});
