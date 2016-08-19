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
function VideoMaskFilter(sprite) {

    PIXI.Filter.call(this,vShader, fShader);

    this.sprite = sprite;

    // this seems to work for `compressed.mp4`
    this.yOffset = -22;
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
VideoMaskFilter.prototype.apply = function(filterManager, input, output, clear) {

  //
  //  set filter area
  // 
  var vidDimensions = this.uniforms.vidDimensions;
  vidDimensions[0] = this.sprite.width;
  vidDimensions[1] = this.sprite.height;
  vidDimensions[2] = this.sprite.x;
  vidDimensions[3] = this.sprite.y;


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