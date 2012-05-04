var initDashing = function(ctx) {
  if (!ctx.dashLine) {

    ctx.dashedLine = function(x1,y1,x2,y2) {

      var dashStyle = GraphPad.dashedLineOptions.lineDashPattern,
      dashCount = dashStyle.length,
      sign = x2>=x1 ? 1 : -1,
      ysign = y2>=y1 ? 1 : -1, 
      dx = x2-x1,
      dy = y2-y1,
      m = dy/dx,
      xsteps = dashStyle.map(function(len){return sign*Math.sqrt((len*len)/(1 + (m*m)));}),
      dRem =  Math.sqrt( dx*dx + dy*dy ),
      dIndex=0,
      draw=true;
      
      this.moveTo(x1,y1) ;

      while (dRem>=0.1){
        var dLen = dashStyle[dIndex],
        xStep = xsteps[dIndex];

        if (dLen > dRem) {
          xStep =  Math.sqrt(dRem*dRem/(1+m*m));
        }

        var tmp = m*xStep; 
        x1 += xStep ;
        y1 += isNaN(tmp) ? ysign*dLen : tmp;

        this[draw ? 'lineTo' : 'moveTo'](x1,y1);

        dRem -= dLen;
        draw = !draw;

        dIndex = (dIndex+1) % dashCount ;
      }
    };
  }
};


initDashing(window.CanvasRenderingContext2D.prototype);

var initDashBezier = function(ctx) {
  if (!ctx.dashedBezier) {
    //just figure out the coordinates of all the points in each dash, don't draw.
    //returns an array of arrays, each sub-array will have an even number of nu-
    //merical elements, to wit, x and y pairs.

    //Argument dashPattern should be an array of alternating dash and space
    //lengths, e.g., [10, 10] would be dots, [30, 10] would be dashes,
    //[30, 10, 10, 10] would be 30-length dash, 10-length spaces, 10-length dash
    // and 10-length space.
    ctx.calculateDashedBezier = function(controlPoints, dashPattern) {
      function bezier(controlPoints, percent) {

        function B1(t) { return t*t*t; }
        function B2(t) { return 3*t*t*(1-t); }
        function B3(t) { return 3*t*(1-t)*(1-t); }
        function B4(t) { return (1-t)*(1-t)*(1-t); }

        var c0 = controlPoints[0];
        var c1 = controlPoints[1];
        var c2 = controlPoints[2];
        var c3 = controlPoints[3];

        var x = c0[0]*B1(percent) +
          c1[0]*B2(percent) +
          c2[0]*B3(percent) +
          c3[0]*B4(percent);
        var y = c0[1]*B1(percent) +
          c1[1]*B2(percent) +
          c2[1]*B3(percent) +
          c3[1]*B4(percent);
        //console.log("result: ", x, y);
        return [x, y];
      }

      var step = 0.001; //this really should be set by an intelligent method,
                        //rather than using a constant, but it serves as an
                        //example.

      //possibly gratuitous helper functions
      var delta = function(p0, p1) {
        return [p1[0] - p0[0], p1[1] - p0[1]];
      };
      var arcLength = function(p0, p1) {
        var d = delta(p0, p1);
        return Math.sqrt(d[0]*d[0] + d[1] * d[1]);
      };

      var subPaths = [];
      var loc = bezier(controlPoints, 0);
      var lastLoc = loc;

      var dashIndex = 0;
      var length = 0;
      var thisPath = [];
      for(var t = step; t <= 1; t += step) {
        loc = bezier(controlPoints, t);
        length += arcLength(lastLoc, loc);
        lastLoc = loc;

        //detect when we come to the end of a dash or space
        if(length >= dashPattern[dashIndex]) {

          //if we are on a dash, we need to record the path.
          if(dashIndex % 2 === 0)
            subPaths.push(thisPath);

          //go to the next dash or space in the pattern
          dashIndex = (dashIndex + 1) % dashPattern.length;

          //clear the arclength and path.
          thisPath = [];
          length = 0;
        }

        //if we are on a dash and not a space, add a point to the path.
        if(dashIndex % 2 === 0) {
          thisPath.push(loc[0], loc[1]);
        }
      }
      if(thisPath.length > 0)
        subPaths.push(thisPath);
      return subPaths;
    };

    //take output of the previous function and build an appropriate path
    ctx.pathParts = function(parts) {
      //console.log("Path parts!!!", parts);
      for(var i = 0; i < parts.length; i++) {
        var part = parts[i];

        if(part.length > 0){
          this.moveTo(part[0], part[1]);
        }

        //console.log("doing linetos: ", part);
        for(var j = 1; j < part.length / 2; j++) {
          // this.dotAt(part[2*j], part[2*j+1], "red");
          this.lineTo(part[2*j], part[2*j+1]);
        }
      }
    };

    //combine the above two functions to actually draw a dashed curve.
    ctx.dashedBezier = function(controlPoints, dashPattern) {
      var dashes = this.calculateDashedBezier(controlPoints, dashPattern);
      this.lineWidth = JXG.Options.circle.lineWidth;
      this.pathParts(dashes);
      this.stroke();
    };

    ctx.dotAt = function(x, y, color) {
      var oldStyle = this.fillStyle;
      this.fillStyle = color;
      this.beginPath();
      this.arc(x, y, 5, 0, Math.PI*2);
      this.closePath();
      this.fill();
      this.fillStyle = oldStyle;
    };

   }
};

initDashBezier(window.CanvasRenderingContext2D.prototype);
