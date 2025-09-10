import { AsyncMap } from "./index.js";

console.log("Started!");

const map = new AsyncMap<number, string>();

setTimeout(() => {
    map.set(1, "asd");
}, 100);

setTimeout(() => {
    map.set(1, "jgk");
}, 300);

setTimeout(async () => {
    console.log(await map.get(1));
}, 200);

setTimeout(async () => {
    console.log(await map.get(1));
}, 300);

setTimeout(async () => {
    for await (const el of await map.entries())
        console.log(el);
    process.exit();
}, 1100);

//console.log(await cache.get("23"));