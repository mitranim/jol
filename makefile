MAKEFLAGS := --silent --always-make
PAR := $(MAKE) -j 128
TEST := jol_test.mjs

test-w:
	deno run --watch $(TEST)

test:
	deno run $(TEST)

prep: test
