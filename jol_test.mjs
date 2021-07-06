import {
  assert as ok,
  assertStrictEquals as eq,
  assertEquals as equiv,
  assertThrows as throws,
} from 'https://deno.land/std@0.100.0/testing/asserts.ts'
import * as j from './jol.mjs'

void function test_Null() {
  eq(j.Null.prototype, null)

  class Mock extends j.Null {}

  const descs = Object.getOwnPropertyDescriptors(Mock.prototype)

  equiv(descs, {
    constructor: {
      value: Mock,
      enumerable: false,
      writable: true,
      configurable: true,
    }
  })

  ok(!new Mock().toString)
  ok(new Object().toString)
}()

void function test_Obj() {
  void function test_reject_invalid_inputs() {
    function nop() {}

    throws(() => new j.Obj(),             TypeError, `type mismatch`)
    throws(() => new j.Obj(null),         TypeError, `type mismatch`)
    throws(() => new j.Obj('one'),        TypeError, `type mismatch`)
    throws(() => new j.Obj(10),           TypeError, `type mismatch`)
    throws(() => new j.Obj([]),           TypeError, `type mismatch`)
    throws(() => new j.Obj(nop),          TypeError, `type mismatch`)
    throws(() => new j.Obj(new String()), TypeError, `type mismatch`)
  }()

  void function test_allow_plainest_dict() {
    const obj = new j.Obj(Object.create(null, {one: {value: 10, enumerable: true}}))
    eq(obj.constructor, j.Obj)
    equiv(obj, {one: 10})
  }()

  void function test_allow_plain_dict() {
    const obj = new j.Obj({one: 10})
    eq(obj.constructor, j.Obj)
    equiv(obj, {one: 10})
  }()

  void function test_allow_exact_class() {
    const obj = new j.Obj(new j.Obj({one: 10}))
    eq(obj.constructor, j.Obj)
    equiv(obj, {one: 10})
  }()

  void function test_subclass() {
    class Mock extends j.Obj {}
    const obj = new Mock({one: 10})
    eq(obj.constructor, Mock)
    equiv(obj, {one: 10})
  }()

  void function test_allow_subclass() {
    class Mock extends j.Obj {}
    const obj = new j.Obj(new Mock({one: 10}))
    eq(obj.constructor, j.Obj)
    equiv(obj, {one: 10})
  }()
}()

void function test_Arr() {
  void function test_reject_invalid_inputs() {
    function nop() {}

    throws(() => new j.Arr([], []), Error, `expected between`)
    throws(() => new j.Arr({}),     TypeError)
    throws(() => new j.Arr(nop),    TypeError)
  }()

  void function test_constructor_supports_length() {
    eq(new j.Arr().length,     0)
    eq(new j.Arr(null).length, 0)
    eq(new j.Arr(0).length,    0)
    eq(new j.Arr(8).length,    8)

    equiv(new j.Arr(),     [])
    equiv(new j.Arr(null), [])
    equiv(new j.Arr(0),    new Array(0))
    equiv(new j.Arr(8),    new Array(8))
  }()

  void function test_constructor_supports_iterable() {
    equiv(new j.Arr('one'),                 ['o', 'n', 'e'])
    equiv(new j.Arr([10, 20, 30]),          [10, 20, 30])
    equiv(new j.Arr(new Set([10, 20, 30])), [10, 20, 30])
  }()

  void function test_map() {
    function args(...args) {return args}
    const arr = new j.Arr([10, 20])
    ok(arr.map(args) instanceof j.Arr)
    equiv(arr.map(args), [[10, 0, arr], [20, 1, arr]])
  }()
}()

void function test_EqDict() {
  void function test_instantiation_and_underlying_structure() {
    equiv(new j.EqDict(),                {})
    equiv(new j.EqDict({one: 10}),       {one: 10})
    equiv(new j.EqDict().set('one', 10), {'"one"': 10})
  }()

  void function test_has() {
    const coll = new j.EqDict().set('one', 10)
    ok(coll.has('one'))
    ok(!coll.has('two'))
  }()

  void function test_get() {
    const coll = new j.EqDict().set('one', 10)
    eq(coll.get('one'), 10)
    eq(coll.get('two'), undefined)
  }()

  void function test_delete() {
    const coll = new j.EqDict().set('one', 10)
    ok(coll.has('one'))
    eq(coll.get('one'), 10)
    coll.delete('one')
    ok(!coll.has('one'))
    eq(coll.get('one'), undefined)
  }()

  void function test_only_own_enum_properties() {
    const coll = new j.EqDict().set('one', 10)
    Object.defineProperty(coll, 'two', {value: 20})

    ok(!coll.has('has'))
    ok(!coll.has('get'))
    ok(!coll.has('two'))

    eq(coll.get('has'), undefined)
    eq(coll.get('get'), undefined)
    eq(coll.get('two'), undefined)

    eq(coll.two, 20)
  }()

  void function test_dict_keys_are_order_independent() {
    const coll = new j.EqDict()
    coll.set({one: 10, two: 20}, 'val')
    const val = coll.get({two: 20, one: 10})
    eq(val, 'val')
  }()

  void function test_json_reversible() {
    const prev = new j.EqDict().set('one', 10).set('two', 20)
    const next = new j.EqDict(JSON.parse(JSON.stringify(prev)))
    equiv(prev, next)
    equiv(next, {'"one"': 10, '"two"': 20})
  }()

  void function test_avoid_conflict_in_set() {
    const coll = new class extends j.EqDict {null() {}}()

    Object.defineProperty(coll, '10', {value: 20, enumerable: false})
    throws(coll.set.bind(coll, 10, 30), Error, `conflict`)
    eq(coll[10], 20)

    throws(() => coll.set(null, ''), Error, `conflict`)
    eq(typeof coll.null, 'function')
  }()

  void function test_avoid_conflict_in_delete() {
    const coll = new class extends j.EqDict {null() {}}()

    Object.defineProperty(coll, '10', {value: 20, enumerable: false})
    ok(!coll.delete(10))
    eq(coll[10], 20)

    ok(!coll.delete(null))
    eq(typeof coll.null, 'function')
  }()

  void function test_forEach() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)

    const stashed = []
    function stash(...args) {stashed.push(args)}

    coll.forEach(stash)
    equiv(stashed, [[10, 'one', coll], [20, 'two', coll]])
  }()

  void function test_keys() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    equiv([...coll.keys()], ['one', 'two'])
  }()

  void function test_values() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    equiv([...coll.values()], [10, 20])
  }()

  void function test_entries() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    equiv([...coll.entries()], [['one', 10], ['two', 20]])
  }()

  void function test_iterator() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    equiv([...coll], [['one', 10], ['two', 20]])
  }()
}()

void function test_ClsArr() {
  class Mock extends j.Obj {}
  class MockArr extends j.ClsArr {get cls() {return Mock}}

  // These rejections originate in `Mock` -> `Obj` -> `assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    const coll = new MockArr()
    function nop() {}

    throws(() => coll.push(null),      TypeError, `type mismatch`)
    throws(() => coll.push('one'),     TypeError, `type mismatch`)
    throws(() => coll.push(10),        TypeError, `type mismatch`)
    throws(() => coll.push(nop),       TypeError, `type mismatch`)
    throws(() => coll.push([]),        TypeError, `type mismatch`)
    throws(() => coll.push(new Map()), TypeError, `type mismatch`)
  }()

  void function test_instantiation_in_constructor() {
    ok(new MockArr([{}])[0] instanceof Mock)
  }()

  void function test_instantiation_on_push() {
    const coll = new MockArr()
    coll.push({})
    ok(coll[0] instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    const val = new Mock({})
    const coll = new MockArr([val])
    eq(coll[0], val)
  }()
}()

void function test_ClsSet() {
  class Mock extends j.Obj {}
  class MockSet extends j.ClsSet {get cls() {return Mock}}

  // These rejections originate in `Mock` -> `Obj` -> `assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    const coll = new MockSet()
    function nop() {}

    throws(() => coll.add(null),      TypeError, `type mismatch`)
    throws(() => coll.add('one'),     TypeError, `type mismatch`)
    throws(() => coll.add(10),        TypeError, `type mismatch`)
    throws(() => coll.add(nop),       TypeError, `type mismatch`)
    throws(() => coll.add([]),        TypeError, `type mismatch`)
    throws(() => coll.add(new Map()), TypeError, `type mismatch`)
  }()

  void function test_instantiation_in_constructor() {
    ok([...new MockSet([{}])][0] instanceof Mock)
  }()

  void function test_instantiation_on_push() {
    const coll = new MockSet()
    coll.add({})
    ok([...coll][0] instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    const val = new Mock({})
    const coll = new MockSet([val])
    eq([...coll][0], val)
  }()
}()

void function test_ClsMap() {
  class Mock extends j.Obj {}
  class MockMap extends j.ClsMap {get cls() {return Mock}}

  // These rejections originate in `Mock` -> `Obj` -> `assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    const coll = new MockMap()
    function nop() {}

    throws(() => coll.set(10),            TypeError, `type mismatch`)
    throws(() => coll.set(10, 'one'),     TypeError, `type mismatch`)
    throws(() => coll.set(10, 10),        TypeError, `type mismatch`)
    throws(() => coll.set(10, nop),       TypeError, `type mismatch`)
    throws(() => coll.set(10, []),        TypeError, `type mismatch`)
    throws(() => coll.set(10, new Map()), TypeError, `type mismatch`)
  }()

  void function test_instantiation_in_constructor() {
    const coll = new MockMap([[10, {}]])
    const val = coll.get(10)
    ok(val instanceof Mock)
  }()

  void function test_instantiation_on_set() {
    const coll = new MockMap()
    coll.set(10, {})
    const val = coll.get(10)
    ok(val instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    const val = new Mock({})
    const coll = new MockMap()
    coll.set(10, val)
    eq(coll.get(10), val)
  }()
}()

void function test_Que() {
  let count = 0
  function effect0() {count++}
  function effect1() {count++}

  void function test_reject_invalid_inputs() {
    const que = new j.Que()
    throws(que.add.bind(que),        TypeError, `test isFun`)
    throws(que.add.bind(que, null),  TypeError, `test isFun`)
    throws(que.add.bind(que, 'one'), TypeError, `test isFun`)
    throws(que.add.bind(que, 10),    TypeError, `test isFun`)
    throws(que.add.bind(que, []),    TypeError, `test isFun`)
    throws(que.add.bind(que, {}),    TypeError, `test isFun`)
  }()

  const que = new j.Que()
  que.add(effect0)
  que.add(effect0)
  que.add(effect0)
  que.add(effect1)
  que.add(effect1)
  que.add(effect1)

  eq(que.size, 2)
  eq(count, 0)

  que.flush()
  eq(que.size, 0)
  eq(count, 2)

  que.add(effect0)
  que.add(effect1)
  eq(que.size, 0)
  eq(count, 4)

  que.pause()
  que.add(effect0)
  que.add(effect1)
  eq(que.size, 2)
  eq(count, 4)

  que.flush()
  eq(que.size, 0)
  eq(count, 6)
}()

void function test_assign() {
  void function test_reject_invalid_inputs() {
    function nop() {}

    throws(() => j.assign(),             TypeError, `isStruct`)
    throws(() => j.assign(null, {}),     TypeError, `isStruct`)
    throws(() => j.assign(10, {}),       TypeError, `isStruct`)
    throws(() => j.assign('one', {}),    TypeError, `isStruct`)
    throws(() => j.assign('one', 'one'), TypeError, `isStruct`)
    throws(() => j.assign([], {}),       TypeError, `isStruct`)
    throws(() => j.assign([], []),       TypeError, `isStruct`)
    throws(() => j.assign(nop, {}),      TypeError, `isStruct`)
    throws(() => j.assign(nop, nop),     TypeError, `isStruct`)
    throws(() => j.assign({}),           TypeError, `type mismatch`)
    throws(() => j.assign({}, null),     TypeError, `type mismatch`)
    throws(() => j.assign({}, 10),       TypeError, `type mismatch`)
    throws(() => j.assign({}, 'one'),    TypeError, `type mismatch`)
    throws(() => j.assign({}, []),       TypeError, `type mismatch`)
    throws(() => j.assign({}, nop),      TypeError, `type mismatch`)
    throws(() => j.assign({}, []),       TypeError, `type mismatch`)
  }()

  void function test_returns_target() {
    class Mock {}
    const tar = new Mock()
    eq(j.assign(tar, {}), tar)
  }()

  void function test_allow_plainest_dict() {
    class Mock {}
    const tar = new Mock()
    eq(j.assign(tar, Object.create(null, {one: {value: 10, enumerable: true}})), tar)
    equiv(tar, {one: 10})
  }()

  void function test_allow_plain_dict() {
    class Mock {}
    const tar = new Mock()
    eq(j.assign(tar, {one: 10}), tar)
    equiv(tar, {one: 10})
  }()

  void function test_allow_subclass() {
    class Sup {}
    const tar = new Sup()

    class Sub extends Sup {}
    const src = Object.assign(new Sub(), {one: 10})

    eq(j.assign(tar, src), tar)
    equiv(tar, {one: 10})
  }()
}()

void function test_toInst() {
  // These rejections originate in `Mock` -> `Obj` -> `assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    class Mock extends j.Obj {}
    function nop() {}

    throws(() => j.toInst(),                 TypeError)
    throws(() => j.toInst(null,      Mock),  TypeError)
    throws(() => j.toInst('one',     Mock),  TypeError)
    throws(() => j.toInst(10,        Mock),  TypeError)
    throws(() => j.toInst(nop,       Mock),  TypeError)
    throws(() => j.toInst([],        Mock),  TypeError)
    throws(() => j.toInst(new Set(), Mock),  TypeError)
  }()

  void function test_instantiate_from_dict() {
    class Mock {}
    ok(j.toInst({}, Mock) instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    class Mock {}
    const val = new Mock()
    eq(j.toInst(val, Mock),                 val)
    eq(j.toInst(j.toInst(val, Mock), Mock), val)
  }()

  void function test_upgrade_to_subclass() {
    class Sup {}
    class Sub extends Sup {}
    eq(j.toInst(new Sup(), Sub).constructor, Sub)
  }()
}()

void function test_toInstOpt() {
  class Mock {constructor(val) {this.val = val}}
  eq(j.toInstOpt(null, Mock), null)
  eq(j.toInstOpt(undefined, Mock), undefined)
  ok(j.toInstOpt(10, Mock) instanceof Mock)
  equiv(j.toInstOpt(10, Mock), {val: 10})
}()

void function test_toKey() {
  eq(j.toKey(),                            ``)
  eq(j.toKey(null),                        `null`)
  eq(j.toKey('one'),                       `"one"`)
  eq(j.toKey(10),                          `10`)
  eq(j.toKey({}),                          `{}`)
  eq(j.toKey([]),                          `[]`)
  eq(j.toKey([{}]),                        `[{}]`)
  eq(j.toKey({one: 10, two: 20}),          `{"one":10,"two":20}`)
  eq(j.toKey({two: 10, one: 20}),          `{"one":20,"two":10}`)
  eq(j.toKey([{one: 10, two: 20}]),        `[{"one":10,"two":20}]`)
  eq(j.toKey([{two: 10, one: 20}]),        `[{"one":20,"two":10}]`)
  eq(j.toKey({one: {two: 10, three: 20}}), `{"one":{"three":20,"two":10}}`)
  eq(j.toKey({one: {three: 10, two: 20}}), `{"one":{"three":10,"two":20}}`)
  eq(j.toKey({one: j.toKey}),              `{"one":null}`)
  eq(j.toKey(j.toKey),                     `null`)
}()

void function test_isPlain() {
  ok(j.isPlain())
  ok(j.isPlain('one'))
  ok(j.isPlain(10))
  ok(j.isPlain({}))
  ok(j.isPlain([{}]))
  ok(j.isPlain({one: [{}]}))
  ok(j.isPlain([{one: [{}]}]))

  ok(!j.isPlain(j.isPlain))
  ok(!j.isPlain(Object))
  ok(!j.isPlain(new String()))
  ok(!j.isPlain([new String()]))
  ok(!j.isPlain({one: new String()}))
}()

console.log(`[test] ok`)
