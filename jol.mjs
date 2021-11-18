/* Public Classes */

export function Null() {}
Null.prototype = Object.create(null)

export class Arr extends Array {
  // deno-lint-ignore constructor-super
  constructor(val) {
    reqArgLen(arguments.length, 0, 1)

    if (isNum(val)) {
      super(val)
    }
    else {
      super()
      if (isSome(val)) this.push(...val)
    }
  }
}

export class ClsArr extends Arr {
  get cls() {return Object}

  push(...vals)    {vals.forEach(this.pushOne, this);    return this}
  unshift(...vals) {vals.forEach(this.unshiftOne, this); return this}
  pushOne(val)     {super.push(inst(val, this.cls));     return this}
  unshiftOne(val)  {super.unshift(inst(val, this.cls));  return this}
}

export class Dict extends Map {
  constructor(val) {
    super(isDict(val) ? dictIter(val) : val)
  }

  set(key, val) {
    req(key, isString)
    return super.set(key, val)
  }

  patch(val) {
    if (isDict(val)) each(val, selfSet, this)
    else if (isSome(val)) val.forEach(selfSet, this)
    return this
  }

  toJSON() {
    const buf = {}
    this.forEach(selfAssign, buf)
    return buf
  }

  get [Symbol.toStringTag]() {return this.constructor.name}
}

export class ClsDict extends Dict {
  get cls() {return Object}
  set(key, val) {return super.set(key, inst(val, this.cls))}
}

export class ClsMap extends Map {
  set(key, val) {return super.set(key, inst(val, this.cls))}
  get cls() {return Object}
  get [Symbol.toStringTag]() {return this.constructor.name}
}

export class EqDict {
  constructor(val) {if (isSome(val)) assign(this, val)}

  has(key) {return this.hasRaw(toKey(key))}
  get(key) {return this.getRaw(toKey(key))}
  set(key, val) {return this.setRaw(toKey(key), val)}
  delete(key) {return this.deleteRaw(toKey(key))}

  hasRaw(key) {return hasOwnEnum(this, key)}
  getRaw(key) {return this.hasRaw(key) ? this[key] : undefined}

  setRaw(key, val) {
    if (key in this && !this.hasRaw(key)) {
      throw Error(`can't set ${show(key)} due to conflict with ${show(this[key])}`)
    }
    this[key] = val
    return this
  }

  deleteRaw(key) {return this.hasRaw(key) && delete this[key]}

  forEach(fun, self) {
    req(fun, isFun)
    for (const key in this) {
      fun.call(self, this[key], fromJson(key), this)
    }
  }

  *keys() {for (const key in this) yield fromJson(key)}
  *values() {for (const key in this) yield this.getRaw(key)}
  *entries() {for (const key in this) yield [fromJson(key), this.getRaw(key)]}
  [Symbol.iterator]() {return this.entries()}
}

export class ClsSet extends Set {
  add(val) {return super.add(inst(val, this.cls))}
  get cls() {return Object}
  get [Symbol.toStringTag]() {return this.constructor.name}
}

export class Que extends Set {
  constructor() {
    super(...arguments)
    this.flushing = false
  }

  add(fun) {
    req(fun, isFun)
    if (this.flushing) fun()
    else super.add(fun)
    return this
  }

  pause() {
    this.flushing = false
    return this
  }

  flush() {
    this.flushing = true
    if (!this.size) return
    for (const fun of this) {
      this.delete(fun)
      fun()
    }
    return this
  }

  get [Symbol.toStringTag]() {return this.constructor.name}
}

/* Public Funs */

export function assign(tar, src) {
  req(tar, isStruct)
  if (isSome(src)) {
    reqAssignable(tar, src)
    each(src, maybeAssign, tar)
  }
  return tar
}

export function inst(val, cls) {
  if (isInst(val, cls)) return val
  return new cls(val)
}

export function opt(val, cls) {
  return isNil(val) ? val : inst(val, cls)
}

export function toKey(val) {
  return toJson(jsonStabilize(val))
}

export function isPlain(val) {
  if (isArr(val)) return isArrPlain(val)
  if (isDict(val)) return isDictPlain(val)
  return isPrim(val)
}

/* Internal Utils */

function reqArgLen(len, min, max) {
  if (!(len >= min && len <= max)) {
    throw Error(`expected between ${min} and ${max} args, got ${len}`)
  }
}

function jsonStabilize(val) {
  val = stabilize(val, maybeToJson)
  if (isFun(val)) return null
  if (isArr(val)) return val.map(jsonStabilize)
  if (isDict(val)) return jsonStabilizeDict(val)
  req(val, isPlain)
  return val
}

function maybeToJson(val) {
  if (isComp(val) && isFun(val.toJSON)) return val.toJSON()
  return val
}

function jsonStabilizeDict(val) {
  const out = {}
  for (const key of Object.keys(val).sort()) {
    out[key] = jsonStabilize(val[key])
  }
  return out
}

function toJson(val) {
  return val === undefined ? '' : JSON.stringify(val)
}

function fromJson(val) {
  if (isNil(val) || val === '') return undefined
  req(val, isString)
  return JSON.parse(val)
}

function stabilize(val, fun) {while (!is(val, val = fun(val))); return val}

function each(vals, fun, self) {
  for (const key in vals) fun.call(self, vals[key], key)
}

function hasOwnEnum(ref, key) {
  req(key, isKey)
  return Object.prototype.propertyIsEnumerable.call(ref, key)
}

// eslint-disable-next-line no-invalid-this
function selfAssign(val, key) {this[key] = val}

// eslint-disable-next-line no-invalid-this
function selfSet(val, key) {this.set(key, val)}

function maybeAssign(val, key) {
  // eslint-disable-next-line no-invalid-this
  if (!(key in this) || hasOwnEnum(this, key)) this[key] = val
}

function* dictIter(val) {for (const key in val) yield [key, val[key]]}

function is(a, b) {return Object.is(a, b)}
function isNil(val) {return val == null}
function isSome(val) {return !isNil(val)}
function isFun(val) {return typeof val === 'function'}
function isString(val) {return typeof val === 'string'}
function isKey(val) {return isString(val)}
function isNum(val) {return typeof val === 'number'}
function isComp(val) {return isObj(val) || isFun(val)}
function isPrim(val) {return !isComp(val)}
function isObj(val) {return val !== null && typeof val === 'object'}
function isStruct(val) {return isObj(val) && !isArr(val)}
function isArr(val) {return isInst(val, Array)}
function isInst(val, cls) {return isComp(val) && val instanceof cls}

function isDict(val) {
  if (!isObj(val)) return false
  const proto = Object.getPrototypeOf(val)
  return proto === null || proto === Object.prototype
}

function isArrPlain(val) {
  return !val.length || isPlain(val[0])
}

function isDictPlain(val) {
  // Not a typo. We only check the first property.
  for (const key in val) return isPlain(val[key])
  return true
}

function reqAssignable(tar, src) {
  req(src, isStruct)
  if (isDict(src) || isInst(src, tar.constructor)) return
  throw TypeError(`can't assign ${show(src)} due to type mismatch`)
}

function req(val, test) {
  if (!test(val)) throw TypeError(`expected ${show(val)} to satisfy test ${show(test)}`)
}

// Placeholder, might improve.
function show(val) {
  if (isFun(val) && val.name) return val.name
  if (isString(val) || isArr(val) || isDict(val)) {
    try {return toJson(val)}
    catch (_) {return String(val)}
  }
  return String(val)
}
