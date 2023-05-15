//@ts-nocheck
export const toUintArray = (value) => {
  let buffer = Buffer.from(Object.values(value));
  let asArr = new Uint8Array(buffer.length);
  asArr.set(buffer);
  return asArr;
};
