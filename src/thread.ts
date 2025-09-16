import { Worker } from 'worker_threads'

type ThreadMessage<T = any> = {
    type: 'message' | 'exit',
    value: T
}

export class ThreadExit<T = void> {
    constructor(public readonly value?: T) { }

    public toJSON(): ThreadMessage<T> {
        return {
            type: 'exit',
            value: this.value as T
        }
    }
}

//const obj = JSON.parse(JSON.stringify(ThreadExit.toString()))
//console.log(obj);

/*function extractBody(fn: Function): string {
    let str = fn.toString().trim();

    if (str.includes("=>") && !str.includes("{")) {
        str = str.split("=>")[1].trim()
    }

    const bodyMatch = str.match(/{([\s\S]*)}/);
    if (bodyMatch) {
        return bodyMatch[1].trim();
    }

    throw new Error("Formato funzione non riconosciuto");
}*/

/** Code written with dinamic import */
export type ThreadCode<T = void> = (port: MessagePort) => T;

type ThreadEventType = 'messageerror' | 'message' | 'exit' | 'error';

class ThreadTarget extends EventTarget {
    addEventListener(
        type: 'messageerror' | 'message' | 'exit',
        callback: (event: MessageEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: 'error',
        callback: (event: ErrorEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: ThreadEventType,
        callback: (event: Event) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: ThreadEventType,
        callback: EventListenerOrEventListenerObject | null | ((event: MessageEvent) => void) | ((event: ErrorEvent) => void),
        options?: boolean | AddEventListenerOptions
    ): void {
        super.addEventListener(type, callback as any, options);
    }

    removeEventListener(
        type: 'messageerror' | 'message' | 'exit',
        callback: (event: MessageEvent) => void,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        type: 'error',
        callback: (event: ErrorEvent) => void,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        type: ThreadEventType,
        callback: (event: Event) => void,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        type: ThreadEventType,
        callback: EventListenerOrEventListenerObject | null | ((event: MessageEvent) => void) | ((event: ErrorEvent) => void),
        options?: boolean | EventListenerOptions
    ): void {
        super.removeEventListener(type, callback as any, options);
    }
}

export class Thread extends Worker {
    private _status: 'running' | 'error' | 'exited' | 'stopped' = 'running';
    private _exitCode?: any;

    constructor(fn: ThreadCode, options?: WorkerOptions) {
        const webWorker = `Promise.all([eval('${fn.toString()}')()]).then(([value]) => postMessage(new ThreadExit(value)));`;
        const url = URL.createObjectURL(new Blob([webWorker], { type: "application/javascript" }));
        super(url, options);

        this.addListener('error', (error) => {
            this._status = 'error';
            this._exitCode = error;
        });

        this.addListener('exit', (code) => {
            this._status = 'exited';
            this._exitCode = code;
        });
    }

    public get status() {
        return this._status;
    }

    public get exitCode() {
        return this._exitCode;
    }

    public async join<T>(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.addListener('exit', (event) => resolve(event.data.value));
            this.worker.addEventListener('error', reject);
        })
    }

    public joinSync<T>(): T {
        while (this._status === 'exited');
        return this._exitCode;
    }


    get onerror(): ((this: AbstractWorker, ev: ErrorEvent) => any) | null {
        return this.worker.onerror;
    };
    set onerror(handler: (this: AbstractWorker, ev: ErrorEvent) => any) {
        this.worker.onerror = handler;
    };

    get onmessage(): ((this: Worker, ev: MessageEvent) => any) | null {
        return this.worker.onmessage;
    };
    set onmessage(handler: (this: Worker, ev: MessageEvent) => any) {
        this.worker.onmessage = handler;
    };

    get onmessageerror(): ((this: Worker, ev: MessageEvent) => any) | null {
        return this.worker.onmessage;
    };
    set onmessageerror(handler: (this: Worker, ev: MessageEvent) => any) {
        if (this.worker)
            this.worker.onmessage = (event: MessageEvent<ThreadMessage>) => {
                if (event.data.type === 'message')
                    handler.call(this.worker, event);
            };
    };

}

/*export class Thread extends ThreadTarget implements Worker {
    private _status: 'running' | 'error' | 'exited' | 'stopped' = 'running';
    private _exitValue?: any;
    private readonly worker: Worker;

    constructor(fn: ThreadCode, private readonly options?: WorkerOptions) {
        super();
        const webWorker = `Promise.all([eval('${fn.toString()}')()]).then(([value]) => postMessage(new ThreadExit(value)));`;
        const url = URL.createObjectURL(new Blob([webWorker], { type: "application/javascript" }));
        this.worker = new Worker(url, this.options);

        this.worker.addEventListener('error', (event) => {
            this._status = 'error';
            this.dispatchEvent(event);
        });

        this.worker.addEventListener('messageerror', (event) => {
            this.dispatchEvent(event)
        });

        this.worker.addEventListener('message', (event: MessageEvent<ThreadMessage>) => {
            if (event.data.type === 'exit') {
                this._status = 'exited';
                this._exitValue = event.data.value;
                this.dispatchEvent(new MessageEvent<any>('exit', Object.assign({}, event, { data: event.data.value, ports: undefined })));
            } else if (event.data.type === 'message')
                this.dispatchEvent(new MessageEvent<any>('message', Object.assign({}, event, { data: event.data.value, ports: undefined })));
            else
                this.dispatchEvent(new MessageEvent<any>('messageerror'));
        });
    }

    public postMessage(message: any, transfer: Transferable[]): void
    public postMessage(message: any, options?: StructuredSerializeOptions): void
    public postMessage(message: any, opt: any): void {
        this.worker.postMessage(message, opt)
    }

    public get status() {
        return this._status;
    }

    public get exitValue() {
        return this._exitValue;
    }

    public async join<T>(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.addEventListener('exit', (event) => resolve(event.data.value));
            this.worker.addEventListener('error', reject);
        })
    }

    public joinSync<T>(): T {
        while (this._status === 'exited');
        return this._exitValue;
    }

    public terminate(): void {
        this._status = 'stopped';
        this.worker.terminate();
    }


    get onerror(): ((this: AbstractWorker, ev: ErrorEvent) => any) | null {
        return this.worker.onerror;
    };
    set onerror(handler: (this: AbstractWorker, ev: ErrorEvent) => any) {
        this.worker.onerror = handler;
    };

    get onmessage(): ((this: Worker, ev: MessageEvent) => any) | null {
        return this.worker.onmessage;
    };
    set onmessage(handler: (this: Worker, ev: MessageEvent) => any) {
        this.worker.onmessage = handler;
    };

    get onmessageerror(): ((this: Worker, ev: MessageEvent) => any) | null {
        return this.worker.onmessage;
    };
    set onmessageerror(handler: (this: Worker, ev: MessageEvent) => any) {
        if (this.worker)
            this.worker.onmessage = (event: MessageEvent<ThreadMessage>) => {
                if (event.data.type === 'message')
                    handler.call(this.worker, event);
            };
    };

}*/

export class ThreadManager { }