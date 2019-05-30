// comments

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

        document.addEventListener('click', ({ target }) => this.handleHit(target));
    }

    load() {
        // Load and the sound pad
        console.log('loading', this.config);

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
        })

        // create pads

    }

    update() {
        // clear app
        // render new state

    }

    handleHit(target) {
        console.log('handle-hit', target);
    }
}

export default SoundPad;