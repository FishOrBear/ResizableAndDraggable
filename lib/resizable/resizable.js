import * as React from 'react';
import { Resizer, Direction, UpdateStyle } from './resizer';
//基于 https://github.com/bokuweb/re-resizable 2019.3.17
//全屏光标遮罩层
let cursorMask;
function memoize(fn) {
    return fn;
}
const DEFAULT_SIZE = {
    width: 'auto',
    height: 'auto',
};
export const EnableAll = {
    top: true,
    right: true,
    bottom: true,
    left: true,
    topRight: true,
    bottomRight: true,
    bottomLeft: true,
    topLeft: true,
};
const clamp = memoize((n, min, max) => Math.max(Math.min(n, max), min));
const snap = memoize((n, size) => Math.round(n / size) * size);
const findClosestSnap = memoize((n, snapArray) => snapArray.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev)));
const endsWith = memoize((str, searchStr) => str.substr(str.length - searchStr.length, searchStr.length) === searchStr);
const getStringSize = memoize((n) => {
    n = n.toString();
    if (n === 'auto') {
        return n;
    }
    if (endsWith(n, 'px')) {
        return n;
    }
    if (endsWith(n, '%')) {
        return n;
    }
    if (endsWith(n, 'vh')) {
        return n;
    }
    if (endsWith(n, 'vw')) {
        return n;
    }
    if (endsWith(n, 'vmax')) {
        return n;
    }
    if (endsWith(n, 'vmin')) {
        return n;
    }
    return `${n}px`;
});
const calculateNewMax = memoize((parentSize, maxWidth, maxHeight, minWidth, minHeight) => {
    if (maxWidth && typeof maxWidth === 'string' && endsWith(maxWidth, '%')) {
        const ratio = Number(maxWidth.replace('%', '')) / 100;
        maxWidth = parentSize.width * ratio;
    }
    if (maxHeight && typeof maxHeight === 'string' && endsWith(maxHeight, '%')) {
        const ratio = Number(maxHeight.replace('%', '')) / 100;
        maxHeight = parentSize.height * ratio;
    }
    if (minWidth && typeof minWidth === 'string' && endsWith(minWidth, '%')) {
        const ratio = Number(minWidth.replace('%', '')) / 100;
        minWidth = parentSize.width * ratio;
    }
    if (minHeight && typeof minHeight === 'string' && endsWith(minHeight, '%')) {
        const ratio = Number(minHeight.replace('%', '')) / 100;
        minHeight = parentSize.height * ratio;
    }
    return {
        maxWidth: typeof maxWidth === 'undefined' ? undefined : Number(maxWidth),
        maxHeight: typeof maxHeight === 'undefined' ? undefined : Number(maxHeight),
        minWidth: typeof minWidth === 'undefined' ? undefined : Number(minWidth),
        minHeight: typeof minHeight === 'undefined' ? undefined : Number(minHeight),
    };
});
const definedProps = [
    'style',
    'className',
    'grid',
    'snap',
    'bounds',
    'size',
    'defaultSize',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'lockAspectRatio',
    'lockAspectRatioExtraWidth',
    'lockAspectRatioExtraHeight',
    'enable',
    'handleStyles',
    'handleClasses',
    'handleWrapperStyle',
    'handleWrapperClass',
    'children',
    'onResizeStart',
    'onResize',
    'onResizeStop',
    'handleComponent',
    'scale',
    'resizeRatio',
];
// HACK: This class is used to calculate % size.
const baseClassName = '__resizable_base__';
export class Resizable extends React.Component {
    constructor(props) {
        super(props);
        this.ratio = 1;
        this.resizable = null;
        this.extendsProps = {};
        // For parent boundary
        this.parentLeft = 0;
        this.parentTop = 0;
        // For boundary
        this.resizableLeft = 0;
        this.resizableTop = 0;
        // For target boundary
        this.targetLeft = 0;
        this.targetTop = 0;
        this.state = {
            isResizing: false,
            resizeCursor: 'auto',
            width: typeof (this.propsSize && this.propsSize.width) === 'undefined'
                ? 'auto'
                : this.propsSize && this.propsSize.width,
            height: typeof (this.propsSize && this.propsSize.height) === 'undefined'
                ? 'auto'
                : this.propsSize && this.propsSize.height,
            direction: Direction.right,
            original: {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            },
        };
        this.updateExtendsProps(props);
        this.onResizeStart = this.onResizeStart.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        UpdateStyle(this.props.enable, this.props.catchSize, this.props.catchInbreak);
        if (typeof window !== 'undefined') {
            window.addEventListener('mouseup', this.onMouseUp);
            window.addEventListener('mousemove', this.onMouseMove);
            window.addEventListener('mouseleave', this.onMouseUp);
            window.addEventListener('touchmove', this.onMouseMove);
            window.addEventListener('touchend', this.onMouseUp);
        }
    }
    get parentNode() {
        if (!this.resizable) {
            return null;
        }
        return this.resizable.parentNode;
    }
    get propsSize() {
        return this.props.size || this.props.defaultSize || DEFAULT_SIZE;
    }
    get base() {
        const parent = this.parentNode;
        if (!parent) {
            return undefined;
        }
        const children = [].slice.call(parent.children);
        for (const n of children) {
            if (n instanceof HTMLElement) {
                if (n.classList.contains(baseClassName)) {
                    return n;
                }
            }
        }
        return undefined;
    }
    get size() {
        let width = 0;
        let height = 0;
        if (typeof window !== 'undefined' && this.resizable) {
            const orgWidth = this.resizable.offsetWidth;
            const orgHeight = this.resizable.offsetHeight;
            // HACK: Set position `relative` to get parent size.
            //       This is because when re-resizable set `absolute`, I can not get base width correctly.
            const orgPosition = this.resizable.style.position;
            if (orgPosition !== 'relative') {
                this.resizable.style.position = 'relative';
            }
            // INFO: Use original width or height if set auto.
            width = this.resizable.style.width !== 'auto' ? this.resizable.offsetWidth : orgWidth;
            height = this.resizable.style.height !== 'auto' ? this.resizable.offsetHeight : orgHeight;
            // Restore original position
            this.resizable.style.position = orgPosition;
        }
        return { width, height };
    }
    get sizeStyle() {
        const { size } = this.props;
        const getSize = (key) => {
            if (typeof this.state[key] === 'undefined' || this.state[key] === 'auto') {
                return 'auto';
            }
            if (this.propsSize && this.propsSize[key] && endsWith(this.propsSize[key].toString(), '%')) {
                if (endsWith(this.state[key].toString(), '%')) {
                    return this.state[key].toString();
                }
                const parentSize = this.getParentSize();
                const value = Number(this.state[key].toString().replace('px', ''));
                const percent = (value / parentSize[key]) * 100;
                return `${percent}%`;
            }
            return getStringSize(this.state[key]);
        };
        const width = size && typeof size.width !== 'undefined' && !this.state.isResizing
            ? getStringSize(size.width)
            : getSize('width');
        const height = size && typeof size.height !== 'undefined' && !this.state.isResizing
            ? getStringSize(size.height)
            : getSize('height');
        return { width, height };
    }
    updateExtendsProps(props) {
        this.extendsProps = Object.keys(props).reduce((acc, key) => {
            if (definedProps.indexOf(key) !== -1) {
                return acc;
            }
            acc[key] = props[key];
            return acc;
        }, {});
    }
    getParentSize() {
        if (!this.base || !this.parentNode) {
            return { width: window.innerWidth, height: window.innerHeight };
        }
        // INFO: To calculate parent width with flex layout
        let wrapChanged = false;
        const wrap = this.parentNode.style.flexWrap;
        const minWidth = this.base.style.minWidth;
        if (wrap !== 'wrap') {
            wrapChanged = true;
            this.parentNode.style.flexWrap = 'wrap';
            // HACK: Use relative to get parent padding size
        }
        this.base.style.position = 'relative';
        this.base.style.minWidth = '100%';
        const size = {
            width: this.base.offsetWidth,
            height: this.base.offsetHeight,
        };
        this.base.style.position = 'absolute';
        if (wrapChanged) {
            this.parentNode.style.flexWrap = wrap;
        }
        this.base.style.minWidth = minWidth;
        return size;
    }
    componentDidMount() {
        this.setState({
            width: this.state.width || this.size.width,
            height: this.state.height || this.size.height,
        });
        const parent = this.parentNode;
        if (!(parent instanceof HTMLElement)) {
            return;
        }
        if (this.base) {
            return;
        }
        const element = document.createElement('div');
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.position = 'absolute';
        element.style.transform = 'scale(0, 0)';
        element.style.left = '0';
        element.style.flex = '0';
        if (element.classList) {
            element.classList.add(baseClassName);
        }
        else {
            element.className += baseClassName;
        }
        parent.appendChild(element);
        if (!cursorMask) {
            cursorMask = document.createElement("div");
            cursorMask.style.position = "fixed";
            cursorMask.style.left = "0px";
            cursorMask.style.top = "0px";
            cursorMask.style.right = "0px";
            cursorMask.style.bottom = "0px";
            cursorMask.style.zIndex = "9999";
            cursorMask.style.display = "none";
            document.body.append(cursorMask);
        }
    }
    componentWillReceiveProps(next) {
        this.updateExtendsProps(next);
    }
    componentWillUnmount() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('mouseup', this.onMouseUp);
            window.removeEventListener('mousemove', this.onMouseMove);
            window.removeEventListener('mouseleave', this.onMouseUp);
            window.removeEventListener('touchmove', this.onMouseMove);
            window.removeEventListener('touchend', this.onMouseUp);
            const parent = this.parentNode;
            if (!this.base || !parent) {
                return;
            }
            if (!(parent instanceof HTMLElement) || !(this.base instanceof Node)) {
                return;
            }
            parent.removeChild(this.base);
        }
    }
    componentDidUpdate() {
        cursorMask.style.display = this.state.isResizing ? "block" : "none";
        cursorMask.style.cursor = this.state.resizeCursor || 'auto';
    }
    createSizeForCssProperty(newSize, kind) {
        const propsSize = this.propsSize && this.propsSize[kind];
        return this.state[kind] === 'auto' &&
            this.state.original[kind] === newSize &&
            (typeof propsSize === 'undefined' || propsSize === 'auto')
            ? 'auto'
            : newSize;
    }
    calculateNewMaxFromBoundary(maxWidth, maxHeight) {
        if (this.props.bounds === 'parent') {
            const parent = this.parentNode;
            if (parent instanceof HTMLElement) {
                const boundWidth = parent.offsetWidth + (this.parentLeft - this.resizableLeft);
                const boundHeight = parent.offsetHeight + (this.parentTop - this.resizableTop);
                maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
                maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
            }
        }
        else if (this.props.bounds === 'window') {
            if (typeof window !== 'undefined') {
                const boundWidth = window.innerWidth - this.resizableLeft;
                const boundHeight = window.innerHeight - this.resizableTop;
                maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
                maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
            }
        }
        else if (this.props.bounds instanceof HTMLElement) {
            const boundWidth = this.props.bounds.offsetWidth + (this.targetLeft - this.resizableLeft);
            const boundHeight = this.props.bounds.offsetHeight + (this.targetTop - this.resizableTop);
            maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
            maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
        }
        return { maxWidth, maxHeight };
    }
    calculateNewSizeFromDirection(clientX, clientY) {
        const scale = this.props.scale || 1;
        const resizeRatio = this.props.resizeRatio || 1;
        const { direction, original } = this.state;
        const { lockAspectRatio, lockAspectRatioExtraHeight, lockAspectRatioExtraWidth } = this.props;
        let newWidth = original.width;
        let newHeight = original.height;
        if (direction & Direction.right) {
            newWidth = original.width + ((clientX - original.x) * resizeRatio) / scale;
            if (lockAspectRatio) {
                newHeight = (newWidth - lockAspectRatioExtraWidth) / this.ratio + lockAspectRatioExtraHeight;
            }
        }
        if (Direction.left & direction) {
            newWidth = original.width - ((clientX - original.x) * resizeRatio) / scale;
            if (lockAspectRatio) {
                newHeight = (newWidth - lockAspectRatioExtraWidth) / this.ratio + lockAspectRatioExtraHeight;
            }
        }
        if (Direction.bottom & direction) {
            newHeight = original.height + ((clientY - original.y) * resizeRatio) / scale;
            if (lockAspectRatio) {
                newWidth = (newHeight - lockAspectRatioExtraHeight) * this.ratio + lockAspectRatioExtraWidth;
            }
        }
        if (Direction.top & direction) {
            newHeight = original.height - ((clientY - original.y) * resizeRatio) / scale;
            if (lockAspectRatio) {
                newWidth = (newHeight - lockAspectRatioExtraHeight) * this.ratio + lockAspectRatioExtraWidth;
            }
        }
        return { newWidth, newHeight };
    }
    calculateNewSizeFromAspectRatio(newWidth, newHeight, max, min) {
        const { lockAspectRatio, lockAspectRatioExtraHeight, lockAspectRatioExtraWidth } = this.props;
        const computedMinWidth = typeof min.width === 'undefined' ? 10 : min.width;
        const computedMaxWidth = typeof max.width === 'undefined' || max.width < 0 ? newWidth : max.width;
        const computedMinHeight = typeof min.height === 'undefined' ? 10 : min.height;
        const computedMaxHeight = typeof max.height === 'undefined' || max.height < 0 ? newHeight : max.height;
        if (lockAspectRatio) {
            const extraMinWidth = (computedMinHeight - lockAspectRatioExtraHeight) * this.ratio + lockAspectRatioExtraWidth;
            const extraMaxWidth = (computedMaxHeight - lockAspectRatioExtraHeight) * this.ratio + lockAspectRatioExtraWidth;
            const extraMinHeight = (computedMinWidth - lockAspectRatioExtraWidth) / this.ratio + lockAspectRatioExtraHeight;
            const extraMaxHeight = (computedMaxWidth - lockAspectRatioExtraWidth) / this.ratio + lockAspectRatioExtraHeight;
            const lockedMinWidth = Math.max(computedMinWidth, extraMinWidth);
            const lockedMaxWidth = Math.min(computedMaxWidth, extraMaxWidth);
            const lockedMinHeight = Math.max(computedMinHeight, extraMinHeight);
            const lockedMaxHeight = Math.min(computedMaxHeight, extraMaxHeight);
            newWidth = clamp(newWidth, lockedMinWidth, lockedMaxWidth);
            newHeight = clamp(newHeight, lockedMinHeight, lockedMaxHeight);
        }
        else {
            newWidth = clamp(newWidth, computedMinWidth, computedMaxWidth);
            newHeight = clamp(newHeight, computedMinHeight, computedMaxHeight);
        }
        return { newWidth, newHeight };
    }
    setBoundingClientRect() {
        // For parent boundary
        if (this.props.bounds === 'parent') {
            const parent = this.parentNode;
            if (parent instanceof HTMLElement) {
                const parentRect = parent.getBoundingClientRect();
                this.parentLeft = parentRect.left;
                this.parentTop = parentRect.top;
            }
        }
        // For target(html element) boundary
        if (this.props.bounds instanceof HTMLElement) {
            const targetRect = this.props.bounds.getBoundingClientRect();
            this.targetLeft = targetRect.left;
            this.targetTop = targetRect.top;
        }
        // For boundary
        if (this.resizable) {
            const { left, top } = this.resizable.getBoundingClientRect();
            this.resizableLeft = left;
            this.resizableTop = top;
        }
    }
    onResizeStart(event, direction) {
        let clientX = 0;
        let clientY = 0;
        if (event.nativeEvent instanceof MouseEvent) {
            clientX = event.nativeEvent.clientX;
            clientY = event.nativeEvent.clientY;
            // When user click with right button the resize is stuck in resizing mode
            // until users clicks again, dont continue if right click is used.
            // HACK: MouseEvent does not have `which` from flow-bin v0.68.
            if (event.nativeEvent.which === 3) {
                return;
            }
        }
        else if (event.nativeEvent instanceof TouchEvent) {
            clientX = event.nativeEvent.touches[0].clientX;
            clientY = event.nativeEvent.touches[0].clientY;
        }
        if (this.props.onResizeStart) {
            if (this.resizable) {
                this.props.onResizeStart(event, direction, this.resizable);
            }
        }
        // Fix #168
        if (this.props.size) {
            if (typeof this.props.size.height !== 'undefined' && this.props.size.height !== this.state.height) {
                this.setState({ height: this.props.size.height });
            }
            if (typeof this.props.size.width !== 'undefined' && this.props.size.width !== this.state.width) {
                this.setState({ width: this.props.size.width });
            }
        }
        // For lockAspectRatio case
        this.ratio =
            typeof this.props.lockAspectRatio === 'number' ? this.props.lockAspectRatio : this.size.width / this.size.height;
        // For boundary
        this.setBoundingClientRect();
        this.setState({
            original: {
                x: clientX,
                y: clientY,
                width: this.size.width,
                height: this.size.height,
            },
            isResizing: true,
            resizeCursor: window.getComputedStyle(event.target).cursor || 'auto',
            direction,
        });
    }
    onMouseMove(event) {
        if (!this.state.isResizing || !this.resizable) {
            return;
        }
        let { maxWidth, maxHeight, minWidth, minHeight } = this.props;
        const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
        const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
        const { direction, original, width, height } = this.state;
        const parentSize = this.getParentSize();
        const max = calculateNewMax(parentSize, maxWidth, maxHeight, minWidth, minHeight);
        maxWidth = max.maxWidth;
        maxHeight = max.maxHeight;
        minWidth = max.minWidth;
        minHeight = max.minHeight;
        // Calculate new size
        let { newHeight, newWidth } = this.calculateNewSizeFromDirection(clientX, clientY);
        // Calculate max size from boundary settings
        const boundaryMax = this.calculateNewMaxFromBoundary(maxWidth, maxHeight);
        // Calculate new size from aspect ratio
        const newSize = this.calculateNewSizeFromAspectRatio(newWidth, newHeight, { width: boundaryMax.maxWidth, height: boundaryMax.maxHeight }, { width: minWidth, height: minHeight });
        newWidth = newSize.newWidth;
        newHeight = newSize.newHeight;
        if (this.props.grid) {
            newWidth = snap(newWidth, this.props.grid[0]);
            newHeight = snap(newHeight, this.props.grid[1]);
        }
        if (this.props.snap && this.props.snap.x) {
            newWidth = findClosestSnap(newWidth, this.props.snap.x);
        }
        if (this.props.snap && this.props.snap.y) {
            newHeight = findClosestSnap(newHeight, this.props.snap.y);
        }
        const delta = {
            width: newWidth - original.width,
            height: newHeight - original.height,
        };
        if (width && typeof width === 'string') {
            if (endsWith(width, '%')) {
                const percent = (newWidth / parentSize.width) * 100;
                newWidth = `${percent}%`;
            }
            else if (endsWith(width, 'vw')) {
                const vw = (newWidth / window.innerWidth) * 100;
                newWidth = `${vw}vw`;
            }
            else if (endsWith(width, 'vh')) {
                const vh = (newWidth / window.innerHeight) * 100;
                newWidth = `${vh}vh`;
            }
        }
        if (height && typeof height === 'string') {
            if (endsWith(height, '%')) {
                const percent = (newHeight / parentSize.height) * 100;
                newHeight = `${percent}%`;
            }
            else if (endsWith(height, 'vw')) {
                const vw = (newHeight / window.innerWidth) * 100;
                newHeight = `${vw}vw`;
            }
            else if (endsWith(height, 'vh')) {
                const vh = (newHeight / window.innerHeight) * 100;
                newHeight = `${vh}vh`;
            }
        }
        this.setState({
            width: this.createSizeForCssProperty(newWidth, 'width'),
            height: this.createSizeForCssProperty(newHeight, 'height'),
        });
        if (this.props.onResize) {
            this.props.onResize(event, direction, this.resizable, delta);
        }
    }
    onMouseUp(event) {
        const { isResizing, direction, original } = this.state;
        if (!isResizing || !this.resizable) {
            return;
        }
        const delta = {
            width: this.size.width - original.width,
            height: this.size.height - original.height,
        };
        if (this.props.onResizeStop) {
            this.props.onResizeStop(event, direction, this.resizable, delta);
        }
        if (this.props.size) {
            this.setState(this.props.size);
        }
        this.setState({ isResizing: false, resizeCursor: 'auto' });
    }
    updateSize(size) {
        this.setState({ width: size.width, height: size.height });
    }
    renderResizer() {
        const { enable, handleStyles, handleClasses, handleWrapperStyle, handleWrapperClass, handleComponent } = this.props;
        if (!enable) {
            return null;
        }
        const resizers = Object.keys(enable).map((key) => {
            let dir = key;
            if (enable[dir] !== false) {
                return (React.createElement(Resizer, { key: dir, direction: Direction[dir], directionKey: dir, onResizeStart: this.onResizeStart, replaceStyles: handleStyles && handleStyles[dir], className: handleClasses && handleClasses[dir] }, handleComponent && handleComponent[dir] ? handleComponent[dir] : null));
            }
            return null;
        });
        // #93 Wrap the resize box in span (will not break 100% width/height)
        return (React.createElement("span", { className: handleWrapperClass, style: handleWrapperStyle }, resizers));
    }
    render() {
        return (React.createElement("div", Object.assign({ ref: c => {
                if (c) {
                    this.resizable = c;
                }
            }, style: {
                position: 'relative',
                userSelect: this.state.isResizing ? 'none' : 'auto',
                ...this.props.style,
                ...this.sizeStyle,
                maxWidth: this.props.maxWidth,
                maxHeight: this.props.maxHeight,
                minWidth: this.props.minWidth,
                minHeight: this.props.minHeight,
                boxSizing: 'border-box',
            }, className: this.props.className }, this.extendsProps),
            this.props.children,
            this.renderResizer()));
    }
}
Resizable.defaultProps = {
    onResizeStart: () => { },
    onResize: () => { },
    onResizeStop: () => { },
    enable: {
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
    },
    style: {},
    grid: [1, 1],
    lockAspectRatio: false,
    lockAspectRatioExtraWidth: 0,
    lockAspectRatioExtraHeight: 0,
    scale: 1,
    resizeRatio: 1,
};
