const fs = require("fs");
const path = require("path");
const nanoid = require("nanoid");

const markdown = require("./markdown");

const BUCKETS_FILE = "buckets.md";
const ERROR_FILE = "errors.md";
const UNKNOWN = "(unknown)";

const createOutputFile = (path, title) => {
  const handle = fs.createWriteStream(path, { flags: "w" });
  handle.write(markdown.toHeader(title));
};

const writeFlowContents = (handle, contents = {}) => {
  if (contents.processors) {
    handle.write(markdown.toHeader("Processors", 2));
    for (const processor of contents.processors) {
      handle.write(markdown.toHeader(processor.name, 3));
      handle.write(markdown.toBlockquote(processor.comments));
      handle.write(
        markdown.toBold(`${processor.bundle} &mdash; ${processor.type}`)
      );
      handle.write("\n\n");
      writeProperties(handle, processor.properties);
    }
  }
};

const writeProperties = (handle, properties) => {
  if (properties) {
    handle.write(markdown.toHeader("Properties", 4));
    handle.write(markdown.toTableHeader(["Name", "Value"]));
    for (const prop in properties) {
      handle.write(
        markdown.toTableRow([prop, markdown.toInlineCode(properties[prop])])
      );
    }
    handle.write("\n");
  }
};

exports.createOutput = (target, overwrite) => {
  const out = path.resolve(target);

  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

  if (!overwrite && fs.readdirSync(out).length)
    throw `output directory '${out}' not empty`;

  return {
    path: out,
    errorHandle: createOutputFile(path.resolve(out, ERROR_FILE), "Errors"),
    bucketsHandle: createOutputFile(path.resolve(out, BUCKETS_FILE), "Buckets"),
    writeBucket: function (bucket, flowFiles) {
      if (bucket) {
        const handle = fs.createWriteStream(
          path.resolve(this.path, BUCKETS_FILE),
          {
            flags: "a",
          }
        );
        handle.write(markdown.toHeader(`Bucket ${bucket.name}`, 2));
        handle.write(markdown.toItalic(bucket.bucketId));
        handle.write("\n");
        handle.write(markdown.toHeader("Flows", 2));
        const list = [];
        for (const flow of flowFiles || []) {
          list.push(`${markdown.toLink(flow.name, flow.fileName)}\n`);
        }
        handle.write(markdown.toList(list));
      }
    },
    writeErrors: function (type, id, errors) {
      const handle = fs.createWriteStream(path.resolve(this.path, ERROR_FILE), {
        flags: "a",
      });
      handle.write(markdown.toHeader(`${type} ${id || "unknown"}`, 2));
      for (const field in errors) {
        handle.write(markdown.toHeader(field, 3));
        handle.write(markdown.toList(errors[field]));
      }
    },
    writeFlow: function (flow) {
      if (flow) {
        const id = flow.id || nanoid.nanoid();
        const fileName = `flow-${id}.md`;
        const name = flow.name || UNKNOWN;
        const handle = fs.createWriteStream(path.resolve(this.path, fileName), {
          flags: "w",
        });
        handle.write(markdown.toHeader(`Flow ${name}`));
        handle.write(markdown.toBlockquote(flow.description || UNKNOWN));
        handle.write(
          markdown.toItalic(
            `Version ${flow.version || UNKNOWN}: ${flow.comments || UNKNOWN}`
          )
        );
        handle.write("\n\n");
        writeFlowContents(handle, flow.contents);

        return { fileName, name };
      }
    },
  };
};