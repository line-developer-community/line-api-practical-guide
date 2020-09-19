/**
このコードは下記から持ってきました。
https://github.com/nkjm/line-pay/blob/v3/module/line-pay-error.js
*/
"use strict";

class LinePayError extends Error {
    constructor(e){
        if (typeof e === "object" && e.returnCode){
            super(e.returnMessage);
            this.name = "LinePayError";
            this.returnMessage = e.returnMessage;
            this.returnCode = e.returnCode;
        } else {
            super(e);
        }
    }
}

module.exports = LinePayError;