## Overview

"**J**S C**ol**lection C**l**asses". Tiny extensions on JS built-in classes such as `Object`, `Array`, `Set`, `Map`, with nice features such as:

* Easy-to-use typed collections such as `Arr<Cls>` or `Set<Cls>` with automatic idempotent element instantiation.
* `EqDict`: dictionary with support for structured keys, like `{key: 'val'}`. Compares keys by value, not by reference.
* Consistent constructor signatures: everything is `new Cls(val)`, like ES6 `Map` and `Set`.

Tiny, dependency-free, single file, native JS module.

Browser compatibility: any ES6+ environment. For older browsers, polyfill `Set` and `Map` and allow your bundler to transpile this library.

## TOC

* [Usage](#usage)
* [API](#api)
  * [`class Null`](#class-null)
  * [`class Obj`](#class-obj)
  * [`class Arr`](#class-arr-extends-array)
  * [`class EqDict`](#class-eqdict-extends-null)
  * [`class ClsArr`](#class-clsarr-extends-arr)
  * [`class ClsSet`](#class-clsset-extends-set)
  * [`class ClsMap`](#class-clsmap-extends-map)
  * [`class Que`](#class-que-extends-set)
  * [`function assign`](#function-assigntarget-source)
  * [`function toInst`](#function-toinstval-cls)
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
import * as j from 'https://cdn.jsdelivr.net/npm/@mitranim/jol@0.1.0/jol.mjs'
```

## API

### `class Null`

Empty null-prototype class. Inherit from it for a "squeaky clean" class without the `Object` stuff.

### `class Obj`

Like `Object` or `{}`, but rather than coercing _anything_ to an object, it _restricts_ the inputs to plain dicts and its own subclasses.

**Valid** calls, all equivalent:

```js
new j.Obj(Object.create(null, {one: {value: 10, enumerable: true}}))
new j.Obj({one: 10})
new j.Obj(new j.Obj({one: 10}))
new j.Obj(new class extends j.Obj {}({one: 10}))
```

**Invalid** calls (runtime exception):

```js
new j.Obj()
new j.Obj(10)
new j.Obj('str')
new j.Obj([])
```

`Obj` is nothing more than `Object` with additional assertions. `jol`'s [`assign`](#function-assigntarget-source) provides the same functionality without subclassing `Obj`:

```js
class Model {
  constructor(val) {
    j.assign(this, val)
  }
}
```

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

### `class EqDict extends Null`

Like `Object`, `Object.create(null)`, or `Map`, but:

* Keys can be structured data, such as `{one: 10}` or `['two', 'three']`.
* Keys are always compared by structure, not by reference.
* Internally, keys are encoded as JSON with object keys in sorted order.
  * Relies on engine quirks; has not been tested in all browsers.
  * The conversion function `toKey` is exported separately.
  * Computational complexity is the same as on `{}` (probably ≈O(1)).

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

### `class ClsArr extends Arr`

Runtime approximation of `Arr<Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model extends j.Obj {}

class Models extends j.ClsArr {
  get cls() {return Model}
}

new Models([{id: 10}, {id: 20}])
// Models(2) [ Model { id: 10 }, Model { id: 20 } ]
```

### `class ClsSet extends Set`

Runtime approximation of `Set<Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model extends j.Obj {}

class Models extends j.ClsSet {
  get cls() {return Model}
}

new Models([{id: 10}, {id: 20}])
// Models(2) { Model { id: 10 }, Model { id: 20 } }
```

### `class ClsMap extends Map`

Runtime approximation of `Map<any, Cls>`. Idempotently auto-instantiates values via `this.cls`.

```js
class Model extends j.Obj {}

class Models extends j.ClsMap {
  get cls() {return Model}
}

new Models([[10, {id: 10}], [20, {id: 20}]])
// Models(2) { 10 => Model { id: 10 }, 20 => Model { id: 20 } }
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

Wrapper for `Object.assign` with additional assertions:

* `target` must be a non-array object (internally termed "struct").
* `source` must be either a plain dict (`{}` or `Object.create(null)`), or a subclass of `target.constructor`.

**Valid** calls:

```js
class Mock {
  constructor() {this.key = 'val'}
}

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

j.assign(null,          {})
j.assign(10,            {})
j.assign('one',         {})
j.assign({},            [])
j.assign([],            {})
j.assign([],            [])
j.assign(new Mock(),    new j.Obj({}))
j.assign(new j.Obj({}), new Mock())
```

### `function toInst(val, cls)`

Idempotently converts `val` to an instance of `cls`:

* If `val` is an instance of _exactly_ `cls` (not a subclass), returns `val` as-is.
* Otherwise returns `new cls(val)`.

```js
class Mock {}

let val
val = j.toInst(val, Mock) // new instance
val = j.toInst(val, Mock) // preserves existing instance
val = j.toInst(val, Mock) // preserves existing instance
val = j.toInst(val, Mock) // preserves existing instance
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

## License

https://unlicense.org

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
