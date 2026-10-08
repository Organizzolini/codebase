# 🗜️ Compression

A target's `size` metric is a compressed byte count, and which compressor is
used is stated rather than defaulted. The same two files, three ways.

## Run it

```bash
cd examples/corpus
codometer --config ../compression/gzip.config.ts
codometer --config ../compression/brotli.config.ts
codometer --config ../compression/none.config.ts
```

## What is here

```text
compression/
├── gzip.config.ts     compression: "gzip", level 9
├── brotli.config.ts   compression: "brotli", quality 11
└── none.config.ts     the uncompressed byte count
```

On the Node release this repository pins they measure roughly 2100 bytes
uncompressed, 1040 gzipped, and 840 with brotli — gzip at level 9 and brotli at
quality 11, both stated rather than defaulted.

## Two properties matter more than the numbers

- **Each file is compressed on its own and the results summed** — never all of
  them together as one archive. That is the number a browser pays, file by file
  over the wire, rather than the smaller one a tar of the directory would report
  by finding redundancy across files nobody downloads together.
- **The numbers are not portable.** They depend on the zlib the runtime bundles,
  which is what makes [staleness](../staleness/README.md) a trap rather than a
  footnote.

## Next

[limits](../limits/README.md), for how high a measured metric may go.
