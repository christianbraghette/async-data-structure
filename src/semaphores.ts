import { AtomicInt32, AtomicInteger } from './atomics'

/**
 * Release a previously acquired permit back to the semaphore.
 * 
 * ⚠️ This function is automatically provided by `acquire`.
 */
export type ReleaseFunction = () => void;

/**
 * Semaphore provides a synchronization primitive that controls access
 * to a finite number of resources (permits).
 */
export class Semaphore {
    private readonly count: AtomicInteger;
    private readonly queue = new Array<{ resolve: (release: ReleaseFunction) => void, reject: (reason: 'reset' | 'error') => void }>();

    public constructor(private readonly maxCount: number, count?: AtomicInteger) {
        this.count = count ?? new AtomicInt32(maxCount);
    }

    /**
     * Attempt to acquire the mutex.
     * - If the mutex is available, resolves immediately with a `release` function.
     * - Otherwise, the caller is enqueued until the mutex is released.
     *
     * Overload:
     * - `acquire(): Promise<ReleaseFunction>`
     * - `acquire(callback: (release: ReleaseFunction) => void): void`
     *
     * The returned `release` function **must** be called once the critical
     * section is finished to unblock the next waiting task.
     */
    public acquire(): Promise<ReleaseFunction>
    public acquire(callbackfn: (release: ReleaseFunction) => void): void
    public acquire(callbackfn?: (release: ReleaseFunction) => void): Promise<ReleaseFunction> | void {
        if (callbackfn) {
            this.acquire().then((release) => callbackfn(release)).catch((error) => { throw error; });
            return;
        }
        const old = this.count.sub();
        if (old > 0)
            return Promise.resolve(this.createRelease());
        return new Promise((resolve, reject) => this.queue.push({ resolve, reject }))
    }

    private createRelease(): ReleaseFunction {
        let used = false;
        return (): void => {
            if (!used) return;
            used = true;
            const old = this.count.add();
            if (old < 0)
                this.queue.shift()?.resolve(this.createRelease());
        }
    }

    /**
     * Non-blocking version of acquire.
     * - Returns a `release` function if the mutex was available.
     * - Returns `undefined` if the mutex was already locked.
     *
     * Useful when you want to avoid queuing and only proceed if the lock
     * can be obtained immediately.
     */
    public tryAcquire(): ReleaseFunction | undefined {
        const old = this.count.sub();
        if (old > 0)
            return this.createRelease();
        this.count.add();
        return;
    }

    /**
     * Check if the mutex is currently locked.
     *
     * @returns `true` if the lock is held, `false` otherwise.
     */
    public isLocked(): boolean {
        return this.count.get() < 1;
    };

    /**
     * Returns the number of tasks currently waiting in the queue.
     *
     * Useful for debugging or monitoring contention.
     */
    public waitersCount(): number {
        return this.queue.length;
    }

    /**
     * Forcefully resolves all pending acquisitions with a no-op release function.
     *
     * This effectively unblocks all waiting tasks but does not affect
     * the task that currently holds the lock.
     *
     * Commonly used during shutdown or emergency cleanup.
     */
    public releaseAll(): void {
        while (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next.resolve(() => { });
        }
        this.count.set(this.maxCount);
    }

    /**
     * Forcefully rejects all pending acquisitions with reason `"reset"`,
     * and resets the internal state to unlocked.
     *
     * Useful for aborting all queued tasks when the system is shutting down
     * or recovering from an error.
     */
    public reset() {
        this.queue.forEach(({ reject }) => reject('reset'));
        this.count.set(this.maxCount);
        return;
    }

    /**
     * Execute a function.
     * - Acquires the lock.
     * - Runs the provided function `fn`.
     * - Releases the lock in a `finally` block to ensure it always unlocks.
     *
     * @param fn Async or sync function to execute exclusively.
     * @returns The result of `fn`.
     */
    public async run<T>(fn: () => Promise<T> | T): Promise<T> {
        const release = await this.acquire();
        try {
            return await fn();
        } finally {
            release();
        }
    }

    /**
     * Execute a function exclusively with a timeout.
     * - If the lock is not acquired within the given timeout,
     *   rejects with `Error("Mutex timeout")`.
     * - Otherwise, behaves like `runExclusive`.
     *
     * @param fn Async or sync function to execute exclusively.
     * @param ms Timeout in milliseconds.
     * @returns The result of `fn`.
     */
    public async runWithTimeout<T>(fn: () => Promise<T> | T, ms: number): Promise<T> {
        let timer: NodeJS.Timeout;
        const acquirePromise = this.acquire();

        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Mutex timeout')), ms);
        });

        const release = await Promise.race([acquirePromise, timeoutPromise]) as ReleaseFunction;
        clearTimeout(timer!);

        try {
            return await fn();
        } finally {
            release();
        }
    }

}

/**
 * AsyncMutex provides a synchronization primitive to ensure
 * that only one asynchronous task can enter a critical section at a time.
 */
export class Mutex extends Semaphore {
    public constructor() {
        super(1);
    }
}