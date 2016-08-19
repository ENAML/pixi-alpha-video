// 
// NOTES
// - Final post in this thread might be useful:
//   https://github.com/pixijs/pixi.js/issues/1977
//  

precision lowp float;

varying vec2 vMaskCoord;
varying vec2 vTextureCoord;
varying vec4 vColor;

uniform sampler2D uSampler;
uniform float alpha;

uniform sampler2D mask;
uniform vec4 filterArea;

void main(void)
{
    // discard;

    vec2 onePixel = vec2(1.0 / filterArea);
    float filterHeight = filterArea.y * onePixel.y;
    float halfHeight = filterHeight / 2.0;

    float alphaPixelY = vTextureCoord.y + (halfHeight * onePixel.y);
    vec2 alphaPixel = vec2(vTextureCoord.x, alphaPixelY);

    // check clip! this will stop the mask bleeding out from the edges
// / '    vec2 text = abs( vMaskCoord - 0.5 );
// / '    text = step(0.5, text);
// / '    float clip = 1.0 - max(text.y, text.x);

    vec4 original = texture2D(uSampler, vTextureCoord);

// / '    vec4 masky = texture2D(uSampler, alphaPixel);
// / '    original *= (masky.r * masky.a * alpha * clip);
// / '    original.a *= texelAlpha.r;
// / '    gl_FragColor = original;

// / '    if (vTextureCoord.y > halfHeight) discard;
    vec4 colorPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y));
    vec4 alphaPx = texture2D(uSampler, vec2(vTextureCoord.x, vTextureCoord.y + halfHeight)); // STPQ (texture coord syntax)
    float alpha = (alphaPx.r + alphaPx.g + alphaPx.b) / 3.0;
// / '    original.a *= texelAlpha;

    gl_FragColor = vec4(colorPx.rgb, colorPx.a * alpha);

  // / 'float pctDown = vTextureCoord.y / filterHeight;
  // / // 'color *= pctDown;
  // / 'gl_FragColor = vec4(colorPx.rgb, pctDown);

  // / 'gl_FragColor = colorPx; // <- just the video in it's original state
  // / 'gl_FragColor = alphaPx; // <- just the alpha
}