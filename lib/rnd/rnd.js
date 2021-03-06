import * as React from "react";
import Draggable from "react-draggable";
import { Direction } from "../resizable/resizer";
import { Resizable } from "../resizable/resizable";
const resizableStyle = {
    width: "auto",
    height: "auto",
    display: "inline-block",
    position: "absolute",
    top: 0,
    left: 0,
};
export class Rnd extends React.Component {
    constructor(props) {
        super(props);
        this.isResizing = false;
        this.state = {
            original: {
                x: 0,
                y: 0,
            },
            bounds: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            },
            maxWidth: props.maxWidth,
            maxHeight: props.maxHeight,
        };
        this.onResizeStart = this.onResizeStart.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onResizeStop = this.onResizeStop.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.onDragStop = this.onDragStop.bind(this);
        this.getMaxSizesFromProps = this.getMaxSizesFromProps.bind(this);
    }
    ;
    componentDidMount() {
        const { left, top } = this.getOffsetFromParent();
        const { x, y } = this.getDraggablePosition();
        this.draggable.setState({
            x: x - left,
            y: y - top,
        });
        // HACK: Apply position adjustment
        this.forceUpdate();
    }
    // HACK: To get `react-draggable` state x and y.
    getDraggablePosition() {
        const { x, y } = this.draggable.state;
        return { x, y };
    }
    getParent() {
        return this.resizable && this.resizable.parentNode;
    }
    getParentSize() {
        return this.resizable.getParentSize();
    }
    getMaxSizesFromProps() {
        const maxWidth = typeof this.props.maxWidth === "undefined" ? Number.MAX_SAFE_INTEGER : this.props.maxWidth;
        const maxHeight = typeof this.props.maxHeight === "undefined" ? Number.MAX_SAFE_INTEGER : this.props.maxHeight;
        return { maxWidth, maxHeight };
    }
    getSelfElement() {
        return (this.resizable && this.resizable.resizable);
    }
    getOffsetHeight(boundary) {
        const scale = this.props.scale;
        switch (this.props.bounds) {
            case "window":
                return window.innerHeight / scale;
            case "body":
                return document.body.offsetHeight / scale;
            default:
                return boundary.offsetHeight;
        }
    }
    getOffsetWidth(boundary) {
        const scale = this.props.scale;
        switch (this.props.bounds) {
            case "window":
                return window.innerWidth / scale;
            case "body":
                return document.body.offsetWidth / scale;
            default:
                return boundary.offsetWidth;
        }
    }
    onDragStart(e, data) {
        if (this.props.onDragStart) {
            this.props.onDragStart(e, data);
        }
        if (!this.props.bounds)
            return;
        const parent = this.getParent();
        const scale = this.props.scale;
        let boundary;
        if (this.props.bounds === "parent") {
            boundary = parent;
        }
        else if (this.props.bounds === "body") {
            const parentRect = parent.getBoundingClientRect();
            const parentLeft = parentRect.left;
            const parentTop = parentRect.top;
            const bodyRect = document.body.getBoundingClientRect();
            const left = -(parentLeft - parent.offsetLeft * scale - bodyRect.left) / scale;
            const top = -(parentTop - parent.offsetTop * scale - bodyRect.top) / scale;
            const right = (document.body.offsetWidth - this.resizable.size.width * scale) / scale + left;
            const bottom = (document.body.offsetHeight - this.resizable.size.height * scale) / scale + top;
            return this.setState({ bounds: { top, right, bottom, left } });
        }
        else if (this.props.bounds === "window") {
            if (!this.resizable)
                return;
            const parentRect = parent.getBoundingClientRect();
            const parentLeft = parentRect.left;
            const parentTop = parentRect.top;
            const left = -(parentLeft - parent.offsetLeft * scale) / scale;
            const top = -(parentTop - parent.offsetTop * scale) / scale;
            const right = (window.innerWidth - this.resizable.size.width * scale) / scale + left;
            const bottom = (window.innerHeight - this.resizable.size.height * scale) / scale + top;
            return this.setState({ bounds: { top, right, bottom, left } });
        }
        else {
            boundary = document.querySelector(this.props.bounds);
        }
        if (!(boundary instanceof HTMLElement) || !(parent instanceof HTMLElement)) {
            return;
        }
        const boundaryRect = boundary.getBoundingClientRect();
        const boundaryLeft = boundaryRect.left;
        const boundaryTop = boundaryRect.top;
        const parentRect = parent.getBoundingClientRect();
        const parentLeft = parentRect.left;
        const parentTop = parentRect.top;
        const left = (boundaryLeft - parentLeft) / scale;
        const top = boundaryTop - parentTop;
        if (!this.resizable)
            return;
        const offset = this.getOffsetFromParent();
        this.setState({
            bounds: {
                top: top - offset.top,
                right: left + (boundary.offsetWidth - this.resizable.size.width) - offset.left / scale,
                bottom: top + (boundary.offsetHeight - this.resizable.size.height) - offset.top,
                left: left - offset.left / scale,
            },
        });
    }
    onDrag(e, data) {
        if (this.props.onDrag) {
            const offset = this.getOffsetFromParent();
            this.props.onDrag(e, { ...data, x: data.x - offset.left, y: data.y - offset.top });
        }
    }
    onDragStop(e, data) {
        if (this.props.onDragStop) {
            const { left, top } = this.getOffsetFromParent();
            return this.props.onDragStop(e, { ...data, x: data.x + left, y: data.y + top });
        }
    }
    onResizeStart(e, dir, elementRef) {
        e.stopPropagation();
        this.isResizing = true;
        const scale = this.props.scale;
        this.setState({
            original: this.getDraggablePosition(),
        });
        if (this.props.bounds) {
            const parent = this.getParent();
            let boundary;
            if (this.props.bounds === "parent") {
                boundary = parent;
            }
            else if (this.props.bounds === "body") {
                boundary = document.body;
            }
            else if (this.props.bounds === "window") {
                boundary = window;
            }
            else {
                boundary = document.querySelector(this.props.bounds);
            }
            const self = this.getSelfElement();
            if (self instanceof Element &&
                (boundary instanceof HTMLElement || boundary === window) &&
                parent instanceof HTMLElement) {
                let { maxWidth, maxHeight } = this.getMaxSizesFromProps();
                const parentSize = this.getParentSize();
                if (maxWidth && typeof maxWidth === "string") {
                    if (maxWidth.endsWith("%")) {
                        const ratio = Number(maxWidth.replace("%", "")) / 100;
                        maxWidth = parentSize.width * ratio;
                    }
                    else if (maxWidth.endsWith("px")) {
                        maxWidth = Number(maxWidth.replace("px", ""));
                    }
                }
                if (maxHeight && typeof maxHeight === "string") {
                    if (maxHeight.endsWith("%")) {
                        const ratio = Number(maxHeight.replace("%", "")) / 100;
                        maxHeight = parentSize.width * ratio;
                    }
                    else if (maxHeight.endsWith("px")) {
                        maxHeight = Number(maxHeight.replace("px", ""));
                    }
                }
                const selfRect = self.getBoundingClientRect();
                const selfLeft = selfRect.left;
                const selfTop = selfRect.top;
                const boundaryRect = this.props.bounds === "window" ? { left: 0, top: 0 } : boundary.getBoundingClientRect();
                const boundaryLeft = boundaryRect.left;
                const boundaryTop = boundaryRect.top;
                const offsetWidth = this.getOffsetWidth(boundary);
                const offsetHeight = this.getOffsetHeight(boundary);
                const hasLeft = dir & Direction.left;
                const hasRight = dir & Direction.right;
                const hasTop = dir & Direction.top;
                const hasBottom = dir & Direction.bottom;
                if (hasLeft && this.resizable) {
                    const max = (selfLeft - boundaryLeft) / scale + this.resizable.size.width;
                    this.setState({ maxWidth: max > Number(maxWidth) ? maxWidth : max });
                }
                // INFO: To set bounds in `lock aspect ratio with bounds` case. See also that story.
                if (hasRight || (this.props.lockAspectRatio && !hasLeft)) {
                    const max = offsetWidth + (boundaryLeft - selfLeft) / scale;
                    this.setState({ maxWidth: max > Number(maxWidth) ? maxWidth : max });
                }
                if (hasTop && this.resizable) {
                    const max = (selfTop - boundaryTop) / scale + this.resizable.size.height;
                    this.setState({
                        maxHeight: max > Number(maxHeight) ? maxHeight : max,
                    });
                }
                // INFO: To set bounds in `lock aspect ratio with bounds` case. See also that story.
                if (hasBottom || (this.props.lockAspectRatio && !hasTop)) {
                    const max = offsetHeight + (boundaryTop - selfTop) / scale;
                    this.setState({
                        maxHeight: max > Number(maxHeight) ? maxHeight : max,
                    });
                }
            }
        }
        else {
            this.setState({
                maxWidth: this.props.maxWidth,
                maxHeight: this.props.maxHeight,
            });
        }
        if (this.props.onResizeStart) {
            this.props.onResizeStart(e, dir, elementRef);
        }
    }
    onResize(e, direction, elementRef, delta) {
        let x;
        let y;
        const offset = this.getOffsetFromParent();
        if (direction & Direction.left) {
            x = this.state.original.x - delta.width;
            // INFO: If uncontrolled component, apply x position by resize to draggable.
            if (!this.props.position) {
                this.draggable.setState({ x });
            }
            x += offset.left;
        }
        if (direction & Direction.top) {
            y = this.state.original.y - delta.height;
            // INFO: If uncontrolled component, apply y position by resize to draggable.
            if (!this.props.position) {
                this.draggable.setState({ y });
            }
            y += offset.top;
        }
        if (this.props.onResize) {
            if (typeof x === "undefined") {
                x = this.getDraggablePosition().x + offset.left;
            }
            if (typeof y === "undefined") {
                y = this.getDraggablePosition().y + offset.top;
            }
            this.props.onResize(e, direction, elementRef, delta, {
                x,
                y,
            });
        }
    }
    onResizeStop(e, direction, elementRef, delta) {
        this.isResizing = false;
        const { maxWidth, maxHeight } = this.getMaxSizesFromProps();
        this.setState({ maxWidth, maxHeight });
        if (this.props.onResizeStop) {
            const position = this.getDraggablePosition();
            this.props.onResizeStop(e, direction, elementRef, delta, position);
        }
    }
    updateSize(size) {
        if (!this.resizable)
            return;
        this.resizable.updateSize({ width: size.width, height: size.height });
    }
    updatePosition(position) {
        this.draggable.setState(position);
    }
    getOffsetFromParent() {
        const scale = this.props.scale;
        const parent = this.getParent();
        if (!parent) {
            return {
                top: 0,
                left: 0,
            };
        }
        const parentRect = parent.getBoundingClientRect();
        const parentLeft = parentRect.left;
        const parentTop = parentRect.top;
        const selfRect = this.getSelfElement().getBoundingClientRect();
        const position = this.getDraggablePosition();
        return {
            left: selfRect.left - parentLeft - position.x * scale,
            top: selfRect.top - parentTop - position.y * scale,
        };
    }
    render() {
        const { disableDragging, style, dragHandleClassName, position, onMouseDown, dragAxis, dragGrid, bounds, enableUserSelectHack, cancel, children, onResizeStart, onResize, onResizeStop, onDragStart, onDrag, onDragStop, resizeHandleStyles, resizeHandleClasses, enableResizing, resizeGrid, resizeHandleWrapperClass, resizeHandleWrapperStyle, scale, ...resizableProps } = this.props;
        const defaultValue = this.props.default ? { ...this.props.default } : undefined;
        // Remove unknown props, see also https://reactjs.org/warnings/unknown-prop.html
        delete resizableProps.default;
        const cursorStyle = disableDragging || dragHandleClassName ? { cursor: "auto" } : { cursor: "move" };
        const innerStyle = {
            ...resizableStyle,
            ...cursorStyle,
            ...style,
        };
        const { left, top } = this.getOffsetFromParent();
        let draggablePosition;
        if (position) {
            draggablePosition = {
                x: position.x - left,
                y: position.y - top,
            };
        }
        return (React.createElement(Draggable, { ref: (c) => {
                if (c)
                    this.draggable = c;
            }, handle: dragHandleClassName ? `.${dragHandleClassName}` : undefined, defaultPosition: defaultValue, onMouseDown: onMouseDown, onStart: this.onDragStart, onDrag: this.onDrag, onStop: this.onDragStop, axis: dragAxis, disabled: disableDragging, grid: dragGrid, bounds: bounds ? this.state.bounds : undefined, position: draggablePosition, enableUserSelectHack: enableUserSelectHack, cancel: cancel, scale: scale },
            React.createElement(Resizable, Object.assign({}, resizableProps, { ref: c => {
                    if (c)
                        this.resizable = c;
                }, defaultSize: defaultValue, size: this.props.size, catchSize: this.props.resizeCatchSize, catchInbreak: this.props.resizeCatchInbreak, enable: enableResizing, onResizeStart: this.onResizeStart, onResize: this.onResize, onResizeStop: this.onResizeStop, style: innerStyle, minWidth: this.props.minWidth, minHeight: this.props.minHeight, maxWidth: this.isResizing ? this.state.maxWidth : this.props.maxWidth, maxHeight: this.isResizing ? this.state.maxHeight : this.props.maxHeight, grid: resizeGrid, handleWrapperClass: resizeHandleWrapperClass, handleWrapperStyle: resizeHandleWrapperStyle, lockAspectRatio: this.props.lockAspectRatio, lockAspectRatioExtraWidth: this.props.lockAspectRatioExtraWidth, lockAspectRatioExtraHeight: this.props.lockAspectRatioExtraHeight, handleStyles: resizeHandleStyles, handleClasses: resizeHandleClasses, scale: this.props.scale }), children)));
    }
}
Rnd.defaultProps = {
    maxWidth: Number.MAX_SAFE_INTEGER,
    maxHeight: Number.MAX_SAFE_INTEGER,
    scale: 1,
    onResizeStart: () => { },
    onResize: () => { },
    onResizeStop: () => { },
    onDragStart: () => { },
    onDrag: () => { },
    onDragStop: () => { },
};
