define(function() {

  'use strict';

  var core = {
    fill: function(ctx, points) {
      if (points.length < 2) return;
      function edge(p1, p2) {
        var left, right;
        switch (Math.sign(p2.x - p1.x)) {
          case -1:
            left = p2;
            right = p1;
            break;
          case 0:
            if (p2.y < p1.y) {
              ctx.rect(p1.x, p2.y, 10000, p1.y - p2.y);
            }
            else {
              ctx.rect(p1.x, p1.y, 10000, p2.y - p1.y);
            }
            return;
          case 1:
            left = p1;
            right = p2;
            break;
        }
        switch (Math.sign(right.y - left.y)) {
          case -1:
            /* / slope */
            var y = left.y;
            var deltaError = (left.y - right.y) / (right.x - left.x);
            var error = 0;
            for (var x = left.x; x < right.x; x++) {
              ctx.rect(x, y, 1, left.y - y);
              error += deltaError;
              while (error >= 0.5) {
                y--;
                error -= 1;
              }
            }
            ctx.rect(right.x, right.y, 10000, left.y - right.y);
            break;
          case 0:
            /* - horizontal */
            break;
          case 1:
            /* \ slope */
            var y = left.y;
            var deltaError = (right.y - left.y) / (right.x - left.x);
            var error = 0;
            for (var x = left.x; x < right.x; x++) {
              ctx.rect(x, left.y, 1, y - left.y);
              error += deltaError;
              while (error >= 0.5) {
                y++;
                error -= 1;
              }
            }
            ctx.rect(right.x, left.y, 10000, right.y - left.y);
            break;
        }
      }
      ctx.beginPath();
      var last = points[points.length-1];
      if (last.x !== points[0].x || last.y !== points[0].y) {
        edge(last, points[0]);
      }
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
