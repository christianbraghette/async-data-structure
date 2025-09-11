export abstract class AtomicNumber {

    protected constructor(private readonly int: Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array, public readonly byteLength: number) { }

    /** Returns the value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public get(): number {
        return Atomics.load(this.int, 0);
    }

    /** Stores a value, returning the new value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public set(value: number): number {
        return Atomics.store(this.int, 0, value);
    }

    /** Adds a value to the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public add(value: number = 1): number {
        return Atomics.add(this.int, 0, value);
    }

    /** Subtracts a value from the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public sub(value: number = 1): number {
        return Atomics.sub(this.int, 0, value);
    }

    /** Stores the bitwise AND of a value with the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public and(value: number): number {
        return Atomics.and(this.int, 0, value);
    }

    /** Stores the bitwise OR of a value with the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public or(value: number): number {
        return Atomics.or(this.int, 0, value);
    }

    /** Stores the bitwise XOR of a value with the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public xor(value: number): number {
        return Atomics.xor(this.int, 0, value);
    }

    /** Replaces the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public exchange(value: number): number {
        return Atomics.exchange(this.int, 0, value);
    }

    /** Replaces the value if the original value equals the given expected value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public compareExchange(expectedValue: number, replacementValue: number): number {
        return Atomics.compareExchange(this.int, 0, expectedValue, replacementValue);
    }

    /** Returns a value indicating whether high-performance algorithms can use atomic operations (true) or must use locks (false) for the given number of bytes-per-element of a typed array. */
    public isLockFree(): boolean {
        return Atomics.isLockFree(this.byteLength);
    }

    /*public wait(value: number, timeout?: number): "ok" | "not-equal" | "timed-out" {
        throw new Error("Method not implemented.");
    }
    public notify(count?: number): number {
        throw new Error("Method not implemented.");
    }*/

    [Symbol.toStringTag] = "object AtomicNumber";
}

export class AtomicInt8 extends AtomicNumber {
    public static readonly MAX = 127;
    public static readonly MIN = -128;

    public constructor(initialValue = 0) {
        super(new Int8Array(1).fill(initialValue), 4);
    }
}

export class AtomicInt16 extends AtomicNumber {
    public static readonly MAX = 32767;
    public static readonly MIN = -32768;

    public constructor(initialValue = 0) {
        super(new Int16Array(1).fill(initialValue), 4);
    }
}

export class AtomicInt32 extends AtomicNumber {
    public static readonly MAX = 2147483647;
    public static readonly MIN = -2147483648;

    public constructor(initialValue = 0) {
        super(new Int32Array(1).fill(initialValue), 4);
    }
}

export class AtomicUint8 extends AtomicNumber {
    public static readonly MAX = 255;
    public static readonly MIN = 0;

    public constructor(initialValue = 0) {
        super(new Uint8Array(1).fill(initialValue), 4);
    }
}

export class AtomicUint16 extends AtomicNumber {
    public static readonly MAX = 65535;
    public static readonly MIN = 0;

    public constructor(initialValue = 0) {
        super(new Uint16Array(1).fill(initialValue), 4);
    }
}

export class AtomicUint32 extends AtomicNumber {
    public static readonly MAX = 4294967295;
    public static readonly MIN = 0;

    public constructor(initialValue = 0) {
        super(new Uint32Array(1).fill(initialValue), 4);
    }
}

type ReleaseFunction = () => void;

export abstract class AsyncMutex {
    private readonly count = new AtomicInt32(1);
    private readonly queue = new Array<() => void>();

    protected acquire(): Promise<void>
    protected acquire(callbackfn: (release: ReleaseFunction) => void): void
    protected acquire(callbackfn?: (release: ReleaseFunction) => void): Promise<void> | void {
        if (callbackfn) {
            this.acquire().then(() => callbackfn(() => this.release())).catch((error) => { throw error; });
            return;
        }
        const old = this.count.sub();
        if (old > 0)
            return Promise.resolve();
        return new Promise<void>((resolve) => this.queue.push(resolve))
    }

    protected release(): void {
        const old = this.count.add();
        if (old < 0) {
            const next = this.queue.shift()!;
            next();
        }
    }

    protected isLocked() {
        return this.count.get() < 1;
    };

    protected async execute<T>(executor: () => Promise<T> | T): Promise<T> {
        await this.acquire();
        const res = await executor();
        this.release();
        return res;
    }

}

export class SafeVar<T> extends AsyncMutex {
    public constructor(private value: T) {
        super();
    }

    public get(): Promise<T> {
        return this.execute(() => this.value);
    }

    public set(value: T): Promise<T> {
        return this.execute(() => this.value = value);
    }

    public setIf(expectedValue: T, replacementValue: T): Promise<T> {
        return this.execute(() => (this.value === expectedValue) ? this.value = replacementValue : this.value);
    }

    public do<S>(executor: (variable: T) => Promise<S> | S): Promise<S> {
        return this.execute(async () => await executor(this.value))
    }
}

export function safeVar<T>(value: T): SafeVar<T>;
export function safeVar<T>(value?: T): SafeVar<T | undefined>;
export function safeVar<T>(value?: T): SafeVar<T | undefined> {
    return new SafeVar(value);
}

interface QueueIteraror<T> extends ArrayIterator<T> { };
interface StackIteraror<T> extends ArrayIterator<T> { };

export class AsyncQueue<T> extends AsyncMutex {
    private readonly array;
    private _length: number;

    public constructor(...items: T[]) {
        super();
        this.array = new Array<T>(...items);
        this._length = this.array.length;
    }

    public async enqueue(...items: T[]): Promise<number> {
        await this.acquire();
        const n = this.array.push(...items);
        this._length += n;
        this.release();
        return n;
    }

    public async dequeue(): Promise<T | undefined> {
        await this.acquire();
        const res = this.array.shift()
        if (res)
            this._length--;
        this.release();
        return res;
    }

    public peek(): Promise<T | undefined> {
        return this.execute(() => this.array[0]);
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

    public get [Symbol.toStringTag](): string {
        return "object AsyncQueue";
    };

}

export class AsyncStack<T> extends AsyncMutex {
    private readonly array;
    private _length: number;

    public constructor(...items: T[]) {
        super();
        this.array = new Array<T>(...items);
        this._length = this.array.length;
    }

    public async push(...items: T[]): Promise<number> {
        await this.acquire();
        const n = this.array.push(...items);
        this._length += n;
        this.release();
        return n;
    }

    public async pop() {
        await this.acquire();
        const res = this.array.pop()
        if (res) this._length--;
        this.release();
        return res;
    }

    public async peek() {
        return this.execute(() => this.array[0]);
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

    public get [Symbol.toStringTag](): string {
        return "object AsyncQueue";
    };

}

export class AsyncMap<K, T> extends AsyncMutex {
    private readonly map;
    private _size;

    public constructor(iterable?: Iterable<readonly [K, T]> | null | undefined) {
        super();
        this.map = new Map<K, T>(iterable);
        this._size = this.map.size;
    }

    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    public async set(key: K, value: T) {
        await this.execute(() => {
            this.map.set(key, value);
            this._size = this.map.size;
        });
        return this;
    }

    /** 
     * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map. 
     * 
     * @returns — Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    public async get(key: K): Promise<T | undefined> {
        return this.execute(() => this.map.get(key));
    }

    /** @returns — boolean indicating whether an element with the specified key exists or not. */
    async has(key: K): Promise<boolean> {
        return this.execute(() => this.map.has(key));
    }

    /** @returns — true if an element in the Map existed and has been removed, or false if the element does not exist. */
    async delete(key: K): Promise<boolean> {
        return this.execute(() => {
            const res = this.map.delete(key);
            this._size = this.map.size;
            return res;
        });
    }

    async clear(): Promise<void> {
        return this.execute(() => {
            this.map.clear();
            this._size = this.map.size;
        });
    }

    /** Executes a provided function once per each key/value pair in the Map, in insertion order. */
    public async forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => Promise<void> | void, thisArg?: any): Promise<void> {
        await this.acquire();
        await Promise.all(Array.from(this.map.entries()).map(async (value) => await callbackfn.call(thisArg, value[1], value[0], this.map)));
        this.release();
    }

    /** Returns an iterable of key, value pairs for every entry in the map. */
    public entries(): MapIterator<[K, T]> {
        return Array.from(this.map.entries()).values();
    }

    /** Returns an iterable of keys in the map. */
    public keys(): MapIterator<K> {
        return Array.from(this.map.keys()).values();
    }

    /** Returns an iterable of values in the map. */
    public values(): MapIterator<T> {
        return Array.from(this.map.values()).values();
    }

    /** @returns — the number of elements in the Map. */
    public get size(): number {
        return this._size;
    };

    public get [Symbol.iterator](): MapIterator<[K, T]> {
        return this.entries();
    }

    /** A String value that is used in the creation of the default string description of an object. Called by the built-in method Object.prototype.toString. */
    [Symbol.toStringTag] = "object AsyncMap";

}