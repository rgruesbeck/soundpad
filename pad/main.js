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
        this.root = root;
        this.config = config;
        this.name = this.config.settings.name;

        this.background = document.body;

        this.images = {};
        this.sounds = {};

        this.pads = {};

        // event listeners
        document.addEventListener('click', ({ target }) => this.handleHit(target));

        // handle koji config changes
        Koji.on('change', (scope, key, value) => {
           this.config[scope][key] = value;
           this.load();
        });
    }

    load() {
        // set colors
        this.background.style.backgroundColor = this.config.colors.backgroundColor;

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

            // font loader
            if (asset.type === 'font') {
                return loadFont(asset.key, asset.value)
            }

            return null;
        }).filter(asset => asset);



        // load assets
        loadList(assets)
        .then((loadedAssets) => {

            this.images = loadedAssets.image;
            this.sounds = loadedAssets.sound;

            this.create(this.sounds);
        })

    }

    create(sounds) {
        // create pads
        this.pads = Object.entries(sounds).map((ent, idx, arr) => {
            // pad size
            let totalPads = arr.length;
            let padSize = Math.min(this.root.clientWidth / totalPads, this.root.clientWidth / totalPads);

            // pad id
            let id = Math.random().toString(16).slice(2);

            // pad sound and image key
            let soundKey = ent[0];
            let imageKey = soundKey.replace('Sound', 'Image');
            let imageSrc = this.images[imageKey].src;

            // pad dom element
            let node = document.createElement('div');
            node.id = id;
            node.className = 'pad';
            node.style.backgroundImage = `url("${imageSrc}")`;
            node.style.width = `${padSize}px`;
            node.style.height = `${padSize}px`;
            node.style.backgroundColor = this.config.colors.primaryColor;

            return {
                id: id,
                sound: soundKey,
                image: imageKey,
                node: node
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
        while (this.root.firstChild) {
            this.root.removeChild(this.root.firstChild);
        }

        // render new state
       let board = document.createDocumentFragment();

        Object.entries(this.pads)
        .map(ent => ent[1])
        .forEach((pad) => {
            board.appendChild(pad.node);
        })

        this.root.appendChild(board);
    }

    handleHit(target) {

        let pad = this.pads[target.id];
        if (pad) { this.playSound(pad); }
    }

    playSound(pad) {

        let sound = this.sounds[pad.sound];
        sound.currentTime = 0;
        sound.play();
    }
}

export default SoundPad;