// @ts-nocheck -- skip type checking
//
import { _runtime } from "fumadocs-mdx/runtime/next";

import * as d_docs_0 from "../content/docs/index.mdx?collection=docs";
import * as d_docs_1 from "../content/docs/leopard-welcome.mdx?collection=docs";
import * as d_docs_2 from "../content/docs/replay/replay-helper.mdx?collection=docs";
import * as _source from "../source.config";

export const docs = _runtime.docs<typeof _source.docs>(
  [
    {
      info: { path: "index.mdx", fullPath: "content/docs/index.mdx" },
      data: d_docs_0,
    },
    {
      info: {
        path: "leopard-welcome.mdx",
        fullPath: "content/docs/leopard-welcome.mdx",
      },
      data: d_docs_1,
    },
    {
      info: {
        path: "replay/replay-helper.mdx",
        fullPath: "content/docs/replay/replay-helper.mdx",
      },
      data: d_docs_2,
    },
  ],
  [],
);
