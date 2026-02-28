import { readFileSync } from "node:fs";
import { join } from "node:path";

import YAML from "yaml";

type OpenApiDocument = Record<string, unknown>;

let cachedDocument: OpenApiDocument | null = null;

function cloneDocument<T extends object>(document: T): T {
  return JSON.parse(JSON.stringify(document)) as T;
}

export function loadOpenApiDocument(): OpenApiDocument {
  if (cachedDocument) {
    return cloneDocument(cachedDocument);
  }

  const filePath = join(__dirname, "openapi.yaml");
  const fileContent = readFileSync(filePath, "utf-8");
  cachedDocument = YAML.parse(fileContent) as OpenApiDocument;
  return cloneDocument(cachedDocument);
}
