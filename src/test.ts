import { AsyncMap, AsyncQueue } from "./index.js";

console.log("Started!");

const map = new AsyncMap<number, string>(new AsyncQueue(100));

//cache.put({ id: 23 });
//cache.pause();

//console.log("First");

setTimeout(() => {
    map.set(1, "asd");
}, 100);

setTimeout(() => {
    map.set(1, "jgk");
}, 300);

setTimeout(async () => {
    console.log(await map.get(1));
    //cache.processQueue();
}, 300);

setTimeout(() => {
    process.exit();
}, 1100);

//console.log(await cache.get("23"));