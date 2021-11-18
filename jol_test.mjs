import {
  assert as ok,
  assertStrictEquals as is,
  assertEquals as eq,
  assertThrows as throws,
} from 'https://deno.land/std@0.114.0/testing/asserts.ts'
import * as j from './jol.mjs'

function nop() {}

void function test_Null() {
  class Mock extends j.Null {}

  ok(`toString` in new Object())
  ok(!(`toString` in new j.Null()))
  ok(!(`toString` in new Mock()))

  eq(
    Object.getOwnPropertyNames(Object.getPrototypeOf(new j.Null())),
    [],
  )

  eq(
    Object.getOwnPropertyNames(Object.getPrototypeOf(new Mock())),
    [`constructor`],
  )
}()

void function test_Arr() {
  void function test_reject_invalid_inputs() {
    throws(() => new j.Arr([], []), Error, `expected between`)
    throws(() => new j.Arr({}),     TypeError)
    throws(() => new j.Arr(nop),    TypeError)
  }()

  void function test_constructor_supports_length() {
    is(new j.Arr().length,     0)
    is(new j.Arr(null).length, 0)
    is(new j.Arr(0).length,    0)
    is(new j.Arr(8).length,    8)

    eq([...new j.Arr()],     [])
    eq([...new j.Arr(null)], [])
    eq([...new j.Arr(0)],    new Array(0))
    eq([...new j.Arr(8)],    new Array(8).fill(undefined))
  }()

  void function test_constructor_supports_iterable() {
    eq([...new j.Arr('one')],                 ['o', 'n', 'e'])
    eq([...new j.Arr([10, 20, 30])],          [10, 20, 30])
    eq([...new j.Arr(new Set([10, 20, 30]))], [10, 20, 30])
  }()

  void function test_map() {
    function args(...args) {return args}
    const arr = new j.Arr([10, 20])
    ok(arr.map(args) instanceof j.Arr)
    eq([...arr.map(args)], [[10, 0, arr], [20, 1, arr]])
  }()
}()

void function test_ClsArr() {
  class Mock {constructor(val) {j.assign(this, val)}}
  class MockArr extends j.ClsArr {get cls() {return Mock}}

  // These rejections originate in `j.assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    const coll = new MockArr()

    throws(() => coll.push('one'),     TypeError, `satisfy test isStruct`)
    throws(() => coll.push(10),        TypeError, `satisfy test isStruct`)
    throws(() => coll.push(nop),       TypeError, `satisfy test isStruct`)
    throws(() => coll.push([]),        TypeError, `satisfy test isStruct`)
    throws(() => coll.push(new Map()), TypeError, `type mismatch`)
  }()

  void function test_instantiation_in_constructor() {
    ok(new MockArr([undefined])[0] instanceof Mock)
  }()

  void function test_instantiation_on_push() {
    const coll = new MockArr()
    coll.push({})
    ok(coll[0] instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    const val = new Mock({})
    const coll = new MockArr([val])
    is(coll[0], val)
  }()
}()

void function test_Dict() {
  testJsonReversible(j.Dict)

  void function test_constructor() {
    eq(
      [...new j.Dict({one: 10, two: `three`}).entries()],
      [[`one`, 10], [`two`, `three`]],
    )

    eq(
      [...new j.Dict(new j.Dict({one: 10, two: `three`})).entries()],
      [[`one`, 10], [`two`, `three`]],
    )
  }()

  void function test_set() {
    eq(
      [...new j.Dict().set(`one`, 10).set(`two`, 20).entries()],
      [[`one`, 10], [`two`, 20]],
    )

    throws(
      () => {new j.Dict().set(10, 20)},
      TypeError,
      `expected 10 to satisfy test isStr`,
    )
  }()

  void function test_patch() {
    eq(
      [
        ...
        new j.Dict()
        .set(`one`, 10)
        .set(`two`, 20)
        .patch({two: 30, three: 40})
        .entries(),
      ],
      [[`one`, 10], [`two`, 30], [`three`, 40]],
    )

    eq(
      [
        ...
        new j.Dict()
        .set(`one`, 10)
        .set(`two`, 20)
        .patch(new j.Dict({two: 30, three: 40}))
        .entries()
      ],
      [[`one`, 10], [`two`, 30], [`three`, 40]],
    )
  }()

  void function test_toJSON() {
    eq(new j.Dict().toJSON(), {})

    eq(
      new j.Dict({one: 10, two: `three`}).toJSON(),
      {one: 10, two: `three`},
    )
  }()
}()

void function test_ClsDict() {
  testJsonReversible(j.ClsDict)

  class Mock {constructor(val) {j.assign(this, val)}}
  class MockDict extends j.ClsDict {get cls() {return Mock}}

  // These rejections originate in `j.assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_values() {
    throws(() => new MockDict([[`one`, 10]]),        TypeError, `satisfy test isStruct`)
    throws(() => new MockDict([[`one`, `two`]]),     TypeError, `satisfy test isStruct`)
    throws(() => new MockDict([[`one`, nop]]),       TypeError, `satisfy test isStruct`)
    throws(() => new MockDict([[`one`, []]]),        TypeError, `satisfy test isStruct`)
    throws(() => new MockDict([[`one`, new Map()]]), TypeError, `type mismatch`)

    throws(() => new MockDict({one: 10}),        TypeError, `satisfy test isStruct`)
    throws(() => new MockDict({one: `two`}),     TypeError, `satisfy test isStruct`)
    throws(() => new MockDict({one: nop}),       TypeError, `satisfy test isStruct`)
    throws(() => new MockDict({one: []}),        TypeError, `satisfy test isStruct`)
    throws(() => new MockDict({one: new Map()}), TypeError, `type mismatch`)

    const coll = new MockDict()
    throws(() => coll.set(`one`, 10),        TypeError, `satisfy test isStruct`)
    throws(() => coll.set(`one`, `one`),     TypeError, `satisfy test isStruct`)
    throws(() => coll.set(`one`, nop),       TypeError, `satisfy test isStruct`)
    throws(() => coll.set(`one`, []),        TypeError, `satisfy test isStruct`)
    throws(() => coll.set(`one`, new Map()), TypeError, `type mismatch`)
  }()

  void function test_reject_invalid_keys() {
    const val = new Mock()

    throws(() => new MockDict([[10,        val]]), TypeError, `satisfy test isString`)
    throws(() => new MockDict([[nop,       val]]), TypeError, `satisfy test isString`)
    throws(() => new MockDict([[[],        val]]), TypeError, `satisfy test isString`)
    throws(() => new MockDict([[new Map(), val]]), TypeError, `satisfy test isString`)

    const coll = new MockDict()
    throws(() => coll.set(10,        val), TypeError, `satisfy test isString`)
    throws(() => coll.set(nop,       val), TypeError, `satisfy test isString`)
    throws(() => coll.set([],        val), TypeError, `satisfy test isString`)
    throws(() => coll.set(new Map(), val), TypeError, `satisfy test isString`)
  }()

  void function test_instantiation_in_constructor() {
    const val = new MockDict([[`one`, undefined]]).get(`one`)
    ok(val instanceof Mock)
  }()

  void function test_instantiation_on_set() {
    const val = new MockDict().set(`one`, undefined).get(`one`)
    ok(val instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    const prev = new Mock()
    const next = new MockDict().set(`one`, prev).get(`one`)
    is(prev, next)
  }()
}()

void function test_ClsMap() {
  class Mock {constructor(val) {j.assign(this, val)}}
  class MockMap extends j.ClsMap {get cls() {return Mock}}

  // These rejections originate in `j.assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    const coll = new MockMap()

    throws(() => coll.set(10, 'one'),     TypeError, `satisfy test isStruct`)
    throws(() => coll.set(10, 10),        TypeError, `satisfy test isStruct`)
    throws(() => coll.set(10, nop),       TypeError, `satisfy test isStruct`)
    throws(() => coll.set(10, []),        TypeError, `satisfy test isStruct`)
    throws(() => coll.set(10, new Map()), TypeError, `type mismatch`)
  }()

  void function test_instantiation_in_constructor() {
    const coll = new MockMap([[10, undefined]])
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
    is(coll.get(10), val)
  }()
}()

void function test_EqDict() {
  void function test_instantiation_and_underlying_structure() {
    eq({...new j.EqDict()},                {})
    eq({...new j.EqDict({one: 10})},       {one: 10})
    eq({...new j.EqDict().set('one', 10)}, {'"one"': 10})
  }()

  void function test_has() {
    const coll = new j.EqDict().set('one', 10)
    ok(coll.has('one'))
    ok(!coll.has('two'))
  }()

  void function test_get() {
    const coll = new j.EqDict().set('one', 10)
    is(coll.get('one'), 10)
    is(coll.get('two'), undefined)
  }()

  void function test_delete() {
    const coll = new j.EqDict().set('one', 10)
    ok(coll.has('one'))
    is(coll.get('one'), 10)
    coll.delete('one')
    ok(!coll.has('one'))
    is(coll.get('one'), undefined)
  }()

  void function test_only_own_enum_properties() {
    const coll = new j.EqDict().set('one', 10)
    Object.defineProperty(coll, 'two', {value: 20})

    ok(!coll.has('has'))
    ok(!coll.has('get'))
    ok(!coll.has('two'))

    is(coll.get('has'), undefined)
    is(coll.get('get'), undefined)
    is(coll.get('two'), undefined)

    is(coll.two, 20)
  }()

  void function test_dict_keys_are_order_independent() {
    const coll = new j.EqDict()
    coll.set({one: 10, two: 20}, 'val')
    const val = coll.get({two: 20, one: 10})
    is(val, 'val')
  }()

  void function test_json_encode() {
    eq(
      JSON.stringify(new j.EqDict().set('one', 10).set('two', 20)),
      String.raw`{"\"one\"":10,"\"two\"":20}`,
    )
  }()

  void function test_json_reversible() {
    const prev = new j.EqDict().set('one', 10).set('two', 20)
    const next = new j.EqDict(JSON.parse(JSON.stringify(prev)))
    eq(prev, next)
    eq({...next}, {'"one"': 10, '"two"': 20})
  }()

  void function test_avoid_conflict_in_set() {
    const coll = new class extends j.EqDict {null() {}}()

    Object.defineProperty(coll, '10', {value: 20, enumerable: false})
    throws(coll.set.bind(coll, 10, 30), Error, `conflict`)
    is(coll[10], 20)

    throws(() => coll.set(null, ''), Error, `conflict`)
    is(typeof coll.null, 'function')
  }()

  void function test_avoid_conflict_in_delete() {
    const coll = new class extends j.EqDict {null() {}}()

    Object.defineProperty(coll, '10', {value: 20, enumerable: false})
    ok(!coll.delete(10))
    is(coll[10], 20)

    ok(!coll.delete(null))
    is(typeof coll.null, 'function')
  }()

  void function test_forEach() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)

    const stashed = []
    function stash(...args) {stashed.push(args)}

    coll.forEach(stash)
    eq(stashed, [[10, 'one', coll], [20, 'two', coll]])
  }()

  void function test_keys() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    eq([...coll.keys()], ['one', 'two'])
  }()

  void function test_values() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    eq([...coll.values()], [10, 20])
  }()

  void function test_entries() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    eq([...coll.entries()], [['one', 10], ['two', 20]])
  }()

  void function test_iterator() {
    const coll = new j.EqDict().set('one', 10).set('two', 20)
    eq([...coll], [['one', 10], ['two', 20]])
  }()
}()

void function test_ClsSet() {
  class Mock {constructor(val) {j.assign(this, val)}}
  class MockSet extends j.ClsSet {get cls() {return Mock}}

  // These rejections originate in `j.assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    const coll = new MockSet()

    throws(() => coll.add('one'),     TypeError, `satisfy test isStruct`)
    throws(() => coll.add(10),        TypeError, `satisfy test isStruct`)
    throws(() => coll.add(nop),       TypeError, `satisfy test isStruct`)
    throws(() => coll.add([]),        TypeError, `satisfy test isStruct`)
    throws(() => coll.add(new Map()), TypeError, `type mismatch`)
  }()

  void function test_instantiation_in_constructor() {
    ok([...new MockSet([undefined])][0] instanceof Mock)
  }()

  void function test_instantiation_on_push() {
    const coll = new MockSet()
    coll.add({})
    ok([...coll][0] instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    const val = new Mock({})
    const coll = new MockSet([val])
    is([...coll][0], val)
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

  is(que.size, 2)
  is(count, 0)

  que.flush()
  is(que.size, 0)
  is(count, 2)

  que.add(effect0)
  que.add(effect1)
  is(que.size, 0)
  is(count, 4)

  que.pause()
  que.add(effect0)
  que.add(effect1)
  is(que.size, 2)
  is(count, 4)

  que.flush()
  is(que.size, 0)
  is(count, 6)
}()

void function test_assign() {
  void function test_reject_invalid_inputs() {
    throws(() => j.assign(),             TypeError, `satisfy test isStruct`)
    throws(() => j.assign(null, {}),     TypeError, `satisfy test isStruct`)
    throws(() => j.assign(10, {}),       TypeError, `satisfy test isStruct`)
    throws(() => j.assign('one', {}),    TypeError, `satisfy test isStruct`)
    throws(() => j.assign('one', 'one'), TypeError, `satisfy test isStruct`)
    throws(() => j.assign([], {}),       TypeError, `satisfy test isStruct`)
    throws(() => j.assign([], []),       TypeError, `satisfy test isStruct`)
    throws(() => j.assign(nop, {}),      TypeError, `satisfy test isStruct`)
    throws(() => j.assign(nop, nop),     TypeError, `satisfy test isStruct`)
    throws(() => j.assign({}, 10),       TypeError, `satisfy test isStruct`)
    throws(() => j.assign({}, 'one'),    TypeError, `satisfy test isStruct`)
    throws(() => j.assign({}, []),       TypeError, `satisfy test isStruct`)
    throws(() => j.assign({}, nop),      TypeError, `satisfy test isStruct`)
    throws(() => j.assign({}, []),       TypeError, `satisfy test isStruct`)
  }()

  void function test_returns_target() {
    class Mock {}
    const tar = new Mock()
    is(j.assign(tar, {}), tar)
  }()

  void function test_allow_nil() {
    class Mock {}

    function test(val) {
      const tar = new Mock()
      is(j.assign(tar, val), tar)
      eq({...tar}, {})
    }

    test(null)
    test(undefined)
  }()

  void function test_allow_plainest_dict() {
    class Mock {}
    const tar = new Mock()
    is(j.assign(tar, Object.create(null, {one: {value: 10, enumerable: true}})), tar)
    eq({...tar}, {one: 10})
  }()

  void function test_allow_plain_dict() {
    class Mock {}
    const tar = new Mock()
    is(j.assign(tar, {one: 10}), tar)
    eq({...tar}, {one: 10})
  }()

  void function test_allow_subclass() {
    class Sup {}
    const tar = new Sup()

    class Sub extends Sup {}
    const src = Object.assign(new Sub(), {one: 10})

    is(j.assign(tar, src), tar)
    eq({...tar}, {one: 10})
  }()

  void function test_no_shadowing() {
    void function test_plain_object() {
      const ref = {one: 10, two: 20}

      is(
        j.assign(ref, {constructor: 30, toString: 40, two: 50, three: 60}),
        ref,
      )

      eq(Object.getOwnPropertyNames(ref), [`one`, `two`, `three`])
      eq(ref, {one: 10, two: 50, three: 60})

      is(ref.constructor, Object)
      is(ref.toString, Object.prototype.toString)
    }()

    void function test_custom_class() {
      class Mock {
        constructor() {
          this.one = 10
          this.two = 20
          Object.defineProperty(this, `three`, {
            value: 30,
            writable: true,
            enumerable: false,
            configurable: true,
          })
        }

        method() {return 40}
        get getter() {return 50}
        get getterSetter() {return 60}
        set getterSetter(_) {throw Error(`unreachable`)}
      }

      const ref = new Mock()

      is(
        j.assign(ref, {
          constructor:  70,
          toString:     80,
          method:       90,
          getter:       100,
          getterSetter: 110,
          two:          120,
          three:        130,
          four:         140,
        }),
        ref,
      )

      eq(Object.getOwnPropertyNames(ref), [`one`, `two`, `three`, `four`])
      eq({...ref}, {one: 10, two: 120, four: 140})

      is(ref.constructor, Mock)
      is(ref.toString, Object.prototype.toString)
      is(ref.three, 30)
      is(ref.method(), 40)
      is(ref.getter, 50)
      is(ref.getterSetter, 60)
    }()
  }()
}()

void function test_inst() {
  // These rejections originate in `j.assign`.
  // We're testing the fact of calling the constructor.
  void function test_indirectly_reject_invalid_inputs() {
    class Mock {constructor(val) {j.assign(this, val)}}

    throws(() => j.inst(),                 TypeError)
    throws(() => j.inst('one',     Mock),  TypeError)
    throws(() => j.inst(10,        Mock),  TypeError)
    throws(() => j.inst(nop,       Mock),  TypeError)
    throws(() => j.inst([],        Mock),  TypeError)
    throws(() => j.inst(new Set(), Mock),  TypeError)
  }()

  void function test_instantiate_from_dict() {
    class Mock {}
    ok(j.inst({}, Mock) instanceof Mock)
  }()

  void function test_preserve_pre_instantiated() {
    class Mock {}
    const val = new Mock()
    is(j.inst(val, Mock),                 val)
    is(j.inst(j.inst(val, Mock), Mock), val)
  }()

  void function test_upgrade_to_subclass() {
    class Sup {}
    class Sub extends Sup {}
    is(j.inst(new Sup(), Sub).constructor, Sub)
  }()
}()

void function test_opt() {
  class Mock {constructor(val) {this.val = val}}
  is(j.opt(null, Mock), null)
  is(j.opt(undefined, Mock), undefined)
  ok(j.opt(10, Mock) instanceof Mock)
  eq({...j.opt(10, Mock)}, {val: 10})
}()

void function test_toKey() {
  is(j.toKey(),                            ``)
  is(j.toKey(null),                        `null`)
  is(j.toKey('one'),                       `"one"`)
  is(j.toKey(10),                          `10`)
  is(j.toKey(NaN),                         `null`)
  is(j.toKey({}),                          `{}`)
  is(j.toKey([]),                          `[]`)
  is(j.toKey([{}]),                        `[{}]`)
  is(j.toKey({one: 10, two: 20}),          `{"one":10,"two":20}`)
  is(j.toKey({two: 10, one: 20}),          `{"one":20,"two":10}`)
  is(j.toKey([{one: 10, two: 20}]),        `[{"one":10,"two":20}]`)
  is(j.toKey([{two: 10, one: 20}]),        `[{"one":20,"two":10}]`)
  is(j.toKey({one: {two: 10, three: 20}}), `{"one":{"three":20,"two":10}}`)
  is(j.toKey({one: {three: 10, two: 20}}), `{"one":{"three":10,"two":20}}`)
  is(j.toKey({one: j.toKey}),              `{"one":null}`)
  is(j.toKey(j.toKey),                     `null`)
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

function testJsonReversible(Cls) {
  eq(
    JSON.stringify(new Cls({one: 10, two: `three`})),
    `{"one":10,"two":"three"}`
  )

  eq(
    JSON.parse(JSON.stringify(new Cls({one: 10, two: `three`}))),
    {one: 10, two: `three`},
  )

  eq(
    new Cls(JSON.parse(JSON.stringify(new Cls({one: 10, two: `three`})))),
    new Cls({one: 10, two: `three`}),
  )
}

console.log(`[test] ok`)
