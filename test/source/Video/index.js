'use strict';

const VideoMaskFilter = require('../../../source/VideoMaskFilter');

class Video {
  constructor(videoTexture) {

    // set pixi / dom elements
    this.baseTexture = videoTexture;
    this.srcEl = this.baseTexture.baseTexture.source;

    // for easier access to w & h
    this.srcWidth = this.srcEl.videoWidth;
    this.srcHeight = this.srcEl.videoHeight;

    // make sure it loops
    this.srcEl.loop = true;

    this.setup();
  }

  setup() {

    var newWidth = this.srcWidth;
    var newHeight = this.srcHeight / 2;

    // create new textures
    this.maskedTexture = new PIXI.Texture(
     this.baseTexture, new PIXI.Rectangle(0, 0, newWidth, newHeight));
    this.maskTexture = new PIXI.Texture(
     this.baseTexture, new PIXI.Rectangle(0, newHeight, newWidth, newHeight));

    this.sprite = new PIXI.Sprite(this.maskedTexture);
    this.maskSprite = new PIXI.Sprite(this.maskTexture);

    this.sprite.addChild(this.maskSprite);

    this.addFilter();

    // // create new sprite
    // this.sprite = new PIXI.Sprite(this.baseTexture);

    // this.addFilter();
  }

  listen() {

  }

  addFilter() {
    this.filter = new VideoMaskFilter(this.maskSprite);
    this.sprite.filters = [this.filter];
  }

  removeFilter() {
    this.sprite.filters = null;
    this.filter = null;
  }
}

module.exports = Video;