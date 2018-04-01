define(function() {

  'use strict';
  
  const commandsMap = {
    "Z":"Z", "M":"M", "L":"L", "C":"C", "Q":"Q", "A":"A", "H":"H", "V":"V", "S":"S", "T":"T",
    "z":"Z", "m":"m", "l":"l", "c":"c", "q":"q", "a":"a", "h":"h", "v":"v", "s":"s", "t":"t"
  };

  function Source(string) {
    this._string = string;
    this._currentIndex = 0;
    this._endIndex = this._string.length;
    this._prevCommand = null;
    this._skipOptionalSpaces();
  }
  Source.prototype = {
    parseSegment: function() {
      var char = this._string[this._currentIndex];
      var command = commandsMap[char] ? commandsMap[char] : null;

      if (command === null) {
        // Possibly an implicit command. Not allowed if this is the first command.
        if (this._prevCommand === null) {
          return null;
        }

        // Check for remaining coordinates in the current command.
        if (
          (char === "+" || char === "-" || char === "." || (char >= "0" && char <= "9")) && this._prevCommand !== "Z"
        ) {
          if (this._prevCommand === "M") {
            command = "L";
          }
          else if (this._prevCommand === "m") {
            command = "l";
          }
          else {
            command = this._prevCommand;
          }
        }
        else {
          command = null;
        }

        if (command === null) {
          return null;
        }
      }
      else {
        this._currentIndex += 1;
      }

      this._prevCommand = command;

      var values = null;
      var cmd = command.toUpperCase();

      if (cmd === "H" || cmd === "V") {
        values = [this._parseNumber()];
      }
      else if (cmd === "M" || cmd === "L" || cmd === "T") {
        values = [this._parseNumber(), this._parseNumber()];
      }
      else if (cmd === "S" || cmd === "Q") {
        values = [this._parseNumber(), this._parseNumber(), this._parseNumber(), this._parseNumber()];
      }
      else if (cmd === "C") {
        values = [
          this._parseNumber(),
          this._parseNumber(),
          this._parseNumber(),
          this._parseNumber(),
          this._parseNumber(),
          this._parseNumber()
        ];
      }
      else if (cmd === "A") {
        values = [
          this._parseNumber(),
          this._parseNumber(),
          this._parseNumber(),
          this._parseArcFlag(),
          this._parseArcFlag(),
          this._parseNumber(),
          this._parseNumber()
        ];
      }
      else if (cmd === "Z") {
        this._skipOptionalSpaces();
        values = [];
      }

      if (values === null || values.indexOf(null) >= 0) {
        // Unknown command or known command with invalid values
        return null;
      }
      else {
        return {type: command, values: values};
      }
    },

    hasMoreData: function() {
      return this._currentIndex < this._endIndex;
    },

    peekSegmentType: function() {
      var char = this._string[this._currentIndex];
      return commandsMap[char] ? commandsMap[char] : null;
    },

    initialCommandIsMoveTo: function() {
      // If the path is empty it is still valid, so return true.
      if (!this.hasMoreData()) {
        return true;
      }

      var command = this.peekSegmentType();
      // Path must start with moveTo.
      return command === "M" || command === "m";
    },

    _isCurrentSpace: function() {
      var char = this._string[this._currentIndex];
      return char <= " " && (char === " " || char === "\n" || char === "\t" || char === "\r" || char === "\f");
    },

    _skipOptionalSpaces: function() {
      while (this._currentIndex < this._endIndex && this._isCurrentSpace()) {
        this._currentIndex += 1;
      }

      return this._currentIndex < this._endIndex;
    },

    _skipOptionalSpacesOrDelimiter: function() {
      if (
        this._currentIndex < this._endIndex &&
        !this._isCurrentSpace() &&
        this._string[this._currentIndex] !== ","
      ) {
        return false;
      }

      if (this._skipOptionalSpaces()) {
        if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === ",") {
          this._currentIndex += 1;
          this._skipOptionalSpaces();
        }
      }
      return this._currentIndex < this._endIndex;
    },

    // Parse a number from an SVG path. This very closely follows genericParseNumber(...) from
    // Source/core/svg/SVGParserUtilities.cpp.
    // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-PathDataBNF
    _parseNumber: function() {
      var exponent = 0;
      var integer = 0;
      var frac = 1;
      var decimal = 0;
      var sign = 1;
      var expsign = 1;
      var startIndex = this._currentIndex;

      this._skipOptionalSpaces();

      // Read the sign.
      if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === "+") {
        this._currentIndex += 1;
      }
      else if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === "-") {
        this._currentIndex += 1;
        sign = -1;
      }

      if (
        this._currentIndex === this._endIndex ||
        (
          (this._string[this._currentIndex] < "0" || this._string[this._currentIndex] > "9") &&
          this._string[this._currentIndex] !== "."
        )
      ) {
        // The first character of a number must be one of [0-9+-.].
        return null;
      }

      // Read the integer part, build right-to-left.
      var startIntPartIndex = this._currentIndex;

      while (
        this._currentIndex < this._endIndex &&
        this._string[this._currentIndex] >= "0" &&
        this._string[this._currentIndex] <= "9"
      ) {
        this._currentIndex += 1; // Advance to first non-digit.
      }

      if (this._currentIndex !== startIntPartIndex) {
        var scanIntPartIndex = this._currentIndex - 1;
        var multiplier = 1;

        while (scanIntPartIndex >= startIntPartIndex) {
          integer += multiplier * (this._string[scanIntPartIndex] - "0");
          scanIntPartIndex -= 1;
          multiplier *= 10;
        }
      }

      // Read the decimals.
      if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === ".") {
        this._currentIndex += 1;

        // There must be a least one digit following the .
        if (
          this._currentIndex >= this._endIndex ||
          this._string[this._currentIndex] < "0" ||
          this._string[this._currentIndex] > "9"
        ) {
          return null;
        }

        while (
          this._currentIndex < this._endIndex &&
          this._string[this._currentIndex] >= "0" &&
          this._string[this._currentIndex] <= "9"
        ) {
          frac *= 10;
          decimal += (this._string.charAt(this._currentIndex) - "0") / frac;
          this._currentIndex += 1;
        }
      }

      // Read the exponent part.
      if (
        this._currentIndex !== startIndex &&
        this._currentIndex + 1 < this._endIndex &&
        (this._string[this._currentIndex] === "e" || this._string[this._currentIndex] === "E") &&
        (this._string[this._currentIndex + 1] !== "x" && this._string[this._currentIndex + 1] !== "m")
      ) {
        this._currentIndex += 1;

        // Read the sign of the exponent.
        if (this._string[this._currentIndex] === "+") {
          this._currentIndex += 1;
        }
        else if (this._string[this._currentIndex] === "-") {
          this._currentIndex += 1;
          expsign = -1;
        }

        // There must be an exponent.
        if (
          this._currentIndex >= this._endIndex ||
          this._string[this._currentIndex] < "0" ||
          this._string[this._currentIndex] > "9"
        ) {
          return null;
        }

        while (
          this._currentIndex < this._endIndex &&
          this._string[this._currentIndex] >= "0" &&
          this._string[this._currentIndex] <= "9"
        ) {
          exponent *= 10;
          exponent += (this._string[this._currentIndex] - "0");
          this._currentIndex += 1;
        }
      }

      var number = integer + decimal;
      number *= sign;

      if (exponent) {
        number *= Math.pow(10, expsign * exponent);
      }

      if (startIndex === this._currentIndex) {
        return null;
      }

      this._skipOptionalSpacesOrDelimiter();

      return number;
    },

    _parseArcFlag: function() {
      if (this._currentIndex >= this._endIndex) {
        return null;
      }

      var flag = null;
      var flagChar = this._string[this._currentIndex];

      this._currentIndex += 1;

      if (flagChar === "0") {
        flag = 0;
      }
      else if (flagChar === "1") {
        flag = 1;
      }
      else {
        return null;
      }

      this._skipOptionalSpacesOrDelimiter();
      return flag;
    }
  };
  
  function* eachPathSegment(string) {
    var source = new Source(string);
    var pathData = [];

    if (source.initialCommandIsMoveTo()) {
      while (source.hasMoreData()) {
        var pathSeg = source.parseSegment();

        if (pathSeg === null) {
          break;
        }
        yield pathSeg;
      }
    }
  }

  function parsePathDataString(string) {
    if (!string || string.length === 0) return [];

    var source = new Source(string);
    var pathData = [];

    if (source.initialCommandIsMoveTo()) {
      while (source.hasMoreData()) {
        var pathSeg = source.parseSegment();

        if (pathSeg === null) {
          break;
        }
        else {
          pathData.push(pathSeg);
        }
      }
    }

    return pathData;
  }

  function arcToCubicCurves(x1, y1, x2, y2, r1, r2, angle, largeArcFlag, sweepFlag, _recursive) {
    function degToRad(degrees) {
      return (Math.PI * degrees) / 180;
    }

    var rotate = function(x, y, angleRad) {
      var X = x * Math.cos(angleRad) - y * Math.sin(angleRad);
      var Y = x * Math.sin(angleRad) + y * Math.cos(angleRad);
      return {x: X, y: Y};
    };

    var angleRad = degToRad(angle);
    var params = [];
    var f1, f2, cx, cy;

    if (_recursive) {
      f1 = _recursive[0];
      f2 = _recursive[1];
      cx = _recursive[2];
      cy = _recursive[3];
    }
    else {
      var p1 = rotate(x1, y1, -angleRad);
      x1 = p1.x;
      y1 = p1.y;

      var p2 = rotate(x2, y2, -angleRad);
      x2 = p2.x;
      y2 = p2.y;

      var x = (x1 - x2) / 2;
      var y = (y1 - y2) / 2;
      var h = (x * x) / (r1 * r1) + (y * y) / (r2 * r2);

      if (h > 1) {
        h = Math.sqrt(h);
        r1 = h * r1;
        r2 = h * r2;
      }

      var sign;

      if (largeArcFlag === sweepFlag) {
        sign = -1;
      }
      else {
        sign = 1;
      }

      var r1Pow = r1 * r1;
      var r2Pow = r2 * r2;

      var left = r1Pow * r2Pow - r1Pow * y * y - r2Pow * x * x;
      var right = r1Pow * y * y + r2Pow * x * x;

      var k = sign * Math.sqrt(Math.abs(left/right));

      cx = k * r1 * y / r2 + (x1 + x2) / 2;
      cy = k * -r2 * x / r1 + (y1 + y2) / 2;

      f1 = Math.asin(parseFloat(((y1 - cy) / r2).toFixed(9)));
      f2 = Math.asin(parseFloat(((y2 - cy) / r2).toFixed(9)));

      if (x1 < cx) {
        f1 = Math.PI - f1;
      }
      if (x2 < cx) {
        f2 = Math.PI - f2;
      }

      if (f1 < 0) {
        f1 = Math.PI * 2 + f1;
      }
      if (f2 < 0) {
        f2 = Math.PI * 2 + f2;
      }

      if (sweepFlag && f1 > f2) {
        f1 = f1 - Math.PI * 2;
      }
      if (!sweepFlag && f2 > f1) {
        f2 = f2 - Math.PI * 2;
      }
    }

    var df = f2 - f1;

    if (Math.abs(df) > (Math.PI * 120 / 180)) {
      var f2old = f2;
      var x2old = x2;
      var y2old = y2;

      if (sweepFlag && f2 > f1) {
        f2 = f1 + (Math.PI * 120 / 180) * (1);
      }
      else {
        f2 = f1 + (Math.PI * 120 / 180) * (-1);
      }

      x2 = cx + r1 * Math.cos(f2);
      y2 = cy + r2 * Math.sin(f2);
      params = arcToCubicCurves(x2, y2, x2old, y2old, r1, r2, angle, 0, sweepFlag, [f2, f2old, cx, cy]);
    }

    df = f2 - f1;

    var c1 = Math.cos(f1);
    var s1 = Math.sin(f1);
    var c2 = Math.cos(f2);
    var s2 = Math.sin(f2);
    var t = Math.tan(df / 4);
    var hx = 4 / 3 * r1 * t;
    var hy = 4 / 3 * r2 * t;

    var m1 = [x1, y1];
    var m2 = [x1 + hx * s1, y1 - hy * c1];
    var m3 = [x2 + hx * s2, y2 - hy * c2];
    var m4 = [x2, y2];

    m2[0] = 2 * m1[0] - m2[0];
    m2[1] = 2 * m1[1] - m2[1];

    if (_recursive) {
      return [m2, m3, m4].concat(params);
    }
    else {
      params = [m2, m3, m4].concat(params);

      var curves = [];

      for (var i = 0; i < params.length; i+=3) {
        var r1 = rotate(params[i][0], params[i][1], angleRad);
        var r2 = rotate(params[i+1][0], params[i+1][1], angleRad);
        var r3 = rotate(params[i+2][0], params[i+2][1], angleRad);
        curves.push([r1.x, r1.y, r2.x, r2.y, r3.x, r3.y]);
      }

      return curves;
    }
  };
  
  function* eachPathSegmentAbsolute(src) {
    if (typeof src === 'string') src = eachPathSegment(src);
    
    var currentX = null;
    var currentY = null;

    var subpathX = null;
    var subpathY = null;

    for (var seg of src) {
      var type = seg.type;

      if (type === "M") {
        var x = seg.values[0];
        var y = seg.values[1];

        yield {type: "M", values: [x, y]};

        subpathX = x;
        subpathY = y;

        currentX = x;
        currentY = y;
      }

      else if (type === "m") {
        var x = currentX + seg.values[0];
        var y = currentY + seg.values[1];

        yield {type: "M", values: [x, y]};

        subpathX = x;
        subpathY = y;

        currentX = x;
        currentY = y;
      }

      else if (type === "L") {
        var x = seg.values[0];
        var y = seg.values[1];

        yield {type: "L", values: [x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "l") {
        var x = currentX + seg.values[0];
        var y = currentY + seg.values[1];

        yield {type: "L", values: [x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "C") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x2 = seg.values[2];
        var y2 = seg.values[3];
        var x = seg.values[4];
        var y = seg.values[5];

        yield {type: "C", values: [x1, y1, x2, y2, x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "c") {
        var x1 = currentX + seg.values[0];
        var y1 = currentY + seg.values[1];
        var x2 = currentX + seg.values[2];
        var y2 = currentY + seg.values[3];
        var x = currentX + seg.values[4];
        var y = currentY + seg.values[5];

        yield {type: "C", values: [x1, y1, x2, y2, x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "Q") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        yield {type: "Q", values: [x1, y1, x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "q") {
        var x1 = currentX + seg.values[0];
        var y1 = currentY + seg.values[1];
        var x = currentX + seg.values[2];
        var y = currentY + seg.values[3];

        yield {type: "Q", values: [x1, y1, x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "A") {
        var x = seg.values[5];
        var y = seg.values[6];

        yield {
          type: "A",
          values: [seg.values[0], seg.values[1], seg.values[2], seg.values[3], seg.values[4], x, y]
        };

        currentX = x;
        currentY = y;
      }

      else if (type === "a") {
        var x = currentX + seg.values[5];
        var y = currentY + seg.values[6];

        yield {
          type: "A",
          values: [seg.values[0], seg.values[1], seg.values[2], seg.values[3], seg.values[4], x, y]
        };

        currentX = x;
        currentY = y;
      }

      else if (type === "H") {
        var x = seg.values[0];
        yield {type: "H", values: [x]};
        currentX = x;
      }

      else if (type === "h") {
        var x = currentX + seg.values[0];
        yield {type: "H", values: [x]};
        currentX = x;
      }

      else if (type === "V") {
        var y = seg.values[0];
        yield {type: "V", values: [y]};
        currentY = y;
      }

      else if (type === "v") {
        var y = currentY + seg.values[0];
        yield {type: "V", values: [y]};
        currentY = y;
      }

      else if (type === "S") {
        var x2 = seg.values[0];
        var y2 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        yield {type: "S", values: [x2, y2, x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "s") {
        var x2 = currentX + seg.values[0];
        var y2 = currentY + seg.values[1];
        var x = currentX + seg.values[2];
        var y = currentY + seg.values[3];

        yield {type: "S", values: [x2, y2, x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "T") {
        var x = seg.values[0];
        var y = seg.values[1]

        yield {type: "T", values: [x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "t") {
        var x = currentX + seg.values[0];
        var y = currentY + seg.values[1]

        yield {type: "T", values: [x, y]};

        currentX = x;
        currentY = y;
      }

      else if (type === "Z" || type === "z") {
        yield {type: "Z", values: []};

        currentX = subpathX;
        currentY = subpathY;
      }
    }
  }
  
  function absolutizePathData(pathData) {
    var absolutizedPathData = [];

    var currentX = null;
    var currentY = null;

    var subpathX = null;
    var subpathY = null;

    pathData.forEach(function(seg) {
      var type = seg.type;

      if (type === "M") {
        var x = seg.values[0];
        var y = seg.values[1];

        absolutizedPathData.push({type: "M", values: [x, y]});

        subpathX = x;
        subpathY = y;

        currentX = x;
        currentY = y;
      }

      else if (type === "m") {
        var x = currentX + seg.values[0];
        var y = currentY + seg.values[1];

        absolutizedPathData.push({type: "M", values: [x, y]});

        subpathX = x;
        subpathY = y;

        currentX = x;
        currentY = y;
      }

      else if (type === "L") {
        var x = seg.values[0];
        var y = seg.values[1];

        absolutizedPathData.push({type: "L", values: [x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "l") {
        var x = currentX + seg.values[0];
        var y = currentY + seg.values[1];

        absolutizedPathData.push({type: "L", values: [x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "C") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x2 = seg.values[2];
        var y2 = seg.values[3];
        var x = seg.values[4];
        var y = seg.values[5];

        absolutizedPathData.push({type: "C", values: [x1, y1, x2, y2, x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "c") {
        var x1 = currentX + seg.values[0];
        var y1 = currentY + seg.values[1];
        var x2 = currentX + seg.values[2];
        var y2 = currentY + seg.values[3];
        var x = currentX + seg.values[4];
        var y = currentY + seg.values[5];

        absolutizedPathData.push({type: "C", values: [x1, y1, x2, y2, x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "Q") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        absolutizedPathData.push({type: "Q", values: [x1, y1, x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "q") {
        var x1 = currentX + seg.values[0];
        var y1 = currentY + seg.values[1];
        var x = currentX + seg.values[2];
        var y = currentY + seg.values[3];

        absolutizedPathData.push({type: "Q", values: [x1, y1, x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "A") {
        var x = seg.values[5];
        var y = seg.values[6];

        absolutizedPathData.push({
          type: "A",
          values: [seg.values[0], seg.values[1], seg.values[2], seg.values[3], seg.values[4], x, y]
        });

        currentX = x;
        currentY = y;
      }

      else if (type === "a") {
        var x = currentX + seg.values[5];
        var y = currentY + seg.values[6];

        absolutizedPathData.push({
          type: "A",
          values: [seg.values[0], seg.values[1], seg.values[2], seg.values[3], seg.values[4], x, y]
        });

        currentX = x;
        currentY = y;
      }

      else if (type === "H") {
        var x = seg.values[0];
        absolutizedPathData.push({type: "H", values: [x]});
        currentX = x;
      }

      else if (type === "h") {
        var x = currentX + seg.values[0];
        absolutizedPathData.push({type: "H", values: [x]});
        currentX = x;
      }

      else if (type === "V") {
        var y = seg.values[0];
        absolutizedPathData.push({type: "V", values: [y]});
        currentY = y;
      }

      else if (type === "v") {
        var y = currentY + seg.values[0];
        absolutizedPathData.push({type: "V", values: [y]});
        currentY = y;
      }

      else if (type === "S") {
        var x2 = seg.values[0];
        var y2 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        absolutizedPathData.push({type: "S", values: [x2, y2, x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "s") {
        var x2 = currentX + seg.values[0];
        var y2 = currentY + seg.values[1];
        var x = currentX + seg.values[2];
        var y = currentY + seg.values[3];

        absolutizedPathData.push({type: "S", values: [x2, y2, x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "T") {
        var x = seg.values[0];
        var y = seg.values[1]

        absolutizedPathData.push({type: "T", values: [x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "t") {
        var x = currentX + seg.values[0];
        var y = currentY + seg.values[1]

        absolutizedPathData.push({type: "T", values: [x, y]});

        currentX = x;
        currentY = y;
      }

      else if (type === "Z" || type === "z") {
        absolutizedPathData.push({type: "Z", values: []});

        currentX = subpathX;
        currentY = subpathY;
      }
    });

    return absolutizedPathData;
  }
  
  function* eachPathSegmentReduced(src) {
    if (typeof src === 'string') src = eachPathSegment(src);
    
    var lastType = null;

    var lastControlX = null;
    var lastControlY = null;

    var currentX = null;
    var currentY = null;

    var subpathX = null;
    var subpathY = null;
    
    for (var seg of src) {
      if (seg.type === "M") {
        var x = seg.values[0];
        var y = seg.values[1];

        yield {type: "M", values: [x, y]};

        subpathX = x;
        subpathY = y;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "C") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x2 = seg.values[2];
        var y2 = seg.values[3];
        var x = seg.values[4];
        var y = seg.values[5];

        yield {type: "C", values: [x1, y1, x2, y2, x, y]};

        lastControlX = x2;
        lastControlY = y2;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "L") {
        var x = seg.values[0];
        var y = seg.values[1];

        yield {type: "L", values: [x, y]};

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "H") {
        var x = seg.values[0];

        yield {type: "L", values: [x, currentY]};

        currentX = x;
      }

      else if (seg.type === "V") {
        var y = seg.values[0];

        yield {type: "L", values: [currentX, y]};

        currentY = y;
      }

      else if (seg.type === "S") {
        var x2 = seg.values[0];
        var y2 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        var cx1, cy1;

        if (lastType === "C" || lastType === "S") {
          cx1 = currentX + (currentX - lastControlX);
          cy1 = currentY + (currentY - lastControlY);
        }
        else {
          cx1 = currentX;
          cy1 = currentY;
        }

        yield {type: "C", values: [cx1, cy1, x2, y2, x, y]};

        lastControlX = x2;
        lastControlY = y2;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "T") {
        var x = seg.values[0];
        var y = seg.values[1];

        var x1, y1;

        if (lastType === "Q" || lastType === "T") {
          x1 = currentX + (currentX - lastControlX);
          y1 = currentY + (currentY - lastControlY);
        }
        else {
          x1 = currentX;
          y1 = currentY;
        }

        var cx1 = currentX + 2 * (x1 - currentX) / 3;
        var cy1 = currentY + 2 * (y1 - currentY) / 3;
        var cx2 = x + 2 * (x1 - x) / 3;
        var cy2 = y + 2 * (y1 - y) / 3;

        yield {type: "C", values: [cx1, cy1, cx2, cy2, x, y]};

        lastControlX = x1;
        lastControlY = y1;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "Q") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        var cx1 = currentX + 2 * (x1 - currentX) / 3;
        var cy1 = currentY + 2 * (y1 - currentY) / 3;
        var cx2 = x + 2 * (x1 - x) / 3;
        var cy2 = y + 2 * (y1 - y) / 3;

        yield {type: "C", values: [cx1, cy1, cx2, cy2, x, y]};

        lastControlX = x1;
        lastControlY = y1;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "A") {
        var r1 = Math.abs(seg.values[0]);
        var r2 = Math.abs(seg.values[1]);
        var angle = seg.values[2];
        var largeArcFlag = seg.values[3];
        var sweepFlag = seg.values[4];
        var x = seg.values[5];
        var y = seg.values[6];

        if (r1 === 0 || r2 === 0) {
          yield {type: "C", values: [currentX, currentY, x, y, x, y]};

          currentX = x;
          currentY = y;
        }
        else {
          if (currentX !== x || currentY !== y) {
            var curves = arcToCubicCurves(currentX, currentY, x, y, r1, r2, angle, largeArcFlag, sweepFlag);
            
            for (var curve of curves) {
              yield {type:'C', values:curve};
            }

            currentX = x;
            currentY = y;
          }
        }
      }

      else if (seg.type === "Z") {
        yield seg;

        currentX = subpathX;
        currentY = subpathY;
      }

      lastType = seg.type;
    }
  }

  function reducePathData(pathData) {
    var reducedPathData = [];
    var lastType = null;

    var lastControlX = null;
    var lastControlY = null;

    var currentX = null;
    var currentY = null;

    var subpathX = null;
    var subpathY = null;

    pathData.forEach(function(seg) {
      if (seg.type === "M") {
        var x = seg.values[0];
        var y = seg.values[1];

        reducedPathData.push({type: "M", values: [x, y]});

        subpathX = x;
        subpathY = y;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "C") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x2 = seg.values[2];
        var y2 = seg.values[3];
        var x = seg.values[4];
        var y = seg.values[5];

        reducedPathData.push({type: "C", values: [x1, y1, x2, y2, x, y]});

        lastControlX = x2;
        lastControlY = y2;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "L") {
        var x = seg.values[0];
        var y = seg.values[1];

        reducedPathData.push({type: "L", values: [x, y]});

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "H") {
        var x = seg.values[0];

        reducedPathData.push({type: "L", values: [x, currentY]});

        currentX = x;
      }

      else if (seg.type === "V") {
        var y = seg.values[0];

        reducedPathData.push({type: "L", values: [currentX, y]});

        currentY = y;
      }

      else if (seg.type === "S") {
        var x2 = seg.values[0];
        var y2 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        var cx1, cy1;

        if (lastType === "C" || lastType === "S") {
          cx1 = currentX + (currentX - lastControlX);
          cy1 = currentY + (currentY - lastControlY);
        }
        else {
          cx1 = currentX;
          cy1 = currentY;
        }

        reducedPathData.push({type: "C", values: [cx1, cy1, x2, y2, x, y]});

        lastControlX = x2;
        lastControlY = y2;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "T") {
        var x = seg.values[0];
        var y = seg.values[1];

        var x1, y1;

        if (lastType === "Q" || lastType === "T") {
          x1 = currentX + (currentX - lastControlX);
          y1 = currentY + (currentY - lastControlY);
        }
        else {
          x1 = currentX;
          y1 = currentY;
        }

        var cx1 = currentX + 2 * (x1 - currentX) / 3;
        var cy1 = currentY + 2 * (y1 - currentY) / 3;
        var cx2 = x + 2 * (x1 - x) / 3;
        var cy2 = y + 2 * (y1 - y) / 3;

        reducedPathData.push({type: "C", values: [cx1, cy1, cx2, cy2, x, y]});

        lastControlX = x1;
        lastControlY = y1;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "Q") {
        var x1 = seg.values[0];
        var y1 = seg.values[1];
        var x = seg.values[2];
        var y = seg.values[3];

        var cx1 = currentX + 2 * (x1 - currentX) / 3;
        var cy1 = currentY + 2 * (y1 - currentY) / 3;
        var cx2 = x + 2 * (x1 - x) / 3;
        var cy2 = y + 2 * (y1 - y) / 3;

        reducedPathData.push({type: "C", values: [cx1, cy1, cx2, cy2, x, y]});

        lastControlX = x1;
        lastControlY = y1;

        currentX = x;
        currentY = y;
      }

      else if (seg.type === "A") {
        var r1 = Math.abs(seg.values[0]);
        var r2 = Math.abs(seg.values[1]);
        var angle = seg.values[2];
        var largeArcFlag = seg.values[3];
        var sweepFlag = seg.values[4];
        var x = seg.values[5];
        var y = seg.values[6];

        if (r1 === 0 || r2 === 0) {
          reducedPathData.push({type: "C", values: [currentX, currentY, x, y, x, y]});

          currentX = x;
          currentY = y;
        }
        else {
          if (currentX !== x || currentY !== y) {
            var curves = arcToCubicCurves(currentX, currentY, x, y, r1, r2, angle, largeArcFlag, sweepFlag);

            curves.forEach( function(curve) {
              reducedPathData.push({type: "C", values: curve});
            });

            currentX = x;
            currentY = y;
          }
        }
      }

      else if (seg.type === "Z") {
        reducedPathData.push(seg);

        currentX = subpathX;
        currentY = subpathY;
      }

      lastType = seg.type;
    });

    return reducedPathData;
  }
  
  const curve_recursion_limit = 32;
  const curve_collinearity_epsilon = 1e-30;
  const m_angle_tolerance = 10*Math.PI/180.0;
  const curve_angle_tolerance_epsilon = 0.01;
  const m_distance_tolerance = 0.5;
  const m_cusp_limit = 0.0;

  function linearizePathData(pathData) {
    var result = [];
    var lastPoint = [0, 0];

    function recursive_bezier(x1,y1, x2,y2, x3,y3, x4,y4, level) {
      if (level > curve_recursion_limit) return;

      var x12   = (x1 + x2) / 2;
      var y12   = (y1 + y2) / 2;
      var x23   = (x2 + x3) / 2;
      var y23   = (y2 + y3) / 2;
      var x34   = (x3 + x4) / 2;
      var y34   = (y3 + y4) / 2;
      var x123  = (x12 + x23) / 2;
      var y123  = (y12 + y23) / 2;
      var x234  = (x23 + x34) / 2;
      var y234  = (y23 + y34) / 2;
      var x1234 = (x123 + x234) / 2;
      var y1234 = (y123 + y234) / 2;

      if (level > 0) {
        var dx = x4-x1;
        var dy = y4-y1;

        var d2 = Math.abs(((x2 - x4) * dy - (y2 - y4) * dx));
        var d3 = Math.abs(((x3 - x4) * dy - (y3 - y4) * dx));

        var da1, da2;

        if (d2 > curve_collinearity_epsilon && d3 > curve_collinearity_epsilon) {
          if ((d2 + d3)*(d2 + d3) <= m_distance_tolerance * (dx*dx + dy*dy)) {
            if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
              result.push({type:'L', values:[x1234, y1234]});
              return;
            }

            var a23 = Math.atan2(y3 - y2, x3 - x2);
            da1 = Math.abs(a23 - Math.atan2(y2 - y1, x2 - x1));
            da2 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - a23);
            if (da1 >= Math.PI) da1 = 2*Math.PI - da1;
            if (da2 >= Math.PI) da2 = 2*Math.PI - da2;

            if (da1 + da2 < m_angle_tolerance) {
              result.push({type:'L', values:[x1234, y1234]});
              return;
            }

            if (m_cusp_limit != 0.0) {
              if (da1 > m_cusp_limit) {
                result.push({type:'L', values:[x2, y2]});
                return;
              }

              if (da2 > m_cusp_limit) {
                result.push({type:'L', values:[x3, y3]});
                return;
              }
            }
          }
        }
        else {
          if (d2 > curve_collinearity_epsilon) {
            if (d2 * d2 <= m_distance_tolerance * (dx*dx + dy*dy)) {
              if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
                result.push({type:'L', values:[x1234, y1234]});
                return;
              }

              da1 = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1));
              if (da1 >= Math.PI) da1 = 2*Math.PI - da1;

              if (da1 < m_angle_tolerance) {
                result.push(
                  {type:'L', values:[x2, y2]},
                  {type:'L', values:[x3, y3]});
                return;
              }

              if (m_cusp_limit != 0.0) {
                if (da1 > m_cusp_limit) {
                  result.push({type:'L', values:[x2, y2]});
                  return;
                }
              }
            }
          }
          else if (d3 > curve_collinearity_epsilon) {
            if (d3 * d3 <= m_distance_tolerance * (dx*dx + dy*dy)) {
              if (m_angle_tolerance < curve_angle_tolerance_epsilon) {
                result.push({type:'L', values:[x1234, y1234]});
                return;
              }

              da1 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y3 - y2, x3 - x2));
              if (da1 >= Math.PI) da1 = 2*Math.PI - da1;

              if (da1 < m_angle_tolerance) {
                result.push(
                  {type:'L', values:[x2, y2]},
                  {type:'L', values:[x3, y3]});
                return;
              }

              if (m_cusp_limit != 0.0) {
                if (da1 > m_cusp_limit) {
                  result.push({type:'L', values:[x3, y3]});
                  return;
                }
              }
            }
          }
          else {
            // Collinear case
            dx = x1234 - (x1 + x4) / 2;
            dy = y1234 - (y1 + y4) / 2;
            if (dx*dx + dy*dy <= m_distance_tolerance) {
              result.push({type:'L', values:[x1234, y1234]});
              return;
            }
          }
        }
      }

      recursive_bezier(x1, y1, x12, y12, x123, y123, x1234, y1234, level + 1); 
      recursive_bezier(x1234, y1234, x234, y234, x34, y34, x4, y4, level + 1); 
    }
    for (var i = 0; i < pathData.length; i++) {
      if (pathData[i].type === 'C') {
        var c = pathData[i].values;
        recursive_bezier(lastPoint[0], lastPoint[1], c[0], c[1], c[2], c[3], c[4], c[5], 0);
        lastPoint = c.slice(-2);
        result.push({type:'L', values:lastPoint});
      }
      else {
        result.push(pathData[i]);
        lastPoint = pathData[i].values.slice(-2);
      }
    }
    return result;
  }

  return {
    parse: parsePathDataString,
    absolutize: absolutizePathData,
    reduce: reducePathData,
    linearize: linearizePathData,
  };

});
