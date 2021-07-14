/* Public Classes */

export function Null() {}
Null.prototype = Object.create(null)

export class Obj {constructor(val) {assign(this, val)}}

export class Arr extends Array {
  // deno-lint-ignore constructor-super
  constructor(val) {
    validArgLen(arguments.length, 0, 1)

    if (isNum(val)) {
      super(val)
    }
    else {
      super()
      if (!isNil(val)) this.push(...val)
    }
  }
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
    valid(fun, isFun)
    for (const key in this) {
      fun.call(self, this[key], fromJson(key), this)
    }
  }

  *keys() {for (const key in this) yield fromJson(key)}
  *values() {for (const key in this) yield this.getRaw(key)}
  *entries() {for (const key in this) yield [fromJson(key), this.getRaw(key)]}
  [Symbol.iterator]() {return this.entries()}
}

export class ClsArr extends Arr {
  get cls() {return Object}

  push(...vals) {
    for (let i = 0; i < vals.length; i++) {
      super.push(toInst(vals[i], this.cls))
    }
  }

  unshift(...vals) {
    for (let i = 0; i < vals.length; i++) {
      super.unshift(toInst(vals[i], this.cls))
    }
  }
}

export class ClsSet extends Set {
  get cls() {return Object}

  add(val) {super.add(toInst(val, this.cls))}

  get [Symbol.toStringTag]() {return this.constructor.name}
}

export class ClsMap extends Map {
  get cls() {return Object}

  set(key, val) {
    val = toInst(val, this.cls)
    super.set(key, val)
  }

  get [Symbol.toStringTag]() {return this.constructor.name}
}

export class Que extends Set {
  constructor() {
    super(...arguments)
    this.flushing = false
  }

  add(fun) {
    valid(fun, isFun)
    if (this.flushing) fun()
    else super.add(fun)
  }

  pause() {this.flushing = false}

  flush() {
    this.flushing = true
    if (!this.size) return
    for (const fun of this) {
      this.delete(fun)
      fun()
    }
  }

  get [Symbol.toStringTag]() {return this.constructor.name}
}

/* Public Funs */

export function assign(tar, src) {
  valid(tar, isStruct)
  if (!isDict(src) && !(isStruct(src) && isInst(src, tar.constructor))) {
    throw TypeError(`can't assign ${show(src)} due to type mismatch`)
  }
  return Object.assign(tar, src)
}

export function toInst(val, cls) {
  if (isInst(val, cls) && val.constructor === cls) return val
  return new cls(val)
}

export function toInstOpt(val, cls) {
  return isNil(val) ? val : toInst(val, cls)
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

function validArgLen(len, min, max) {
  if (!(len >= min && len <= max)) {
    throw Error(`expected between ${min} and ${max} args, got ${len}`)
  }
}

function jsonStabilize(val) {
  val = stabilize(val, maybeToJson)
  if (isFun(val)) return null
  if (isArr(val)) return val.map(jsonStabilize)
  if (isDict(val)) return jsonStabilizeDict(val)
  valid(val, isPlain)
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
  valid(val, isStr)
  return JSON.parse(val)
}

function stabilize(val, fun) {while (!is(val, val = fun(val))); return val}

function hasOwnEnum(val, key) {
  valid(key, isKey)
  return Object.prototype.propertyIsEnumerable.call(val, key)
}

function is(a, b) {return Object.is(a, b)}
function isNil(val) {return val == null}
function isSome(val) {return !isNil(val)}
function isFun(val) {return typeof val === 'function'}
function isStr(val) {return typeof val === 'string'}
function isKey(val) {return isStr(val)}
function isNum(val) {return typeof val === 'number'}
function isComp(val) {return isObj(val) || isFun(val)}
function isPrim(val) {return !isComp(val)}
function isObj(val) {return val !== null && typeof val === 'object'}
function isStruct(val) {return isObj(val) && !isArr(val)}
function isArr(val) {return isInst(val, Array)}
function isInst(val, Cls) {return isComp(val) && val instanceof Cls}

function isDict(val) {
  if (!isObj(val)) return false
  const proto = Object.getPrototypeOf(val)
  return proto === null || proto === Object.prototype
}

function isArrPlain(val) {
  return !val.length || isPlain(val[0])
}

function isDictPlain(val) {
  for (const key in val) return isPlain(val[key])
  return true
}

function valid(val, test) {
  if (!test(val)) throw TypeError(`expected ${show(val)} to satisfy test ${show(test)}`)
}

// Placeholder, might improve.
function show(val) {
  if (isFun(val) && val.name) return val.name
  if (isStr(val) || isArr(val) || isDict(val)) {
    try {return toJson(val)}
    catch (_) {return String(val)}
  }
  return String(val)
}
