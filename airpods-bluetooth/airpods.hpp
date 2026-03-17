#pragma once
#include <cstdint>
#include <optional>
#include <chrono>
#include <utility>
#include <unordered_map>
#include <mutex>
#include <simpleble/Types.h>
#include <vector>
#include <map>

namespace Airpods {
    constexpr inline uint16_t AIRPODS_MANUFACTURER = 76;
    constexpr inline uint8_t APPLE_MAGIC = 0x07;

    constexpr inline uint8_t PAIRING_PROTOCOL_LENGTH = 15;
    constexpr inline uint8_t PAIRED_PROTOCOL_LENGTH = 25;

    inline std::mutex AIRPODS_MUTEX; 

    enum class DeviceModel : uint16_t {
        Unknown = 0xffff,
        AirPods1 = 0x0220,
        AirPods2 = 0x0f20,
        AirPods3 = 0x1320,
        AirPodsPro = 0x0e20,
        AirPodsPro2 = 0x1420,
        AirPodsMax = 0x0a20,
    };

    enum class DeviceUtp : uint8_t {
        OneInEar = 0x00,
        BothCase = 0x01,
        BothEar = 0x02,
        OneInCase = 0x03,
        Unknown = 0xff,
    };

    enum class DeviceMode : uint8_t {
        Pairing = 0x00,
        Paired = 0x01,
        Unknown = 0xff,
    };

    enum class DeviceColor : uint8_t {
        White = 0x00,
        Black = 0x01,
        Red = 0x02,
        Blue = 0x03,
        Pink = 0x04,
        Gray = 0x05,
        Silver = 0x06,
        Gold = 0x07,
        RoseGold = 0x08,
        SpaceGray = 0x09,
        DarkBlue = 0x0A,
        LightBlue = 0x0B,
        Yellow = 0x0C,
        Unknown = 0xFF,
    };

    struct DeviceBattery {
        int case_percent = 0;
        int right_percent = 0;
        int left_percent = 0;

        bool left_charging = false;
        bool right_charging = false;
        bool case_charging = false;

        bool operator==(const DeviceBattery& other) const = default;
    };

    struct Proximity {
        DeviceBattery battery;
        DeviceColor color = DeviceColor::Unknown;
        DeviceModel model = DeviceModel::Unknown;
        DeviceUtp utp = DeviceUtp::Unknown;
        DeviceMode mode = DeviceMode::Unknown;
        int rssi;

        bool similar(const Proximity& other) const;
        static std::optional<Proximity> parse(const int rssi, const std::map<uint16_t, SimpleBLE::ByteArray>& data);
    };

    struct ProximityTTL {
        using TimePoint = std::chrono::steady_clock::time_point;
        Proximity proximity;
        TimePoint seen;
        long long timestamp;
    };

    std::unordered_map<long long, ProximityTTL> fingers();
    void clean_up_fingers();
}