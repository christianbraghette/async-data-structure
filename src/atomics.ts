export abstract class AtomicNumber {
    declare public readonly MAX: number;
    declare public readonly MIN: number;
    declare public readonly byteLength: number

    public constructor(private readonly int: Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array) { }

    /** Returns the value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public get(): number {
        return Atomics.load(this.int, 0);
    }

    /** Stores a value, returning the new value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public set(value: number): number {
        if (value > this.MAX || value < this.MIN)
            throw new Error("Value out of bound");
        return Atomics.store(this.int, 0, value);
    }

    /** Adds a value to the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public add(value: number = 1): number {
        const old = Atomics.add(this.int, 0, value);
        if (old + value > this.MAX) {
            Atomics.store(this.int, 0, old);
            throw new Error("AtomicNumber out of bound")
        }
        return old;
    }

    /** Subtracts a value from the value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public sub(value: number = 1): number {
        const old = Atomics.sub(this.int, 0, value);
        if (old - value < this.MIN) {
            Atomics.store(this.int, 0, old);
            throw new Error("AtomicNumber out of bound")
        }
        return old;
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
        if (value > this.MAX || value < this.MIN)
            throw new Error("Value out of bound");
        return Atomics.exchange(this.int, 0, value);
    }

    /** Replaces the value if the original value equals the given expected value, returning the original value. Until this atomic operation completes, any other read or write operation against the array will block. */
    public compareExchange(expectedValue: number, replacementValue: number): number {
        if (replacementValue > this.MAX || replacementValue < this.MIN)
            throw new Error("ReplacementValue out of bound");
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

    public toString(): string {
        return `AtomicNumber(${this.get()})`;
    }

    public toJSON(): number {
        return this.get();
    }

    [Symbol.toStringTag] = "object AtomicNumber";
}

export class AtomicInt8 extends AtomicNumber {
    public readonly MAX = 127;
    public readonly MIN = -128;
    public readonly byteLength = 1;

    public constructor(initialValue = 0) {
        super(new Int8Array(1).fill(initialValue));
    }
}

export class AtomicInt16 extends AtomicNumber {
    public readonly MAX = 32767;
    public readonly MIN = -32768;
    public readonly byteLength = 2;

    public constructor(initialValue = 0) {
        super(new Int16Array(1).fill(initialValue));
    }
}

export class AtomicInt32 extends AtomicNumber {
    public readonly MAX = 2147483647;
    public readonly MIN = -2147483648;
    public readonly byteLength = 4;

    public constructor(initialValue = 0) {
        super(new Int32Array(1).fill(initialValue));
    }
}

export class AtomicUint8 extends AtomicNumber {
    public readonly MAX = 255;
    public readonly MIN = 0;
    public readonly byteLength = 1;

    public constructor(initialValue = 0) {
        super(new Uint8Array(1).fill(initialValue));
    }
}

export class AtomicUint16 extends AtomicNumber {
    public readonly MAX = 65535;
    public readonly MIN = 0;
    public readonly byteLength = 2;

    public constructor(initialValue = 0) {
        super(new Uint16Array(1).fill(initialValue));
    }
}

export class AtomicUint32 extends AtomicNumber {
    public readonly MAX = 4294967295;
    public readonly MIN = 0;
    public readonly byteLength = 4;

    public constructor(initialValue = 0) {
        super(new Uint32Array(1).fill(initialValue));
    }
}