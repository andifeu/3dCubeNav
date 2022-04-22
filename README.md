# 3D Cube Navigation

## Install & Run

### Developed with: 
- node: v16.13.2 
- npm v8.1.2

### Setup
- nvm use
- npm install

### Run Dev-Server
- npm run dev

### Run Build
- npm run build


## Usage

This library is not yet available in the npm repository and is still in development. For now this just a proof of concept.
Tested with Chrome and Firefox.

````typescript
import CarouselNavigation from '../lib';

new CarouselNavigation({
    autoRotate: true,
    bgParticles: true,
    dragCube: false,
    menuItems: [
        'HOME',
        'SERVICES',
        'PORTFOLIO',
        'TESTIMONIALS',
        'ABOUT',
        'CONTACT',
    ],
    menuContainer: document.querySelector('.menu')
});
````

````typescript
    boolean: autoRotate=true
````
Enables autorotation of the menu after the initial display. The rotation will be stopped when dragging the menu or hovering menu items.


````typescript
    boolean: bgParticles=true
````
Enables the tsparticles library for the background.


````typescript
    boolean: draggable=false
````
Enables a draggable cube. This feature is not working properly on Chrome yet. Since years Chrome has consistently issues with rotated elements and the mouse handling of them.

````typescript
    Array<string>: menuItems
````
Menu items for controlling the cube.

````typescript
    HTMLElement: menuContainer
````
Container which should contain the menu items


## Contact
EMail: andreas.feuerstein@mail.de