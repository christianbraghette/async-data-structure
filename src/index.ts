/*export abstract class WorkerMutex {
    private readonly sem: Int32Array;

    protected constructor(sharedBuffer?: SharedArrayBuffer)
    protected constructor(sharedBuffer: SharedArrayBuffer, index?: number)
    protected constructor(public readonly sharedBuffer: SharedArrayBuffer = new SharedArrayBuffer(4), private readonly index: number = 0) {
        this.sem = new Int32Array(sharedBuffer).fill(1);
    }

    protected acquireSync(): void {
        while (true) {
            if (Atomics.sub(this.sem, this.index, 1) === 1)
                return;
            Atomics.wait(this.sem, this.index, 0);
        }
    }

    protected async acquire(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let old = Atomics.sub(this.sem, this.index, 1);

            if (old > 0) {
                resolve();
                return;
            }

            const result = Atomics.waitAsync(this.sem, this.index, old - 1);
            if (result.async) {
                result.value.then(status => {
                    if (status === "ok") resolve();
                    else reject(new Error("wait failed: " + status));
                });
            } else {
                reject(new Error("wait failed: " + result.value));
            }
        })
    }

    protected release(): void {
        Atomics.add(this.sem, this.index, 1);
        Atomics.notify(this.sem, this.index, 1);
    }

    protected async execute<T>(executor: () => Promise<T> | T) {
        await this.acquire();
        const res = await executor();
        this.release()
        return res;
    }

    protected executeSync<T>(executor: () => T) {
        this.acquireSync();
        const res = executor();
        this.release()
        return res;
    }
}*/

export class AtomicInt implements Atomics {
    private int: Int8Array | Int16Array | Int32Array;

    public constructor(public readonly byteLength: number = 4, initialValue = 0) {
        if (byteLength === 1)
            this.int = new Int8Array(1).fill(initialValue);
        else if (byteLength === 2)
            this.int = new Int16Array(1).fill(initialValue);
        else if (byteLength === 4)
            this.int = new Int32Array(1).fill(initialValue);
        else
            throw new Error("Wrong byteLength");
    }
    add(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    and(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    compareExchange(typedArray: unknown, index: unknown, expectedValue: unknown, replacementValue: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    exchange(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    isLockFree(size: number): boolean {
        throw new Error("Method not implemented.");
    }
    load(typedArray: unknown, index: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    or(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    store(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    sub(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    wait(typedArray: unknown, index: unknown, value: unknown, timeout?: unknown): "ok" | "not-equal" | "timed-out" {
        throw new Error("Method not implemented.");
    }
    notify(typedArray: unknown, index: unknown, count?: unknown): number {
        throw new Error("Method not implemented.");
    }
    xor(typedArray: unknown, index: unknown, value: unknown): number | bigint {
        throw new Error("Method not implemented.");
    }
    pause(n?: number): void {
        throw new Error("Method not implemented.");
    }
    [Symbol.toStringTag]: "object AtomicInt";
}

type ReleaseFn = Function;

export abstract class AsyncMutex {
    private readonly sem = new Int32Array(1).fill(1);
    private readonly queue = new Array<() => void>();

    protected acquire(): Promise<void> {
        const old = Atomics.sub(this.sem, 0, 1);
        if (old > 0)
            return Promise.resolve();
        return new Promise<void>((resolve) => this.queue.push(resolve))
    }

    protected release(): void {
        const old = Atomics.add(this.sem, 0, 1);
        if (old < 0) {
            const next = this.queue.shift()!;
            next();
        }
    }

    protected isLocked() {
        return Atomics.load(this.sem, 0) < 1;
    };

    protected async execute<T>(executor: () => Promise<T> | T): Promise<T> {
        await this.acquire();
        const res = await executor();
        this.release();
        return res;
    }

    protected executeSync(callbackfn: (release: ReleaseFn) => void): void {
        this.acquire().finally(() => {
            let released = false;
            callbackfn(() => {
                this.release();
                released = true;
            })
            if (!released)
                this.release();
        });
        return;
    }

}

export class SafeVar<T> extends AsyncMutex {
    public constructor(private variable: T) {
        super();
    }

    public get(): Promise<T> {
        return this.execute(() => this.variable);
    }

    public set(value: T): Promise<T> {
        return this.execute(() => this.variable = value);
    }
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
    public get [Symbol.toStringTag](): string {
        return "object AsyncMap";
    };

}