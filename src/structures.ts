import { Mutex } from './semaphores'

export class SafeVar<T> {
    private mutex = new Mutex();

    public constructor(private value: T) { }

    public get(): Promise<T> {
        return this.mutex.run(() => this.value);
    }

    public set(value: T): Promise<void> {
        return this.mutex.run(() => { this.value = value });
    }

    public setIf(expectedValue: T, replacementValue: T): Promise<T> {
        return this.mutex.run(() => (this.value === expectedValue) ? this.value = replacementValue : this.value);
    }

    public do<S>(fn: (variable: T) => Promise<S> | S): Promise<S> {
        return this.mutex.run(async () => await fn(this.value))
    }
}

export function safeVar<T>(value: T): SafeVar<T>;
export function safeVar<T>(value?: T): SafeVar<T | undefined>;
export function safeVar<T>(value?: T): SafeVar<T | undefined> {
    return new SafeVar(value);
}

interface QueueIteraror<T> extends ArrayIterator<T> { };
interface StackIteraror<T> extends ArrayIterator<T> { };

export class AsyncQueue<T> {
    private mutex = new Mutex();
    private readonly array;
    private _length: number;

    public constructor(...items: T[]) {
        this.array = new Array<T>(...items);
        this._length = this.array.length;
    }

    public async enqueue(...items: T[]): Promise<number> {
        const release = await this.mutex.acquire();
        const n = this.array.push(...items);
        this._length += n;
        release();
        return n;
    }

    public async dequeue(): Promise<T | undefined> {
        const release = await this.mutex.acquire();
        const res = this.array.shift()
        if (res)
            this._length--;
        release();
        return res;
    }

    public peek(): Promise<T | undefined> {
        return this.mutex.run(() => this.array[0]);
    }

    public values(): ArrayIterator<T> {
        return Array.from(this.array).values();
    }

    public get [Symbol.iterator](): QueueIteraror<T> {
        return this.values();
    }

    public get length(): number {
        return this._length;
    };

    [Symbol.toStringTag] = "object AsyncQueue";

}

export class AsyncStack<T> {
    private mutex = new Mutex();
    private readonly array;
    private _length: number;

    public constructor(...items: T[]) {
        this.array = new Array<T>(...items);
        this._length = this.array.length;
    }

    public async push(...items: T[]): Promise<number> {
        const release = await this.mutex.acquire();
        const n = this.array.push(...items);
        this._length += n;
        release();
        return n;
    }

    public async pop() {
        const release = await this.mutex.acquire();
        const res = this.array.pop()
        if (res) this._length--;
        release();
        return res;
    }

    public async peek() {
        return this.mutex.run(() => this.array[0]);
    }

    public values(): StackIteraror<T> {
        return Array.from(this.array).values();
    }

    public get [Symbol.iterator](): StackIteraror<T> {
        return this.values();
    }

    public get length(): number {
        return this._length;
    };

    [Symbol.toStringTag] = "object AsyncQueue";

}

export class AsyncMap<K, T> {
    private readonly mutex = new Mutex();
    private readonly map: Map<K, T>;
    private _size: number;

    public constructor(iterable?: Iterable<readonly [K, T]> | null | undefined) {
        this.map = new Map<K, T>(iterable);
        this._size = this.map.size;
    }

    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    public set(key: K, value: T): this {
        this.mutex.run(() => {
            this.map.set(key, value);
            this._size = this.map.size;
        });
        return this;
    }

    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    public setAwaited(key: K, value: T): Promise<void> {
        return this.mutex.run(() => {
            this.map.set(key, value);
            this._size = this.map.size;
        });
    }

    /** 
     * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map. 
     * 
     * @returns — Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    public get(key: K): Promise<T | undefined> {
        return this.mutex.run(() => this.map.get(key));
    }

    /** @returns — boolean indicating whether an element with the specified key exists or not. */
    async has(key: K): Promise<boolean> {
        return this.mutex.run(() => this.map.has(key));
    }

    /** @returns — true if an element in the Map existed and has been removed, or false if the element does not exist. */
    async delete(key: K): Promise<boolean> {
        return this.mutex.run(() => {
            const res = this.map.delete(key);
            this._size = this.map.size;
            return res;
        });
    }

    async clear(): Promise<void> {
        return this.mutex.run(() => {
            this.map.clear();
            this._size = this.map.size;
        });
    }

    /** Executes a provided function once per each key/value pair in the Map, in insertion order. */
    public async forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => Promise<void> | void, thisArg?: any): Promise<void> {
        const release = await this.mutex.acquire();
        for (const [key, value] of Array.from(this.map.entries()))
            await callbackfn.call(thisArg, value, key, this.map);
        release();
    }

    /** Returns an iterable of key, value pairs for every entry in the map. */
    public entries(): Promise<MapIterator<[K, T]>> {
        return this.mutex.run(() => Array.from(this.map.entries()).values());
    }

    /** Returns an iterable of keys in the map. */
    public keys(): Promise<MapIterator<K>> {
        return this.mutex.run(() => Array.from(this.map.keys()).values());
    }

    /** Returns an iterable of values in the map. */
    public values(): Promise<MapIterator<T>> {
        return this.mutex.run(() => Array.from(this.map.values()).values());
    }

    /** @returns — the number of elements in the Map. */
    public get size(): number {
        return this._size;
    };

    public get [Symbol.iterator](): MapIterator<[K, T]> {
        return this.map.entries();
    }

    async *[Symbol.asyncIterator]() {
        const entries = await this.entries();
        for (const entry of entries) {
            yield entry;
        }
    }

    /** A String value that is used in the creation of the default string description of an object. Called by the built-in method Object.prototype.toString. */
    [Symbol.toStringTag] = "object AsyncMap";
}