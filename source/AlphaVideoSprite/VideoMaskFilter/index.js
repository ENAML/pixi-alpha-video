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
function VideoMaskFilter(maskedSprite, maskSprite) {

    var maskMatrix = new PIXI.Matrix();
    

    PIXI.Filter.call(this,vShader, fShader);

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
VideoMaskFilter.prototype.apply = function(filterManager, input, output) {


  var maskSprite = this.maskSprite;

  this.uniforms.mask = maskSprite._texture;

  var otherMatrix = filterManager.calculateSpriteMatrix(
    this.maskMatrix, maskSprite );

  this.uniforms.otherMatrix = otherMatrix;

   // draw the filter...
  filterManager.applyFilter(this, input, output);
};

/**
 * TODO: test if this actually is doing anything
 * (it seems as if giving the vidDimensions a value of `0` 
 * breaks things but passing arbitrary values in also seems to work...)
 */
VideoMaskFilter.prototype.setDimensions = function() {
  var vidDimensions = this.uniforms.vidDimensions;
  vidDimensions[0] = this.maskedSprite.width;
  vidDimensions[1] = this.maskedSprite.height * 2;
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