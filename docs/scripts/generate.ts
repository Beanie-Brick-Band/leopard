import { fromVault } from "fumadocs-obsidian";

await fromVault({
  dir: "vault",
  out: {
    // you can specify the locations of `/public` & `/content/docs` folder
    contentDir: "content/docs",
  },
});
