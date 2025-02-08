type AsyncQueueKey = keyof Array<[() => void, (error: any) => void]>;

export class AsyncQueue {
    private readonly queue = new Array<[() => void, (error: any) => void]>();
    private pollingTime: number = 250;
    private pollingInterval?: NodeJS.Timeout;
    private processing: boolean = false;

    constructor(pollingTime?: number | [number, number], init: boolean = true) {
        if (pollingTime)
            if (typeof pollingTime === 'number')
                this.pollingTime = pollingTime;
            else
                this.pollingTime = pollingTime[0];
        if (init)
            this.resume();
    }

    async process(): Promise<void> {
        while (this.queue.length > 0) {
            const funcArr = await this.dequeue();
            if (funcArr)
                try {
                    funcArr[0]();
                } catch (error) {
                    funcArr[1](error);
                }
        }
        this.processing = false;
    }

    async enqueue<T>(func: () => Promise<T> | T, thisArg?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.queue.push([() => resolve((async () => await func()).bind(thisArg)()), (error) => reject(error)]);
        })
    }

    async dequeue(index: AsyncQueueKey = 0): Promise<([() => void, (error: any) => void]) | null> {
        return new Promise((resolve, reject) => {
            resolve(this.queue[index] ? this.queue.splice(index as number, 1)[0] : null);
        })
    }

    resume(): void {
        if (!this.pollingInterval)
            this.pollingInterval = setInterval(() => {
                if (!this.processing && this.queue.length > 0)
                    this.process();
            }, this.pollingTime);
    }

    pause(): void {
        clearInterval(this.pollingInterval);
    }

    get length(): number {
        return this.queue.length;
    }

    get polling(): boolean {
        return this.pollingInterval !== undefined;
    }

    get interval(): number {
        return this.pollingTime;
    }

    set interval(value: number) {
        if (Math.floor(value / 25) > 0) {
            this.pause();
            this.pollingTime = value;
            this.resume();
        }
    }
}

export class AsyncStack extends AsyncQueue {

    async dequeue(index: AsyncQueueKey = this.length - 1): Promise<([() => void, (error: any) => void]) | null> {
        return super.dequeue(index);
    }
}

export class AsyncMap<K = any, T = any> {
    private readonly map = new Map<K, T>();
    private readonly queue: AsyncQueue;

    constructor(queue?: AsyncQueue) {
        this.queue = queue ?? new AsyncQueue();
    }

    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    async set(key: K, value: T) {
        await this.queue.enqueue(() => this.map.set(key, value));
        return this;
    }

    /** 
     * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map. 
     * 
     * @returns — Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    async get(key: K): Promise<T | undefined> {
        return await this.queue.enqueue(() => this.map.get(key));
    }

    /** @returns — boolean indicating whether an element with the specified key exists or not. */
    async has(key: K): Promise<boolean> {
        return await this.queue.enqueue(() => this.has(key));
    }

    /** @returns — true if an element in the Map existed and has been removed, or false if the element does not exist. */
    async delete(key: K): Promise<boolean> {
        return await this.queue.enqueue(() => this.delete(key));
    }

    async clear(): Promise<void> {
        this.queue.enqueue(this.map.clear);
    }

    /** Executes a provided function once per each key/value pair in the Map, in insertion order. */
    forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => void, thisArg?: any): void {
        const map = new Map(this.map.entries());
        Array.from(map.entries()).forEach((value) => {
            (() => callbackfn(value[1], value[0], map)).bind(thisArg)();
        })
    }

    /** Returns an iterable of key, value pairs for every entry in the map. */
    entries(): MapIterator<[K, T]> {
        return this[Symbol.iterator]();
    }

    /** Returns an iterable of keys in the map. */
    keys(): MapIterator<K> {
        return Array.from(this.map.keys())[Symbol.iterator]();
    }

    /** Returns an iterable of values in the map. */
    values(): MapIterator<T> {
        throw Array.from(this.map.values())[Symbol.iterator]();
    }

    /** @returns — the number of elements in the Map. */
    get size(): number {
        return this.map.size;
    };

    /** A method that returns the default iterator for an object. Called by the semantics of the for-of statement. */
    [Symbol.iterator](): MapIterator<[K, T]> {
        return Array.from(this.map.entries())[Symbol.iterator]();
    }

    /** A String value that is used in the creation of the default string description of an object. Called by the built-in method Object.prototype.toString. */
    [Symbol.toStringTag]: string = "[object AsyncMap]";

}