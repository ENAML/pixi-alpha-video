(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var vShader = "#define GLSLIFY 1\n\nattribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\nvarying vec2 vTextureCoord;\n\nuniform mat3 otherMatrix;\nvarying vec2 vMaskCoord;\n  \n  void main(void)\n  {\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;\n  }";
var fShader = "// \n// --------\n// Uniforms\n// --------\n// \n// 1) (vec2) vidDimensions \n//   - dimensions of the FULL video texture \n//     (including top RGB panel and bottom Alpha panel)\n// \n// 2) (float) yOffset \n//   - alpha offset from y midpoint (height / 2.0). useful if\n//      RGB panel and Alpha panel in are different heights\n//      and also for debugging.\n// \n// 3) (sampler2D) uSampler\n//   - Texture of the PIXI sprite (video) we are applying the filter to. \n//     This is passed in by PIXI.\n// \n// 4) (sampler2D) mask \n//   - Used to get alpha value. Basically the same as `uSampler`.\n//     the issue with JUST using `uSampler`, however, is that when\n//     the Alpha panel overflows the PIXI container (even if we can't\n//     see it), it won't render properly. Thus it seems we need to \n//     pass it in again, as a full, uncropped texture.\n// \n// \n// TODO\n// - Use STPQ (texture coord syntax) for accessing textures ??\n// \n// NOTES\n// - Final post in this thread might be useful:\n//   https://github.com/pixijs/pixi.js/issues/1977\n//  \n\nprecision lowp float;\n#define GLSLIFY 1\n\nvarying vec2 vTextureCoord;\nvarying vec2 vMaskCoord;\nvarying vec4 vColor;\n\nuniform vec2 vidDimensions;\nuniform float yOffset;\nuniform sampler2D uSampler;\nuniform sampler2D mask;\n\nvoid main(void)\n{\n\n  vec2 onePixel = vec2(1.0 / vidDimensions);\n\n  float offsetHeight = yOffset + vidDimensions.y;\n\n  float filterHeight = offsetHeight * onePixel.y;\n  float halfHeight = filterHeight / 2.0;\n\n  float alphaPixelY = vTextureCoord.y + (halfHeight * onePixel.y);\n  vec2 alphaPixel = vec2(vTextureCoord.x, alphaPixelY);\n\n  vec4 colorPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));\n  vec4 alphaPx = texture2D(mask, vec2(vMaskCoord.x, vMaskCoord.y + halfHeight));\n\n  float alpha = alphaPx.r;\n\n  /**\n   * pixel alpha is based on Y position (top is `0`, bottom is `1`)\n   */\n  // float pctDown = vTextureCoord.y / filterHeight;\n  // color *= pctDown;\n  // gl_FragColor = vec4(colorPx.rgb, pctDown);\n\n  /**\n   * just the video in it's original state\n   */\n  // gl_FragColor = colorPx;\n  \n  /**\n   * just show the alpha half\n   */\n  // gl_FragColor = alphaPx;\n  \n  /**\n   * actual working version\n   */\n  gl_FragColor = vec4(colorPx.rgb * alpha, alpha);\n}";

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

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var VideoMaskFilter = require('./VideoMaskFilter');

var AlphaVideoSprite = function (_PIXI$Sprite) {
  _inherits(AlphaVideoSprite, _PIXI$Sprite);

  function AlphaVideoSprite(videoFullTexture) {
    _classCallCheck(this, AlphaVideoSprite);

    // set pixi / dom elements
    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(AlphaVideoSprite).call(this));

    _this._fullTexture = videoFullTexture;
    _this._srcEl = _this._fullTexture.baseTexture.source;

    // make sure it loops
    _this._srcEl.loop = true;

    _this.setup();
    _this.setFilter();
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
    value: function setFilter() {
      var filter = new VideoMaskFilter(this, this.maskSprite);

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
'use strict';

var AlphaVideoSprite = require('./AlphaVideoSprite');

module.exports = PIXI.AlphaVideoSprite = AlphaVideoSprite;

},{"./AlphaVideoSprite":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9WaWRlb01hc2tGaWx0ZXIvaW5kZXguanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9pbmRleC5qcyIsInNvdXJjZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUlBLElBQUksVUFBVSwwYUFBZDtBQUNBLElBQUksVUFBVSx3eEVBQWQ7O0FBR0E7Ozs7Ozs7O0FBUUEsU0FBUyxlQUFULENBQXlCLFlBQXpCLEVBQXVDLFVBQXZDLEVBQW1EOztBQUUvQyxNQUFJLGFBQWEsSUFBSSxLQUFLLE1BQVQsRUFBakI7O0FBRUEsT0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFqQixFQUFzQixPQUF0QixFQUErQixPQUEvQjs7QUFFQSxhQUFXLFVBQVgsR0FBd0IsS0FBeEI7O0FBRUEsT0FBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCOztBQUVBLE9BQUssYUFBTDs7QUFFQTtBQUNIO0FBQ0QsZ0JBQWdCLFNBQWhCLEdBQTRCLE9BQU8sTUFBUCxDQUFjLEtBQUssTUFBTCxDQUFZLFNBQTFCLENBQTVCO0FBQ0EsZ0JBQWdCLFNBQWhCLENBQTBCLFdBQTFCLEdBQXdDLGVBQXhDO0FBQ0EsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOztBQUVBOzs7QUFHQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsS0FBMUIsR0FBa0MsVUFBUyxhQUFULEVBQXdCLEtBQXhCLEVBQStCLE1BQS9CLEVBQXVDOztBQUd2RSxNQUFJLGFBQWEsS0FBSyxVQUF0Qjs7QUFFQSxPQUFLLFFBQUwsQ0FBYyxJQUFkLEdBQXFCLFdBQVcsUUFBaEM7O0FBRUEsTUFBSSxjQUFjLGNBQWMscUJBQWQsQ0FDaEIsS0FBSyxVQURXLEVBQ0MsVUFERCxDQUFsQjs7QUFHQSxPQUFL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O0FBT0EsV0FBSyxLQUFMLENBQVcsRUFBWCxHQUFnQixLQUFoQjtBQUNEOztBQUVEO0FBQ0E7QUFDQTs7Ozt3QkFDZTtBQUNiLGFBQU8sS0FBSyxNQUFMLENBQVksVUFBbkI7QUFDRDs7O3dCQUNlO0FBQ2QsYUFBTyxLQUFLLE1BQUwsQ0FBWSxXQUFuQjtBQUNEOzs7O0VBM0Y0QixLQUFLLE07O0FBOEZwQyxPQUFPLE9BQVAsR0FBaUIsZ0JBQWpCOzs7QUNuR0E7O0FBRUEsSUFBTSxtQkFBbUIsUUFBUSxvQkFBUixDQUF6Qjs7QUFFQSxPQUFPLE9BQVAsR0FBaUIsS0FBSyxnQkFBTCxHQUF3QixnQkFBekMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5cblxudmFyIHZTaGFkZXIgPSBcIiNkZWZpbmUgR0xTTElGWSAxXFxuXFxuYXR0cmlidXRlIHZlYzIgYVZlcnRleFBvc2l0aW9uO1xcbmF0dHJpYnV0ZSB2ZWMyIGFUZXh0dXJlQ29vcmQ7XFxuXFxudW5pZm9ybSBtYXQzIHByb2plY3Rpb25NYXRyaXg7XFxudmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XFxuXFxudW5pZm9ybSBtYXQzIG90aGVyTWF0cml4O1xcbnZhcnlpbmcgdmVjMiB2TWFza0Nvb3JkO1xcbiAgXFxuICB2b2lkIG1haW4odm9pZClcXG4gIHtcXG4gICAgZ2xfUG9zaXRpb24gPSB2ZWM0KChwcm9qZWN0aW9uTWF0cml4ICogdmVjMyhhVmVydGV4UG9zaXRpb24sIDEuMCkpLnh5LCAwLjAsIDEuMCk7XFxuICAgIHZUZXh0dXJlQ29vcmQgPSBhVGV4dHVyZUNvb3JkO1xcbiAgICB2TWFza0Nvb3JkID0gKCBvdGhlck1hdHJpeCAqIHZlYzMoIGFUZXh0dXJlQ29vcmQsIDEuMCkgICkueHk7XFxuICB9XCI7XG52YXIgZlNoYWRlciA9IFwiLy8gXFxuLy8gLS0tLS0tLS1cXG4vLyBVbmlmb3Jtc1xcbi8vIC0tLS0tLS0tXFxuLy8gXFxuLy8gMSkgKHZlYzIpIHZpZERpbWVuc2lvbnMgXFxuLy8gICAtIGRpbWVuc2lvbnMgb2YgdGhlIEZVTEwgdmlkZW8gdGV4dHVyZSBcXG4vLyAgICAgKGluY2x1ZGluZyB0b3AgUkdCIHBhbmVsIGFuZCBib3R0b20gQWxwaGEgcGFuZWwpXFxuLy8gXFxuLy8gMikgKGZsb2F0KSB5T2Zmc2V0IFxcbi8vICAgLSBhbHBoYSBvZmZzZXQgZnJvbSB5IG1pZHBvaW50IChoZWlnaHQgLyAyLjApLiB1c2VmdWwgaWZcXG4vLyAgICAgIFJHQiBwYW5lbCBhbmQgQWxwaGEgcGFuZWwgaW4gYXJlIGRpZmZlcmVudCBoZWlnaHRzXFxuLy8gICAgICBhbmQgYWxzbyBmb3IgZGVidWdnaW5nLlxcbi8vIFxcbi8vIDMpIChzYW1wbGVyMkQpIHVTYW1wbGVyXFxuLy8gICAtIFRleHR1cmUgb2YgdGhlIFBJWEkgc3ByaXRlICh2aWRlbykgd2UgYXJlIGFwcGx5aW5nIHRoZSBmaWx0ZXIgdG8uIFxcbi8vICAgICBUaGlzIGlzIHBhc3NlZCBpbiBieSBQSVhJLlxcbi8vIFxcbi8vIDQpIChzYW1wbGVyMkQpIG1hc2sgXFxuLy8gICAtIFVzZWQgdG8gZ2V0IGFscGhhIHZhbHVlLiBCYXNpY2FsbHkgdGhlIHNhbWUgYXMgYHVTYW1wbGVyYC5cXG4vLyAgICAgdGhlIGlzc3VlIHdpdGggSlVTVCB1c2luZyBgdVNhbXBsZXJgLCBob3dldmVyLCBpcyB0aGF0IHdoZW5cXG4vLyAgICAgdGhlIEFscGhhIHBhbmVsIG92ZXJmbG93cyB0aGUgUElYSSBjb250YWluZXIgKGV2ZW4gaWYgd2UgY2FuJ3RcXG4vLyAgICAgc2VlIGl0KSwgaXQgd29uJ3QgcmVuZGVyIHByb3Blcmx5LiBUaHVzIGl0IHNlZW1zIHdlIG5lZWQgdG8gXFxuLy8gICAgIHBhc3MgaXQgaW4gYWdhaW4sIGFzIGEgZnVsbCwgdW5jcm9wcGVkIHRleHR1cmUuXFxuLy8gXFxuLy8gXFxuLy8gVE9ET1xcbi8vIC0gVXNlIFNUUFEgKHRleHR1cmUgY29vcmQgc3ludGF4KSBmb3IgYWNjZXNzaW5nIHRleHR1cmVzID8/XFxuLy8gXFxuLy8gTk9URVNcXG4vLyAtIEZpbmFsIHBvc3QgaW4gdGhpcyB0aHJlYWQgbWlnaHQgYmUgdXNlZnVsOlxcbi8vICAgaHR0cHM6Ly9naXRodWIuY29tL3BpeGlqcy9waXhpLmpzL2lzc3Vlcy8xOTc3XFxuLy8gIFxcblxcbnByZWNpc2lvbiBsb3dwIGZsb2F0O1xcbiNkZWZpbmUgR0xTTElGWSAxXFxuXFxudmFyeWluZyB2ZWMyIHZUZXh0dXJlQ29vcmQ7XFxudmFyeWluZyB2ZWMyIHZNYXNrQ29vcmQ7XFxudmFyeWluZyB2ZWM0IHZDb2xvcjtcXG5cXG51bmlmb3JtIHZlYzIgdmlkRGltZW5zaW9ucztcXG51bmlmb3JtIGZsb2F0IHlPZmZzZXQ7XFxudW5pZm9ybSBzYW1wbGVyMkQgdVNhbXBsZXI7XFxudW5pZm9ybSBzYW1wbGVyMkQgbWFzaztcXG5cXG52b2lkIG1haW4odm9pZClcXG57XFxuXFxuICB2ZWMyIG9uZVBpeGVsID0gdmVjMigxLjAgLyB2aWREaW1lbnNpb25zKTtcXG5cXG4gIGZsb2F0IG9mZnNldEhlaWdodCA9IHlPZmZzZXQgKyB2aWREaW1lbnNpb25zLnk7XFxuXFxuICBmbG9hdCBmaWx0ZXJIZWlnaHQgPSBvZmZzZXRIZWlnaHQgKiBvbmVQaXhlbC55O1xcbiAgZmxvYXQgaGFsZkhlaWdodCA9IGZpbHRlckhlaWdodCAvIDIuMDtcXG5cXG4gIGZsb2F0IGFscGhhUGl4ZWxZID0gdlRleHR1cmVDb29yZC55ICsgKGhhbGZIZWlnaHQgKiBvbmVQaXhlbC55KTtcXG4gIHZlYzIgYWxwaGFQaXhlbCA9IHZlYzIodlRleHR1cmVDb29yZC54LCBhbHBoYVBpeGVsWSk7XFxuXFxuICB2ZWM0IGNvbG9yUHggPSB0ZXh0dXJlMkQodVNhbXBsZXIsIHZlYzIodlRleHR1cmVDb29yZC54LCB2VGV4dHVyZUNvb3JkLnkpKTtcXG4gIHZlYzQgYWxwaGFQeCA9IHRleHR1cmUyRChtYXNrLCB2ZWMyKHZNYXNrQ29vcmQueCwgdk1hc2tDb29yZC55ICsgaGFsZkhlaWdodCkpO1xcblxcbiAgZmxvYXQgYWxwaGEgPSBhbHBoYVB4LnI7XFxuXFxuICAvKipcXG4gICAqIHBpeGVsIGFscGhhIGlzIGJhc2VkIG9uIFkgcG9zaXRpb24gKHRvcCBpcyBgMGAsIGJvdHRvbSBpcyBgMWApXFxuICAgKi9cXG4gIC8vIGZsb2F0IHBjdERvd24gPSB2VGV4dHVyZUNvb3JkLnkgLyBmaWx0ZXJIZWlnaHQ7XFxuICAvLyBjb2xvciAqPSBwY3REb3duO1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gdmVjNChjb2xvclB4LnJnYiwgcGN0RG93bik7XFxuXFxuICAvKipcXG4gICAqIGp1c3QgdGhlIHZpZGVvIGluIGl0J3Mgb3JpZ2luYWwgc3RhdGVcXG4gICAqL1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gY29sb3JQeDtcXG4gIFxcbiAgLyoqXFxuICAgKiBqdXN0IHNob3cgdGhlIGFscGhhIGhhbGZcXG4gICAqL1xcbiAgLy8gZ2xfRnJhZ0NvbG9yID0gYWxwaGFQeDtcXG4gIFxcbiAgLyoqXFxuICAgKiBhY3R1YWwgd29ya2luZyB2ZXJzaW9uXFxuICAgKi9cXG4gIGdsX0ZyYWdDb2xvciA9IHZlYzQoY29sb3JQeC5yZ2IgKiBhbHBoYSwgYWxwaGEpO1xcbn1cIjtcblxuXG4vKipcbiAqIFRoZSBWaWRlb01hc2tGaWx0ZXIgY2xhc3NcbiAqXG4gKiBAY2xhc3NcbiAqIEBleHRlbmRzIFBJWEkuRmlsdGVyXG4gKiBAbWVtYmVyb2YgUElYSVxuICogQHBhcmFtIHNwcml0ZSB7UElYSS5TcHJpdGV9IHRoZSB0YXJnZXQgc3ByaXRlXG4gKi9cbmZ1bmN0aW9uIFZpZGVvTWFza0ZpbHRlcihtYXNrZWRTcHJpdGUsIG1hc2tTcHJpdGUpIHtcblxuICAgIHZhciBtYXNrTWF0cml4ID0gbmV3IFBJWEkuTWF0cml4KCk7XG5cbiAgICBQSVhJLkZpbHRlci5jYWxsKHRoaXMsdlNoYWRlciwgZlNoYWRlcik7XG5cbiAgICBtYXNrU3ByaXRlLnJlbmRlcmFibGUgPSBmYWxzZTtcblxuICAgIHRoaXMubWFza2VkU3ByaXRlID0gbWFza2VkU3ByaXRlO1xuICAgIHRoaXMubWFza1Nwcml0ZSA9IG1hc2tTcHJpdGU7XG4gICAgdGhpcy5tYXNrTWF0cml4ID0gbWFza01hdHJpeDtcblxuICAgIHRoaXMuc2V0RGltZW5zaW9ucygpO1xuXG4gICAgLy8gdGhpcy55T2Zmc2V0ID0gLTIzO1xufVxuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUElYSS5GaWx0ZXIucHJvdG90eXBlKTtcblZpZGVvTWFza0ZpbHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWaWRlb01hc2tGaWx0ZXI7XG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTWFza0ZpbHRlcjtcblxuLyoqXG4gKiBBcHBsaWVzIHRoZSBmaWx0ZXJcbiAqL1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uKGZpbHRlck1hbmFnZXIsIGlucHV0LCBvdXRwdXQpIHtcblxuXG4gIHZhciBtYXNrU3ByaXRlID0gdGhpcy5tYXNrU3ByaXRlO1xuXG4gIHRoaXMudW5pZm9ybXMubWFzayA9IG1hc2tTcHJpdGUuX3RleHR1cmU7XG5cbiAgdmFyIG90aGVyTWF0cml4ID0gZmlsdGVyTWFuYWdlci5jYWxjdWxhdGVTcHJpdGVNYXRyaXgoXG4gICAgdGhpcy5tYXNrTWF0cml4LCBtYXNrU3ByaXRlICk7XG5cbiAgdGhpcy51bmlmb3Jtcy5vdGhlck1hdHJpeCA9IG90aGVyTWF0cml4O1xuXG4gICAvLyBkcmF3IHRoZSBmaWx0ZXIuLi5cbiAgZmlsdGVyTWFuYWdlci5hcHBseUZpbHRlcih0aGlzLCBpbnB1dCwgb3V0cHV0KTtcbn07XG5cbi8qKlxuICogVE9ETzogdGVzdCBpZiB0aGlzIGFjdHVhbGx5IGlzIGRvaW5nIGFueXRoaW5nXG4gKiAoaXQgc2VlbXMgYXMgaWYgZ2l2aW5nIHRoZSB2aWREaW1lbnNpb25zIGEgdmFsdWUgb2YgYDBgIFxuICogYnJlYWtzIHRoaW5ncyBidXQgcGFzc2luZyBhcmJpdHJhcnkgdmFsdWVzIGluIGFsc28gc2VlbXMgdG8gd29yay4uLilcbiAqL1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5zZXREaW1lbnNpb25zID0gZnVuY3Rpb24oKSB7XG4gIHZhciB2aWREaW1lbnNpb25zID0gdGhpcy51bmlmb3Jtcy52aWREaW1lbnNpb25zO1xuICB2aWREaW1lbnNpb25zWzBdID0gdGhpcy5tYXNrZWRTcHJpdGUud2lkdGg7XG4gIHZpZERpbWVuc2lvbnNbMV0gPSB0aGlzLm1hc2tlZFNwcml0ZS5oZWlnaHQgKiAyO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZSwge1xuXG5cbiAgICAvKipcbiAgICAgKiBURVNUXG4gICAgICovXG4gICAgeU9mZnNldDoge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudW5pZm9ybXMueU9mZnNldDtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMudW5pZm9ybXMueU9mZnNldCA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gVmlkZW9NYXNrRmlsdGVyOyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgVmlkZW9NYXNrRmlsdGVyID0gcmVxdWlyZSgnLi9WaWRlb01hc2tGaWx0ZXInKTtcblxuXG5jbGFzcyBBbHBoYVZpZGVvU3ByaXRlIGV4dGVuZHMgUElYSS5TcHJpdGUge1xuICBjb25zdHJ1Y3Rvcih2aWRlb0Z1bGxUZXh0dXJlKSB7XG5cbiAgICBzdXBlcigpO1xuXG4gICAgLy8gc2V0IHBpeGkgLyBkb20gZWxlbWVudHNcbiAgICB0aGlzLl9mdWxsVGV4dHVyZSA9IHZpZGVvRnVsbFRleHR1cmU7XG4gICAgdGhpcy5fc3JjRWwgPSB0aGlzLl9mdWxsVGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2U7XG5cbiAgICAvLyBtYWtlIHN1cmUgaXQgbG9vcHNcbiAgICB0aGlzLl9zcmNFbC5sb29wID0gdHJ1ZTtcblxuICAgIHRoaXMuc2V0dXAoKTtcbiAgICB0aGlzLnNldEZpbHRlcigpO1xuICAgIHRoaXMuc2hpbVNjYWxlQ2FsbGJhY2soKTtcbiAgfVxuXG4gIHNldHVwKCkge1xuXG4gICAgdmFyIG5ld1dpZHRoID0gdGhpcy5zcmNXaWR0aDtcbiAgICB2YXIgbmV3SGVpZ2h0ID0gdGhpcy5zcmNIZWlnaHQgLyAyO1xuXG4gICAgLy8gc2V0IHRoaXMgc3ByaXRlJ3MgdGV4dHVyZVxuICAgIHRoaXMudGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoXG4gICAgIHRoaXMuX2Z1bGxUZXh0dXJlLCBuZXcgUElYSS5SZWN0YW5nbGUoMCwgMCwgbmV3V2lkdGgsIG5ld0hlaWdodCkpO1xuXG4gICAgLy8gc2V0IG1hc2sgdGV4dHVyZVxuICAgIHRoaXMubWFza1RleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlKFxuICAgICB0aGlzLl9mdWxsVGV4dHVyZSwgbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIG5ld0hlaWdodCwgbmV3V2lkdGgsIG5ld0hlaWdodCkpO1xuXG4gICAgLy8gY3JlYXRlIG1hc2sgc3ByaXRlIGFuZCBhZGQgYXMgY2hpbGQgb2YgdGhpcyBzcHJpdGVcbiAgICB0aGlzLm1hc2tTcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUodGhpcy5tYXNrVGV4dHVyZSk7XG4gICAgdGhpcy5hZGRDaGlsZCh0aGlzLm1hc2tTcHJpdGUpO1xuICB9XG5cbiAgbGlzdGVuKCkge1xuXG4gIH1cblxuICBzZXRGaWx0ZXIoKSB7XG4gICAgdmFyIGZpbHRlciA9IG5ldyBWaWRlb01hc2tGaWx0ZXIodGhpcywgdGhpcy5tYXNrU3ByaXRlKTtcblxuICAgIHRoaXMuZmlsdGVyID0gZmlsdGVyO1xuICAgIHRoaXMuZmlsdGVycyA9IFt0aGlzLmZpbHRlcl07XG4gICAgXG4gICAgcmV0dXJuIGZpbHRlcjtcbiAgfVxuXG4gIHJlbW92ZUZpbHRlcigpIHtcbiAgICB2YXIgZmlsdGVyID0gdGhpcy5zcHJpdGUuZmlsdGVyO1xuXG4gICAgdGhpcy5maWx0ZXJzID0gbnVsbDtcbiAgICB0aGlzLmZpbHRlciA9IG51bGw7XG5cbiAgICByZXR1cm4gZmlsdGVyO1xuICB9XG5cbiAgLy8gXG4gIC8vIGtpbmRhIGhhY2t5IGJ1dCB0aGlzIGFsbG93cyB1c1xuICAvLyB0byBiZSBub3RpZmllZCB3aGVuIHRoZSB3aWR0aCAvIGhlaWdodCAvIHNjYWxlXG4gIC8vIGNoYW5nZXMgc28gd2UgY2FuIG1vZGlmeSB0aGUgZmlsdGVyIGRpbWVuc2lvbnMgdG9cbiAgLy8gcmVmbGVjdCB0aGF0IGNoYW5nZVxuICAvLyBcbiAgLy8gKHNlZSBgT2JzZXJ2YWJsZVBvaW50LmpzYCBhbmQgYFRyYW5zZm9ybVN0YXRpYy5qc2BzXG4gIC8vIGBvbkNoYW5nZWAgbWV0aG9kIGluIHRoZSBQSVhJIHNyYylcbiAgLy8gXG4gIHNoaW1TY2FsZUNhbGxiYWNrKCkge1xuXG4gICAgdmFyIHNwcml0ZVNjb3BlID0gdGhpcztcbiAgICB2YXIgc2NhbGVTY29wZSA9IHRoaXMuc2NhbGUuc2NvcGU7XG5cbiAgICB2YXIgb2xkQ0IgPSB0aGlzLnNjYWxlLmNiO1xuXG4gICAgdmFyIG5ld0NCID0gZnVuY3Rpb24oKSB7XG4gICAgICBvbGRDQi5jYWxsKHNjYWxlU2NvcGUpO1xuXG4gICAgICAvLyBhZGQgc3R1ZmYgaGVyZSBpZiBuZWVkZWRcbiAgICAgIHNwcml0ZVNjb3BlLmZpbHRlci5zZXREaW1lbnNpb25zKCk7XG4gICAgfVxuXG4gICAgdGhpcy5zY2FsZS5jYiA9IG5ld0NCO1xuICB9XG5cbiAgLy8gXG4gIC8vIGZvciBlYXNpZXIgYWNjZXNzIHRvIHcgJiBoXG4gIC8vIFxuICBnZXQgc3JjV2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NyY0VsLnZpZGVvV2lkdGg7XG4gIH1cbiAgZ2V0IHNyY0hlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjRWwudmlkZW9IZWlnaHQ7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBbHBoYVZpZGVvU3ByaXRlOyIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgQWxwaGFWaWRlb1Nwcml0ZSA9IHJlcXVpcmUoJy4vQWxwaGFWaWRlb1Nwcml0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBJWEkuQWxwaGFWaWRlb1Nwcml0ZSA9IEFscGhhVmlkZW9TcHJpdGU7Il19
