(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var vShader = "#define GLSLIFY 1\n\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nvarying vec2 vTextureCoord;\n\nuniform mat3 otherMatrix;\nvarying vec2 vMaskCoord;\n  \n  void main(void)\n  {\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n  }";
var fShader = "// \n// --------\n// Uniforms\n// --------\n// \n// 1) (vec2) vidDimensions \n//   - dimensions of the FULL video texture \n//     (including top RGB panel and bottom Alpha panel)\n// \n// 2) (float) yOffset \n//   - alpha offset from y midpoint (height / 2.0). useful if\n//      RGB panel and Alpha panel in are different heights\n//      and also for debugging.\n// \n// 3) (sampler2D) uSampler\n//   - Texture of the PIXI sprite (video) we are applying the filter to. \n//     This is passed in by PIXI.\n// \n// 4) (sampler2D) mask \n//   - Used to get alpha value. Basically the same as `uSampler`.\n//     the issue with JUST using `uSampler`, however, is that when\n//     the Alpha panel overflows the PIXI container (even if we can't\n//     see it), it won't render properly. Thus it seems we need to \n//     pass it in again, as a full, uncropped texture.\n// \n// \n// TODO\n// - Use STPQ (texture coord syntax) for accessing textures ??\n// \n// NOTES\n// - Final post in this thread might be useful:\n//   https://github.com/pixijs/pixi.js/issues/1977\n//  \n\nprecision lowp float;\n#define GLSLIFY 1\n\nvarying vec2 vTextureCoord;\nvarying vec2 vMaskCoord;\nvarying vec4 vColor;\n\nuniform vec2 vidDimensions;\nuniform float yOffset;\nuniform sampler2D uSampler;\nuniform sampler2D mask;\n\nvoid main(void)\n{\n\n  vec2 onePixel = vec2(1.0 / vidDimensions);\n\n  float offsetHeight = yOffset + vidDimensions.y;\n\n  float filterHeight = offsetHeight * onePixel.y;\n  float halfHeight = filterHeight / 2.0;\n\n  float alphaPixelY = vTextureCoord.y + (halfHeight * onePixel.y);\n  vec2 alphaPixel = vec2(vTextureCoord.x, alphaPixelY);\n\n  vec4 colorPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));\n  vec4 alphaPx = texture2D(mask, vec2(vMaskCoord.x, vMaskCoord.y + halfHeight));\n\n  float alpha = alphaPx.r;\n\n  // // check clip! this will stop the mask bleeding out from the edges\n  // // might not need this after all\n  // vec2 text = abs( vMaskCoord - 0.5 );\n  // text = step(0.5, text);\n  // float clip = 1.0 - max(text.y, text.x);\n\n  // alpha *= clip;\n\n  /**\n   * pixel alpha is based on Y position (top is `0`, bottom is `1`)\n   */\n  // float pctDown = vTextureCoord.y / filterHeight;\n  // color *= pctDown;\n  // gl_FragColor = vec4(colorPx.rgb, pctDown);\n\n  /**\n   * just the video in it's original state\n   */\n  // gl_FragColor = colorPx;\n  \n  /**\n   * just show the alpha half\n   */\n  // gl_FragColor = alphaPx;\n  \n  /**\n   * actual working version\n   */\n  gl_FragColor = vec4(colorPx.rgb * alpha, alpha);\n}";

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
      console.log(filterPadding);
      var filter = new VideoMaskFilter(this, this.maskSprite);

      if (filterPadding) filter.padding = filterPadding;

      this.filter = filter;
      this.filters = [this.filter];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9WaWRlb01hc2tGaWx0ZXIvaW5kZXguanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9pbmRleC5qcyIsInNvdXJjZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUlBLElBQUksVUFBVSwwYUFBZDtBQUNBLElBQUksVUFBVSx3aEZBQWQ7O0FBR0E7Ozs7Ozs7O0FBUUEsU0FBUyxlQUFULENBQXlCLFlBQXpCLEVBQXVDLFVBQXZDLEVBQW1EOztBQUUvQyxNQUFJLGFBQWEsSUFBSSxLQUFLLE1BQVQsRUFBakI7O0FBRUEsT0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFqQixFQUFzQixPQUF0QixFQUErQixPQUEvQjs7QUFFQSxPQUFLLE9BQUwsR0FBZSxDQUFmOztBQUVBLGFBQVcsVUFBWCxHQUF3QixLQUF4Qjs7QUFFQSxPQUFLLFlBQUwsR0FBb0IsWUFBcEI7QUFDQSxPQUFLLFVBQUwsR0FBa0IsVUFBbEI7QUFDQSxPQUFLLFVBQUwsR0FBa0IsVUFBbEI7O0FBRUEsT0FBSyxhQUFMOztBQUVBO0FBQ0g7QUFDRCxnQkFBZ0IsU0FBaEIsR0FBNEIsT0FBTyxNQUFQLENBQWMsS0FBSyxNQUFMLENBQVksU0FBMUIsQ0FBNUI7QUFDQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsV0FBMUIsR0FBd0MsZUFBeEM7QUFDQSxPQUFPLE9BQVAsR0FBaUIsZUFBakI7O0FBRUE7OztBQUdBLGdCQUFnQixTQUFoQixDQUEwQixLQUExQixHQUFrQyxVQUFTLGFBQVQsRUFBd0IsS0FBeEIsRUFBK0IsTUFBL0IsRUFBdUM7O0FBR3ZFLE1BQUksYUFBYSxLQUFLLFVBQXRCOztBQUVBLE9BQUssUUFBTCxDQUFjLElBQWQsR0FBcUIsV0FBVyxRQUFoQzs7QUFFQSxNQUFJLGNBQWMsY0FBYyxxQkFBZCxDQUNoQixLQUFLLFVBRFcs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QUFDQTtBQUNBO0FBQ0E7Ozs7NkJBQ1M7QUFDUCxXQUFLLFlBQUwsQ0FBa0IsV0FBbEIsQ0FBOEIsTUFBOUI7QUFDRDs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7d0NBQ29COztBQUVsQixVQUFJLGNBQWMsSUFBbEI7QUFDQSxVQUFJLGFBQWEsS0FBSyxLQUFMLENBQVcsS0FBNUI7O0FBRUEsVUFBSSxRQUFRLEtBQUssS0FBTCxDQUFXLEVBQXZCOztBQUVBLFVBQUksUUFBUSxTQUFSLEtBQVEsR0FBVztBQUNyQixjQUFNLElBQU4sQ0FBVyxVQUFYOztBQUVBO0FBQ0Esb0JBQVksTUFBWixDQUFtQixhQUFuQjtBQUNELE9BTEQ7O0FBT0EsV0FBSyxLQUFMLENBQVcsRUFBWCxHQUFnQixLQUFoQjtBQUNEOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O3dCQUNZO0FBQ1Y7QUFDRCxLO3NCQUNTLEssRUFBTztBQUNmO0FBQ0E7QUFDQTtBQUNBLHVFQUFjLEtBQWQ7QUFDRDs7O3dCQUNZO0FBQ1g7QUFDRCxLO3NCQUNVLEssRUFBTztBQUNoQjtBQUNBO0FBQ0E7QUFDQSx3RUFBZSxLQUFmO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBOzs7O3dCQUNlO0FBQ2IsYUFBTyxLQUFLLE1BQUwsQ0FBWSxVQUFuQjtBQUNEOzs7d0JBQ2U7QUFDZCxhQUFPLEtBQUssTUFBTCxDQUFZLFdBQW5CO0FBQ0Q7Ozs7RUF2STRCLEtBQUssTTs7QUEwSXBDLE9BQU8sT0FBUCxHQUFpQixnQkFBakI7Ozs7QUMvSUE7O0FBRUEsSUFBTSxtQkFBbUIsUUFBUSxvQkFBUixDQUF6Qjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsT0FBTyxJQUFQLENBQVksZ0JBQVosR0FBK0IsZ0JBQWhEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuXG5cbnZhciB2U2hhZGVyID0gXCIjZGVmaW5lIEdMU0xJRlkgMVxcblxcbmF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1xcblxcbnVuaWZvcm0gbWF0MyBwcm9qZWN0aW9uTWF0cml4O1xcbnZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1xcblxcbnVuaWZvcm0gbWF0MyBvdGhlck1hdHJpeDtcXG52YXJ5aW5nIHZlYzIgdk1hc2tDb29yZDtcXG4gIFxcbiAgdm9pZCBtYWluKHZvaWQpXFxuICB7XFxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNCgocHJvamVjdGlvbk1hdHJpeCAqIHZlYzMoYVZlcnRleFBvc2l0aW9uLCAxLjApKS54eSwgMC4wLCAxLjApO1xcbiAgICB2VGV4dHVyZUNvb3JkID0gYVRleHR1cmVDb29yZDtcXG4gICAgdk1hc2tDb29yZCA9ICggb3RoZXJNYXRyaXggKiB2ZWMzKCBhVGV4dHVyZUNvb3JkLCAxLjApICApLnh5O1xcbiAgfVwiO1xudmFyIGZTaGFkZXIgPSBcIi8vIFxcbi8vIC0tLS0tLS0tXFxuLy8gVW5pZm9ybXNcXG4vLyAtLS0tLS0tLVxcbi8vIFxcbi8vIDEpICh2ZWMyKSB2aWREaW1lbnNpb25zIFxcbi8vICAgLSBkaW1lbnNpb25zIG9mIHRoZSBGVUxMIHZpZGVvIHRleHR1cmUgXFxuLy8gICAgIChpbmNsdWRpbmcgdG9wIFJHQiBwYW5lbCBhbmQgYm90dG9tIEFscGhhIHBhbmVsKVxcbi8vIFxcbi8vIDIpIChmbG9hdCkgeU9mZnNldCBcXG4vLyAgIC0gYWxwaGEgb2Zmc2V0IGZyb20geSBtaWRwb2ludCAoaGVpZ2h0IC8gMi4wKS4gdXNlZnVsIGlmXFxuLy8gICAgICBSR0IgcGFuZWwgYW5kIEFscGhhIHBhbmVsIGluIGFyZSBkaWZmZXJlbnQgaGVpZ2h0c1xcbi8vICAgICAgYW5kIGFsc28gZm9yIGRlYnVnZ2luZy5cXG4vLyBcXG4vLyAzKSAoc2FtcGxlcjJEKSB1U2FtcGxlclxcbi8vICAgLSBUZXh0dXJlIG9mIHRoZSBQSVhJIHNwcml0ZSAodmlkZW8pIHdlIGFyZSBhcHBseWluZyB0aGUgZmlsdGVyIHRvLiBcXG4vLyAgICAgVGhpcyBpcyBwYXNzZWQgaW4gYnkgUElYSS5cXG4vLyBcXG4vLyA0KSAoc2FtcGxlcjJEKSBtYXNrIFxcbi8vICAgLSBVc2VkIHRvIGdldCBhbHBoYSB2YWx1ZS4gQmFzaWNhbGx5IHRoZSBzYW1lIGFzIGB1U2FtcGxlcmAuXFxuLy8gICAgIHRoZSBpc3N1ZSB3aXRoIEpVU1QgdXNpbmcgYHVTYW1wbGVyYCwgaG93ZXZlciwgaXMgdGhhdCB3aGVuXFxuLy8gICAgIHRoZSBBbHBoYSBwYW5lbCBvdmVyZmxvd3MgdGhlIFBJWEkgY29udGFpbmVyIChldmVuIGlmIHdlIGNhbid0XFxuLy8gICAgIHNlZSBpdCksIGl0IHdvbid0IHJlbmRlciBwcm9wZXJseS4gVGh1cyBpdCBzZWVtcyB3ZSBuZWVkIHRvIFxcbi8vICAgICBwYXNzIGl0IGluIGFnYWluLCBhcyBhIGZ1bGwsIHVuY3JvcHBlZCB0ZXh0dXJlLlxcbi8vIFxcbi8vIFxcbi8vIFRPRE9cXG4vLyAtIFVzZSBTVFBRICh0ZXh0dXJlIGNvb3JkIHN5bnRheCkgZm9yIGFjY2Vzc2luZyB0ZXh0dXJlcyA/P1xcbi8vIFxcbi8vIE5PVEVTXFxuLy8gLSBGaW5hbCBwb3N0IGluIHRoaXMgdGhyZWFkIG1pZ2h0IGJlIHVzZWZ1bDpcXG4vLyAgIGh0dHBzOi8vZ2l0aHViLmNvbS9waXhpanMvcGl4aS5qcy9pc3N1ZXMvMTk3N1xcbi8vICBcXG5cXG5wcmVjaXNpb24gbG93cCBmbG9hdDtcXG4jZGVmaW5lIEdMU0xJRlkgMVxcblxcbnZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1xcbnZhcnlpbmcgdmVjMiB2TWFza0Nvb3JkO1xcbnZhcnlpbmcgdmVjNCB2Q29sb3I7XFxuXFxudW5pZm9ybSB2ZWMyIHZpZERpbWVuc2lvbnM7XFxudW5pZm9ybSBmbG9hdCB5T2Zmc2V0O1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1xcbnVuaWZvcm0gc2FtcGxlcjJEIG1hc2s7XFxuXFxudm9pZCBtYWluKHZvaWQpXFxue1xcblxcbiAgdmVjMiBvbmVQaXhlbCA9IHZlYzIoMS4wIC8gdmlkRGltZW5zaW9ucyk7XFxuXFxuICBmbG9hdCBvZmZzZXRIZWlnaHQgPSB5T2Zmc2V0ICsgdmlkRGltZW5zaW9ucy55O1xcblxcbiAgZmxvYXQgZmlsdGVySGVpZ2h0ID0gb2Zmc2V0SGVpZ2h0ICogb25lUGl4ZWwueTtcXG4gIGZsb2F0IGhhbGZIZWlnaHQgPSBmaWx0ZXJIZWlnaHQgLyAyLjA7XFxuXFxuICBmbG9hdCBhbHBoYVBpeGVsWSA9IHZUZXh0dXJlQ29vcmQueSArIChoYWxmSGVpZ2h0ICogb25lUGl4ZWwueSk7XFxuICB2ZWMyIGFscGhhUGl4ZWwgPSB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgYWxwaGFQaXhlbFkpO1xcblxcbiAgdmVjNCBjb2xvclB4ID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55KSk7XFxuICB2ZWM0IGFscGhhUHggPSB0ZXh0dXJlMkQobWFzaywgdmVjMih2TWFza0Nvb3JkLngsIHZNYXNrQ29vcmQueSArIGhhbGZIZWlnaHQpKTtcXG5cXG4gIGZsb2F0IGFscGhhID0gYWxwaGFQeC5yO1xcblxcbiAgLy8gLy8gY2hlY2sgY2xpcCEgdGhpcyB3aWxsIHN0b3AgdGhlIG1hc2sgYmxlZWRpbmcgb3V0IGZyb20gdGhlIGVkZ2VzXFxuICAvLyAvLyBtaWdodCBub3QgbmVlZCB0aGlzIGFmdGVyIGFsbFxcbiAgLy8gdmVjMiB0ZXh0ID0gYWJzKCB2TWFza0Nvb3JkIC0gMC41ICk7XFxuICAvLyB0ZXh0ID0gc3RlcCgwLjUsIHRleHQpO1xcbiAgLy8gZmxvYXQgY2xpcCA9IDEuMCAtIG1heCh0ZXh0LnksIHRleHQueCk7XFxuXFxuICAvLyBhbHBoYSAqPSBjbGlwO1xcblxcbiAgLyoqXFxuICAgKiBwaXhlbCBhbHBoYSBpcyBiYXNlZCBvbiBZIHBvc2l0aW9uICh0b3AgaXMgYDBgLCBib3R0b20gaXMgYDFgKVxcbiAgICovXFxuICAvLyBmbG9hdCBwY3REb3duID0gdlRleHR1cmVDb29yZC55IC8gZmlsdGVySGVpZ2h0O1xcbiAgLy8gY29sb3IgKj0gcGN0RG93bjtcXG4gIC8vIGdsX0ZyYWdDb2xvciA9IHZlYzQoY29sb3JQeC5yZ2IsIHBjdERvd24pO1xcblxcbiAgLyoqXFxuICAgKiBqdXN0IHRoZSB2aWRlbyBpbiBpdCdzIG9yaWdpbmFsIHN0YXRlXFxuICAgKi9cXG4gIC8vIGdsX0ZyYWdDb2xvciA9IGNvbG9yUHg7XFxuICBcXG4gIC8qKlxcbiAgICoganVzdCBzaG93IHRoZSBhbHBoYSBoYWxmXFxuICAgKi9cXG4gIC8vIGdsX0ZyYWdDb2xvciA9IGFscGhhUHg7XFxuICBcXG4gIC8qKlxcbiAgICogYWN0dWFsIHdvcmtpbmcgdmVyc2lvblxcbiAgICovXFxuICBnbF9GcmFnQ29sb3IgPSB2ZWM0KGNvbG9yUHgucmdiICogYWxwaGEsIGFscGhhKTtcXG59XCI7XG5cblxuLyoqXG4gKiBUaGUgVmlkZW9NYXNrRmlsdGVyIGNsYXNzXG4gKlxuICogQGNsYXNzXG4gKiBAZXh0ZW5kcyBQSVhJLkZpbHRlclxuICogQG1lbWJlcm9mIFBJWElcbiAqIEBwYXJhbSBzcHJpdGUge1BJWEkuU3ByaXRlfSB0aGUgdGFyZ2V0IHNwcml0ZVxuICovXG5mdW5jdGlvbiBWaWRlb01hc2tGaWx0ZXIobWFza2VkU3ByaXRlLCBtYXNrU3ByaXRlKSB7XG5cbiAgICB2YXIgbWFza01hdHJpeCA9IG5ldyBQSVhJLk1hdHJpeCgpO1xuXG4gICAgUElYSS5GaWx0ZXIuY2FsbCh0aGlzLHZTaGFkZXIsIGZTaGFkZXIpO1xuXG4gICAgdGhpcy5wYWRkaW5nID0gMDtcblxuICAgIG1hc2tTcHJpdGUucmVuZGVyYWJsZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5tYXNrZWRTcHJpdGUgPSBtYXNrZWRTcHJpdGU7XG4gICAgdGhpcy5tYXNrU3ByaXRlID0gbWFza1Nwcml0ZTtcbiAgICB0aGlzLm1hc2tNYXRyaXggPSBtYXNrTWF0cml4O1xuXG4gICAgdGhpcy5zZXREaW1lbnNpb25zKCk7XG5cbiAgICAvLyB0aGlzLnlPZmZzZXQgPSAtMjM7XG59XG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQSVhJLkZpbHRlci5wcm90b3R5cGUpO1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZpZGVvTWFza0ZpbHRlcjtcbm1vZHVsZS5leHBvcnRzID0gVmlkZW9NYXNrRmlsdGVyO1xuXG4vKipcbiAqIEFwcGxpZXMgdGhlIGZpbHRlclxuICovXG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24oZmlsdGVyTWFuYWdlciwgaW5wdXQsIG91dHB1dCkge1xuXG5cbiAgdmFyIG1hc2tTcHJpdGUgPSB0aGlzLm1hc2tTcHJpdGU7XG5cbiAgdGhpcy51bmlmb3Jtcy5tYXNrID0gbWFza1Nwcml0ZS5fdGV4dHVyZTtcblxuICB2YXIgb3RoZXJNYXRyaXggPSBmaWx0ZXJNYW5hZ2VyLmNhbGN1bGF0ZVNwcml0ZU1hdHJpeChcbiAgICB0aGlzLm1hc2tNYXRyaXgsIG1hc2tTcHJpdGUgKTtcblxuICB0aGlzLnVuaWZvcm1zLm90aGVyTWF0cml4ID0gb3RoZXJNYXRyaXg7XG5cbiAgIC8vIGRyYXcgdGhlIGZpbHRlci4uLlxuICBmaWx0ZXJNYW5hZ2VyLmFwcGx5RmlsdGVyKHRoaXMsIGlucHV0LCBvdXRwdXQpO1xufTtcblxuLyoqXG4gKiBUT0RPOiB0ZXN0IGlmIHRoaXMgYWN0dWFsbHkgaXMgZG9pbmcgYW55dGhpbmdcbiAqIChpdCBzZWVtcyBhcyBpZiBnaXZpbmcgdGhlIHZpZERpbWVuc2lvbnMgYSB2YWx1ZSBvZiBgMGAgXG4gKiBicmVha3MgdGhpbmdzIGJ1dCBwYXNzaW5nIGFyYml0cmFyeSB2YWx1ZXMgaW4gYWxzbyBzZWVtcyB0byB3b3JrLi4uKVxuICovXG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLnNldERpbWVuc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHZpZERpbWVuc2lvbnMgPSB0aGlzLnVuaWZvcm1zLnZpZERpbWVuc2lvbnM7XG4gIHZpZERpbWVuc2lvbnNbMF0gPSB0aGlzLm1hc2tlZFNwcml0ZS53aWR0aDtcbiAgdmlkRGltZW5zaW9uc1sxXSA9IHRoaXMubWFza2VkU3ByaXRlLmhlaWdodCAqIDI7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhWaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLCB7XG5cblxuICAgIC8qKlxuICAgICAqIFRFU1RcbiAgICAgKi9cbiAgICB5T2Zmc2V0OiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy51bmlmb3Jtcy55T2Zmc2V0O1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy51bmlmb3Jtcy55T2Zmc2V0ID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb01hc2tGaWx0ZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBWaWRlb01hc2tGaWx0ZXIgPSByZXF1aXJlKCcuL1ZpZGVvTWFza0ZpbHRlcicpO1xuXG5cbmNsYXNzIEFscGhhVmlkZW9TcHJpdGUgZXh0ZW5kcyBQSVhJLlNwcml0ZSB7XG4gIGNvbnN0cnVjdG9yKHZpZGVvRnVsbFRleHR1cmUsIGZpbHRlclBhZGRpbmcsIGF1dG9VcGRhdGVWaWRlb1RleHR1cmUpIHtcblxuICAgIHN1cGVyKCk7XG5cbiAgICAvLyBzZXQgcGl4aSAvIGRvbSBlbGVtZW50c1xuICAgIHRoaXMuX2Z1bGxUZXh0dXJlID0gdmlkZW9GdWxsVGV4dHVyZTtcbiAgICB0aGlzLl9zcmNFbCA9IHRoaXMuX2Z1bGxUZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZTtcblxuICAgIC8vIHNldCB3aGV0aGVyIHRoZSBiYXNlVGV4dHVyZSB1cGRhdGVzIGluIGl0J3Mgb24gUkFGIGxvb3Agb3JcbiAgICAvLyBpZiB3ZSBzaG91bGQgdXNlIHRoaXMgY2xhc3MnIHVwZGF0ZSBtZXRob2QgdG8gdXBkYXRlIGl0XG4gICAgLy8gZnJvbSBzb21lIGV4dGVybmFsIGxvb3AgKHByb2JhYmx5IGEgYG1haW4gbG9vcGApXG4gICAgYXV0b1VwZGF0ZVZpZGVvVGV4dHVyZSA9IGF1dG9VcGRhdGVWaWRlb1RleHR1cmUgfHwgZmFsc2U7XG4gICAgdGhpcy5fZnVsbFRleHR1cmUuYmFzZVRleHR1cmUuYXV0b1VwZGF0ZSA9IGF1dG9VcGRhdGVWaWRlb1RleHR1cmU7XG5cbiAgICAvLyBtYWtlIHN1cmUgaXQgbG9vcHNcbiAgICB0aGlzLl9zcmNFbC5sb29wID0gdHJ1ZTtcblxuICAgIHRoaXMuc2V0dXAoYXV0b1VwZGF0ZVZpZGVvVGV4dHVyZSk7XG4gICAgdGhpcy5zZXRGaWx0ZXIoZmlsdGVyUGFkZGluZyk7XG4gICAgdGhpcy5zaGltU2NhbGVDYWxsYmFjaygpO1xuICB9XG5cbiAgc2V0dXAoKSB7XG5cbiAgICB2YXIgbmV3V2lkdGggPSB0aGlzLnNyY1dpZHRoO1xuICAgIHZhciBuZXdIZWlnaHQgPSB0aGlzLnNyY0hlaWdodCAvIDI7XG5cbiAgICAvLyBzZXQgdGhpcyBzcHJpdGUncyB0ZXh0dXJlXG4gICAgdGhpcy50ZXh0dXJlID0gbmV3IFBJWEkuVGV4dHVyZShcbiAgICAgdGhpcy5fZnVsbFRleHR1cmUsIG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSk7XG5cbiAgICAvLyBzZXQgbWFzayB0ZXh0dXJlXG4gICAgdGhpcy5tYXNrVGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoXG4gICAgIHRoaXMuX2Z1bGxUZXh0dXJlLCBuZXcgUElYSS5SZWN0YW5nbGUoMCwgbmV3SGVpZ2h0LCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSk7XG5cbiAgICAvLyBjcmVhdGUgbWFzayBzcHJpdGUgYW5kIGFkZCBhcyBjaGlsZCBvZiB0aGlzIHNwcml0ZVxuICAgIHRoaXMubWFza1Nwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZSh0aGlzLm1hc2tUZXh0dXJlKTtcbiAgICB0aGlzLmFkZENoaWxkKHRoaXMubWFza1Nwcml0ZSk7XG4gIH1cblxuICBsaXN0ZW4oKSB7XG5cbiAgfVxuXG4gIHNldEZpbHRlcihmaWx0ZXJQYWRkaW5nKSB7XG4gICAgY29uc29sZS5sb2coZmlsdGVyUGFkZGluZyk7XG4gICAgdmFyIGZpbHRlciA9IG5ldyBWaWRlb01hc2tGaWx0ZXIodGhpcywgdGhpcy5tYXNrU3ByaXRlKTtcblxuICAgIGlmIChmaWx0ZXJQYWRkaW5nKVxuICAgICAgZmlsdGVyLnBhZGRpbmcgPSBmaWx0ZXJQYWRkaW5nO1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmaWx0ZXI7XG4gICAgdGhpcy5maWx0ZXJzID0gW3RoaXMuZmlsdGVyXTtcbiAgICBcbiAgICByZXR1cm4gZmlsdGVyO1xuICB9XG5cbiAgcmVtb3ZlRmlsdGVyKCkge1xuICAgIHZhciBmaWx0ZXIgPSB0aGlzLnNwcml0ZS5maWx0ZXI7XG5cbiAgICB0aGlzLmZpbHRlcnMgPSBudWxsO1xuICAgIHRoaXMuZmlsdGVyID0gbnVsbDtcblxuICAgIHJldHVybiBmaWx0ZXI7XG4gIH1cblxuICAvLyBcbiAgLy8gU2hvdWxkIG9ubHkgdXNlIHRoaXMgaWYgbm90IHVzaW5nIGBhdXRvVXBkYXRlYFxuICAvLyAoc2VlIGNvbnN0cnVjdG9yJ3MgYGF1dG9VcGRhdGVWaWRlb1RleHR1cmVgIHBhcmFtZXRlcilcbiAgLy8gXG4gIHVwZGF0ZSgpIHtcbiAgICB0aGlzLl9mdWxsVGV4dHVyZS5iYXNlVGV4dHVyZS51cGRhdGUoKTtcbiAgfVxuXG4gIC8vIFxuICAvLyBraW5kYSBoYWNreSBidXQgdGhpcyBhbGxvd3MgdXNcbiAgLy8gdG8gYmUgbm90aWZpZWQgd2hlbiB0aGUgd2lkdGggLyBoZWlnaHQgLyBzY2FsZVxuICAvLyBjaGFuZ2VzIHNvIHdlIGNhbiBtb2RpZnkgdGhlIGZpbHRlciBkaW1lbnNpb25zIHRvXG4gIC8vIHJlZmxlY3QgdGhhdCBjaGFuZ2VcbiAgLy8gXG4gIC8vIChzZWUgYE9ic2VydmFibGVQb2ludC5qc2AgYW5kIGBUcmFuc2Zvcm1TdGF0aWMuanNgc1xuICAvLyBgb25DaGFuZ2VgIG1ldGhvZCBpbiB0aGUgUElYSSBzcmMpXG4gIC8vIFxuICBzaGltU2NhbGVDYWxsYmFjaygpIHtcblxuICAgIHZhciBzcHJpdGVTY29wZSA9IHRoaXM7XG4gICAgdmFyIHNjYWxlU2NvcGUgPSB0aGlzLnNjYWxlLnNjb3BlO1xuXG4gICAgdmFyIG9sZENCID0gdGhpcy5zY2FsZS5jYjtcblxuICAgIHZhciBuZXdDQiA9IGZ1bmN0aW9uKCkge1xuICAgICAgb2xkQ0IuY2FsbChzY2FsZVNjb3BlKTtcblxuICAgICAgLy8gYWRkIHN0dWZmIGhlcmUgaWYgbmVlZGVkXG4gICAgICBzcHJpdGVTY29wZS5maWx0ZXIuc2V0RGltZW5zaW9ucygpO1xuICAgIH1cblxuICAgIHRoaXMuc2NhbGUuY2IgPSBuZXdDQjtcbiAgfVxuXG4gIC8vIFxuICAvLyBvdmVycmlkZSBQSVhJLlNwcml0ZSdzIGB3aWR0aGAgJiBgaGVpZ2h0YCBnZXR0ZXJzICYgc2V0dGVyc1xuICAvLyBcbiAgLy8gc2VlOlxuICAvLyAtIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjg5NTA3NjAvb3ZlcnJpZGUtYS1zZXR0ZXItYW5kLXRoZS1nZXR0ZXItbXVzdC1hbHNvLWJlLW92ZXJyaWRkZW5cbiAgLy8gLSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yXG4gIC8vXG4gIGdldCB3aWR0aCgpIHtcbiAgICByZXR1cm4gc3VwZXIud2lkdGg7XG4gIH1cbiAgc2V0IHdpZHRoKHZhbHVlKSB7XG4gICAgLy9cbiAgICAvLyBkbyBzdHVmZiBoZXJlP1xuICAgIC8vIFxuICAgIHN1cGVyLndpZHRoID0gdmFsdWU7XG4gIH1cbiAgZ2V0IGhlaWdodCgpIHtcbiAgICByZXR1cm4gc3VwZXIuaGVpZ2h0O1xuICB9XG4gIHNldCBoZWlnaHQodmFsdWUpIHtcbiAgICAvL1xuICAgIC8vIGRvIHN0dWZmIGhlcmU/XG4gICAgLy8gIFxuICAgIHN1cGVyLmhlaWdodCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gXG4gIC8vIGZvciBlYXNpZXIgYWNjZXNzIHRvIHcgJiBoXG4gIC8vIFxuICBnZXQgc3JjV2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NyY0VsLnZpZGVvV2lkdGg7XG4gIH1cbiAgZ2V0IHNyY0hlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjRWwudmlkZW9IZWlnaHQ7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBbHBoYVZpZGVvU3ByaXRlOyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgQWxwaGFWaWRlb1Nwcml0ZSA9IHJlcXVpcmUoJy4vQWxwaGFWaWRlb1Nwcml0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5QSVhJLkFscGhhVmlkZW9TcHJpdGUgPSBBbHBoYVZpZGVvU3ByaXRlOyJdfQ==
