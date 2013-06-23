(function (root) {

  var _ = root._ || require('../vendor/underscore');

  var QUAD_TREE_CACHE = {};
  var ALIVE = DEAD = void 0;
  var ID = 100;

  function Cell (id) {
    if (id === 0) {
      if (DEAD) return DEAD;
      if (!(this instanceof Cell)) return new Cell(id);
      DEAD = this;
    }
    else if (id === 1) {
      if (ALIVE) return ALIVE;
      if (!(this instanceof Cell)) return new Cell(id);
      ALIVE = this;
    }
    this.id = id;
    this.generation = 0;
    this.population = id;
  }

  _.extend(Cell.prototype, {

    flip: function (offset) {
      return Cell(1 - this.id);
    },

    emptyCopy: function () {
      return Cell(0);
    },

    resizeTo: function (generation) {
      return generation === 0
             ? this
             : new QuadTree([this, this, this, this]).resizeTo(generation);
    }

  });

  function QuadTree (nw_ne_se_sw) {
    if (!(this instanceof QuadTree)) return new QuadTree(nw_ne_se_sw);

    if(!_.all(nw_ne_se_sw, function (child) { return child instanceof QuadTree || child instanceof Cell; })) throw "BAD";

    var container = QUAD_TREE_CACHE[nw_ne_se_sw[0].id] || (QUAD_TREE_CACHE[nw_ne_se_sw[0].id] = {});
        container = container[nw_ne_se_sw[1].id] || (container[nw_ne_se_sw[1].id] = {});
        container = container[nw_ne_se_sw[2].id] || (container[nw_ne_se_sw[2].id] = {});

    return container[nw_ne_se_sw[3].id] || (
      this.id = ++ID,
      this.children = nw_ne_se_sw,
      this.population = _.reduce(_.pluck(nw_ne_se_sw, 'population'), function (x, y) { return x + y; }, 0),
      this.generation = nw_ne_se_sw[0].generation + 1,
      container[nw_ne_se_sw[3].id] = this
    );
  }

  _.extend(QuadTree.prototype, {

    emptyCopy: function () {
      var emptyChildCopy = this.nw().emptyCopy();
      return new QuadTree([emptyChildCopy, emptyChildCopy, emptyChildCopy, emptyChildCopy]);
    },

    double: function () {
      var emptyChildCopy = this.nw().emptyCopy();
      return new QuadTree([
        new QuadTree([emptyChildCopy, emptyChildCopy, this.nw(), emptyChildCopy]),
        new QuadTree([emptyChildCopy, emptyChildCopy, emptyChildCopy, this.ne()]),
        new QuadTree([this.se(), emptyChildCopy, emptyChildCopy, emptyChildCopy]),
        new QuadTree([emptyChildCopy, this.sw(), emptyChildCopy, emptyChildCopy])
      ]);
    },

    nw: function () { return this.children[0]; },

    ne: function () { return this.children[1]; },

    se: function () { return this.children[2]; },

    sw: function () { return this.children[3]; },

    nn: function () {
      return new QuadTree([
        this.nw().ne(),
        this.ne().nw(),
        this.ne().sw(),
        this.nw().se()
      ]);
    },

    ee: function () {
      return new QuadTree([
        this.ne().sw(),
        this.ne().se(),
        this.se().ne(),
        this.se().nw()
      ]);
    },

    ss: function () {
      return new QuadTree([
        this.sw().ne(),
        this.se().nw(),
        this.se().sw(),
        this.sw().se()
      ]);
    },

    ww: function () {
      return new QuadTree([
        this.nw().sw(),
        this.nw().se(),
        this.sw().ne(),
        this.sw().nw()
      ]);
    },

    cc: function () {
      return new QuadTree([
        this.nw().se(),
        this.ne().sw(),
        this.se().nw(),
        this.sw().ne()
      ]);
    },

    flip: function (offset) {
      var x = offset.x,
          y = offset.y,
          grandchildSize,
          childSize;

      if (this.generation > 2) {
        grandchildSize = Math.pow(2, this.generation - 2);
        childSize = grandchildSize * 2;
        if (x > childSize) throw "Wrong! " + x + " > " + childSize;
        if (y > childSize) throw "Wrong! " + y + " > " + childSize;
        if (x === 0 || y === 0) throw "Zero";
      }
      else if (this.generation === 2) {
        grandchildSize = 1;
        childSize = 2;
        if (x > childSize) throw "Wrong! " + x + " > " + childSize;
        if (y > childSize) throw "Wrong! " + y + " > " + childSize;
        if (x === 0 || y === 0) throw "Zero";
      }
      else if (this.generation === 1) {
        grandchildSize = 1;
        childSize = 1;
        if (x > childSize) throw "Wrong! " + x + " > " + childSize;
        if (y > childSize) throw "Wrong! " + y + " > " + childSize;
        if (x === 0 || y === 0) throw "Zero";
      }
      else {
        grandchildSize = 0;
      }

      if (x < 0 && y < 0) {
        return new QuadTree([
          this.nw().flip({
            x: removeZero(x + grandchildSize),
            y: removeZero(y + grandchildSize)
          }),
          this.ne(),
          this.se(),
          this.sw()
        ]);
      }
      else if (x > 0 && y < 0) {
        return new QuadTree([
          this.nw(),
          this.ne().flip({
            x: removeZero(x - 1 - grandchildSize),
            y: removeZero(y + grandchildSize)
          }),
          this.se(),
          this.sw()
        ]);
      }
      else if (x > 0 && y > 0) {
        return new QuadTree([
          this.nw(),
          this.ne(),
          this.se().flip({
            x: removeZero(x - 1 - grandchildSize),
            y: removeZero(y - 1 - grandchildSize)
          }),
          this.sw()
        ]);
      }
      else if (x < 0 && y > 0) {
        return new QuadTree([
          this.nw(),
          this.ne(),
          this.se(),
          this.sw().flip({
            x: removeZero(x + grandchildSize),
            y: removeZero(y - 1 - grandchildSize)
          })
        ]);
      }
      else throw "unhandled"

      //////////

      function removeZero (n) {
        return n < 0
               ? n
               : n + 1;
      }
    },

    resizeTo: function (generation) {
      var resized = this;
      while (resized.generation < generation) {
        resized = new QuadTree([resized, resized, resized, resized]);
      }
      return resized;
    },
    
    trimmed: function () {
      var cc;
      
      if (this.generation === 1) {
        return this;
      }
      else {
        cc = this.cc();
        if (cc.population === this.population) {
          return cc.trimmed();
        }
        else return this;
      }
    }

  });

  _.extend(root, {
    QuadTree: QuadTree,
    Cell: Cell
  });

})(this);