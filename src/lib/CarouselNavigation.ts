import { tsParticles } from 'tsparticles';

const AUTO_ROTATION_DURATION = 10000;
const TOGGLE_MENU_DURATION = 500;
const ROTATION_X_START_VALUE = -20;
const MENU_SHOWN_SCALE = 0.3;
const CUBE_TOP_VALUE = 33;
const PERSPECTIVE = 1000;

const MENU_CSS_CLASS = 'menu';

interface CarouselNavigationParams {
    carousel?: string;
    page?: string;
    activePageIndex?: number;
    menuButton?: string;
    autoRotate?: boolean;
    draggable?: true;
    bgParticles?: false;
    menuItems?: [],
    menuContainer?: HTMLElement
}

interface RotationRange {
    from?: number,
    to: number
}


type RotationDistance = RotationRange | number | null;

interface AnimationOptions {
    infinite?: boolean,
    direction?: PlaybackDirection | undefined
}

interface PositionData {
    transform: {
        // unit: vw
        perspective?: string
        scale?: string;
        // unit: vw
        translateZ?: string;
        // unit: degrees
        rotateX?: string;
        // unit: degrees
        rotateY?: string;
    };
    // value and unit
    top?: string;
}

type Keyframe = {
    [key: string]: string;
};


export default class CarouselNavigation {

    private _dom: HTMLDivElement;

    private _pageContainer: HTMLDivElement;

    private _pages: HTMLDivElement[];

    private _numPages: number;

    private _activePageIndex: number;

    private _radius: number;

    private _angle: number;

    private _animation: Animation | null = null;

    private _menuButton: HTMLElement;

    private _autoRotate: boolean;

    private _shown: boolean = false;

    private _draggable: boolean = true;

    private _particlesContainer: HTMLElement | null = null;

    private _cubeTouched = false;

    private _menuContainer: HTMLElement | null = null;

    private _showParticles: boolean = true;

    private _currentNaviPosition: PositionData = {
        transform: {
            perspective: '',
            scale: '',
            translateZ: '',
            rotateX: '',
            rotateY: '',
        },
        top: '',
    };

    private _mouseDownEvent: (event: MouseEvent) => void;

    constructor(params: CarouselNavigationParams = {}) {
        this._dom = getElemenBySelector(params.carousel || '.carousel', true);
        this._pageContainer = getElemenBySelector('.page-container', true);
        this._pages = Array.from(this._pageContainer.querySelectorAll(params.carousel || '.page'));
        this._numPages = this._pages.length;
        this._activePageIndex = params.activePageIndex || 0;
        this._radius = 100 / 2 / Math.tan(Math.PI / this._numPages);
        this._angle = 360 / this._numPages;
        this._menuButton = getElemenBySelector(params.menuButton || '.btn-menu', true);
        this._autoRotate = params.autoRotate !== undefined ? params.autoRotate : true;
        this._draggable = params.draggable === undefined ? true : !!params.draggable;
        this._showParticles = params.bgParticles === false ? false : true; 
        this._mouseDownEvent = this._getDragEventHandler();

        this._initialize(params);
    }

    private _initialize(params: CarouselNavigationParams = {}) {
        this._menuButton.addEventListener('click', () => {
            if (!this.isShown()) {
                this.show();
            } else {
                this.hide();
            }
        });

        this._buildMenu(params);
        
        if (this._showParticles) {
            import('./particlesjs-config.json').then(particlesConfig => {
                // @ts-ignore
                tsParticles.loadJSON('particles', particlesConfig.default)
                .then(container => {
                        this._particlesContainer = document.getElementById('particles');
                        this._toggleParticlesVisibility();
                        // console.log("Particles loaded", container);
                    })
                    .catch(error => {
                        console.error(error);
                    });
            });
        }
    }

    private _buildMenu(params: CarouselNavigationParams = {}) {
        let menuItems = '';
        if (!params || !params.menuItems) {
            return;
        }

        params.menuItems.forEach((menuItem, i) => {
            menuItems += `
                <li class="menuItem">
                    <a href="javascript:;" data-click="${i}">
                        ${menuItem}
                    </a>
                </li>
            `;
        });

        if (params.menuContainer) {
            this._menuContainer = params.menuContainer;
        } else {
            this._menuContainer = document.createElement('div');
            this._menuContainer.classList.add(MENU_CSS_CLASS);
        }
        
        this._menuContainer.innerHTML += `<ul>${menuItems}</ul>`;

        const list = this._menuContainer.querySelector('ul')!;
        list.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.dataset) {
                this.navigateToPage(parseInt(target.dataset.click!, 10));
            }
        });
        
        list.addEventListener('mouseover', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.dataset) {
                const index = parseInt(target.dataset.click!, 10);
                if (isNaN(index)) {
                    return;
                }

                const targetRotateY = 0 - index * this._angle;

                if (this._animation) {
                    this._stopAnimation();
                }

                this._animation = this._runRotation(200, {
                    to: targetRotateY
                });
                this._animation.addEventListener('finish', () => {
                    this._stopAnimation();
                    this._setCurrentPosition({
                        transform: {
                            rotateY: '' + targetRotateY + 'deg',
                        }
                    });
                    this._updateStyles();
                });
            }
        });
    }

    private _onCarouselClick(event: MouseEvent) {
        let clickedPageIndex;
        if (!this.isShown()) {
            return;
        }

        if (this._animation) {
            this._stopRotation();
        } else {
            clickedPageIndex = this._getIndexOfClickedPage(event);
            if (clickedPageIndex !== null) {
                this.navigateToPage(clickedPageIndex);
            }
        }
    }

    /**
     * Determines if the menu is currently shown
     * 
     * @returns The display status of the menu (true=shown/false=hidden)
     */
    public isShown() {
        return this._shown;
    }

    /**
     * Displays the navigation cube
     */
    public show() {
        this._toggleParticlesVisibility(true);
        toggleMenuClass(this._dom.parentNode);
        this._setupPages();
        this._rotateToPage(this._activePageIndex);

        const showMenuAnimation = this._menuVisibilityAnimation();

        showMenuAnimation.addEventListener('finish', () => {
            this._shown = true;
            if (this._autoRotate) {
                setTimeout(() => {
                    if (this.isShown() && !this._cubeTouched) {
                        this._animation = this._runRotation(AUTO_ROTATION_DURATION, null, {
                            direction: 'reverse'
                        });
                    }
                }, 1000);
            }

            if (this._draggable) {
                this._pageContainer.classList.add('draggable');
                this._pageContainer.addEventListener('mousedown', this._mouseDownEvent);
            }
        });
    }

    /**
     * Hides the navigation cube
     */
    public hide() {
        this._stopRotation();
        this.navigateToPage();
    }

    /**
     * Navigates to a given page
     * 
     * @param pageIndex Index of page which should be displayed
     */
    public navigateToPage(pageIndex: number = this._activePageIndex) {
        let pageIndexChanged = false,
            currentRotateY = this._getTargetAngle(this._activePageIndex);

        this._shown = false;
        this._pageContainer.removeEventListener('mousedown', this._mouseDownEvent);

        if (pageIndex !== this._activePageIndex) {
            pageIndexChanged = true;
        }

        if (this._animation) {
            this._animation.pause();
            currentRotateY = getCurrentKeyframeValue(this._animation) % 360;
            // console.log(`Rotated ${currentRotateY}deg after ${this._animation.currentTime}ms`);
            this._stopAnimation();
        // } else {
            // const offset = this._pageContainer.style.transform.match(/rotateY\(([0-9.]*)deg\)/);
            // if (offset && offset.length > 1) {
            //     console.log('current rotation', parseFloat(offset[1]));
            //     currentRotateY = parseFloat(offset[1]);
            // }
            // this._pageContainer.style.transform = `translateZ(-${this._radius}vw)`;
        }

        this._activePageIndex = pageIndex;
        const hideMenuAnimation = this._menuVisibilityAnimation(false);

        hideMenuAnimation.addEventListener('finish', () => {
            this._pageContainer.style.transform = '';
            this._pageContainer.style.top = '';

            this._cleanUpPages();
            toggleMenuClass(this._dom.parentNode);

            if (pageIndexChanged) {
                this._pageContainer.querySelector('.page.active')?.classList.remove('active');
                this._pageContainer
                    .querySelector(`.page:nth-child(${this._activePageIndex + 1})`)
                    ?.classList.add('active');
            }

            this._toggleParticlesVisibility();
        });

        this._pageContainer.classList.remove('draggable');
    }

    private _toggleParticlesVisibility(visible = false) {
        if (this._showParticles) {
            this._particlesContainer!.style.display = visible ? '' : 'none';
        }
    }

    private _getTargetAngle(pageIndex: number) {
        return this._angle * pageIndex * -1;
    }

    private _setupPages() {
        this._forEachPage((page, i) => {
            const pageAngle = this._angle * i;
            page.style.transform = `rotateY(${pageAngle}deg) translateZ(${this._radius}vw)`;
            page.dataset.pageIndex = `${i}`;
        });
    }

    private _cleanUpPages() {
        this._forEachPage((page) => {
            page.style.transform = '';
        });
    }

    private _rotateToPage(pageIndex: number) {
        const angleOfPage = this._angle * pageIndex * -1;
        // this._pageContainer.style.transform = `translateZ(-${this._radius}vw) rotateY(${angleOfPage}deg))`;
        this._pageContainer.style.transform = `rotateY(${angleOfPage}deg))`;
    }

    private _forEachPage(functionToCall: (page: HTMLElement, index: number) => void) {
        for (let i = 0; i < this._pages.length; i++) {
            functionToCall(this._pages[i], i);
        }
    }

    private _getIndexOfClickedPage(event: MouseEvent) {
        if (!event || !event.target) {
            return null;
        }

        const findParent = (el: HTMLElement | null): number | null => {
            if (!el || el === this._pageContainer) {
                return null;
            }

            if (el.classList.contains('page')) {
                return parseInt(el.dataset.pageIndex!, 10);
            }

            return findParent(el.parentNode as HTMLElement);
        };

        return findParent(event.target as HTMLElement);
    }

    private _stopAnimation() {
        if (this._animation) {
            this._animation.cancel();
            this._animation = null;
        }
    }

    private _stopRotation() {
        if (!this._animation) {
            return;
        }
        this._animation.pause();
        const currentRotateY = this._getTargetAngle(this._activePageIndex) + getCurrentKeyframeValue(this._animation) * -1;

        this._setCurrentPosition({
            transform: {
                rotateY: '' + currentRotateY + 'deg',
            }
        });

        this._updateStyles();
        this._stopAnimation();
    }


    private _runRotation(duration: number, rotationRange: RotationDistance = null, animationOptions: AnimationOptions = {}) {
        let rotationStartVal = 0, 
            rotationEndVal = 0;

        if (
            !rotationRange || typeof rotationRange === 'number' || 
            (typeof rotationRange === 'object' && typeof rotationRange.from !== 'number')
        ) {
            rotationStartVal = this._getValueFromStyle(this._currentNaviPosition.transform.rotateY!);
        } else {
            rotationStartVal = rotationRange.from!;
        }


        if (!rotationRange) {
            rotationEndVal = rotationStartVal + 360;
        } else if (typeof rotationRange === 'number') {
            rotationEndVal = rotationStartVal + rotationRange;
        } else {
            rotationEndVal = rotationRange.to;
        }

        const options: KeyframeAnimationOptions = {
            duration: duration
        };

        if (animationOptions.infinite) {
            options.iterations = Infinity;
        }

        if (animationOptions.direction) {
            options.direction = animationOptions.direction;
        }

        const transformStart:PositionData = {
            transform: {
                // perspective: this._currentNaviPosition.transform.perspective,
                // translateZ: this._currentNaviPosition.transform.translateZ,
                scale: this._currentNaviPosition.transform.scale,
                rotateX: this._currentNaviPosition.transform.rotateX,
                rotateY: rotationStartVal + 'deg'
            },
            top: this._currentNaviPosition.top
        };

        const transformEnd:PositionData = {
            transform: {
                // perspective: this._currentNaviPosition.transform.perspective,
                // translateZ: this._currentNaviPosition.transform.translateZ,
                scale: this._currentNaviPosition.transform.scale,
                rotateX: this._currentNaviPosition.transform.rotateX,
                rotateY: rotationEndVal + 'deg'
            },
            top: this._currentNaviPosition.top
        };
        

        const keyframes = [
            this._toKeyframes(transformStart),
            this._toKeyframes(transformEnd)
        ];
        

        // console.log('start', this._toKeyframes(transformStart));
        // console.log('end', this._toKeyframes(transformEnd));
        
        return this._pageContainer.animate(
            keyframes,
            options
        );
    }

    private _getDragEventHandler() {
        return (event: MouseEvent) => {
            const startX = event.pageX, startY = event.pageY;
            const offsetX = this._getValueFromStyle(this._currentNaviPosition.transform.rotateX!);
            const offsetY = this._getValueFromStyle(this._currentNaviPosition.transform.rotateY!);

            this._cubeTouched = true;

            const moveAt = (pageX: number, pageY: number) => {
                const distanceX = ((startY - pageY) * -1) / 4;
                const distanceY = (startX - pageX) / 4;

                // console.log('distanceY', distanceY);
                // console.log('distanceY', distanceY);

                const rotateX = offsetX - distanceX;
                const rotateY = offsetY - distanceY;
                this._setCurrentPosition({
                    transform: {
                        rotateX: '' + rotateX + 'deg',
                        rotateY: '' + rotateY + 'deg',
                    },
                });
                this._updateStyles();
            };

            moveAt(event.pageX, event.pageY);

            const removeMouseMoveEvent = () => {
                document.removeEventListener('mousemove', onMouseMove);
                this._pageContainer.classList.remove('dragging');
                this._pageContainer.onmouseup = null;
            };

            const onMouseMove = (event: MouseEvent) => {
                if (!this._dom.contains(event.target as Node)) {
                    removeMouseMoveEvent();
                }
                moveAt(event.pageX, event.pageY);
            };

            document.addEventListener('mousemove', onMouseMove);
            this._pageContainer.onmouseup = (event: MouseEvent) => {
                const lastX = event.pageX, lastY = event.pageY;
                if (
                    (Math.abs(startX - lastX) === 0 && Math.abs(startY - lastY) === 0) || 
                    this._animation
                ) {
                    this._onCarouselClick(event);
                }

                removeMouseMoveEvent();
                this._pageContainer.classList.remove('dragging');
            };

            this._pageContainer.classList.add('dragging');
        };
    }

    private _getValueFromStyle(style: string): number {
        return parseFloat(style);
    }

    private _setCurrentPosition(styles: PositionData) {
        Object.keys(this._currentNaviPosition).forEach((val) => {
            const cssAttr = val as keyof PositionData;
            if (!styles[cssAttr]) {
                return;
            }
            if (typeof styles[cssAttr] === 'object') {
                Object.assign(this._currentNaviPosition[cssAttr], styles[cssAttr]);
            } else {
                this._currentNaviPosition[cssAttr] = <keyof PositionData>styles[cssAttr];
            }
        });
    }

    private _updateStyles() {
        let styleTag = '';

        Object.keys(this._currentNaviPosition).forEach((val) => {
            const cssAttr = val as keyof PositionData;
            const subStyles = <any>this._currentNaviPosition[cssAttr];

            styleTag = '';
            if (typeof subStyles === 'string') {
                styleTag += subStyles;
            } else {
                Object.keys(subStyles).forEach((subStyle) => {
                    const value = subStyles[subStyle];
                    if (!value) {
                        return;
                    }

                    styleTag += `${subStyle}(${value}) `;
                });
            }
            this._pageContainer.style[cssAttr] = styleTag;
        });
    }

    private _toKeyframes(positionData: PositionData): Keyframe {
        const keyframe: Keyframe = {};

        Object.keys(positionData).forEach((styles) => {
            keyframe[styles] = '';
            const subStyles = <any>positionData[styles as keyof PositionData];

            if (typeof subStyles === 'string') {
                keyframe[styles] += subStyles;
            } else {
                Object.keys(subStyles).forEach((subStyle) => {
                    const value = subStyles[subStyle];
                    if (!value) {
                        return;
                    }

                    keyframe[styles] += `${subStyle}(${value}) `;
                });
            }
        });
        return keyframe;
    }


    private _menuVisibilityAnimation(showMenu = true) {
        const keyframes = [];
        const duration = TOGGLE_MENU_DURATION;
        let targetPosition: PositionData;

        const currentRotateY = this._getTargetAngle(this._activePageIndex);

        if (showMenu) {
            targetPosition = {
                transform: {
                    // perspective: `${PERSPECTIVE}vw`,
                    scale: `${MENU_SHOWN_SCALE}`,
                    // translateZ: `-${this._radius}vw`,
                    rotateX: `${ROTATION_X_START_VALUE}deg`,
                    rotateY: currentRotateY + 'deg'
                },
                top: `${CUBE_TOP_VALUE}vh`
            };

            keyframes.push(this._toKeyframes({
                transform: {
                    scale: '1',
                    rotateX: '0',
                    rotateY: currentRotateY + 'deg'
                },
                top: '0'
            }));

            keyframes.push(this._toKeyframes(targetPosition));

        } else {
            targetPosition = {
                transform: {
                    scale: '1',
                    rotateX: '0',
                    rotateY: currentRotateY + 'deg'
                },
                top: '0'
            };

            keyframes.push(this._toKeyframes(this._currentNaviPosition));
            keyframes.push(this._toKeyframes(targetPosition));
            this._cubeTouched = false;
        }

        this._setCurrentPosition(targetPosition);
        this._updateStyles();

        return this._pageContainer.animate(keyframes, {
            duration: duration,
        });
    }
}

function toggleMenuClass(parentOfDom: ParentNode | null) {
    if (!parentOfDom) {
        throw new Error('Could not find parent of Carousel');
    }
    (<HTMLElement>parentOfDom).classList.toggle('show-menu');
}

function getElemenBySelector(selector: string, strict: boolean = false) {
    const el = document.querySelector(selector) as HTMLDivElement;
    if (!el && strict) {
        throw new Error(`Selector ${selector} not found`);
    }
    return el;
}

function getCurrentKeyframeValue(animation: Animation) {
    if (!animation || animation.currentTime === null) {
        return 0;
    }
    return (360 / AUTO_ROTATION_DURATION) * animation.currentTime;
}
