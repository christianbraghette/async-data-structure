"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncMap = exports.AsyncStack = exports.AsyncQueue = void 0;
var AsyncQueue = /** @class */ (function () {
    function AsyncQueue(pollingTime, init) {
        if (init === void 0) { init = true; }
        this.queue = new Array();
        this.pollingTime = 250;
        this.processing = false;
        if (pollingTime)
            if (typeof pollingTime === 'number')
                this.pollingTime = pollingTime;
            else
                this.pollingTime = pollingTime[0];
        if (init)
            this.resume();
    }
    AsyncQueue.prototype.process = function () {
        return __awaiter(this, void 0, void 0, function () {
            var funcArr;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(this.queue.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.dequeue()];
                    case 1:
                        funcArr = _b.sent();
                        if (funcArr)
                            try {
                                funcArr[0]();
                            }
                            catch (error) {
                                funcArr[1](error);
                            }
                        return [3 /*break*/, 0];
                    case 2:
                        this.processing = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    AsyncQueue.prototype.enqueue = function (func, thisArg) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.queue.push([function () { return resolve((function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, func()];
                                    case 1: return [2 /*return*/, _b.sent()];
                                }
                            }); }); }).bind(thisArg)()); }, function (error) { return reject(error); }]);
                    })];
            });
        });
    };
    AsyncQueue.prototype.dequeue = function () {
        return __awaiter(this, arguments, void 0, function (index) {
            var _this = this;
            if (index === void 0) { index = 0; }
            return __generator(this, function (_b) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        resolve(_this.queue[index] ? _this.queue.splice(index, 1)[0] : null);
                    })];
            });
        });
    };
    AsyncQueue.prototype.resume = function () {
        var _this = this;
        if (!this.pollingInterval)
            this.pollingInterval = setInterval(function () {
                if (!_this.processing && _this.queue.length > 0)
                    _this.process();
            }, this.pollingTime);
    };
    AsyncQueue.prototype.pause = function () {
        clearInterval(this.pollingInterval);
    };
    Object.defineProperty(AsyncQueue.prototype, "length", {
        get: function () {
            return this.queue.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AsyncQueue.prototype, "polling", {
        get: function () {
            return this.pollingInterval !== undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(AsyncQueue.prototype, "interval", {
        get: function () {
            return this.pollingTime;
        },
        set: function (value) {
            if (Math.floor(value / 25) > 0) {
                this.pause();
                this.pollingTime = value;
                this.resume();
            }
        },
        enumerable: false,
        configurable: true
    });
    return AsyncQueue;
}());
exports.AsyncQueue = AsyncQueue;
var AsyncStack = /** @class */ (function (_super) {
    __extends(AsyncStack, _super);
    function AsyncStack() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AsyncStack.prototype.dequeue = function () {
        return __awaiter(this, arguments, void 0, function (index) {
            if (index === void 0) { index = this.length - 1; }
            return __generator(this, function (_b) {
                return [2 /*return*/, _super.prototype.dequeue.call(this, index)];
            });
        });
    };
    return AsyncStack;
}(AsyncQueue));
exports.AsyncStack = AsyncStack;
var AsyncMap = /** @class */ (function () {
    function AsyncMap(queue) {
        this.map = new Map();
        /** A String value that is used in the creation of the default string description of an object. Called by the built-in method Object.prototype.toString. */
        this[_a] = "[object AsyncMap]";
        this.queue = queue !== null && queue !== void 0 ? queue : new AsyncQueue();
    }
    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    AsyncMap.prototype.set = function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.queue.enqueue(function () { return _this.map.set(key, value); })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, this];
                }
            });
        });
    };
    /**
     * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map.
     *
     * @returns — Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    AsyncMap.prototype.get = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.queue.enqueue(function () { return _this.map.get(key); })];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    /** @returns — boolean indicating whether an element with the specified key exists or not. */
    AsyncMap.prototype.has = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.queue.enqueue(function () { return _this.has(key); })];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    /** @returns — true if an element in the Map existed and has been removed, or false if the element does not exist. */
    AsyncMap.prototype.delete = function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.queue.enqueue(function () { return _this.delete(key); })];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    AsyncMap.prototype.clear = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                this.queue.enqueue(this.map.clear);
                return [2 /*return*/];
            });
        });
    };
    /** Executes a provided function once per each key/value pair in the Map, in insertion order. */
    AsyncMap.prototype.forEach = function (callbackfn, thisArg) {
        var map = new Map(this.map.entries());
        Array.from(map.entries()).forEach(function (value) {
            (function () { return callbackfn(value[1], value[0], map); }).bind(thisArg)();
        });
    };
    /** Returns an iterable of key, value pairs for every entry in the map. */
    AsyncMap.prototype.entries = function () {
        return this[Symbol.iterator]();
    };
    /** Returns an iterable of keys in the map. */
    AsyncMap.prototype.keys = function () {
        return Array.from(this.map.keys())[Symbol.iterator]();
    };
    /** Returns an iterable of values in the map. */
    AsyncMap.prototype.values = function () {
        throw Array.from(this.map.values())[Symbol.iterator]();
    };
    Object.defineProperty(AsyncMap.prototype, "size", {
        /** @returns — the number of elements in the Map. */
        get: function () {
            return this.map.size;
        },
        enumerable: false,
        configurable: true
    });
    ;
    /** A method that returns the default iterator for an object. Called by the semantics of the for-of statement. */
    AsyncMap.prototype[Symbol.iterator] = function () {
        return Array.from(this.map.entries())[Symbol.iterator]();
    };
    return AsyncMap;
}());
exports.AsyncMap = AsyncMap;
_a = Symbol.toStringTag;
