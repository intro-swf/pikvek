
requirejs.config({
  waitSeconds: 0,
});

require([
  '//cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1/domReady.min.js!'
  ,'pikvek/core'
], function(
  domReady
  ,core
) {
  
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
  
  var ctx = rendercanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  core.fill(ctx, [
    {x:247, y:887},
    {x:213, y:977},
    {x:168, y:893},
    {x:73, y:908},
    {x:123, y:826},
    {x:62, y:752},
    {x:158, y:755},
    {x:192, y:665},
    {x:238, y:749},
    {x:333, y:734},
    {x:282, y:816},
    {x:343, y:890},
  ]);
  
});
