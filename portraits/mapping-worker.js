import { analyze, mapLetters } from "./lib/mapping.js";
self.onmessage = ({ data }) => {
  try {
    const field = analyze(data.gray, data.w, data.h, data.threshold);
    const letters = mapLetters(field, data.options);
    self.postMessage({ mask: field.mask, letters }, [field.mask.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
