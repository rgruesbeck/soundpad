// Mobile fixes

// prevent refresh on pulls
function preventPullToRefresh(element) {
    var prevent = false;
    document.querySelector(element).addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) {
            return;
        }
        var scrollY = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop;
        prevent = (scrollY === 0);
    });
    document.querySelector(element).addEventListener('touchmove', function (e) {
        if (prevent) {
            prevent = false;
            e.preventDefault();
        }
    });
};

preventPullToRefresh('#app');

// add mobile height fix
function attachMobileViewHeight() {
    let height = window.innerHeight;

    let iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
    if (iOS) {
        height = height - 5;
    } // ignore iOS


    // First we get the viewport height and we multiple it by 1% to get a value for a vh unit
    let vh = height * 0.01;

    // Then we set the value in the --vh custom property to the root of the document
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    window.addEventListener('resize', attachMobileViewHeight);
}

// attachMobileViewHeight();