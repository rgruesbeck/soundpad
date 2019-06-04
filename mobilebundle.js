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

// prevent ios doubletap zoom
var lastTouchEnd = 0;
function preventDoubleTapZoom(element) {
    document.addEventListener('touchend', function (event) {
    var now = (new Date()).getTime();
    if (now - lastTouchEnd <= 500) {
        event.preventDefault();
    }
    lastTouchEnd = now;
    }, false);
}

preventDoubleTapZoom();