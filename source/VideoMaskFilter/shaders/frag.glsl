// 
// NOTES
// - Final post in this thread might be useful:
//   https://github.com/pixijs/pixi.js/issues/1977
//  

precision lowp float;

varying vec2 vTextureCoord;
varying vec4 vColor;

uniform sampler2D uSampler;

uniform vec4 vidDimensions;

uniform float yOffset;

void main(void)
{

  vec2 onePixel = vec2(1.0 / vidDimensions);

  float offsetHeight = yOffset + vidDimensions.y; // using this for testing

  float filterHeight = offsetHeight * onePixel.y;
  float halfHeight = filterHeight / 2.0;

  float alphaPixelY = vTextureCoord.y + (halfHeight * onePixel.y);
  vec2 alphaPixel = vec2(vTextureCoord.x, alphaPixelY);


  // if (vTextureCoord.y > halfHeight) discard;

  vec4 colorPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));
  vec4 alphaPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + halfHeight)); // STPQ (texture coord syntax)

  float alpha = alphaPx.r; //(alphaPx.r + alphaPx.g + alphaPx.b) / 3.0;

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
  // gl_FragColor = alphaPx; // <- just the alpha
  
  /**
   * actual working version
   */
  gl_FragColor = vec4(colorPx.rgb * alpha, alpha);


}