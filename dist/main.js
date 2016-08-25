(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var vShader = "#define GLSLIFY 1\n\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nvarying vec2 vTextureCoord;\n\nuniform mat3 otherMatrix;\nvarying vec2 vMaskCoord;\n  \n  void main(void)\n  {\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n  }";
var fShader = "// \n// --------\n// Uniforms\n// --------\n// \n// 1) (vec2) vidDimensions \n//   - dimensions of the FULL video texture \n//     (including top RGB panel and bottom Alpha panel)\n// \n// 2) (float) spriteAlpha\n//   - the current alpha of the alphaVideoSprite - need to\n//     multiply the computed alpha by this to get the actual\n//     alpha (NOTE: this is only important if video alpha is \n//     NOT `0` or `1`).\n// \n// 2) (float) yOffset \n//   - alpha offset from y midpoint (height / 2.0). useful if\n//      RGB panel and Alpha panel in are different heights\n//      and also for debugging.\n// \n// 3) (sampler2D) uSampler\n//   - Texture of the PIXI sprite (video) we are applying the filter to. \n//     This is passed in by PIXI.\n// \n// 4) (sampler2D) mask \n//   - Used to get alpha value. Basically the same as `uSampler`.\n//     the issue with JUST using `uSampler`, however, is that when\n//     the Alpha panel overflows the PIXI container (even if we can't\n//     see it), it won't render properly. Thus it seems we need to \n//     pass it in again, as a full, uncropped texture.\n// \n// \n// TODO\n// - Use STPQ (texture coord syntax) for accessing textures ??\n// \n// NOTES\n// - Final post in this thread might be useful:\n//   https://github.com/pixijs/pixi.js/issues/1977\n//  \n\nprecision lowp float;\n#define GLSLIFY 1\n\nvarying vec2 vTextureCoord;\nvarying vec2 vMaskCoord;\nvarying vec4 vColor;\n\nuniform vec2 vidDimensions;\nuniform float spriteAlpha;\nuniform float yOffset;\nuniform sampler2D uSampler;\nuniform sampler2D mask;\n\nvoid main(void)\n{\n\n  vec2 onePixel = vec2(1.0 / vidDimensions);\n\n  float offsetHeight = yOffset + vidDimensions.y;\n\n  float filterHeight = offsetHeight * onePixel.y;\n  float halfHeight = filterHeight / 2.0;\n\n  float alphaPixelY = vTextureCoord.y + (halfHeight * onePixel.y);\n  vec2 alphaPixel = vec2(vTextureCoord.x, alphaPixelY);\n\n  vec4 colorPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));\n  vec4 alphaPx = texture2D(mask, vec2(vMaskCoord.x, vMaskCoord.y + halfHeight));\n\n  float alpha = alphaPx.r * spriteAlpha;\n\n  // // check clip! this will stop the mask bleeding out from the edges\n  // // might not need this after all\n  // vec2 text = abs( vMaskCoord - 0.5 );\n  // text = step(0.5, text);\n  // float clip = 1.0 - max(text.y, text.x);\n\n  // alpha *= clip;\n\n  /**\n   * pixel alpha is based on Y position (top is `0`, bottom is `1`)\n   */\n  // float pctDown = vTextureCoord.y / filterHeight;\n  // color *= pctDown;\n  // gl_FragColor = vec4(colorPx.rgb, pctDown);\n\n  /**\n   * just the video in it's original state\n   */\n  // gl_FragColor = colorPx;\n  \n  /**\n   * just show the alpha half\n   */\n  // gl_FragColor = alphaPx;\n  \n  /**\n   * actual working version\n   */\n  gl_FragColor = vec4(colorPx.rgb * alpha, alpha);\n}";

/**
 * The VideoMaskFilter class
 *
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI
 * @param sprite {PIXI.Sprite} the target sprite
 */
function VideoMaskFilter(maskedSprite, maskSprite) {

  var maskMatrix = new PIXI.Matrix();

  PIXI.Filter.call(this, vShader, fShader);

  this.padding = 0;

  maskSprite.renderable = false;

  this.maskedSprite = maskedSprite;
  this.maskSprite = maskSprite;
  this.maskMatrix = maskMatrix;

  this.setDimensions();

  // this.yOffset = -23;
}
VideoMaskFilter.prototype = Object.create(PIXI.Filter.prototype);
VideoMaskFilter.prototype.constructor = VideoMaskFilter;
module.exports = VideoMaskFilter;

/**
 * Applies the filter
 */
VideoMaskFilter.prototype.apply = function (filterManager, input, output) {

  var maskSprite = this.maskSprite;

  this.uniforms.mask = maskSprite._texture;

  var otherMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, maskSprite);

  this.uniforms.otherMatrix = otherMatrix;

  // draw the filter...
  filterManager.applyFilter(this, input, output);
};

/**
 * TODO: test if this actually is doing anything
 * (it seems as if giving the vidDimensions a value of `0` 
 * breaks things but passing arbitrary values in also seems to work...)
 */
VideoMaskFilter.prototype.setDimensions = function () {
  var vidDimensions = this.uniforms.vidDimensions;
  vidDimensions[0] = this.maskedSprite.width;
  vidDimensions[1] = this.maskedSprite.height * 2;
};

Object.defineProperties(VideoMaskFilter.prototype, {

  spriteAlpha: {
    get: function get() {
      return this.uniforms.spriteAlpha;
    },
    set: function set(value) {
      this.uniforms.spriteAlpha = value;
    }
  },

  /**
   * TEST
   */
  yOffset: {
    get: function get() {
      return this.uniforms.yOffset;
    },
    set: function set(value) {
      this.uniforms.yOffset = value;
    }
  }

});

module.exports = VideoMaskFilter;

},{}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _set = function set(object, property, value, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent !== null) { set(parent, property, value, receiver); } } else if ("value" in desc && desc.writable) { desc.value = value; } else { var setter = desc.set; if (setter !== undefined) { setter.call(receiver, value); } } return value; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var VideoMaskFilter = require('./VideoMaskFilter');

var AlphaVideoSprite = function (_PIXI$Sprite) {
  _inherits(AlphaVideoSprite, _PIXI$Sprite);

  function AlphaVideoSprite(videoFullTexture, filterPadding, autoUpdateVideoTexture) {
    _classCallCheck(this, AlphaVideoSprite);

    // set pixi / dom elements
    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AlphaVideoSprite).call(this));

    _this._fullTexture = videoFullTexture;
    _this._srcEl = _this._fullTexture.baseTexture.source;

    // set whether the baseTexture updates in it's on RAF loop or
    // if we should use this class' update method to update it
    // from some external loop (probably a `main loop`)
    autoUpdateVideoTexture = autoUpdateVideoTexture || false;
    _this._fullTexture.baseTexture.autoUpdate = autoUpdateVideoTexture;

    // make sure it loops
    _this._srcEl.loop = true;

    // actual alpha value
    // (accessed by `alpha` getter / setter)
    _this._alpha = 1;

    _this.setup(autoUpdateVideoTexture);
    _this.setFilter(filterPadding);
    _this.shimScaleCallback();
    return _this;
  }

  _createClass(AlphaVideoSprite, [{
    key: 'setup',
    value: function setup() {

      var newWidth = this.srcWidth;
      var newHeight = this.srcHeight / 2;

      // set this sprite's texture
      this.texture = new PIXI.Texture(this._fullTexture, new PIXI.Rectangle(0, 0, newWidth, newHeight));

      // set mask texture
      this.maskTexture = new PIXI.Texture(this._fullTexture, new PIXI.Rectangle(0, newHeight, newWidth, newHeight));

      // create mask sprite and add as child of this sprite
      this.maskSprite = new PIXI.Sprite(this.maskTexture);
      this.addChild(this.maskSprite);
    }
  }, {
    key: 'listen',
    value: function listen() {}
  }, {
    key: 'setFilter',
    value: function setFilter(filterPadding) {
      var filter = new VideoMaskFilter(this, this.maskSprite);

      if (filterPadding) filter.padding = filterPadding;

      this.filter = filter;
      this.filters = [this.filter];

      this.alpha = this._alpha;

      return filter;
    }
  }, {
    key: 'removeFilter',
    value: function removeFilter() {
      var filter = this.sprite.filter;

      this.filters = null;
      this.filter = null;

      return filter;
    }

    // 
    // Should only use this if not using `autoUpdate`
    // (see constructor's `autoUpdateVideoTexture` parameter)
    // 

  }, {
    key: 'update',
    value: function update() {
      this._fullTexture.baseTexture.update();
    }

    // 
    // kinda hacky but this allows us
    // to be notified when the width / height / scale
    // changes so we can modify the filter dimensions to
    // reflect that change
    // 
    // (see `ObservablePoint.js` and `TransformStatic.js`s
    // `onChange` method in the PIXI src)
    // 

  }, {
    key: 'shimScaleCallback',
    value: function shimScaleCallback() {

      var spriteScope = this;
      var scaleScope = this.scale.scope;

      var oldCB = this.scale.cb;

      var newCB = function newCB() {
        oldCB.call(scaleScope);

        // add stuff here if needed
        spriteScope.filter.setDimensions();
      };

      this.scale.cb = newCB;
    }

    // 
    // override PIXI.Sprite's `width` & `height` getters & setters
    // 
    // see:
    // - http://stackoverflow.com/questions/28950760/override-a-setter-and-the-getter-must-also-be-overridden
    // - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor
    //

  }, {
    key: 'width',
    get: function get() {
      return _get(Object.getPrototypeOf(AlphaVideoSprite.prototype), 'width', this);
    },
    set: function set(value) {
      //
      // do stuff here?
      // 
      _set(Object.getPrototypeOf(AlphaVideoSprite.prototype), 'width', value, this);
    }
  }, {
    key: 'height',
    get: function get() {
      return _get(Object.getPrototypeOf(AlphaVideoSprite.prototype), 'height', this);
    },
    set: function set(value) {
      //
      // do stuff here?
      //  
      _set(Object.getPrototypeOf(AlphaVideoSprite.prototype), 'height', value, this);
    }
  }, {
    key: 'alpha',
    get: function get() {
      return this._alpha;
    },
    set: function set(value) {
      if (this.filter) {
        this.filter.spriteAlpha = value;
      }
      this._alpha = value;
    }

    // 
    // for easier access to w & h
    // 

  }, {
    key: 'srcWidth',
    get: function get() {
      return this._srcEl.videoWidth;
    }
  }, {
    key: 'srcHeight',
    get: function get() {
      return this._srcEl.videoHeight;
    }
  }]);

  return AlphaVideoSprite;
}(PIXI.Sprite);

module.exports = AlphaVideoSprite;

},{"./VideoMaskFilter":1}],3:[function(require,module,exports){
(function (global){
'use strict';

var AlphaVideoSprite = require('./AlphaVideoSprite');

module.exports = global.PIXI.AlphaVideoSprite = AlphaVideoSprite;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./AlphaVideoSprite":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9WaWRlb01hc2tGaWx0ZXIvaW5kZXguanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9pbmRleC5qcyIsInNvdXJjZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUlBLElBQUksVUFBVSwwYUFBZDtBQUNBLElBQUksVUFBVSxvekZBQWQ7O0FBR0E7Ozs7Ozs7O0FBUUEsU0FBUyxlQUFULENBQXlCLFlBQXpCLEVBQXVDLFVBQXZDLEVBQW1EOztBQUUvQyxNQUFJLGFBQWEsSUFBSSxLQUFLLE1BQVQsRUFBakI7O0FBRUEsT0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFqQixFQUFzQixPQUF0QixFQUErQixPQUEvQjs7QUFFQSxPQUFLLE9BQUwsR0FBZSxDQUFmOztBQUVBLGFBQVcsVUFBWCxHQUF3QixLQUF4Qjs7QUFFQSxPQUFLLFlBQUwsR0FBb0IsWUFBcEI7QUFDQSxPQUFLLFVBQUwsR0FBa0IsVUFBbEI7QUFDQSxPQUFLLFVBQUwsR0FBa0IsVUFBbEI7O0FBRUEsT0FBSyxhQUFMOztBQUVBO0FBQ0g7QUFDRCxnQkFBZ0IsU0FBaEIsR0FBNEIsT0FBTyxNQUFQLENBQWMsS0FBSyxNQUFMLENBQVksU0FBMUIsQ0FBNUI7QUFDQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsV0FBMUIsR0FBd0MsZUFBeEM7QUFDQSxPQUFPLE9BQVAsR0FBaUIsZUFBakI7O0FBRUE7OztBQUdBLGdCQUFnQixTQUFoQixDQUEwQixLQUExQixHQUFrQyxVQUFTLGFBQVQsRUFBd0IsS0FBeEIsRUFBK0IsTUFBL0IsRUFBdUM7O0FBR3ZFLE1BQUksYUFBYSxLQUFLLFVBQXRCOztBQUVBLE9BQUssUUFBTCxDQUFjLElBQWQsR0FBcUIsV0FBVyxRQUFoQzs7QUFFQSxNQUFJLGNBQWMsY0FBYyxxQkFBZCxDQUNoQixLQUFLLFVBRFcsRUFDQyxVQURELENBQWxCOztBQUdBLE9BQUssUUFBTCxDQUFjLFdBQWQsR0FBNEIsV0FBNUI7O0FBRUM7QUFDRCxnQkFBYyxXQUFkLENBQTBCLElBQTFCLEVBQWdDLEtBQWhDLEVBQXVDLE1BQXZDO0FBQ0QsQ0FkRDs7QUFnQkE7Ozs7O0FBS0EsZ0JBQWdCLFNBQWhCLENBQTBCLGFBQTFCLEdBQTBDLFlBQVc7QUFDbkQsTUFBSSxnQkFBZ0IsS0FBSyxRQUFMLENBQWMsYUFBbEM7QUFDQSxnQkFBYyxDQUFkLElBQW1CLEtBQUssWUFBTCxDQUFrQixLQUFyQztBQUNBLGdCQUFjLENBQWQsSUFBbUIsS0FBSyxZQUFMLENBQWtCLE1BQWxCLEdBQTJCLENBQTlDO0FBQ0QsQ0FKRDs7QUFNQSxPQUFPLGdCQUFQLENBQXdCLGdCQUFnQixTQUF4QyxFQUFtRDs7QUFFL0MsZUFBYTtBQUNYLFNBQUssZUFBVztBQUNkLGFBQU8sS0FBSyxRQUFMLENBQWMsV0FBckI7QUFDRCxLQUhVO0FBSVgsU0FBSyxhQUFTLEtBQVQsRUFBZ0I7QUFDbkIsV0FBSyxRQUFMLENBQWMsV0FBZCxHQUE0QixLQUE1QjtBQUNEO0FBTlUsR0FGa0M7O0FBVy9DOzs7QUFHQSxXQUFTO0FBQ1AsU0FBSyxlQUFXO0FBQ2QsYUFBTyxLQUFLLFFBQUwsQ0FBYyxPQUFyQjtBQUNELEtBSE07QUFJUCxTQUFLLGFBQVMsS0FBVCxFQUFnQjtBQUNuQixXQUFLLFFBQUwsQ0FBYyxPQUFkLEdBQXdCLEtBQXhCO0FBQ0Q7QUFOTTs7QUFkc0MsQ0FBbkQ7O0FBeUJBLE9BQU8sT0FBUCxHQUFpQixlQUFqQjs7O0FDN0ZBOzs7Ozs7Ozs7Ozs7OztBQUVBLElBQU0sa0JBQWtCLFFBQVEsbUJBQVIsQ0FBeEI7O0lBR00sZ0I7OztBQUNKLDRCQUFZLGdCQUFaLEVBQThCLGFBQTlCLEVBQTZDLHNCQUE3QyxFQUFxRTtBQUFBOztBQUluRTtBQUptRTs7QUFLbkUsVUFBSyxZQUFMLEdBQW9CLGdCQUFwQjtBQUNBLFVBQUssTUFBTCxHQUFjLE1BQUssWUFBTCxDQUFrQixXQUFsQixDQUE4QixNQUE1Qzs7QUFFQTtBQUNBO0FBQ0E7QUFDQSw2QkFBeUIsMEJBQTBCLEtBQW5EO0FBQ0EsVUFBSyxZQUFMLENBQWtCLFdBQWxCLENBQThCLFVBQTlCLEdBQTJDLHNCQUEzQzs7QUFFQTtBQUNBLFVBQUssTUFBTCxDQUFZLElBQVosR0FBbUIsSUFBbkI7O0FBRUE7QUFDQTtBQUNBLFVBQUssTUFBTCxHQUFjLENBQWQ7O0FBRUEsVUFBSyxLQUFMLENBQVcsc0JBQVg7QUFDQSxVQUFLLFNBQUwsQ0FBZSxhQUFmO0FBQ0EsVUFBSyxpQkFBTDtBQXZCbUU7QUF3QnBFOzs7OzRCQUVPOztBQUVOLFVBQUksV0FBVyxLQUFLLFFBQXBCO0FBQ0EsVUFBSSxZQUFZLEtBQUssU0FBTCxHQUFpQixDQUFqQzs7QUFFQTtBQUNBLFdBQUssT0FBTCxHQUFlLElBQUksS0FBSyxPQUFULENBQ2QsS0FBSyxZQURTLEVBQ0ssSUFBSSxLQUFLLFNBQVQsQ0FBbUIsQ0FBbkIsRUFBc0IsQ0FBdEIsRUFBeUIsUUFBekIsRUFBbUMsU0FBbkMsQ0FETCxDQUFmOztBQUdBO0FBQ0EsV0FBSyxXQUFMLEdBQW1CLElBQUksS0FBSyxPQUFULENBQ2xCLEtBQUssWUFEYSxFQUNDLElBQUksS0FBSyxTQUFULENBQW1CLENBQW5CLEVBQXNCLFNBQXRCLEVBQWlDLFFBQWpDLEVBQTJDLFNBQTNDLENBREQsQ0FBbkI7O0FBR0E7QUFDQSxXQUFLLFVBQUwsR0FBa0IsSUFBSSxLQUFLLE1BQVQsQ0FBZ0IsS0FBSyxXQUFyQixDQUFsQjtBQUNBLFdBQUssUUFBTCxDQUFjLEtBQUssVUFBbkI7QUFFRDs7OzZCQUVRLENBRVI7Ozs4QkFFUyxhLEVBQWU7QUFDdkIsVUFBSSxTQUFTLElBQUksZUFBSixDQUFvQixJQUFwQixFQUEwQixLQUFLLFVBQS9CLENBQWI7O0FBRUEsVUFBSSxhQUFKLEVBQ0UsT0FBTyxPQUFQLEdBQWlCLGFBQWpCOztBQUVGLFdBQUssTUFBTCxHQUFjLE1BQWQ7QUFDQSxXQUFLLE9BQUwsR0FBZSxDQUFDLEtBQUssTUFBTixDQUFmOztBQUVBLFdBQUssS0FBTCxHQUFhLEtBQUssTUFBbEI7O0FBRUEsYUFBTyxNQUFQO0FBQ0Q7OzttQ0FFYztBQUNiLFVBQUksU0FBUyxLQUFLLE1BQUwsQ0FBWSxNQUF6Qjs7QUFFQSxXQUFLLE9BQUwsR0FBZSxJQUFmO0FBQ0EsV0FBSyxNQUFMLEdBQWMsSUFBZDs7QUFFQSxhQUFPLE1BQVA7QUFDRDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTs7Ozs2QkFDUztBQUNQLFdBQUssWUFBTCxDQUFrQixXQUFsQixDQUE4QixNQUE5QjtBQUNEOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozt3Q0FDb0I7O0FBRWxCLFVBQUksY0FBYyxJQUFsQjtBQUNBLFVBQUksYUFBYSxLQUFLLEtBQUwsQ0FBVyxLQUE1Qjs7QUFFQSxVQUFJLFFBQVEsS0FBSyxLQUFMLENBQVcsRUFBdkI7O0FBRUEsVUFBSSxRQUFRLFNBQVIsS0FBUSxHQUFXO0FBQ3JCLGNBQU0sSUFBTixDQUFXLFVBQVg7O0FBRUE7QUFDQSxvQkFBWSxNQUFaLENBQW1CLGFBQW5CO0FBQ0QsT0FMRDs7QUFPQSxXQUFLLEtBQUwsQ0FBVyxFQUFYLEdBQWdCLEtBQWhCO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7d0JBQ1k7QUFDVjtBQUNELEs7c0JBQ1MsSyxFQUFPO0FBQ2Y7QUFDQTtBQUNBO0FBQ0EsdUVBQWMsS0FBZDtBQUNEOzs7d0JBQ1k7QUFDWDtBQUNELEs7c0JBQ1UsSyxFQUFPO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBLHdFQUFlLEtBQWY7QUFDRDs7O3dCQUVXO0FBQ1YsYUFBTyxLQUFLLE1BQVo7QUFDRCxLO3NCQUNTLEssRUFBTztBQUNmLFVBQUksS0FBSyxNQUFULEVBQWlCO0FBQ2YsYUFBSyxNQUFMLENBQVksV0FBWixHQUEwQixLQUExQjtBQUNEO0FBQ0QsV0FBSyxNQUFMLEdBQWMsS0FBZDtBQUNEOztBQUVEO0FBQ0E7QUFDQTs7Ozt3QkFDZTtBQUNiLGFBQU8sS0FBSyxNQUFMLENBQVksVUFBbkI7QUFDRDs7O3dCQUNlO0FBQ2QsYUFBTyxLQUFLLE1BQUwsQ0FBWSxXQUFuQjtBQUNEOzs7O0VBdko0QixLQUFLLE07O0FBMEpwQyxPQUFPLE9BQVAsR0FBaUIsZ0JBQWpCOzs7O0FDL0pBOztBQUVBLElBQU0sbUJBQW1CLFFBQVEsb0JBQVIsQ0FBekI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE9BQU8sSUFBUCxDQUFZLGdCQUFaLEdBQStCLGdCQUFoRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cblxuXG52YXIgdlNoYWRlciA9IFwiI2RlZmluZSBHTFNMSUZZIDFcXG5cXG5hdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XFxuYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcXG5cXG51bmlmb3JtIG1hdDMgcHJvamVjdGlvbk1hdHJpeDtcXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcXG5cXG51bmlmb3JtIG1hdDMgb3RoZXJNYXRyaXg7XFxudmFyeWluZyB2ZWMyIHZNYXNrQ29vcmQ7XFxuICBcXG4gIHZvaWQgbWFpbih2b2lkKVxcbiAge1xcbiAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoKHByb2plY3Rpb25NYXRyaXggKiB2ZWMzKGFWZXJ0ZXhQb3NpdGlvbiwgMS4wKSkueHksIDAuMCwgMS4wKTtcXG4gICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XFxuICAgIHZNYXNrQ29vcmQgPSAoIG90aGVyTWF0cml4ICogdmVjMyggYVRleHR1cmVDb29yZCwgMS4wKSAgKS54eTtcXG4gIH1cIjtcbnZhciBmU2hhZGVyID0gXCIvLyBcXG4vLyAtLS0tLS0tLVxcbi8vIFVuaWZvcm1zXFxuLy8gLS0tLS0tLS1cXG4vLyBcXG4vLyAxKSAodmVjMikgdmlkRGltZW5zaW9ucyBcXG4vLyAgIC0gZGltZW5zaW9ucyBvZiB0aGUgRlVMTCB2aWRlbyB0ZXh0dXJlIFxcbi8vICAgICAoaW5jbHVkaW5nIHRvcCBSR0IgcGFuZWwgYW5kIGJvdHRvbSBBbHBoYSBwYW5lbClcXG4vLyBcXG4vLyAyKSAoZmxvYXQpIHNwcml0ZUFscGhhXFxuLy8gICAtIHRoZSBjdXJyZW50IGFscGhhIG9mIHRoZSBhbHBoYVZpZGVvU3ByaXRlIC0gbmVlZCB0b1xcbi8vICAgICBtdWx0aXBseSB0aGUgY29tcHV0ZWQgYWxwaGEgYnkgdGhpcyB0byBnZXQgdGhlIGFjdHVhbFxcbi8vICAgICBhbHBoYSAoTk9URTogdGhpcyBpcyBvbmx5IGltcG9ydGFudCBpZiB2aWRlbyBhbHBoYSBpcyBcXG4vLyAgICAgTk9UIGAwYCBvciBgMWApLlxcbi8vIFxcbi8vIDIpIChmbG9hdCkgeU9mZnNldCBcXG4vLyAgIC0gYWxwaGEgb2Zmc2V0IGZyb20geSBtaWRwb2ludCAoaGVpZ2h0IC8gMi4wKS4gdXNlZnVsIGlmXFxuLy8gICAgICBSR0IgcGFuZWwgYW5kIEFscGhhIHBhbmVsIGluIGFyZSBkaWZmZXJlbnQgaGVpZ2h0c1xcbi8vICAgICAgYW5kIGFsc28gZm9yIGRlYnVnZ2luZy5cXG4vLyBcXG4vLyAzKSAoc2FtcGxlcjJEKSB1U2FtcGxlclxcbi8vICAgLSBUZXh0dXJlIG9mIHRoZSBQSVhJIHNwcml0ZSAodmlkZW8pIHdlIGFyZSBhcHBseWluZyB0aGUgZmlsdGVyIHRvLiBcXG4vLyAgICAgVGhpcyBpcyBwYXNzZWQgaW4gYnkgUElYSS5cXG4vLyBcXG4vLyA0KSAoc2FtcGxlcjJEKSBtYXNrIFxcbi8vICAgLSBVc2VkIHRvIGdldCBhbHBoYSB2YWx1ZS4gQmFzaWNhbGx5IHRoZSBzYW1lIGFzIGB1U2FtcGxlcmAuXFxuLy8gICAgIHRoZSBpc3N1ZSB3aXRoIEpVU1QgdXNpbmcgYHVTYW1wbGVyYCwgaG93ZXZlciwgaXMgdGhhdCB3aGVuXFxuLy8gICAgIHRoZSBBbHBoYSBwYW5lbCBvdmVyZmxvd3MgdGhlIFBJWEkgY29udGFpbmVyIChldmVuIGlmIHdlIGNhbid0XFxuLy8gICAgIHNlZSBpdCksIGl0IHdvbid0IHJlbmRlciBwcm9wZXJseS4gVGh1cyBpdCBzZWVtcyB3ZSBuZWVkIHRvIFxcbi8vICAgICBwYXNzIGl0IGluIGFnYWluLCBhcyBhIGZ1bGwsIHVuY3JvcHBlZCB0ZXh0dXJlLlxcbi8vIFxcbi8vIFxcbi8vIFRPRE9cXG4vLyAtIFVzZSBTVFBRICh0ZXh0dXJlIGNvb3JkIHN5bnRheCkgZm9yIGFjY2Vzc2luZyB0ZXh0dXJlcyA/P1xcbi8vIFxcbi8vIE5PVEVTXFxuLy8gLSBGaW5hbCBwb3N0IGluIHRoaXMgdGhyZWFkIG1pZ2h0IGJlIHVzZWZ1bDpcXG4vLyAgIGh0dHBzOi8vZ2l0aHViLmNvbS9waXhpanMvcGl4aS5qcy9pc3N1ZXMvMTk3N1xcbi8vICBcXG5cXG5wcmVjaXNpb24gbG93cCBmbG9hdDtcXG4jZGVmaW5lIEdMU0xJRlkgMVxcblxcbnZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1xcbnZhcnlpbmcgdmVjMiB2TWFza0Nvb3JkO1xcbnZhcnlpbmcgdmVjNCB2Q29sb3I7XFxuXFxudW5pZm9ybSB2ZWMyIHZpZERpbWVuc2lvbnM7XFxudW5pZm9ybSBmbG9hdCBzcHJpdGVBbHBoYTtcXG51bmlmb3JtIGZsb2F0IHlPZmZzZXQ7XFxudW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XFxudW5pZm9ybSBzYW1wbGVyMkQgbWFzaztcXG5cXG52b2lkIG1haW4odm9pZClcXG57XFxuXFxuICB2ZWMyIG9uZVBpeGVsID0gdmVjMigxLjAgLyB2aWREaW1lbnNpb25zKTtcXG5cXG4gIGZsb2F0IG9mZnNldEhlaWdodCA9IHlPZmZzZXQgKyB2aWREaW1lbnNpb25zLnk7XFxuXFxuICBmbG9hdCBmaWx0ZXJIZWlnaHQgPSBvZmZzZXRIZWlnaHQgKiBvbmVQaXhlbC55O1xcbiAgZmxvYXQgaGFsZkhlaWdodCA9IGZpbHRlckhlaWdodCAvIDIuMDtcXG5cXG4gIGZsb2F0IGFscGhhUGl4ZWxZID0gdlRleHR1cmVDb29yZC55ICsgKGhhbGZIZWlnaHQgKiBvbmVQaXhlbC55KTtcXG4gIHZlYzIgYWxwaGFQaXhlbCA9IHZlYzIodlRleHR1cmVDb29yZC54LCBhbHBoYVBpeGVsWSk7XFxuXFxuICB2ZWM0IGNvbG9yUHggPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKTtcXG4gIHZlYzQgYWxwaGFQeCA9IHRleHR1cmUyRChtYXNrLCB2ZWMyKHZNYXNrQ29vcmQueCwgdk1hc2tDb29yZC55ICsgaGFsZkhlaWdodCkpO1xcblxcbiAgZmxvYXQgYWxwaGEgPSBhbHBoYVB4LnIgKiBzcHJpdGVBbHBoYTtcXG5cXG4gIC8vIC8vIGNoZWNrIGNsaXAhIHRoaXMgd2lsbCBzdG9wIHRoZSBtYXNrIGJsZWVkaW5nIG91dCBmcm9tIHRoZSBlZGdlc1xcbiAgLy8gLy8gbWlnaHQgbm90IG5lZWQgdGhpcyBhZnRlciBhbGxcXG4gIC8vIHZlYzIgdGV4dCA9IGFicyggdk1hc2tDb29yZCAtIDAuNSApO1xcbiAgLy8gdGV4dCA9IHN0ZXAoMC41LCB0ZXh0KTtcXG4gIC8vIGZsb2F0IGNsaXAgPSAxLjAgLSBtYXgodGV4dC55LCB0ZXh0LngpO1xcblxcbiAgLy8gYWxwaGEgKj0gY2xpcDtcXG5cXG4gIC8qKlxcbiAgICogcGl4ZWwgYWxwaGEgaXMgYmFzZWQgb24gWSBwb3NpdGlvbiAodG9wIGlzIGAwYCwgYm90dG9tIGlzIGAxYClcXG4gICAqL1xcbiAgLy8gZmxvYXQgcGN0RG93biA9IHZUZXh0dXJlQ29vcmQueSAvIGZpbHRlckhlaWdodDtcXG4gIC8vIGNvbG9yICo9IHBjdERvd247XFxuICAvLyBnbF9GcmFnQ29sb3IgPSB2ZWM0KGNvbG9yUHgucmdiLCBwY3REb3duKTtcXG5cXG4gIC8qKlxcbiAgICoganVzdCB0aGUgdmlkZW8gaW4gaXQncyBvcmlnaW5hbCBzdGF0ZVxcbiAgICovXFxuICAvLyBnbF9GcmFnQ29sb3IgPSBjb2xvclB4O1xcbiAgXFxuICAvKipcXG4gICAqIGp1c3Qgc2hvdyB0aGUgYWxwaGEgaGFsZlxcbiAgICovXFxuICAvLyBnbF9GcmFnQ29sb3IgPSBhbHBoYVB4O1xcbiAgXFxuICAvKipcXG4gICAqIGFjdHVhbCB3b3JraW5nIHZlcnNpb25cXG4gICAqL1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNChjb2xvclB4LnJnYiAqIGFscGhhLCBhbHBoYSk7XFxufVwiO1xuXG5cbi8qKlxuICogVGhlIFZpZGVvTWFza0ZpbHRlciBjbGFzc1xuICpcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMgUElYSS5GaWx0ZXJcbiAqIEBtZW1iZXJvZiBQSVhJXG4gKiBAcGFyYW0gc3ByaXRlIHtQSVhJLlNwcml0ZX0gdGhlIHRhcmdldCBzcHJpdGVcbiAqL1xuZnVuY3Rpb24gVmlkZW9NYXNrRmlsdGVyKG1hc2tlZFNwcml0ZSwgbWFza1Nwcml0ZSkge1xuXG4gICAgdmFyIG1hc2tNYXRyaXggPSBuZXcgUElYSS5NYXRyaXgoKTtcblxuICAgIFBJWEkuRmlsdGVyLmNhbGwodGhpcyx2U2hhZGVyLCBmU2hhZGVyKTtcblxuICAgIHRoaXMucGFkZGluZyA9IDA7XG5cbiAgICBtYXNrU3ByaXRlLnJlbmRlcmFibGUgPSBmYWxzZTtcblxuICAgIHRoaXMubWFza2VkU3ByaXRlID0gbWFza2VkU3ByaXRlO1xuICAgIHRoaXMubWFza1Nwcml0ZSA9IG1hc2tTcHJpdGU7XG4gICAgdGhpcy5tYXNrTWF0cml4ID0gbWFza01hdHJpeDtcblxuICAgIHRoaXMuc2V0RGltZW5zaW9ucygpO1xuXG4gICAgLy8gdGhpcy55T2Zmc2V0ID0gLTIzO1xufVxuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUElYSS5GaWx0ZXIucHJvdG90eXBlKTtcblZpZGVvTWFza0ZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWaWRlb01hc2tGaWx0ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTWFza0ZpbHRlcjtcblxuLyoqXG4gKiBBcHBsaWVzIHRoZSBmaWx0ZXJcbiAqL1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uKGZpbHRlck1hbmFnZXIsIGlucHV0LCBvdXRwdXQpIHtcblxuXG4gIHZhciBtYXNrU3ByaXRlID0gdGhpcy5tYXNrU3ByaXRlO1xuXG4gIHRoaXMudW5pZm9ybXMubWFzayA9IG1hc2tTcHJpdGUuX3RleHR1cmU7XG5cbiAgdmFyIG90aGVyTWF0cml4ID0gZmlsdGVyTWFuYWdlci5jYWxjdWxhdGVTcHJpdGVNYXRyaXgoXG4gICAgdGhpcy5tYXNrTWF0cml4LCBtYXNrU3ByaXRlICk7XG5cbiAgdGhpcy51bmlmb3Jtcy5vdGhlck1hdHJpeCA9IG90aGVyTWF0cml4O1xuXG4gICAvLyBkcmF3IHRoZSBmaWx0ZXIuLi5cbiAgZmlsdGVyTWFuYWdlci5hcHBseUZpbHRlcih0aGlzLCBpbnB1dCwgb3V0cHV0KTtcbn07XG5cbi8qKlxuICogVE9ETzogdGVzdCBpZiB0aGlzIGFjdHVhbGx5IGlzIGRvaW5nIGFueXRoaW5nXG4gKiAoaXQgc2VlbXMgYXMgaWYgZ2l2aW5nIHRoZSB2aWREaW1lbnNpb25zIGEgdmFsdWUgb2YgYDBgIFxuICogYnJlYWtzIHRoaW5ncyBidXQgcGFzc2luZyBhcmJpdHJhcnkgdmFsdWVzIGluIGFsc28gc2VlbXMgdG8gd29yay4uLilcbiAqL1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5zZXREaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG4gIHZhciB2aWREaW1lbnNpb25zID0gdGhpcy51bmlmb3Jtcy52aWREaW1lbnNpb25zO1xuICB2aWREaW1lbnNpb25zWzBdID0gdGhpcy5tYXNrZWRTcHJpdGUud2lkdGg7XG4gIHZpZERpbWVuc2lvbnNbMV0gPSB0aGlzLm1hc2tlZFNwcml0ZS5oZWlnaHQgKiAyO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZSwge1xuXG4gICAgc3ByaXRlQWxwaGE6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVuaWZvcm1zLnNwcml0ZUFscGhhO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy51bmlmb3Jtcy5zcHJpdGVBbHBoYSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBURVNUXG4gICAgICovXG4gICAgeU9mZnNldDoge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudW5pZm9ybXMueU9mZnNldDtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudW5pZm9ybXMueU9mZnNldCA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlkZW9NYXNrRmlsdGVyOyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgVmlkZW9NYXNrRmlsdGVyID0gcmVxdWlyZSgnLi9WaWRlb01hc2tGaWx0ZXInKTtcblxuXG5jbGFzcyBBbHBoYVZpZGVvU3ByaXRlIGV4dGVuZHMgUElYSS5TcHJpdGUge1xuICBjb25zdHJ1Y3Rvcih2aWRlb0Z1bGxUZXh0dXJlLCBmaWx0ZXJQYWRkaW5nLCBhdXRvVXBkYXRlVmlkZW9UZXh0dXJlKSB7XG5cbiAgICBzdXBlcigpO1xuXG4gICAgLy8gc2V0IHBpeGkgLyBkb20gZWxlbWVudHNcbiAgICB0aGlzLl9mdWxsVGV4dHVyZSA9IHZpZGVvRnVsbFRleHR1cmU7XG4gICAgdGhpcy5fc3JjRWwgPSB0aGlzLl9mdWxsVGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2U7XG5cbiAgICAvLyBzZXQgd2hldGhlciB0aGUgYmFzZVRleHR1cmUgdXBkYXRlcyBpbiBpdCdzIG9uIFJBRiBsb29wIG9yXG4gICAgLy8gaWYgd2Ugc2hvdWxkIHVzZSB0aGlzIGNsYXNzJyB1cGRhdGUgbWV0aG9kIHRvIHVwZGF0ZSBpdFxuICAgIC8vIGZyb20gc29tZSBleHRlcm5hbCBsb29wIChwcm9iYWJseSBhIGBtYWluIGxvb3BgKVxuICAgIGF1dG9VcGRhdGVWaWRlb1RleHR1cmUgPSBhdXRvVXBkYXRlVmlkZW9UZXh0dXJlIHx8IGZhbHNlO1xuICAgIHRoaXMuX2Z1bGxUZXh0dXJlLmJhc2VUZXh0dXJlLmF1dG9VcGRhdGUgPSBhdXRvVXBkYXRlVmlkZW9UZXh0dXJlO1xuXG4gICAgLy8gbWFrZSBzdXJlIGl0IGxvb3BzXG4gICAgdGhpcy5fc3JjRWwubG9vcCA9IHRydWU7XG5cbiAgICAvLyBhY3R1YWwgYWxwaGEgdmFsdWVcbiAgICAvLyAoYWNjZXNzZWQgYnkgYGFscGhhYCBnZXR0ZXIgLyBzZXR0ZXIpXG4gICAgdGhpcy5fYWxwaGEgPSAxO1xuXG4gICAgdGhpcy5zZXR1cChhdXRvVXBkYXRlVmlkZW9UZXh0dXJlKTtcbiAgICB0aGlzLnNldEZpbHRlcihmaWx0ZXJQYWRkaW5nKTtcbiAgICB0aGlzLnNoaW1TY2FsZUNhbGxiYWNrKCk7XG4gIH1cblxuICBzZXR1cCgpIHtcblxuICAgIHZhciBuZXdXaWR0aCA9IHRoaXMuc3JjV2lkdGg7XG4gICAgdmFyIG5ld0hlaWdodCA9IHRoaXMuc3JjSGVpZ2h0IC8gMjtcblxuICAgIC8vIHNldCB0aGlzIHNwcml0ZSdzIHRleHR1cmVcbiAgICB0aGlzLnRleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlKFxuICAgICB0aGlzLl9mdWxsVGV4dHVyZSwgbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIDAsIG5ld1dpZHRoLCBuZXdIZWlnaHQpKTtcblxuICAgIC8vIHNldCBtYXNrIHRleHR1cmVcbiAgICB0aGlzLm1hc2tUZXh0dXJlID0gbmV3IFBJWEkuVGV4dHVyZShcbiAgICAgdGhpcy5fZnVsbFRleHR1cmUsIG5ldyBQSVhJLlJlY3RhbmdsZSgwLCBuZXdIZWlnaHQsIG5ld1dpZHRoLCBuZXdIZWlnaHQpKTtcblxuICAgIC8vIGNyZWF0ZSBtYXNrIHNwcml0ZSBhbmQgYWRkIGFzIGNoaWxkIG9mIHRoaXMgc3ByaXRlXG4gICAgdGhpcy5tYXNrU3ByaXRlID0gbmV3IFBJWEkuU3ByaXRlKHRoaXMubWFza1RleHR1cmUpO1xuICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5tYXNrU3ByaXRlKTtcblxuICB9XG5cbiAgbGlzdGVuKCkge1xuXG4gIH1cblxuICBzZXRGaWx0ZXIoZmlsdGVyUGFkZGluZykge1xuICAgIHZhciBmaWx0ZXIgPSBuZXcgVmlkZW9NYXNrRmlsdGVyKHRoaXMsIHRoaXMubWFza1Nwcml0ZSk7XG5cbiAgICBpZiAoZmlsdGVyUGFkZGluZylcbiAgICAgIGZpbHRlci5wYWRkaW5nID0gZmlsdGVyUGFkZGluZztcblxuICAgIHRoaXMuZmlsdGVyID0gZmlsdGVyO1xuICAgIHRoaXMuZmlsdGVycyA9IFt0aGlzLmZpbHRlcl07XG4gICAgXG4gICAgdGhpcy5hbHBoYSA9IHRoaXMuX2FscGhhO1xuXG4gICAgcmV0dXJuIGZpbHRlcjtcbiAgfVxuXG4gIHJlbW92ZUZpbHRlcigpIHtcbiAgICB2YXIgZmlsdGVyID0gdGhpcy5zcHJpdGUuZmlsdGVyO1xuXG4gICAgdGhpcy5maWx0ZXJzID0gbnVsbDtcbiAgICB0aGlzLmZpbHRlciA9IG51bGw7XG5cbiAgICByZXR1cm4gZmlsdGVyO1xuICB9XG5cbiAgLy8gXG4gIC8vIFNob3VsZCBvbmx5IHVzZSB0aGlzIGlmIG5vdCB1c2luZyBgYXV0b1VwZGF0ZWBcbiAgLy8gKHNlZSBjb25zdHJ1Y3RvcidzIGBhdXRvVXBkYXRlVmlkZW9UZXh0dXJlYCBwYXJhbWV0ZXIpXG4gIC8vIFxuICB1cGRhdGUoKSB7XG4gICAgdGhpcy5fZnVsbFRleHR1cmUuYmFzZVRleHR1cmUudXBkYXRlKCk7XG4gIH1cblxuICAvLyBcbiAgLy8ga2luZGEgaGFja3kgYnV0IHRoaXMgYWxsb3dzIHVzXG4gIC8vIHRvIGJlIG5vdGlmaWVkIHdoZW4gdGhlIHdpZHRoIC8gaGVpZ2h0IC8gc2NhbGVcbiAgLy8gY2hhbmdlcyBzbyB3ZSBjYW4gbW9kaWZ5IHRoZSBmaWx0ZXIgZGltZW5zaW9ucyB0b1xuICAvLyByZWZsZWN0IHRoYXQgY2hhbmdlXG4gIC8vIFxuICAvLyAoc2VlIGBPYnNlcnZhYmxlUG9pbnQuanNgIGFuZCBgVHJhbnNmb3JtU3RhdGljLmpzYHNcbiAgLy8gYG9uQ2hhbmdlYCBtZXRob2QgaW4gdGhlIFBJWEkgc3JjKVxuICAvLyBcbiAgc2hpbVNjYWxlQ2FsbGJhY2soKSB7XG5cbiAgICB2YXIgc3ByaXRlU2NvcGUgPSB0aGlzO1xuICAgIHZhciBzY2FsZVNjb3BlID0gdGhpcy5zY2FsZS5zY29wZTtcblxuICAgIHZhciBvbGRDQiA9IHRoaXMuc2NhbGUuY2I7XG5cbiAgICB2YXIgbmV3Q0IgPSBmdW5jdGlvbigpIHtcbiAgICAgIG9sZENCLmNhbGwoc2NhbGVTY29wZSk7XG5cbiAgICAgIC8vIGFkZCBzdHVmZiBoZXJlIGlmIG5lZWRlZFxuICAgICAgc3ByaXRlU2NvcGUuZmlsdGVyLnNldERpbWVuc2lvbnMoKTtcbiAgICB9XG5cbiAgICB0aGlzLnNjYWxlLmNiID0gbmV3Q0I7XG4gIH1cblxuICAvLyBcbiAgLy8gb3ZlcnJpZGUgUElYSS5TcHJpdGUncyBgd2lkdGhgICYgYGhlaWdodGAgZ2V0dGVycyAmIHNldHRlcnNcbiAgLy8gXG4gIC8vIHNlZTpcbiAgLy8gLSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzI4OTUwNzYwL292ZXJyaWRlLWEtc2V0dGVyLWFuZC10aGUtZ2V0dGVyLW11c3QtYWxzby1iZS1vdmVycmlkZGVuXG4gIC8vIC0gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2dldE93blByb3BlcnR5RGVzY3JpcHRvclxuICAvL1xuICBnZXQgd2lkdGgoKSB7XG4gICAgcmV0dXJuIHN1cGVyLndpZHRoO1xuICB9XG4gIHNldCB3aWR0aCh2YWx1ZSkge1xuICAgIC8vXG4gICAgLy8gZG8gc3R1ZmYgaGVyZT9cbiAgICAvLyBcbiAgICBzdXBlci53aWR0aCA9IHZhbHVlO1xuICB9XG4gIGdldCBoZWlnaHQoKSB7XG4gICAgcmV0dXJuIHN1cGVyLmhlaWdodDtcbiAgfVxuICBzZXQgaGVpZ2h0KHZhbHVlKSB7XG4gICAgLy9cbiAgICAvLyBkbyBzdHVmZiBoZXJlP1xuICAgIC8vICBcbiAgICBzdXBlci5oZWlnaHQgPSB2YWx1ZTtcbiAgfVxuXG4gIGdldCBhbHBoYSgpIHtcbiAgICByZXR1cm4gdGhpcy5fYWxwaGE7XG4gIH1cbiAgc2V0IGFscGhhKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuZmlsdGVyKSB7XG4gICAgICB0aGlzLmZpbHRlci5zcHJpdGVBbHBoYSA9IHZhbHVlO1xuICAgIH1cbiAgICB0aGlzLl9hbHBoYSA9IHZhbHVlO1xuICB9XG5cbiAgLy8gXG4gIC8vIGZvciBlYXNpZXIgYWNjZXNzIHRvIHcgJiBoXG4gIC8vIFxuICBnZXQgc3JjV2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NyY0VsLnZpZGVvV2lkdGg7XG4gIH1cbiAgZ2V0IHNyY0hlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjRWwudmlkZW9IZWlnaHQ7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBbHBoYVZpZGVvU3ByaXRlOyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgQWxwaGFWaWRlb1Nwcml0ZSA9IHJlcXVpcmUoJy4vQWxwaGFWaWRlb1Nwcml0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5QSVhJLkFscGhhVmlkZW9TcHJpdGUgPSBBbHBoYVZpZGVvU3ByaXRlOyJdfQ==
