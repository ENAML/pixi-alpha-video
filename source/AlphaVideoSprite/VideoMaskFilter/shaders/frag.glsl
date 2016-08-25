// 
// --------
// Uniforms
// --------
// 
// 1) (vec2) vidDimensions 
//   - dimensions of the FULL video texture 
//     (including top RGB panel and bottom Alpha panel)
// 
// 2) (float) spriteAlpha
//   - the current alpha of the alphaVideoSprite - need to
//     multiply the computed alpha by this to get the actual
//     alpha (NOTE: this is only important if video alpha is 
//     NOT `0` or `1`).
// 
// 2) (float) yOffset 
//   - alpha offset from y midpoint (height / 2.0). useful if
//      RGB panel and Alpha panel in are different heights
//      and also for debugging.
// 
// 3) (sampler2D) uSampler
//   - Texture of the PIXI sprite (video) we are applying the filter to. 
//     This is passed in by PIXI.
// 
// 4) (sampler2D) mask 
//   - Used to get alpha value. Basically the same as `uSampler`.
//     the issue with JUST using `uSampler`, however, is that when
//     the Alpha panel overflows the PIXI container (even if we can't
//     see it), it won't render properly. Thus it seems we need to 
//     pass it in again, as a full, uncropped texture.
// 
// 
// TODO
// - Use STPQ (texture coord syntax) for accessing textures ??
// 
// NOTES
// - Final post in this thread might be useful:
//   https://github.com/pixijs/pixi.js/issues/1977
//  

precision lowp float;

varying vec2 vTextureCoord;
varying vec2 vMaskCoord;
varying vec4 vColor;

uniform vec2 vidDimensions;
uniform float spriteAlpha;
uniform float yOffset;
uniform sampler2D uSampler;
uniform sampler2D mask;


void main(void)
{

  vec2 onePixel = vec2(1.0 / vidDimensions);

  float offsetHeight = yOffset + vidDimensions.y;

  float filterHeight = offsetHeight * onePixel.y;
  float halfHeight = filterHeight / 2.0;

  float alphaPixelY = vTextureCoord.y + (halfHeight * onePixel.y);
  vec2 alphaPixel = vec2(vTextureCoord.x, alphaPixelY);

  vec4 colorPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));
  vec4 alphaPx = texture2D(mask, vec2(vMaskCoord.x, vMaskCoord.y + halfHeight));

  float alpha = alphaPx.r * spriteAlpha;

  // // check clip! this will stop the mask bleeding out from the edges
  // // might not need this after all
  // vec2 text = abs( vMaskCoord - 0.5 );
  // text = step(0.5, text);
  // float clip = 1.0 - max(text.y, text.x);

  // alpha *= clip;

  /**
   * pixel alpha is based on Y position (top is `0`, bottom is `1`)
   */
  // float pctDown = vTextureCoord.y / filterHeight;
  // color *= pctDown;
  // gl_FragColor = vec4(colorPx.rgb, pctDown);

  /**
   * just the video in it's original state
   */
  // gl_FragColor = colorPx;
  
  /**
   * just show the alpha half
   */
  // gl_FragColor = alphaPx;
  
  /**
   * actual working version
   */
  gl_FragColor = vec4(colorPx.rgb * alpha, alpha);
}