/**
 * index.js
 * 
 * What it Does:
 *   It also loads the .internals/config.json which is a bundle of current customization
 *   to the json files in the .koji directory
 * 
 * How to Use:
 *   Make sure this file has a script tag in index.html
 *   eg. <script src="./index.js"></script>
 */

// import and load koji configs
import Koji from 'koji-tools';
Koji.pageLoad();

// import Sound Pad
import Pad from './pad/main.js';

// get DOM node to attach
const padArea = document.getElementById('app');

// create new pad and load it
const config = Koji.config;
const pad = new Pad(padArea, config);
pad.load();