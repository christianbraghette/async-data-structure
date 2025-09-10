export abstract class Semaphore {
    private readonly sem = new Int32Array(1).fill(1);

    protected acquire(): void {
        while (true) {
            let n = Atomics.load(this.sem, 0);
            if (n > 0 && Atomics.compareExchange(this.sem, 0, n, n - 1) === n)
                return;
            Atomics.wait(this.sem, 0, 0);
        }
    }

    protected release(): void {
        Atomics.add(this.sem, 0, 1);
        Atomics.notify(this.sem, 0, 1);
    }

    protected execute<T>(executor: () => T) {
        this.acquire();
        const res = executor();
        this.release()
        return res;
    }
}

export abstract class AsyncSemaphore {
    private queue: (() => void)[] = [];
    private value = 1;

    protected async acquire(): Promise<void> {
        if (this.value > 0) {
            this.value--;
            return;
        }
        return new Promise(resolve => this.queue.push(resolve));
    }

    protected release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
        } else {
            this.value++;
        }
    }

    protected async execute<T>(executor: () => Promise<T> | T): Promise<T> {
        await this.acquire();
        try {
            return await executor();
        } finally {
            this.release();
        }
    }
}

interface QueueIteraror<T> extends ArrayIterator<T> { };
interface StackIteraror<T> extends ArrayIterator<T> { };

export class AsyncQueue<T> extends Semaphore {
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
        await this.release();
        return n;
    }

    public async dequeue(): Promise<T | undefined> {
        await this.acquire();
        const res = this.array.shift()
        if (res)
            this._length--;
        await this.release();
        return res;
    }

    public peek(): Promise<T | undefined> {
        return this.executeAsync(() => this.array[0]);
    }

    public values(): ArrayIterator<T> {
        return this.execute(() => Array.from(this.array).values());
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

export class AsyncStack<T> extends Semaphore {
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
        await this.release();
        return n;
    }

    public async pop() {
        await this.acquire();
        const res = this.array.pop()
        if (res) this._length--;
        await this.release();
        return res;
    }

    public async peek() {
        return this.executeAsync(() => this.array[0]);
    }

    public values(): StackIteraror<T> {
        return this.execute(() => Array.from(this.array).values());
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

export class AsyncMap<K, T> extends Semaphore {
    private readonly map;
    private _size;

    public constructor(iterable?: Iterable<readonly [K, T]> | null | undefined) {
        super();
        this.map = new Map<K, T>(iterable);
        this._size = this.map.size;
    }

    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    public async set(key: K, value: T) {
        await this.executeAsync(() => {
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
        return this.executeAsync(() => this.map.get(key));
    }

    /** @returns — boolean indicating whether an element with the specified key exists or not. */
    async has(key: K): Promise<boolean> {
        return this.executeAsync(() => this.map.has(key));
    }

    /** @returns — true if an element in the Map existed and has been removed, or false if the element does not exist. */
    async delete(key: K): Promise<boolean> {
        return this.executeAsync(() => this.map.delete(key));
    }

    async clear(): Promise<void> {
        return this.executeAsync(() => {
            this.map.clear();
            this._size = this.map.size;
        });
    }

    /** Executes a provided function once per each key/value pair in the Map, in insertion order. */
    public async forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => Promise<void> | void, thisArg?: any): Promise<void> {
        await this.acquire();
        await Promise.all(Array.from(this.map.entries()).map(async (value) => await callbackfn.call(thisArg, value[1], value[0], this.map)));
        await this.release();
    }

    /** Returns an iterable of key, value pairs for every entry in the map. */
    public entries(): MapIterator<[K, T]> {
        return this.execute(() => Array.from(this.map.entries()).values());
    }

    /** Returns an iterable of keys in the map. */
    public keys(): MapIterator<K> {
        return this.execute(() => Array.from(this.map.keys()).values());
    }

    /** Returns an iterable of values in the map. */
    public values(): MapIterator<T> {
        return this.execute(() => Array.from(this.map.values()).values());
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