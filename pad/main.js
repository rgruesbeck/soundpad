// comments

import Koji from 'koji-tools';

import {
    loadList,
    loadImage,
    loadSound,
    loadFont
} from './assetLoaders.js';

class SoundPad {
    constructor(root, config) {
        this.app = root;
        this.config = config;
        this.name = this.config.settings.name;

        this.nodes = {
            app: root,
            background: document.body,
            loading: document.getElementById('loading'),
            name: document.getElementById('nameBanner'),
            pads: document.getElementById('pads'),
            bar: document.getElementById('bar'),
            control: document.getElementById('control'),
            playControl: document.getElementById('play'),
            loopControl: document.getElementById('loop'),
            overlay: document.getElementById('overlay'),
            menu: document.getElementById('menu'),
            button: document.getElementById('button'),
            instructions: document.getElementById('instructions')
        };

        this.state = {
            trackPlaying: false,
            trackLooped: false
        };


        this.images = {};
        this.sounds = {};

        this.pads = {};

        // event listeners

        // clear menu
        this.nodes.button.addEventListener('click', () => this.clearMenu());

        // pad hits
        document.addEventListener('click', ({ target }) => this.handleHit(target));
        document.addEventListener('touchstart', ({ target }) => this.handleHit(target), { passive: true });

        // orientation change
        window.addEventListener("orientationchange", () => this.render());

        // resize
        window.addEventListener("resize", () => this.render());

        // handle koji config changes
        Koji.on('change', (scope, key, value) => {
           this.config[scope][key] = value;
           this.load();
        });

        // set mobile flag
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

        // get app size
        this.appSize = {
            width: window.innerWidth,
            height: this.isMobile ?
            window.innerHeight - 250:
            window.innerHeight
        };

        console.log('appsize', this.isMobile, this.appSize);
    }

    load() {

        // set colors, button text, and instructions
        this.nodes.background.style.backgroundColor = this.config.colors.backgroundColor;

        this.nodes.loading.style.color = this.config.colors.textColor;
        this.nodes.name.textContent = this.config.settings.name;
        this.nodes.name.style.color = this.config.colors.textColor;

        this.nodes.menu.style.color = this.config.colors.textColor;
        this.nodes.menu.style.backgroundColor = this.config.colors.primaryColor;

        this.nodes.button.style.backgroundColor = this.config.colors.buttonColor;

        this.nodes.instructions.innerHTML = this.isMobile ? 
        this.config.settings.instructionsMobile :
        this.config.settings.instructionsDesktop;

        this.nodes.control.style.color = this.config.colors.textColor;

        // collect valid pads
        const pads = this.config['@@editor']
        .find(scope => scope.key === 'pads').fields // get pad assets listed in the editor
        .filter(padAsset => padAsset.type) // ignore un-typed items
        .filter(padAsset => this.config.pads[padAsset.key]) // ignore un-keyed items
        .map(padAsset => {
            padAsset.value = this.config.pads[padAsset.key]; // attach value
            return padAsset;
        });

        // setup asset loaders
        const assets = pads
        .map(asset => {
            // image loader
            if (asset.type === 'image') {
                return loadImage(asset.key, asset.value)
            }

            // sound loader
            if (asset.type === 'sound') {
                return loadSound(asset.key, asset.value)
            }

            return null;
        }).filter(asset => asset);



        // load assets
        loadList([
            ...assets,
            loadSound('backgroundTrack', this.config.sounds.backgroundTrack),
            loadFont('mainFont', this.config.settings.fontFamily)
        ])
        .then((loadedAssets) => {

            this.images = loadedAssets.image;
            this.sounds = loadedAssets.sound;
            this.fonts = loadedAssets.font;

            // attach onended handler for background track
            if (this.sounds.backgroundTrack) {
                this.sounds.backgroundTrack.onended = () => {
                    if (!this.state.trackLooped) {
                        this.nodes.playControl.textContent = 'play_arrow';
                    }
                };
            }

            this.create(this.sounds);
        })

    }

    create(sounds) {
        // set menu font
        this.app.style.fontFamily = this.fonts.mainFont;

        let { app, loading } = this.nodes;
        // hide loading & show app
        loading.style.opacity = 0;
        app.style.opacity = 1;

        // create pads
        this.pads = Object.entries(sounds)
        .filter(ent => ent[0] != 'backgroundTrack') // ignore background track
        .map((ent, idx, arr) => {
            // pad id
            let id = Math.random().toString(16).slice(2);

            // pad sound and image key
            let soundKey = ent[0];
            let imageKey = soundKey.replace('Sound', 'Image');
            let imageSrc = this.images[imageKey].src;

            // pad dom element
            let containerNode = document.createElement('div');
            let padNode = document.createElement('div');

            containerNode.id = id;
            containerNode.className = 'pad-container';

            padNode.id = id;
            padNode.className = 'pad';
            padNode.style.backgroundImage = `url("${imageSrc}")`;
            padNode.style.backgroundColor = this.config.colors.padColor;
            padNode.style.borderColor = this.config.colors.padSideColor;

            containerNode.appendChild(padNode);

            return {
                id: id,
                sound: soundKey,
                image: imageKey,
                node: containerNode
            }
        })
        .reduce((pads, pad) => {
            pads[pad.id] = pad;
            return pads;
        }, {});

        // render sound board
        this.render();
    }

    render() {
        // reset pads
        this.padLength = 0;


        // reset screen direction
        this.setScreenDirection();

        // clear app
        let { pads } = this.nodes;
        while (pads.firstChild) {
            pads.removeChild(pads.firstChild);
        }

        // render new state
       let board = document.createDocumentFragment();

        Object.entries(this.pads)
        .map(ent => ent[1])
        .forEach((pad, idx, arr) => {

            let padSize = this.getPadSize(arr.length);
            pad.node.style.width = `${padSize}px`;
            pad.node.style.height = `${padSize}px`;

            board.appendChild(pad.node);

            this.padLength += 1;
        })

        pads.appendChild(board);

        let style = this.getGridStyle();

        console.log(style);
        pads.style.gridTemplateColumns = style.columns;
        pads.style.gridGap = style.space;
    }

    getPadSize(total) {
       let { bar } = this.nodes;
       let padsHeight = this.appSize.height - bar.offsetHeight;
       let padsWidth = this.appSize.width;
       let cols = this.getColCount(total)

       let maxWidth = padsWidth / cols;
       let maxHeight = total % cols === 0 ?
           padsHeight / (total / cols) :
           padsHeight / ((total / cols) + 1);

       let result = Math.min(maxWidth, maxHeight);

       return result - (result / 8);
    }

    getPadSpace(total) {
        let { bar } = this.nodes;
        let width = this.appSize.width;
        let height = this.appSize.height - bar.offsetHeight;

        let padSize = this.getPadSize(total);
        let cols = this.getColCount(total);
        let rows = Math.ceil(total / cols);

        let xSpace = (width - (padSize * cols)) / cols;
        let ySpace = (height - (padSize * rows)) / rows;

        return Math.min(xSpace, ySpace);
    }

    getColCount(total) {
        let { bar } = this.nodes;
        let padsHeight = this.appSize.height - bar.offsetHeight;

        let width = this.appSize.width;
        let height = padsHeight;
        let ratio = Math.floor(width / height);

        let square = Math.floor(Math.sqrt(total));
        //return square + ratio;
        return square;
    }

    getGridStyle() {
        // this grid style gives us a grid that strikes a balance between
        // being a square grid of items, and being longer for super wide screens
        // while maximizing pad size

        // calculate and set height of pads area
        let cols = this.getColCount(this.padLength);
        let padSize = this.getPadSize(this.padLength);
        let padSpace = this.getPadSpace(this.padLength);

        return {
            columns: `repeat(${cols}, ${padSize}px)`,
            space: `${padSpace}px`
        };
    }

    setScreenDirection(depth = 0) {
        // re-orient for 120 frames
        if (depth && depth > 120) { return; }

        let { pads } = this.nodes;
        let style = this.getGridStyle();

        pads.style.gridTemplateColumns = style.columns;
        pads.style.gridGap = style.space;

        window.requestAnimationFrame(() => this.setScreenDirection(depth + 1));
    }

    handleHit(target) {

        // hit pad
        let pad = this.pads[target.id];
        if ( pad ) {
            // vibrate 200ms
            let vibrate = window.navigator.vibrate(200);
            let sound = this.sounds[pad.sound];
            sound.currentTime = 0;
            sound.play();

            // return this.playSound(pad);
        }

        // play/pause background track
        if ( target.id === 'play' ) {
            this.playTrack();
        }

        // toggle loop: background track
        if ( target.id === 'loop' ) {
            this.loopTrack();
        }
    }

    playSound(pad) {

        let sound = this.sounds[pad.sound];
        sound.currentTime = 0;
        sound.play();
    }

    playTrack() {

        let { backgroundTrack } = this.sounds;
        let { playControl } = this.nodes;

        if (this.state.trackPlaying) {
            backgroundTrack.pause();
            playControl.textContent = 'play_arrow';

            this.state.trackPlaying = false;
        } else {
            backgroundTrack.play();
            playControl.textContent = 'pause';

            this.state.trackPlaying = true;
        }

    }

    loopTrack() {
        let { backgroundTrack } = this.sounds;
        let { loopControl } = this.nodes;

        if (this.state.trackLooping) {
            backgroundTrack.loop = false;
            loopControl.textContent = 'repeat_one';

            this.state.trackLooping = false;
        } else {
            backgroundTrack.loop = true;
            loopControl.textContent = 'repeat';

            this.state.trackLooping = true;
        }

    }

    clearMenu() {
        let { overlay, menu } = this.nodes;

        // fade menu out
        menu.style.opacity = 0;

        // set overlay back
        setTimeout(() => {
            menu.style.display = 'none';
            overlay.style.zIndex = -1;
        }, 1000);
    }
}

export default SoundPad;