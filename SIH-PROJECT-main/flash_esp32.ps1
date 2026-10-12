$ArduinoCli = "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
$SketchDir = "c:\Users\papai\OneDrive\Desktop\powersight\SIH-PROJECT-main"
$CppFile   = "$SketchDir\esp32_firmware.cpp"
$InoFile   = "$SketchDir\SIH-PROJECT-main.ino"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  PowerSight ESP32 Automated Flasher Tool         " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path $ArduinoCli)) {
    Write-Host "ERROR: Arduino CLI tool not found at $ArduinoCli" -ForegroundColor Red
    exit 1
}

# Ensure .ino wrapper exists for Arduino CLI build
Copy-Item $CppFile $InoFile -Force

Write-Host "Checking connected USB COM Ports..." -ForegroundColor Yellow

# Detect COM port
$ports = [System.IO.Ports.SerialPort]::GetPortNames()

if ($ports.Count -eq 0) {
    Write-Host "WARNING: No ESP32 COM Port detected yet!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Ensure USB cable supports DATA (not charge-only)." -ForegroundColor White
    Write-Host "  2. Re-plug the micro-USB / USB-C cable firmly into your laptop." -ForegroundColor White
    Write-Host "  3. Press the BOOT / EN button on your ESP32 board." -ForegroundColor White
    exit 1
}

$comPort = $ports[0]
Write-Host "SUCCESS: Detected ESP32 on Port: $comPort" -ForegroundColor Green

# Install esp32 core if needed
Write-Host "Verifying ESP32 board core..." -ForegroundColor Yellow
& $ArduinoCli core update-index
& $ArduinoCli core install esp32:esp32

# Compile & Upload
Write-Host "Compiling & Uploading firmware to $comPort..." -ForegroundColor Cyan
& $ArduinoCli compile --fqbn esp32:esp32:esp32 "$SketchDir"
& $ArduinoCli upload -p $comPort --fqbn esp32:esp32:esp32 "$SketchDir"

Write-Host "==================================================" -ForegroundColor Green
Write-Host "SUCCESS: Firmware uploaded to ESP32 on $comPort!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
