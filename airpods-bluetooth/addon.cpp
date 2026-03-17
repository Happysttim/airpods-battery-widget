#include <napi.h>
#include "airpods-bluetooth.hpp"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    return AirpodsBluetooth::Init(env, exports);
}

NODE_API_MODULE(airpods_bluetooth, InitAll)