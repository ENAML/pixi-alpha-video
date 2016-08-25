'use strict';

const VideoMaskFilter = require('./VideoMaskFilter');


class AlphaVideoSprite extends PIXI.Sprite {
  constructor(videoFullTexture, filterPadding, autoUpdateVideoTexture) {

    super();

    // set pixi / dom elements
    this._fullTexture = videoFullTexture;
    this._srcEl = this._fullTexture.baseTexture.source;

    // set whether the baseTexture updates in it's on RAF loop or
    // if we should use this class' update method to update it
    // from some external loop (probably a `main loop`)
    autoUpdateVideoTexture = autoUpdateVideoTexture || false;
    this._fullTexture.baseTexture.autoUpdate = autoUpdateVideoTexture;

    // make sure it loops
    this._srcEl.loop = true;

    this.setup();
    this.setFilter(filterPadding);
    // this.shimScaleCallback();
  }

  setup() {

    var newWidth = this.srcWidth;
    var newHeight = this.srcHeight / 2;

    // create canvases
    this._maskedCanvas = document.createElement('canvas');
    this._maskCanvas = document.createElement('canvas');

    // create contexts
    this._maskedCtx = this._maskedCanvas.getContext('2d');
    this._maskCtx = this._maskCanvas.getContext('2d');

    // set canvas sizes
    this._maskedCanvas.width = this._maskCanvas.width = newWidth;
    this._maskedCanvas.height = this._maskCanvas.height = newHeight;

    // set this sprite's texture
    // this.texture = new PIXI.Texture(
    //  this._fullTexture, new PIXI.Rectangle(0, 0, newWidth, newHeight));
    this.texture = PIXI.Texture.fromCanvas(this._maskedCanvas)

    // set mask texture
    // this.maskTexture = new PIXI.Texture(
    //  this._fullTexture, new PIXI.Rectangle(0, newHeight, newWidth, newHeight));
    this.maskTexture = PIXI.Texture.fromCanvas(this._maskCanvas)

    // create mask sprite and add as child of this sprite
    this.maskSprite = new PIXI.Sprite(this.maskTexture);
    this.addChild(this.maskSprite);
  }

  listen() {

  }

  setFilter(filterPadding) {
    this.mask = this.maskSprite;
  }

  removeFilter() {

  }

  // 
  // Should only use this if not using `autoUpdate`
  // (see constructor's `autoUpdateVideoTexture` parameter)
  // 
  update() {
    // this._fullTexture.baseTexture.update();

    var video = this._srcEl;

    var width = video.videoWidth;
    var height = video.videoHeight / 2;

    this._maskedCtx.drawImage(video, 0, 0, width, height, 0, 0,
      this._maskedCanvas.width, this._maskedCanvas.height);
    this.texture.baseTexture.update();

    this._maskCtx.drawImage(video, 0, height, width, height, 0, 0,
      this._maskCanvas.width, this._maskCanvas.height);
    this.maskTexture.baseTexture.update();
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
  shimScaleCallback() {

    var spriteScope = this;
    var scaleScope = this.scale.scope;

    var oldCB = this.scale.cb;

    var newCB = function() {
      oldCB.call(scaleScope);

      // add stuff here if needed
      spriteScope.filter.setDimensions();
    }

    this.scale.cb = newCB;
  }

  // 
  // for easier access to w & h
  // 
  get srcWidth() {
    return this._srcEl.videoWidth;
  }
  get srcHeight() {
    return this._srcEl.videoHeight;
  }
}

module.exports = AlphaVideoSprite;