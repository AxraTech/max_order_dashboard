// Browser-compatible stub for Node.js 'stream' module.
// xlsx-js-style imports stream but only uses it in Node.js code paths.
// This stub prevents the "stream.Readable" browser error.

export const Readable = class {
  pipe() { return this; }
  on() { return this; }
  resume() { return this; }
  pause() { return this; }
};

export const Writable = class {
  write() { return true; }
  end() {}
  on() { return this; }
};

export const Transform = class {
  pipe() { return this; }
  on() { return this; }
};

export const PassThrough = class {
  pipe() { return this; }
  on() { return this; }
};

export default { Readable, Writable, Transform, PassThrough };
