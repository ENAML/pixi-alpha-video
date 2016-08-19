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

module.exports = require('./AlphaVideoSprite');

},{"./AlphaVideoSprite":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9WaWRlb01hc2tGaWx0ZXIvaW5kZXguanMiLCJzb3VyY2UvQWxwaGFWaWRlb1Nwcml0ZS9pbmRleC5qcyIsInNvdXJjZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUlBLElBQUksVUFBVSwwYUFBZDtBQUNBLElBQUksVUFBVSx3eEVBQWQ7O0FBR0E7Ozs7Ozs7O0FBUUEsU0FBUyxlQUFULENBQXlCLFlBQXpCLEVBQXVDLFVBQXZDLEVBQW1EOztBQUUvQyxNQUFJLGFBQWEsSUFBSSxLQUFLLE1BQVQsRUFBakI7O0FBR0EsT0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFqQixFQUFzQixPQUF0QixFQUErQixPQUEvQjs7QUFFQSxhQUFXLFVBQVgsR0FBd0IsS0FBeEI7O0FBRUEsT0FBSyxZQUFMLEdBQW9CLFlBQXBCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCO0FBQ0EsT0FBSyxVQUFMLEdBQWtCLFVBQWxCOztBQUVBLE9BQUssYUFBTDs7QUFFQTtBQUNIO0FBQ0QsZ0JBQWdCLFNBQWhCLEdBQTRCLE9BQU8sTUFBUCxDQUFjLEtBQUssTUFBTCxDQUFZLFNBQTFCLENBQTVCO0FBQ0EsZ0JBQWdCLFNBQWhCLENBQTBCLFdBQTFCLEdBQXdDLGVBQXhDO0FBQ0EsT0FBTyxPQUFQLEdBQWlCLGVBQWpCOztBQUVBOzs7QUFHQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsS0FBMUIsR0FBa0MsVUFBUyxhQUFULEVBQXdCLEtBQXhCLEVBQStCLE1BQS9CLEVBQXVDOztBQUd2RSxNQUFJLGFBQWEsS0FBSyxVQUF0Qjs7QUFFQSxPQUFLLFFBQUwsQ0FBYyxJQUFkLEdBQXFCLFdBQVcsUUFBaEM7O0FBRUEsTUFBSSxjQUFjLGNBQWMscUJBQWQsQ0FDaEIsS0FBSyxVQURXLEVBQ0MsVUFERCxDQUFsQjs7QUFHQSxPQUFL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QUFPQSxXQUFLLEtBQUwsQ0FBVyxFQUFYLEdBQWdCLEtBQWhCO0FBQ0Q7O0FBRUQ7QUFDQTtBQUNBOzs7O3dCQUNlO0FBQ2IsYUFBTyxLQUFLLE1BQUwsQ0FBWSxVQUFuQjtBQUNEOzs7d0JBQ2U7QUFDZCxhQUFPLEtBQUssTUFBTCxDQUFZLFdBQW5CO0FBQ0Q7Ozs7RUEzRmlCLEtBQUssTTs7QUE4RnpCLE9BQU8sT0FBUCxHQUFpQixLQUFqQjs7O0FDbkdBOztBQUVBLE9BQU8sT0FBUCxHQUFpQixRQUFRLG9CQUFSLENBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuXG5cbnZhciB2U2hhZGVyID0gXCIjZGVmaW5lIEdMU0xJRlkgMVxcblxcbmF0dHJpYnV0ZSB2ZWMyIGFWZXJ0ZXhQb3NpdGlvbjtcXG5hdHRyaWJ1dGUgdmVjMiBhVGV4dHVyZUNvb3JkO1xcblxcbnVuaWZvcm0gbWF0MyBwcm9qZWN0aW9uTWF0cml4O1xcbnZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1xcblxcbnVuaWZvcm0gbWF0MyBvdGhlck1hdHJpeDtcXG52YXJ5aW5nIHZlYzIgdk1hc2tDb29yZDtcXG4gIFxcbiAgdm9pZCBtYWluKHZvaWQpXFxuICB7XFxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNCgocHJvamVjdGlvbk1hdHJpeCAqIHZlYzMoYVZlcnRleFBvc2l0aW9uLCAxLjApKS54eSwgMC4wLCAxLjApO1xcbiAgICB2VGV4dHVyZUNvb3JkID0gYVRleHR1cmVDb29yZDtcXG4gICAgdk1hc2tDb29yZCA9ICggb3RoZXJNYXRyaXggKiB2ZWMzKCBhVGV4dHVyZUNvb3JkLCAxLjApICApLnh5O1xcbiAgfVwiO1xudmFyIGZTaGFkZXIgPSBcIi8vIFxcbi8vIC0tLS0tLS0tXFxuLy8gVW5pZm9ybXNcXG4vLyAtLS0tLS0tLVxcbi8vIFxcbi8vIDEpICh2ZWMyKSB2aWREaW1lbnNpb25zIFxcbi8vICAgLSBkaW1lbnNpb25zIG9mIHRoZSBGVUxMIHZpZGVvIHRleHR1cmUgXFxuLy8gICAgIChpbmNsdWRpbmcgdG9wIFJHQiBwYW5lbCBhbmQgYm90dG9tIEFscGhhIHBhbmVsKVxcbi8vIFxcbi8vIDIpIChmbG9hdCkgeU9mZnNldCBcXG4vLyAgIC0gYWxwaGEgb2Zmc2V0IGZyb20geSBtaWRwb2ludCAoaGVpZ2h0IC8gMi4wKS4gdXNlZnVsIGlmXFxuLy8gICAgICBSR0IgcGFuZWwgYW5kIEFscGhhIHBhbmVsIGluIGFyZSBkaWZmZXJlbnQgaGVpZ2h0c1xcbi8vICAgICAgYW5kIGFsc28gZm9yIGRlYnVnZ2luZy5cXG4vLyBcXG4vLyAzKSAoc2FtcGxlcjJEKSB1U2FtcGxlclxcbi8vICAgLSBUZXh0dXJlIG9mIHRoZSBQSVhJIHNwcml0ZSAodmlkZW8pIHdlIGFyZSBhcHBseWluZyB0aGUgZmlsdGVyIHRvLiBcXG4vLyAgICAgVGhpcyBpcyBwYXNzZWQgaW4gYnkgUElYSS5cXG4vLyBcXG4vLyA0KSAoc2FtcGxlcjJEKSBtYXNrIFxcbi8vICAgLSBVc2VkIHRvIGdldCBhbHBoYSB2YWx1ZS4gQmFzaWNhbGx5IHRoZSBzYW1lIGFzIGB1U2FtcGxlcmAuXFxuLy8gICAgIHRoZSBpc3N1ZSB3aXRoIEpVU1QgdXNpbmcgYHVTYW1wbGVyYCwgaG93ZXZlciwgaXMgdGhhdCB3aGVuXFxuLy8gICAgIHRoZSBBbHBoYSBwYW5lbCBvdmVyZmxvd3MgdGhlIFBJWEkgY29udGFpbmVyIChldmVuIGlmIHdlIGNhbid0XFxuLy8gICAgIHNlZSBpdCksIGl0IHdvbid0IHJlbmRlciBwcm9wZXJseS4gVGh1cyBpdCBzZWVtcyB3ZSBuZWVkIHRvIFxcbi8vICAgICBwYXNzIGl0IGluIGFnYWluLCBhcyBhIGZ1bGwsIHVuY3JvcHBlZCB0ZXh0dXJlLlxcbi8vIFxcbi8vIFxcbi8vIFRPRE9cXG4vLyAtIFVzZSBTVFBRICh0ZXh0dXJlIGNvb3JkIHN5bnRheCkgZm9yIGFjY2Vzc2luZyB0ZXh0dXJlcyA/P1xcbi8vIFxcbi8vIE5PVEVTXFxuLy8gLSBGaW5hbCBwb3N0IGluIHRoaXMgdGhyZWFkIG1pZ2h0IGJlIHVzZWZ1bDpcXG4vLyAgIGh0dHBzOi8vZ2l0aHViLmNvbS9waXhpanMvcGl4aS5qcy9pc3N1ZXMvMTk3N1xcbi8vICBcXG5cXG5wcmVjaXNpb24gbG93cCBmbG9hdDtcXG4jZGVmaW5lIEdMU0xJRlkgMVxcblxcbnZhcnlpbmcgdmVjMiB2VGV4dHVyZUNvb3JkO1xcbnZhcnlpbmcgdmVjMiB2TWFza0Nvb3JkO1xcbnZhcnlpbmcgdmVjNCB2Q29sb3I7XFxuXFxudW5pZm9ybSB2ZWMyIHZpZERpbWVuc2lvbnM7XFxudW5pZm9ybSBmbG9hdCB5T2Zmc2V0O1xcbnVuaWZvcm0gc2FtcGxlcjJEIHVTYW1wbGVyO1xcbnVuaWZvcm0gc2FtcGxlcjJEIG1hc2s7XFxuXFxudm9pZCBtYWluKHZvaWQpXFxue1xcblxcbiAgdmVjMiBvbmVQaXhlbCA9IHZlYzIoMS4wIC8gdmlkRGltZW5zaW9ucyk7XFxuXFxuICBmbG9hdCBvZmZzZXRIZWlnaHQgPSB5T2Zmc2V0ICsgdmlkRGltZW5zaW9ucy55O1xcblxcbiAgZmxvYXQgZmlsdGVySGVpZ2h0ID0gb2Zmc2V0SGVpZ2h0ICogb25lUGl4ZWwueTtcXG4gIGZsb2F0IGhhbGZIZWlnaHQgPSBmaWx0ZXJIZWlnaHQgLyAyLjA7XFxuXFxuICBmbG9hdCBhbHBoYVBpeGVsWSA9IHZUZXh0dXJlQ29vcmQueSArIChoYWxmSGVpZ2h0ICogb25lUGl4ZWwueSk7XFxuICB2ZWMyIGFscGhhUGl4ZWwgPSB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgYWxwaGFQaXhlbFkpO1xcblxcbiAgdmVjNCBjb2xvclB4ID0gdGV4dHVyZTJEKHVTYW1wbGVyLCB2ZWMyKHZUZXh0dXJlQ29vcmQueCwgdlRleHR1cmVDb29yZC55KSk7XFxuICB2ZWM0IGFscGhhUHggPSB0ZXh0dXJlMkQobWFzaywgdmVjMih2TWFza0Nvb3JkLngsIHZNYXNrQ29vcmQueSArIGhhbGZIZWlnaHQpKTtcXG5cXG4gIGZsb2F0IGFscGhhID0gYWxwaGFQeC5yO1xcblxcbiAgLyoqXFxuICAgKiBwaXhlbCBhbHBoYSBpcyBiYXNlZCBvbiBZIHBvc2l0aW9uICh0b3AgaXMgYDBgLCBib3R0b20gaXMgYDFgKVxcbiAgICovXFxuICAvLyBmbG9hdCBwY3REb3duID0gdlRleHR1cmVDb29yZC55IC8gZmlsdGVySGVpZ2h0O1xcbiAgLy8gY29sb3IgKj0gcGN0RG93bjtcXG4gIC8vIGdsX0ZyYWdDb2xvciA9IHZlYzQoY29sb3JQeC5yZ2IsIHBjdERvd24pO1xcblxcbiAgLyoqXFxuICAgKiBqdXN0IHRoZSB2aWRlbyBpbiBpdCdzIG9yaWdpbmFsIHN0YXRlXFxuICAgKi9cXG4gIC8vIGdsX0ZyYWdDb2xvciA9IGNvbG9yUHg7XFxuICBcXG4gIC8qKlxcbiAgICoganVzdCBzaG93IHRoZSBhbHBoYSBoYWxmXFxuICAgKi9cXG4gIC8vIGdsX0ZyYWdDb2xvciA9IGFscGhhUHg7XFxuICBcXG4gIC8qKlxcbiAgICogYWN0dWFsIHdvcmtpbmcgdmVyc2lvblxcbiAgICovXFxuICBnbF9GcmFnQ29sb3IgPSB2ZWM0KGNvbG9yUHgucmdiICogYWxwaGEsIGFscGhhKTtcXG59XCI7XG5cblxuLyoqXG4gKiBUaGUgVmlkZW9NYXNrRmlsdGVyIGNsYXNzXG4gKlxuICogQGNsYXNzXG4gKiBAZXh0ZW5kcyBQSVhJLkZpbHRlclxuICogQG1lbWJlcm9mIFBJWElcbiAqIEBwYXJhbSBzcHJpdGUge1BJWEkuU3ByaXRlfSB0aGUgdGFyZ2V0IHNwcml0ZVxuICovXG5mdW5jdGlvbiBWaWRlb01hc2tGaWx0ZXIobWFza2VkU3ByaXRlLCBtYXNrU3ByaXRlKSB7XG5cbiAgICB2YXIgbWFza01hdHJpeCA9IG5ldyBQSVhJLk1hdHJpeCgpO1xuICAgIFxuXG4gICAgUElYSS5GaWx0ZXIuY2FsbCh0aGlzLHZTaGFkZXIsIGZTaGFkZXIpO1xuXG4gICAgbWFza1Nwcml0ZS5yZW5kZXJhYmxlID0gZmFsc2U7XG5cbiAgICB0aGlzLm1hc2tlZFNwcml0ZSA9IG1hc2tlZFNwcml0ZTtcbiAgICB0aGlzLm1hc2tTcHJpdGUgPSBtYXNrU3ByaXRlO1xuICAgIHRoaXMubWFza01hdHJpeCA9IG1hc2tNYXRyaXg7XG5cbiAgICB0aGlzLnNldERpbWVuc2lvbnMoKTtcblxuICAgIC8vIHRoaXMueU9mZnNldCA9IC0yMztcbn1cblZpZGVvTWFza0ZpbHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBJWEkuRmlsdGVyLnByb3RvdHlwZSk7XG5WaWRlb01hc2tGaWx0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmlkZW9NYXNrRmlsdGVyO1xubW9kdWxlLmV4cG9ydHMgPSBWaWRlb01hc2tGaWx0ZXI7XG5cbi8qKlxuICogQXBwbGllcyB0aGUgZmlsdGVyXG4gKi9cblZpZGVvTWFza0ZpbHRlci5wcm90b3R5cGUuYXBwbHkgPSBmdW5jdGlvbihmaWx0ZXJNYW5hZ2VyLCBpbnB1dCwgb3V0cHV0KSB7XG5cblxuICB2YXIgbWFza1Nwcml0ZSA9IHRoaXMubWFza1Nwcml0ZTtcblxuICB0aGlzLnVuaWZvcm1zLm1hc2sgPSBtYXNrU3ByaXRlLl90ZXh0dXJlO1xuXG4gIHZhciBvdGhlck1hdHJpeCA9IGZpbHRlck1hbmFnZXIuY2FsY3VsYXRlU3ByaXRlTWF0cml4KFxuICAgIHRoaXMubWFza01hdHJpeCwgbWFza1Nwcml0ZSApO1xuXG4gIHRoaXMudW5pZm9ybXMub3RoZXJNYXRyaXggPSBvdGhlck1hdHJpeDtcblxuICAgLy8gZHJhdyB0aGUgZmlsdGVyLi4uXG4gIGZpbHRlck1hbmFnZXIuYXBwbHlGaWx0ZXIodGhpcywgaW5wdXQsIG91dHB1dCk7XG59O1xuXG4vKipcbiAqIFRPRE86IHRlc3QgaWYgdGhpcyBhY3R1YWxseSBpcyBkb2luZyBhbnl0aGluZ1xuICogKGl0IHNlZW1zIGFzIGlmIGdpdmluZyB0aGUgdmlkRGltZW5zaW9ucyBhIHZhbHVlIG9mIGAwYCBcbiAqIGJyZWFrcyB0aGluZ3MgYnV0IHBhc3NpbmcgYXJiaXRyYXJ5IHZhbHVlcyBpbiBhbHNvIHNlZW1zIHRvIHdvcmsuLi4pXG4gKi9cblZpZGVvTWFza0ZpbHRlci5wcm90b3R5cGUuc2V0RGltZW5zaW9ucyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdmlkRGltZW5zaW9ucyA9IHRoaXMudW5pZm9ybXMudmlkRGltZW5zaW9ucztcbiAgdmlkRGltZW5zaW9uc1swXSA9IHRoaXMubWFza2VkU3ByaXRlLndpZHRoO1xuICB2aWREaW1lbnNpb25zWzFdID0gdGhpcy5tYXNrZWRTcHJpdGUuaGVpZ2h0ICogMjtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFZpZGVvTWFza0ZpbHRlci5wcm90b3R5cGUsIHtcblxuXG4gICAgLyoqXG4gICAgICogVEVTVFxuICAgICAqL1xuICAgIHlPZmZzZXQ6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVuaWZvcm1zLnlPZmZzZXQ7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLnVuaWZvcm1zLnlPZmZzZXQgPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvTWFza0ZpbHRlcjsiLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IFZpZGVvTWFza0ZpbHRlciA9IHJlcXVpcmUoJy4vVmlkZW9NYXNrRmlsdGVyJyk7XG5cblxuY2xhc3MgVmlkZW8gZXh0ZW5kcyBQSVhJLlNwcml0ZSB7XG4gIGNvbnN0cnVjdG9yKHZpZGVvRnVsbFRleHR1cmUpIHtcblxuICAgIHN1cGVyKCk7XG5cbiAgICAvLyBzZXQgcGl4aSAvIGRvbSBlbGVtZW50c1xuICAgIHRoaXMuX2Z1bGxUZXh0dXJlID0gdmlkZW9GdWxsVGV4dHVyZTtcbiAgICB0aGlzLl9zcmNFbCA9IHRoaXMuX2Z1bGxUZXh0dXJlLmJhc2VUZXh0dXJlLnNvdXJjZTtcblxuICAgIC8vIG1ha2Ugc3VyZSBpdCBsb29wc1xuICAgIHRoaXMuX3NyY0VsLmxvb3AgPSB0cnVlO1xuXG4gICAgdGhpcy5zZXR1cCgpO1xuICAgIHRoaXMuc2V0RmlsdGVyKCk7XG4gICAgdGhpcy5zaGltU2NhbGVDYWxsYmFjaygpO1xuICB9XG5cbiAgc2V0dXAoKSB7XG5cbiAgICB2YXIgbmV3V2lkdGggPSB0aGlzLnNyY1dpZHRoO1xuICAgIHZhciBuZXdIZWlnaHQgPSB0aGlzLnNyY0hlaWdodCAvIDI7XG5cbiAgICAvLyBzZXQgdGhpcyBzcHJpdGUncyB0ZXh0dXJlXG4gICAgdGhpcy50ZXh0dXJlID0gbmV3IFBJWEkuVGV4dHVyZShcbiAgICAgdGhpcy5fZnVsbFRleHR1cmUsIG5ldyBQSVhJLlJlY3RhbmdsZSgwLCAwLCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSk7XG5cbiAgICAvLyBzZXQgbWFzayB0ZXh0dXJlXG4gICAgdGhpcy5tYXNrVGV4dHVyZSA9IG5ldyBQSVhJLlRleHR1cmUoXG4gICAgIHRoaXMuX2Z1bGxUZXh0dXJlLCBuZXcgUElYSS5SZWN0YW5nbGUoMCwgbmV3SGVpZ2h0LCBuZXdXaWR0aCwgbmV3SGVpZ2h0KSk7XG5cbiAgICAvLyBjcmVhdGUgbWFzayBzcHJpdGUgYW5kIGFkZCBhcyBjaGlsZCBvZiB0aGlzIHNwcml0ZVxuICAgIHRoaXMubWFza1Nwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZSh0aGlzLm1hc2tUZXh0dXJlKTtcbiAgICB0aGlzLmFkZENoaWxkKHRoaXMubWFza1Nwcml0ZSk7XG4gIH1cblxuICBsaXN0ZW4oKSB7XG5cbiAgfVxuXG4gIHNldEZpbHRlcigpIHtcbiAgICB2YXIgZmlsdGVyID0gbmV3IFZpZGVvTWFza0ZpbHRlcih0aGlzLCB0aGlzLm1hc2tTcHJpdGUpO1xuXG4gICAgdGhpcy5maWx0ZXIgPSBmaWx0ZXI7XG4gICAgdGhpcy5maWx0ZXJzID0gW3RoaXMuZmlsdGVyXTtcbiAgICBcbiAgICByZXR1cm4gZmlsdGVyO1xuICB9XG5cbiAgcmVtb3ZlRmlsdGVyKCkge1xuICAgIHZhciBmaWx0ZXIgPSB0aGlzLnNwcml0ZS5maWx0ZXI7XG5cbiAgICB0aGlzLmZpbHRlcnMgPSBudWxsO1xuICAgIHRoaXMuZmlsdGVyID0gbnVsbDtcblxuICAgIHJldHVybiBmaWx0ZXI7XG4gIH1cblxuICAvLyBcbiAgLy8ga2luZGEgaGFja3kgYnV0IHRoaXMgYWxsb3dzIHVzXG4gIC8vIHRvIGJlIG5vdGlmaWVkIHdoZW4gdGhlIHdpZHRoIC8gaGVpZ2h0IC8gc2NhbGVcbiAgLy8gY2hhbmdlcyBzbyB3ZSBjYW4gbW9kaWZ5IHRoZSBmaWx0ZXIgZGltZW5zaW9ucyB0b1xuICAvLyByZWZsZWN0IHRoYXQgY2hhbmdlXG4gIC8vIFxuICAvLyAoc2VlIGBPYnNlcnZhYmxlUG9pbnQuanNgIGFuZCBgVHJhbnNmb3JtU3RhdGljLmpzYHNcbiAgLy8gYG9uQ2hhbmdlYCBtZXRob2QgaW4gdGhlIFBJWEkgc3JjKVxuICAvLyBcbiAgc2hpbVNjYWxlQ2FsbGJhY2soKSB7XG5cbiAgICB2YXIgc3ByaXRlU2NvcGUgPSB0aGlzO1xuICAgIHZhciBzY2FsZVNjb3BlID0gdGhpcy5zY2FsZS5zY29wZTtcblxuICAgIHZhciBvbGRDQiA9IHRoaXMuc2NhbGUuY2I7XG5cbiAgICB2YXIgbmV3Q0IgPSBmdW5jdGlvbigpIHtcbiAgICAgIG9sZENCLmNhbGwoc2NhbGVTY29wZSk7XG5cbiAgICAgIC8vIGFkZCBzdHVmZiBoZXJlIGlmIG5lZWRlZFxuICAgICAgc3ByaXRlU2NvcGUuZmlsdGVyLnNldERpbWVuc2lvbnMoKTtcbiAgICB9XG5cbiAgICB0aGlzLnNjYWxlLmNiID0gbmV3Q0I7XG4gIH1cblxuICAvLyBcbiAgLy8gZm9yIGVhc2llciBhY2Nlc3MgdG8gdyAmIGhcbiAgLy8gXG4gIGdldCBzcmNXaWR0aCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3JjRWwudmlkZW9XaWR0aDtcbiAgfVxuICBnZXQgc3JjSGVpZ2h0KCkge1xuICAgIHJldHVybiB0aGlzLl9zcmNFbC52aWRlb0hlaWdodDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZGVvOyIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL0FscGhhVmlkZW9TcHJpdGUnKTsiXX0=
