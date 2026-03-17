#ifndef AIRPODS_BLUETOOTH_H
#define AIRPODS_BLUETOOTH_H

#include <thread>
#include <atomic>
#include <optional>
#include <vector>

#include <simpleble/SimpleBLE.h>
#include <simpleble/Types.h>
#include <napi.h>

#include "airpods.hpp"

class AirpodsBluetooth : public Napi::ObjectWrap<AirpodsBluetooth> {
    public:
        static Napi::FunctionReference functionRef;
        static Napi::Object Init(Napi::Env env, Napi::Object exports);
        static Napi::Object From(Napi::Env env, Napi::Value arg);

        AirpodsBluetooth(const Napi::CallbackInfo& info);
        ~AirpodsBluetooth();

    private:
        Napi::Value GetInterval(const Napi::CallbackInfo& info);
        void SetInterval(const Napi::CallbackInfo& info, const Napi::Value& value);

        Napi::Value GetCleanUp(const Napi::CallbackInfo& info);
        void SetCleanUp(const Napi::CallbackInfo& info, const Napi::Value& value);

        Napi::Value ScanAdapters(const Napi::CallbackInfo& info);
        void SetAdapter(const Napi::CallbackInfo& info);
        void StartScan(const Napi::CallbackInfo& info);
        Napi::Value Fingers(const Napi::CallbackInfo& info);
        void StopScan(const Napi::CallbackInfo& info);
        Napi::Value IsScan(const Napi::CallbackInfo& info);
        void OnScanFound(const Napi::CallbackInfo& info);
        void StartClean(const Napi::CallbackInfo& info);
        void StopClean(const Napi::CallbackInfo& info);

        void CleanUpLoop();
        void Scanning();

    private:
        int intervalMs_ = 5000;
        int cleanUpSec_ = 5;

        std::atomic<bool> scanning_{false};
        std::atomic<bool> cleaning_{false};

        std::optional<SimpleBLE::Adapter> adapter_;
        std::thread cleanUpThread_;
        std::thread scanningThread_;
        std::optional<Napi::ThreadSafeFunction> scanFound_{std::nullopt};
};

#endif