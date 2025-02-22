import { Bench } from "tinybench";
import { IncomingMessage, ServerResponse } from "./http.js";
import { buildRemixHandler } from "./remix.js";
import { buildNextHandler, buildNextPagesHandler } from "./next.js";
import { buildNuxtHandler } from "./nuxt.js";
import { buildSveltekitHandler } from "./svelte.js";
import { buildAstroHandler } from "./astro.js";
import { buildAstroSolidHandler } from "./astro-solid.js";
import http from "node:http";
import { getDuplicationFactor, logResultsTable } from "./result-format.js";

async function run(handler, collect = false) {
  const request = new IncomingMessage();
  const response = new ServerResponse(request, collect);

  handler(request, response);

  await response.await;
  return response;
}

async function runHandlers(handlers) {
  const bench = new Bench({
    time: 10_000,
    setup: async (task, mode) => {
      if (mode == "run") console.log(`Running ${task.name} benchmark...`);
      if (mode == "warmup" && typeof globalThis.gc !== "undefined") {
        globalThis.gc();
      }
    },
  });

  for (let handler of handlers) {
    bench.add(handler.name, async () => {
      await run(handler.handler);
    });
  }

  await bench.run();

  for (let handler of handlers) {
    let response = await run(handler.handler, true);
    const taskResult = bench.getTask(handler.name);

    taskResult.result = {
      ...taskResult.result,
      bodyLength: response.length,
      duplicationFactor: getDuplicationFactor(response.body),
    };
  }

  logResultsTable(bench);
}

const handlers = [
  {
    name: "react",
    handler: await import("react-benchmark").then((x) => x.buildHandler()),
  },
  {
    name: "vue",
    group: "renderers",
    handler: await import("vue-benchmark").then((x) => x.buildHandler()),
  },
  // {
  //   name: "mfng",
  //   group: "frameworks",
  //   handler: await import("mfng-benchmark").then((x) => x.buildHandler()),
  // },
  { name: "remix", group: "frameworks", handler: await buildRemixHandler() },
  { name: "next", group: "frameworks", handler: await buildNextHandler() },
  {
    name: "next-pages",
    group: "frameworks",
    handler: await buildNextPagesHandler(),
  },
  { name: "nuxt", group: "frameworks", handler: await buildNuxtHandler() },
  {
    name: "sveltekit",
    group: "frameworks",
    handler: await buildSveltekitHandler(),
  },
  { name: "astro", group: "frameworks", handler: await buildAstroHandler() },
  { name: "astro-solid", group: "frameworks", handler: await buildAstroSolidHandler() },
  // {
  //   name: "hono",
  //   group: "frameworks",
  //   handler: await import("hono-benchmark").then((x) => x.buildHandler()),
  // },
  {
    name: "marko",
    group: "renderers",
    handler: await import("marko-benchmark").then((x) => x.buildHandler()),
  },
  {
    name: "kita",
    group: "renderers",
    handler: await import("kita-benchmark").then((x) => x.handler),
  },
  // {
  //   name: "qwik",
  //   group: "renderers",
  //   handler: await import("qwik-benchmark-new").then((x) => x.handler),
  // },
  // {
  //   name: "qwik-city",
  //   group: "frameworks",
  //   handler: await import("qwik-city-benchmark").then((x) => x.handler),
  // },
  {
    name: "solid",
    group: "renderers",
    handler: await import("solid-benchmark").then((x) => x.buildHandler()),
  },
];

console.log("Benchmarking frameworks");
await runHandlers(handlers.filter((x) => !x.group || x.group == "frameworks"));

console.log("Benchmarking renderers");
await runHandlers(handlers.filter((x) => !x.group || x.group == "renderers"));

console.log("Check out the actual render results:");

for (let handler of handlers) {
  console.log(handler.name, `http://localhost:8080/${handler.name}`);
}

http
  .createServer(async function (req, res) {
    const handler = handlers.find((x) => "/" + x.name == req.url);

    if (handler) {
      req.url = "/";
      handler.handler(req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(8080);
