import * as React from 'react';
import { Enable, EnableAll } from './resizable';

const styles: { [key: string]: React.CSSProperties } = {
    top: {
        width: '100%',
        height: '10px',
        top: '-5px',
        left: '0px',
        cursor: 'row-resize',
    },
    right: {
        width: '10px',
        height: '100%',
        top: '0px',
        right: '-5px',
        cursor: 'col-resize',
    },
    bottom: {
        width: '100%',
        height: '10px',
        bottom: '-5px',
        left: '0px',
        cursor: 'row-resize',
    },
    left: {
        width: '10px',
        height: '100%',
        top: '0px',
        left: '-5px',
        cursor: 'col-resize',
    },
    topRight: {
        width: '20px',
        height: '20px',
        position: 'absolute',
        right: '-10px',
        top: '-10px',
        cursor: 'ne-resize',
    },
    bottomRight: {
        width: '20px',
        height: '20px',
        position: 'absolute',
        right: '-10px',
        bottom: '-10px',
        cursor: 'se-resize',
    },
    bottomLeft: {
        width: '20px',
        height: '20px',
        position: 'absolute',
        left: '-10px',
        bottom: '-10px',
        cursor: 'sw-resize',
    },
    topLeft: {
        width: '20px',
        height: '20px',
        position: 'absolute',
        left: '-10px',
        top: '-10px',
        cursor: 'nw-resize',
    },
};

export function UpdateStyle(
    enable: Enable = EnableAll,
    catchSize: number = 10,    //可捕捉尺寸
    catchinBreak: number = 3   //入侵尺寸
)
{
    let topM = 0, topS = 0;
    let leftM = 0, leftS = 0;
    let rightM = 0, rightS = 0;
    let bottomM = 0, bottomS = 0;

    if (enable.topLeft)
    {
        topM = catchinBreak;
        leftM = catchinBreak;

        topS += catchinBreak;
        leftS += catchinBreak;
    }

    if (enable.bottomLeft)
    {
        bottomM = catchinBreak;

        bottomS += catchinBreak;
        leftS += catchinBreak;
    }

    if (enable.topRight)
    {
        rightM = catchinBreak;

        topS += catchinBreak;
        rightS += catchinBreak;
    }
    if (enable.bottomRight)
    {
        bottomS += catchinBreak;
        rightS += catchinBreak;
    }

    styles.top.left = `${topM}px`;
    styles.top.width = `calc( 100% - ${topS}px)`;

    styles.bottom.left = `${bottomM}px`;
    styles.bottom.width = `calc( 100% - ${bottomS}px)`;

    styles.left.top = `${leftM}px`;
    styles.left.height = `calc( 100% - ${leftS}px)`;

    styles.right.top = `${rightM}px`;
    styles.right.height = `calc( 100% - ${rightS}px)`;

    //尺寸
    styles.top.height = `${catchSize}px`;
    styles.bottom.height = `${catchSize}px`;
    styles.left.width = `${catchSize}px`;
    styles.right.width = `${catchSize}px`;

    //斜边尺寸
    let size2 = catchSize * 1.5;
    let size2px = `${size2}px`;
    styles.topLeft.width = size2px;
    styles.topLeft.height = size2px;

    styles.bottomLeft.width = size2px;
    styles.bottomLeft.height = size2px;

    styles.topRight.width = size2px;
    styles.topRight.height = size2px;

    styles.bottomRight.width = size2px;
    styles.bottomRight.height = size2px;

    //入侵 inBreak
    let offset = `-${catchSize - catchinBreak}px`;
    styles.top.top = offset;
    styles.left.left = offset;
    styles.right.right = offset;
    styles.bottom.bottom = offset;

    offset = `-${size2 - catchinBreak}px`;//斜边
    styles.topLeft.top = offset;
    styles.topLeft.left = offset;

    styles.bottomLeft.left = offset;
    styles.bottomLeft.bottom = offset;

    styles.topRight.top = offset;
    styles.topRight.right = offset;

    styles.bottomRight.bottom = offset;
    styles.bottomRight.right = offset;
}

export type DirectionKey = 'top' | 'right' | 'bottom' | 'left' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft';
export enum Direction
{
    left = 1,
    right = 2,
    top = 4,
    bottom = 8,
    topLeft = 5,
    topRight = 6,
    bottomLeft = 9,
    bottomRight = 10,
}

export type OnStartCallback = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    dir: Direction,
) => void;

export interface Props
{
    direction: Direction;
    directionKey: DirectionKey;
    className?: string;
    replaceStyles?: React.CSSProperties;
    onResizeStart: OnStartCallback;
    children: React.ReactNode;
}

export function Resizer(props: Props)
{
    return (
        <div
            className={props.className || ''}
            style={{
                position: 'absolute',
                userSelect: 'none',
                ...styles[props.directionKey],
                ...(props.replaceStyles || {}),
            }}
            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) =>
            {
                props.onResizeStart(e, props.direction);
            }}
            onTouchStart={(e: React.TouchEvent<HTMLDivElement>) =>
            {
                props.onResizeStart(e, props.direction);
            }}
        >
            {props.children}
        </div>
    );
}
