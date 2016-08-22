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

var Video = function (_PIXI$Sprite) {
  _inherits(Video, _PIXI$Sprite);

  function Video(videoFullTexture) {
    _classCallCheck(this, Video);

    // set pixi / dom elements
    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Video).call(this));

    _this._fullTexture = videoFullTexture;
    _this._srcEl = _this._fullTexture.baseTexture.source;

    // make sure it loops
    _this._srcEl.loop = true;

    _this.setup();
    _this.setFilter();
    _this.shimScaleCallback();
    return _this;
  }

  _createClass(Video, [{
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

  return Video;
}(PIXI.Sprite);

module.exports = Video;

},{"./VideoMaskFilter":1}],3:[function(require,module,exports){
'use strict';

var AlphaVideoSprite = require('./AlphaVideoSprite');

module.exports = AlphaVideoSprite;

},{"./AlphaVideoSprite":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9WaWRlb01hc2tGaWx0ZXIvaW5kZXguanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9pbmRleC5qcyIsInNvdXJjZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUlBLElBQUksVUFBVSwwYUFBZDtBQUNBLElBQUksVUFBVSx3eEVBQWQ7O0FBR0E7Ozs7Ozs7O0FBUUEsU0FBUyxlQUFULENBQXlCLFlBQXpCLEVBQXVDLFVBQXZDLEVBQW1EOztBQUUvQyxNQUFJLGFBQWEsSUFBSSxLQUFLLE1BQVQsRUFBakI7O0FBR0EsT0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFqQixFQUFzQixPQUF0QixFQUErQixPQUEvQjs7QUFFQSxhQUFXLFVBQVgsR0FBd0IsS0FBeEI7O0FBRUEsT0FBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCOztBQUVBLE9BQUssYUFBTDs7QUFFQTtBQUNIO0FBQ0QsZ0JBQWdCLFNBQWhCLEdBQTRCLE9BQU8sTUFBUCxDQUFjLEtBQUssTUFBTCxDQUFZLFNBQTFCLENBQTVCO0FBQ0EsZ0JBQWdCLFNBQWhCLENBQTBCLFdBQTFCLEdBQXdDLGVBQXhDO0FBQ0EsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOztBQUVBOzs7QUFHQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsS0FBMUIsR0FBa0MsVUFBUyxhQUFULEVBQXdCLEtBQXhCLEVBQStCLE1BQS9CLEVBQXVDOztBQUd2RSxNQUFJLGFBQWEsS0FBSyxVQUF0Qjs7QUFFQSxPQUFLLFFBQUwsQ0FBYyxJQUFkLEdBQXFCLFdBQVcsUUFBaEM7O0FBRUEsTUFBSSxjQUFjLGNBQWMscUJBQWQsQ0FDaEIsS0FBSyxVQURXLEVBQ0MsVUFERCxDQUFsQjs7QUFHQSxPQUFL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QUFPQSxXQUFLLEtBQUwsQ0FBVyxFQUFYLEdBQWdCLEtBQWhCO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBOzs7O3dCQUNlO0FBQ2IsYUFBTyxLQUFLLE1BQUwsQ0FBWSxVQUFuQjtBQUNEOzs7d0JBQ2U7QUFDZCxhQUFPLEtBQUssTUFBTCxDQUFZLFdBQW5CO0FBQ0Q7Ozs7RUEzRmlCLEtBQUssTTs7QUE4RnpCLE9BQU8sT0FBUCxHQUFpQixLQUFqQjs7O0FDbkdBOztBQUVBLElBQU0sbUJBQW1CLFFBQVEsb0JBQVIsQ0FBekI7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLGdCQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cblxuXG52YXIgdlNoYWRlciA9IFwiI2RlZmluZSBHTFNMSUZZIDFcXG5cXG5hdHRyaWJ1dGUgdmVjMiBhVmVydGV4UG9zaXRpb247XFxuYXR0cmlidXRlIHZlYzIgYVRleHR1cmVDb29yZDtcXG5cXG51bmlmb3JtIG1hdDMgcHJvamVjdGlvbk1hdHJpeDtcXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcXG5cXG51bmlmb3JtIG1hdDMgb3RoZXJNYXRyaXg7XFxudmFyeWluZyB2ZWMyIHZNYXNrQ29vcmQ7XFxuICBcXG4gIHZvaWQgbWFpbih2b2lkKVxcbiAge1xcbiAgICBnbF9Qb3NpdGlvbiA9IHZlYzQoKHByb2plY3Rpb25NYXRyaXggKiB2ZWMzKGFWZXJ0ZXhQb3NpdGlvbiwgMS4wKSkueHksIDAuMCwgMS4wKTtcXG4gICAgdlRleHR1cmVDb29yZCA9IGFUZXh0dXJlQ29vcmQ7XFxuICAgIHZNYXNrQ29vcmQgPSAoIG90aGVyTWF0cml4ICogdmVjMyggYVRleHR1cmVDb29yZCwgMS4wKSAgKS54eTtcXG4gIH1cIjtcbnZhciBmU2hhZGVyID0gXCIvLyBcXG4vLyAtLS0tLS0tLVxcbi8vIFVuaWZvcm1zXFxuLy8gLS0tLS0tLS1cXG4vLyBcXG4vLyAxKSAodmVjMikgdmlkRGltZW5zaW9ucyBcXG4vLyAgIC0gZGltZW5zaW9ucyBvZiB0aGUgRlVMTCB2aWRlbyB0ZXh0dXJlIFxcbi8vICAgICAoaW5jbHVkaW5nIHRvcCBSR0IgcGFuZWwgYW5kIGJvdHRvbSBBbHBoYSBwYW5lbClcXG4vLyBcXG4vLyAyKSAoZmxvYXQpIHlPZmZzZXQgXFxuLy8gICAtIGFscGhhIG9mZnNldCBmcm9tIHkgbWlkcG9pbnQgKGhlaWdodCAvIDIuMCkuIHVzZWZ1bCBpZlxcbi8vICAgICAgUkdCIHBhbmVsIGFuZCBBbHBoYSBwYW5lbCBpbiBhcmUgZGlmZmVyZW50IGhlaWdodHNcXG4vLyAgICAgIGFuZCBhbHNvIGZvciBkZWJ1Z2dpbmcuXFxuLy8gXFxuLy8gMykgKHNhbXBsZXIyRCkgdVNhbXBsZXJcXG4vLyAgIC0gVGV4dHVyZSBvZiB0aGUgUElYSSBzcHJpdGUgKHZpZGVvKSB3ZSBhcmUgYXBwbHlpbmcgdGhlIGZpbHRlciB0by4gXFxuLy8gICAgIFRoaXMgaXMgcGFzc2VkIGluIGJ5IFBJWEkuXFxuLy8gXFxuLy8gNCkgKHNhbXBsZXIyRCkgbWFzayBcXG4vLyAgIC0gVXNlZCB0byBnZXQgYWxwaGEgdmFsdWUuIEJhc2ljYWxseSB0aGUgc2FtZSBhcyBgdVNhbXBsZXJgLlxcbi8vICAgICB0aGUgaXNzdWUgd2l0aCBKVVNUIHVzaW5nIGB1U2FtcGxlcmAsIGhvd2V2ZXIsIGlzIHRoYXQgd2hlblxcbi8vICAgICB0aGUgQWxwaGEgcGFuZWwgb3ZlcmZsb3dzIHRoZSBQSVhJIGNvbnRhaW5lciAoZXZlbiBpZiB3ZSBjYW4ndFxcbi8vICAgICBzZWUgaXQpLCBpdCB3b24ndCByZW5kZXIgcHJvcGVybHkuIFRodXMgaXQgc2VlbXMgd2UgbmVlZCB0byBcXG4vLyAgICAgcGFzcyBpdCBpbiBhZ2FpbiwgYXMgYSBmdWxsLCB1bmNyb3BwZWQgdGV4dHVyZS5cXG4vLyBcXG4vLyBcXG4vLyBUT0RPXFxuLy8gLSBVc2UgU1RQUSAodGV4dHVyZSBjb29yZCBzeW50YXgpIGZvciBhY2Nlc3NpbmcgdGV4dHVyZXMgPz9cXG4vLyBcXG4vLyBOT1RFU1xcbi8vIC0gRmluYWwgcG9zdCBpbiB0aGlzIHRocmVhZCBtaWdodCBiZSB1c2VmdWw6XFxuLy8gICBodHRwczovL2dpdGh1Yi5jb20vcGl4aWpzL3BpeGkuanMvaXNzdWVzLzE5NzdcXG4vLyAgXFxuXFxucHJlY2lzaW9uIGxvd3AgZmxvYXQ7XFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG52YXJ5aW5nIHZlYzIgdlRleHR1cmVDb29yZDtcXG52YXJ5aW5nIHZlYzIgdk1hc2tDb29yZDtcXG52YXJ5aW5nIHZlYzQgdkNvbG9yO1xcblxcbnVuaWZvcm0gdmVjMiB2aWREaW1lbnNpb25zO1xcbnVuaWZvcm0gZmxvYXQgeU9mZnNldDtcXG51bmlmb3JtIHNhbXBsZXIyRCB1U2FtcGxlcjtcXG51bmlmb3JtIHNhbXBsZXIyRCBtYXNrO1xcblxcbnZvaWQgbWFpbih2b2lkKVxcbntcXG5cXG4gIHZlYzIgb25lUGl4ZWwgPSB2ZWMyKDEuMCAvIHZpZERpbWVuc2lvbnMpO1xcblxcbiAgZmxvYXQgb2Zmc2V0SGVpZ2h0ID0geU9mZnNldCArIHZpZERpbWVuc2lvbnMueTtcXG5cXG4gIGZsb2F0IGZpbHRlckhlaWdodCA9IG9mZnNldEhlaWdodCAqIG9uZVBpeGVsLnk7XFxuICBmbG9hdCBoYWxmSGVpZ2h0ID0gZmlsdGVySGVpZ2h0IC8gMi4wO1xcblxcbiAgZmxvYXQgYWxwaGFQaXhlbFkgPSB2VGV4dHVyZUNvb3JkLnkgKyAoaGFsZkhlaWdodCAqIG9uZVBpeGVsLnkpO1xcbiAgdmVjMiBhbHBoYVBpeGVsID0gdmVjMih2VGV4dHVyZUNvb3JkLngsIGFscGhhUGl4ZWxZKTtcXG5cXG4gIHZlYzQgY29sb3JQeCA9IHRleHR1cmUyRCh1U2FtcGxlciwgdmVjMih2VGV4dHVyZUNvb3JkLngsIHZUZXh0dXJlQ29vcmQueSkpO1xcbiAgdmVjNCBhbHBoYVB4ID0gdGV4dHVyZTJEKG1hc2ssIHZlYzIodk1hc2tDb29yZC54LCB2TWFza0Nvb3JkLnkgKyBoYWxmSGVpZ2h0KSk7XFxuXFxuICBmbG9hdCBhbHBoYSA9IGFscGhhUHgucjtcXG5cXG4gIC8qKlxcbiAgICogcGl4ZWwgYWxwaGEgaXMgYmFzZWQgb24gWSBwb3NpdGlvbiAodG9wIGlzIGAwYCwgYm90dG9tIGlzIGAxYClcXG4gICAqL1xcbiAgLy8gZmxvYXQgcGN0RG93biA9IHZUZXh0dXJlQ29vcmQueSAvIGZpbHRlckhlaWdodDtcXG4gIC8vIGNvbG9yICo9IHBjdERvd247XFxuICAvLyBnbF9GcmFnQ29sb3IgPSB2ZWM0KGNvbG9yUHgucmdiLCBwY3REb3duKTtcXG5cXG4gIC8qKlxcbiAgICoganVzdCB0aGUgdmlkZW8gaW4gaXQncyBvcmlnaW5hbCBzdGF0ZVxcbiAgICovXFxuICAvLyBnbF9GcmFnQ29sb3IgPSBjb2xvclB4O1xcbiAgXFxuICAvKipcXG4gICAqIGp1c3Qgc2hvdyB0aGUgYWxwaGEgaGFsZlxcbiAgICovXFxuICAvLyBnbF9GcmFnQ29sb3IgPSBhbHBoYVB4O1xcbiAgXFxuICAvKipcXG4gICAqIGFjdHVhbCB3b3JraW5nIHZlcnNpb25cXG4gICAqL1xcbiAgZ2xfRnJhZ0NvbG9yID0gdmVjNChjb2xvclB4LnJnYiAqIGFscGhhLCBhbHBoYSk7XFxufVwiO1xuXG5cbi8qKlxuICogVGhlIFZpZGVvTWFza0ZpbHRlciBjbGFzc1xuICpcbiAqIEBjbGFzc1xuICogQGV4dGVuZHMgUElYSS5GaWx0ZXJcbiAqIEBtZW1iZXJvZiBQSVhJXG4gKiBAcGFyYW0gc3ByaXRlIHtQSVhJLlNwcml0ZX0gdGhlIHRhcmdldCBzcHJpdGVcbiAqL1xuZnVuY3Rpb24gVmlkZW9NYXNrRmlsdGVyKG1hc2tlZFNwcml0ZSwgbWFza1Nwcml0ZSkge1xuXG4gICAgdmFyIG1hc2tNYXRyaXggPSBuZXcgUElYSS5NYXRyaXgoKTtcbiAgICBcblxuICAgIFBJWEkuRmlsdGVyLmNhbGwodGhpcyx2U2hhZGVyLCBmU2hhZGVyKTtcblxuICAgIG1hc2tTcHJpdGUucmVuZGVyYWJsZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5tYXNrZWRTcHJpdGUgPSBtYXNrZWRTcHJpdGU7XG4gICAgdGhpcy5tYXNrU3ByaXRlID0gbWFza1Nwcml0ZTtcbiAgICB0aGlzLm1hc2tNYXRyaXggPSBtYXNrTWF0cml4O1xuXG4gICAgdGhpcy5zZXREaW1lbnNpb25zKCk7XG5cbiAgICAvLyB0aGlzLnlPZmZzZXQgPSAtMjM7XG59XG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQSVhJLkZpbHRlci5wcm90b3R5cGUpO1xuVmlkZW9NYXNrRmlsdGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZpZGVvTWFza0ZpbHRlcjtcbm1vZHVsZS5leHBvcnRzID0gVmlkZW9NYXNrRmlsdGVyO1xuXG4vKipcbiAqIEFwcGxpZXMgdGhlIGZpbHRlclxuICovXG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24oZmlsdGVyTWFuYWdlciwgaW5wdXQsIG91dHB1dCkge1xuXG5cbiAgdmFyIG1hc2tTcHJpdGUgPSB0aGlzLm1hc2tTcHJpdGU7XG5cbiAgdGhpcy51bmlmb3Jtcy5tYXNrID0gbWFza1Nwcml0ZS5fdGV4dHVyZTtcblxuICB2YXIgb3RoZXJNYXRyaXggPSBmaWx0ZXJNYW5hZ2VyLmNhbGN1bGF0ZVNwcml0ZU1hdHJpeChcbiAgICB0aGlzLm1hc2tNYXRyaXgsIG1hc2tTcHJpdGUgKTtcblxuICB0aGlzLnVuaWZvcm1zLm90aGVyTWF0cml4ID0gb3RoZXJNYXRyaXg7XG5cbiAgIC8vIGRyYXcgdGhlIGZpbHRlci4uLlxuICBmaWx0ZXJNYW5hZ2VyLmFwcGx5RmlsdGVyKHRoaXMsIGlucHV0LCBvdXRwdXQpO1xufTtcblxuLyoqXG4gKiBUT0RPOiB0ZXN0IGlmIHRoaXMgYWN0dWFsbHkgaXMgZG9pbmcgYW55dGhpbmdcbiAqIChpdCBzZWVtcyBhcyBpZiBnaXZpbmcgdGhlIHZpZERpbWVuc2lvbnMgYSB2YWx1ZSBvZiBgMGAgXG4gKiBicmVha3MgdGhpbmdzIGJ1dCBwYXNzaW5nIGFyYml0cmFyeSB2YWx1ZXMgaW4gYWxzbyBzZWVtcyB0byB3b3JrLi4uKVxuICovXG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLnNldERpbWVuc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHZpZERpbWVuc2lvbnMgPSB0aGlzLnVuaWZvcm1zLnZpZERpbWVuc2lvbnM7XG4gIHZpZERpbWVuc2lvbnNbMF0gPSB0aGlzLm1hc2tlZFNwcml0ZS53aWR0aDtcbiAgdmlkRGltZW5zaW9uc1sxXSA9IHRoaXMubWFza2VkU3ByaXRlLmhlaWdodCAqIDI7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhWaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLCB7XG5cblxuICAgIC8qKlxuICAgICAqIFRFU1RcbiAgICAgKi9cbiAgICB5T2Zmc2V0OiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy51bmlmb3Jtcy55T2Zmc2V0O1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy51bmlmb3Jtcy55T2Zmc2V0ID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWRlb01hc2tGaWx0ZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBWaWRlb01hc2tGaWx0ZXIgPSByZXF1aXJlKCcuL1ZpZGVvTWFza0ZpbHRlcicpO1xuXG5cbmNsYXNzIFZpZGVvIGV4dGVuZHMgUElYSS5TcHJpdGUge1xuICBjb25zdHJ1Y3Rvcih2aWRlb0Z1bGxUZXh0dXJlKSB7XG5cbiAgICBzdXBlcigpO1xuXG4gICAgLy8gc2V0IHBpeGkgLyBkb20gZWxlbWVudHNcbiAgICB0aGlzLl9mdWxsVGV4dHVyZSA9IHZpZGVvRnVsbFRleHR1cmU7XG4gICAgdGhpcy5fc3JjRWwgPSB0aGlzLl9mdWxsVGV4dHVyZS5iYXNlVGV4dHVyZS5zb3VyY2U7XG5cbiAgICAvLyBtYWtlIHN1cmUgaXQgbG9vcHNcbiAgICB0aGlzLl9zcmNFbC5sb29wID0gdHJ1ZTtcblxuICAgIHRoaXMuc2V0dXAoKTtcbiAgICB0aGlzLnNldEZpbHRlcigpO1xuICAgIHRoaXMuc2hpbVNjYWxlQ2FsbGJhY2soKTtcbiAgfVxuXG4gIHNldHVwKCkge1xuXG4gICAgdmFyIG5ld1dpZHRoID0gdGhpcy5zcmNXaWR0aDtcbiAgICB2YXIgbmV3SGVpZ2h0ID0gdGhpcy5zcmNIZWlnaHQgLyAyO1xuXG4gICAgLy8gc2V0IHRoaXMgc3ByaXRlJ3MgdGV4dHVyZVxuICAgIHRoaXMudGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoXG4gICAgIHRoaXMuX2Z1bGxUZXh0dXJlLCBuZXcgUElYSS5SZWN0YW5nbGUoMCwgMCwgbmV3V2lkdGgsIG5ld0hlaWdodCkpO1xuXG4gICAgLy8gc2V0IG1hc2sgdGV4dHVyZVxuICAgIHRoaXMubWFza1RleHR1cmUgPSBuZXcgUElYSS5UZXh0dXJlKFxuICAgICB0aGlzLl9mdWxsVGV4dHVyZSwgbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIG5ld0hlaWdodCwgbmV3V2lkdGgsIG5ld0hlaWdodCkpO1xuXG4gICAgLy8gY3JlYXRlIG1hc2sgc3ByaXRlIGFuZCBhZGQgYXMgY2hpbGQgb2YgdGhpcyBzcHJpdGVcbiAgICB0aGlzLm1hc2tTcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUodGhpcy5tYXNrVGV4dHVyZSk7XG4gICAgdGhpcy5hZGRDaGlsZCh0aGlzLm1hc2tTcHJpdGUpO1xuICB9XG5cbiAgbGlzdGVuKCkge1xuXG4gIH1cblxuICBzZXRGaWx0ZXIoKSB7XG4gICAgdmFyIGZpbHRlciA9IG5ldyBWaWRlb01hc2tGaWx0ZXIodGhpcywgdGhpcy5tYXNrU3ByaXRlKTtcblxuICAgIHRoaXMuZmlsdGVyID0gZmlsdGVyO1xuICAgIHRoaXMuZmlsdGVycyA9IFt0aGlzLmZpbHRlcl07XG4gICAgXG4gICAgcmV0dXJuIGZpbHRlcjtcbiAgfVxuXG4gIHJlbW92ZUZpbHRlcigpIHtcbiAgICB2YXIgZmlsdGVyID0gdGhpcy5zcHJpdGUuZmlsdGVyO1xuXG4gICAgdGhpcy5maWx0ZXJzID0gbnVsbDtcbiAgICB0aGlzLmZpbHRlciA9IG51bGw7XG5cbiAgICByZXR1cm4gZmlsdGVyO1xuICB9XG5cbiAgLy8gXG4gIC8vIGtpbmRhIGhhY2t5IGJ1dCB0aGlzIGFsbG93cyB1c1xuICAvLyB0byBiZSBub3RpZmllZCB3aGVuIHRoZSB3aWR0aCAvIGhlaWdodCAvIHNjYWxlXG4gIC8vIGNoYW5nZXMgc28gd2UgY2FuIG1vZGlmeSB0aGUgZmlsdGVyIGRpbWVuc2lvbnMgdG9cbiAgLy8gcmVmbGVjdCB0aGF0IGNoYW5nZVxuICAvLyBcbiAgLy8gKHNlZSBgT2JzZXJ2YWJsZVBvaW50LmpzYCBhbmQgYFRyYW5zZm9ybVN0YXRpYy5qc2BzXG4gIC8vIGBvbkNoYW5nZWAgbWV0aG9kIGluIHRoZSBQSVhJIHNyYylcbiAgLy8gXG4gIHNoaW1TY2FsZUNhbGxiYWNrKCkge1xuXG4gICAgdmFyIHNwcml0ZVNjb3BlID0gdGhpcztcbiAgICB2YXIgc2NhbGVTY29wZSA9IHRoaXMuc2NhbGUuc2NvcGU7XG5cbiAgICB2YXIgb2xkQ0IgPSB0aGlzLnNjYWxlLmNiO1xuXG4gICAgdmFyIG5ld0NCID0gZnVuY3Rpb24oKSB7XG4gICAgICBvbGRDQi5jYWxsKHNjYWxlU2NvcGUpO1xuXG4gICAgICAvLyBhZGQgc3R1ZmYgaGVyZSBpZiBuZWVkZWRcbiAgICAgIHNwcml0ZVNjb3BlLmZpbHRlci5zZXREaW1lbnNpb25zKCk7XG4gICAgfVxuXG4gICAgdGhpcy5zY2FsZS5jYiA9IG5ld0NCO1xuICB9XG5cbiAgLy8gXG4gIC8vIGZvciBlYXNpZXIgYWNjZXNzIHRvIHcgJiBoXG4gIC8vIFxuICBnZXQgc3JjV2lkdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NyY0VsLnZpZGVvV2lkdGg7XG4gIH1cbiAgZ2V0IHNyY0hlaWdodCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjRWwudmlkZW9IZWlnaHQ7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBWaWRlbzsiLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IEFscGhhVmlkZW9TcHJpdGUgPSByZXF1aXJlKCcuL0FscGhhVmlkZW9TcHJpdGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBBbHBoYVZpZGVvU3ByaXRlOyJdfQ==
