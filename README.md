# Sound Pad

Sound Pad

## VCC's

- 🎮 Change the text and pad settings
    * [Open configuration](#~/.koji/customization/settings.json!visual)
- 🎛️ Add or modify pad sounds and images
    * [Open configuration](#~/.koji/customization/pad.json!visual)
- 💅 Change the colors and visual style
    * [Open configuration](#~/.koji/customization/colors.json!visual)
- ⚙️ Add your Google Analytics ID and Open Graph information for sharing
    * [Open configuration](#~/.koji/customization/metadata.json!visual)

## Structure
### ~/
This is the main directory
- [index.html](#~/index.html) is the main html file where the pad elements are declared.
- [index.js](#~/index.js) is the main javascript file that initializes and loads the pad.
- [style.css](#~/style.css) this file contains css styles for the pad.

### ~/pad/
This directory contains the main pad code.
- [pad/main.js](#~/pad/main.js) is the main code for the sound pad.

### ~/pad/helpers
This directory contains helper code for loading assets.
- [assetLoaders: pad/helpers/assetLoaders.js](#~/pad/helpers/assetLoaders.js) a collections of functions to help load image, sound, and font assets.

### ~/pad/utils
This directory contains utility code for common functions.
- [baseUtils: pad/utils/baseUtils.js](#~/pad/utils/baseUtils.js) a collection of useful functions for making pads.

## Support
### Community
If you need any help, you can ask the community by [making a post](https://gokoji.com/posts), or [joining the discord](https://discordapp.com/invite/eQuMJF6).

### Helpful Resources