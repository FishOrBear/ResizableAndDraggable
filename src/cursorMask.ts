

let cursorMask: HTMLElement;
function GetCursorMaskElement()
{
    if (!cursorMask)
    {
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
    return cursorMask;
}

export function UpdateCursorMaskElementDisplay(show: boolean, cursor?: string)
{
    let el = GetCursorMaskElement();
    el.style.display = show ? "block" : "none";
    if (cursor) el.style.cursor = cursor;
}
