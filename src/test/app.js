import CarouselNavigation from '../lib';

document.querySelectorAll('header').forEach((header, i) => {
    import(`./assets/images/${i + 1}.jpg`).then(image => {
        header.style.backgroundImage = `url(${image.default})`;
    });
});

new CarouselNavigation({
    autoRotate: true,
    bgParticles: true,
    dragCube: true
});
