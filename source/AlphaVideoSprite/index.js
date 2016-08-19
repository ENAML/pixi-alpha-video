'use strict';

const VideoMaskFilter = require('./VideoMaskFilter');


class Video extends PIXI.Sprite {
  constructor(videoFullTexture) {

    super();

    // set pixi / dom elements
    this._fullTexture = videoFullTexture;
    this._srcEl = this._fullTexture.baseTexture.source;

    // make sure it loops
    this._srcEl.loop = true;

    this.setup();
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

module.exports = Video;