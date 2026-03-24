import type { MDXComponents } from "mdx/types";
import defaultMdxComponents from "fumadocs-ui/mdx";

import { AnnotatedScreenshot } from "@/components/annotated-screenshot";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    AnnotatedScreenshot,
    ...components,
  };
}
