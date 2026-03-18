#include "airpods.hpp"

#include <algorithm>
#include <chrono>
#include <string>
#include <unordered_map>
#include <utility>
#include <memory>
#include <map>

namespace Airpods {

    namespace {
        constexpr std::chrono::seconds TTL(8);
        std::unordered_map<long long, ProximityTTL> fingers_;

        int to_percent(uint8_t level) {
            return (level <= 10) ? static_cast<int>(level) * 10 : -1;
        }

        DeviceModel to_device_model(uint16_t code) {
            switch (code) {
                case 0x0220: return DeviceModel::AirPods1;
                case 0x0f20: return DeviceModel::AirPods2;
                case 0x1320: return DeviceModel::AirPods3;
                case 0x0e20: return DeviceModel::AirPodsPro;
                case 0x1420: return DeviceModel::AirPodsPro2;
                case 0x0a20: return DeviceModel::AirPodsMax;
                default: return DeviceModel::Unknown;
            }
        }

        DeviceUtp to_device_utp(uint8_t b) {
            if ((b & (0x01 << 0x02)) != 0) return DeviceUtp::BothCase;
            if ((b & (0x01 << 0x03)) != 0) return DeviceUtp::BothEar;
            if ((b & (0x01 << 0x01)) != 0) return DeviceUtp::OneInEar;
            if ((b & (0x01 << 0x04)) != 0) return DeviceUtp::OneInCase;
            return DeviceUtp::Unknown;
        }

        DeviceMode to_device_mode(uint8_t b) {
            if (b == 0x00) return DeviceMode::Pairing;
            if (b == 0x01) return DeviceMode::Paired;
            return DeviceMode::Unknown;
        }

        DeviceColor to_device_color(uint8_t b) {
            switch (b) {
                case 0x00: return DeviceColor::White;
                case 0x01: return DeviceColor::Black;
                case 0x02: return DeviceColor::Red;
                case 0x03: return DeviceColor::Blue;
                case 0x04: return DeviceColor::Pink;
                case 0x05: return DeviceColor::Gray;
                case 0x06: return DeviceColor::Silver;
                case 0x07: return DeviceColor::Gold;
                case 0x08: return DeviceColor::RoseGold;
                case 0x09: return DeviceColor::SpaceGray;
                case 0x0a: return DeviceColor::DarkBlue;
                case 0x0b: return DeviceColor::LightBlue;
                case 0x0c: return DeviceColor::Yellow;
                default: return DeviceColor::Unknown;
            }
        }

        DeviceBattery to_device_battery(std::vector<uint8_t> b) {
            DeviceBattery battery{};

            const auto flags = static_cast<uint8_t>(b[1] >> 4);

            auto right_level = uint8_t(b[0] & 0x0f);
            auto left_level = uint8_t((b[0] >> 0x04) & 0x0f);
            auto case_level = uint8_t(b[1] & 0x0f);

            battery.left_charging = (flags & 0b0001) != 0;
            battery.right_charging = (flags & 0b0010) != 0;
            battery.case_charging = (flags & 0b0100) != 0;

            battery.case_percent = to_percent(case_level);
            battery.right_percent = to_percent(right_level);
            battery.left_percent = to_percent(left_level);

            return battery;
        }

        void insert_finger(const Proximity& finger) {
            auto it = std::find_if(fingers_.begin(), fingers_.end(), [&](const auto& pair) {
                return pair.second.proximity.similar(finger);
            });

            const auto now = std::chrono::steady_clock::now();

            if (it != fingers_.end()) {
                it->second.proximity = finger;
                it->second.seen = now;
                return;
            }

            auto clock_now = std::chrono::system_clock::now();
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                clock_now.time_since_epoch()
            ).count();

            ProximityTTL ttl{
                .proximity = finger,
                .seen = now,
                .timestamp = timestamp,
            };

            fingers_.insert({ttl.timestamp, ttl});
        }

        void clean_up_fingers_() {
            const auto now = std::chrono::steady_clock::now();
            std::erase_if(fingers_, [&](const auto& pair) {
                const auto& ttl = pair.second;
                return (now - ttl.seen) >= TTL;
            });
        }
    }

    bool Proximity::similar(const Proximity& other) const {
        constexpr int RSSI_NEARBY = 12;
        if (model != other.model || color != other.color) return false;
        size_t score = 0;
        if (battery.left_charging == other.battery.left_charging) score += 1;
        if (battery.right_charging == other.battery.right_charging) score += 1;
        if (battery.case_charging == other.battery.case_charging) score += 1;
        if (battery.left_percent == other.battery.left_percent) score += 1;
        if (battery.right_percent == other.battery.right_percent) score += 1;
        if (battery.case_percent == other.battery.case_percent) score += 1;
        if (utp == other.utp) score += 1;
        if (mode == other.mode) score += 1;
        if (std::abs(rssi - other.rssi) <= RSSI_NEARBY) score += 1;
        return score >= 7;
    }

    std::optional<Proximity> Proximity::parse(const int rssi, const std::map<uint16_t, SimpleBLE::ByteArray>& manu_) {
        if (!manu_.contains(Airpods::AIRPODS_MANUFACTURER)) return std::nullopt;
        auto data = manu_.at(Airpods::AIRPODS_MANUFACTURER);
        if (data.size() <= 3 || data[0] != Airpods::APPLE_MAGIC) return std::nullopt;

        Proximity p{};
        p.mode = to_device_mode(data[2]);
        if (p.mode == DeviceMode::Pairing) {
            if (data[1] != Airpods::PAIRING_PROTOCOL_LENGTH) return std::nullopt;
            p.model = to_device_model(static_cast<uint16_t>(data[3]) << 8 | static_cast<uint16_t>(data[4]));
            p.color = to_device_color(data[16]);
            p.rssi = rssi;
        } else if (p.mode == DeviceMode::Paired) {
            if (data[1] != Airpods::PAIRED_PROTOCOL_LENGTH) return std::nullopt;
            p.model = to_device_model(static_cast<uint16_t>(data[3]) << 8 | static_cast<uint16_t>(data[4]));
            p.color = to_device_color(data[9]);
            p.battery = to_device_battery({data[6], data[7]});
            p.utp = to_device_utp(data[5]);
            p.rssi = rssi;

            const bool flipped = (data[5] & (0x01 << 0x06)) != 0;
            if (flipped) {
                std::swap(p.battery.left_percent, p.battery.right_percent);
                std::swap(p.battery.left_charging, p.battery.right_charging);
            }
        } else {
            return std::nullopt;
        }

        {
            std::lock_guard lg(Airpods::AIRPODS_MUTEX);
            insert_finger(p);
        }

        return p;
    }

    std::unordered_map<long long, ProximityTTL> fingers() {
        return fingers_;
    }

    void clean_up_fingers() {
        std::lock_guard lg(Airpods::AIRPODS_MUTEX);
        clean_up_fingers_();
    }
}