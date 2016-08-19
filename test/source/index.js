'use strict';

// libs
const PIXI = require('pixi.js');

// modules
const AlphaVideoSprite = require('../../source/AlphaVideoSprite');


const BG_COLORS = [
  'white',
  'green',
  'pink',
  'yellow',
  'blue',
  'black'
];
var bgColorIndex = 0;

// main app
class TestApp {
  constructor() {

    // init vars
    this.videoSprite = null;

    // get screen dimensions
    this.screen = {
      w: window.innerWidth,
      h: window.innerHeight,
    };

    // init PIXI
    this.renderer = new PIXI.WebGLRenderer(this.screen.w, this.screen.h, {
      backgroundColor : 0xffffff,
      // transparent: true,
      antialias: true,
      forceFXAA: true,
    });
    document.body.appendChild(this.renderer.view);

    // create stage
    this.stage = new PIXI.Container();

    // bind run loop
    this.tickBound = this.tick.bind(this);

    // load video and then start
    this.loadVideo();

    // listen for events
    this.listen();
  }

  loadVideo(done) {

    // create texture (and begin loading asset)
    var texture = PIXI.Texture.fromVideoUrl('/videos/compressed.mp4');

    // get the html src el
    var srcEl = texture.baseTexture.source;

    // set things to listen for on load / error
    var loadEvtEl = srcEl;
    var vidSources = srcEl.querySelectorAll('source');
    var errEvtEl = vidSources[vidSources.length - 1];

    var ctx = this;

    function onCanPlayThrough() {
      console.log('video loaded!');

      // remove listeners
      loadEvtEl.removeEventListener('canplaythrough', onCanPlayThrough);
      errEvtEl.removeEventListener('error', onError);

      // create video
      ctx.videoSprite = new AlphaVideoSprite(texture);

      // start it up!
      ctx.start.call(ctx);
    }

    function onError() {
      console.warn('video could not be loaded');

      // remove listeners
      loadEvtEl.removeEventListener('canplaythrough', onCanPlayThrough);
      errEvtEl.removeEventListener('error', onError);
    }

    // listen for events
    loadEvtEl.addEventListener('canplaythrough', onCanPlayThrough);
    errEvtEl.addEventListener('error', onError);
  }

  listen() {
    var ctx = this;

    window.addEventListener('resize', (e) => {
      ctx.resize.call(this);
    });

    document.body.addEventListener('click', (e) => {
      ctx.setBackgroundColor.call(ctx);
    });
  }

  resize() {
    this.screen.w = window.innerWidth;
    this.screen.h = window.innerHeight;
  
    this.renderer.resize(this.screen.w, this.screen.h);   
    this.setBackgroundColor(this.backgroundColor);
  }

  setBackgroundColor(color) {

    this.backgroundColor = color || getRandomColor();

    this.background.clear();
    this.background.beginFill(this.backgroundColor); 
    this.background.lineStyle(1, 0xffffff, 0);
    this.background.drawRect(0, 0, this.screen.w, this.screen.h);
    this.background.endFill();
  }

  start() {

    // create background
    this.background = new PIXI.Graphics();
    this.stage.addChild(this.background);
    this.setBackgroundColor();


    this.stage.addChild(this.videoSprite);
    
    this.tickBound();
  }

  tick() {
    requestAnimationFrame(this.tickBound);

    this.renderer.render(this.stage);
  }
}

// 
// returns random color in either decimals or as a hex string
// 
// Explanation:
// - http://www.paulirish.com/2009/random-hex-color-code-snippets/
// - http://www.daverabideau.com/blog/randomly-generated-hex-codes-in-javascript/
// 
function getRandomColor(toHexString) {
  var randomColorDecimal = Math.floor(Math.random()*16777215);

  return toHexString ?
    '#' + randomColorDecimal.toString(16) : randomColorDecimal;
}

// start it up
window.addEventListener('load', function() {

  const testApp = window.testApp = new TestApp();
});