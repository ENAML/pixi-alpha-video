'use strict';

const VideoMaskFilter = require('../../../source/VideoMaskFilter');

class Video {
  constructor(videoTexture) {

    // set pixi / dom elements
    this.texture = videoTexture;
    this.srcEl = this.texture.baseTexture.source;

    // for easier access to w & h
    this.srcWidth = this.srcEl.videoWidth;
    this.srcHeight = this.srcEl.videoHeight;

    // create new sprite
    this.sprite = new PIXI.Sprite(this.texture);

    // make sure it loops
    this.srcEl.loop = true;

    this.setup();
  }

  setup() {
    this.addFilter();
  }

  listen() {

  }

  addFilter() {
    this.sprite.filters = [new VideoMaskFilter()];
  }

  removeFilter() {
    this.sprite.filters = null;
  }
}

module.exports = Video;