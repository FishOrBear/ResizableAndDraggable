import * as React from 'react';
import { Enable } from './resizable';
export declare function UpdateStyle(enable?: Enable, catchSize?: number, //可捕捉尺寸
catchinBreak?: number): void;
export declare type DirectionKey = 'top' | 'right' | 'bottom' | 'left' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft';
export declare enum Direction {
    left = 1,
    right = 2,
    top = 4,
    bottom = 8,
    topLeft = 5,
    topRight = 6,
    bottomLeft = 9,
    bottomRight = 10
}
export declare type OnStartCallback = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, dir: Direction) => void;
export interface Props {
    direction: Direction;
    directionKey: DirectionKey;
    className?: string;
    replaceStyles?: React.CSSProperties;
    onResizeStart: OnStartCallback;
    children: React.ReactNode;
}
export declare function Resizer(props: Props): JSX.Element;
