type AsyncQueueKey = keyof Array<[() => void, (error: any) => void]>;
export declare class AsyncQueue {
    private readonly queue;
    private pollingTime;
    private pollingInterval?;
    private processing;
    constructor(pollingTime?: number | [number, number], init?: boolean);
    process(): Promise<void>;
    enqueue<T>(func: () => Promise<T> | T, thisArg?: any): Promise<any>;
    dequeue(index?: AsyncQueueKey): Promise<([() => void, (error: any) => void]) | null>;
    resume(): void;
    pause(): void;
    get length(): number;
    get polling(): boolean;
    get interval(): number;
    set interval(value: number);
}
export declare class AsyncStack extends AsyncQueue {
    dequeue(index?: AsyncQueueKey): Promise<([() => void, (error: any) => void]) | null>;
}
export declare class AsyncMap<K = any, T = any> {
    private readonly map;
    private readonly queue;
    constructor(queue?: AsyncQueue);
    /** Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated. */
    set(key: K, value: T): Promise<this>;
    /**
     * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map.
     *
     * @returns — Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    get(key: K): Promise<T | undefined>;
    /** @returns — boolean indicating whether an element with the specified key exists or not. */
    has(key: K): Promise<boolean>;
    /** @returns — true if an element in the Map existed and has been removed, or false if the element does not exist. */
    delete(key: K): Promise<boolean>;
    clear(): Promise<void>;
    /** Executes a provided function once per each key/value pair in the Map, in insertion order. */
    forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => void, thisArg?: any): void;
    /** Returns an iterable of key, value pairs for every entry in the map. */
    entries(): MapIterator<[K, T]>;
    /** Returns an iterable of keys in the map. */
    keys(): MapIterator<K>;
    /** Returns an iterable of values in the map. */
    values(): MapIterator<T>;
    /** @returns — the number of elements in the Map. */
    get size(): number;
    /** A method that returns the default iterator for an object. Called by the semantics of the for-of statement. */
    [Symbol.iterator](): MapIterator<[K, T]>;
    /** A String value that is used in the creation of the default string description of an object. Called by the built-in method Object.prototype.toString. */
    [Symbol.toStringTag]: string;
}
export {};
