import type { BusDefinition, MCU, Pin, PinFunction } from "../types";

const gpioFn: PinFunction = { name: "GPIO", interface: "GPIO" };

const fn = (name: string, iface?: PinFunction["interface"], signal?: string, bus?: string): PinFunction => ({
  name,
  interface: iface,
  signal,
  bus,
});

const fns = (...extras: PinFunction[]): PinFunction[] => [gpioFn, ...extras];

const buildPins = (
  portIndexes: Record<string, number[]>,
  overrides: Record<string, Partial<Pin>>,
  extraPins: Pin[] = [],
): Pin[] => {
  const pins: Pin[] = [];
  Object.entries(portIndexes).forEach(([port, indexes]) => {
    indexes.forEach((index) => {
      const id = `${port}${index}`;
      const override = overrides[id];
      pins.push({
        id,
        label: id,
        port,
        index,
        functions: override?.functions ?? [gpioFn],
        reserved: override?.reserved,
        power: override?.power,
        notes: override?.notes,
      });
    });
  });

  return pins.concat(extraPins);
};

const sysPins = (labels: Array<{ id: string; notes?: string; power?: boolean }>): Pin[] =>
  labels.map((item, index) => ({
    id: item.id,
    label: item.id,
    port: "SYS",
    index,
    functions: [{ name: item.id }],
    reserved: !item.power,
    power: item.power,
    notes: item.notes,
  }));

const stm32f103c8 = (): MCU => {
  const i2c: BusDefinition[] = [
    { id: "I2C1", scl: ["PB6", "PB8"], sda: ["PB7", "PB9"] },
    { id: "I2C2", scl: ["PB10"], sda: ["PB11"] },
  ];
  const spi: BusDefinition[] = [
    { id: "SPI1", sck: ["PA5"], miso: ["PA6"], mosi: ["PA7"] },
    { id: "SPI2", sck: ["PB13"], miso: ["PB14"], mosi: ["PB15"] },
  ];
  const uart: BusDefinition[] = [
    { id: "USART1", tx: ["PA9"], rx: ["PA10"] },
    { id: "USART2", tx: ["PA2"], rx: ["PA3"] },
    { id: "USART3", tx: ["PB10"], rx: ["PB11"] },
  ];

  const overrides: Record<string, Partial<Pin>> = {
    PB13: { functions: fns(fn("SPI2_SCK", "SPI", "SCK", "SPI2")) },
    PB14: { functions: fns(fn("SPI2_MISO", "SPI", "MISO", "SPI2")) },
    PB15: { functions: fns(fn("SPI2_MOSI", "SPI", "MOSI", "SPI2")) },
    PB6: { functions: fns(fn("I2C1_SCL", "I2C", "SCL", "I2C1"), fn("TIM4_CH1", "PWM", "PWM")) },
    PB7: { functions: fns(fn("I2C1_SDA", "I2C", "SDA", "I2C1"), fn("TIM4_CH2", "PWM", "PWM")) },
    PB8: { functions: fns(fn("I2C1_SCL", "I2C", "SCL", "I2C1"), fn("TIM4_CH3", "PWM", "PWM")) },
    PB9: { functions: fns(fn("I2C1_SDA", "I2C", "SDA", "I2C1"), fn("TIM4_CH4", "PWM", "PWM")) },
    PB10: { functions: fns(fn("I2C2_SCL", "I2C", "SCL", "I2C2"), fn("USART3_TX", "UART", "TX", "USART3")) },
    PB11: { functions: fns(fn("I2C2_SDA", "I2C", "SDA", "I2C2"), fn("USART3_RX", "UART", "RX", "USART3")) },
    PA9: { functions: fns(fn("USART1_TX", "UART", "TX", "USART1"), fn("TIM1_CH2", "PWM", "PWM")) },
    PA10: { functions: fns(fn("USART1_RX", "UART", "RX", "USART1"), fn("TIM1_CH3", "PWM", "PWM")) },
    PA2: { functions: fns(fn("USART2_TX", "UART", "TX", "USART2"), fn("TIM2_CH3", "PWM", "PWM"), fn("ADC_IN2", "ADC", "AIN")) },
    PA3: { functions: fns(fn("USART2_RX", "UART", "RX", "USART2"), fn("TIM2_CH4", "PWM", "PWM"), fn("ADC_IN3", "ADC", "AIN")) },
    PA0: { functions: fns(fn("ADC_IN0", "ADC", "AIN")) },
    PA1: { functions: fns(fn("ADC_IN1", "ADC", "AIN")) },
    PA4: { functions: fns(fn("ADC_IN4", "ADC", "AIN")) },
    PA5: { functions: fns(fn("SPI1_SCK", "SPI", "SCK", "SPI1"), fn("ADC_IN5", "ADC", "AIN")) },
    PA6: { functions: fns(fn("SPI1_MISO", "SPI", "MISO", "SPI1"), fn("ADC_IN6", "ADC", "AIN")) },
    PA7: { functions: fns(fn("SPI1_MOSI", "SPI", "MOSI", "SPI1"), fn("ADC_IN7", "ADC", "AIN")) },
    PB0: { functions: fns(fn("ADC_IN8", "ADC", "AIN"), fn("TIM3_CH3", "PWM", "PWM")) },
    PB1: { functions: fns(fn("ADC_IN9", "ADC", "AIN"), fn("TIM3_CH4", "PWM", "PWM")) },
    PA8: { functions: fns(fn("TIM1_CH1", "PWM", "PWM")) },
    PA11: { functions: fns(fn("TIM1_CH4", "PWM", "PWM")) },
    PA13: { functions: [fn("SWDIO")], notes: "SWDIO" },
    PA14: { functions: [fn("SWCLK")], notes: "SWCLK" },
  };

  const portIndexes = {
    PA: Array.from({ length: 16 }, (_, i) => i),
    PB: Array.from({ length: 16 }, (_, i) => i),
    PC: [13, 14, 15],
  };

  const pins = buildPins(portIndexes, overrides, sysPins([
    { id: "VDD", notes: "3.3V", power: true },
    { id: "VSS", notes: "GND", power: true },
    { id: "NRST", notes: "Reset" },
    { id: "BOOT0", notes: "Boot mode" },
  ]));

  return {
    id: "stm32f103c8",
    name: "STM32F103C8",
    series: "F1",
    package: "LQFP48",
    pins,
    buses: { i2c, spi, uart },
    analogPins: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PB0", "PB1"],
    pwmPins: ["PA8", "PA9", "PA10", "PA11", "PB6", "PB7", "PB8", "PB9", "PB0", "PB1"],
    reservedPins: [],
    notes: "Demo subset. Verify with datasheet before tape-out.",
  };
};

const stm32f407vg = (): MCU => {
  const i2c: BusDefinition[] = [
    { id: "I2C1", scl: ["PB6"], sda: ["PB7"] },
    { id: "I2C2", scl: ["PB10"], sda: ["PB11"] },
    { id: "I2C3", scl: ["PA8"], sda: ["PC9"] },
  ];
  const spi: BusDefinition[] = [
    { id: "SPI1", sck: ["PA5"], miso: ["PA6"], mosi: ["PA7"] },
    { id: "SPI2", sck: ["PB13"], miso: ["PB14"], mosi: ["PB15"] },
    { id: "SPI3", sck: ["PC10"], miso: ["PC11"], mosi: ["PC12"] },
  ];
  const uart: BusDefinition[] = [
    { id: "USART1", tx: ["PA9"], rx: ["PA10"] },
    { id: "USART2", tx: ["PA2"], rx: ["PA3"] },
    { id: "USART3", tx: ["PB10"], rx: ["PB11"] },
    { id: "UART4", tx: ["PA0"], rx: ["PA1"] },
  ];

  const overrides: Record<string, Partial<Pin>> = {
    PB6: { functions: fns(fn("I2C1_SCL", "I2C", "SCL", "I2C1"), fn("TIM4_CH1", "PWM", "PWM")) },
    PB7: { functions: fns(fn("I2C1_SDA", "I2C", "SDA", "I2C1"), fn("TIM4_CH2", "PWM", "PWM")) },
    PB10: { functions: fns(fn("I2C2_SCL", "I2C", "SCL", "I2C2"), fn("USART3_TX", "UART", "TX", "USART3")) },
    PB11: { functions: fns(fn("I2C2_SDA", "I2C", "SDA", "I2C2"), fn("USART3_RX", "UART", "RX", "USART3")) },
    PA8: { functions: fns(fn("I2C3_SCL", "I2C", "SCL", "I2C3"), fn("TIM1_CH1", "PWM", "PWM")) },
    PC9: { functions: fns(fn("I2C3_SDA", "I2C", "SDA", "I2C3"), fn("TIM3_CH4", "PWM", "PWM")) },
    PA5: { functions: fns(fn("SPI1_SCK", "SPI", "SCK", "SPI1"), fn("ADC_IN5", "ADC", "AIN")) },
    PA6: { functions: fns(fn("SPI1_MISO", "SPI", "MISO", "SPI1"), fn("ADC_IN6", "ADC", "AIN")) },
    PA7: { functions: fns(fn("SPI1_MOSI", "SPI", "MOSI", "SPI1"), fn("ADC_IN7", "ADC", "AIN")) },
    PB13: { functions: fns(fn("SPI2_SCK", "SPI", "SCK", "SPI2")) },
    PB14: { functions: fns(fn("SPI2_MISO", "SPI", "MISO", "SPI2")) },
    PB15: { functions: fns(fn("SPI2_MOSI", "SPI", "MOSI", "SPI2")) },
    PC10: { functions: fns(fn("SPI3_SCK", "SPI", "SCK", "SPI3")) },
    PC11: { functions: fns(fn("SPI3_MISO", "SPI", "MISO", "SPI3")) },
    PC12: { functions: fns(fn("SPI3_MOSI", "SPI", "MOSI", "SPI3")) },
    PA9: { functions: fns(fn("USART1_TX", "UART", "TX", "USART1"), fn("TIM1_CH2", "PWM", "PWM")) },
    PA10: { functions: fns(fn("USART1_RX", "UART", "RX", "USART1"), fn("TIM1_CH3", "PWM", "PWM")) },
    PA2: { functions: fns(fn("USART2_TX", "UART", "TX", "USART2"), fn("ADC_IN2", "ADC", "AIN")) },
    PA3: { functions: fns(fn("USART2_RX", "UART", "RX", "USART2"), fn("ADC_IN3", "ADC", "AIN")) },
    PA0: { functions: fns(fn("UART4_TX", "UART", "TX", "UART4"), fn("ADC_IN0", "ADC", "AIN")) },
    PA1: { functions: fns(fn("UART4_RX", "UART", "RX", "UART4"), fn("ADC_IN1", "ADC", "AIN")) },
    PB0: { functions: fns(fn("ADC_IN8", "ADC", "AIN"), fn("TIM3_CH3", "PWM", "PWM")) },
    PB1: { functions: fns(fn("ADC_IN9", "ADC", "AIN"), fn("TIM3_CH4", "PWM", "PWM")) },
    PC6: { functions: fns(fn("TIM3_CH1", "PWM", "PWM")) },
    PC7: { functions: fns(fn("TIM3_CH2", "PWM", "PWM")) },
    PC8: { functions: fns(fn("TIM3_CH3", "PWM", "PWM")) },
    PA13: { functions: [fn("SWDIO")], notes: "SWDIO" },
    PA14: { functions: [fn("SWCLK")], notes: "SWCLK" },
  };

  const portIndexes = {
    PA: Array.from({ length: 16 }, (_, i) => i),
    PB: Array.from({ length: 16 }, (_, i) => i),
    PC: Array.from({ length: 16 }, (_, i) => i),
    PD: Array.from({ length: 16 }, (_, i) => i),
    PE: Array.from({ length: 16 }, (_, i) => i),
  };

  const pins = buildPins(portIndexes, overrides, sysPins([
    { id: "VDD", notes: "3.3V", power: true },
    { id: "VSS", notes: "GND", power: true },
    { id: "VDDA", notes: "Analog 3.3V", power: true },
    { id: "VSSA", notes: "Analog GND", power: true },
    { id: "NRST", notes: "Reset" },
  ]));

  return {
    id: "stm32f407vg",
    name: "STM32F407VG",
    series: "F4",
    package: "LQFP100",
    pins,
    buses: { i2c, spi, uart },
    analogPins: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PB0", "PB1", "PC0", "PC1", "PC2", "PC3", "PC4", "PC5"],
    pwmPins: ["PA8", "PA9", "PA10", "PA11", "PB6", "PB7", "PB8", "PB9", "PC6", "PC7", "PC8", "PC9"],
    reservedPins: [],
    notes: "Demo subset. Verify with datasheet before tape-out.",
  };
};

const stm32g071rb = (): MCU => {
  const i2c: BusDefinition[] = [
    { id: "I2C1", scl: ["PB6"], sda: ["PB7"] },
    { id: "I2C2", scl: ["PB10"], sda: ["PB11"] },
    { id: "I2C3", scl: ["PA7"], sda: ["PA8"] },
  ];
  const spi: BusDefinition[] = [
    { id: "SPI1", sck: ["PA5"], miso: ["PA6"], mosi: ["PA7"] },
    { id: "SPI2", sck: ["PB13"], miso: ["PB14"], mosi: ["PB15"] },
  ];
  const uart: BusDefinition[] = [
    { id: "USART1", tx: ["PA9"], rx: ["PA10"] },
    { id: "USART2", tx: ["PA2"], rx: ["PA3"] },
    { id: "LPUART1", tx: ["PB10"], rx: ["PB11"] },
  ];

  const overrides: Record<string, Partial<Pin>> = {
    PB6: { functions: fns(fn("I2C1_SCL", "I2C", "SCL", "I2C1"), fn("TIM4_CH1", "PWM", "PWM")) },
    PB7: { functions: fns(fn("I2C1_SDA", "I2C", "SDA", "I2C1"), fn("TIM4_CH2", "PWM", "PWM")) },
    PB10: { functions: fns(fn("I2C2_SCL", "I2C", "SCL", "I2C2"), fn("LPUART1_TX", "UART", "TX", "LPUART1")) },
    PB11: { functions: fns(fn("I2C2_SDA", "I2C", "SDA", "I2C2"), fn("LPUART1_RX", "UART", "RX", "LPUART1")) },
    PA7: { functions: fns(fn("I2C3_SCL", "I2C", "SCL", "I2C3"), fn("SPI1_MOSI", "SPI", "MOSI", "SPI1")) },
    PA8: { functions: fns(fn("I2C3_SDA", "I2C", "SDA", "I2C3"), fn("TIM1_CH1", "PWM", "PWM")) },
    PA5: { functions: fns(fn("SPI1_SCK", "SPI", "SCK", "SPI1")) },
    PA6: { functions: fns(fn("SPI1_MISO", "SPI", "MISO", "SPI1")) },
    PB13: { functions: fns(fn("SPI2_SCK", "SPI", "SCK", "SPI2")) },
    PB14: { functions: fns(fn("SPI2_MISO", "SPI", "MISO", "SPI2")) },
    PB15: { functions: fns(fn("SPI2_MOSI", "SPI", "MOSI", "SPI2")) },
    PA9: { functions: fns(fn("USART1_TX", "UART", "TX", "USART1")) },
    PA10: { functions: fns(fn("USART1_RX", "UART", "RX", "USART1")) },
    PA2: { functions: fns(fn("USART2_TX", "UART", "TX", "USART2"), fn("ADC_IN2", "ADC", "AIN")) },
    PA3: { functions: fns(fn("USART2_RX", "UART", "RX", "USART2"), fn("ADC_IN3", "ADC", "AIN")) },
    PA0: { functions: fns(fn("ADC_IN0", "ADC", "AIN")) },
    PA1: { functions: fns(fn("ADC_IN1", "ADC", "AIN")) },
    PB0: { functions: fns(fn("ADC_IN8", "ADC", "AIN")) },
    PB1: { functions: fns(fn("ADC_IN9", "ADC", "AIN")) },
    PA13: { functions: [fn("SWDIO")], notes: "SWDIO" },
    PA14: { functions: [fn("SWCLK")], notes: "SWCLK" },
  };

  const portIndexes = {
    PA: Array.from({ length: 16 }, (_, i) => i),
    PB: Array.from({ length: 16 }, (_, i) => i),
    PC: Array.from({ length: 16 }, (_, i) => i),
  };

  const pins = buildPins(portIndexes, overrides, sysPins([
    { id: "VDD", notes: "3.3V", power: true },
    { id: "VSS", notes: "GND", power: true },
    { id: "NRST", notes: "Reset" },
    { id: "BOOT0", notes: "Boot mode" },
  ]));

  return {
    id: "stm32g071rb",
    name: "STM32G071RB",
    series: "G0",
    package: "LQFP64",
    pins,
    buses: { i2c, spi, uart },
    analogPins: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PB0", "PB1", "PC0", "PC1", "PC2", "PC3", "PC4", "PC5"],
    pwmPins: ["PA8", "PA9", "PA10", "PA11", "PB6", "PB7", "PB8", "PB9", "PC6", "PC7", "PC8", "PC9"],
    reservedPins: [],
    notes: "Demo subset. Verify with datasheet before tape-out.",
  };
};

const stm32h743zi = (): MCU => {
  const i2c: BusDefinition[] = [
    { id: "I2C1", scl: ["PB6"], sda: ["PB7"] },
    { id: "I2C2", scl: ["PF1"], sda: ["PF0"] },
    { id: "I2C4", scl: ["PD12"], sda: ["PD13"] },
  ];
  const spi: BusDefinition[] = [
    { id: "SPI1", sck: ["PA5"], miso: ["PA6"], mosi: ["PA7"] },
    { id: "SPI2", sck: ["PB13"], miso: ["PB14"], mosi: ["PB15"] },
    { id: "SPI3", sck: ["PC10"], miso: ["PC11"], mosi: ["PC12"] },
  ];
  const uart: BusDefinition[] = [
    { id: "USART1", tx: ["PA9"], rx: ["PA10"] },
    { id: "USART2", tx: ["PD5"], rx: ["PD6"] },
    { id: "USART3", tx: ["PB10"], rx: ["PB11"] },
    { id: "UART4", tx: ["PA0"], rx: ["PA1"] },
  ];

  const overrides: Record<string, Partial<Pin>> = {
    PB6: { functions: fns(fn("I2C1_SCL", "I2C", "SCL", "I2C1"), fn("TIM4_CH1", "PWM", "PWM")) },
    PB7: { functions: fns(fn("I2C1_SDA", "I2C", "SDA", "I2C1"), fn("TIM4_CH2", "PWM", "PWM")) },
    PF1: { functions: fns(fn("I2C2_SCL", "I2C", "SCL", "I2C2")) },
    PF0: { functions: fns(fn("I2C2_SDA", "I2C", "SDA", "I2C2")) },
    PD12: { functions: fns(fn("I2C4_SCL", "I2C", "SCL", "I2C4"), fn("TIM4_CH1", "PWM", "PWM")) },
    PD13: { functions: fns(fn("I2C4_SDA", "I2C", "SDA", "I2C4"), fn("TIM4_CH2", "PWM", "PWM")) },
    PA5: { functions: fns(fn("SPI1_SCK", "SPI", "SCK", "SPI1")) },
    PA6: { functions: fns(fn("SPI1_MISO", "SPI", "MISO", "SPI1")) },
    PA7: { functions: fns(fn("SPI1_MOSI", "SPI", "MOSI", "SPI1")) },
    PB13: { functions: fns(fn("SPI2_SCK", "SPI", "SCK", "SPI2")) },
    PB14: { functions: fns(fn("SPI2_MISO", "SPI", "MISO", "SPI2")) },
    PB15: { functions: fns(fn("SPI2_MOSI", "SPI", "MOSI", "SPI2")) },
    PC10: { functions: fns(fn("SPI3_SCK", "SPI", "SCK", "SPI3")) },
    PC11: { functions: fns(fn("SPI3_MISO", "SPI", "MISO", "SPI3")) },
    PC12: { functions: fns(fn("SPI3_MOSI", "SPI", "MOSI", "SPI3")) },
    PA9: { functions: fns(fn("USART1_TX", "UART", "TX", "USART1"), fn("TIM1_CH2", "PWM", "PWM")) },
    PA10: { functions: fns(fn("USART1_RX", "UART", "RX", "USART1"), fn("TIM1_CH3", "PWM", "PWM")) },
    PD5: { functions: fns(fn("USART2_TX", "UART", "TX", "USART2")) },
    PD6: { functions: fns(fn("USART2_RX", "UART", "RX", "USART2")) },
    PB10: { functions: fns(fn("USART3_TX", "UART", "TX", "USART3")) },
    PB11: { functions: fns(fn("USART3_RX", "UART", "RX", "USART3")) },
    PA0: { functions: fns(fn("UART4_TX", "UART", "TX", "UART4"), fn("ADC_IN0", "ADC", "AIN")) },
    PA1: { functions: fns(fn("UART4_RX", "UART", "RX", "UART4"), fn("ADC_IN1", "ADC", "AIN")) },
    PA2: { functions: fns(fn("ADC_IN2", "ADC", "AIN")) },
    PA3: { functions: fns(fn("ADC_IN3", "ADC", "AIN")) },
    PB0: { functions: fns(fn("ADC_IN8", "ADC", "AIN"), fn("TIM3_CH3", "PWM", "PWM")) },
    PB1: { functions: fns(fn("ADC_IN9", "ADC", "AIN"), fn("TIM3_CH4", "PWM", "PWM")) },
    PC6: { functions: fns(fn("TIM3_CH1", "PWM", "PWM")) },
    PC7: { functions: fns(fn("TIM3_CH2", "PWM", "PWM")) },
    PC8: { functions: fns(fn("TIM3_CH3", "PWM", "PWM")) },
    PC9: { functions: fns(fn("TIM3_CH4", "PWM", "PWM")) },
    PA13: { functions: [fn("SWDIO")], notes: "SWDIO" },
    PA14: { functions: [fn("SWCLK")], notes: "SWCLK" },
  };

  const portIndexes = {
    PA: Array.from({ length: 16 }, (_, i) => i),
    PB: Array.from({ length: 16 }, (_, i) => i),
    PC: Array.from({ length: 16 }, (_, i) => i),
    PD: Array.from({ length: 16 }, (_, i) => i),
    PE: Array.from({ length: 16 }, (_, i) => i),
    PF: Array.from({ length: 16 }, (_, i) => i),
  };

  const pins = buildPins(portIndexes, overrides, sysPins([
    { id: "VDD", notes: "3.3V", power: true },
    { id: "VSS", notes: "GND", power: true },
    { id: "VDDIO", notes: "I/O Supply", power: true },
    { id: "NRST", notes: "Reset" },
    { id: "BOOT0", notes: "Boot mode" },
  ]));

  return {
    id: "stm32h743zi",
    name: "STM32H743ZI",
    series: "H7",
    package: "LQFP144",
    pins,
    buses: { i2c, spi, uart },
    analogPins: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PB0", "PB1", "PC0", "PC1", "PC2", "PC3", "PC4", "PC5"],
    pwmPins: ["PA8", "PA9", "PA10", "PA11", "PB6", "PB7", "PB8", "PB9", "PC6", "PC7", "PC8", "PC9", "PD12", "PD13", "PD14", "PD15"],
    reservedPins: [],
    notes: "Demo subset. Verify with datasheet before tape-out.",
  };
};

export const mcuCatalog: MCU[] = [stm32f103c8(), stm32f407vg(), stm32g071rb(), stm32h743zi()];

export const mcuSeries = ["F1", "F4", "G0", "H7"] as const;


