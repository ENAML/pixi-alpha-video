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
(function (global){
'use strict';

var AlphaVideoSprite = require('./AlphaVideoSprite');

module.exports = global.PIXI.AlphaVideoSprite = AlphaVideoSprite;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./AlphaVideoSprite":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9WaWRlb01hc2tGaWx0ZXIvaW5kZXguanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9pbmRleC5qcyIsInNvdXJjZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUlBLElBQUksVUFBVSwwYUFBZDtBQUNBLElBQUksVUFBVSx3eEVBQWQ7O0FBR0E7Ozs7Ozs7O0FBUUEsU0FBUyxlQUFULENBQXlCLFlBQXpCLEVBQXVDLFVBQXZDLEVBQW1EOztBQUUvQyxNQUFJLGFBQWEsSUFBSSxLQUFLLE1BQVQsRUFBakI7O0FBRUEsT0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFqQixFQUFzQixPQUF0QixFQUErQixPQUEvQjs7QUFFQSxhQUFXLFVBQVgsR0FBd0IsS0FBeEI7O0FBRUEsT0FBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCOztBQUVBLE9BQUssYUFBTDs7QUFFQTtBQUNIO0FBQ0QsZ0JBQWdCLFNBQWhCLEdBQTRCLE9BQU8sTUFBUCxDQUFjLEtBQUssTUFBTCxDQUFZLFNBQTFCLENBQTVCO0FBQ0EsZ0JBQWdCLFNBQWhCLENBQTBCLFdBQTFCLEdBQXdDLGVBQXhDO0FBQ0EsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOztBQUVBOzs7QUFHQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsS0FBMUIsR0FBa0MsVUFBUyxhQUFULEVBQXdCLEtBQXhCLEVBQStCLE1BQS9CLEVBQXVDOztBQUd2RSxNQUFJLGFBQWEsS0FBSyxVQUF0Qjs7QUFFQSxPQUFLLFFBQUwsQ0FBYyxJQUFkLEdBQXFCLFdBQVcsUUFBaEM7O0FBRUEsTUFBSSxjQUFjLGNBQWMscUJBQWQsQ0FDaEIsS0FBSyxVQURXLEVBQ0MsVUFERCxDQUFsQjs7QUFHQSxPQUFL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O0FBT0EsV0FBSyxLQUFMLENBQVcsRUFBWCxHQUFnQixLQUFoQjtBQUNEOztBQUVEO0FBQ0E7QUFDQTs7Ozt3QkFDZTtBQUNiLGFBQU8sS0FBSyxNQUFMLENBQVksVUFBbkI7QUFDRDs7O3dCQUNlO0FBQ2QsYUFBTyxLQUFLLE1BQUwsQ0FBWSxXQUFuQjtBQUNEOzs7O0VBM0Y0QixLQUFLLE07O0FBOEZwQyxPQUFPLE9BQVAsR0FBaUIsZ0JBQWpCOzs7O0FDbkdBOztBQUVBLElBQU0sbUJBQW1CLFFBQVEsb0JBQVIsQ0FBekI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE9BQU8sSUFBUCxDQUFZLGdCQUFaLEdBQStCLGdCQUFoRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cblxuXG52YXIgdlNoYWRlciA9IFwiI2RlZmluZSBHTFNMSUZZIDFcXG5cXG5hdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XFxuYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcXG5cXG51bmlmb3JtIG1hdDMgcHJvamVjdGlvbk1hdHJpeDtcXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcXG5cXG51bmlmb3JtIG1hdDMgb3RoZXJNYXRyaXg7XFxudmFyeWluZyB2ZWMyIHZNYXNrQ29vcmQ7XFxuICBcXG4gIHZvaWQgbWFpbih2b2lkKVxcbiAge1xcbiAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoKHByb2plY3Rpb25NYXRyaXggKiB2ZWMzKGFWZXJ0ZXhQb3NpdGlvbiwgMS4wKSkueHksIDAuMCwgMS4wKTtcXG4gICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XFxuICAgIHZNYXNrQ29vcmQgPSAoIG90aGVyTWF0cml4ICogdmVjMyggYVRleHR1cmVDb29yZCwgMS4wKSAgKS54eTtcXG4gIH1cIjtcbnZhciBmU2hhZGVyID0gXCIvLyBcXG4vLyAtLS0tLS0tLVxcbi8vIFVuaWZvcm1zXFxuLy8gLS0tLS0tLS1cXG4vLyBcXG4vLyAxKSAodmVjMikgdmlkRGltZW5zaW9ucyBcXG4vLyAgIC0gZGltZW5zaW9ucyBvZiB0aGUgRlVMTCB2aWRlbyB0ZXh0dXJlIFxcbi8vICAgICAoaW5jbHVkaW5nIHRvcCBSR0IgcGFuZWwgYW5kIGJvdHRvbSBBbHBoYSBwYW5lbClcXG4vLyBcXG4vLyAyKSAoZmxvYXQpIHlPZmZzZXQgXFxuLy8gICAtIGFscGhhIG9mZnNldCBmcm9tIHkgbWlkcG9pbnQgKGhlaWdodCAvIDIuMCkuIHVzZWZ1bCBpZlxcbi8vICAgICAgUkdCIHBhbmVsIGFuZCBBbHBoYSBwYW5lbCBpbiBhcmUgZGlmZmVyZW50IGhlaWdodHNcXG4vLyAgICAgIGFuZCBhbHNvIGZvciBkZWJ1Z2dpbmcuXFxuLy8gXFxuLy8gMykgKHNhbXBsZXIyRCkgdVNhbXBsZXJcXG4vLyAgIC0gVGV4dHVyZSBvZiB0aGUgUElYSSBzcHJpdGUgKHZpZGVvKSB3ZSBhcmUgYXBwbHlpbmcgdGhlIGZpbHRlciB0by4gXFxuLy8gICAgIFRoaXMgaXMgcGFzc2VkIGluIGJ5IFBJWEkuXFxuLy8gXFxuLy8gNCkgKHNhbXBsZXIyRCkgbWFzayBcXG4vLyAgIC0gVXNlZCB0byBnZXQgYWxwaGEgdmFsdWUuIEJhc2ljYWxseSB0aGUgc2FtZSBhcyBgdVNhbXBsZXJgLlxcbi8vICAgICB0aGUgaXNzdWUgd2l0aCBKVVNUIHVzaW5nIGB1U2FtcGxlcmAsIGhvd2V2ZXIsIGlzIHRoYXQgd2hlblxcbi8vICAgICB0aGUgQWxwaGEgcGFuZWwgb3ZlcmZsb3dzIHRoZSBQSVhJIGNvbnRhaW5lciAoZXZlbiBpZiB3ZSBjYW4ndFxcbi8vICAgICBzZWUgaXQpLCBpdCB3b24ndCByZW5kZXIgcHJvcGVybHkuIFRodXMgaXQgc2VlbXMgd2UgbmVlZCB0byBcXG4vLyAgICAgcGFzcyBpdCBpbiBhZ2FpbiwgYXMgYSBmdWxsLCB1bmNyb3BwZWQgdGV4dHVyZS5cXG4vLyBcXG4vLyBcXG4vLyBUT0RPXFxuLy8gLSBVc2UgU1RQUSAodGV4dHVyZSBjb29yZCBzeW50YXgpIGZvciBhY2Nlc3NpbmcgdGV4dHVyZXMgPz9cXG4vLyBcXG4vLyBOT1RFU1xcbi8vIC0gRmluYWwgcG9zdCBpbiB0aGlzIHRocmVhZCBtaWdodCBiZSB1c2VmdWw6XFxuLy8gICBodHRwczovL2dpdGh1Yi5jb20vcGl4aWpzL3BpeGkuanMvaXNzdWVzLzE5NzdcXG4vLyAgXFxuXFxucHJlY2lzaW9uIGxvd3AgZmxvYXQ7XFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcXG52YXJ5aW5nIHZlYzIgdk1hc2tDb29yZDtcXG52YXJ5aW5nIHZlYzQgdkNvbG9yO1xcblxcbnVuaWZvcm0gdmVjMiB2aWREaW1lbnNpb25zO1xcbnVuaWZvcm0gZmxvYXQgeU9mZnNldDtcXG51bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcXG51bmlmb3JtIHNhbXBsZXIyRCBtYXNrO1xcblxcbnZvaWQgbWFpbih2b2lkKVxcbntcXG5cXG4gIHZlYzIgb25lUGl4ZWwgPSB2ZWMyKDEuMCAvIHZpZERpbWVuc2lvbnMpO1xcblxcbiAgZmxvYXQgb2Zmc2V0SGVpZ2h0ID0geU9mZnNldCArIHZpZERpbWVuc2lvbnMueTtcXG5cXG4gIGZsb2F0IGZpbHRlckhlaWdodCA9IG9mZnNldEhlaWdodCAqIG9uZVBpeGVsLnk7XFxuICBmbG9hdCBoYWxmSGVpZ2h0ID0gZmlsdGVySGVpZ2h0IC8gMi4wO1xcblxcbiAgZmxvYXQgYWxwaGFQaXhlbFkgPSB2VGV4dHVyZUNvb3JkLnkgKyAoaGFsZkhlaWdodCAqIG9uZVBpeGVsLnkpO1xcbiAgdmVjMiBhbHBoYVBpeGVsID0gdmVjMih2VGV4dHVyZUNvb3JkLngsIGFscGhhUGl4ZWxZKTtcXG5cXG4gIHZlYzQgY29sb3JQeCA9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSkpO1xcbiAgdmVjNCBhbHBoYVB4ID0gdGV4dHVyZTJEKG1hc2ssIHZlYzIodk1hc2tDb29yZC54LCB2TWFza0Nvb3JkLnkgKyBoYWxmSGVpZ2h0KSk7XFxuXFxuICBmbG9hdCBhbHBoYSA9IGFscGhhUHgucjtcXG5cXG4gIC8qKlxcbiAgICogcGl4ZWwgYWxwaGEgaXMgYmFzZWQgb24gWSBwb3NpdGlvbiAodG9wIGlzIGAwYCwgYm90dG9tIGlzIGAxYClcXG4gICAqL1xcbiAgLy8gZmxvYXQgcGN0RG93biA9IHZUZXh0dXJlQ29vcmQueSAvIGZpbHRlckhlaWdodDtcXG4gIC8vIGNvbG9yICo9IHBjdERvd247XFxuICAvLyBnbF9GcmFnQ29sb3IgPSB2ZWM0KGNvbG9yUHgucmdiLCBwY3REb3duKTtcXG5cXG4gIC8qKlxcbiAgICoganVzdCB0aGUgdmlkZW8gaW4gaXQncyBvcmlnaW5hbCBzdGF0ZVxcbiAgICovXFxuICAvLyBnbF9GcmFnQ29sb3IgPSBjb2xvclB4O1xcbiAgXFxuICAvKipcXG4gICAqIGp1c3Qgc2hvdyB0aGUgYWxwaGEgaGFsZlxcbiAgICovXFxuICAvLyBnbF9GcmFnQ29sb3IgPSBhbHBoYVB4O1xcbiAgXFxuICAvKipcXG4gICAqIGFjdHVhbCB3b3JraW5nIHZlcnNpb25cXG4gICAqL1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNChjb2xvclB4LnJnYiAqIGFscGhhLCBhbHBoYSk7XFxufVwiO1xuXG5cbi8qKlxuICogVGhlIFZpZGVvTWFza0ZpbHRlciBjbGFzc1xuICpcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMgUElYSS5GaWx0ZXJcbiAqIEBtZW1iZXJvZiBQSVhJXG4gKiBAcGFyYW0gc3ByaXRlIHtQSVhJLlNwcml0ZX0gdGhlIHRhcmdldCBzcHJpdGVcbiAqL1xuZnVuY3Rpb24gVmlkZW9NYXNrRmlsdGVyKG1hc2tlZFNwcml0ZSwgbWFza1Nwcml0ZSkge1xuXG4gICAgdmFyIG1hc2tNYXRyaXggPSBuZXcgUElYSS5NYXRyaXgoKTtcblxuICAgIFBJWEkuRmlsdGVyLmNhbGwodGhpcyx2U2hhZGVyLCBmU2hhZGVyKTtcblxuICAgIG1hc2tTcHJpdGUucmVuZGVyYWJsZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5tYXNrZWRTcHJpdGUgPSBtYXNrZWRTcHJpdGU7XG4gICAgdGhpcy5tYXNrU3ByaXRlID0gbWFza1Nwcml0ZTtcbiAgICB0aGlzLm1hc2tNYXRyaXggPSBtYXNrTWF0cml4O1xuXG4gICAgdGhpcy5zZXREaW1lbnNpb25zKCk7XG5cbiAgICAvLyB0aGlzLnlPZmZzZXQgPSAtMjM7XG59XG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQSVhJLkZpbHRlci5wcm90b3R5cGUpO1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZpZGVvTWFza0ZpbHRlcjtcbm1vZHVsZS5leHBvcnRzID0gVmlkZW9NYXNrRmlsdGVyO1xuXG4vKipcbiAqIEFwcGxpZXMgdGhlIGZpbHRlclxuICovXG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24oZmlsdGVyTWFuYWdlciwgaW5wdXQsIG91dHB1dCkge1xuXG5cbiAgdmFyIG1hc2tTcHJpdGUgPSB0aGlzLm1hc2tTcHJpdGU7XG5cbiAgdGhpcy51bmlmb3Jtcy5tYXNrID0gbWFza1Nwcml0ZS5fdGV4dHVyZTtcblxuICB2YXIgb3RoZXJNYXRyaXggPSBmaWx0ZXJNYW5hZ2VyLmNhbGN1bGF0ZVNwcml0ZU1hdHJpeChcbiAgICB0aGlzLm1hc2tNYXRyaXgsIG1hc2tTcHJpdGUgKTtcblxuICB0aGlzLnVuaWZvcm1zLm90aGVyTWF0cml4ID0gb3RoZXJNYXRyaXg7XG5cbiAgIC8vIGRyYXcgdGhlIGZpbHRlci4uLlxuICBmaWx0ZXJNYW5hZ2VyLmFwcGx5RmlsdGVyKHRoaXMsIGlucHV0LCBvdXRwdXQpO1xufTtcblxuLyoqXG4gKiBUT0RPOiB0ZXN0IGlmIHRoaXMgYWN0dWFsbHkgaXMgZG9pbmcgYW55dGhpbmdcbiAqIChpdCBzZWVtcyBhcyBpZiBnaXZpbmcgdGhlIHZpZERpbWVuc2lvbnMgYSB2YWx1ZSBvZiBgMGAgXG4gKiBicmVha3MgdGhpbmdzIGJ1dCBwYXNzaW5nIGFyYml0cmFyeSB2YWx1ZXMgaW4gYWxzbyBzZWVtcyB0byB3b3JrLi4uKVxuICovXG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLnNldERpbWVuc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHZpZERpbWVuc2lvbnMgPSB0aGlzLnVuaWZvcm1zLnZpZERpbWVuc2lvbnM7XG4gIHZpZERpbWVuc2lvbnNbMF0gPSB0aGlzLm1hc2tlZFNwcml0ZS53aWR0aDtcbiAgdmlkRGltZW5zaW9uc1sxXSA9IHRoaXMubWFza2VkU3ByaXRlLmhlaWdodCAqIDI7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhWaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLCB7XG5cblxuICAgIC8qKlxuICAgICAqIFRFU1RcbiAgICAgKi9cbiAgICB5T2Zmc2V0OiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy51bmlmb3Jtcy55T2Zmc2V0O1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy51bmlmb3Jtcy55T2Zmc2V0ID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb01hc2tGaWx0ZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBWaWRlb01hc2tGaWx0ZXIgPSByZXF1aXJlKCcuL1ZpZGVvTWFza0ZpbHRlcicpO1xuXG5cbmNsYXNzIEFscGhhVmlkZW9TcHJpdGUgZXh0ZW5kcyBQSVhJLlNwcml0ZSB7XG4gIGNvbnN0cnVjdG9yKHZpZGVvRnVsbFRleHR1cmUpIHtcblxuICAgIHN1cGVyKCk7XG5cbiAgICAvLyBzZXQgcGl4aSAvIGRvbSBlbGVtZW50c1xuICAgIHRoaXMuX2Z1bGxUZXh0dXJlID0gdmlkZW9GdWxsVGV4dHVyZTtcbiAgICB0aGlzLl9zcmNFbCA9IHRoaXMuX2Z1bGxUZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZTtcblxuICAgIC8vIG1ha2Ugc3VyZSBpdCBsb29wc1xuICAgIHRoaXMuX3NyY0VsLmxvb3AgPSB0cnVlO1xuXG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc2V0RmlsdGVyKCk7XG4gICAgdGhpcy5zaGltU2NhbGVDYWxsYmFjaygpO1xuICB9XG5cbiAgc2V0dXAoKSB7XG5cbiAgICB2YXIgbmV3V2lkdGggPSB0aGlzLnNyY1dpZHRoO1xuICAgIHZhciBuZXdIZWlnaHQgPSB0aGlzLnNyY0hlaWdodCAvIDI7XG5cbiAgICAvLyBzZXQgdGhpcyBzcHJpdGUncyB0ZXh0dXJlXG4gICAgdGhpcy50ZXh0dXJlID0gbmV3IFBJWEkuVGV4dHVyZShcbiAgICAgdGhpcy5fZnVsbFRleHR1cmUsIG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSk7XG5cbiAgICAvLyBzZXQgbWFzayB0ZXh0dXJlXG4gICAgdGhpcy5tYXNrVGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoXG4gICAgIHRoaXMuX2Z1bGxUZXh0dXJlLCBuZXcgUElYSS5SZWN0YW5nbGUoMCwgbmV3SGVpZ2h0LCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSk7XG5cbiAgICAvLyBjcmVhdGUgbWFzayBzcHJpdGUgYW5kIGFkZCBhcyBjaGlsZCBvZiB0aGlzIHNwcml0ZVxuICAgIHRoaXMubWFza1Nwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZSh0aGlzLm1hc2tUZXh0dXJlKTtcbiAgICB0aGlzLmFkZENoaWxkKHRoaXMubWFza1Nwcml0ZSk7XG4gIH1cblxuICBsaXN0ZW4oKSB7XG5cbiAgfVxuXG4gIHNldEZpbHRlcigpIHtcbiAgICB2YXIgZmlsdGVyID0gbmV3IFZpZGVvTWFza0ZpbHRlcih0aGlzLCB0aGlzLm1hc2tTcHJpdGUpO1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmaWx0ZXI7XG4gICAgdGhpcy5maWx0ZXJzID0gW3RoaXMuZmlsdGVyXTtcbiAgICBcbiAgICByZXR1cm4gZmlsdGVyO1xuICB9XG5cbiAgcmVtb3ZlRmlsdGVyKCkge1xuICAgIHZhciBmaWx0ZXIgPSB0aGlzLnNwcml0ZS5maWx0ZXI7XG5cbiAgICB0aGlzLmZpbHRlcnMgPSBudWxsO1xuICAgIHRoaXMuZmlsdGVyID0gbnVsbDtcblxuICAgIHJldHVybiBmaWx0ZXI7XG4gIH1cblxuICAvLyBcbiAgLy8ga2luZGEgaGFja3kgYnV0IHRoaXMgYWxsb3dzIHVzXG4gIC8vIHRvIGJlIG5vdGlmaWVkIHdoZW4gdGhlIHdpZHRoIC8gaGVpZ2h0IC8gc2NhbGVcbiAgLy8gY2hhbmdlcyBzbyB3ZSBjYW4gbW9kaWZ5IHRoZSBmaWx0ZXIgZGltZW5zaW9ucyB0b1xuICAvLyByZWZsZWN0IHRoYXQgY2hhbmdlXG4gIC8vIFxuICAvLyAoc2VlIGBPYnNlcnZhYmxlUG9pbnQuanNgIGFuZCBgVHJhbnNmb3JtU3RhdGljLmpzYHNcbiAgLy8gYG9uQ2hhbmdlYCBtZXRob2QgaW4gdGhlIFBJWEkgc3JjKVxuICAvLyBcbiAgc2hpbVNjYWxlQ2FsbGJhY2soKSB7XG5cbiAgICB2YXIgc3ByaXRlU2NvcGUgPSB0aGlzO1xuICAgIHZhciBzY2FsZVNjb3BlID0gdGhpcy5zY2FsZS5zY29wZTtcblxuICAgIHZhciBvbGRDQiA9IHRoaXMuc2NhbGUuY2I7XG5cbiAgICB2YXIgbmV3Q0IgPSBmdW5jdGlvbigpIHtcbiAgICAgIG9sZENCLmNhbGwoc2NhbGVTY29wZSk7XG5cbiAgICAgIC8vIGFkZCBzdHVmZiBoZXJlIGlmIG5lZWRlZFxuICAgICAgc3ByaXRlU2NvcGUuZmlsdGVyLnNldERpbWVuc2lvbnMoKTtcbiAgICB9XG5cbiAgICB0aGlzLnNjYWxlLmNiID0gbmV3Q0I7XG4gIH1cblxuICAvLyBcbiAgLy8gZm9yIGVhc2llciBhY2Nlc3MgdG8gdyAmIGhcbiAgLy8gXG4gIGdldCBzcmNXaWR0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjRWwudmlkZW9XaWR0aDtcbiAgfVxuICBnZXQgc3JjSGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLl9zcmNFbC52aWRlb0hlaWdodDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFscGhhVmlkZW9TcHJpdGU7IiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBBbHBoYVZpZGVvU3ByaXRlID0gcmVxdWlyZSgnLi9BbHBoYVZpZGVvU3ByaXRlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLlBJWEkuQWxwaGFWaWRlb1Nwcml0ZSA9IEFscGhhVmlkZW9TcHJpdGU7Il19
