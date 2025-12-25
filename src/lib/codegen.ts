import type { AllocationResult, MCU } from "../types";

export type SplSpeedPresetId = "standard" | "fast";

type SeriesConfig = {
  header: string;
  clockFn?: string;
  clockPrefix?: string;
};

const seriesConfig: Record<MCU["series"], SeriesConfig> = {
  F1: { header: "stm32f10x.h", clockFn: "RCC_APB2PeriphClockCmd", clockPrefix: "RCC_APB2Periph_GPIO" },
  F4: { header: "stm32f4xx.h", clockFn: "RCC_AHB1PeriphClockCmd", clockPrefix: "RCC_AHB1Periph_GPIO" },
  G0: { header: "stm32g0xx.h" },
  H7: { header: "stm32h7xx.h" },
};

const parsePinId = (pinId: string) => {
  const match = /^P([A-Z])(\d+)$/.exec(pinId);
  if (!match) return null;
  return { port: match[1], index: Number(match[2]) };
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const buildPinMask = (indices: number[]) =>
  indices
    .slice()
    .sort((a, b) => a - b)
    .map((index) => `GPIO_Pin_${index}`)
    .join(" | ");

const sanitizeIdent = (value: string) => {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) return "SENSOR";
  if (/^\d/.test(cleaned)) return `_${cleaned}`;
  return cleaned;
};

const formatAssignedPins = (pins: Record<string, string>) =>
  Object.entries(pins)
    .map(([signal, pin]) => `${signal}=${pin}`)
    .join(", ");

const speedPresets: Record<SplSpeedPresetId, { i2cClock: number; spiPrescaler: string; uartBaud: number }> = {
  standard: { i2cClock: 100000, spiPrescaler: "SPI_BaudRatePrescaler_16", uartBaud: 115200 },
  fast: { i2cClock: 400000, spiPrescaler: "SPI_BaudRatePrescaler_8", uartBaud: 230400 },
};

export const buildSplCode = (
  mcu: MCU,
  allocation: AllocationResult,
  options: { speedPreset?: SplSpeedPresetId } = {},
) => {
  const config = seriesConfig[mcu.series];
  const preset = speedPresets[options.speedPreset ?? "standard"];
  const usedPins = new Set<string>();

  allocation.buses.i2c.forEach((bus) => {
    usedPins.add(bus.scl);
    usedPins.add(bus.sda);
  });
  allocation.buses.spi.forEach((bus) => {
    usedPins.add(bus.sck);
    usedPins.add(bus.miso);
    usedPins.add(bus.mosi);
    bus.csPins.forEach((pin) => usedPins.add(pin));
  });
  allocation.buses.uart.forEach((bus) => {
    usedPins.add(bus.tx);
    usedPins.add(bus.rx);
  });
  allocation.allocations.forEach((item) => {
    Object.values(item.assignedPins).forEach((pin) => usedPins.add(pin));
  });

  const portMap = new Map<string, number[]>();
  const pinComments: string[] = [];
  Array.from(usedPins).forEach((pinId) => {
    const parsed = parsePinId(pinId);
    if (!parsed) return;
    const list = portMap.get(parsed.port) ?? [];
    list.push(parsed.index);
    portMap.set(parsed.port, list);
    const label = allocation.pinUsage[pinId]?.label ?? "Assigned";
    pinComments.push(`// ${pinId} - ${label}`);
  });

  const ports = Array.from(portMap.keys()).sort();
  const portClockMacros = ports.map((port) => `${config.clockPrefix}${port}`);

  const lines: string[] = [];
  lines.push("/* PinForge SPL Starter */");
  lines.push(`#include "${config.header}"`);
  lines.push("#include <stdint.h>");
  lines.push("");
  lines.push(`/* Speed preset: ${options.speedPreset ?? "standard"} */`);
  lines.push("");
  lines.push("/* Pin Map */");
  pinComments.sort().forEach((line) => lines.push(line));
  lines.push("");

  if (config.clockFn && config.clockPrefix) {
    lines.push("void PinForge_InitClocks(void) {");
    if (portClockMacros.length > 0) {
      lines.push(`  ${config.clockFn}(${portClockMacros.join(" | ")}, ENABLE);`);
    } else {
      lines.push("  // No GPIO ports detected.");
    }
    lines.push("}");
  } else {
    lines.push("/* TODO: configure GPIO clocks for this MCU series. */");
  }

  lines.push("");
  lines.push("void PinForge_InitGPIO(void) {");
  lines.push("  GPIO_InitTypeDef gpio;");
  lines.push("  GPIO_StructInit(&gpio);");
  if (mcu.series === "F1") {
    lines.push("  gpio.GPIO_Mode = GPIO_Mode_AF_PP;");
    lines.push("  gpio.GPIO_Speed = GPIO_Speed_50MHz;");
  } else if (mcu.series === "F4") {
    lines.push("  gpio.GPIO_Mode = GPIO_Mode_AF;");
    lines.push("  gpio.GPIO_OType = GPIO_OType_PP;");
    lines.push("  gpio.GPIO_PuPd = GPIO_PuPd_NOPULL;");
    lines.push("  gpio.GPIO_Speed = GPIO_Speed_50MHz;");
  } else {
    lines.push("  /* TODO: adjust GPIO init for this MCU series. */");
    lines.push("  gpio.GPIO_Mode = GPIO_Mode_AF_PP;");
    lines.push("  gpio.GPIO_Speed = GPIO_Speed_50MHz;");
  }
  ports.forEach((port) => {
    const mask = buildPinMask(unique(portMap.get(port) ?? []));
    if (!mask) return;
    lines.push(`  // GPIO${port}`);
    lines.push(`  gpio.GPIO_Pin = ${mask};`);
    lines.push(`  GPIO_Init(GPIO${port}, &gpio);`);
  });
  lines.push("}");
  lines.push("");

  allocation.buses.i2c.forEach((bus) => {
    lines.push(`void PinForge_Init${bus.id}(void) {`);
    lines.push("  I2C_InitTypeDef i2c;");
    lines.push("  I2C_StructInit(&i2c);");
    lines.push(`  i2c.I2C_ClockSpeed = ${preset.i2cClock};`);
    lines.push(`  I2C_Init(${bus.id}, &i2c);`);
    lines.push(`  I2C_Cmd(${bus.id}, ENABLE);`);
    lines.push("}");
    lines.push("");
  });

  allocation.buses.spi.forEach((bus) => {
    lines.push(`void PinForge_Init${bus.id}(void) {`);
    lines.push("  SPI_InitTypeDef spi;");
    lines.push("  SPI_StructInit(&spi);");
    lines.push(`  spi.SPI_BaudRatePrescaler = ${preset.spiPrescaler};`);
    lines.push(`  SPI_Init(${bus.id}, &spi);`);
    lines.push(`  SPI_Cmd(${bus.id}, ENABLE);`);
    lines.push("}");
    lines.push("");
  });

  allocation.buses.uart.forEach((bus) => {
    lines.push(`void PinForge_Init${bus.id}(void) {`);
    lines.push("  USART_InitTypeDef usart;");
    lines.push("  USART_StructInit(&usart);");
    lines.push(`  usart.USART_BaudRate = ${preset.uartBaud};`);
    lines.push(`  USART_Init(${bus.id}, &usart);`);
    lines.push(`  USART_Cmd(${bus.id}, ENABLE);`);
    lines.push("}");
    lines.push("");
  });

  if (allocation.buses.i2c.length > 0) {
    lines.push("/* I2C Helper Stubs (SPL-only) */");
    lines.push("int PinForge_I2C_WriteBytes(I2C_TypeDef *I2Cx, uint8_t addr7, const uint8_t *data, int length) {");
    lines.push("  (void)I2Cx;");
    lines.push("  (void)addr7;");
    lines.push("  (void)data;");
    lines.push("  (void)length;");
    lines.push("  /* TODO: implement I2C write sequence using SPL (START + ADDR + DATA + STOP). */");
    lines.push("  return 0;");
    lines.push("}");
    lines.push("");
    lines.push("int PinForge_I2C_ReadBytes(I2C_TypeDef *I2Cx, uint8_t addr7, uint8_t *data, int length) {");
    lines.push("  (void)I2Cx;");
    lines.push("  (void)addr7;");
    lines.push("  (void)data;");
    lines.push("  (void)length;");
    lines.push("  /* TODO: implement I2C read sequence using SPL (START + ADDR + READ + STOP). */");
    lines.push("  return 0;");
    lines.push("}");
    lines.push("");
  }

  const adcPins = allocation.allocations
    .filter((item) => item.interface === "ADC")
    .flatMap((item) => Object.values(item.assignedPins));
  if (adcPins.length > 0) {
    lines.push("void PinForge_InitADC(void) {");
    lines.push("  /* TODO: configure ADC channels for assigned analog pins. */");
    lines.push("}");
    lines.push("");
  }

  const pwmPins = allocation.allocations
    .filter((item) => item.interface === "PWM")
    .flatMap((item) => Object.values(item.assignedPins));
  if (pwmPins.length > 0) {
    lines.push("void PinForge_InitPWM(void) {");
    lines.push("  /* TODO: configure timers for PWM outputs. */");
    lines.push("}");
    lines.push("");
  }

  if (allocation.allocations.length > 0) {
    const sensorIdents: string[] = [];
    lines.push("/* Sensor Templates */");
    allocation.allocations.forEach((item) => {
      const ident = sanitizeIdent(`${item.sensorName}_${item.sensorId}`);
      sensorIdents.push(ident);
      lines.push(`// ${item.sensorName} (${item.interface})`);
      if (item.busId) {
        lines.push(`// Bus: ${item.busId}`);
      }
      lines.push(`// Pins: ${formatAssignedPins(item.assignedPins)}`);
      if (item.interface === "I2C") {
        lines.push(`#define SENSOR_${ident}_I2C_ADDR 0x00`);
      }
      lines.push(`void PinForge_${ident}_Init(void) {`);
      lines.push("  /* TODO: configure sensor registers using SPL calls. */");
      lines.push("}");
      lines.push(`int PinForge_${ident}_Read(void *buffer, int length) {`);
      lines.push("  (void)buffer;");
      lines.push("  (void)length;");
      lines.push("  /* TODO: implement read sequence using SPL calls. */");
      lines.push("  return 0;");
      lines.push("}");
      lines.push("");
    });

    lines.push("void PinForge_InitSensors(void) {");
    sensorIdents.forEach((ident) => lines.push(`  PinForge_${ident}_Init();`));
    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
};
