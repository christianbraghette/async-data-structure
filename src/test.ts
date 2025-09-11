import { AsyncMap } from "./index.js";

console.log("Started!");

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