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

    var maskMatrix = new PIXI.Matrix();

    PIXI.Filter.call(this,
        vShader, fShader,
        {
            // mask:           { type: 'sampler2D', value: sprite._texture },
            alpha:          { type: 'f', value: 1},
            otherMatrix:    { type: 'mat3', value: maskMatrix.toArray(true) },

            // filterArea:     { type: '4fv', value: new Float32Array([0, 0, 0, 0])},
            
            // -24 seems good for 'compressed.mp4' -- see `vert.glsl`
            yOffset:          { type: 'f', value: -24},
        }
    );

    // this.maskSprite = sprite;
    this.maskMatrix = maskMatrix;
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
VideoMaskFilter.prototype.applyFilter = function (renderer, input, output) {

  var filterManager = renderer.filterManager;

  this.uniforms.otherMatrix.value = this.maskMatrix.toArray(true);
  // this.uniforms.alpha.value = this.maskSprite.worldAlpha;

  //
  //  set filter area
  //  
  // var inputFrame = input.frame;
  // var filterArea = this.uniforms.filterArea.value;
  // filterArea[0] = inputFrame.width;
  // filterArea[1] = inputFrame.height;
  // filterArea[2] = inputFrame.x;
  // filterArea[3] = inputFrame.y;

  var shader = this.getShader(renderer);

   // draw the filter...
  filterManager.applyFilter(shader, input, output);
};


Object.defineProperties(VideoMaskFilter.prototype, {
    /**
     * The texture used for the displacement map. Must be power of 2 sized texture.
     */
    map: {
        get: function (){
            return this.uniforms.mask.value;
        },
        set: function (value){
            this.uniforms.mask.value = value;
        }
    },


    /**
     * TEST
     */
    yOffset: {
      get: function() {
        return this.uniforms.yOffset.value;
      },
      set: function(value) {
        this.uniforms.yOffset.value = value;
      }
    }
});

module.exports = VideoMaskFilter;