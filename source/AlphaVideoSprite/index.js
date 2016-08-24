'use strict';

const VideoMaskFilter = require('./VideoMaskFilter');


class AlphaVideoSprite extends PIXI.Sprite {
  constructor(videoFullTexture, autoUpdateVideoTexture) {

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

    this.setup(autoUpdateVideoTexture);
    this.setFilter();
    this.shimScaleCallback();
  }

  setup() {

    var newWidth = this.srcWidth;
    var newHeight = this.srcHeight / 2;

    // set this sprite's texture
    this.texture = new PIXI.Texture(
     this._fullTexture, new PIXI.Rectangle(0, 0, newWidth, newHeight));

    // set mask texture
    this.maskTexture = new PIXI.Texture(
     this._fullTexture, new PIXI.Rectangle(0, newHeight, newWidth, newHeight));

    // create mask sprite and add as child of this sprite
    this.maskSprite = new PIXI.Sprite(this.maskTexture);
    this.addChild(this.maskSprite);
  }

  listen() {

  }

  setFilter() {
    var filter = new VideoMaskFilter(this, this.maskSprite);

    this.filter = filter;
    this.filters = [this.filter];
    
    return filter;
  }

  removeFilter() {
    var filter = this.sprite.filter;

    this.filters = null;
    this.filter = null;

    return filter;
  }

  // 
  // Should only use this if not using `autoUpdate`
  // (see constructor's `autoUpdateVideoTexture` parameter)
  // 
  update() {
    this._fullTexture.baseTexture.update();
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