import { AsyncMap, safeVar } from "./index.js";

console.log("Started!");

const x = safeVar(10);

x.get().then(console.log);

const map = new AsyncMap<number, string>();

setTimeout(async () => {
    map.set(1, "asd");
    map.get(1).then(console.log)
    map.set(1, "asdfgsf");
}, 100);


setTimeout(async () => {
    console.log(await map.get(1));
}, 200);

setTimeout(async () => {
    process.exit();
}, 1000);

//console.log(await cache.get("23"));