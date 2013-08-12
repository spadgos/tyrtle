TMP_DIR=tmp
SRC_DIR=src
BUILD_OPTIONS_DIR=build
BUILD_OPTIONS=$(BUILD_OPTIONS_DIR)/build.js
RJS=node_modules/.bin/r.js

all: build

build: combine clean

convert: $(RJS)
	$(RJS) -convert $(SRC_DIR) $(TMP_DIR)

combine: $(RJS) convert
	$(RJS) -o $(BUILD_OPTIONS) baseUrl=$(TMP_DIR)

clean:
	rm -rf $(TMP_DIR)

coverage: build clean
	jscoverage                             \
	  --exclude=.git                       \
	  --no-instrument=jquery.js            \
	  --no-instrument=renderers            \
	  --no-instrument=node_modules         \
	  --no-instrument=demo                 \
	  --no-instrument=test/vendor          \
	  --no-instrument=$(SRC_DIR)           \
	  --no-instrument=$(BUILD_OPTIONS_DIR) \
	  --no-instrument=$(TMP_DIR)           \
	  .                                    \
	  ../tyrtle-coverage

minify: convert
	$(RJS) -o $(BUILD_OPTIONS) baseUrl=$(TMP_DIR) optimize=uglify out=Tyrtle.mini.js


$(RJS):
	npm install
