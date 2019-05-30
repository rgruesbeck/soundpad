// comments

class SoundPad {
    constructor(root, config) {
        this.root = root;
        this.config = config;
        this.name = this.config.settings.name;


        this.background = document.body;
    }

    load() {
        console.log('loading', this.name);

        // set colors
        this.background.style.backgroundColor = this.config.colors.backgroundColor;
    }
}

export default SoundPad;