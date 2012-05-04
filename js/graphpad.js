(function() {
  var _base,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  window.GraphPad || (window.GraphPad = {});

  (_base = window.GraphPad).Actions || (_base.Actions = {});

  GraphPad.Actions.Action = (function() {

    function Action(pad) {
      this.pad = pad;
      this.eventPoint = undefined;
      this.mousedown = false;
    }

    Action.prototype.getMouseCoords = function(e) {
      var absPos, cPos, dx, dy, em, i;
      if (!document.all) {
        em = document.createEvent('MouseEvents');
        i = 0;
      }
      cPos = this.pad.board.getCoordsTopLeftCorner(e);
      absPos = JXG.getPosition(e);
      
      dx = absPos[0] - cPos[0];
      dy = absPos[1] - cPos[1];
      return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], this.pad.board);
    };

    Action.prototype.mouseCoordsOffBoard = function(coords) {
      var boardHeight, boardWidth;
      if (!coords) return false;
      boardHeight = this.pad.board.canvasHeight;
      boardWidth = this.pad.board.canvasWidth;
      if (coords.scrCoords[1] > boardWidth || coords.scrCoords[2] > boardHeight) {
        return true;
      }
      return coords.scrCoords[1] < 0 || coords.scrCoords[2] < 0;
    };
    
    Action.prototype.onMouseDown = function(e){
      this.mousedown = true;
    };

    Action.prototype.onMouseMove = function(e, m) {
    };

    Action.prototype.onMouseUp = function(e) {
      if ( !this.mousedown ) return;
      this.mousedown = false;
      var coords = this.getMouseCoords(e);
      if (this.mouseCoordsOffBoard(coords)) return;
      this.coords     = coords;
      this.eventPoint = coords.usrCoords.slice(1);
      this.up(e);
      return;
    };

    Action.prototype.onTouch = function(e) {};

    Action.prototype.clickedOnObject = function(clickCoords, obj) {
      var onOrigin;
      onOrigin = (obj.plaintext === '0,0') || (obj.elType === 'text') || (obj.type === JXG.OBJECT_TYPE_TICKS) || (obj.elType === 'axis') || (_.any(obj.childElements, function(child) {
        return child.elType === 'axis';
      }));
      return obj.hasPoint(clickCoords.scrCoords[1], clickCoords.scrCoords[2]) && !onOrigin;
    };

    Action.prototype.toggleOpenEndpoint = function(point) {
      if (this.pad.isPointOpen(point)) {
        return this.pad.closePoint(point);
      } else {
        return this.pad.openPoint(point);
      }
    };

    return Action;

  })();

  GraphPad.Actions.SelectionAction = (function(_super) {

    __extends(SelectionAction, _super);

    function SelectionAction() {
      SelectionAction.__super__.constructor.apply(this, arguments);
    }

    SelectionAction.prototype.selectTouchedObjects = function(e) {
      var plottedObjects, selected, selectedObjects, touched;
      selectedObjects = this.pad.board.getAllObjectsUnderMouse(e);
      plottedObjects = this.pad.state.all();
      selected = _.find(selectedObjects, function(object) {
        return _.include(plottedObjects, object);
      });
      touched = _.find(this.pad.board.touches, function(object) {
        return _.include(plottedObjects, object);
      });
      this.pad.deselectAllObjects();
      if (touched != null) this.pad.selectObject(touched);
      if (selected != null) return this.pad.selectObject(selected);
    };

    SelectionAction.prototype.onMouseDown = function(e, coords) {
      this.mousedown = false;
      if (this.mouseCoordsOffBoard(coords)) return;
      this.mousedown = true;
      return this.selectTouchedObjects(e);
    };

    SelectionAction.prototype.onMouseMove = function(e, m) {
      if (this.mouseCoordsOffBoard(this.getMouseCoords(e))) return;
      if (this.mousedown) return this.dragging = true;
    };

    SelectionAction.prototype.onMouseUp = function(e) {
      var coords, toggleClickedEndpoints,
        _this = this;
      this.mousedown = false;
      if (this.dragging) return (this.dragging = false);
      coords = this.getMouseCoords(e);
      if (this.mouseCoordsOffBoard(coords)) return;
      toggleClickedEndpoints = function(object) {
        if (_this.clickedOnObject(coords, object.point1)) {
          return _this.toggleOpenEndpoint(object.point1);
        } else if (_this.clickedOnObject(coords, object.point2)) {
          if (object.visProp.straightlast) return;
          return _this.toggleOpenEndpoint(object.point2);
        }
      };
      _.each(this.pad.state.segments(), toggleClickedEndpoints);
      return _.each(this.pad.state.rays(), toggleClickedEndpoints);
    };

    return SelectionAction;

  })(GraphPad.Actions.Action);

  GraphPad.Actions.PointAction = (function(_super) {

    __extends(PointAction, _super);

    function PointAction() {
      PointAction.__super__.constructor.apply(this, arguments);
    }

    PointAction.prototype.up = function(e) {
      var point;
      if (this.eventPoint) {
        point = this.pad.createPoint(this.eventPoint, null, true);
      }
      return this.pad.ui.buildAndAppendNewLayer(point, "Point");
    };

    return PointAction;

  })(GraphPad.Actions.Action);

  GraphPad.Actions.FloodFillAction = (function(_super) {

    __extends(FloodFillAction, _super);

    function FloodFillAction() {
      FloodFillAction.__super__.constructor.apply(this, arguments);
    }

    FloodFillAction.prototype.up = function(e) {
      return this.pad.toggleFloodFill(this.coords);
    };

    return FloodFillAction;

  })(GraphPad.Actions.Action);

  GraphPad.Actions.LineAction = (function(_super) {

    __extends(LineAction, _super);

    function LineAction() {
      LineAction.__super__.constructor.apply(this, arguments);
    }

    LineAction.prototype.up = function(e) {
      var _ref;
      if (this.eventPoint) this.pad.actionPoints.push(this.pad.createPoint(this.eventPoint));
      if (((_ref = this.pad.actionPoints) != null ? _ref.length : void 0) === 2) {
        this.drawLine(this.pad.actionPoints[0], this.pad.actionPoints[1]);
        this.pad.actionPoints = [];
        return this.pad.chooseTool('selection');
      }
    };

    LineAction.prototype.drawLine = function(point1, point2) {
      var line;
      line = this.pad.createLine(this.pad.actionPoints[0], this.pad.actionPoints[1]);
      return this.pad.ui.buildAndAppendNewLayer(line, "Line");
    };

    return LineAction;

  })(GraphPad.Actions.Action);

  GraphPad.Actions.RayAction = (function(_super) {

    __extends(RayAction, _super);

    function RayAction() {
      RayAction.__super__.constructor.apply(this, arguments);
    }

    RayAction.prototype.up = function(e) {
      RayAction.__super__.up.call(this, e);
    };

    RayAction.prototype.drawLine = function(point1, point2) {
      var ray;
      ray = this.pad.createRay(this.pad.actionPoints[0], this.pad.actionPoints[1]);
      return this.pad.ui.buildAndAppendNewLayer(ray, "Ray");
    };

    return RayAction;

  })(GraphPad.Actions.LineAction);

  GraphPad.Actions.SegmentAction = (function(_super) {

    __extends(SegmentAction, _super);

    function SegmentAction() {
      SegmentAction.__super__.constructor.apply(this, arguments);
    }

    SegmentAction.prototype.up = function(e) {
      SegmentAction.__super__.up.call(this, e);
    };

    SegmentAction.prototype.drawLine = function(point1, point2) {
      var segment;
      segment = this.pad.createSegment(this.pad.actionPoints[0], this.pad.actionPoints[1]);
      return this.pad.ui.buildAndAppendNewLayer(segment, "Segment");
    };

    return SegmentAction;

  })(GraphPad.Actions.LineAction);

  GraphPad.Actions.CircleAction = (function(_super) {

    __extends(CircleAction, _super);

    function CircleAction() {
      CircleAction.__super__.constructor.apply(this, arguments);
    }

    CircleAction.prototype.drawLine = function(point1, point2) {
      var circle;
      circle = this.pad.createCircle(this.pad.actionPoints[0], this.pad.actionPoints[1]);
      return this.pad.ui.buildAndAppendNewLayer(circle, "Circle");
    };

    return CircleAction;

  })(GraphPad.Actions.LineAction);

  GraphPad.Actions.VerticalParabolaAction = (function(_super) {

    __extends(VerticalParabolaAction, _super);

    function VerticalParabolaAction() {
      VerticalParabolaAction.__super__.constructor.apply(this, arguments);
    }

    VerticalParabolaAction.prototype.up = function(e) {
      var verticalParabola, _ref;
      if (this.eventPoint) this.pad.actionPoints.push(this.pad.createPoint(this.eventPoint));
      if (((_ref = this.pad.actionPoints) != null ? _ref.length : void 0) === 2) {
        verticalParabola = this.pad.createVerticalParabola(this.pad.actionPoints[0], this.pad.actionPoints[1]);
        this.pad.ui.buildAndAppendNewLayer(verticalParabola, "Vertical Parabola");
        this.pad.actionPoints = [];
        return this.pad.chooseTool('selection');
      }
    };

    return VerticalParabolaAction;

  })(GraphPad.Actions.Action);

  GraphPad.Actions.HorizontalParabolaAction = (function(_super) {

    __extends(HorizontalParabolaAction, _super);

    function HorizontalParabolaAction() {
      HorizontalParabolaAction.__super__.constructor.apply(this, arguments);
    }

    HorizontalParabolaAction.prototype.up = function(e) {
      var horizontalParabola, _ref;
      if (this.eventPoint) this.pad.actionPoints.push(this.pad.createPoint(this.eventPoint));
      if (((_ref = this.pad.actionPoints) != null ? _ref.length : void 0) === 2) {
        horizontalParabola = this.pad.createHorizontalParabola(this.pad.actionPoints[0], this.pad.actionPoints[1]);
        this.pad.ui.buildAndAppendNewLayer(horizontalParabola, "Horizontal Parabola");
        this.pad.actionPoints = [];
        return this.pad.chooseTool('selection');
      }
    };

    return HorizontalParabolaAction;

  })(GraphPad.Actions.Action);

}).call(this);
JXG.createWAxis = function(board, parents, attributes) {
    var attr,
        el,
        dist;

    // Arrays oder Punkte, mehr brauchen wir nicht.
    if ( (JXG.isArray(parents[0]) || JXG.isPoint(parents[0]) ) && (JXG.isArray(parents[1]) || JXG.isPoint(parents[1])) ) {
        attr = JXG.copyAttributes(attributes, board.options, 'axis');
        el = board.create('line', parents, attr);
        el.elType = 'axis';
        el.type = JXG.OBJECT_TYPE_AXIS;
        el.isDraggable = false;
        el.point1.isDraggable = false;
        el.point2.isDraggable = false;

        for (var els in el.ancestors)
            el.ancestors[els].type = JXG.OBJECT_TYPE_AXISPOINT;

        attr = JXG.copyAttributes(attributes, board.options, 'axis', 'ticks');
        if (attr.visible) {
          if (JXG.exists(attr.ticksdistance)) {
              dist = attr.ticksdistance;
          } else if(JXG.isArray(attr.ticks)) {
              dist = attr.ticks;
          } else {
              dist = 1.0;
          }

          /**
          * The ticks attached to the axis.
          * @memberOf Axis.prototype
          * @name defaultTicks
          * @type JXG.Ticks
          */

          attr.minorheight = 0.01;
          attr.majorheight = 0.01;

          el.defaultTicks = board.create('ticks', [el, dist], attr);
          el.defaultTicks.dump = false;
          el.addChild(el.defaultTicks);

          el.subs = {
              ticks: el.defaultTicks
          };
        }
    }
    else
        throw new Error("JSXGraph: Can't create point with parent types '" +
                        (typeof parents[0]) + "' and '" + (typeof parents[1]) + "'." +
                        "\nPossible parent types: [point,point], [[x1,y1],[x2,y2]]");

    return el;
};

JXG.JSXGraph.registerElement('waxis', JXG.createWAxis);
/*
  Author: Oliver Steele
  Copyright: Copyright 2006 Oliver Steele.  All rights reserved.
  License: MIT License (Open Source)
  Homepage: http://osteele.com/sources/javascript/
  Docs: http://osteele.com/sources/javascript/docs/bezier
  Download: http://osteele.com/sources/javascript/bezier.js
  Example: http://osteele.com/sources/javascript/bezier-demo.html
  Created: 2006-02-20
  Modified: 2006-03-21

  +bezier.js+ is a library for measuring and subdividing arbitrary-order
  Bezier curves.

  Points are represented as <tt>{x: x, y: y}</tt>.

  == Usage
    var bezier = new Bezier[({x:0,y:0}, {x:50,y:50}, {x:100,y:25}]);
    bezier.draw(context);
    var order = bezier.order;
    var left = bezier.split()[0];
    var right = bezier.split()[1];
    var length = bezier.measureLength(bezier);
    var midpoint = bezier.atT(0.5);

  == Notes
  +Bezier+ aliases its argument and caches its metrics.  It won't work
  to modify a point within a +Bezier+; create a new +Bezier+ instead.

  == Related
  Also see {<tt>path.js</tt>}[http://osteele.com/sources/javascript/docs/path].
 */

// Construct an nth-order bezier, where n == points.length.
// This aliases its argument.
function Bezier(points) {
    this.points = points;
    this.order = points.length;
};

// Return the linear distance between two points.
function distance(p0, p1) {
    var dx = p1.x - p0.x;
    var dy = p1.y - p0.y;
    return Math.sqrt(dx*dx + dy*dy);
};

// Return the Schneider triangle of successive midpoints.
// The left and right edges are the points of the two
// Beziers that split this one at the midpoint.
Bezier.prototype._triangle = function () {
    var upper = this.points;
    var m = [upper];
    // fill the triangle
    for (var i = 1; i < this.order; i++) {
        var lower = [];
        for (var j = 0; j < this.order - i; j++) {
            var c0 = upper[j];
            var c1 = upper[j+1];
            lower[j] = {x: (c0.x + c1.x)/2,
                        y: (c0.y + c1.y)/2};
        }
        m.push(lower);
        upper = lower;
    }
    return (this._triangle = function () {return m})();
};

// Return two shorter-length beziers of the same order whose union is
// this curve and whose intersection is this curve's parametric
// midpoint.
Bezier.prototype.split = function () {
    var m = this._triangle();
    var left = new Array(this.order), right = new Array(this.order);
    for (var i = 0; i < this.order; i++) {
        left[i]  = m[i][0];
        right[i] = m[this.order-1-i][i];
    }
    return [new Bezier(left), new Bezier(right)];
};

// Return the parametric midpoint on t.  This isn't generally the
// length midpoint.
Bezier.prototype.midpointT = function () {
    return this.atT(.5);
};

// Return the coefficients of the polynomials for x and y in t.
Bezier.prototype.getCoefficients = function() {
	// This function deals with polynomials, represented as
	// arrays of coefficients.  p[i] is the coefficient of n^i.

	// p0, p1 => p0 + (p1 - p0) * n
	// side-effects (denormalizes) p0, for convienence
	function interpolate(p0, p1) {
		p0.push(0);
		var p = new Array(p0.length);
		p[0] = p0[0];
		for (var i = 0; i < p1.length; i++)
			p[i+1] = p0[i+1] + p1[i] - p0[i];
		return p;
	}
	// folds +interpolate+ across a graph whose fringe is
	// the polynomial elements of +ns+, and returns its TOP
	function collapse(ns) {
		while (ns.length > 1) {
			var ps = new Array(ns.length-1);
			for (var i = 0; i < ns.length-1; i++)
				ps[i] = interpolate(ns[i], ns[i+1]);
			ns = ps;
		}
		return ns[0];
	}
	// xps and yps are arrays of polynomials --- concretely realized
	// as arrays of arrays
	var xps = [];
	var yps = [];
	for (var i = 0, pt; pt = this.points[i++]; ) {
		xps.push([pt.x]);
		yps.push([pt.y]);
	}
	var result = {xs: collapse(xps), ys: collapse(yps)};
	return (this.getCoefficients = function() {return result})();
};

// Return the point at t along the path.  t is the parametric
// parameter; it's not a proportion of distance.  This method caches
// the coefficients for this particular curve as an optimization for
// repeated calls to atT.  This is good for a fourfold performance
// improvement in Firefox 1.5.
Bezier.prototype.atT = function(t) {
    var c = this.getCoefficients();
	var cx = c.xs, cy = c.ys;
	// evaluate cx[0] + cx[1]t +cx[2]t^2 ....

	// optimization: start from the end, to save one
	// muliplicate per order (we never need an explicit t^n)

	// optimization: special-case the last element
	// to save a multiply-add
	var x = cx[cx.length-1], y = cy[cy.length-1];

	for (var i = cx.length-1; --i >= 0; ) {
		x = x*t + cx[i];
		y = y*t + cy[i];
	}
	return {x: x, y: y}
};

// Return the length of the path.  This is an approximation to
// within +tolerance+, which defaults to 1.  (It actually stops
// subdividing when the length of the polyline is within +tolerance+
// of the length of the chord.)
Bezier.prototype.measureLength = function (tolerance) {
    if (arguments.length < 1) tolerance = 1;
    var sum = 0;
    var queue = [this];
    do {
        var b = queue.pop();
        var points = b.points;
        var chordlen = distance(points[0], points[this.order-1]);
        var polylen = 0;
        for (var i = 0; i < this.order-1; i++)
            polylen += distance(points[i], points[i+1]);
        if (polylen - chordlen <= tolerance)
            sum += polylen;
        else
            queue = queue.concat(b.split());
    } while (queue.length);
    return (this.measureLength = function () {return sum})();
};

// Render the Bezier to a WHATWG 2D canvas context.
Bezier.prototype.draw = function (ctx) {
	var pts = this.points;
	ctx.moveTo(pts[0].x, pts[0].y);
	var fn = Bezier.drawCommands[this.order];
	if (fn) {
		var coordinates = [];
		for (var i = pts.length ? 1 : 0; i < pts.length; i++) {
			coordinates.push(pts[i].x);
			coordinates.push(pts[i].y);
		}
		fn.apply(ctx, coordinates);
	} else
		console.log("don't know how to draw an order *" + this.order + " bezier");
};

// These use wrapper functions as a workaround for Safari.  As of
// Safari 2.0.3, fn.apply isn't defined on the context primitives.
Bezier.drawCommands = [
    // 0: will have errored aready on the moveTo
    null,
    // 1:
    // this will have an effect if there's a line thickness or end cap
    function(x,y) {this.lineTo(x,y)},
    // 2:
    function(x,y) {this.lineTo(x,y)},
    // 3:
    function(x1,y1,x2,y2) {this.quadraticCurveTo(x1,y1,x2,y2)},
    // 4:
    function(x1,y1,x2,y2,x3,y3) {this.bezierCurveTo(x1,y1,x2,y2,x3,y3)}
                       ];

(function() {
  var colorOfPoint, findAdjacentPoints, flood, floodFill, floodFillWithForeground;

  flood = function(width, height, coords, needsProcessing, process) {
    var location, spanLeft, spanRight, stack, startX, startY, x, y, y1, _results;
    startX = coords.scrCoords[1].toInt();
    startY = coords.scrCoords[2].toInt();
    stack = [];
    y1 = 0;
    spanLeft = false;
    spanRight = false;
    stack.push([startX, startY]);
    _results = [];
    while (stack.length > 0) {
      location = stack.pop();
      x = location[0];
      y = location[1];
      y1 = y;
      while (y1 >= 0 && needsProcessing(x, y1)) {
        y1--;
      }
      y1++;
      spanLeft = false;
      spanRight = false;
      _results.push((function() {
        var _results2;
        _results2 = [];
        while (y1 < height && needsProcessing(x, y1)) {
          process(x, y1);
          if (!spanLeft && x > 0 && needsProcessing(x - 1, y1)) {
            stack.push([x - 1, y1]);
            spanLeft = true;
          } else if (spanLeft && x > 0 && !needsProcessing(x - 1, y1)) {
            spanLeft = false;
          }
          if (!spanRight && x < (width - 1) && needsProcessing(x + 1, y1)) {
            stack.push([x + 1, y1]);
            spanRight = true;
          } else if (spanRight && x < (width - 1) && !needsProcessing(x + 1, y1)) {
            spanRight = false;
          }
          _results2.push(y1++);
        }
        return _results2;
      })());
    }
    return _results;
  };

  floodFill = function(canvas, coords, oldColor, newColor) {
    var context, height, image, isColor, needsProcessing, pixels, process, setColor, toIndex, width;
    context = canvas.getContext("2d");
    width = canvas.width;
    height = canvas.width;
    image = context.getImageData(0, 0, width, height);
    pixels = image.data;
    process = function(x, y) {
      return setColor(x, y, newColor);
    };
    toIndex = function(x, y) {
      return (y * width * 4) + (x * 4);
    };
    setColor = function(x, y, color) {
      var i;
      i = toIndex(x, y);
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      return pixels[i + 3] = color[3];
    };
    isColor = function(x, y, testColor) {
      var i;
      i = toIndex(x, y);
      return pixels[i] === testColor[0] && pixels[i + 1] === testColor[1] && pixels[i + 2] === testColor[2] && pixels[i + 3] === testColor[3];
    };
    needsProcessing = function(x, y) {
      return isColor(x, y, oldColor);
    };
    flood(width, height, coords, needsProcessing, process);
    return context.putImageData(image, 0, 0);
  };

  window.floodFill = floodFill;

  floodFillWithForeground = function(canvas, coords, foregroundColor, newColor) {
    var colorAt, context, height, image, isColor, needsProcessing, pixels, process, setColor, toIndex, width;
    context = canvas.getContext("2d");
    width = canvas.width;
    height = canvas.width;
    image = context.getImageData(0, 0, width, height);
    pixels = image.data;
    process = function(x, y) {
      return setColor(x, y, newColor);
    };
    toIndex = function(x, y) {
      return (y * width * 4) + (x * 4);
    };
    setColor = function(x, y, color) {
      var i;
      i = toIndex(x, y);
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      return pixels[i + 3] = color[3];
    };
    isColor = function(x, y, testColor) {
      var i;
      i = toIndex(x, y);
      return pixels[i] === testColor[0] && pixels[i + 1] === testColor[1] && pixels[i + 2] === testColor[2] && pixels[i + 3] === testColor[3];
    };
    colorAt = function(x, y) {
      var i;
      i = toIndex(x, y);
      return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    };
    needsProcessing = function(x, y) {
      var ret;
      ret = true;
      if (isColor(x, y, foregroundColor)) ret = false;
      if (isColor(x, y, newColor)) ret = false;
      return ret;
    };
    flood(width, height, coords, needsProcessing, process);
    return context.putImageData(image, 0, 0);
  };

  window.floodFillWithForeground = floodFillWithForeground;

  colorOfPoint = function(canvas, coords) {
    var context, height, i, image, pixels, toIndex, width, x, y;
    x = coords.scrCoords[1];
    y = coords.scrCoords[2];
    context = canvas.getContext("2d");
    width = canvas.width;
    height = canvas.width;
    image = context.getImageData(0, 0, width, height);
    pixels = image.data;
    toIndex = function(x, y) {
      return (y * width * 4) + (x * 4);
    };
    i = toIndex(x, y);
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };

  window.colorOfPoint = colorOfPoint;

  findAdjacentPoints = function(pad, coords, fillColor) {
    var canvas, context, doneValue, floods, foundFloods, height, image, needsProcessing, pixels, process, toIndex, width;
    canvas = pad.canvas();
    context = canvas.getContext("2d");
    width = canvas.width;
    height = canvas.width;
    image = context.getImageData(0, 0, width, height);
    pixels = image.data;
    doneValue = (fillColor[0] + 1) % 256;
    floods = pad.state.floodFills();
    foundFloods = [];
    toIndex = function(x, y) {
      return (y * width * 4) + (x * 4);
    };
    process = function(x, y) {
      var i, point, _i, _len, _results;
      i = toIndex(x, y);
      pixels[i] = doneValue;
      _results = [];
      for (_i = 0, _len = floods.length; _i < _len; _i++) {
        point = floods[_i];
        if (point.hasPoint(x, y)) {
          if (!_.include(foundFloods, point)) {
            _results.push(foundFloods.push(point));
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };
    needsProcessing = function(x, y) {
      var i;
      i = toIndex(x, y);
      return pixels[i] === fillColor[0] && pixels[i + 1] === fillColor[1] && pixels[i + 2] === fillColor[2];
    };
    flood(width, height, coords, needsProcessing, process);
    return foundFloods;
  };

  window.findAdjacentPoints = findAdjacentPoints;

}).call(this);
/**
 * @class Creates a grid to support the user with element placement.
 * @pseudo
 * @description A grid is a set of vertical and horizontal lines to support the user with element placement. This method
 * draws such a grid on the given board. It uses options given in {@link JXG.Options#grid}. This method does not
 * take any parent elements. It is usually instantiated on the board's creation via the attribute <tt>grid</tt> set
 * to true.
 * @parameter None.
 * @constructor
 * @name Grid
 * @type JXG.Curve
 * @augments JXG.Curve
 * @throws {Error} If the element cannot be constructed with the given parent objects an exception is thrown.
 * @example
 * grid = board.create('grid', []);
 * </pre><div id="a9a0671f-7a51-4fa2-8697-241142c00940" style="width: 400px; height: 400px;"></div>
 * <script type="text/javascript">
 * (function () {
 *  board = JXG.JSXGraph.initBoard('a9a0671f-7a51-4fa2-8697-241142c00940', {boundingbox:[-4, 6, 10, -6], axis: false, grid: false, keepaspectratio: true});
 *  grid = board.create('grid', []);
 * })();
 * </script><pre>
 */

JXG.createWGrid = function (board, parents, attributes) {
    var c, attr;

    attr = JXG.copyAttributes(attributes, board.options, 'grid');
    c = board.create('curve', [[null], [null]], attr);

    c.elType = 'wgrid';
    c.visProp.layer = JXG.Options.layer.wgrid;
    c.visProp.strokecolor = "#C5EDFF";
    c.parents = [];
    c.updateDataArray = function () {
        var gridX = this.visProp.gridx,
            gridY = this.visProp.gridy,
            topLeft = new JXG.Coords(JXG.COORDS_BY_SCREEN, [0, 0], board),
            bottomRight = new JXG.Coords(JXG.COORDS_BY_SCREEN, [board.canvasWidth, board.canvasHeight], board),
            i;

        topLeft.setCoordinates(JXG.COORDS_BY_USER, [Math.floor(topLeft.usrCoords[1] / gridX) * gridX, Math.ceil(topLeft.usrCoords[2] / gridY) * gridY]);
        bottomRight.setCoordinates(JXG.COORDS_BY_USER, [Math.ceil(bottomRight.usrCoords[1] / gridX) * gridX, Math.floor(bottomRight.usrCoords[2] / gridY) * gridY]);

        c.dataX = [];
        c.dataY = [];

        if (attr.horizontalgridlinesvisible) {
          // start with the horizontal grid:
          for (i = topLeft.usrCoords[2]; i > bottomRight.usrCoords[2] - gridY; i -= gridY) {
              c.dataX.push(topLeft.usrCoords[1], bottomRight.usrCoords[1], NaN);
              c.dataY.push(i, i, NaN);
          }
        }

        if (attr.verticalgridlinesvisible) {
          // build vertical grid
          for (i = topLeft.usrCoords[1]; i < bottomRight.usrCoords[1] + gridX; i += gridX) {
              c.dataX.push(i, i, NaN);
              c.dataY.push(topLeft.usrCoords[2], bottomRight.usrCoords[2], NaN);
          }
        }

    };

    // we don't care about highlighting so we turn it off completely to save a lot of
    // time on every mouse move
    c.hasPoint = function () {
        return false;
    };

    /**
     * Updates the visual contents of the curve.
     * @returns {JXG.Curve} Reference to the curve object.
     */
    c.updateRenderer = function () {
      if (!this.visProp.visible) return this;

      if (this.needsUpdate) {
        this.board.renderer.updateCurve(this);
        this.needsUpdate = false;

        // Update the label if visible.
        if(this.hasLabel && this.label.content.visProp.visible) {
          this.label.content.update();
          this.board.renderer.updateText(this.label.content);
        }
      }
      return this;
    };



    return c;
};


JXG.JSXGraph.registerElement('wgrid', JXG.createWGrid);
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.GraphPad || (window.GraphPad = {});

  GraphPad.Pad = (function() {

    function Pad(graphDomId, xmlDataContainerId) {
      this.deleteSelectedObjects = __bind(this.deleteSelectedObjects, this);
      this.deselectObject = __bind(this.deselectObject, this);
      this.decorateForKey = __bind(this.decorateForKey, this);
      this.unloadKey = __bind(this.unloadKey, this);
      this.removeGraphOverlay = __bind(this.removeGraphOverlay, this);
      this.displayGraphOverlay = __bind(this.displayGraphOverlay, this);
      this.removeNoSolution = __bind(this.removeNoSolution, this);
      this.displayNoSolution = __bind(this.displayNoSolution, this);
      this.imageOverlay = __bind(this.imageOverlay, this);
      this.noSolution = __bind(this.noSolution, this);
      this.toggleKey = __bind(this.toggleKey, this);
      this.showKey = __bind(this.showKey, this);
      this.hideKey = __bind(this.hideKey, this);
      this.deleteObject = __bind(this.deleteObject, this);
      this.showObject = __bind(this.showObject, this);
      this.hideObject = __bind(this.hideObject, this);
      this.clearBoard = __bind(this.clearBoard, this);
      this.onlyWhenEnabled = __bind(this.onlyWhenEnabled, this);      this.actionPoints = [];
      this.enabled = true;
      this.graphDomId = graphDomId;
      this.$pad = jQuery("#" + this.graphDomId);
      this.xmlDataContainerId = xmlDataContainerId;
      this.xmlLoader = new GraphPad.XmlLoader(this, this.xmlDataContainerId);
      this.state = new GraphPad.State(this);
      this.ui = new GraphPad.UserInterface(this);
      this.buildBoard();
      this.setSelectedToolName('selection');
      this.selectedObjects = [];
      this.keyVisible = false;
      this.tools = {
        'selection': {
          modal: true,
          handler: new GraphPad.Actions.SelectionAction(this),
          "default": true
        },
        'point': {
          modal: true,
          handler: new GraphPad.Actions.PointAction(this)
        },
        'line': {
          modal: true,
          handler: new GraphPad.Actions.LineAction(this)
        },
        'ray': {
          modal: true,
          handler: new GraphPad.Actions.RayAction(this)
        },
        'segment': {
          modal: true,
          handler: new GraphPad.Actions.SegmentAction(this)
        },
        'circle': {
          modal: true,
          handler: new GraphPad.Actions.CircleAction(this)
        },
        'vertical-parabola': {
          modal: true,
          handler: new GraphPad.Actions.VerticalParabolaAction(this)
        },
        'horizontal-parabola': {
          modal: true,
          handler: new GraphPad.Actions.HorizontalParabolaAction(this)
        },
        'clear': {
          modal: false,
          handler: this.onlyWhenEnabled(this.clearBoard)
        },
        'key': {
          modal: false,
          handler: this.toggleKey
        },
        'fill': {
          modal: true,
          handler: new GraphPad.Actions.FloodFillAction(this)
        },
        'delete': {
          modal: false,
          initiallyDisabled: true,
          handler: this.onlyWhenEnabled(this.deleteSelectedObjects)
        },
        'no-solution': {
          modal: false,
          handler: this.onlyWhenEnabled(this.noSolution)
        }
      };
    }

    Pad.prototype.onlyWhenEnabled = function(action) {
      var _this = this;
      return function() {
        if (_this.enabled) return action();
      };
    };

    Pad.prototype.init = function() {
      this.ui.init();
      this.draw();
      this.wireDefaultEvents();
      if (!this.enabled || jQuery('#graphpad_mode_' + this.xmlDataContainerId).val() == 'disabled') return this.disable();
    };

    Pad.prototype.enable = function() {
      var _this = this;
      this.enabled = true;
      this.ui.enable();
      this.removeGraphOverlay();
      return _.each(this.state.all(), function(object) {
        _this.releaseObject(object);
        return _.each(object.childElements, _this.releaseObject);
      });
    };
    
    Pad.prototype.setSelectedToolName = function( name ) {
        if( name == this.selectedToolName ) return name;
        this.selectedToolName = name;
        if ( name == 'selection' ) {
            this.releaseAllObjects();
        }
        else {
            this.freezeAllObjects();
        }
        return name;
    }

    Pad.prototype.disable = function() {
      var _this = this;
      if (!this.enabled) return;
      this.enabled = false;
      this.setSelectedToolName('selection');
      this.ui.disable();
      this.displayGraphOverlay();
      this.deselectAllObjects();
      return _.each(this.state.all(true), function(object) {
        _this.freezeObject(object);
        return _.each(object.childElements, _this.freezeObject);
      });
    };

    Pad.prototype.freezeAllObjects = function() {
      var _this = this;
      _.each(this.state.all(true), function(object) {
        _this.freezeObject(object);
        _.each(object.childElements, _this.freezeObject);
      });
    };
    
    Pad.prototype.releaseAllObjects = function() {
      var _this = this;
      _.each(this.state.all(true), function(object) {
        _this.releaseObject(object);
        _.each(object.childElements, _this.releaseObject);
      });
    };
    
    Pad.prototype.freezeObject = function(object) {
        return object.isDraggable = false;
    };

    Pad.prototype.releaseObject = function(object) {
        if( object.elType == "key" ) return;
        return object.isDraggable = true;
    };

    Pad.prototype.canvas = function() {
      return this.$pad.find('canvas')[0];
    };

    Pad.prototype.buildBoard = function() {
      var boundingBox, calculateTickDistances, clone, gridConfig, tixsConfig;
      this.boardConfig = _.defaults(this.xmlLoader.boardConfig(), GraphPad.defaultBoardConfig);
      clone = _.clone(GraphPad.boardOptions);
      boundingBox = [this.boardConfig.minValueOnTheXAxis(), this.boardConfig.maxValueOnTheYAxis(), this.boardConfig.maxValueOnTheXAxis(), this.boardConfig.minValueOnTheYAxis()];
      clone.boundingbox = boundingBox;
      this.board = JXG.JSXGraph.initBoard(this.graphDomId, clone);
      this.board.defaultAxes = {};
      calculateTickDistances = function(min, max, delta) {
        var dist, x;
        delta = Math.abs(delta);
        dist = [];
        x = 0;
        while (x < max) {
          dist.push(x);
          x = x + delta;
        }
        x = -1 * delta;
        while (x > min) {
          dist.push(x);
          x = x - delta;
        }
        return dist.sort(function(a, b) {
          return a - b;
        });
      };
      if (this.boardConfig.xAxisVisible()) {
        tixsConfig = {
          ticks: {
            drawZero: true,
            visible: this.boardConfig.valuesVisibleOnXAxis(),
            ticksdistance: calculateTickDistances(this.boardConfig.minValueOnTheXAxis(), this.boardConfig.maxValueOnTheXAxis(), this.boardConfig.xAxisTickScale())
          }
        };
        this.board.defaultAxes.x = this.board.create('waxis', [[0, 0], [1, 0]], tixsConfig);
      }
      if (this.boardConfig.yAxisVisible()) {
        tixsConfig = {
          ticks: {
            drawZero: this.board.options.axis.ticks.drawZero,
            visible: this.boardConfig.valuesVisibleOnYAxis(),
            ticksdistance: calculateTickDistances(this.boardConfig.minValueOnTheYAxis(), this.boardConfig.maxValueOnTheYAxis(), this.boardConfig.yAxisTickScale())
          }
        };
        this.board.defaultAxes.y = this.board.create('waxis', [[0, 0], [0, 1]], tixsConfig);
      }
      if (this.boardConfig.horizontalGridlinesVisible() || this.boardConfig.verticalGridlinesVisible()) {
        gridConfig = {
          horizontalGridlinesVisible: this.boardConfig.horizontalGridlinesVisible(),
          verticalGridlinesVisible: this.boardConfig.verticalGridlinesVisible(),
          gridX: this.boardConfig.horizontalGridlineScale(),
          gridY: this.boardConfig.verticalGridlineScale()
        };
        return this.board.create('wgrid', [], gridConfig);
      }
    };

    Pad.prototype.clearBoard = function(requireConfirmation) {
      if (requireConfirmation == null) requireConfirmation = true;
      if (!requireConfirmation || window.confirm("Are you sure you want to clear the entire graph?")) {
        this.board.hooks = [];
        JXG.JSXGraph.freeBoard(this.board);
        this.buildBoard();
        this.wireDefaultEvents();
        this.ui.clearAllLayers();
        this.ui.selectToolbarButton('selection');
        if (this.keyVisible) this.xmlLoader.loadKey();
        return this.updateBoard();
      }
    };

    Pad.prototype.isDashed = function(object) {
      return object.visProp.dash > 0;
    };

    Pad.prototype.setSolid = function(object) {
      if( object.tiedObjects ) {
        _.each(object.tiedObjects, function(o){
          o.visProp.dash = 0;
          });
      }
      return object.visProp.dash = 0;
    };

    Pad.prototype.setDashed = function(object) {
      if( object.tiedObjects ) {
        _.each(object.tiedObjects, function(o){
          o.visProp.dash = 2;
        });
      }
      return object.visProp.dash = 2;
    };

    Pad.prototype.createPoint = function(pointArray, face, selectAfterCreate, isKey) {
      var options, point;
      if (selectAfterCreate == null) selectAfterCreate = false;
      if (isKey == null) isKey = false;
      options = Object.create(GraphPad.pointOptions);
      if (face != null) options.face = face;
      if (this.boardConfig.horizontalCursorSnappingEnabled() || this.boardConfig.verticalCursorSnappingEnabled()) {
        options.snapToGrid = true;
        options.snapSizeY = this.boardConfig.verticalSnapScale();
        options.snapSizeX = this.boardConfig.horizontalSnapScale();
      }
      pointArray = _.map(pointArray, function(numOrFunction) {
        if (jQuery.isFunction(numOrFunction)) {
          return numOrFunction;
        } else {
          return parseFloat(numOrFunction);
        }
      });
      point = this.board.create('point', pointArray, options);
      point.setPositionDirectly(JXG.COORDS_BY_USER, pointArray[0], pointArray[1]);
      if (selectAfterCreate) this.selectUniqueObject(point);
      return point;
    };

    Pad.prototype.updatePoint = function(point, pointArray) {
      point.setPositionDirectly(JXG.COORDS_BY_USER, pointArray[0], pointArray[1]);
      this.updateBoard();
      return point;
    };

    Pad.prototype.hideObject = function(element) {
      element.hideElement();
      return _.each(element.childElements, this.hideObject);
    };

    Pad.prototype.showObject = function(element) {
      element.showElement();
      return _.each(element.childElements, this.showObject);
    };

    Pad.prototype.deleteObject = function(element) {
      var _this = this;
      _.each(element.ancestors, function(e) {
        return _this.board.removeObject(e);
      });
      this.board.removeObject(element);
      this.ui.removeLayer(element);
      this.updateBoard();
      return this.ui.disableToolbarButton('delete');
    };

    Pad.prototype.updateBoard = function() {
      return this.board.prepareUpdate().update();
    };

    Pad.prototype.hideKey = function() {
      if (!this.keyVisible) return;
      this.ui.deselectToolBarButton('key');
      if (this.state.hasNoSolution()) {
        this.ui.selectToolbarButton('no-solution');
      } else {
        this.ui.selectToolbarButton('selection');
      }
      this.unloadKey();
      return this.keyVisible = false;
    };

    Pad.prototype.showKey = function() {
      if (this.keyVisible) return;
      if (this.xmlLoader.loadKey()) {
        this.ui.selectToolbarButton('key');
        this.setSelectedToolName('selection');
        this.keyVisible = true;
        return this.updateBoard();
      } else {
        return this.ui.removeButton('key');
      }
    };

    Pad.prototype.toggleKey = function() {
      if (this.keyVisible) {
        return this.hideKey();
      } else {
        return this.showKey();
      }
    };

    Pad.prototype.noSolution = function(isKey) {
      var message;
      if (isKey == null) isKey = false;
      if (this.state.hasNoSolution()) {
        return this.ui.selectToolbarButton('no-solution');
      }
      message = "Do you want to answer 'No Solution'? This will delete all of your plots and fills!";
      if (window.confirm(message)) {
        this.ui.selectToolbarButton('no-solution');
        this.setSelectedToolName('selection');
        this.clearBoard(false);
        this.displayNoSolution(isKey);
        return this.updateBoard();
      }
    };

    Pad.prototype.imageOverlay = function(imageName, elType) {
      var bottomLeftVertices, height, image, url, width, widthAndHeight;
      url = "/static/img/pads/graphingtool/" + imageName;
      bottomLeftVertices = [this.boardConfig.minValueOnTheXAxis(), this.boardConfig.minValueOnTheYAxis()];
      width = this.boardConfig.maxValueOnTheXAxis() - this.boardConfig.minValueOnTheXAxis();
      height = this.boardConfig.maxValueOnTheYAxis() - this.boardConfig.minValueOnTheYAxis();
      widthAndHeight = [width, height];
      image = this.board.create('image', [url, bottomLeftVertices, widthAndHeight]);
      image.elType = elType;
      return image;
    };

    Pad.prototype.displayNoSolution = function(isKey) {
      var elType, image_filename;
      if (isKey == null) isKey = false;
      image_filename = isKey ? 'no_solution_key.png' : 'no_solution.png';
      elType = isKey ? 'key' : 'noSolution';
      this.graphOverlay = this.imageOverlay(image_filename, elType);
      if (!isKey) return this.ui.selectToolbarButton('no-solution');
    };

    Pad.prototype.removeNoSolution = function() {
      if (!this.state.hasNoSolution()) return;
      this.board.removeObject(this.state.noSolution());
      return this.updateBoard();
    };

    Pad.prototype.displayGraphOverlay = function() {
      return this.graphOverlay = this.imageOverlay('disabled-graph-overlay.png', 'graphOverlay');
    };

    Pad.prototype.removeGraphOverlay = function() {
      if (!this.graphOverlay) return;
      this.board.removeObject(this.graphOverlay);
      this.updateBoard();
      return this.graphOverlay = null;
    };

    Pad.prototype.unloadKey = function() {
      var keyObjects;
      keyObjects = _.filter(this.board.objects, function(object) {
        return object.elType === "key";
      });
      return _.each(keyObjects, this.deleteObject);
    };

    Pad.prototype.withHiddenElementsForFloodFill = function(doSomething) {
      var axisi, result, wGrids;
      axisi = this.state.axisi();
      wGrids = this.state.wGrids();
      _.each(axisi, this.hideObject);
      _.each(wGrids, this.hideObject);
      this.updateBoard();
      result = doSomething();
      _.each(axisi, this.showObject);
      _.each(wGrids, this.showObject);
      this.updateBoard();
      return result;
    };

    Pad.prototype.toggleFloodFill = function(coords, isKey) {
      var colorOfPoint, fillColor, targetColor, wrappedColorOfPoint, x, y,
        _this = this;
      if (isKey == null) isKey = false;
      x = coords.usrCoords[1];
      y = coords.usrCoords[2];
      targetColor = [0, 0, 0, 200];
      fillColor = [255, 233, 191, 255];
      wrappedColorOfPoint = function() {
        return window.colorOfPoint(_this.canvas(), coords);
      };
      colorOfPoint = this.withHiddenElementsForFloodFill(wrappedColorOfPoint);
      if (colorOfPoint[0] === fillColor[0] && colorOfPoint[1] === fillColor[1] && colorOfPoint[2] === fillColor[2] && colorOfPoint[3] === fillColor[3]) {
        return this.withHiddenElementsForFloodFill(function() {
          var floods;
          floods = window.findAdjacentPoints(_this, coords, fillColor);
          if (floods.length !== 0) return _this.destroyFloodFills(floods);
        });
      } else {
        return this.createFloodFill(coords, isKey);
      }
    };

    Pad.prototype.destroyFloodFills = function(floodPoints) {
      var _this = this;
      return _.each(floodPoints, function(fp) {
        return _this.board.removeObject(fp);
      });
    };

    Pad.prototype.createFloodFill = function(coords, isKey) {
      var ourCanvas, point;
      if (isKey == null) isKey = false;
      point = this.createPoint([coords.usrCoords[1], coords.usrCoords[2]]);
      if (isKey) point.visProp.layer = JXG.Options.layer['keyFloodFill'];
      ourCanvas = this.canvas();
      point.updateRenderer = function() {
        var fillColor, targetColor;
        if (!this.needsUpdate) return this;
        if (isKey) {
          point.elType = 'key';
          fillColor = GraphPad.fillOptions.keyFillColorRGB;
          targetColor = [88, 179, 73, 255];
          window.floodFillWithForeground(ourCanvas, coords, targetColor, fillColor);
        } else {
          point.elType = 'floodfill';
          targetColor = GraphPad.fillOptions.targetColorRGB;
          fillColor = [255, 233, 191, 255];
          window.floodFill(ourCanvas, coords, targetColor, fillColor);
        }
        this.needsUpdate = false;
        return this;
      };
      return point;
    };

    Pad.prototype.createLine = function(pointOne, pointTwo, dashed) {
      var line, options;
      if (dashed == null) dashed = false;
      options = {};
      if (dashed) options['dash'] = 2;
      line = this.board.create('line', [pointOne, pointTwo], options);
      line.setArrow(true, true);
      this.selectUniqueObject(line);
      return line;
    };

    Pad.prototype.decorateAxes = function() {
      var axes;
      axes = _.filter(this.board.objects, function(object) {
        return object.elType === 'axis';
      });
      return _.each(axes, function(axis) {
        return axis.setArrow(true, true);
      });
    };

    Pad.prototype.decorateForKey = function(object, layerName) {
      this.deselectObject(object);
      object.visProp.strokecolor = GraphPad.boardOptions.keyStrokeColor;
      object.visProp.fillcolor = GraphPad.boardOptions.keyStrokeColor;
      object.visProp.highlightFillColor = GraphPad.boardOptions.keyStrokeColor;
      object.visProp.highlightfillcolor = GraphPad.boardOptions.keyStrokeColor;
      object.visProp.highlightstrokecolor = GraphPad.boardOptions.keyStrokeColor;
      object.elType = "key";
      if (layerName != null) object.visProp.layer = JXG.Options.layer[layerName];
      return this.freezeObject(object);
    };

    Pad.prototype.createRay = function(pointOne, pointTwo, dashed) {
      var line, point1Open, point2Open;
      var options = {};
      if (dashed) options['dash'] = 2;
      line = this.board.create('line', [pointOne, pointTwo], options);
      point1Open = false;
      point2Open = true;
      line.setStraight(point1Open, point2Open);
      line.setArrow(false, true);
      this.selectUniqueObject(line);
      return line;
    };

    Pad.prototype.createSegment = function(pointOne, pointTwo) {
      var line, point1Open, point2Open;
      line = this.board.create('line', [pointOne, pointTwo]);
      point1Open = false;
      point2Open = false;
      line.setStraight(point1Open, point2Open);
      this.selectUniqueObject(line);
      return line;
    };

    Pad.prototype.createCircle = function(pointOne, pointTwo, dashed) {
      var circle, options;
      if (dashed == null) dashed = false;
      options = {};
      if (dashed) options['dash'] = 2;
      circle = this.board.create('circle', [pointOne, pointTwo], options);
      window.circle = circle;
      this.selectUniqueObject(circle);
      return circle;
    };

    Pad.prototype.solveVerticalQuadraticEquation = function(vertex, point, reflection) {
      var a, b, c, denom, x1, x2, x3, y1, y2, y3;
      x1 = vertex.X();
      y1 = vertex.Y();
      x2 = point.X();
      y2 = point.Y();
      x3 = reflection.X();
      y3 = reflection.Y();
      denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
      a = (x3 * (y2 - y1) + x2 * (y1 - y3)) / denom;
      b = (Math.pow(x3, 2) * (y1 - y2) + Math.pow(x2, 2) * (y3 - y1)) / denom;
      c = (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;
      return {
        a: a,
        b: b,
        c: c,
        denom: denom
      };
    };

    Pad.prototype.solveHorizontalQuadraticEquation = function(vertex, point, reflection) {
      var a, b, c, denom, x1, x2, x3, y1, y2, y3;
      x1 = vertex.X();
      y1 = vertex.Y();
      x2 = point.X();
      y2 = point.Y();
      x3 = reflection.X();
      y3 = reflection.Y();
      denom = (y1 - y2) * (y1 - y3) * (y2 - y3);
      a = (y3 * (x2 - x1) + y2 * (x1 - x3)) / denom;
      b = (Math.pow(y3, 2) * (x1 - x2) + Math.pow(y2, 2) * (x3 - x1)) / denom;
      c = (y2 * y3 * (y2 - y3) * x1 + y3 * y1 * (y3 - y1) * x2 + y1 * y2 * (y1 - y2) * x3) / denom;
      return {
        a: a,
        b: b,
        c: c,
        denom: denom
      };
    };

    Pad.prototype.createVerticalParabola = function(vertex, point, dashed) {
      var args, functionGraph, invisibleLinePoint, leftIntervalBorder, line, options, quadraticEquation, reflection, rightIntervalBorder,
        _this = this;
      options = {};
      if (dashed) options['dash'] = 2;
      args = [
        (function() {
          return vertex.X();
        }), (function() {
          return vertex.Y() + 1;
        })
      ];
      invisibleLinePoint = this.createPoint(args);
      invisibleLinePoint.hideElement();
      line = this.createLine(vertex, invisibleLinePoint);
      line.elType = 'parabolaLine';
      line.hideElement();
      
      ray = this.createRay(vertex, point, dashed);
      ray.elType = 'parabolaRay';
      ray.hideElement();
      
      reflection = this.board.create('reflection', [point, line], GraphPad.pointOptions);
      reflection.hideElement();
      quadraticEquation = function(x) {
        var a, b, c, denom, _ref;
        _ref = _this.solveVerticalQuadraticEquation(vertex, point, reflection), denom = _ref.denom, a = _ref.a, b = _ref.b, c = _ref.c;
        if (denom === 0) {
          ray.showElement();
        } else {
          ray.hideElement();
        }
        return (a * Math.pow(x, 2)) + (b * x) + c;
      };
      leftIntervalBorder = function() {
        var a, b, border, c, y, _ref;
        if (point.Y() < vertex.Y()) {
          y = _this.boardConfig.minValueOnTheYAxis();
        } else {
          y = _this.boardConfig.maxValueOnTheYAxis();
        }
        _ref = _this.solveVerticalQuadraticEquation(vertex, point, reflection), a = _ref.a, b = _ref.b, c = _ref.c;
        border = ((b * -1) - Math.sqrt((b * b) - (4 * a * (c - y)))) / (2 * a);
        if (_.isNaN(border)) return _this.boardConfig.minValueOnTheXAxis();
        return border;
      };
      rightIntervalBorder = function() {
        var a, b, border, c, y, _ref;
        if (point.Y() < vertex.Y()) {
          y = _this.boardConfig.minValueOnTheYAxis();
        } else {
          y = _this.boardConfig.maxValueOnTheYAxis();
        }
        _ref = _this.solveVerticalQuadraticEquation(vertex, point, reflection), a = _ref.a, b = _ref.b, c = _ref.c;
        border = ((b * -1) + Math.sqrt((b * b) - (4 * a * (c - y)))) / (2 * a);
        if (_.isNaN(border)) return _this.boardConfig.maxValueOnTheXAxis();
        return border;
      };
      functionGraph = this.board.create('functiongraph', [quadraticEquation, leftIntervalBorder, rightIntervalBorder], options);
      functionGraph.tiedObjects = [ray];
      vertex.elType = 'vertex';
      functionGraph.addChild(vertex);
      point.elType = 'arbitraryPoint';
      functionGraph.addChild(point);
      functionGraph.addChild(invisibleLinePoint);
      functionGraph.addChild(line);
      functionGraph.addChild(reflection);
      functionGraph.elType = 'verticalParabola';
      functionGraph.setArrow(true, true);
      this.selectUniqueObject(functionGraph);
      return functionGraph;
    };

    Pad.prototype.createHorizontalParabola = function(vertex, point, dashed) {
      var args, bottomIntervalBorder, functionGraph, invisibleLinePoint, line, options, reflection, topIntervalBorder, xEquation, yEquation,
        _this = this;
      options = {};
      if (dashed) options['dash'] = 2;
      args = [
        (function() {
          return vertex.X() + 1;
        }), (function() {
          return vertex.Y();
        })
      ];
      invisibleLinePoint = this.createPoint(args);
      invisibleLinePoint.hideElement();
      line = this.createLine(vertex, invisibleLinePoint, dashed);
      line.elType = 'parabolaLine';
      line.hideElement();
      
      ray = this.createRay(vertex, point, dashed);
      ray.elType = 'parabolaRay';
      ray.hideElement();
      
      reflection = this.board.create('reflection', [point, line], GraphPad.pointOptions);
      reflection.hideElement();
      xEquation = function(x) {
        var a, b, c, denom, _ref;
        _ref = _this.solveHorizontalQuadraticEquation(vertex, point, reflection), a = _ref.a, b = _ref.b, c = _ref.c, denom = _ref.denom;
        if (denom === 0) {
          ray.showElement();
        } else {
          ray.hideElement();
        }
        return (a * x * x) + (b * x) + c;
      };
      yEquation = function(y) {
        return y;
      };
      bottomIntervalBorder = function() {
        var a, b, border, c, x, _ref;
        if (point.X() < vertex.X()) {
          x = _this.boardConfig.minValueOnTheXAxis();
        } else {
          x = _this.boardConfig.maxValueOnTheXAxis();
        }
        _ref = _this.solveHorizontalQuadraticEquation(vertex, point, reflection), a = _ref.a, b = _ref.b, c = _ref.c;
        border = ((b * -1) - Math.sqrt((b * b) - (4 * a * (c - x)))) / (2 * a);
        if (_.isNaN(border)) return _this.boardConfig.minValueOnTheYAxis();
        return border;
      };
      topIntervalBorder = function() {
        var a, b, border, c, x, _ref;
        if (point.X() < vertex.X()) {
          x = _this.boardConfig.minValueOnTheXAxis();
        } else {
          x = _this.boardConfig.maxValueOnTheXAxis();
        }
        _ref = _this.solveHorizontalQuadraticEquation(vertex, point, reflection), a = _ref.a, b = _ref.b, c = _ref.c;
        border = ((b * -1) + Math.sqrt((b * b) - (4 * a * (c - x)))) / (2 * a);
        if (_.isNaN(border)) return _this.boardConfig.maxValueOnTheYAxis();
        return border;
      };
      functionGraph = this.board.create('curve', [xEquation, yEquation, bottomIntervalBorder, topIntervalBorder], options);
      functionGraph.tiedObjects = [ray];
      vertex.elType = 'vertex';
      functionGraph.addChild(vertex);
      point.elType = 'arbitraryPoint';
      functionGraph.addChild(point);
      functionGraph.addChild(invisibleLinePoint);
      functionGraph.addChild(line);
      functionGraph.addChild(reflection);
      functionGraph.elType = 'horizontalParabola';
      functionGraph.setArrow(true, true);
      this.selectUniqueObject(functionGraph);
      return functionGraph;
    };

    Pad.prototype.draw = function() {
      this.board.suspendUpdate();
      this.xmlLoader.load();
      this.showKey();
      this.decorateAxes();
      return this.board.unsuspendUpdate();
    };

    Pad.prototype.selectedTool = function() {
      return this.tools[this.selectedToolName];
    };

    Pad.prototype.chooseTool = function(toolName) {
      this.ui.selectToolbarButton(toolName);
      return this.setSelectedToolName(toolName);
    };

    Pad.prototype.isPointOpen = function(point) {
      return point.visProp.fillcolor === JXG.Options.point.openFillColor;
    };

    Pad.prototype.openPoint = function(point) {
      point.visProp.fillcolor = JXG.Options.point.openFillColor;
      return this.updateBoard();
    };

    Pad.prototype.closePoint = function(point) {
      point.visProp.fillcolor = JXG.Options.point.fillColor;
      return this.updateBoard();
    };

    Pad.prototype.selectObject = function(object) {
      var $layer;
      if (object.elType === "key") return;
      this.selectedObjects.push(object);
      object.visProp.strokecolor = object.visProp.highlightstrokecolor;
      if (this.enabled) this.ui.enableToolbarButton('delete');
      this.updateBoard();
      if ($layer = this.ui.findLayerByObjectId(object.id)) {
        this.ui.showLayerPalette();
        return this.ui.openLayer($layer);
      }
    };

    Pad.prototype.selectUniqueObject = function(object) {
      this.deselectAllObjects();
      return this.selectObject(object);
    };

    Pad.prototype.deselectObject = function(object, doUpdate) {
      var $layer;
      if (doUpdate == null) doUpdate = true;
      this.selectedObjects = _.reject(this.selectedObjects, function(obj) {
        return obj === object;
      });
      if (object.elType === 'key') {
        object.visProp.strokecolor = GraphPad.boardOptions.keyStrokeColor;
      } else {
        object.visProp.strokecolor = JXG.Options.line.strokeColor;
      }
      if (this.selectedObjects.length === 0) {
        this.ui.disableToolbarButton('delete');
      }
      if ($layer = this.ui.findLayerByObjectId(object.id)) {
        this.ui.closeLayer($layer);
      }
      if (doUpdate) return this.updateBoard();
    };

    Pad.prototype.deselectAllObjects = function() {
      var _this = this;
      _.each(this.selectedObjects, function(obj) {
        return _this.deselectObject(obj, false);
      });
      return this.updateBoard();
    };

    Pad.prototype.deleteSelectedObjects = function() {
      if (_.isEmpty(this.selectedObjects)) {
        return alert('You must select at least one object to delete.');
      } else {
        return _.each(this.selectedObjects, this.deleteObject);
      }
    };

    Pad.prototype.clearActionPoints = function() {
      _.each(this.actionPoints, this.deleteObject);
      return this.actionPoints = [];
    };
    
    Pad.prototype.down = function(e) {
        if(!this.enabled) return;
        return this.selectedTool().handler.onMouseDown(e);
    }

    Pad.prototype.move = function(e) {
      if (!this.enabled) return;
      return this.selectedTool().handler.onMouseMove(e);
    };

    Pad.prototype.up = function(e) {
      if (!this.enabled) return;
      return this.selectedTool().handler.onMouseUp(e);
    };
    
    Pad.prototype.touchstart = function(e) {
      if (!this.enabled) return;
      this.last_event = e;
      return this.selectedTool().handler.onMouseDown(e);
    };
    
    Pad.prototype.touchmove = function(e) {
      if (!this.enabled) return;
      this.last_event = e;
      return this.selectedTool().handler.onMouseMove(e);
    };
    
    Pad.prototype.touchend = function(e) {
      if (!this.enabled) return;
      return this.selectedTool().handler.onMouseUp(this.last_event);
    };

    Pad.prototype.dumpGraphXml = function(e) {
      return this.serializer().writeToDom();
    };

    Pad.prototype.serializer = function() {
      return new GraphPad.XmlSerializer(this, this.xmlDataContainerId);
    };

    Pad.prototype.wireDefaultEvents = function() {
      var throttledGraphDump, throttledUserInterfaceUpdate;
      if( window.navigator.platform.match('iPad') ) {
        this.board.addHook(this.touchstart, 'touchstart', this);
        this.board.addHook(this.touchmove, 'touchmove', this);
        this.board.addHook(this.touchend, 'touchend', this);      
      }
      else {
        this.board.addHook(this.down, 'mousedown', this);
        this.board.addHook(this.move, 'mousemove', this);
        this.board.addHook(this.up, 'mouseup', this);    
      }
      
      
      throttledGraphDump = _.throttle(this.dumpGraphXml, 1000);
      throttledUserInterfaceUpdate = _.throttle(this.ui.update, 1000);
      this.board.addHook(throttledGraphDump, 'update', this);
      return this.board.addHook(throttledUserInterfaceUpdate, 'update', this);
    };

    return Pad;

  })();

}).call(this);
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.GraphPad || (window.GraphPad = {});

  GraphPad.State = (function() {

    function State(pad) {
      this.pad = pad;
      this.points = __bind(this.points, this);
      this.partOfKey = __bind(this.partOfKey, this);
      this.partOfStudentResponse = __bind(this.partOfStudentResponse, this);
    }

    State.prototype.graphType = function(graphObject) {
      return jQuery(graphObject).data('graphType');
    };

    State.prototype.isVisible = function(o) {
      return o.visProp.visible;
    };

    State.prototype.partOfStudentResponse = function(o) {
      return this.isVisible(o) && o.elType !== 'key';
    };

    State.prototype.partOfKey = function(o) {
      var isKey;
      isKey = o.elType === 'key';
      return this.isVisible(o) && isKey;
    };

    State.prototype.objects = function() {
      return _.filter(this.pad.board.objects, this.partOfStudentResponse);
    };

    State.prototype.keyObjects = function() {
      return _.filter(this.pad.board.objects, this.partOfKey);
    };

    State.prototype.points = function(returnAllPoints) {
      var onlyPoints,
        _this = this;
      onlyPoints = function(graphObject) {
        var hasNoGraphableChildren, hasXAndY, isNotOrphan, isPointType, parentNotFloodFill, parentNotParabola;
        isPointType = function(o) {
          return o.type === JXG.OBJECT_TYPE_POINT;
        };
        hasXAndY = function(o) {
          return o.X() !== null && o.Y() !== null;
        };
        hasNoGraphableChildren = function(o) {
          return _.all(o.descendants, function(d) {
            return d.type !== JXG.OBJECT_TYPE_LINE && d.type !== JXG.OBJECT_TYPE_CIRCLE;
          });
        };
        isNotOrphan = function(o) {
          return !_.include(_this.pad.actionPoints, o);
        };
        parentNotFloodFill = function(o) {
          return o.elType !== 'floodfill';
        };
        parentNotParabola = function(o) {
          return _.all(o.ancestors, function(a) {
            return a.elType !== 'verticalParabola' && a.elType !== 'horizontalParabola';
          });
        };
        if (returnAllPoints) {
          return isPointType(graphObject);
        } else {
          return isPointType(graphObject) && isNotOrphan(graphObject) && hasXAndY(graphObject) && hasNoGraphableChildren(graphObject) && parentNotParabola(graphObject) && parentNotFloodFill(graphObject);
        }
      };
      return _.filter(this.objects(), onlyPoints);
    };

    State.prototype.lines = function() {
      var onlyLines;
      onlyLines = function(graphObject) {
        if (graphObject.type !== JXG.OBJECT_TYPE_LINE) return false;
        if (!(graphObject.visProp.straightfirst && graphObject.visProp.straightlast)) {
          return false;
        }
        if (graphObject.elType === 'parabolaLine') return false;
        return true;
      };
      return _.filter(this.objects(), onlyLines);
    };

    State.prototype.rays = function() {
      var onlyRays;
      onlyRays = function(graphObject) {
        var first, last;
        if (graphObject.type !== JXG.OBJECT_TYPE_LINE) return false;
        first = graphObject.visProp.straightfirst;
        last = graphObject.visProp.straightlast;
        if (!((first && !last) || (!first && last))) return false;
        return true;
      };
      return _.filter(this.objects(), onlyRays);
    };

    State.prototype.segments = function() {
      var onlySegments;
      onlySegments = function(graphObject) {
        var first, last;
        if (graphObject.type !== JXG.OBJECT_TYPE_LINE) return false;
        first = graphObject.visProp.straightfirst;
        last = graphObject.visProp.straightlast;
        if (!(!first && !last)) return false;
        return true;
      };
      return _.filter(this.objects(), onlySegments);
    };

    State.prototype.circles = function() {
      var onlyCircles;
      onlyCircles = function(graphObject) {
        return graphObject.type === JXG.OBJECT_TYPE_CIRCLE;
      };
      return _.filter(this.objects(), onlyCircles);
    };

    State.prototype.verticalParabolas = function() {
      var onlyVps;
      onlyVps = function(graphObject) {
        return graphObject.elType === 'verticalParabola';
      };
      return _.filter(this.objects(), onlyVps);
    };

    State.prototype.horizontalParabolas = function() {
      var onlyHps;
      onlyHps = function(graphObject) {
        return graphObject.elType === 'horizontalParabola';
      };
      return _.filter(this.objects(), onlyHps);
    };

    State.prototype.floodFills = function() {
      var only;
      only = function(graphObject) {
        return graphObject.elType === 'floodfill';
      };
      return _.filter(this.objects(), only);
    };

    State.prototype.wGrids = function() {
      var only;
      only = function(graphObject) {
        return graphObject.elType === 'wgrid';
      };
      return _.filter(this.objects(), only);
    };

    State.prototype.axisi = function() {
      var only;
      only = function(graphObject) {
        return graphObject.elType === 'axis';
      };
      return _.filter(this.objects(), only);
    };

    State.prototype.noSolution = function() {
      var only;
      only = function(graphObject) {
        return graphObject.elType === 'noSolution';
      };
      return _.find(this.objects(), only);
    };

    State.prototype.hasNoSolution = function() {
      return !jQuery.isEmptyObject(this.noSolution());
    };

    State.prototype.all = function(returnAllPoints) {
      return [this.points(returnAllPoints), this.lines(), this.rays(), this.segments(), this.circles(), this.verticalParabolas(), this.horizontalParabolas(), this.noSolution()].flatten();
    };

    return State;

  })();

}).call(this);
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  window.GraphPad || (window.GraphPad = {});

  GraphPad.UserInterface = (function() {

    function UserInterface(pad) {
      this.update = __bind(this.update, this);
      this.initToolbarButton = __bind(this.initToolbarButton, this);      this.pad = pad;
      this.graphContainer = jQuery("#" + this.pad.graphDomId).parent('.graph-container');
      this.allButtons = jQuery("." + this.pad.graphDomId + "-tools .tool");
    }

    UserInterface.prototype.init = function() {
      this.initToolbar();
      this.initLayerPalette();
      return this.captureInitialState();
    };

    UserInterface.prototype.initToolbar = function() {
      var toolName, toolNames, _i, _len;
      toolNames = _.keys(this.pad.tools);
      for (_i = 0, _len = toolNames.length; _i < _len; _i++) {
        toolName = toolNames[_i];
        this.initToolbarButton(toolName, this.allButtons);
      }
      return this.initDrawers();
    };

    UserInterface.prototype.captureInitialState = function() {
      return _.each(this.allButtons, function(button) {
        button = jQuery(button);
        return button.data('initiallyDisabled', button.hasClass('disabled'));
      });
    };

    UserInterface.prototype.enable = function() {
      this.enableAllButtons();
      return this.enableAllFields();
    };

    UserInterface.prototype.enableAllFields = function() {
      var $fields, $layerPalette;
      $layerPalette = this.graphContainer.siblings('.layer-palette');
      $layerPalette.removeClass('disabled');
      $fields = $layerPalette.find('input');
      return _.each($fields, function(field) {
        return jQuery(field).removeAttr('disabled');
      });
    };

    UserInterface.prototype.enableAllButtons = function() {
      return _.each(this.allButtons, function(button) {
        var $button;
        $button = jQuery(button);
        if (!$button.data('initiallyDisabled')) {
          return $button.removeClass('disabled').parents('.drawer').removeClass('disabled');
        }
      });
    };

    UserInterface.prototype.disable = function() {
      this.disableAllButtons();
      return this.disableAllFields();
    };

    UserInterface.prototype.disableAllButtons = function() {
      return this.allButtons.not('.key').addClass('disabled').parents('.drawer').addClass('disabled');
    };

    UserInterface.prototype.disableAllFields = function() {
      var $fields, $layerPalette;
      $layerPalette = this.graphContainer.siblings('.layer-palette');
      $layerPalette.addClass('disabled');
      $fields = $layerPalette.find('input');
      return _.each($fields, function(field) {
        return jQuery(field).attr('disabled', 'disabled');
      });
    };

    UserInterface.prototype.initDrawers = function() {
      var _this = this;
      return this.graphContainer.on("mouseleave", ".drawer.open", function() {
        return setTimeout((function() {
          return _this.graphContainer.find(".drawer").removeClass("open");
        }), 1750);
      });
    };

    UserInterface.prototype.initToolbarButton = function(toolName, $allButtons) {
      var $buttonSelector, clickedOnClosedDrawer, tool, toolHasBeenImplemented,
        _this = this;
      $buttonSelector = $allButtons.filter("." + toolName);
      tool = this.pad.tools[toolName];
      clickedOnClosedDrawer = function($buttonSelector) {
        return ($buttonSelector.parent('.drawer') != null) && _.any($buttonSelector.parent('.drawer').not('.open'));
      };
      toolHasBeenImplemented = function($buttonSelector) {
        return $buttonSelector.not('.not-implemented');
      };
      if (tool.modal) {
        $buttonSelector.click(function(event) {
          event.preventDefault();
          if (!_this.pad.enabled) return;
          if (clickedOnClosedDrawer($buttonSelector)) {
            $allButtons.parent('.drawer').removeClass('open');
            return $buttonSelector.removeClass('selected').parent('.drawer').removeClass('selected').addClass('open').children('.tool').removeClass('quiet');
          } else if (toolHasBeenImplemented($buttonSelector) && $buttonSelector.not('.disabled')) {
            _this.pad.setSelectedToolName(toolName);
            _this.pad.deselectAllObjects();
            _this.pad.clearActionPoints();
            $allButtons.not('.key').removeClass('selected').parent('.drawer').removeClass('selected open').children('.tool').removeClass('quiet');
            $buttonSelector.addClass('selected').parent('.drawer').addClass('selected').children('.tool').not("." + toolName).addClass('quiet');
            if (!_.include(['selection', 'no-solution'], toolName)) {
              return _this.pad.removeNoSolution();
            }
          }
        });
      } else {
        $buttonSelector.children('a').click(function(event) {
          event.preventDefault();
          if (!(_this.pad.enabled || toolName === 'key')) return;
          if ($buttonSelector.is('.disabled')) return;
          _this.pad.clearActionPoints();
          return tool.handler.call(_this);
        });
      }
      if ($buttonSelector.is('.not-implemented')) {
        $buttonSelector.children('a').attr('title', 'This feature has not been implemented yet.');
      }
      if (tool["default"]) $buttonSelector.trigger('click');
      if (tool.initiallyDisabled) return $buttonSelector.addClass('disabled');
    };

    UserInterface.prototype.disableToolbarButton = function(buttonClass) {
      return this.graphContainer.find(".toolbar > .tool." + buttonClass).addClass('disabled');
    };

    UserInterface.prototype.enableToolbarButton = function(buttonClass) {
      return this.graphContainer.find(".toolbar > .tool." + buttonClass).removeClass('disabled');
    };

    UserInterface.prototype.selectToolbarButton = function(toolName) {
      if (toolName !== 'key') {
        this.graphContainer.find(".toolbar .tool").not('.key').removeClass('selected').parent('.drawer').removeClass('selected open').children('.tool').removeClass('quiet');
      }
      return this.graphContainer.find(".toolbar .tool." + toolName).addClass('selected').parent('.drawer').addClass('selected').children('.tool').not("." + toolName).addClass('quiet');
    };

    UserInterface.prototype.deselectToolBarButton = function(buttonClass) {
      return this.graphContainer.find(".toolbar .tool." + buttonClass).removeClass('selected');
    };

    UserInterface.prototype.parabolaPointsFromObject = function(object) {
      var arbitraryPoint, vertex;
      vertex = _.find(object.descendants, function(descendant) {
        return descendant.elType === 'vertex';
      });
      arbitraryPoint = _.find(object.descendants, function(descendant) {
        return descendant.elType === 'arbitraryPoint';
      });
      return {
        vertex: vertex,
        arbitraryPoint: arbitraryPoint
      };
    };

    UserInterface.prototype.xAndYAttrFields = function(points) {
      var attrTemplate;
      attrTemplate = _.template("<div class='attr'>\n  <label for=\"<%= objectId %>_point<%= num %>x\">P<%= num %></label>\n  (<input type='number' class='coordinates-editor' value='<%= xValue %>' data-for-point='<%= objectId %>' id='<%= objectId %>_x' name='point<%= num %>x' />,\n  <input type='number' class='coordinates-editor' value='<%= yValue %>' data-for-point='<%= objectId %>' id='<%= objectId %>_y' name='point<%= num %>y' />)\n</div>");
      return _.map([points].flatten(), function(point, index) {
        return attrTemplate({
          objectId: point.id,
          num: index + 1,
          xValue: point.coords.usrCoords[1],
          yValue: point.coords.usrCoords[2]
        });
      }).join('');
    };

    UserInterface.prototype.initLayerPalette = function() {
      this.drawLayerPalette();
      this.wireLayerPalette();
      return this.drawLayerPaletteBlankSlate();
    };

    UserInterface.prototype.showLayerPalette = function() {
      var $layerPalette;
      $layerPalette = this.graphContainer.siblings('.layer-palette');
      if (!$layerPalette.is('.open')) {
        return $layerPalette.find('.toggle').trigger('click');
      }
    };

    UserInterface.prototype.buildLayer = function(object, type) {
      var arbitraryPoint, dashedSolidToggle, description, descriptionTemplate, editor, editorTemplate, endPointToggleTemplate, endPointTogglesTemplate, isDashed, layer, layerTemplate, vertex;
      if (object == null) return;
      this.clearLayerPaletteBlankSlate();
      descriptionTemplate = _.template("<div class='description'><%= objectType %> <%= name %></div>");
      editorTemplate = _.template("<div class='editor'>\n  <%= attrFields %>\n  <%= extras %>\n</div>");
      layerTemplate = _.template("<li class='layer' data-for-object='<%= forObjectId %>'>\n  <%= description %>\n  <%= deleteButton %>\n  <%= editor %>\n</li>");
      endPointToggleTemplate = _.template("<div class='toggles' data-for-point='<%= forPointId %>'>\n  <a class='toggler open <%= openClass %>' href='#'>Toggle Open Endpoint</a>\n  <a class='toggler closed <%= closedClass %>' href='#'>Toggle Closed Endpoint</a>\n</div>");
      endPointTogglesTemplate = _.template("<div class='endpoint-toggles'>\n  <%= point1 %>\n  <%= point2 %>\n</div>");
      dashedSolidToggle = _.template("<div class='property-toggle <%= openClass %>'>\n  <a class='dashed' href='#' data-for-object=\"<%= forPointId %>\">Toggle Dashed</a>\n</div>");
      description = descriptionTemplate({
        objectType: type,
        name: object.id.replace('jxgBoard', '')
      });
      isDashed = function(object) {
        if (object.visProp.dash > 0) return 'on';
      };
      editor = (function() {
        var _ref;
        switch (type) {
          case 'Segment':
          case 'Ray':
            return editorTemplate({
              attrFields: this.xAndYAttrFields([object.point1, object.point2]),
              extras: endPointTogglesTemplate({
                point1: endPointToggleTemplate({
                  forPointId: object.point1.id,
                  openClass: this.pad.isPointOpen(object.point1) ? "on" : void 0,
                  closedClass: !this.pad.isPointOpen(object.point1) ? "on" : void 0
                }),
                point2: type === 'Segment' ? endPointToggleTemplate({
                  forPointId: object.point2.id,
                  openClass: this.pad.isPointOpen(object.point2) ? "on" : void 0,
                  closedClass: !this.pad.isPointOpen(object.point2) ? "on" : void 0
                }) : void 0
              })
            });
          case 'Line':
            return editorTemplate({
              attrFields: this.xAndYAttrFields([object.point1, object.point2]),
              extras: dashedSolidToggle({
                openClass: isDashed(object),
                forPointId: object.id
              })
            });
          case 'Circle':
            return editorTemplate({
              attrFields: this.xAndYAttrFields([object.midpoint, object.point2]),
              extras: dashedSolidToggle({
                openClass: isDashed(object),
                forPointId: object.id
              })
            });
          case 'Point':
            return editorTemplate({
              attrFields: this.xAndYAttrFields(object),
              extras: null
            });
          case 'Vertical Parabola':
          case 'Horizontal Parabola':
            _ref = this.parabolaPointsFromObject(object), vertex = _ref.vertex, arbitraryPoint = _ref.arbitraryPoint;
            return editorTemplate({
              attrFields: this.xAndYAttrFields([vertex, arbitraryPoint]),
              extras: dashedSolidToggle({
                openClass: isDashed(object),
                forPointId: object.id
              })
            });
        }
      }).call(this);
      return layer = layerTemplate({
        description: description,
        deleteButton: "<a href='#' class='delete'>Remove This Layer</a>",
        editor: editor,
        forObjectId: object.id
      });
    };

    UserInterface.prototype.buildLayers = function(objects, type) {
      var layers,
        _this = this;
      layers = _.map(objects, function(object) {
        return _this.buildLayer(object, type);
      });
      return layers.join('');
    };

    UserInterface.prototype.clearAllLayers = function() {
      var $layerPalette;
      $layerPalette = this.graphContainer.siblings(".layer-palette").first();
      $layerPalette.find('.layer-list').html('');
      this.disableToolbarButton('delete');
      this.disableToolbarButton('clear-all');
      return this.drawLayerPaletteBlankSlate();
    };

    UserInterface.prototype.drawLayerPalette = function() {
      var $graphTab, $header, $headerToggle, $layerList, $layerPalette;
      $layerList = jQuery('<ul>').addClass('layer-list');
      $headerToggle = jQuery('<span>').addClass('toggle').html('Toggle Open/Closed');
      $header = jQuery('<h3>').html('Graph Layers').append($headerToggle);
      $graphTab = jQuery('<div>').addClass('graph-tab').append($header, $layerList);
      $layerPalette = jQuery('<div>').addClass('layer-palette').html($graphTab);
      return $layerPalette.insertAfter(this.graphContainer);
    };

    UserInterface.prototype.drawLayerPaletteBlankSlate = function() {
      var $blankSlate, $layerList;
      $layerList = this.graphContainer.siblings('.layer-palette').find('.layer-list');
      if (!_.any($layerList.find('li'))) {
        $blankSlate = "<li class='blank-slate layer'>After you add an object to the graph you can use Graph Layers to view and edit its properties.</li>";
        return $layerList.append($blankSlate);
      }
    };

    UserInterface.prototype.clearLayerPaletteBlankSlate = function() {
      return this.graphContainer.siblings('.layer-palette').find('.blank-slate').remove();
    };

    UserInterface.prototype.toggleLayer = function($layer) {
      return $layer.toggleClass('open').find('.editor').toggle();
    };

    UserInterface.prototype.openLayer = function($layer) {
      return $layer.addClass('open').find('.editor').show();
    };

    UserInterface.prototype.closeLayer = function($layer) {
      return $layer.removeClass('open').find('.editor').hide();
    };

    UserInterface.prototype.wireLayerPalette = function() {
      var $graphTab, $layerList, $layerPalette, hideLayerPalette, showLayerPalette, syncPointWithNewXY, toggleLayerPalette,
        _this = this;
      $layerPalette = this.graphContainer.siblings(".layer-palette").first();
      $graphTab = $layerPalette.children('.graph-tab');
      $layerList = $graphTab.children('.layer-list');
      showLayerPalette = function() {
        return $graphTab.parent('.layer-palette').addClass('open').find('.layer-list').show('blind');
      };
      hideLayerPalette = function() {
        return $layerPalette.removeClass('open').find('.layer-list').delay(200).hide('fast');
      };
      toggleLayerPalette = function() {
        if ($layerPalette.hasClass('open')) {
          return hideLayerPalette();
        } else {
          return showLayerPalette();
        }
      };
      if (!!(__indexOf.call(window, 'ontouchstart') >= 0)) {
        $layerList.touchScroll({
          elastic: false,
          touchTags: ['a'],
          scrollHeight: 444
        });
      }
      $graphTab.find('h3').click(function(event) {
        event.preventDefault();
        return toggleLayerPalette();
      });
      $graphTab.on('click', '.layer > .description', function(event) {
        var $layer, graphObject;
        event.preventDefault();
        $layer = jQuery(event.currentTarget).parent('.layer');
        graphObject = $layer.data().forObject;
        _this.toggleLayer($layer);
        if ($layer.hasClass('open')) {
          return _this.pad.selectObject(_this.findBoardObject(graphObject));
        } else {
          return _this.pad.deselectObject(_this.findBoardObject(graphObject));
        }
      });
      $graphTab.on('click', '.layer > .delete', function(event) {
        var $layer, description, object, objectId;
        event.preventDefault();
        if (!_this.pad.enabled) return;
        $layer = jQuery(event.currentTarget).parent('.layer');
        description = $layer.children('.description').text();
        objectId = $layer.data().forObject;
        object = _this.findBoardObject(objectId);
        if (window.confirm("Are you sure you wish to delete " + description + "?")) {
          $layer.remove();
          return _this.pad.deleteObject(object);
        }
      });
      $graphTab.on('click', '.editor > .property-toggle', function(event) {
        var object, objectId;
        event.preventDefault();
        objectId = jQuery(event.currentTarget).parents('.layer').data('forObject');
        object = _this.findBoardObject(objectId);
        if (_this.pad.isDashed(object)) {
          _this.pad.setSolid(object);
          jQuery(event.currentTarget).removeClass('on');
        } else {
          _this.pad.setDashed(object);
          jQuery(event.currentTarget).addClass('on');
        }
        return _this.pad.updateBoard();
      });
      $graphTab.on('click', '.editor > .endpoint-toggles .toggler', function(event) {
        var $toggle, clickedClosedOff, clickedOpenOn, objectId, openPoint, pointOnBoard;
        event.preventDefault();
        $toggle = jQuery(event.currentTarget);
        $toggle.toggleClass('on').siblings().toggleClass('on');
        clickedOpenOn = $toggle.hasClass('open') && $toggle.hasClass('on');
        clickedClosedOff = $toggle.hasClass('closed') && !$toggle.hasClass('on');
        openPoint = clickedOpenOn || clickedClosedOff;
        objectId = $toggle.parent('.toggles').data().forPoint;
        pointOnBoard = _this.findBoardObject(objectId);
        if (openPoint) {
          return _this.pad.openPoint(pointOnBoard);
        } else {
          return _this.pad.closePoint(pointOnBoard);
        }
      });
      syncPointWithNewXY = function(event) {
        var $coordinate, currentXValue, currentYValue, isXCoordinate, newCoordinates, newValue, point, pointId;
        $coordinate = jQuery(event.currentTarget);
        pointId = jQuery(event.currentTarget).data().forPoint;
        point = _this.findBoardObject(jQuery(event.currentTarget).data().forPoint);
        isXCoordinate = $coordinate.attr('id').match(/_x/);
        newValue = parseFloat($coordinate.val());
        currentXValue = point.coords.usrCoords[1];
        currentYValue = point.coords.usrCoords[2];
        if (isXCoordinate) {
          newCoordinates = [newValue, currentYValue];
          return _this.pad.updatePoint(point, newCoordinates);
        } else {
          newCoordinates = [currentXValue, newValue];
          return _this.pad.updatePoint(point, newCoordinates);
        }
      };
      $graphTab.on('input', '.editor .coordinates-editor', function(event) {
        return syncPointWithNewXY(event);
      });
      $graphTab.on('blur', '.editor .coordinates-editor', function(event) {
        return syncPointWithNewXY(event);
      });
      return $graphTab.on('keydown', '.editor .coordinates-editor', function(event) {
        if (event.keyCode === 13) {
          event.preventDefault();
          return false;
        }
      });
    };

    UserInterface.prototype.buildAndAppendNewLayer = function(object, type) {
      return this.appendLayerToList(this.buildLayer(object, type));
    };

    UserInterface.prototype.removeLayer = function(object) {
      var $layer;
      $layer = this.findLayerByObjectId(object.id);
      if ($layer) $layer.remove();
      return this.drawLayerPaletteBlankSlate();
    };

    UserInterface.prototype.removeButton = function(buttonClass) {
      return this.graphContainer.find(".tool." + buttonClass).remove();
    };

    UserInterface.prototype.findLayerByObjectId = function(objectId) {
      var $layer, $layerPalette;
      $layerPalette = this.graphContainer.siblings(".layer-palette").first();
      $layer = $layerPalette.find('.layer').filter(function() {
        return jQuery(this).data().forObject === objectId;
      });
      if ($layer.length > 0) return $layer.first();
    };

    UserInterface.prototype.findAndUpdateLayer = function(object, type) {
      var $layer, $point1x, $point1y, $point2x, $point2y, arbitraryPoint, point1open, point2open, updatePointFill, updatePointXandY, vertex, _ref;
      updatePointXandY = function($xField, $yField, point) {
        if (!$xField.is(':focus')) $xField.val(point.coords.usrCoords[1]);
        if (!$yField.is(':focus')) return $yField.val(point.coords.usrCoords[2]);
      };
      updatePointFill = function(point, isOpen) {
        var $closedEndpointButton, $openEndpointButton, $pointToggle;
        $pointToggle = $layer.find('.toggles').filter(function() {
          return jQuery(this).data().forPoint === point.id;
        });
        $openEndpointButton = $pointToggle.children('.open');
        $closedEndpointButton = $pointToggle.children('.closed');
        if (isOpen) {
          $openEndpointButton.addClass('on');
          return $closedEndpointButton.removeClass('on');
        } else {
          $openEndpointButton.removeClass('on');
          return $closedEndpointButton.addClass('on');
        }
      };
      if ($layer = this.findLayerByObjectId(object.id)) {
        $point1x = $layer.find("[name='point1x']");
        $point1y = $layer.find("[name='point1y']");
        $point2x = $layer.find("[name='point2x']");
        $point2y = $layer.find("[name='point2y']");
        switch (type) {
          case 'point':
            return updatePointXandY($point1x, $point1y, object);
          case 'circle':
            updatePointXandY($point1x, $point1y, object.midpoint);
            return updatePointXandY($point2x, $point2y, object.point2);
          case 'parabola':
            _ref = this.parabolaPointsFromObject(object), vertex = _ref.vertex, arbitraryPoint = _ref.arbitraryPoint;
            updatePointXandY($point1x, $point1y, vertex);
            return updatePointXandY($point2x, $point2y, arbitraryPoint);
          case 'segment':
            point1open = this.pad.isPointOpen(object.point1);
            point2open = this.pad.isPointOpen(object.point2);
            updatePointXandY($point1x, $point1y, object.point1);
            updatePointXandY($point2x, $point2y, object.point2);
            updatePointFill(object.point1, point1open);
            return updatePointFill(object.point2, point2open);
          default:
            updatePointXandY($point1x, $point1y, object.point1);
            return updatePointXandY($point2x, $point2y, object.point2);
        }
      }
    };

    UserInterface.prototype.update = function() {
      var _this = this; 
      if (_.any(this.pad.state.all()) && this.pad.enabled) {
        this.enableToolbarButton('clear');
        _.each(this.pad.state.points(), function(object) {
          return _this.findAndUpdateLayer(object, 'point');
        });
        _.each(this.pad.state.lines(), function(object) {
          return _this.findAndUpdateLayer(object, 'line');
        });
        _.each(this.pad.state.rays(), function(object) {
          return _this.findAndUpdateLayer(object, 'ray');
        });
        _.each(this.pad.state.segments(), function(object) {
          return _this.findAndUpdateLayer(object, 'segment');
        });
        _.each(this.pad.state.circles(), function(object) {
          return _this.findAndUpdateLayer(object, 'circle');
        });
        _.each(this.pad.state.verticalParabolas(), function(object) {
          return _this.findAndUpdateLayer(object, 'parabola');
        });
        return _.each(this.pad.state.horizontalParabolas(), function(object) {
          return _this.findAndUpdateLayer(object, 'parabola');
        });
      } else {
        return this.disableToolbarButton('clear');
      }
    };

    UserInterface.prototype.appendLayerToList = function(html) {
      return this.graphContainer.parent().find('.layer-list').append(html);
    };

    UserInterface.prototype.findBoardObject = function(objectId) {
      return _.find(this.pad.board.objects, function(object) {
        return object.id === objectId;
      });
    };

    return UserInterface;

  })();

}).call(this);
(function() {

  window.GraphPad || (window.GraphPad = {});

  GraphPad.XmlLoader = (function() {

    function XmlLoader(pad, xmlDataContainerId) {
      var raw_xml;
      this.pad = pad;
      this.stateSelector = "#" + xmlDataContainerId;
      this.stateNode = jQuery(this.stateSelector);
      raw_xml = jQuery.trim(this.stateNode.val());
      this.xml = jQuery(jQuery.parseXML(raw_xml));
    }

    XmlLoader.prototype.isPoint = function(idx, ele) {
      return jQuery(ele).find('t').text() === 'point';
    };

    XmlLoader.prototype.isLine = function(idx, ele) {
      return jQuery(ele).find('t').text() === 'line';
    };

    XmlLoader.prototype.isRay = function(idx, ele) {
      return jQuery(ele).find('t').text() === 'ray';
    };

    XmlLoader.prototype.isSegment = function(idx, ele) {
      return jQuery(ele).find('t').text() === 'segment';
    };

    XmlLoader.prototype.isCircle = function(idx, ele) {
      return jQuery(ele).find('t').text() === 'circle';
    };

    XmlLoader.prototype.isVerticalParabola = function(idx, ele) {
      var $ele, ps, text;
      $ele = jQuery(ele);
      text = $ele.find('t').text();
      ps = $ele.find('ps').text();
      return text === 'parabola' && ps === 'vertical';
    };

    XmlLoader.prototype.isHorizontalParabola = function(idx, ele) {
      var $ele, ps, text;
      $ele = jQuery(ele);
      text = $ele.find('t').text();
      ps = $ele.find('ps').text();
      return text === 'parabola' && ps === 'horizontal';
    };

    XmlLoader.prototype.objects = function() {
      return this.xml.find('os').find('o');
    };

    XmlLoader.prototype.keyObjects = function() {
      return this.xml.find('k').find('o');
    };

    XmlLoader.prototype.floodFills = function() {
      return this.xml.find('fs').find('f');
    };

    XmlLoader.prototype.keyFloodFills = function() {
      return this.xml.find('k').find('f');
    };

    XmlLoader.prototype.noSolutions = function() {
      return this.xml.find('os').find('nosol');
    };

    XmlLoader.prototype.noSolutionInKey = function() {
      return this.xml.find('k').find('nosol');
    };

    XmlLoader.prototype.nodeToHash = function($obj) {
      var attrs;
      attrs = {};
      $obj.children().each(function(idx, ele) {
        return attrs[ele.nodeName] = ele.textContent;
      });
      return attrs;
    };

    XmlLoader.prototype.doWhere = function(filterFunc, $objects, handler) {
      var _this = this;
      return $objects.filter(filterFunc).each(function(idx, ele) {
        var $plottedObject;
        $plottedObject = jQuery(ele);
        return handler(_this.nodeToHash($plottedObject));
      });
    };

    XmlLoader.prototype.findAndCreateFloodFills = function($fills, isKey) {
      var _this = this;
      if ($fills == null) $fills = this.floodFills();
      if (isKey == null) isKey = false;
      return $fills.each(function(idx, ele) {
        var $plottedObject, coords, floodFill, x, y, _ref;
        $plottedObject = jQuery(ele);
        _ref = _this.nodeToHash($plottedObject), x = _ref.x, y = _ref.y;
        coords = new JXG.Coords(JXG.COORDS_BY_USER, [x.toInt(), y.toInt()], _this.pad.board);
        return floodFill = _this.pad.toggleFloodFill(coords, isKey);
      });
    };

    XmlLoader.prototype.findAndCreatePoints = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isPoint, $objects, function(attrs) {
        var point, x1, y1;
        x1 = attrs.x1, y1 = attrs.y1;
        point = _this.pad.createPoint([x1, y1]);
        if (isKey) {
          return _this.pad.decorateForKey(point, 'keyPoint');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(point, "Point");
        }
      });
    };

    XmlLoader.prototype.findAndCreateLines = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isLine, $objects, function(attrs) {
        var dashed, line, point1, point2, s, x1, x2, y1, y2;
        x1 = attrs.x1, y1 = attrs.y1, x2 = attrs.x2, y2 = attrs.y2, s = attrs.s;
        point1 = _this.pad.createPoint([x1, y1]);
        point2 = _this.pad.createPoint([x2, y2]);
        dashed = s === 'dashed';
        line = _this.pad.createLine(point1, point2, dashed);
        if (isKey) {
          _this.pad.decorateForKey(point1, 'keyPoint');
          _this.pad.decorateForKey(point2, 'keyPoint');
          return _this.pad.decorateForKey(line, 'keyLine');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(line, "Line");
        }
      });
    };

    XmlLoader.prototype.findAndCreateRays = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isRay, $objects, function(attrs) {
        var ep1, point1, point2, ray, x1, x2, y1, y2;
        x1 = attrs.x1, y1 = attrs.y1, x2 = attrs.x2, y2 = attrs.y2, ep1 = attrs.ep1;
        point1 = _this.pad.createPoint([x1, y1]);
        if (ep1 === 'open') _this.pad.openPoint(point1);
        point2 = _this.pad.createPoint([x2, y2]);
        ray = _this.pad.createRay(point1, point2);
        if (isKey) {
          _this.pad.decorateForKey(point1, 'keyPoint');
          _this.pad.decorateForKey(point2, 'keyPoint');
          return _this.pad.decorateForKey(ray, 'keyLine');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(ray, "Ray");
        }
      });
    };

    XmlLoader.prototype.findAndCreateSegments = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isSegment, $objects, function(attrs) {
        var ep1, ep2, point1, point2, segment, x1, x2, y1, y2;
        x1 = attrs.x1, y1 = attrs.y1, x2 = attrs.x2, y2 = attrs.y2, ep1 = attrs.ep1, ep2 = attrs.ep2;
        point1 = _this.pad.createPoint([x1, y1]);
        if (ep1 === 'open') _this.pad.openPoint(point1);
        point2 = _this.pad.createPoint([x2, y2]);
        if (ep2 === 'open') _this.pad.openPoint(point2);
        segment = _this.pad.createSegment(point1, point2);
        if (isKey) {
          _this.pad.decorateForKey(point1, 'keyPoint');
          _this.pad.decorateForKey(point2, 'keyPoint');
          return _this.pad.decorateForKey(segment, 'keyLine');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(segment, "Segment");
        }
      });
    };

    XmlLoader.prototype.findAndCreateCircles = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isCircle, $objects, function(attrs) {
        var circle, dashed, point1, point2, s, x1, x2, y1, y2;
        x1 = attrs.x1, y1 = attrs.y1, x2 = attrs.x2, y2 = attrs.y2, s = attrs.s;
        dashed = s === 'dashed';
        point1 = _this.pad.createPoint([x1, y1]);
        point2 = _this.pad.createPoint([x2, y2]);
        circle = _this.pad.createCircle(point1, point2, dashed);
        if (isKey) {
          _this.pad.decorateForKey(point1, 'keyPoint');
          _this.pad.decorateForKey(point2, 'keyPoint');
          return _this.pad.decorateForKey(circle, 'keyCircle');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(circle, "Circle");
        }
      });
    };

    XmlLoader.prototype.findAndCreateVerticalParabolas = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isVerticalParabola, $objects, function(attrs) {
        var dashed, parabola, point, s, vertex, x1, x2, y1, y2;
        x1 = attrs.x1, y1 = attrs.y1, x2 = attrs.x2, y2 = attrs.y2, s = attrs.s;
        dashed = s === 'dashed';
        vertex = _this.pad.createPoint([x1, y1]);
        point = _this.pad.createPoint([x2, y2]);
        parabola = _this.pad.createVerticalParabola(vertex, point, dashed);
        if (isKey) {
          _this.pad.decorateForKey(vertex, 'keyPoint');
          _this.pad.decorateForKey(point, 'keyPoint');
          return _this.pad.decorateForKey(parabola, 'keyParabola');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(parabola, "Vertical Parabola");
        }
      });
    };

    XmlLoader.prototype.findAndCreateHorizontalParabolas = function($objects, isKey) {
      var _this = this;
      if ($objects == null) $objects = this.objects();
      if (isKey == null) isKey = false;
      return this.doWhere(this.isHorizontalParabola, $objects, function(attrs) {
        var dashed, parabola, point, s, vertex, x1, x2, y1, y2;
        x1 = attrs.x1, y1 = attrs.y1, x2 = attrs.x2, y2 = attrs.y2, s = attrs.s;
        dashed = s === 'dashed';
        vertex = _this.pad.createPoint([x1, y1]);
        point = _this.pad.createPoint([x2, y2]);
        parabola = _this.pad.createHorizontalParabola(vertex, point, dashed);
        if (isKey) {
          _this.pad.decorateForKey(vertex, 'keyPoint');
          _this.pad.decorateForKey(point, 'keyPoint');
          return _this.pad.decorateForKey(parabola, 'keyParabola');
        } else {
          return _this.pad.ui.buildAndAppendNewLayer(parabola, "Horizontal Parabola");
        }
      });
    };

    XmlLoader.prototype.findAndCreateNoSolution = function($nosol, isKey) {
      if ($nosol == null) $nosol = this.noSolutions();
      if (isKey == null) isKey = false;
      if ($nosol.length > 0) return this.pad.displayNoSolution(isKey);
    };

    XmlLoader.prototype.boardConfig = function() {
      var config, onlyBoardConfig,
        _this = this;
      onlyBoardConfig = function(idx, ele) {
        return _.include(_.keys(GraphPad.defaultBoardConfig), ele.nodeName);
      };
      config = {};
      this.xml.find('cp').children().filter(onlyBoardConfig).each(function(idx, ele) {
        return config[ele.nodeName] = ele.textContent;
      });
      return config;
    };

    XmlLoader.prototype.load = function() {
      this.findAndCreateLines();
      this.findAndCreateRays();
      this.findAndCreateSegments();
      this.findAndCreateCircles();
      this.findAndCreateVerticalParabolas();
      this.findAndCreateHorizontalParabolas();
      this.findAndCreateFloodFills();
      this.findAndCreatePoints();
      return this.findAndCreateNoSolution();
    };

    XmlLoader.prototype.loadKey = function() {
      if (!_.any(this.keyObjects())) return false;
      this.findAndCreateLines(this.keyObjects(), true);
      this.findAndCreateRays(this.keyObjects(), true);
      this.findAndCreateSegments(this.keyObjects(), true);
      this.findAndCreateCircles(this.keyObjects(), true);
      this.findAndCreateVerticalParabolas(this.keyObjects(), true);
      this.findAndCreateHorizontalParabolas(this.keyObjects(), true);
      this.findAndCreateNoSolution(this.noSolutionInKey(), true);
      this.findAndCreateFloodFills(this.keyFloodFills(), true);
      this.findAndCreatePoints(this.keyObjects(), true);
      return true;
    };

    return XmlLoader;

  })();

}).call(this);
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  window.GraphPad || (window.GraphPad = {});

  GraphPad.XmlSerializer = (function() {

    function XmlSerializer(pad, xmlDataContainerId) {
      this.horizontalParabolaToXml = __bind(this.horizontalParabolaToXml, this);
      this.verticalParabolaToXml = __bind(this.verticalParabolaToXml, this);
      this.circleToXml = __bind(this.circleToXml, this);
      this.segmentToXml = __bind(this.segmentToXml, this);
      this.rayToXml = __bind(this.rayToXml, this);
      this.lineToXml = __bind(this.lineToXml, this);
      this.dashedOrSolid = __bind(this.dashedOrSolid, this);
      this.pointToXml = __bind(this.pointToXml, this);      this.pad = pad;
      this.state = this.pad.state;
      this.stateSelector = "#" + xmlDataContainerId;
      this.stateNode = jQuery(this.stateSelector);
      this.idIterator = 200;
    }

    XmlSerializer.prototype.writeToDom = function() {
      return this.stateNode.val(this.toXml());
    };

    XmlSerializer.prototype.pointStyle = function(point) {
      if (this.pad.isPointOpen(point)) {
        return 'open';
      } else {
        return 'closed';
      }
    };

    XmlSerializer.prototype.pointToXml = function(point) {
      return "<o><id>" + (this.idIterator += 1) + "</id><t>point</t><x1>" + (point.X()) + "</x1><dx1></dx1><y1>" + (point.Y()) + "</y1><dy1></dy1></o>";
    };

    XmlSerializer.prototype.floodFillToXml = function(ff, key) {
      var id;
      id = 100 + key;
      return "<f><id>" + id + "</id><x>" + (ff.X()) + "</x><y>" + (ff.Y()) + "</y></f>";
    };

    XmlSerializer.prototype.dashedOrSolid = function(object) {
      if (this.pad.isDashed(object)) return 'dashed';
      return 'solid';
    };

    XmlSerializer.prototype.lineToXml = function(line) {
      var asXml, first, second, xml,
        _this = this;
      xml = "<o><id>" + (this.idIterator += 1) + "</id><t>line</t><s>" + (_this.dashedOrSolid(line)) + "</s>";
      first = line.point1;
      second = line.point2;
      asXml = function(idx, point) {
        return "<x" + idx + ">" + (point.X()) + "</x" + idx + "><dx" + idx + "></dx" + idx + "><y" + idx + ">" + (point.Y()) + "</y" + idx + "><dy" + idx + "></dy" + idx + ">";
      };
      return "" + xml + (asXml('1', first)) + (asXml('2', second)) + "</o>";
    };

    XmlSerializer.prototype.rayToXml = function(ray) {
      var asXml, first, second, xml,
        _this = this;
      xml = "<o><id>" + (this.idIterator += 1) + "</id><t>ray</t>" + "<s>solid</s>";
      first = ray.point1;
      second = ray.point2;
      asXml = function(idx, point) {
        var pointXml; 
        pointXml = "<x" + idx + ">" + (point.X()) + "</x" + idx + ">";
        pointXml += "<dx" + idx + "></dx" + idx + ">";
        pointXml += "<y" + idx + ">" + (point.Y()) + "</y" + idx + ">";
        pointXml += "<dy" + idx + "></dy" + idx + ">";
        return pointXml;
      };
      return "" + xml + (asXml('1', first)) + "<ep1>" + (this.pointStyle(first)) + "</ep1>" + (asXml('2', second)) + "</o>";
    };

    XmlSerializer.prototype.segmentToXml = function(segment) {
      var asXml, first, second, xml,
        _this = this;
      xml = "<o><id>" + (this.idIterator += 1) + "</id><t>segment</t><s>solid</s>";
      first = segment.point1;
      second = segment.point2;
      asXml = function(idx, point) {
        var pointXml;
        pointXml = "<x" + idx + ">" + (point.X()) + "</x" + idx + ">";
        pointXml += "<dx" + idx + "></dx" + idx + ">";
        pointXml += "<y" + idx + ">" + (point.Y()) + "</y" + idx + ">";
        pointXml += "<dy" + idx + "></dy" + idx + ">";
        pointXml += "<ep" + idx + ">" + (_this.pointStyle(point)) + "</ep" + idx + ">";
        return pointXml;
      };
      return "" + xml + (asXml('1', first)) + (asXml('2', second)) + "</o>";
    };

    XmlSerializer.prototype.circleToXml = function(circle) {
      var asXml, first, second, xml,
        _this = this;
      xml = "<o><id>" + (this.idIterator += 1) + "</id><t>circle</t><s>" + (this.dashedOrSolid(circle)) + "</s>";
      first = circle.center;
      second = circle.point2;
      asXml = function(idx, point) {
        var pointXml;
        pointXml = "<x" + idx + ">" + (point.X()) + "</x" + idx + ">";
        pointXml += "<dx" + idx + "></dx" + idx + ">";
        pointXml += "<y" + idx + ">" + (point.Y()) + "</y" + idx + ">";
        pointXml += "<dy" + idx + "></dy" + idx + ">";
        return pointXml;
      };
      return "" + xml + (asXml('1', first)) + (asXml('2', second)) + "</o>";
    };

    XmlSerializer.prototype.verticalParabolaToXml = function(verticalParabola) {
      var arbitraryPoint, asXml, vertex, xml,
        _this = this;
      xml = "<o><id>" + (this.idIterator += 1) + "</id><t>parabola</t><s>" + (this.dashedOrSolid(verticalParabola)) + "</s><ps>vertical</ps>";
      vertex = _.find(verticalParabola.childElements, function(ele) {
        return ele.elType === 'vertex';
      });
      arbitraryPoint = _.find(verticalParabola.childElements, function(ele) {
        return ele.elType === 'arbitraryPoint';
      });
      asXml = function(idx, point) {
        var pointXml;
        pointXml = "<x" + idx + ">" + (point.X()) + "</x" + idx + ">";
        pointXml += "<dx" + idx + "></dx" + idx + ">";
        pointXml += "<y" + idx + ">" + (point.Y()) + "</y" + idx + ">";
        pointXml += "<dy" + idx + "></dy" + idx + ">";
        return pointXml;
      };
      return "" + xml + (asXml('1', vertex)) + (asXml('2', arbitraryPoint)) + "</o>";
    };

    XmlSerializer.prototype.horizontalParabolaToXml = function(horizontalParabola) {
      var arbitraryPoint, asXml, vertex, xml,
        _this = this;
      xml = "<o><id>" + (this.idIterator += 1) + "</id><t>parabola</t><s>" + (this.dashedOrSolid(horizontalParabola)) + "</s><ps>horizontal</ps>";
      vertex = _.find(horizontalParabola.childElements, function(ele) {
        return ele.elType === 'vertex';
      });
      arbitraryPoint = _.find(horizontalParabola.childElements, function(ele) {
        return ele.elType === 'arbitraryPoint';
      });
      asXml = function(idx, point) {
        var pointXml;
        pointXml = "<x" + idx + ">" + (point.X()) + "</x" + idx + ">";
        pointXml += "<dx" + idx + "></dx" + idx + ">";
        pointXml += "<y" + idx + ">" + (point.Y()) + "</y" + idx + ">";
        pointXml += "<dy" + idx + "></dy" + idx + ">";
        return pointXml;
      };
      return "" + xml + (asXml('1', vertex)) + (asXml('2', arbitraryPoint)) + "</o>";
    };

    XmlSerializer.prototype.propertiesToXml = function() {
      var properties,
        _this = this;
      properties = [];
      _.each(this.pad.boardConfig, function(value, key) {
        if (!_.isFunction(value)) {
          return properties.push("<" + key + ">" + value + "</" + key + ">");
        }
      });
      if (this.state.hasNoSolution()) properties.push("<nosol />");
      return properties;
    };

    XmlSerializer.prototype.toXml = function() {
      var floodFillsAsXml, graphObjectsAsXml, propertesAsXml, serializedGraphObjects;
      serializedGraphObjects = [];
      serializedGraphObjects.push(_.map(this.state.points(), this.pointToXml));
      serializedGraphObjects.push(_.map(this.state.lines(), this.lineToXml));
      serializedGraphObjects.push(_.map(this.state.rays(), this.rayToXml));
      serializedGraphObjects.push(_.map(this.state.segments(), this.segmentToXml));
      serializedGraphObjects.push(_.map(this.state.circles(), this.circleToXml));
      serializedGraphObjects.push(_.map(this.state.verticalParabolas(), this.verticalParabolaToXml));
      serializedGraphObjects.push(_.map(this.state.horizontalParabolas(), this.horizontalParabolaToXml));
      serializedGraphObjects = _.reject(serializedGraphObjects, function(array) {
        return array.length === 0;
      });
      graphObjectsAsXml = _.map(serializedGraphObjects, function(array) {
        return array.join('\n ');
      });
      floodFillsAsXml = _.map(this.state.floodFills(), this.floodFillToXml);
      propertesAsXml = this.propertiesToXml().join('\n');
      return "<?xml version=\"1.0\"?>\n<cp>\n  " + propertesAsXml + "\n  <os>\n    " + (graphObjectsAsXml.join('\n  ')) + "\n  </os>\n  <fs>\n    " + (floodFillsAsXml.join('\n ')) + "\n  </fs>\n</cp>";
    };

    return XmlSerializer;

  })();

}).call(this);
(function() {
  var defaultStrokeColor, defaultStrokeWidth;

  window.GraphPad || (window.GraphPad = {});

  JXG.Options.renderer = 'canvas';

  JXG.Options.pan = false;

  JXG.Options.layer['grid'] = 9;

  JXG.Options.layer['point'] = 10;

  JXG.Options.layer['image'] = 12;

  JXG.Options.layer['keyCircle'] = 13;

  JXG.Options.layer['keyLine'] = 14;

  JXG.Options.layer['keyParabola'] = 15;

  JXG.Options.layer['keyPoint'] = 16;

  JXG.Options.layer['keyFloodFill'] = 17;

  JXG.Options.layer['axis'] = 18;

  JXG.Options.layer['wgrid'] = 19;

  defaultStrokeColor = '#010100';

  defaultStrokeWidth = 4;

  JXG.Options.line.strokeColor = defaultStrokeColor;

  JXG.Options.line.strokeWidth = defaultStrokeWidth;

  JXG.Options.circle.strokeColor = defaultStrokeColor;

  JXG.Options.circle.strokeWidth = defaultStrokeWidth;

  JXG.Options.circle.lineWidth = defaultStrokeWidth;

  JXG.Options.curve.strokeColor = defaultStrokeColor;

  JXG.Options.curve.strokeWidth = defaultStrokeWidth;

  JXG.Options.point.strokeColor = defaultStrokeColor;

  JXG.Options.point.fillColor = defaultStrokeColor;

  JXG.Options.point.openFillColor = '#ffffff';

  GraphPad.dashedLineOptions = {
    bezierDashPattern: [8, 4],
    lineDashPattern: [8, 4]
  };

  GraphPad.fillOptions = {
    targetColorHex: defaultStrokeColor,
    targetColorRGB: [0x00, 0x00, 0x00, 0x00],
    keyFillColorRGB: [88, 179, 73, 70],
    fillGapColorRGBA: "rgba(240, 240, 240, 240)"
  };

  GraphPad.pointOptions = {
    face: 'o',
    size: 2,
    withLabel: false
  };

  GraphPad.boardOptions = {
    boundingbox: [-10, 10, 10, -10],
    axis: false,
    unitX: 1,
    unitY: 1,
    showCopyright: false,
    showNavigation: false,
    reducedUpdate: true,
    keyStrokeColor: "#58b349"
  };

  GraphPad.gridOptions = {
    strokeColorHex: '#C5EDFF',
    strokeColorRgb: [0xC5, 0xED, 0xFF]
  };

  GraphPad.defaultBoardConfig = {
    axisPadding: function(axis) {
      return ((parseFloat(this[axis + 'max']) - parseFloat(this[axis + 'min'])) * 0.06);
    },
    xmin: -10,
    minValueOnTheXAxis: function() {
      return parseFloat(this.xmin) - this.axisPadding('x');
    },
    xmax: 10,
    maxValueOnTheXAxis: function() {
      return parseFloat(this.xmax) + this.axisPadding('x');
    },
    ymin: -10,
    minValueOnTheYAxis: function() {
      return parseFloat(this.ymin) - this.axisPadding('y');
    },
    ymax: 10,
    maxValueOnTheYAxis: function() {
      return parseFloat(this.ymax) + this.axisPadding('y');
    },
    xav: true,
    xAxisVisible: function() {
      return JXG.str2Bool(this.xav);
    },
    yav: true,
    yAxisVisible: function() {
      return JXG.str2Bool(this.yav);
    },
    xgv: true,
    horizontalGridlinesVisible: function() {
      return JXG.str2Bool(this.xgv);
    },
    ygv: true,
    verticalGridlinesVisible: function() {
      return JXG.str2Bool(this.ygv);
    },
    xvv: true,
    valuesVisibleOnXAxis: function() {
      return JXG.str2Bool(this.xvv);
    },
    yvv: true,
    valuesVisibleOnYAxis: function() {
      return JXG.str2Bool(this.yvv);
    },
    xgs: 1,
    horizontalGridlineScale: function() {
      return parseFloat(this.xgs);
    },
    ygs: 1,
    verticalGridlineScale: function() {
      return parseFloat(this.ygs);
    },
    xvs: 1,
    xAxisTickScale: function() {
      return parseFloat(this.xvs);
    },
    yvs: 1,
    yAxisTickScale: function() {
      return parseFloat(this.yvs);
    },
    xss: 1,
    horizontalSnapScale: function() {
      if (this.horizontalCursorSnappingEnabled()) {
        return parseFloat(this.xss);
      } else {
        return 0.00001;
      }
    },
    yss: 1,
    verticalSnapScale: function() {
      if (this.verticalCursorSnappingEnabled()) {
        return parseFloat(this.yss);
      } else {
        return 0.00001;
      }
    },
    xse: true,
    horizontalCursorSnappingEnabled: function() {
      return JXG.str2Bool(this.xse);
    },
    yse: true,
    verticalCursorSnappingEnabled: function() {
      return JXG.str2Bool(this.yse);
    }
  };

}).call(this);
