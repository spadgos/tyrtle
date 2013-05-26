TMP_DIR=tmp
SRC_DIR=src
BUILD_OPTIONS=build/build.js
RJS=r.js

all: install build

install:
	npm install

build: combine

convert:
	$(RJS) -convert $(SRC_DIR) $(TMP_DIR)

combine: convert
	$(RJS) -o $(BUILD_OPTIONS) baseUrl=$(TMP_DIR)

clean:
	rm -rf $(TMP_DIR)
