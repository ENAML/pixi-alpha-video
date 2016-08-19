'use strict';

var glslify = require('glslify');

var vShader = glslify('./shaders/vert.glsl');
var fShader = glslify('./shaders/frag.glsl');


/**
 * The VideoMaskFilter class
 *
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI
 * @param sprite {PIXI.Sprite} the target sprite
 */
function VideoMaskFilter(maskSprite) {

    var maskMatrix = new PIXI.Matrix();
    

    PIXI.Filter.call(this,vShader, fShader);

    maskSprite.renderable = false;

    this.maskSprite = maskSprite;
    this.maskMatrix = maskMatrix;

    // // this seems to work for `compressed.mp4`
    // this.yOffset = -23;
}
VideoMaskFilter.prototype = Object.create(PIXI.Filter.prototype);
VideoMaskFilter.prototype.constructor = VideoMaskFilter;
module.exports = VideoMaskFilter;

/**
 * Applies the filter
 *
 * @param renderer {PIXI.WebGLRenderer} The renderer to retrieve the filter from
 * @param input {PIXI.RenderTarget}
 * @param output {PIXI.RenderTarget}
 */
VideoMaskFilter.prototype.apply = function(filterManager, input, output) {


  var maskSprite = this.maskSprite;

  this.uniforms.mask = maskSprite._texture;

  var otherMatrix = filterManager.calculateSpriteMatrix(
    this.maskMatrix, maskSprite );

  this.uniforms.otherMatrix = otherMatrix;

  //
  //  set filter area
  // 
  var vidDimensions = this.uniforms.vidDimensions;
  vidDimensions[0] = this.maskSprite.width;
  vidDimensions[1] = this.maskSprite.height * 2;


  // debugger;

   // draw the filter...
  filterManager.applyFilter(this, input, output);
};


Object.defineProperties(VideoMaskFilter.prototype, {


    /**
     * TEST
     */
    yOffset: {
      get: function() {
        return this.uniforms.yOffset;
      },
      set: function(value) {
        this.uniforms.yOffset = value;
      }
    }

});

module.exports = VideoMaskFilter;