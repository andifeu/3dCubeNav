const ANIMATION_DURATION = 30000;

const btnMenu = document.querySelector('.hamburger-menu');
const container = document.querySelector('.container');
const carousel = container.querySelector('.carousel');
const pageContainer = carousel.querySelector('.page-container');
const pages = pageContainer.getElementsByClassName('page');
const numPages = pages.length;
let activePage = 0;

let animation;

btnMenu.addEventListener('click', () => {
    rotateCarousel(activePage);
    container.classList.toggle('show-menu');
    
    if (container.classList.contains('show-menu')) {
        setTimeout(function () {
            animation = runRotation();
        }, 2000);
    } else {
        cleanup();
        animation.pause();
    }
});

var pageWidth = 100;
var pageHeight = 100;
var isHorizontal = true;
var rotateFn = isHorizontal ? 'rotateY' : 'rotateX';
let angleUnit;

function changeCarousel() {
    const numPages = pages.length;
    angleUnit = 360 / numPages;
    const unit = isHorizontal ? 'vw' : 'vh';
    radius = Math.round(100 / 2 / Math.tan(Math.PI / numPages));

    for (var i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageAngle = angleUnit * i;
        page.style.transform = `${rotateFn}(${pageAngle}deg) translateZ(${radius}${unit})`;
    }
}

function rotateCarousel(selectedIndex) {
    const unit = isHorizontal ? 'vw' : 'vh';
    const angle = angleUnit * selectedIndex * -1;
    const radius = Math.round(100 / 2 / Math.tan(Math.PI / numPages));

    pageContainer.style.transform = `translateZ(-${radius}${unit}) ${rotateFn}(${angle}deg)`;
}

function runRotation() {
    return pageContainer.animate(
        [
            { transform: 'rotateY(0deg)' },
            { transform: 'rotateY(360deg)' }
        ],
        {
            duration: ANIMATION_DURATION,
            iterations: Infinity,
            fill: 'forwards',
            composite: 'add'
        }
    );
}

changeCarousel();

// setInterval(() => {
//     activePage++;
//     rotateCarousel(activePage);
// }, 1000);


// var orientationRadios = document.querySelectorAll('input[name="orientation"]');
// (function () {
//     for (var i = 0; i < orientationRadios.length; i++) {
//         var radio = orientationRadios[i];
//         radio.addEventListener('change', onOrientationChange);
//     }
// })();

// function onOrientationChange() {
//     var checkedRadio = document.querySelector(
//         'input[name="orientation"]:checked'
//     );
//     isHorizontal = checkedRadio.value == 'horizontal';
//     rotateFn = isHorizontal ? 'rotateY' : 'rotateX';
//     changeCarousel();
// }

// set initials
// onOrientationChange();
