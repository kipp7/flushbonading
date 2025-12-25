type ZipEntry = { name: string; content: string | Uint8Array<ArrayBuffer> };

const encoder = new TextEncoder();

const buildCrcTable = () => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
};

const crcTable = buildCrcTable();

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (const value of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ value) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const toDosDateTime = (date: Date) => {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
};

const writeUint16 = (view: DataView, offset: number, value: number) => view.setUint16(offset, value & 0xffff, true);
const writeUint32 = (view: DataView, offset: number, value: number) => view.setUint32(offset, value >>> 0, true);

const normalizeName = (name: string) => name.replaceAll("\\", "/");

export const buildZipBlob = (entries: ZipEntry[]) => {
  const files: Array<Uint8Array<ArrayBuffer>> = [];
  const central: Array<Uint8Array<ArrayBuffer>> = [];
  const now = new Date();
  const { dosTime, dosDate } = toDosDateTime(now);
  let offset = 0;
  let fileCount = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(normalizeName(entry.name)) as Uint8Array<ArrayBuffer>;
    const dataBytes =
      typeof entry.content === "string"
        ? (encoder.encode(entry.content) as Uint8Array<ArrayBuffer>)
        : entry.content;
    const checksum = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, dosTime);
    writeUint16(localView, 12, dosDate);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, size);
    writeUint32(localView, 22, size);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);

    files.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, dosTime);
    writeUint16(centralView, 14, dosDate);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, size);
    writeUint32(centralView, 24, size);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);

    central.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
    fileCount += 1;
  });

  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = new Uint8Array(22) as Uint8Array<ArrayBuffer>;
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, fileCount);
  writeUint16(endView, 10, fileCount);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  return new Blob([...files, ...central, end], { type: "application/zip" });
};
