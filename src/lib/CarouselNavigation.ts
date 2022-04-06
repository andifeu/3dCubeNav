import { tsParticles } from 'tsparticles';

const AUTO_ROTATION_DURATION = 10000;
const TOGGLE_MENU_DURATION = 500;
const ROTATION_X_START_VALUE = -20;
const MENU_SHOWN_SCALE = 0.3;
const CUBE_TOP_VALUE = 33;

interface CarouselNavigationParams {
    carousel?: string;
    page?: string;
    activePageIndex?: number;
    menuButton?: string;
    autoRotate?: boolean;
    dragCube?: true;
    bgParticles?: false;
}

// type PositionString = string;
// type PositionNumber = number;

interface PositionData {
    transform: {
        scale?: string;
        // value and unit
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

// type ObjectKeys<T> =
//   T extends object ? (keyof T)[] :
//   T extends number ? [] :
//   T extends Array<any> | string ? string[] :
//   never;

// interface ObjectConstructor {
//     keys<T>(o: T): ObjectKeys<T>
// }

// const defaultParams: CarouselNavigationParams = {
//     carousel: '.carousel',
//     page: '.page',
//     activePageIndex: 0,
//     menuButton: '.btn-menu',
//     autoRotate: true
// }

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

    private _dragCube: boolean = true;

    private _particlesContainer: HTMLElement | null = null;

    private _cubeTouched = false;

    private _currentNaviPosition: PositionData = {
        transform: {
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
        this._dragCube = params.dragCube === undefined ? true : !!params.dragCube;
        this._mouseDownEvent = this._getDragEventHandler();

        if (!!params.bgParticles) {
            import('./particlesjs-config.json').then(particlesConfig => {
                // @ts-ignore
                tsParticles.loadJSON('particles', particlesConfig.default)
                .then(container => {
                        this._particlesContainer = document.getElementById('particles');
                        this._toggleParticlesVisibility();
                        console.log("Particles loaded", container);
                    })
                    .catch(error => {
                        console.error(error);
                    });
            });
        }

        this._initialize();
    }

    private _initialize() {
        this._menuButton.addEventListener('click', () => {
            if (!this.isShown()) {
                this.show();
            } else {
                this.hide();
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

    public isShown() {
        return this._shown;
    }

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
                        this._animation = this._runRotation(this);
                    }
                }, 1000);
            }

            if (this._dragCube) {
                this._pageContainer.addEventListener('mousedown', this._mouseDownEvent);
            }
        });
    }

    public hide() {
        this._stopRotation();
        this.navigateToPage();
    }

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
            console.log(`Rotated ${currentRotateY}deg after ${this._animation.currentTime}ms`);
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
    }

    private _toggleParticlesVisibility(visible = false) {
        this._particlesContainer!.style.display = visible ? '' : 'none';
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
        this._pageContainer.style.transform = `translateZ(-${this._radius}vw) rotateY(${angleOfPage}deg))`;
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

    private _runRotation(carousel: CarouselNavigation) {
        const transformStart = this._pageContainer.style.transform;
        const regex = /rotateY\(([-]?(\d*\.)?\d+)deg\)/;
        const currentVal = this._pageContainer.style.transform.match(regex);
        if (!currentVal || currentVal[1] === undefined) {
            return null;
        }
        
        let transformEnd = this._pageContainer.style.transform.replace(regex, '');
        transformEnd += ` rotateY(${parseInt(currentVal[1], 10) + 360}deg)`;

        return carousel._pageContainer.animate(
            [
                {
                    transform: transformStart
                },
                {
                    transform: transformEnd,
                },
            ],
            {
                direction: 'reverse',
                duration: AUTO_ROTATION_DURATION,
                iterations: Infinity,
            }
        );
    }

    private _getDragEventHandler() {
        return (event: MouseEvent) => {
            const startX = event.pageX, startY = event.pageY;
            const offsetX = this._getNumberFromStyle(this._currentNaviPosition.transform.rotateX!);
            const offsetY = this._getNumberFromStyle(this._currentNaviPosition.transform.rotateY!);

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
                    console.log('event', event, event.target);
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

    private _getNumberFromStyle(style: string): number {
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

        console.log('this._currentNaviPosition', this._currentNaviPosition);
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

    // private _getInlineStyles(attribute: string): string {
    //     if (this._currentKeyframes && this._currentKeyframes[attribute]) {
    //         return this._currentKeyframes[attribute];
    //     }
    //     return '';
    // }

    private _menuVisibilityAnimation(showMenu = true) {
        const keyframes = [];
        const duration = TOGGLE_MENU_DURATION;
        let targetPosition: PositionData;

        const currentRotateY = this._getTargetAngle(this._activePageIndex);

        if (showMenu) {
            targetPosition = {
                transform: {
                    scale: `${MENU_SHOWN_SCALE}`,
                    translateZ: `-${this._radius}vw`,
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
