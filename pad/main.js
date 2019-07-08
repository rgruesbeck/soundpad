// comments

import Koji from 'koji-tools';

import audioPlay from 'audio-play';
import audioContext from 'audio-context';

import {
    loadList,
    loadImage,
    loadSound,
    loadFont
} from 'game-asset-loader';

class SoundPad {
    constructor(root, config) {
        this.app = root;
        this.config = config;
        this.name = this.config.settings.name;

        // get relevant dom nodes
        this.nodes = {
            app: root,
            loading: document.getElementById('loading'),
            banner: document.getElementById('nameBanner'),
            name: document.getElementById('name'),
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
        this.audioCtx = audioContext();

        // device sniffing
        this.device = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent),
            iOS: /iPhone|iPad|iPod/i.test(navigator.userAgent)
        };

        /* event listeners */

        // input
        if (this.device.isMobile) {
            document.addEventListener('touchstart', ({ target }) => this.handleTap(target));
        } else {
            document.addEventListener('click', ({ target }) => this.handleTap(target));
        }

        // orientation change
        window.addEventListener("orientationchange", () => this.render());

        // resize
        window.addEventListener("resize", () => this.render());

        // handle koji config changes
        Koji.on('change', (scope, key, value) => {
            this.config[scope][key] = value;
            this.load();
        });


        // warm up audio context for iOS devices
        if (this.device.iOS && this.audioCtx.state === 'suspended') {
            // check for locked audio context on touchend
            // NOTE: NOT using touchstart to avoid getting relocked incase gesture is detected.
            document.addEventListener('touchend', () => {
                if (this.audioCtx.state !== 'running') {
                    this.audioCtx.resume();
                }
            })
        }
    }

    load() {

        // set colors
        this.app.style.fontFamily = this.config.fontFamily;
        this.app.style.backgroundColor = this.config.colors.backgroundColor;
        document.body.style.backgroundColor = this.config.colors.backgroundColor;

        this.nodes.loading.style.color = this.config.colors.textColor;

        this.nodes.banner.textContent = this.config.settings.name;
        this.nodes.banner.style.color = this.config.colors.textColor;

        this.nodes.name.textContent = this.config.settings.name;
        this.nodes.name.style.color = this.config.colors.textColor;

        this.nodes.menu.style.color = this.config.colors.textColor;
        this.nodes.menu.style.backgroundColor = this.config.colors.backgroundColor;
        this.nodes.button.style.backgroundColor = this.config.colors.buttonColor;
        this.nodes.control.style.color = this.config.colors.textColor;

        // name and instructions
        this.nodes.instructions.innerHTML = this.device.isMobile ?
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
                    return loadSound(asset.key, asset.value)
                }

                return null;
            }).filter(asset => asset);



        // load assets
        loadList([
                ...assets,
                loadSound('backgroundTrack', this.config.sounds.backgroundTrack),
                loadImage('backgroundImage', this.config.images.backgroundImage),
                loadFont('mainFont', this.config.settings.fontFamily)
            ], (progress) => {
                // update progress
                document.querySelector('#loading-progress').textContent = `${progress.percent}%`
            })
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
            .catch((err) => {
                console.error('loading failed', err);
            })

    }

    create(sounds) {
        // set menu font
        this.app.style.fontFamily = this.fonts.mainFont;

        let {
            app,
            menu,
            loading
        } = this.nodes;

        // hide loading & show app
        loading.style.display = 'none';
        menu.style.opacity = 1;
        app.style.opacity = 1;

        // create pads
        this.pads = Object.entries(sounds)
            .filter(ent => ent[0] != 'backgroundTrack') // ignore background track
            .map((ent) => {
                // pad id
                let id = Math.random().toString(16).slice(2);

                // pad sound and image key
                let soundKey = ent[0];
                let imageKey = soundKey.replace('Sound', 'Image');

                // pad dom element
                let padNode = document.createElement('div');

                padNode.className = 'pad';
                padNode.style.backgroundColor = this.config.colors.padColor;
                padNode.style.borderColor = this.config.colors.padSideColor;

                let image = this.images[imageKey];
                image.id = soundKey;

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
        let {
            pads
        } = this.nodes;

        // clear app
        while (pads.firstChild) {
            pads.removeChild(pads.firstChild);
        }

        // get app size
        this.appSize = {
            width: window.innerWidth - 30,
            height: window.innerHeight - 250
        };

        // render new state
        let board = document.createDocumentFragment();

        // set pad style
        let numPads = Object.entries(this.pads).length;
        let minSize = Math.max(75, this.getMaxSize(numPads));
        pads.style.gridTemplateColumns = `repeat(auto-fit, minmax(${minSize}px, 1fr))`;

        Object.entries(this.pads)
            .map(ent => ent[1])
            .forEach((pad) => {
                // add image
                pad.node.appendChild(pad.image);

                // set pad size
                pad.node.style.height = `${minSize}px`;
                pad.node.style.width = `${minSize}px`;

                board.appendChild(pad.node);
            })


        pads.appendChild(board);
    }

    handleTap(target) {
        console.log('tap', target)
            // start
        if (target.id === 'button') {
            this.clearMenu();
        }

        // play/pause background track
        if (target.id === 'play') {
            this.playTrack();
        }

        // toggle loop: background track
        if (target.id === 'loop') {
            this.loopTrack();
        }

        // play a sound
        let sound = this.sounds[target.id];
        if (sound) {
            this.playSound(target.id, sound);
        }

    }

    getMaxSize(n) {
        let maxBoxSize = Math.sqrt(this.appSize.width * this.appSize.height / n);
        return this.appSize.width / Math.ceil(this.appSize.width / maxBoxSize);
    }

    playTrack() {
        let {
            playControl
        } = this.nodes;

        // play background track
        if (!this.backgroundTrack) {
            let backgroundTrackBuffer = this.sounds['backgroundTrack'];
            this.backgroundTrack = audioPlay(backgroundTrackBuffer, {
                start: 0,
                end: backgroundTrackBuffer.duration,
                context: this.audioCtx
            }, () => {
                // clear backgroundTrack
                this.backgroundTrack = null;
                playControl.textContent = 'play_arrow';
                this.state.trackPlaying = false;

                // play again if loop
                if (this.state.trackLooping) {
                    this.playTrack();
                }
            });
        }


        // update play controls
        if (this.state.trackPlaying) {
            playControl.textContent = 'play_arrow';
            this.state.trackPlaying = false;
            this.backgroundTrack.pause();
            this.backgroundTrack = null;
        } else {
            playControl.textContent = 'pause';
            this.state.trackPlaying = true;
        }

    }

    loopTrack() {
        let {
            loopControl
        } = this.nodes;

        if (this.state.trackLooping) {
            loopControl.textContent = 'repeat_one';
            this.state.trackLooping = false;
        } else {
            loopControl.textContent = 'repeat';
            this.state.trackLooping = true;
        }
    }

    playSound(key, audioBuffer) {
        if (!key || !audioBuffer) {
            return;
        }

        // add audio buffer to the play list
        let id = Math.random().toString(16).slice(2);
        let sound = {
            id: id,
            key: key,
            active: true,
            playback: audioPlay(audioBuffer, {
                start: 0,
                end: audioBuffer.duration,
                loop: false,
                context: this.audioCtx
            }, () => {
                // remove played sounds from playlist
                this.playlist = this.playlist
                    .filter(s => s.id != id);
            })
        }

        // stop and remove identical sounds from the playlist
        this.playlist = [
            ...this.playlist
            .filter(s => {
                let sameBuffer = s.key === key;
                if (sameBuffer) {
                    s.playback.pause();
                }
                return sameBuffer;
            }),
            sound
        ]
    }

    clearMenu() {
        console.log('clear')
        let {
            overlay,
            menu
        } = this.nodes;

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