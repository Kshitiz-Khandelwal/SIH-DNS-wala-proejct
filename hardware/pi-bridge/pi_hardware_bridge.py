"""
DNS Shield X-Forecast — Raspberry Pi Hardware Sentinel Bridge Daemon
====================================================================
Runs on Raspberry Pi / Edge Gateway to bridge between the FastAPI Threat
Forecasting Engine and the Zephyr RTOS Microcontroller over UART/USB-Serial.
Includes automatic mock fallback for laptop development and live demo.
"""

import os
import sys
import time
import json
import logging
import argparse
import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [PI-BRIDGE] %(message)s")
logger = logging.getLogger("pi-bridge")


class PiHardwareBridge:
    def __init__(self, api_url: str = "http://localhost:8000", serial_port: str = "/dev/ttyACM0", baud_rate: int = 115200):
        self.api_url = api_url.rstrip("/")
        self.serial_port = serial_port
        self.baud_rate = baud_rate
        self.serial_conn = None
        self.mock_mode = False

        self._init_serial()

    def _init_serial(self):
        try:
            import serial
            self.serial_conn = serial.Serial(self.serial_port, self.baud_rate, timeout=1)
            logger.info(f"Connected to physical Zephyr RTOS MCU on {self.serial_port} @ {self.baud_rate} baud")
        except Exception as e:
            self.mock_mode = True
            logger.warning(f"Physical serial port {self.serial_port} unavailable ({e}). Operating in High-Fidelity Mock Sentinel Mode.")

    def send_command_to_mcu(self, command_dict: dict):
        """Send formatted JSON packet or binary command to Zephyr RTOS."""
        payload = json.dumps(command_dict) + "\n"
        if not self.mock_mode and self.serial_conn:
            try:
                self.serial_conn.write(payload.encode("utf-8"))
            except Exception as e:
                logger.error(f"Serial write error: {e}")
        else:
            # Emulate MCU serial terminal receipt
            logger.info(f"[MCU RX] State Sync -> Stage: {command_dict.get('stage')} | RGB: {command_dict.get('rgb')} | Relay: {command_dict.get('relay')}")

    def run_sync_loop(self, poll_interval_sec: float = 3.0):
        logger.info(f"Starting continuous synchronization loop with {self.api_url}...")
        while True:
            try:
                # 1. Fetch current threat forecast
                resp = requests.get(f"{self.api_url}/api/v1/forecast/timeline", timeout=2)
                if resp.status_code == 200:
                    data = resp.json()
                    current_stage = data.get("current_stage", "STAGE_0_BENIGN")
                    threat_score = data.get("overall_threat_score", 0)
                    relay_req = data.get("hardware_relay_required", False)

                    # 2. Derive RGB and Relay state
                    if relay_req:
                        rgb = "FLASH_RED"
                        relay = "ISOLATED"
                    elif threat_score > 70:
                        rgb = "PULSE_AMBER"
                        relay = "ARMED"
                    elif threat_score > 30:
                        rgb = "PULSE_YELLOW"
                        relay = "ARMED"
                    else:
                        rgb = "SOLID_GREEN"
                        relay = "ARMED"

                    # 3. Transmit to MCU
                    mcu_packet = {
                        "timestamp": time.time(),
                        "stage": current_stage,
                        "score": threat_score,
                        "rgb": rgb,
                        "relay": relay,
                        "forecast_15m": data.get("forecast_15m", {}).get("stage")
                    }
                    self.send_command_to_mcu(mcu_packet)

            except Exception as e:
                logger.warning(f"Backend polling error: {e}")

            time.sleep(poll_interval_sec)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DNS Shield Pi Hardware Bridge")
    parser.add_argument("--api-url", default="http://localhost:8000", help="FastAPI gateway endpoint")
    parser.add_argument("--port", default="/dev/ttyACM0", help="Serial port for Zephyr RTOS MCU")
    parser.add_argument("--mock", action="store_true", help="Force mock hardware mode")
    args = parser.parse_args()

    bridge = PiHardwareBridge(api_url=args.api_url, serial_port=args.port)
    if args.mock:
        bridge.mock_mode = True
    bridge.run_sync_loop()
