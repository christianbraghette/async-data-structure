import { Thread } from "./thread";

console.log(!!globalThis.Worker)

const thread = new Thread(async () => {
    const os = await import('os');
    console.log(os.cpus());
    return "Well";
});

thread.join().then(console.log);