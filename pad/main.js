// comments

import Koji from 'koji-tools';

import audioPlay from 'audio-play';
import { audioContext } from './audioContext.js';

import {
    loadList,
    loadImage,
    loadSoundBuffer,
    loadFont
} from './assetLoaders.js';

class SoundPad {
    constructor(root, config) {
        this.app = root;
        this.config = config;
        this.name = this.config.settings.name;

        // get relevant dom nodes
        this.nodes = {
            app: root,
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

        // initialize state
        this.state = {
            trackPlaying: false,
            trackLooped: false
        };

        // keep track of stuff
        this.images = {};
        this.sounds = {};
        this.pads = {};
        this.playlist = [];

        // setup audioContext
        this.audioCtx = new audioContext();

        // event listeners
        // handle clicks / touches
        document.addEventListener('click', ({ target }) => this.handleClick(target));

        // hacky way to play sounds, needed for ios
        document.addEventListener('touchstart', ({ target }) => {
            if (target.sound) {
                target.sound.currentTime = 0;
                target.sound.play();
            }
        })
        document.addEventListener('mousedown', ({ target }) => {
            if (target.sound) {
                target.sound.currentTime = 0;
                target.sound.play();
            }
        })

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

    }

    load() {

        // set colors
        this.app.style.backgroundColor = this.config.colors.backgroundColor;
        this.nodes.loading.style.color = this.config.colors.textColor;
        this.nodes.name.textContent = this.config.settings.name;
        this.nodes.name.style.color = this.config.colors.textColor;
        this.nodes.menu.style.color = this.config.colors.textColor;
        this.nodes.menu.style.backgroundColor = this.config.colors.primaryColor;
        this.nodes.button.style.backgroundColor = this.config.colors.buttonColor;
        this.nodes.control.style.color = this.config.colors.textColor;
        // instructions
        this.nodes.instructions.innerHTML = this.isMobile ? 
        this.config.settings.instructionsMobile :
        this.config.settings.instructionsDesktop;

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
                return loadSoundBuffer(asset.key, asset.value, this.audioCtx)
            }

            return null;
        }).filter(asset => asset);



        // load assets
        loadList([
            ...assets,
            loadSoundBuffer('backgroundTrack', this.config.sounds.backgroundTrack, this.audioCtx),
            loadImage('backgroundImage', this.config.images.backgroundImage),
            loadFont('mainFont', this.config.settings.fontFamily)
        ])
        .then((loadedAssets) => {

            this.images = loadedAssets.image;
            this.fonts = loadedAssets.font;
            this.sounds = loadedAssets.sound;

            // attach onended handler for background track
            if (this.sounds.backgroundTrack) {
                this.sounds.backgroundTrack.onended = () => {
                    if (!this.state.trackLooped) {
                        this.nodes.playControl.textContent = 'play_arrow';
                    }
                };
            }

            if (this.images.backgroundImage) {
                this.app.style.backgroundImage = `url('${this.images.backgroundImage.src}')`;
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
            let padNode = document.createElement('div');

            padNode.className = 'pad';
            // padNode.style.backgroundImage = `url("${imageSrc}")`;
            padNode.style.backgroundColor = this.config.colors.padColor;
            padNode.style.borderColor = this.config.colors.padSideColor;

            let image = this.images[imageKey];
            image.id = id;

            return {
                id: id,
                sound: soundKey,
                image: this.images[imageKey],
                node: padNode
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

        // clear app
        let { pads } = this.nodes;
        while (pads.firstChild) {
            pads.removeChild(pads.firstChild);
        }

        // render new state
       let board = document.createDocumentFragment();

        Object.entries(this.pads)
        .map(ent => ent[1])
        .forEach((pad) => {

            // add image
            pad.node.appendChild(pad.image);

            // attach sound node to pad node
            // needed for ios audio
            pad.node.sound = this.sounds[pad.sound];

            board.appendChild(pad.node);
        })

        pads.appendChild(board);
    }

    handleClick(target) {
        // start
        if (target.id === 'button') {
            this.clearMenu();
        }

        // play/pause background track
        if ( target.id === 'play' ) {
            this.playTrack();
        }

        // toggle loop: background track
        if ( target.id === 'loop' ) {
            this.loopTrack();
        }

        let pad = this.pads[target.id];
        if (pad) {
            this.playPadSound(pad.sound);
        }

        /*
        console.log({
            target,
            audioCtx: this.audioCtx,
            sounds: this.sounds,
            pads: this.pads
        });
        */
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

    playPadSound(key) {
        // check if identical audioBuffer is playing
        let playing = this.playlist.some(p => p.key === key);

        // create audio buffer
        let id = Math.random().toString(16).slice(2);
        let audioBuffer = this.sounds[key];

        let playback = audioPlay(audioBuffer, {
            start: 0,
            end: playing ? 0 : audioBuffer.duration,
            context: this.audioCtx,
            autoplay: false
        }, () => {
            // remove from list when done
            this.playlist = this.playlist
            .filter(p => !p.id === id);
        })

        // play audio
        playback.play();

        // add to playlist
        this.playlist.push({
            id: id,
            key: key,
            playback: playback,
            timeStamp: Date.now()
        });

        console.log(this.playlist);
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