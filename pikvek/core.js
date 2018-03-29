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
      edge(points[points.length-1], points[0]);
      for (var i_p2 = 1; i_p2 < points.length; i_p2++) {
        edge(points[i_p2-1], points[i_p2]);
      }
      ctx.fill('evenodd');
    },
    line: function(ctx, points, loop) {
      function edge(p1, p2) {
        var left, right;
        switch (Math.sign(p2.x - p1.y)) {
          case -1:
            left = p2;
            right = p1;
            break;
          case 0:
            if (p2.y < p1.y) {
              ctx.rect(p2.x, p2.y, 1, p1.y - p2.y);
            }
            else {
              ctx.rect(p2.x, p2.y, 1, p1.y - p2.y);
            }
            return;
          case 1:
            left = p1;
            right = p2;
            break;
        }
        switch (Math.sign(right.y - left.y)) {
          case -1:
            var deltaerr = (left.y - right.y) / (right.x - left.x);
            var error = 0;
            var y = left.y;
            for (var x = left.x; x < right.x; x++) {
              ctx.rect(x, y, 1, 1);
              error += deltaerr;
              while (error >= 0.5) {
                y--;
                error -= 1;
              }
            }
            break;
          case 0:
            ctx.rect(left.x, left.y, right.x - left.x, 1);
            break;
          case 1:
            var deltaerr = (right.y - left.y) / (right.x - left.x);
            var error = 0;
            var y = left.y;
            for (var x = left.x; x < right.x; x++) {
              ctx.rect(x, y, 1, 1);
              error += deltaerr;
              while (error >= 0.5) {
                y++;
                error -= 1;
              }
            }
            break;
        }
        if (p1.y === p2.y) {
          return;
        }
      }
      ctx.beginPath();
      if (loop) edge(points[points.length-1], points[0]);
      for (var i_p2 = 1; i_p2 < points.length; i_p2++) {
        edge(points[i_p2-1], points[i_p2]);
      }
      ctx.fill();
    },
  };
  
  return core;

});
