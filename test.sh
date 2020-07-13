yarn jest
export COVERALLS_FLAG_NAME=unit
coveralls < coverage/lcov.info -v