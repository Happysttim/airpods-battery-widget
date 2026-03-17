#include "airpods-bluetooth.hpp"
#include <chrono>
#include <thread>
#include <utility>

Napi::FunctionReference AirpodsBluetooth::functionRef;

Napi::Object AirpodsBluetooth::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function ctor = DefineClass(env, "AirpodsBluetooth", {
        InstanceMethod("scanAdapters", &AirpodsBluetooth::ScanAdapters),
        InstanceMethod("setAdapter", &AirpodsBluetooth::SetAdapter),
        InstanceMethod("startScan", &AirpodsBluetooth::StartScan),
        InstanceMethod("stopScan", &AirpodsBluetooth::StopScan),
        InstanceMethod("fingers", &AirpodsBluetooth::Fingers),
        InstanceMethod("isScan", &AirpodsBluetooth::IsScan),
        InstanceMethod("onScanFound", &AirpodsBluetooth::OnScanFound),
        InstanceMethod("startClean", &AirpodsBluetooth::StartClean),
        InstanceMethod("stopClean", &AirpodsBluetooth::StopClean),
        InstanceAccessor("interval", &AirpodsBluetooth::GetInterval, &AirpodsBluetooth::SetInterval),
        InstanceAccessor("cleanUp", &AirpodsBluetooth::GetCleanUp, &AirpodsBluetooth::SetCleanUp),
    });

    functionRef = Napi::Persistent(ctor);
    functionRef.SuppressDestruct();

    exports.Set("AirpodsBluetooth", ctor);
    return exports;
}

Napi::Object AirpodsBluetooth::From(Napi::Env env, Napi::Value arg) {
    return arg.As<Napi::Object>();
}

AirpodsBluetooth::AirpodsBluetooth(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<AirpodsBluetooth>(info) {
}

AirpodsBluetooth::~AirpodsBluetooth() {
    scanning_.store(false);
    cleaning_.store(false);

    if (adapter_.has_value() && adapter_->scan_is_active()) {
        adapter_->scan_stop();
    }

    if (scanningThread_.joinable()) {
        scanningThread_.join();
    }

    if (cleanUpThread_.joinable()) {
        cleanUpThread_.join();
    }

    if (scanFound_.has_value()) {
        scanFound_->Abort();
        scanFound_->Release();
        scanFound_.reset();
    }
}

Napi::Value AirpodsBluetooth::GetInterval(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), intervalMs_);
}

void AirpodsBluetooth::SetInterval(const Napi::CallbackInfo& info, const Napi::Value& value) {
    if (!value.IsNumber()) {
        Napi::TypeError::New(info.Env(), "interval must be a number").ThrowAsJavaScriptException();
        return;
    }

    intervalMs_ = value.As<Napi::Number>().Int32Value();
}

Napi::Value AirpodsBluetooth::GetCleanUp(const Napi::CallbackInfo& info) {
    return Napi::Number::New(info.Env(), cleanUpSec_);
}

void AirpodsBluetooth::SetCleanUp(const Napi::CallbackInfo& info, const Napi::Value& value) {
    if (!value.IsNumber()) {
        Napi::TypeError::New(info.Env(), "cleanUp must be a number").ThrowAsJavaScriptException();
        return;
    }

    cleanUpSec_ = value.As<Napi::Number>().Int32Value();
}

Napi::Value AirpodsBluetooth::ScanAdapters(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    auto adapters = SimpleBLE::Adapter::get_adapters();
    Napi::Array result = Napi::Array::New(env, adapters.size());

    for (size_t i = 0; i < adapters.size(); ++i) {
        Napi::Object item = Napi::Object::New(env);
        item.Set("index", Napi::Number::New(env, static_cast<uint32_t>(i)));
        item.Set("identifier", Napi::String::New(env, adapters[i].identifier()));
        item.Set("address", Napi::String::New(env, adapters[i].address()));
        item.Set("bluetoothEnabled", Napi::Boolean::New(env, adapters[i].bluetooth_enabled()));
        result.Set(i, item);
    }

    return result;
}

void AirpodsBluetooth::SetAdapter(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "adapter index required").ThrowAsJavaScriptException();
        return;
    }

    auto adapters = SimpleBLE::Adapter::get_adapters();
    const auto index = info[0].As<Napi::Number>().Uint32Value();

    if (index >= adapters.size()) {
        Napi::RangeError::New(env, "invalid adapter index").ThrowAsJavaScriptException();
        return;
    }

    if (!adapters[index].bluetooth_enabled()) {
        Napi::Error::New(env, "adapter bluetooth disabled").ThrowAsJavaScriptException();
        return;
    }

    adapter_ = adapters[index];
    return;
}

void AirpodsBluetooth::CleanUpLoop() {
    while (cleaning_.load()) {
        std::this_thread::sleep_for(std::chrono::seconds(cleanUpSec_));
        Airpods::clean_up_fingers();
    }
}

void AirpodsBluetooth::Scanning() {
    if (!adapter_.has_value()) {
        scanning_.store(false);
        return;
    }

    if (adapter_.has_value() && !adapter_->scan_is_active()) {
        adapter_->scan_for(intervalMs_);
    }

    scanning_.store(false);
}

void AirpodsBluetooth::OnScanFound(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "callback function expected").ThrowAsJavaScriptException();
        return;
    }

    if (scanFound_.has_value()) {
        scanFound_->Abort();
        scanFound_->Release();
        scanFound_.reset();
    }

    Napi::Function callback = info[0].As<Napi::Function>();

    scanFound_ = Napi::ThreadSafeFunction::New(
        env,
        callback,
        "AirpodsBluetooth.onScanFound",
        0,
        1
    );

    return;
}

void AirpodsBluetooth::StartClean(const Napi::CallbackInfo& info) {
    if (!cleaning_.load()) {
        cleaning_.store(true);
        if (cleanUpThread_.joinable()) {
            cleanUpThread_.join();
        }
        cleanUpThread_ = std::thread(&AirpodsBluetooth::CleanUpLoop, this);
    }
}

void AirpodsBluetooth::StopClean(const Napi::CallbackInfo& info) {
    cleaning_.store(false);

    if (cleanUpThread_.joinable()) {
        cleanUpThread_.join();
    }
}

void AirpodsBluetooth::StartScan(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (!adapter_.has_value()) {
        Napi::Error::New(env, "adapter is not set").ThrowAsJavaScriptException();
        return;
    }

    if (scanning_.load()) {
        return;
    }

    if (scanningThread_.joinable()) {
        scanningThread_.join();
    }

    adapter_->set_callback_on_scan_found([this](SimpleBLE::Peripheral p) {
        if (!scanning_.load()) {
            return;
        }

        auto m = p.manufacturer_data();
        auto opt = Airpods::Proximity::parse(p.rssi(), m);
        if (!opt) {
            return;
        }

        const auto proximity = *opt;

        if (!scanFound_.has_value()) {
            return;
        }

        auto* payload = new Airpods::Proximity(proximity);

        napi_status status = scanFound_->NonBlockingCall(
            payload,
            [](Napi::Env env, Napi::Function jsCallback, Airpods::Proximity* data) {
                Napi::Object obj = Napi::Object::New(env);
                Napi::Object battery = Napi::Object::New(env);
                
                battery.Set("leftPercent", Napi::Number::New(env, data->battery.left_percent));
                battery.Set("rightPercent", Napi::Number::New(env, data->battery.right_percent));
                battery.Set("casePercent", Napi::Number::New(env, data->battery.case_percent));

                battery.Set("leftCharging", Napi::Boolean::New(env, data->battery.left_charging));
                battery.Set("rightCharging", Napi::Boolean::New(env, data->battery.right_charging));
                battery.Set("caseCharging", Napi::Boolean::New(env, data->battery.case_charging));

                obj.Set("battery", battery);
                obj.Set("color", Napi::Number::New(env, static_cast<uint32_t>(data->color)));
                obj.Set("model", Napi::Number::New(env, static_cast<uint32_t>(data->model)));
                obj.Set("utp", Napi::Number::New(env, static_cast<uint32_t>(data->utp)));
                obj.Set("mode", Napi::Number::New(env, static_cast<uint32_t>(data->mode)));
                obj.Set("rssi", Napi::Number::New(env, data->rssi));

                jsCallback.Call({obj});
                delete data;
            }
        );

        if (status != napi_ok) {
            delete payload;
        }
    });

    scanning_.store(true);
    scanningThread_ = std::thread(&AirpodsBluetooth::Scanning, this);
}

Napi::Value AirpodsBluetooth::Fingers(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    const auto fingers = Airpods::fingers();
    Napi::Object result = Napi::Object::New(env);

    for (const auto& pair : fingers) {
        const auto& p = pair.second.proximity;

        Napi::Object obj = Napi::Object::New(env);
        Napi::Object battery = Napi::Object::New(env);
        battery.Set("leftPercent", Napi::Number::New(env, p.battery.left_percent));
        battery.Set("rightPercent", Napi::Number::New(env, p.battery.right_percent));
        battery.Set("casePercent", Napi::Number::New(env, p.battery.case_percent));

        battery.Set("leftCharging", Napi::Boolean::New(env, p.battery.left_charging));
        battery.Set("rightCharging", Napi::Boolean::New(env, p.battery.right_charging));
        battery.Set("caseCharging", Napi::Boolean::New(env, p.battery.case_charging));

        obj.Set("battery", battery);
        obj.Set("color", Napi::Number::New(env, static_cast<uint32_t>(p.color)));
        obj.Set("model", Napi::Number::New(env, static_cast<uint32_t>(p.model)));
        obj.Set("utp", Napi::Number::New(env, static_cast<uint32_t>(p.utp)));
        obj.Set("mode", Napi::Number::New(env, static_cast<uint32_t>(p.mode)));
        obj.Set("timestamp", Napi::Number::New(env, static_cast<long long>(pair.second.timestamp)));
        obj.Set("rssi", Napi::Number::New(env, p.rssi));

        result.Set(Napi::Number::New(env, static_cast<long long>(pair.first)), obj);
    }

    return result;
}

void AirpodsBluetooth::StopScan(const Napi::CallbackInfo& info) {
    scanning_.store(false);

    if (adapter_.has_value() && adapter_->scan_is_active()) {
        adapter_->scan_stop();
    }

    if (scanningThread_.joinable()) {
        scanningThread_.join();
    }
}

Napi::Value AirpodsBluetooth::IsScan(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), scanning_.load());
}