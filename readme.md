## Overview

"**J**S C**ol**lection C**l**asses". Tiny extensions on JS built-in classes such as `Object`, `Array`, `Set`, `Map`, with nice features such as:

* Easy-to-use typed collections such as `Arr<Cls>` or `Set<Cls>` with automatic idempotent element instantiation.
* `EqDict`: dictionary with support for structured keys, like `["composite", "key"]`. Compares keys by value, not by reference.
* Consistent constructor signatures: everything is `new Cls(val)`, like ES6 `Map` and `Set`.

Tiny, dependency-free, single file, native JS module.

Browser compatibility: any ES6+ environment. For older browsers, polyfill `Set` and `Map` and allow your bundler to transpile this library.

## TOC

* [Usage](#usage)
* [API](#api)
  * [`class Null`](#class-null)
  * [`class Arr`](#class-arr-extends-array)
  * [`class ClsArr`](#class-clsarr-extends-arr)
  * [`class Dict`](#class-dict-extends-map)
  * [`class ClsDict`](#class-clsdict-extends-dict)
  * [`class ClsMap`](#class-clsmap-extends-map)
  * [`class EqDict`](#class-eqdict)
  * [`class ClsSet`](#class-clsset-extends-set)
  * [`class Que`](#class-que-extends-set)
  * [`function assign`](#function-assigntarget-source)
  * [`function inst`](#function-instval-cls)
  * [`function opt`](#function-optval-cls)
  * [`function toKey`](#function-tokeykey)
  * [`function isPlain`](#isplainval)
* [License](#license)
* [Misc](#misc)

## Usage

Install with NPM, or import by URL:

```sh
npm i -E @mitranim/jol
```

```js
import * as j from '@mitranim/jol'
import * as j from 'https://cdn.jsdelivr.net/npm/@mitranim/jol@0.1.6/jol.mjs'
```

## API

### `class Null`

Inherits from `null` rather than `Object`. Extend `Null` for a "squeaky clean" class.

### `class Arr extends Array`

Like `Array`, but instead of `new Array(...vals)`, the constructor signature is `new Arr(vals)`, mirroring the behavior of `Set` and preventing gotchas.

**Valid** calls:

```js
new j.Arr()             // Like [].
new j.Arr(null)         // Like [].
new j.Arr(0)            // Like [].
new j.Arr(8)            // Like Array(8).
new j.Arr([10, 20, 30]) // Like [10, 20, 30] or Array(10, 20, 30).
new j.Arr('one')        // Like [...'one'] or Array(...'one').
```

**Invalid** calls (runtime exception):

```js
new j.Arr({})
new j.Arr(10, 20)
new j.Arr(() => {})
```

### `class ClsArr extends Arr`

Runtime approximation of `Arr<Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model {
  constructor(val) {this.val = val * 2}
}

class Models extends j.ClsArr {
  get cls() {return Model}
}

new Models([10, 20])
// [ Model { val: 20 }, Model { val: 40 } ]
```

### `class Dict extends Map`

Variant of `Map` whose behavior is closer to `Object`:

  * Can be constructed from plain objects: `new j.Dict({one: 10})`.
  * Compatible with JSON. Reversible encoding and decoding.
  * Allows **only** strings as keys. Other keys cause exceptions.

Compatibility with JSON:

```js
new j.Dict({one: 10, two: 20})
// Dict { "one" => 10, "two" => 20 }

new j.Dict(JSON.parse(`{"one": 10, "two": 20}`))
// Dict { "one" => 10, "two" => 20 }

JSON.stringify(new j.Dict({one: 10, two: 20}))
// {"one":10,"two":20}
```

### `class ClsDict extends Dict`

Runtime approximation of `Dict<Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model {
  constructor(val) {this.val = val * 2}
}

class Models extends j.ClsDict {
  get cls() {return Model}
}

new Models({one: 10, two: 20})
// Models { "one" => Model { val: 20 }, "two" => Model { val: 40 } }
```

### `class ClsMap extends Map`

Runtime approximation of `Map<any, Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model {
  constructor(val) {this.val = val * 2}
}

class Models extends j.ClsMap {
  get cls() {return Model}
}

new Models([[10, 20], [30, 40]])
// Models { 10 => Model { val: 40 }, 30 => Model { val: 80 } }
```

### `class EqDict`

Like `Object` or `Map`, but:

* Keys can be structured data, such as `{one: 10}` or `['two', 'three']`.
* Keys are always compared by structure, not by reference.
* Internally, keys are encoded as deterministic JSON.
  * Relies on engine quirks; has not been tested in all browsers.
  * The conversion function `toKey` is exported separately.
  * Computational complexity for access-by-key should be similar to `{}`, with the added overhead of JSON encoding (should scale with key size but not overall dict size).

Methods are similar to `Map`:

* `eqMap.has(key)`
* `eqMap.get(key)`
* `eqMap.set(key, val)`
* `eqMap.delete(key)`
* `eqMap.forEach()`
* `eqMap.keys()`
* `eqMap.values()`
* `eqMap.entries()`
* Supports `for .. of`.

These internal methods require plain string keys, and are provided for subclasses:

* `eqMap.hasRaw(key)`
* `eqMap.getRaw(key)`
* `eqMap.setRaw(key, val)`
* `eqMap.deleteRaw(key)`

Unlike the syntax `object[key]`, methods of `EqDict` operate only on _own enumerable properties_. Because keys are always JSON-encoded, there is _no collision_ with `Object` methods and properties.

```js
const coll = new j.EqDict()
coll.set({one: 10, two: 20}, 'value')
coll.get({two: 20, one: 10}) === 'value'
```

Supports reversible JSON encoding and decoding:

```js
const prev = new j.EqDict().set('one', 10)
const next = new j.EqDict(JSON.parse(JSON.stringify(prev)))
// prev ≈ next
```

However, **avoid** the following:

```js
new j.EqDict({one: 10})
```

All keys must be created by calling `.set()`, otherwise they don't get encoded, and you can't retrieve the values with `.get()`!

### `class ClsSet extends Set`

Runtime approximation of `Set<Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model {
  constructor(val) {this.val = val * 2}
}

class Models extends j.ClsSet {
  get cls() {return Model}
}

new Models([10, 20])
// Models { Model { val: 20 }, Model { val: 40 } }
```

### `class Que extends Set`

Ordered FIFO queue of functions. Paused by default. Calling `.flush()` immediately dequeues and calls functions one-by-one, and any future calls to `.add()` will result in immediate calls. Call `.pause()` to pause again.

```js
const que = new Que()

que.add(function one() {console.log('one')})
que.add(function two() {console.log('two')})

// Prints 'one'.
// Prints 'two'.
que.flush()

// Prints 'three'.
que.add(function three() {console.log('three')})

que.pause()
```

### `function assign(target, source)`

Similar to `Object.assign`, but with differences:

* `target` must be a non-array object (internally termed "struct").
* `source` must be either nil (`undefined` or `null`), a plain dict (`{}` or `Object.create(null)`), or a subclass of `target.constructor`.
* Does **not** shadow inherited or non-enumerable properties.

**Valid** calls:

```js
class Mock {
  constructor() {this.key = 'val'}
}

j.assign({},            undefined)
j.assign({},            {key: 'val'})
j.assign({},            new Mock())
j.assign(new Mock(),    {key: 'val'})
j.assign(new Mock(),    new Mock())
j.assign(new j.Obj({}), {key: 'val'})
j.assign({},            new j.Obj({key: 'val'}))
```

**Invalid** calls (runtime exception):

```js
class Mock {}

j.assign(10,            {})
j.assign('one',         {})
j.assign({},            [])
j.assign([],            {})
j.assign([],            [])
j.assign(new Mock(),    new j.Obj({}))
j.assign(new j.Obj({}), new Mock())
```

Non-shadowing behavior:

```js
j.assign({}, {constructor: 10, toString: 20, unknown: 30})
// {unknown: 30}
```

### `function inst(val, cls)`

Idempotently converts `val` to an instance of `cls`:

* If `val` is an instance of `cls`, returns `val` as-is.
* Otherwise returns `new cls(val)`.

```js
class Mock {}

let val
val = j.inst(val, Mock) // new instance
val = j.inst(val, Mock) // preserves existing instance
val = j.inst(val, Mock) // preserves existing instance
val = j.inst(val, Mock) // preserves existing instance
```

### `function opt(val, cls)`

Same as `inst`, but if `val` is `null` or `undefined`, it's returned as-is, without instantiation.

```js
class Mock {constructor(val) {this.val = val}}
j.opt(undefined, Mock) // undefined
j.opt(10, Mock)        // Mock{val: 10}
```

### `function toKey(key)`

Used internally by `ClsArr`, `ClsSet`, `ClsMap`. Like `JSON.stringify` but:

* When input is `undefined`, returns `''` instead of `undefined`.
* Sorts object keys, producing deterministic output.

```js
j.toKey()                   // ''
j.toKey(null)               // 'null'
j.toKey(10)                 // '10'
j.toKey('one')              // '"one"'
j.toKey({one: 10, two: 20}) // '{"one":10,"two":20}'
j.toKey({two: 20, one: 10}) // '{"one":10,"two":20}'
```

### `isPlain(val)`

Returns `true` if val is either:

* Primitive.
* Instance of `Array`.
* Plain dict: `{}` or `Object.create(null)`.

Used internally by `toKey`, which rejects other inputs (runtime exception).

## Changelog

### 0.1.6

Additions:

  * Add `Dict`.
  * Add `ClsDict`.

Breaking:

  * Removed `Obj`.
  * `assign` now avoids shadowing inherited or non-enumerable properties.
  * `assign` now allows nil source, doing nothing instead of throwing.

Misc:

  * Overridden methods of `Arr`, `ClsArr`, `ClsMap`, `ClsSet` now return `this` instead of `undefined`.
  * `Que..pause` and `Que..flush` now return `this`.

### 0.1.5

Renamed `toInst` → `inst`, `toInstOpt` → `opt` for brevity.

### 0.1.4

`toInst` now allows subclass instances, instead of requiring an exact class match. This affects the behavior of all class collections.

### 0.1.3

Avoid an infinite loop when using `NaN` in `toKey` and `EqDict`.

### 0.1.2

`new Null()` now also creates a null-based object, rather than `{}`. The behavior of `Null` subclasses is unchanged.

### 0.1.1

Added `toInstOpt`. `EqDict` now extends `Object` rather than `Null`.

## License

https://unlicense.org

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
