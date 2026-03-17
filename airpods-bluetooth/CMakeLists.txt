cmake_minimum_required(VERSION 3.21)
project(airpods-bluetooth VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT DEFINED CMAKE_JS_INC)
  message(FATAL_ERROR "CMAKE_JS_INC is not set. Build this project with cmake-js.")
endif()

include(FetchContent)

FetchContent_Declare(
  simpleble
  GIT_REPOSITORY https://github.com/simpleble/simpleble.git
  GIT_TAG v0.12.1
  GIT_SHALLOW YES
)
FetchContent_GetProperties(simpleble)

if(NOT simpleble_POPULATED)
    FetchContent_MakeAvailable(simpleble)
    list(APPEND CMAKE_MODULE_PATH "${simpleble_SOURCE_DIR}/cmake/find")
    add_subdirectory("${simpleble_SOURCE_DIR}/simpleble" "${simpleble_BINARY_DIR}")
endif()

execute_process(
  COMMAND node -p "require('node-addon-api').include"
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  OUTPUT_VARIABLE NODE_ADDON_API_DIR
  OUTPUT_STRIP_TRAILING_WHITESPACE
)

string(REPLACE "\"" "" NODE_ADDON_API_DIR "${NODE_ADDON_API_DIR}")

add_library(
  airpods-bluetooth SHARED
  addon.cpp
  airpods-bluetooth.cpp
  airpods.cpp
  ${CMAKE_JS_SRC}
)

set_target_properties(airpods-bluetooth PROPERTIES
  PREFIX ""
  SUFFIX ".node"
)

target_include_directories(airpods-bluetooth PRIVATE
  ${CMAKE_JS_INC}
  "${NODE_ADDON_API_DIR}"
)

target_link_libraries(airpods-bluetooth PRIVATE
  simpleble::simpleble
  ${CMAKE_JS_LIB}
)

target_compile_definitions(airpods-bluetooth PRIVATE
  NAPI_VERSION=8
  NAPI_CPP_EXCEPTIONS
)

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
  execute_process(
    COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS}
  )
endif()

if(TARGET simpleble)
  target_compile_features(simpleble PUBLIC cxx_std_17)
endif()